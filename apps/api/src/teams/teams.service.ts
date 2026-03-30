import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@omjep/database';

export type TeamMemberStatSnapshot = {
  userId: string;
  displayName: string | null;
  goals: number;
  assists: number;
  averageRating: number;
};

export type TeamStatsOverview = {
  totals: {
    goals: number;
    assists: number;
    averageAmr: number;
  };
  topScorer: TeamMemberStatSnapshot | null;
  mvp: TeamMemberStatSnapshot | null;
};

const TEAM_WITH_ROSTER = {
  members: {
    orderBy: { joined_at: 'asc' as const },
    include: {
      user: {
        select: {
          id: true,
          ea_persona_name: true,
          preferred_position: true,
          nationality: true,
          stats: true,
        },
      },
    },
  },
} satisfies Prisma.TeamInclude;

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.team.findMany({
      include: {
        _count: { select: { members: true } },
      },
    });
  }

  async findOne(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                ea_persona_name: true,
                preferred_position: true,
                stats: true,
              },
            },
          },
        },
      },
    });

    if (!team) throw new NotFoundException(`Club #${id} introuvable`);
    return team;
  }

  async create(data: Prisma.TeamCreateInput) {
    return this.prisma.team.create({ data });
  }

  async update(id: string, data: Prisma.TeamUpdateInput) {
    await this.findOne(id);
    return this.prisma.team.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.team.delete({ where: { id } });
  }

  async addMember(teamId: string, userId: string, clubRole: Prisma.TeamMemberCreateInput['club_role']) {
    return this.prisma.teamMember.create({
      data: {
        team: { connect: { id: teamId } },
        user: { connect: { id: userId } },
        club_role: clubRole,
      },
    });
  }

  async removeMember(teamId: string, userId: string) {
    return this.prisma.teamMember.delete({
      where: { user_id_team_id: { user_id: userId, team_id: teamId } },
    });
  }

  async findMyTeam(userId: string) {
    const membership = await this.prisma.teamMember.findFirst({
      where: { user_id: userId },
      include: {
        team: {
          include: TEAM_WITH_ROSTER,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException("Vous n'appartenez à aucune équipe.");
    }

    return membership.team;
  }

  /**
   * Agrège buts, passes et AMR sur tout le roster, et désigne le meilleur buteur et le MVP (meilleure note moyenne).
   */
  async getTeamStats(teamId: string): Promise<TeamStatsOverview> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true },
    });
    if (!team) {
      throw new NotFoundException(`Club #${teamId} introuvable`);
    }

    const members = await this.prisma.teamMember.findMany({
      where: { team_id: teamId },
      include: {
        user: {
          select: {
            id: true,
            ea_persona_name: true,
            gamertag_psn: true,
            gamertag_xbox: true,
            stats: true,
          },
        },
      },
    });

    const snapshots: TeamMemberStatSnapshot[] = members.map((m) => {
      const s = m.user.stats;
      const goals = s?.goals ?? 0;
      const assists = s?.assists ?? 0;
      const averageRating = s?.average_rating ?? 0;
      const displayName =
        m.user.ea_persona_name ?? m.user.gamertag_psn ?? m.user.gamertag_xbox ?? null;
      return {
        userId: m.user.id,
        displayName,
        goals,
        assists,
        averageRating,
      };
    });

    const memberCount = snapshots.length;
    const totalGoals = snapshots.reduce((acc, x) => acc + x.goals, 0);
    const totalAssists = snapshots.reduce((acc, x) => acc + x.assists, 0);
    const sumAmr = snapshots.reduce((acc, x) => acc + x.averageRating, 0);
    const averageAmr = memberCount > 0 ? sumAmr / memberCount : 0;

    const compareIds = (a: string, b: string) => a.localeCompare(b);

    const topScorer =
      memberCount === 0
        ? null
        : [...snapshots].sort((a, b) => {
            if (b.goals !== a.goals) return b.goals - a.goals;
            if (b.assists !== a.assists) return b.assists - a.assists;
            return compareIds(a.userId, b.userId);
          })[0] ?? null;

    const mvp =
      memberCount === 0
        ? null
        : [...snapshots].sort((a, b) => {
            if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
            if (b.goals !== a.goals) return b.goals - a.goals;
            return compareIds(a.userId, b.userId);
          })[0] ?? null;

    return {
      totals: {
        goals: totalGoals,
        assists: totalAssists,
        averageAmr,
      },
      topScorer,
      mvp,
    };
  }

  /** Stats d’overview pour l’équipe de l’utilisateur (lookup léger du team_id). */
  async getMyTeamOverview(userId: string): Promise<TeamStatsOverview> {
    const membership = await this.prisma.teamMember.findFirst({
      where: { user_id: userId },
      select: { team_id: true },
    });
    if (!membership) {
      throw new NotFoundException("Vous n'appartenez à aucune équipe.");
    }
    return this.getTeamStats(membership.team_id);
  }
}
