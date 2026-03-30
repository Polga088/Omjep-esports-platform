import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

// ─── Types for the ProClubs match results API ───────────────────────
interface ProClubsPlayerResult {
  ea_persona_name: string;
  goals: number;
  assists: number;
}

interface ProClubsMatchResult {
  match_id: string;
  home_club_id: string;
  away_club_id: string;
  home_score: number;
  away_score: number;
  played_at: string;
  home_players: ProClubsPlayerResult[];
  away_players: ProClubsPlayerResult[];
}

interface ProClubsResultsResponse {
  club_id: string;
  last_match: ProClubsMatchResult | null;
}

@Injectable()
export class ProClubsService {
  private readonly logger = new Logger(ProClubsService.name);
  private readonly apiBaseUrl =
    process.env.PROCLUBS_API_BASE_URL ?? 'https://proclubs.io/api';

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: HttpService,
  ) {}

  /**
   * Fetches the latest match result for a given EA club and returns raw data.
   */
  async fetchClubResults(
    clubId: string,
  ): Promise<ProClubsResultsResponse | null> {
    const url = `${this.apiBaseUrl}/club/${clubId}/results`;

    try {
      this.logger.debug(`[ProClubs] GET ${url}`);
      const response = await firstValueFrom(
        this.http.get<ProClubsResultsResponse>(url),
      );
      return response.data;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(
          `[ProClubs] API unavailable (${(error as Error).message}). Returning mock data for club ${clubId}.`,
        );
        return this.getMockResults(clubId);
      }

      this.logger.error(
        `[ProClubs] HTTP request failed for club ${clubId}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Synchronises a specific OMJEP match by pulling ProClubs data from both teams.
   * - Finds the SCHEDULED match
   * - Fetches results from ProClubs for the home team's ea_club_id
   * - Updates the score
   * - Creates MatchEvents (GOAL / ASSIST) by resolving ea_persona_name → User
   */
  async syncMatch(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: { include: { members: { include: { user: true } } } },
        awayTeam: { include: { members: { include: { user: true } } } },
      },
    });

    if (!match) {
      throw new NotFoundException(`Match ${matchId} introuvable.`);
    }

    if (match.status !== 'SCHEDULED') {
      throw new Error(
        `Match ${matchId} n'est pas SCHEDULED (status actuel : ${match.status}).`,
      );
    }

    const homeClubId = match.homeTeam.ea_club_id;
    if (!homeClubId) {
      throw new Error(
        `L'équipe domicile "${match.homeTeam.name}" n'a pas de ea_club_id configuré.`,
      );
    }

    const results = await this.fetchClubResults(homeClubId);
    if (!results?.last_match) {
      this.logger.warn(`[ProClubs] Aucun résultat trouvé pour le club ${homeClubId}.`);
      return { synced: false, reason: 'no_results' };
    }

    const externalMatch = results.last_match;

    const personaMap = this.buildPersonaMap(match);

    const events = this.extractEvents(externalMatch, personaMap);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (events.length > 0) {
        await tx.matchEvent.deleteMany({ where: { match_id: matchId } });
        await tx.matchEvent.createMany({
          data: events.map((e) => ({
            match_id: matchId,
            player_id: e.player_id,
            team_id: e.team_id,
            type: e.type,
            minute: null,
          })),
        });
      }

      return tx.match.update({
        where: { id: matchId },
        data: {
          home_score: externalMatch.home_score,
          away_score: externalMatch.away_score,
          ea_match_id: externalMatch.match_id,
          status: 'PLAYED',
          played_at: new Date(externalMatch.played_at),
        },
        include: {
          homeTeam: { select: { id: true, name: true } },
          awayTeam: { select: { id: true, name: true } },
          events: {
            include: {
              player: { select: { id: true, ea_persona_name: true } },
              team: { select: { id: true, name: true } },
            },
          },
        },
      });
    });

    this.logger.log(
      `[ProClubs] Match synced: ${updated.homeTeam.name} ${updated.home_score}–${updated.away_score} ${updated.awayTeam.name} (${events.length} events)`,
    );

    return { synced: true, match: updated };
  }

  // ─── Private helpers ──────────────────────────────────────────────

  /**
   * Builds a lowercase ea_persona_name → { userId, teamId } lookup from both rosters.
   */
  private buildPersonaMap(match: {
    homeTeam: { id: string; members: { user: { id: string; ea_persona_name: string | null } }[] };
    awayTeam: { id: string; members: { user: { id: string; ea_persona_name: string | null } }[] };
  }): Map<string, { userId: string; teamId: string }> {
    const map = new Map<string, { userId: string; teamId: string }>();

    for (const m of match.homeTeam.members) {
      if (m.user.ea_persona_name) {
        map.set(m.user.ea_persona_name.toLowerCase(), {
          userId: m.user.id,
          teamId: match.homeTeam.id,
        });
      }
    }

    for (const m of match.awayTeam.members) {
      if (m.user.ea_persona_name) {
        map.set(m.user.ea_persona_name.toLowerCase(), {
          userId: m.user.id,
          teamId: match.awayTeam.id,
        });
      }
    }

    return map;
  }

  /**
   * Extracts GOAL and ASSIST events from ProClubs player stats,
   * resolving each ea_persona_name to an OMJEP User.
   */
  private extractEvents(
    externalMatch: ProClubsMatchResult,
    personaMap: Map<string, { userId: string; teamId: string }>,
  ): { player_id: string; team_id: string; type: 'GOAL' | 'ASSIST' }[] {
    const events: { player_id: string; team_id: string; type: 'GOAL' | 'ASSIST' }[] = [];

    const processPlayers = (players: ProClubsPlayerResult[]) => {
      for (const p of players) {
        const resolved = personaMap.get(p.ea_persona_name.toLowerCase());
        if (!resolved) {
          this.logger.debug(
            `[ProClubs] Persona "${p.ea_persona_name}" non trouvée en DB. Ignorée.`,
          );
          continue;
        }

        for (let i = 0; i < p.goals; i++) {
          events.push({
            player_id: resolved.userId,
            team_id: resolved.teamId,
            type: 'GOAL',
          });
        }

        for (let i = 0; i < p.assists; i++) {
          events.push({
            player_id: resolved.userId,
            team_id: resolved.teamId,
            type: 'ASSIST',
          });
        }
      }
    };

    processPlayers(externalMatch.home_players);
    processPlayers(externalMatch.away_players);

    return events;
  }

  // ─── Mock data for development ────────────────────────────────────

  private getMockResults(clubId: string): ProClubsResultsResponse {
    return {
      club_id: clubId,
      last_match: {
        match_id: `mock-ea-match-${Date.now()}`,
        home_club_id: clubId,
        away_club_id: 'opponent-club-id',
        home_score: 3,
        away_score: 1,
        played_at: new Date().toISOString(),
        home_players: [
          { ea_persona_name: 'MockPlayer1', goals: 2, assists: 0 },
          { ea_persona_name: 'MockPlayer2', goals: 1, assists: 2 },
        ],
        away_players: [
          { ea_persona_name: 'MockPlayer3', goals: 1, assists: 0 },
        ],
      },
    };
  }
}
