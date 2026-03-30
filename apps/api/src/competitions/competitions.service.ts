import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface StandingRow {
  team: { id: string; name: string; logo_url: string | null };
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  diff: number;
}

@Injectable()
export class CompetitionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStandings(competitionId: string): Promise<StandingRow[]> {
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        teams: { include: { team: true } },
        matches: {
          where: { status: 'PLAYED' },
        },
      },
    });

    if (!competition) {
      throw new NotFoundException('Compétition introuvable.');
    }

    const standingsMap = new Map<string, StandingRow>();

    for (const ct of competition.teams) {
      standingsMap.set(ct.team_id, {
        team: {
          id: ct.team.id,
          name: ct.team.name,
          logo_url: ct.team.logo_url,
        },
        points: 0,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        diff: 0,
      });
    }

    for (const match of competition.matches) {
      const homeScore = match.home_score ?? 0;
      const awayScore = match.away_score ?? 0;

      const home = standingsMap.get(match.home_team_id);
      const away = standingsMap.get(match.away_team_id);

      if (home) {
        home.played++;
        home.goalsFor += homeScore;
        home.goalsAgainst += awayScore;
      }

      if (away) {
        away.played++;
        away.goalsFor += awayScore;
        away.goalsAgainst += homeScore;
      }

      if (homeScore > awayScore) {
        if (home) { home.won++; home.points += 3; }
        if (away) { away.lost++; }
      } else if (homeScore < awayScore) {
        if (away) { away.won++; away.points += 3; }
        if (home) { home.lost++; }
      } else {
        if (home) { home.drawn++; home.points += 1; }
        if (away) { away.drawn++; away.points += 1; }
      }
    }

    const standings = Array.from(standingsMap.values());

    for (const row of standings) {
      row.diff = row.goalsFor - row.goalsAgainst;
    }

    standings.sort((a, b) =>
      b.points - a.points
      || b.diff - a.diff
      || b.goalsFor - a.goalsFor,
    );

    return standings;
  }
}
