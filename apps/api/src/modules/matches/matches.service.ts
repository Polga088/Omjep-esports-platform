import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@api/prisma/prisma.service';
import { MatchStatus } from '@omjep/shared';
import { CompetitionsService } from '../competitions/competitions.service';
import { ReportMatchDto } from './dto/report-match.dto';
import { ConfirmMatchDto } from './dto/confirm-match.dto';
import { isEaClubsSyncEnabled } from '../sync/ea-clubs-sync.config';

const TEAM_WITH_MANAGER = {
  id: true,
  name: true,
  logo_url: true,
  manager_id: true,
  manager: { select: { level: true } },
} as const;

const MATCH_INCLUDE = {
  competition: { select: { id: true, name: true, type: true } },
  homeTeam: { select: TEAM_WITH_MANAGER },
  awayTeam: { select: TEAM_WITH_MANAGER },
} as const;

const UPCOMING_STATUSES: MatchStatus[] = ['SCHEDULED', 'PENDING', 'LIVE', 'DISPUTE'];
const RANK_COUNTED_STATUSES: MatchStatus[] = ['PLAYED', 'VALIDATED'];

type LeagueStats = {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  rank: number;
};

function buildLeagueTable(
  teamIds: string[],
  matches: Array<{
    home_team_id: string;
    away_team_id: string;
    home_score: number | null;
    away_score: number | null;
  }>,
): Map<string, LeagueStats> {
  const map = new Map<string, Omit<LeagueStats, 'rank'>>();
  for (const teamId of teamIds) {
    map.set(teamId, {
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  }

  for (const match of matches) {
    if (match.home_score == null || match.away_score == null) continue;

    const home = map.get(match.home_team_id);
    const away = map.get(match.away_team_id);
    if (!home || !away) continue;

    const hs = match.home_score;
    const as = match.away_score;

    home.played += 1;
    away.played += 1;
    home.goalsFor += hs;
    home.goalsAgainst += as;
    away.goalsFor += as;
    away.goalsAgainst += hs;

    if (hs > as) {
      home.won += 1;
      away.lost += 1;
      home.points += 3;
    } else if (hs < as) {
      away.won += 1;
      home.lost += 1;
      away.points += 3;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  const sorted = Array.from(map.entries())
    .map(([teamId, row]) => ({
      teamId,
      ...row,
      goalDifference: row.goalsFor - row.goalsAgainst,
    }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        a.teamId.localeCompare(b.teamId),
    );

  const withRank = new Map<string, LeagueStats>();
  sorted.forEach((row, index) => {
    withRank.set(row.teamId, {
      ...row,
      rank: index + 1,
    });
  });
  return withRank;
}

/** Web dashboard `/dashboard/matches` attend ces alias camelCase sur ce endpoint uniquement. */
function toIsoFromMatchSchedule(
  startTime: Date | string | null | undefined,
  playedAt: Date | string | null | undefined,
): string {
  const raw = startTime ?? playedAt
  if (raw == null) return new Date(0).toISOString()
  if (typeof raw === 'string') {
    const parsed = new Date(raw)
    return Number.isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString()
  }
  return raw.toISOString()
}

function mapClubForMyTeamDashboardWeb(team: {
  id: string;
  name: string;
  logo_url: string | null;
  manager_id?: string | null;
  manager?: { level: number } | null;
}) {
  return {
    id: team.id,
    name: team.name,
    logoUrl: team.logo_url ?? null,
    managerId: team.manager_id ?? null,
    ...(team.manager != null ? { manager: team.manager } : {}),
  };
}

function sortMatchesCalendar<T extends { status: MatchStatus; played_at: Date | null }>(
  matches: T[],
): T[] {
  return [...matches].sort((a, b) => {
    const aUpcoming = UPCOMING_STATUSES.includes(a.status);
    const bUpcoming = UPCOMING_STATUSES.includes(b.status);

    if (aUpcoming && !bUpcoming) return -1;
    if (!aUpcoming && bUpcoming) return 1;

    const aTime = a.played_at?.getTime() ?? 0;
    const bTime = b.played_at?.getTime() ?? 0;

    if (aUpcoming) return aTime - bTime;
    return bTime - aTime;
  });
}

@Injectable()
export class MatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly competitionsService: CompetitionsService,
  ) {}

  /**
   * Matchs à venir (SCHEDULED / LIVE) pour toutes les équipes du joueur, tri chronologique sur `startTime`.
   * Les matchs sans date planifiée sont en fin de liste.
   */
  async findMyUpcomingSchedule(userId: string) {
    const memberships = await this.prisma.teamMember.findMany({
      where: { user_id: userId },
      select: { team_id: true },
    });
    const teamIds = [...new Set(memberships.map((m) => m.team_id))];
    if (teamIds.length === 0) return [];

    const now = new Date();
    const matches = await this.prisma.match.findMany({
      where: {
        OR: [{ home_team_id: { in: teamIds } }, { away_team_id: { in: teamIds } }],
        status: { in: ['SCHEDULED', 'LIVE'] },
      },
      include: MATCH_INCLUDE,
    });

    const upcoming = matches.filter((m) => !m.startTime || m.startTime >= now);
    upcoming.sort((a, b) => {
      const ta = a.startTime?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const tb = b.startTime?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (ta !== tb) return ta - tb;
      return (a.round ?? '').localeCompare(b.round ?? '', 'fr');
    });

    const enriched = await this.competitionsService.enrichMatchesWithFormAndRank(upcoming);
    return enriched.map((m) => ({
      ...m,
      viewer_team_id:
        teamIds.find((t) => t === m.home_team_id) ??
        teamIds.find((t) => t === m.away_team_id) ??
        null,
    }));
  }

  async findMyTeamMatches(userId: string) {
    const membership = await this.prisma.teamMember.findFirst({
      where: { user_id: userId },
      select: { team_id: true },
    });

    if (!membership) {
      throw new NotFoundException("Vous n'appartenez à aucune équipe.");
    }

    const teamId = membership.team_id;

    const [club, mem, authUser] = await Promise.all([
      this.prisma.club.findUnique({
        where: { id: teamId },
        select: { manager_id: true },
      }),
      this.prisma.teamMember.findUnique({
        where: { user_id_team_id: { user_id: userId, team_id: teamId } },
        select: { club_role: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      }),
    ]);

    const canRunEaMatchSync =
      authUser?.role === 'ADMIN' ||
      club?.manager_id === userId ||
      (mem != null &&
        ['FOUNDER', 'MANAGER', 'CO_MANAGER'].includes(mem.club_role));

    const matches = await this.prisma.match.findMany({
      where: {
        OR: [{ home_team_id: teamId }, { away_team_id: teamId }],
      },
      include: MATCH_INCLUDE,
    });

    const sorted = sortMatchesCalendar(matches);
    const enriched = await this.competitionsService.enrichMatchesWithFormAndRank(sorted);
    return enriched.map((m) => ({
      ...m,
      scheduledAt: toIsoFromMatchSchedule(m.startTime, m.played_at),
      homeScore: m.home_score,
      awayScore: m.away_score,
      proofUrl: m.proof_url ?? null,
      homeTeam: mapClubForMyTeamDashboardWeb(m.homeTeam),
      awayTeam: mapClubForMyTeamDashboardWeb(m.awayTeam),
      myTeamId: teamId,
      eaClubsSyncEnabled: isEaClubsSyncEnabled(),
      canRunEaMatchSync,
    }));
  }

  async findCompetitionMatches(competitionId: string) {
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
      select: { id: true },
    });

    if (!competition) {
      throw new NotFoundException('Compétition introuvable.');
    }

    const matches = await this.prisma.match.findMany({
      where: { competition_id: competitionId },
      include: MATCH_INCLUDE,
    });

    const sorted = sortMatchesCalendar(matches);
    return this.competitionsService.enrichMatchesWithFormAndRank(sorted);
  }

  async submitScoreReport(
    userId: string,
    matchId: string,
    homeScore: number,
    awayScore: number,
    proofUrl?: string,
  ) {
    return this.reportMatch(userId, matchId, {
      homeScore,
      awayScore,
      proofUrl,
    });
  }

  async reportMatch(userId: string, matchId: string, body: ReportMatchDto) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        status: true,
        home_team_id: true,
        away_team_id: true,
        homeTeam: { select: { manager_id: true } },
        awayTeam: { select: { manager_id: true } },
      },
    });

    if (!match) {
      throw new NotFoundException('Match introuvable.');
    }

    if (!['SCHEDULED', 'PENDING', 'DISPUTE'].includes(match.status)) {
      throw new BadRequestException(
        'Ce match ne peut plus recevoir de report.',
      );
    }

    const isHomeCaptain = match.homeTeam.manager_id === userId;
    const isAwayCaptain = match.awayTeam.manager_id === userId;
    if (!isHomeCaptain && !isAwayCaptain) {
      throw new ForbiddenException(
        'Seul le capitaine de l’une des deux équipes peut reporter ce match.',
      );
    }

    const reportingTeamId = isHomeCaptain ? match.home_team_id : match.away_team_id;
    const reported = await this.prisma.matchScoreReport.upsert({
      where: {
        match_id_reporting_team_id: {
          match_id: matchId,
          reporting_team_id: reportingTeamId,
        },
      },
      create: {
        match_id: matchId,
        reporting_team_id: reportingTeamId,
        submitted_by_id: userId,
        home_score: body.homeScore,
        away_score: body.awayScore,
      },
      update: {
        home_score: body.homeScore,
        away_score: body.awayScore,
        submitted_by_id: userId,
      },
    });

    const updatedMatch = await this.prisma.match.update({
      where: { id: matchId },
      data: {
        home_score: body.homeScore,
        away_score: body.awayScore,
        proof_url: body.proofUrl ?? undefined,
        status: 'PENDING',
      },
      select: {
        id: true,
        status: true,
        home_score: true,
        away_score: true,
        proof_url: true,
      },
    });

    return {
      report: reported,
      match: updatedMatch,
    };
  }

  async confirmMatch(userId: string, matchId: string, body: ConfirmMatchDto) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        status: true,
        competition_id: true,
        home_team_id: true,
        away_team_id: true,
        homeTeam: { select: { manager_id: true } },
        awayTeam: { select: { manager_id: true } },
      },
    });

    if (!match) {
      throw new NotFoundException('Match introuvable.');
    }

    const isHomeCaptain = match.homeTeam.manager_id === userId;
    const isAwayCaptain = match.awayTeam.manager_id === userId;
    if (!isHomeCaptain && !isAwayCaptain) {
      throw new ForbiddenException(
        'Seul le capitaine adverse peut confirmer ce score.',
      );
    }

    if (!['PENDING', 'SCHEDULED', 'DISPUTE'].includes(match.status)) {
      throw new BadRequestException('Ce match ne nécessite pas de confirmation.');
    }

    const confirmingTeamId = isHomeCaptain ? match.home_team_id : match.away_team_id;
    const reporter = await this.prisma.matchScoreReport.findFirst({
      where: {
        match_id: matchId,
        reporting_team_id: { not: confirmingTeamId },
      },
    });

    if (!reporter) {
      throw new BadRequestException(
        "Aucun report adverse n'est disponible pour confirmer ce match.",
      );
    }

    const targetHomeScore = body.homeScore ?? reporter.home_score;
    const targetAwayScore = body.awayScore ?? reporter.away_score;
    const isConflict =
      targetHomeScore !== reporter.home_score || targetAwayScore !== reporter.away_score;

    if (isConflict) {
      await this.prisma.$transaction(async (tx) => {
        await tx.matchScoreReport.upsert({
          where: {
            match_id_reporting_team_id: {
              match_id: matchId,
              reporting_team_id: confirmingTeamId,
            },
          },
          create: {
            match_id: matchId,
            reporting_team_id: confirmingTeamId,
            submitted_by_id: userId,
            home_score: targetHomeScore,
            away_score: targetAwayScore,
          },
          update: {
            submitted_by_id: userId,
            home_score: targetHomeScore,
            away_score: targetAwayScore,
          },
        });

        await tx.match.update({
          where: { id: matchId },
          data: { status: 'DISPUTE' },
        });
      });

      return {
        status: 'DISPUTE',
        message: 'Conflit de score détecté. Match placé en litige.',
      };
    }

    return this.prisma.$transaction(async (tx) => {
      const previousRows = match.competition_id
        ? await tx.leagueTable.findMany({
            where: { competition_id: match.competition_id },
            select: { team_id: true, points: true },
          })
        : [];

      await tx.matchScoreReport.upsert({
        where: {
          match_id_reporting_team_id: {
            match_id: matchId,
            reporting_team_id: confirmingTeamId,
          },
        },
        create: {
          match_id: matchId,
          reporting_team_id: confirmingTeamId,
          submitted_by_id: userId,
          home_score: targetHomeScore,
          away_score: targetAwayScore,
        },
        update: {
          submitted_by_id: userId,
          home_score: targetHomeScore,
          away_score: targetAwayScore,
        },
      });

      const validatedMatch = await tx.match.update({
        where: { id: matchId },
        data: {
          status: 'VALIDATED',
          home_score: targetHomeScore,
          away_score: targetAwayScore,
          played_at: new Date(),
        },
        select: {
          id: true,
          status: true,
          competition_id: true,
          home_team_id: true,
          away_team_id: true,
          home_score: true,
          away_score: true,
        },
      });

      if (!validatedMatch.competition_id) {
        return {
          match: validatedMatch,
          rankingSummary: null,
        };
      }

      const competitionTeamIds = (
        await tx.competitionTeam.findMany({
          where: { competition_id: validatedMatch.competition_id },
          select: { team_id: true },
        })
      ).map((item) => item.team_id);

      const rankedMatches = await tx.match.findMany({
        where: {
          competition_id: validatedMatch.competition_id,
          status: { in: RANK_COUNTED_STATUSES },
        },
        select: {
          home_team_id: true,
          away_team_id: true,
          home_score: true,
          away_score: true,
        },
      });

      const ranking = buildLeagueTable(competitionTeamIds, rankedMatches);
      const previousByTeam = new Map(previousRows.map((row) => [row.team_id, row]));

      for (const [teamId, row] of ranking.entries()) {
        await tx.leagueTable.upsert({
          where: {
            competition_id_team_id: {
              competition_id: validatedMatch.competition_id,
              team_id: teamId,
            },
          },
          create: {
            competition_id: validatedMatch.competition_id,
            team_id: teamId,
            played: row.played,
            won: row.won,
            drawn: row.drawn,
            lost: row.lost,
            goals_for: row.goalsFor,
            goals_against: row.goalsAgainst,
            goal_difference: row.goalDifference,
            points: row.points,
          },
          update: {
            played: row.played,
            won: row.won,
            drawn: row.drawn,
            lost: row.lost,
            goals_for: row.goalsFor,
            goals_against: row.goalsAgainst,
            goal_difference: row.goalDifference,
            points: row.points,
          },
        });
      }

      const homeRank = ranking.get(validatedMatch.home_team_id);
      const awayRank = ranking.get(validatedMatch.away_team_id);
      const homePrevious = previousByTeam.get(validatedMatch.home_team_id);
      const awayPrevious = previousByTeam.get(validatedMatch.away_team_id);

      return {
        match: validatedMatch,
        rankingSummary: {
          homeTeam: {
            teamId: validatedMatch.home_team_id,
            rank: homeRank?.rank ?? null,
            points: homeRank?.points ?? null,
            pointsDelta: (homeRank?.points ?? 0) - (homePrevious?.points ?? 0),
          },
          awayTeam: {
            teamId: validatedMatch.away_team_id,
            rank: awayRank?.rank ?? null,
            points: awayRank?.points ?? null,
            pointsDelta: (awayRank?.points ?? 0) - (awayPrevious?.points ?? 0),
          },
        },
      };
    });
  }
}
