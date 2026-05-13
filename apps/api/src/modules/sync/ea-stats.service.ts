import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@api/prisma/prisma.service';
import axios from 'axios';
import * as cheerio from 'cheerio';
import {
  EXTERNAL_EA_PROCLUBS_SYNC_DISABLED_MESSAGE,
  isEaClubsSyncEnabled,
} from './ea-clubs-sync.config';

export interface EaPlayerProfileStats {
  games: number;
  goals: number;
  assists: number;
  avgRating: number;
  division?: string;
  overallRating?: number;
}

export interface SyncEaStatsResult {
  synced: boolean;
  stats?: EaPlayerProfileStats;
  reason?: string;
}

interface EaClubProfileStats {
  division?: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  record: string;
}

export interface AutoSyncSummary {
  usersScanned: number;
  usersSynced: number;
  clubsScanned: number;
  clubsSynced: number;
  /** Présent lorsque la sync externe est coupée par le feature flag. */
  message?: string;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class EaStatsService {
  private readonly logger = new Logger(EaStatsService.name);
  private static eaStatsCronDisabledNoticeLogged = false;
  private readonly playerCache = new Map<string, CacheEntry<EaPlayerProfileStats>>();
  private readonly clubCache = new Map<string, CacheEntry<EaClubProfileStats>>();
  private static readonly CACHE_TTL_MS = 10 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 */2 * * *')
  async handleAutoSyncCron(): Promise<void> {
    if (!isEaClubsSyncEnabled()) {
      if (!EaStatsService.eaStatsCronDisabledNoticeLogged) {
        EaStatsService.eaStatsCronDisabledNoticeLogged = true;
        this.logger.log(
          '[EA Sync] EaStatsService scheduled sync skipped (EA_CLUBS_SYNC_ENABLED=false).',
        );
      }
      return;
    }

    this.logger.log('[EaStats] Scheduled sync started (every 2h)');
    try {
      await this.autoSyncAll();
      this.logger.log('[EaStats] Scheduled sync completed');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`[EaStats] Scheduled sync failed: ${message}`);
    }
  }

  async autoSyncAll(): Promise<AutoSyncSummary> {
    if (!isEaClubsSyncEnabled()) {
      return {
        usersScanned: 0,
        usersSynced: 0,
        clubsScanned: 0,
        clubsSynced: 0,
        message: EXTERNAL_EA_PROCLUBS_SYNC_DISABLED_MESSAGE,
      };
    }

    const users = await this.prisma.eaExternalStats.findMany({
      where: {
        proclubs_url: {
          startsWith: 'http',
        },
      },
      select: {
        user_id: true,
        proclubs_url: true,
      },
    });

    const clubs = await this.prisma.club.findMany({
      where: {
        proclubs_url: {
          startsWith: 'http',
        },
      },
      select: {
        id: true,
        name: true,
        proclubs_url: true,
      },
    });

    let usersSynced = 0;
    for (const user of users) {
      const result = await this.syncProfile(user.user_id, user.proclubs_url as string);
      if (result.synced) usersSynced += 1;
    }

    let clubsSynced = 0;
    for (const club of clubs) {
      const synced = await this.syncClubProfile(club.id, club.proclubs_url as string);
      if (synced) clubsSynced += 1;
    }

    return {
      usersScanned: users.length,
      usersSynced,
      clubsScanned: clubs.length,
      clubsSynced,
    };
  }

