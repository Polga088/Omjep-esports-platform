import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

// -------------------------------------------------------------------
// Types describing the shape of the external API response
// (proclubs.io or equivalent). Adjust field names once the real
// endpoint contract is confirmed.
// -------------------------------------------------------------------
interface ExternalPlayerStats {
  ea_persona_name: string;
  matches_played: number;
  goals: number;
  assists: number;
  clean_sheets: number;
  motm: number;
  average_rating: number;
}

interface ExternalClubStatsResponse {
  club_id: string;
  players: ExternalPlayerStats[];
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  // Base URL is read from an env variable so it can be swapped without
  // touching code (dev mock server → staging → production API).
  private readonly apiBaseUrl =
    process.env.PROCLUBS_API_BASE_URL ?? 'https://proclubs.io/api';

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: HttpService,
  ) {}

  // -----------------------------------------------------------------
  // Cron entry-point — runs every 5 minutes in production.
  // Can also be triggered manually via SyncController for testing.
  // -----------------------------------------------------------------
  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncClubStats(): Promise<void> {
    this.logger.log('⚡ [SyncService] Starting club stats synchronisation…');

    // ── Step 1 : Fetch all teams that are linked to an EA club ──────
    const teams = await this.prisma.club.findMany({
      where: { ea_club_id: { not: null } },
    });

    if (teams.length === 0) {
      this.logger.warn('[SyncService] No teams with an ea_club_id found. Skipping sync.');
      return;
    }

    this.logger.log(`[SyncService] Found ${teams.length} team(s) to synchronise.`);

    // Process each team sequentially to avoid hammering the external API.
    for (const team of teams) {
      await this.syncTeam(team.id, team.ea_club_id as string, team.name);
    }

    this.logger.log('✅ [SyncService] Club stats synchronisation complete.');
  }

  // -----------------------------------------------------------------
  // Handles the sync lifecycle for a single team.
  // -----------------------------------------------------------------
  private async syncTeam(
    teamId: string,
    eaClubId: string,
    teamName: string,
  ): Promise<void> {
    this.logger.log(`[SyncService] → Syncing team "${teamName}" (ea_club_id: ${eaClubId})`);

    try {
      // ── Step 2 : Call the external stats API ──────────────────────
      const externalStats = await this.fetchClubStats(eaClubId);

      if (!externalStats || externalStats.players.length === 0) {
        this.logger.warn(
          `[SyncService] No player data returned for club ${eaClubId}. Skipping.`,
        );
        return;
      }

      // ── Step 3 : Build a lookup map ea_persona_name → stats ───────
      const statsByPersona = new Map<string, ExternalPlayerStats>(
        externalStats.players.map((p) => [p.ea_persona_name.toLowerCase(), p]),
      );

      // ── Step 4 : Resolve which of our Users belong to this team ───
      const teamMembers = await this.prisma.teamMember.findMany({
        where: { team_id: teamId },
        include: { user: true },
      });

      let updated = 0;
      let skipped = 0;

      for (const member of teamMembers) {
        const user = member.user;

        if (!user.ea_persona_name) {
          skipped++;
          continue;
        }

        const apiStats = statsByPersona.get(user.ea_persona_name.toLowerCase());

        if (!apiStats) {
          this.logger.debug(
            `[SyncService] No API stats found for player "${user.ea_persona_name}". Skipping.`,
          );
          skipped++;
          continue;
        }

        // ── Step 4b : Upsert PlayerStats ─────────────────────────────
        await this.prisma.playerStats.upsert({
          where: { user_id: user.id },
          create: {
            user_id: user.id,
            matches_played: apiStats.matches_played,
            goals: apiStats.goals,
            assists: apiStats.assists,
            clean_sheets: apiStats.clean_sheets,
            motm: apiStats.motm,
            average_rating: apiStats.average_rating,
          },
          update: {
            matches_played: apiStats.matches_played,
            goals: apiStats.goals,
            assists: apiStats.assists,
            clean_sheets: apiStats.clean_sheets,
            motm: apiStats.motm,
            average_rating: apiStats.average_rating,
          },
        });

        updated++;
        this.logger.debug(
          `[SyncService] Updated stats for player "${user.ea_persona_name}".`,
        );
      }

      this.logger.log(
        `[SyncService] Team "${teamName}": ${updated} player(s) updated, ${skipped} skipped.`,
      );
    } catch (error) {
      this.logger.error(
        `[SyncService] Failed to sync team "${teamName}" (ea_club_id: ${eaClubId}): ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  // -----------------------------------------------------------------
  // HTTP call to the external proclubs API.
  // Returns null on non-2xx or network failure so the caller can
  // decide whether to skip or retry.
  // -----------------------------------------------------------------
  private async fetchClubStats(
    eaClubId: string,
  ): Promise<ExternalClubStatsResponse | null> {
    const url = `${this.apiBaseUrl}/club/${eaClubId}/stats`;

    try {
      this.logger.debug(`[SyncService] GET ${url}`);

      const response = await firstValueFrom(
        this.http.get<ExternalClubStatsResponse>(url),
      );

      return response.data;
    } catch (error) {
      // Return a mock payload so development works without a live API.
      // ⚠️  Remove this fallback once the real API URL is confirmed.
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(
          `[SyncService] External API unavailable (${(error as Error).message}). Using mock data for ea_club_id=${eaClubId}.`,
        );
        return this.getMockClubStats(eaClubId);
      }

      this.logger.error(
        `[SyncService] HTTP request failed for club ${eaClubId}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  // -----------------------------------------------------------------
  // Mock payload — mirrors the real ExternalClubStatsResponse contract
  // so the rest of the pipeline is fully exercised during development.
  // Replace with live data once the API is confirmed.
  // -----------------------------------------------------------------
  private getMockClubStats(eaClubId: string): ExternalClubStatsResponse {
    return {
      club_id: eaClubId,
      players: [
        {
          ea_persona_name: 'MockPlayer1',
          matches_played: 42,
          goals: 18,
          assists: 10,
          clean_sheets: 0,
          motm: 5,
          average_rating: 7.4,
        },
        {
          ea_persona_name: 'MockPlayer2',
          matches_played: 38,
          goals: 3,
          assists: 7,
          clean_sheets: 14,
          motm: 3,
          average_rating: 7.1,
        },
      ],
    };
  }
}
