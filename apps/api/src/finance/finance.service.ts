import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

const MATCH_REWARDS: Record<string, number> = {
  W: 100_000,
  D: 50_000,
  L: 10_000,
};

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async addMatchReward(teamId: string, result: 'W' | 'D' | 'L') {
    const amount = MATCH_REWARDS[result];

    const [team] = await this.prisma.$transaction([
      this.prisma.team.update({
        where: { id: teamId },
        data: { budget: { increment: amount } },
      }),
      this.prisma.transaction.create({
        data: {
          team_id: teamId,
          amount,
          type: 'MATCH_REWARD',
          description: `Récompense de match (${result}) : +${amount.toLocaleString('fr-FR')}`,
        },
      }),
    ]);

    return team;
  }

  // Every Monday at 03:00
  @Cron('0 3 * * 1')
  async processWeeklyWages() {
    this.logger.log('💰 [FinanceService] Processing weekly wages…');

    const activeContracts = await this.prisma.contract.findMany({
      where: { expires_at: { gt: new Date() } },
    });

    const wagesByTeam = new Map<string, number>();
    for (const c of activeContracts) {
      wagesByTeam.set(c.team_id, (wagesByTeam.get(c.team_id) ?? 0) + c.salary);
    }

    for (const [teamId, totalWages] of wagesByTeam) {
      await this.prisma.$transaction([
        this.prisma.team.update({
          where: { id: teamId },
          data: { budget: { decrement: totalWages } },
        }),
        this.prisma.transaction.create({
          data: {
            team_id: teamId,
            amount: -totalWages,
            type: 'WAGE',
            description: `Salaires hebdomadaires : -${totalWages.toLocaleString('fr-FR')}`,
          },
        }),
      ]);
    }

    this.logger.log(
      `✅ [FinanceService] Wages processed for ${wagesByTeam.size} team(s).`,
    );
  }

  async getTeamFinances(teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, name: true, budget: true },
    });

    if (!team) throw new NotFoundException(`Club #${teamId} introuvable`);

    const transactions = await this.prisma.transaction.findMany({
      where: { team_id: teamId },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    const contracts = await this.prisma.contract.findMany({
      where: { team_id: teamId },
      include: { user: { select: { id: true, ea_persona_name: true } } },
      orderBy: { expires_at: 'asc' },
    });

    return { budget: team.budget, transactions, contracts };
  }
}