  /**
   * Sync EA FC Pro Clubs stats from a proclubs.io profile URL.
   * In development, falls back to mock data if scraping fails.
   */
  async syncProfile(
    userId: string,
    proclubsUrl: string,
  ): Promise<SyncEaStatsResult> {
    if (!isEaClubsSyncEnabled()) {
      return { synced: false, reason: EXTERNAL_EA_PROCLUBS_SYNC_DISABLED_MESSAGE };
    }

    this.logger.log(`[EaStats] Syncing profile for user ${userId} from ${proclubsUrl}`);

    try {
      const stats = await this.fetchProfileStatsCached(proclubsUrl);

      await this.prisma.eaExternalStats.upsert({
        where: { user_id: userId },
        create: {
          user_id: userId,
          games: stats.games,
          goals: stats.goals,
          assists: stats.assists,
          avg_rating: stats.avgRating,
          division: stats.division ?? null,
          overall_rating: stats.overallRating ?? null,
          proclubs_url: proclubsUrl,
          last_synced_at: new Date(),
        },
        update: {
          games: stats.games,
          goals: stats.goals,
          assists: stats.assists,
          avg_rating: stats.avgRating,
          division: stats.division ?? null,
          overall_rating: stats.overallRating ?? null,
          proclubs_url: proclubsUrl,
          last_synced_at: new Date(),
        },
      });

      this.logger.log(
        `[EaStats] Saved stats for user ${userId}: ${stats.games} games, ${stats.goals} goals, ${stats.assists} assists`,
      );

      return { synced: true, stats };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[EaStats] Failed to sync profile: ${message}`);

      // In non-production, generate plausible mock data so the UI can be tested
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn('[EaStats] Falling back to mock data (dev mode)');
        const mock = this.generateMockStats();
        await this.prisma.eaExternalStats.upsert({
          where: { user_id: userId },
          create: {
            user_id: userId,
            games: mock.games,
            goals: mock.goals,
            assists: mock.assists,
            avg_rating: mock.avgRating,
            division: mock.division ?? null,
            overall_rating: mock.overallRating ?? null,
            proclubs_url: proclubsUrl,
            last_synced_at: new Date(),
          },
          update: {
            games: mock.games,
            goals: mock.goals,
            assists: mock.assists,
            avg_rating: mock.avgRating,
            division: mock.division ?? null,
            overall_rating: mock.overallRating ?? null,
            proclubs_url: proclubsUrl,
            last_synced_at: new Date(),
          },
        });
        return { synced: true, stats: mock };
      }

      return { synced: false, reason: message };
    }
  }

  /**
   * Retrieve stored EA stats for a user.
   */
  async getStatsForUser(userId: string) {
    return this.prisma.eaExternalStats.findUnique({
      where: { user_id: userId },
    });
  }

  async getStatsForMyClub(userId: string) {
    const membership = await this.prisma.teamMember.findFirst({
      where: { user_id: userId },
      select: { team_id: true },
    });

    if (!membership) {
      return null;
    }

    return this.prisma.eaClubStats.findUnique({
      where: { club_id: membership.team_id },
    });
  }

  async syncClubProfile(clubId: string, proclubsUrl: string): Promise<boolean> {
    if (!isEaClubsSyncEnabled()) {
      return false;
    }

    try {
      const stats = await this.fetchClubStatsCached(proclubsUrl);

      await this.prisma.eaClubStats.upsert({
        where: { club_id: clubId },
        create: {
          club_id: clubId,
          division: stats.division ?? null,
          points: stats.points,
          record: stats.record,
          proclubs_url: proclubsUrl,
          last_synced_at: new Date(),
        },
        update: {
          division: stats.division ?? null,
          points: stats.points,
          record: stats.record,
          proclubs_url: proclubsUrl,
          last_synced_at: new Date(),
        },
      });

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[EaStats] Club sync failed for ${clubId}: ${message}`);
      return false;
    }
  }

  // ─── Private helpers ───────────────────────────────────────────────

  private getCachedValue<T>(map: Map<string, CacheEntry<T>>, key: string): T | null {
    const entry = map.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      map.delete(key);
      return null;
    }
    return entry.value;
  }

  private setCachedValue<T>(map: Map<string, CacheEntry<T>>, key: string, value: T) {
    map.set(key, {
      value,
      expiresAt: Date.now() + EaStatsService.CACHE_TTL_MS,
    });
  }

  private async fetchProfileStatsCached(url: string): Promise<EaPlayerProfileStats> {
    const cached = this.getCachedValue(this.playerCache, url);
    if (cached) return cached;
    const stats = await this.fetchProfileStats(url);
    this.setCachedValue(this.playerCache, url, stats);
    return stats;
  }

  private async fetchProfileStats(url: string): Promise<EaPlayerProfileStats> {
    const { data: html } = await axios.get<string>(url, {
      timeout: 10_000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const $ = cheerio.load(html);

    // ProClubs.io profile pages typically display stats in table rows or stat cards.
    // The selectors below target common patterns; adjust as the site structure evolves.
    const games = this.parseStat($, ['Games', 'games', 'Matches', 'matches', 'GP']);
    const goals = this.parseStat($, ['Goals', 'goals', 'G']);
    const assists = this.parseStat($, ['Assists', 'assists', 'A']);
    const avgRating = this.parseFloatStat($, ['Avg Rating', 'avg rating', 'Rating', 'rating', 'AVG']);
    const division = this.parseText($, ['Division', 'division', 'Div', 'div']);
    const overall = this.parseIntStat($, ['Overall', 'overall', 'OVR', 'ovr', 'GEN']);

    if (games === 0 && goals === 0 && assists === 0) {
      throw new Error('No stats found on the page — selectors may need updating');
    }

    return {
      games,
      goals,
      assists,
      avgRating,
      division: division || undefined,
      overallRating: overall || undefined,
    };
  }

  private parseStat($: cheerio.CheerioAPI, keywords: string[]): number {
    for (const keyword of keywords) {
      const val = $(`td:contains("${keyword}"), th:contains("${keyword}"), .stat-label:contains("${keyword}"), .stat-name:contains("${keyword}")`)
        .closest('tr, .stat-card, .stat-item')
        .find('.stat-value, td:last-child, .value, span[class*="num"]')
        .first()
        .text()
        .trim();
      if (val) {
        const num = parseInt(val.replace(/[^0-9]/g, ''), 10);
        if (!Number.isNaN(num)) return num;
      }
    }
    return 0;
  }

  private parseFloatStat($: cheerio.CheerioAPI, keywords: string[]): number {
    for (const keyword of keywords) {
      const val = $(`td:contains("${keyword}"), th:contains("${keyword}"), .stat-label:contains("${keyword}"), .stat-name:contains("${keyword}")`)
        .closest('tr, .stat-card, .stat-item')
        .find('.stat-value, td:last-child, .value, span[class*="num"]')
        .first()
        .text()
        .trim();
      if (val) {
        const num = parseFloat(val.replace(/,/g, '.'));
        if (!Number.isNaN(num)) return num;
      }
    }
    return 0;
  }

  private parseIntStat($: cheerio.CheerioAPI, keywords: string[]): number | null {
    for (const keyword of keywords) {
      const val = $(`td:contains("${keyword}"), th:contains("${keyword}"), .stat-label:contains("${keyword}"), .stat-name:contains("${keyword}")`)
        .closest('tr, .stat-card, .stat-item')
        .find('.stat-value, td:last-child, .value, span[class*="num"]')
        .first()
        .text()
        .trim();
      if (val) {
        const num = parseInt(val.replace(/[^0-9]/g, ''), 10);
        if (!Number.isNaN(num)) return num;
      }
    }
    return null;
  }

  private parseText($: cheerio.CheerioAPI, keywords: string[]): string | null {
    for (const keyword of keywords) {
      const val = $(`td:contains("${keyword}"), th:contains("${keyword}"), .stat-label:contains("${keyword}"), .stat-name:contains("${keyword}")`)
        .closest('tr, .stat-card, .stat-item')
        .find('.stat-value, td:last-child, .value')
        .first()
        .text()
        .trim();
      if (val) return val;
    }
    return null;
  }

  private generateMockStats(): EaPlayerProfileStats {
    return {
      games: 124,
      goals: 89,
      assists: 42,
      avgRating: 8.4,
      division: 'DIV 1',
      overallRating: 88,
    };
  }

  private async fetchClubStatsCached(url: string): Promise<EaClubProfileStats> {
    const cached = this.getCachedValue(this.clubCache, url);
    if (cached) return cached;
    const stats = await this.fetchClubStats(url);
    this.setCachedValue(this.clubCache, url, stats);
    return stats;
  }

  private async fetchClubStats(url: string): Promise<EaClubProfileStats> {
    const { data: html } = await axios.get<string>(url, {
      timeout: 10_000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const $ = cheerio.load(html);
    const division = this.parseText($, ['Division', 'division', 'Div', 'League']);
    const points = this.parseStat($, ['Points', 'points', 'Pts', 'PTS']);
    const wins = this.parseStat($, ['Wins', 'wins', 'W']);
    const draws = this.parseStat($, ['Draws', 'draws', 'D']);
    const losses = this.parseStat($, ['Losses', 'losses', 'L']);

    if (!division && points === 0 && wins === 0 && draws === 0 && losses === 0) {
      if (process.env.NODE_ENV !== 'production') {
        return this.generateMockClubStats();
      }
      throw new Error('No club stats found on page');
    }

    const record = `${wins}-${draws}-${losses}`;
    return {
      division: division || undefined,
      points,
      wins,
      draws,
      losses,
      record,
    };
  }

  private generateMockClubStats(): EaClubProfileStats {
    return {
      division: 'D1',
      points: 48,
      wins: 15,
      draws: 3,
      losses: 2,
      record: '15-3-2',
    };
  }
}
