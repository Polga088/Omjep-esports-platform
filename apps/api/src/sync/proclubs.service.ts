import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as cheerio from 'cheerio';

// ─── Scraped data structures ────────────────────────────────────────

export interface ScrapedPlayerEvent {
  playerName: string;
  goals: number;
  assists: number;
}

export interface ScrapedMatchResult {
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  players: ScrapedPlayerEvent[];
}

export interface PersonaMatch {
  scraped: string;
  goals: number;
  assists: number;
  matched: { userId: string; teamId: string; eaPersonaName: string } | null;
}

export interface SyncFromUrlResult {
  synced: boolean;
  reason?: string;
  scraped?: ScrapedMatchResult;
  matchedPlayers?: PersonaMatch[];
  createdEventsCount?: number;
  updatedMatch?: Record<string, unknown>;
}

@Injectable()
export class ProClubsService {
  private readonly logger = new Logger(ProClubsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Main entry point: scrapes a ProClubs.io URL, extracts the latest match
   * result + scorers/assisters, and matches them to OMJEP users via ea_persona_name.
   */
  async syncFromProClubsUrl(url: string): Promise<SyncFromUrlResult> {
    this.logger.log(`[ProClubs] Scraping URL: ${url}`);

    const scraped = await this.scrapeProClubsPage(url);
    if (!scraped) {
      return { synced: false, reason: 'scrape_failed' };
    }

    this.logger.log(
      `[ProClubs] Scraped match: ${scraped.homeTeamName} ${scraped.homeScore}–${scraped.awayScore} ${scraped.awayTeamName} (${scraped.players.length} player entries)`,
    );

    const team = await this.prisma.team.findUnique({
      where: { proclubs_url: url } as any,
      include: {
        members: { include: { user: true } },
      },
    });

    if (!team) {
      return {
        synced: false,
        reason: 'no_team_linked',
        scraped,
      };
    }

    const personaMap = this.buildPersonaMapFromTeam(team as any);
    const matchedPlayers = this.matchScrapedPlayers(scraped.players, personaMap);

    this.logger.log(
      `[ProClubs] Matched ${matchedPlayers.filter((p) => p.matched).length}/${matchedPlayers.length} players to OMJEP users`,
    );

    return {
      synced: true,
      scraped,
      matchedPlayers,
    };
  }

  /**
   * Full sync: scrape the page, find/create the Match in DB, insert MatchEvents.
   * Requires a matchId to target a specific OMJEP match.
   */
  async syncMatchFromUrl(matchId: string): Promise<SyncFromUrlResult> {
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

    const proClubsUrl = (match.homeTeam as any).proclubs_url;
    if (!proClubsUrl) {
      throw new Error(
        `L'équipe "${match.homeTeam.name}" n'a pas de proclubs_url configurée.`,
      );
    }

    const scraped = await this.scrapeProClubsPage(proClubsUrl);
    if (!scraped) {
      return { synced: false, reason: 'scrape_failed' };
    }

    const personaMap = this.buildPersonaMapFromMatch(match);
    const matchedPlayers = this.matchScrapedPlayers(scraped.players, personaMap);

    const events = this.buildEventsFromMatched(matchedPlayers);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (events.length > 0) {
        await tx.matchEvent.deleteMany({ where: { match_id: matchId } });
        await tx.matchEvent.createMany({
          data: events.map((e) => ({
            match_id: matchId,
            player_id: e.playerId,
            team_id: e.teamId,
            type: e.type,
            minute: null,
          })),
        });
      }

      return tx.match.update({
        where: { id: matchId },
        data: {
          home_score: scraped.homeScore,
          away_score: scraped.awayScore,
          status: 'PLAYED',
          played_at: new Date(),
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

    return {
      synced: true,
      scraped,
      matchedPlayers,
      createdEventsCount: events.length,
      updatedMatch: updated as unknown as Record<string, unknown>,
    };
  }

  // ─── Scraping logic ────────────────────────────────────────────────

  /**
   * Fetches the HTML from a ProClubs.io URL and extracts match data.
   *
   * ProClubs.io page structure (expected selectors — adjust if the site changes):
   * - Match score: `.match-score`, `.result-score`, or similar
   * - Team names: `.team-name`, `.club-name`, or header elements
   * - Player stats table: rows with player name, goals, assists columns
   *
   * Falls back to mock data in development if the URL is unreachable.
   */
  async scrapeProClubsPage(
    url: string,
  ): Promise<ScrapedMatchResult | null> {
    try {
      const { data: html } = await axios.get<string>(url, {
        timeout: 15_000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; OMJEP-Bot/1.0)',
          Accept: 'text/html',
        },
      });

      return this.parseProClubsHtml(html);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(
          `[ProClubs] Scrape failed (${(error as Error).message}). Returning mock data.`,
        );
        return this.getMockScrapedResult();
      }

      this.logger.error(
        `[ProClubs] Failed to scrape ${url}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Parses the HTML of a ProClubs.io page.
   *
   * Common patterns on proclubs.io:
   *   - `.match-result` or `.match-header` for the score block
   *   - `.team-home .team-name` / `.team-away .team-name` for team names
   *   - Score digits in `.score`, `.match-score`, or similar
   *   - Player stats in a table or list with columns: name, goals, assists, rating
   *
   * This parser tries multiple selector strategies to be resilient.
   */
  private parseProClubsHtml(html: string): ScrapedMatchResult | null {
    const $ = cheerio.load(html);

    const homeTeamName =
      this.textFrom($, '.team-home .team-name') ||
      this.textFrom($, '.home-team .club-name') ||
      this.textFrom($, '[data-team="home"] .name') ||
      'Home';

    const awayTeamName =
      this.textFrom($, '.team-away .team-name') ||
      this.textFrom($, '.away-team .club-name') ||
      this.textFrom($, '[data-team="away"] .name') ||
      'Away';

    const scoreText =
      this.textFrom($, '.match-score') ||
      this.textFrom($, '.result-score') ||
      this.textFrom($, '.score');

    let homeScore = 0;
    let awayScore = 0;

    if (scoreText) {
      const scoreParts = scoreText.split(/[-–:]/).map((s) => parseInt(s.trim(), 10));
      if (scoreParts.length >= 2 && !isNaN(scoreParts[0]) && !isNaN(scoreParts[1])) {
        homeScore = scoreParts[0];
        awayScore = scoreParts[1];
      }
    }

    const players: ScrapedPlayerEvent[] = [];

    const playerSelectors = [
      'table tbody tr',
      '.player-stats-row',
      '.player-row',
      '.match-players .player',
    ];

    for (const selector of playerSelectors) {
      $(selector).each((_, el) => {
        const row = $(el);
        const cells = row.find('td');

        if (cells.length >= 3) {
          const playerName = $(cells[0]).text().trim();
          const goals = parseInt($(cells[1]).text().trim(), 10) || 0;
          const assists = parseInt($(cells[2]).text().trim(), 10) || 0;

          if (playerName && (goals > 0 || assists > 0)) {
            players.push({ playerName, goals, assists });
          }
        }

        const nameEl = row.find('.player-name, .name, [data-player-name]');
        const goalsEl = row.find('.goals, [data-goals]');
        const assistsEl = row.find('.assists, [data-assists]');

        if (nameEl.length > 0) {
          const pName = nameEl.first().text().trim();
          const pGoals = parseInt(goalsEl.first().text().trim(), 10) || 0;
          const pAssists = parseInt(assistsEl.first().text().trim(), 10) || 0;

          if (pName && (pGoals > 0 || pAssists > 0)) {
            const exists = players.some(
              (p) => p.playerName.toLowerCase() === pName.toLowerCase(),
            );
            if (!exists) {
              players.push({ playerName: pName, goals: pGoals, assists: pAssists });
            }
          }
        }
      });

      if (players.length > 0) break;
    }

    if (homeScore === 0 && awayScore === 0 && players.length === 0) {
      this.logger.warn('[ProClubs] Could not extract any data from the HTML.');
      return null;
    }

    return { homeTeamName, awayTeamName, homeScore, awayScore, players };
  }

  private textFrom($: cheerio.CheerioAPI, selector: string): string {
    const el = $(selector).first();
    return el.length > 0 ? el.text().trim() : '';
  }

  // ─── Persona matching ─────────────────────────────────────────────

  /**
   * Builds a lowercase name → { userId, teamId, eaPersonaName } map from a team.
   */
  private buildPersonaMapFromTeam(team: {
    id: string;
    members: { user: { id: string; ea_persona_name: string | null } }[];
  }): Map<string, { userId: string; teamId: string; eaPersonaName: string }> {
    const map = new Map<string, { userId: string; teamId: string; eaPersonaName: string }>();

    for (const m of team.members) {
      if (m.user.ea_persona_name) {
        map.set(m.user.ea_persona_name.toLowerCase(), {
          userId: m.user.id,
          teamId: team.id,
          eaPersonaName: m.user.ea_persona_name,
        });
      }
    }

    return map;
  }

  /**
   * Builds a combined persona map from both home and away teams (for match sync).
   */
  private buildPersonaMapFromMatch(match: {
    homeTeam: { id: string; members: { user: { id: string; ea_persona_name: string | null } }[] };
    awayTeam: { id: string; members: { user: { id: string; ea_persona_name: string | null } }[] };
  }): Map<string, { userId: string; teamId: string; eaPersonaName: string }> {
    const map = new Map<string, { userId: string; teamId: string; eaPersonaName: string }>();

    for (const m of match.homeTeam.members) {
      if (m.user.ea_persona_name) {
        map.set(m.user.ea_persona_name.toLowerCase(), {
          userId: m.user.id,
          teamId: match.homeTeam.id,
          eaPersonaName: m.user.ea_persona_name,
        });
      }
    }

    for (const m of match.awayTeam.members) {
      if (m.user.ea_persona_name) {
        map.set(m.user.ea_persona_name.toLowerCase(), {
          userId: m.user.id,
          teamId: match.awayTeam.id,
          eaPersonaName: m.user.ea_persona_name,
        });
      }
    }

    return map;
  }

  /**
   * Matches scraped player names to OMJEP users using fuzzy-tolerant logic:
   *   1. Exact match (case-insensitive)
   *   2. Substring match (scraped name contained in ea_persona_name or vice versa)
   *   3. Normalized match (strip spaces, dashes, underscores)
   */
  matchScrapedPlayers(
    scrapedPlayers: ScrapedPlayerEvent[],
    personaMap: Map<string, { userId: string; teamId: string; eaPersonaName: string }>,
  ): PersonaMatch[] {
    return scrapedPlayers.map((sp) => {
      const base = { scraped: sp.playerName, goals: sp.goals, assists: sp.assists };
      const normalized = this.normalize(sp.playerName);

      const exactMatch = personaMap.get(sp.playerName.toLowerCase());
      if (exactMatch) {
        return { ...base, matched: exactMatch };
      }

      for (const [key, value] of personaMap.entries()) {
        if (key.includes(normalized) || normalized.includes(key)) {
          return { ...base, matched: value };
        }
      }

      for (const [key, value] of personaMap.entries()) {
        if (this.normalize(key) === normalized) {
          return { ...base, matched: value };
        }
      }

      this.logger.debug(
        `[ProClubs] No match for scraped player "${sp.playerName}"`,
      );
      return { ...base, matched: null };
    });
  }

  private normalize(name: string): string {
    return name.toLowerCase().replace(/[\s\-_.']/g, '');
  }

  // ─── Event building ───────────────────────────────────────────────

  private buildEventsFromMatched(
    matchedPlayers: PersonaMatch[],
  ): { playerId: string; teamId: string; type: 'GOAL' | 'ASSIST' }[] {
    const events: { playerId: string; teamId: string; type: 'GOAL' | 'ASSIST' }[] = [];

    for (const pm of matchedPlayers) {
      if (!pm.matched) continue;

      for (let i = 0; i < pm.goals; i++) {
        events.push({
          playerId: pm.matched.userId,
          teamId: pm.matched.teamId,
          type: 'GOAL',
        });
      }

      for (let i = 0; i < pm.assists; i++) {
        events.push({
          playerId: pm.matched.userId,
          teamId: pm.matched.teamId,
          type: 'ASSIST',
        });
      }
    }

    return events;
  }

  /**
   * Alias kept for backward compatibility with AdminSyncController.
   */
  async syncMatch(matchId: string) {
    return this.syncMatchFromUrl(matchId);
  }

  // ─── Mock data for development ────────────────────────────────────

  private getMockScrapedResult(): ScrapedMatchResult {
    return {
      homeTeamName: 'Eagles FC',
      awayTeamName: 'Rival FC',
      homeScore: 3,
      awayScore: 1,
      players: [
        { playerName: 'MockPlayer1', goals: 2, assists: 0 },
        { playerName: 'MockPlayer2', goals: 1, assists: 2 },
        { playerName: 'MockPlayer3', goals: 1, assists: 0 },
      ],
    };
  }
}
