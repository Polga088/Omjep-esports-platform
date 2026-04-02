import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Match } from '@omjep/database';
import { PrismaService } from '@api/prisma/prisma.service';
import { CreatePredictionDto } from './dto/create-prediction.dto';
import { CompetitionsService } from '../competitions/competitions.service';

/** Gain en cas de score exact : mise × 3 (crédit total en Jepy). */
const WIN_MULTIPLIER = 3;

@Injectable()
export class PredictionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly competitionsService: CompetitionsService,
  ) {}

  /**
   * Matchs ouverts aux paris : visibles, non annulés/supprimés, sans score,
   * pas encore joués (played_at futur ou null). Tri par heure de coup d’envoi.
   */
  async listUpcomingMatches() {
    const now = new Date();
    const rows = await this.prisma.match.findMany({
      where: {
        isVisible: true,
        status: { notIn: ['CANCELLED', 'DELETED'] },
        home_score: null,
        away_score: null,
        OR: [{ played_at: null }, { played_at: { gt: now } }],
      },
      orderBy: [{ startTime: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
      include: {
        competition: { select: { id: true, name: true, type: true } },
        homeTeam: { select: { id: true, name: true, logo_url: true } },
        awayTeam: { select: { id: true, name: true, logo_url: true } },
      },
    });
    return this.competitionsService.enrichMatchesWithFormAndRank(rows);
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

      if (match.status === 'CANCELLED' || match.status === 'DELETED') {
        throw new BadRequestException('Ce match ne prend plus de pronostics.');
      }
      if (!match.isVisible) {
        throw new BadRequestException(
          'Ce match n’est pas ouvert aux pronostics.',
        );
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
        throw new BadRequestException('Solde Jepy insuffisant.');
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

  /**
   * Stats pronostics : historique Jepy (solde reconstitué par jour) + totaux par statut.
   * Reconstruction : mises le jour du pari, gains le jour du match (played_at) si WON.
   */
  async getUserStats(userId: string) {
    const [user, predictions, grouped] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { jepyCoins: true },
      }),
      this.prisma.prediction.findMany({
        where: { user_id: userId },
        select: {
          betAmount: true,
          status: true,
          created_at: true,
          match: { select: { played_at: true, startTime: true } },
        },
        orderBy: { created_at: 'asc' },
      }),
      this.prisma.prediction.groupBy({
        by: ['status'],
        where: { user_id: userId },
        _count: { _all: true },
      }),
    ]);

    const currentJepy = user?.jepyCoins ?? 0;
    const dayKey = (d: Date) => d.toISOString().slice(0, 10);

    const deltas = new Map<string, number>();
    for (const p of predictions) {
      const betDay = dayKey(p.created_at);
      deltas.set(betDay, (deltas.get(betDay) ?? 0) - p.betAmount);
      if (p.status === 'WON') {
        const winAt = p.match.played_at ?? p.match.startTime ?? p.created_at;
        const winDay = dayKey(winAt);
        deltas.set(
          winDay,
          (deltas.get(winDay) ?? 0) + p.betAmount * WIN_MULTIPLIER,
        );
      }
    }

    const sortedDays = [...deltas.keys()].sort();
    let running = 0;
    const rawSeries: { date: string; balanceJepy: number }[] = sortedDays.map(
      (d) => {
        running += deltas.get(d) ?? 0;
        return { date: d, balanceJepy: running };
      },
    );

    if (rawSeries.length > 0) {
      const net = rawSeries[rawSeries.length - 1].balanceJepy;
      const offset = currentJepy - net;
      for (const pt of rawSeries) {
        pt.balanceJepy += offset;
      }
    } else {
      rawSeries.push({
        date: new Date().toISOString().slice(0, 10),
        balanceJepy: currentJepy,
      });
    }

    const predictionsByStatus = {
      PENDING: 0,
      WON: 0,
      LOST: 0,
    } as Record<'PENDING' | 'WON' | 'LOST', number>;

    for (const row of grouped) {
      const status = row.status as keyof typeof predictionsByStatus;
      if (status in predictionsByStatus) {
        predictionsByStatus[status] = row._count._all;
      }
    }

    return {
      currentJepy,
      jepyHistory: rawSeries,
      predictionsByStatus,
    };
  }
}
