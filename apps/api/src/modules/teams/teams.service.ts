import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@api/prisma/prisma.service';
import { ClubsService } from '../clubs/clubs.service';
import { MatchStatus, Prisma } from '@omjep/database';

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

export type LadderEntry = {
  rank: number;
  teamId: string;
  teamName: string;
  logoUrl: string | null;
  platform: string;
  memberCount: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
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
} satisfies Prisma.ClubInclude;

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clubsService: ClubsService,
  ) {}

  async findAll() {
    return this.clubsService.findAll();
  }

  async findOne(id: string) {
    const team = await this.prisma.club.findUnique({
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

  async create(data: Prisma.ClubCreateInput) {
    return this.prisma.club.create({ data });
  }

  async update(id: string, data: Prisma.ClubUpdateInput) {
    await this.findOne(id);
    try {
      return await this.prisma.club.update({ where: { id }, data });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Cet ID ProClubs est déjà lié à un autre club.',
        );
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.club.delete({ where: { id } });
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
    const team = await this.prisma.club.findUnique({
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
      const rawAmr = s?.average_rating ?? 0;
      const averageRating =
        typeof rawAmr === 'number' && Number.isFinite(rawAmr) ? rawAmr : 0;
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
    const averageAmrRaw = memberCount > 0 ? sumAmr / memberCount : 0;
    const averageAmr = Number.isFinite(averageAmrRaw) ? averageAmrRaw : 0;

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

  private static readonly LADDER_FINAL_STATUSES: MatchStatus[] = [
    'PLAYED',
    'VALIDATED',
    'FINISHED',
  ];

  /**
   * Classement global (sans `competitionId`) ou classement **ligue** pour une compétition donnée.
   * MJ/V/N/D/BP/BC/DIFF/PTS à partir des matchs finalisés (scores renseignés).
   * Tri : points, matchs joués, différence de buts, buts pour, nom du club.
   *
   * `competitionId` : uniquement les clubs inscrits à la compétition + matchs où `competition_id` = id.
   */
  async getLadder(competitionId?: string): Promise<LadderEntry[]> {
    const finalizedWhere: Prisma.MatchWhereInput = {
      status: { in: [...TeamsService.LADDER_FINAL_STATUSES] },
      home_score: { not: null },
      away_score: { not: null },
    };

    let entries: LadderEntry[];
    const byTeamId = new Map<string, LadderEntry>();

    if (competitionId) {
      const competition = await this.prisma.competition.findUnique({
        where: { id: competitionId },
        include: {
          teams: {
            include: {
              team: { include: { members: true } },
            },
          },
        },
      });
      if (!competition) {
        throw new NotFoundException(`Compétition #${competitionId} introuvable.`);
      }

      entries = competition.teams.map((ct) => {
        const team = ct.team;
        return {
          rank: 0,
          teamId: team.id,
          teamName: team.name,
          logoUrl: team.logo_url,
          platform: team.platform,
          memberCount: team.members.length,
          matchesPlayed: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
        };
      });
      for (const e of entries) {
        byTeamId.set(e.teamId, e);
      }

      const finalizedMatches = await this.prisma.match.findMany({
        where: {
          ...finalizedWhere,
          competition_id: competitionId,
        },
        select: {
          home_team_id: true,
          away_team_id: true,
          home_score: true,
          away_score: true,
        },
      });

      for (const match of finalizedMatches) {
        const home = byTeamId.get(match.home_team_id);
        const away = byTeamId.get(match.away_team_id);
        if (!home || !away) continue;

        const homeScore = match.home_score ?? 0;
        const awayScore = match.away_score ?? 0;

        home.matchesPlayed += 1;
        away.matchesPlayed += 1;
        home.goalsFor += homeScore;
        home.goalsAgainst += awayScore;
        away.goalsFor += awayScore;
        away.goalsAgainst += homeScore;

        if (homeScore > awayScore) {
          home.wins += 1;
          away.losses += 1;
          home.points += 3;
        } else if (homeScore < awayScore) {
          away.wins += 1;
          home.losses += 1;
          away.points += 3;
        } else {
          home.draws += 1;
          away.draws += 1;
          home.points += 1;
          away.points += 1;
        }
      }
    } else {
      const teams = await this.prisma.club.findMany({
        include: { members: true },
      });

      entries = teams.map((team) => ({
        rank: 0,
        teamId: team.id,
        teamName: team.name,
        logoUrl: team.logo_url,
        platform: team.platform,
        memberCount: team.members.length,
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      }));

      for (const e of entries) {
        byTeamId.set(e.teamId, e);
      }

      const finalizedMatches = await this.prisma.match.findMany({
        where: finalizedWhere,
        select: {
          home_team_id: true,
          away_team_id: true,
          home_score: true,
          away_score: true,
        },
      });

      for (const match of finalizedMatches) {
        const home = byTeamId.get(match.home_team_id);
        const away = byTeamId.get(match.away_team_id);
        if (!home || !away) continue;

        const homeScore = match.home_score ?? 0;
        const awayScore = match.away_score ?? 0;

        home.matchesPlayed += 1;
        away.matchesPlayed += 1;
        home.goalsFor += homeScore;
        home.goalsAgainst += awayScore;
        away.goalsFor += awayScore;
        away.goalsAgainst += homeScore;

        if (homeScore > awayScore) {
          home.wins += 1;
          away.losses += 1;
          home.points += 3;
        } else if (homeScore < awayScore) {
          away.wins += 1;
          home.losses += 1;
          away.points += 3;
        } else {
          home.draws += 1;
          away.draws += 1;
          home.points += 1;
          away.points += 1;
        }
      }
    }

    for (const entry of entries) {
      entry.goalDifference = entry.goalsFor - entry.goalsAgainst;
    }

    entries.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.matchesPlayed !== a.matchesPlayed) return b.matchesPlayed - a.matchesPlayed;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.teamName.localeCompare(b.teamName);
    });

    for (let i = 0; i < entries.length; i++) {
      entries[i].rank = i + 1;
    }

    return entries;
  }

  /** Stats d'overview pour l'équipe de l'utilisateur (lookup léger du team_id). */
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
