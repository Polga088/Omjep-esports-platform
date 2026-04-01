import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Match } from '@omjep/database';
import { PrismaService } from '@api/prisma/prisma.service';
import { CreatePredictionDto } from './dto/create-prediction.dto';

/** Gain en cas de score exact : mise × 3 (crédit total en JEPY). */
const WIN_MULTIPLIER = 3;

@Injectable()
export class PredictionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Matchs ouverts aux paris : SCHEDULED, sans score, et pas encore commencés (played_at futur ou null). */
  async listUpcomingMatches() {
    const now = new Date();
    return this.prisma.match.findMany({
      where: {
        status: 'SCHEDULED',
        home_score: null,
        away_score: null,
        OR: [{ played_at: null }, { played_at: { gt: now } }],
      },
      orderBy: [{ played_at: { sort: 'asc', nulls: 'first' } }, { id: 'asc' }],
      include: {
        competition: { select: { id: true, name: true, type: true } },
        homeTeam: { select: { id: true, name: true, logo_url: true } },
        awayTeam: { select: { id: true, name: true, logo_url: true } },
      },
    });
  }

  async listMyPredictions(userId: string) {
    return this.prisma.prediction.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      include: {
        match: {
          include: {
            competition: { select: { id: true, name: true } },
            homeTeam: { select: { id: true, name: true, logo_url: true } },
            awayTeam: { select: { id: true, name: true, logo_url: true } },
          },
        },
      },
    });
  }

  async createPrediction(userId: string, dto: CreatePredictionDto) {
    const prediction = await this.prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({
        where: { id: dto.match_id },
      });
      if (!match) {
        throw new NotFoundException('Match introuvable.');
      }

      if (match.status !== 'SCHEDULED') {
        throw new BadRequestException(
          'Les paris ne sont plus ouverts pour ce match.',
        );
      }
      if (match.home_score != null || match.away_score != null) {
        throw new BadRequestException('Ce match a déjà un résultat.');
      }
      if (
        match.played_at &&
        match.played_at.getTime() <= Date.now()
      ) {
        throw new BadRequestException(
          'Le match a déjà commencé : les paris sont clos.',
        );
      }

      const debited = await tx.user.updateMany({
        where: { id: userId, jepyCoins: { gte: dto.bet_amount } },
        data: { jepyCoins: { decrement: dto.bet_amount } },
      });
      if (debited.count === 0) {
        throw new BadRequestException('Solde JEPY insuffisant.');
      }

      try {
        return await tx.prediction.create({
          data: {
            user_id: userId,
            match_id: dto.match_id,
            homeScore: dto.home_score,
            awayScore: dto.away_score,
            betAmount: dto.bet_amount,
            status: 'PENDING',
          },
          include: {
            match: {
              include: {
                homeTeam: { select: { id: true, name: true } },
                awayTeam: { select: { id: true, name: true } },
              },
            },
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          await tx.user.update({
            where: { id: userId },
            data: { jepyCoins: { increment: dto.bet_amount } },
          });
          throw new ConflictException(
            'Vous avez déjà un pronostic sur ce match.',
          );
        }
        throw error;
      }
    });

    const wallet = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { jepyCoins: true, omjepCoins: true },
    });

    return { prediction, user: wallet };
  }

  /**
   * À appeler après enregistrement du score final (ex. admin).
   * Score exact → WON + crédit betAmount × 3 ; sinon LOST (mise déjà débitée).
   */
  async resolvePredictions(matchId: string) {
    const match: Match | null = await this.prisma.match.findUnique({
      where: { id: matchId },
    });
    if (!match || match.home_score == null || match.away_score == null) {
      return { resolved: 0 };
    }

    const pending = await this.prisma.prediction.findMany({
      where: { match_id: matchId, status: 'PENDING' },
    });
    if (pending.length === 0) {
      return { resolved: 0 };
    }

    await this.prisma.$transaction(async (tx) => {
      for (const p of pending) {
        const exact =
          p.homeScore === match.home_score && p.awayScore === match.away_score;
        if (exact) {
          await tx.user.update({
            where: { id: p.user_id },
            data: {
              jepyCoins: { increment: p.betAmount * WIN_MULTIPLIER },
            },
          });
          await tx.prediction.update({
            where: { id: p.id },
            data: { status: 'WON' },
          });
        } else {
          await tx.prediction.update({
            where: { id: p.id },
            data: { status: 'LOST' },
          });
        }
      }
    });

    return { resolved: pending.length };
  }
}
