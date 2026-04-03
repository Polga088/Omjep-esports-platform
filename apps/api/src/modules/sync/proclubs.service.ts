import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@api/prisma/prisma.service';
import { LevelingService } from '../leveling/leveling.service';
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

/** Ligne roster / stats joueur extraite d’une page ProClubs.io (club). */
export interface ScrapedClubRosterRow {
  playerName: string;
  goals: number;
  matchesPlayed: number;
  averageRating: number;
}

export interface SyncClubStatsResult {
  synced: boolean;
  reason?: string;
  xp_prestige: number;
  prestige_level: number;
  playersUpdated: number;
  rosterRowsParsed: number;
}

@Injectable()
export class ProClubsService {
  private readonly logger = new Logger(ProClubsService.name);

  private static readonly XP_GOAL = 25;
  private static readonly XP_ASSIST = 15;
  private static readonly XP_MATCH_PARTICIPATION = 50;

  constructor(
    private readonly prisma: PrismaService,
    private readonly leveling: LevelingService,
  ) {}

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

    const team = await this.prisma.club.findUnique({
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

    // ─── Award XP ──────────────────────────────────────────────────
    await this.awardXpForMatch(matchedPlayers);

    return {
      synced: true,
      scraped,
      matchedPlayers,
      createdEventsCount: events.length,
      updatedMatch: updated as unknown as Record<string, unknown>,
    };
  }

  // ─── XP awarding ──────────────────────────────────────────────────

  /**
   * Awards XP to every matched player based on the barème:
   *   Goal = 25 XP, Assist = 15 XP, Match participation = 50 XP.
   * Also grants cumulative XP to each player's team.
   */
  private async awardXpForMatch(matchedPlayers: PersonaMatch[]): Promise<void> {
    const teamXpAccumulator = new Map<string, number>();

    for (const pm of matchedPlayers) {
      if (!pm.matched) continue;

      const playerXp =
        ProClubsService.XP_MATCH_PARTICIPATION +
        pm.goals * ProClubsService.XP_GOAL +
        pm.assists * ProClubsService.XP_ASSIST;

      await this.leveling.addPlayerXp(pm.matched.userId, playerXp);

      const prev = teamXpAccumulator.get(pm.matched.teamId) ?? 0;
      teamXpAccumulator.set(pm.matched.teamId, prev + playerXp);
    }

    for (const [teamId, totalXp] of teamXpAccumulator) {
      await this.leveling.addTeamXp(teamId, totalXp);
    }
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

  // ─── Sync club stats from ProClubs.io URL ─────────────────────────

  /**
   * Récupère les stats via l’URL `proclubs_url` du club, met à jour `player_stats`
   * (buts, matchs joués, AMR) et recalcule `xp` / `prestige_level` du club.
   */
  async syncClubStatsForClub(clubId: string): Promise<SyncClubStatsResult> {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, ea_persona_name: true },
            },
          },
        },
      },
    });

    if (!club) {
      throw new NotFoundException(`Club #${clubId} introuvable.`);
    }

    const url = club.proclubs_url?.trim();
    if (!url) {
      throw new BadRequestException(
        'Aucune URL ProClubs.io enregistrée pour ce club.',
      );
    }

    let rows = await this.scrapeClubRosterData(url);

    if (rows.length === 0 && process.env.NODE_ENV !== 'production') {
      this.logger.warn(
        `[ProClubs] Roster vide — données de dev pour le club ${club.name}`,
      );
      rows = this.buildDevMockRoster(club);
    }

    if (rows.length === 0) {
      throw new BadRequestException(
        'Impossible d\'extraire les statistiques depuis la page ProClubs.io. Vérifiez l\'URL (page club / effectif).',
      );
    }

    const personaMap = this.buildPersonaMapFromTeam({
      id: club.id,
      members: club.members.map((m) => ({
        user: {
          id: m.user.id,
          ea_persona_name: m.user.ea_persona_name,
        },
      })),
    });

    const prestigeXp = this.computeClubPrestigeXpFromRoster(rows);
    const newPrestigeLevel = this.leveling.calculateLevel(prestigeXp);

    let playersUpdated = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const matched = this.matchNameToPersona(row.playerName, personaMap);
        if (!matched) continue;

        await tx.playerStats.upsert({
          where: { user_id: matched.userId },
          create: {
            user_id: matched.userId,
            goals: row.goals,
            matches_played: row.matchesPlayed,
            average_rating: row.averageRating,
            assists: 0,
            clean_sheets: 0,
            motm: 0,
          },
          update: {
            goals: row.goals,
            matches_played: row.matchesPlayed,
            average_rating: row.averageRating,
          },
        });
        playersUpdated += 1;
      }

      await tx.club.update({
        where: { id: clubId },
        data: {
          xp: prestigeXp,
          prestige_level: newPrestigeLevel,
        },
      });
    });

    this.logger.log(
      `[ProClubs] Club ${club.name} synced: ${playersUpdated} joueurs, XP=${prestigeXp}, Lvl=${newPrestigeLevel}`,
    );

    return {
      synced: true,
      xp_prestige: prestigeXp,
      prestige_level: newPrestigeLevel,
      playersUpdated,
      rosterRowsParsed: rows.length,
    };
  }

  private computeClubPrestigeXpFromRoster(rows: ScrapedClubRosterRow[]): number {
    let sum = 0;
    for (const r of rows) {
      const amr = Math.min(10, Math.max(0, r.averageRating || 0));
      sum += r.goals * 40 + r.matchesPlayed * 15 + amr * 120;
    }
    return Math.min(9_999_999, Math.round(sum));
  }

  private matchNameToPersona(
    playerName: string,
    personaMap: Map<
      string,
      { userId: string; teamId: string; eaPersonaName: string }
    >,
  ): { userId: string; teamId: string; eaPersonaName: string } | null {
    const normalized = this.normalize(playerName);
    const exact = personaMap.get(playerName.toLowerCase());
    if (exact) return exact;

    for (const [key, value] of personaMap.entries()) {
      if (key.includes(normalized) || normalized.includes(key)) {
        return value;
      }
    }

    for (const [key, value] of personaMap.entries()) {
      if (this.normalize(key) === normalized) {
        return value;
      }
    }

    return null;
  }

  /** Combine parsing tableau club + repli sur la structure « dernier match ». */
  private async scrapeClubRosterData(
    url: string,
  ): Promise<ScrapedClubRosterRow[]> {
    try {
      const { data: html } = await axios.get<string>(url, {
        timeout: 20_000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OMJEP-Bot/1.0)',
          Accept: 'text/html',
        },
      });

      const fromTable = this.parseClubRosterHtml(html);
      if (fromTable.length > 0) {
        return fromTable;
      }

      const matchLike = this.parseProClubsHtml(html);
      if (matchLike?.players?.length) {
        return matchLike.players.map((p) => ({
          playerName: p.playerName,
          goals: p.goals,
          matchesPlayed: Math.max(1, p.goals * 4 + p.assists * 2 + 8),
          averageRating: Number(
            (6.4 + Math.min(3, p.goals * 0.15 + p.assists * 0.1)).toFixed(1),
          ),
        }));
      }

      return [];
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(
          `[ProClubs] scrapeClubRosterData failed: ${(error as Error).message}`,
        );
        return this.getMockClubRosterRows();
      }
      this.logger.error(
        `[ProClubs] scrapeClubRosterData: ${(error as Error).message}`,
      );
      return [];
    }
  }

  private parseClubRosterHtml(html: string): ScrapedClubRosterRow[] {
    const $ = cheerio.load(html);
    const out: ScrapedClubRosterRow[] = [];
    const seen = new Set<string>();

    $('table tbody tr').each((_, el) => {
      const cells = $(el)
        .find('td')
        .map((__, td) => $(td).text().trim())
        .get();
      if (cells.length < 4) return;

      const name = cells[0];
      if (!name || name.length < 2 || !/[a-zA-ZÀ-ÿ]/.test(name)) return;

      const parseNum = (s: string) => {
        const x = parseFloat(s.replace(',', '.').replace(/\s/g, ''));
        return Number.isFinite(x) ? x : NaN;
      };

      const nums = cells
        .slice(1)
        .map(parseNum)
        .filter((n) => !Number.isNaN(n));

      if (nums.length === 0) return;

      let matchesPlayed = 0;
      let goals = 0;
      let averageRating = 0;

      if (cells.length >= 6) {
        matchesPlayed = Math.round(Math.min(2000, Math.abs(nums[0] ?? 0)));
        goals = Math.round(Math.min(500, Math.abs(nums[1] ?? 0)));
        const last = nums[nums.length - 1];
        averageRating =
          last >= 3 && last <= 10 ? last : nums.find((n) => n >= 3 && n <= 10) ?? 0;
      } else {
        goals = Math.round(Math.min(500, Math.abs(nums[0] ?? 0)));
        matchesPlayed = Math.round(
          Math.min(2000, Math.abs(nums[1] ?? goals * 3 + 10)),
        );
        const last = nums[nums.length - 1];
        averageRating =
          last >= 3 && last <= 10
            ? last
            : nums.find((n) => n >= 3 && n <= 10 && n !== goals) ?? 6.5;
      }

      if (averageRating < 3 || averageRating > 10) {
        averageRating = Math.min(10, Math.max(3, averageRating));
      }

      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      out.push({
        playerName: name,
        goals,
        matchesPlayed: Math.max(0, matchesPlayed),
        averageRating: Math.round(averageRating * 100) / 100,
      });
    });

    return out;
  }

  private buildDevMockRoster(club: {
    members: { user: { ea_persona_name: string | null } }[];
  }): ScrapedClubRosterRow[] {
    return club.members.slice(0, 8).map((m, i) => ({
      playerName: m.user.ea_persona_name ?? `Joueur ${i + 1}`,
      goals: 3 + (i % 4),
      matchesPlayed: 18 + i,
      averageRating: Math.round((6.8 + (i % 5) * 0.15) * 10) / 10,
    }));
  }

  private getMockClubRosterRows(): ScrapedClubRosterRow[] {
    return [
      {
        playerName: 'Mock Striker',
        goals: 12,
        matchesPlayed: 22,
        averageRating: 7.4,
      },
      {
        playerName: 'Mock Mid',
        goals: 4,
        matchesPlayed: 22,
        averageRating: 7.1,
      },
    ];
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
