import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateContractDto } from './dto/create-contract.dto';
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

  private static readonly STAFF_CLUB_ROLES = [
    'FOUNDER',
    'MANAGER',
    'CO_MANAGER',
  ] as const;

  async assertStaffOrAdminForTeam(
    actorUserId: string,
    actorRole: string,
    teamId: string,
  ) {
    if (actorRole === 'ADMIN') return;

    const membership = await this.prisma.teamMember.findUnique({
      where: {
        user_id_team_id: { user_id: actorUserId, team_id: teamId },
      },
    });

    if (
      !membership ||
      !FinanceService.STAFF_CLUB_ROLES.includes(
        membership.club_role as (typeof FinanceService.STAFF_CLUB_ROLES)[number],
      )
    ) {
      throw new ForbiddenException(
        'Accès refusé : seuls les dirigeants du club ou un administrateur peuvent accéder à cette ressource.',
      );
    }
  }

  async getTeamFinances(
    teamId: string,
    actorUserId: string,
    actorRole: string,
  ) {
    await this.assertStaffOrAdminForTeam(actorUserId, actorRole, teamId);

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

  async createContract(
    actorUserId: string,
    actorRole: string,
    dto: CreateContractDto,
  ) {
    await this.assertStaffOrAdminForTeam(actorUserId, actorRole, dto.team_id);

    return this.prisma.contract.create({
      data: {
        team_id: dto.team_id,
        user_id: dto.user_id,
        salary: dto.salary,
        release_clause: dto.release_clause,
        expires_at: new Date(dto.expires_at),
      },
    });
  }
}
