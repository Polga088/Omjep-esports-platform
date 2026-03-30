import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchStatus } from '@omjep/database';

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
  constructor(private readonly prisma: PrismaService) {}

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

    return sortMatchesCalendar(matches);
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

    return sortMatchesCalendar(matches);
  }
}
