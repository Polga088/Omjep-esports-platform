import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@api/prisma/prisma.service';
import { MatchStatus } from '@omjep/shared';
import { CompetitionsService } from '../competitions/competitions.service';

const CLUB_STAFF_ROLES = ['FOUNDER', 'MANAGER', 'CO_MANAGER'] as const;

const MATCH_INCLUDE = {
  competition: { select: { id: true, name: true, type: true } },
  homeTeam: { select: { id: true, name: true, logo_url: true } },
  awayTeam: { select: { id: true, name: true, logo_url: true } },
} as const;

const UPCOMING_STATUSES: MatchStatus[] = ['SCHEDULED', 'LIVE'];

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

  async findMyTeamMatches(userId: string) {
    const membership = await this.prisma.teamMember.findFirst({
      where: { user_id: userId },
      select: { team_id: true },
    });

    if (!membership) {
      throw new NotFoundException("Vous n'appartenez à aucune équipe.");
    }

    const teamId = membership.team_id;

    const matches = await this.prisma.match.findMany({
      where: {
        OR: [{ home_team_id: teamId }, { away_team_id: teamId }],
      },
      include: MATCH_INCLUDE,
    });

    const sorted = sortMatchesCalendar(matches);
    return this.competitionsService.enrichMatchesWithFormAndRank(sorted);
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
  ) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        status: true,
        home_team_id: true,
        away_team_id: true,
      },
    });

    if (!match) {
      throw new NotFoundException('Match introuvable.');
    }

    if (match.status !== 'SCHEDULED') {
      throw new BadRequestException(
        'Vous ne pouvez déclarer un score que pour un match programmé.',
      );
    }

    const membership = await this.prisma.teamMember.findFirst({
      where: {
        user_id: userId,
        team_id: { in: [match.home_team_id, match.away_team_id] },
        club_role: { in: [...CLUB_STAFF_ROLES] },
      },
      select: { team_id: true },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Seuls les dirigeants du club (domicile ou extérieur) peuvent déclarer le score.',
      );
    }

    const reportingTeamId = membership.team_id;

    return this.prisma.matchScoreReport.upsert({
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
        home_score: homeScore,
        away_score: awayScore,
      },
      update: {
        home_score: homeScore,
        away_score: awayScore,
        submitted_by_id: userId,
      },
      include: {
        reportingTeam: { select: { id: true, name: true } },
        submittedBy: {
          select: { id: true, email: true, ea_persona_name: true },
        },
      },
    });
  }
}
