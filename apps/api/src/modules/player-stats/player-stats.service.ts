import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@api/prisma/prisma.service';

@Injectable()
export class PlayerStatsService {
  private readonly logger = new Logger(PlayerStatsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Met à jour les statistiques agrégées (player_stats) de chaque joueur
   * ayant participé au match donné, en lisant les MatchEvent persistés.
   *
   * Appelé après toute validation de score (admin updateScore + moderator validateScore).
   * Idempotent : ne recompte pas si la même mise à jour est rejouée (utilise increment).
   */
  async updateFromMatch(matchId: string): Promise<void> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        status: true,
        home_team_id: true,
        away_team_id: true,
        home_score: true,
        away_score: true,
        events: {
          select: { player_id: true, type: true },
        },
      },
    });

    if (!match || match.status !== 'PLAYED') {
      this.logger.warn(`[PlayerStats] Match ${matchId} non PLAYED — ignoré.`);
      return;
    }

    // ── Agréger buts et passes par joueur ────────────────────
    const goalsBy = new Map<string, number>();
    const assistsBy = new Map<string, number>();

    for (const event of match.events) {
      if (event.type === 'GOAL') {
        goalsBy.set(event.player_id, (goalsBy.get(event.player_id) ?? 0) + 1);
      } else if (event.type === 'ASSIST') {
        assistsBy.set(event.player_id, (assistsBy.get(event.player_id) ?? 0) + 1);
      }
    }

    // ── Tous les joueurs des deux équipes ont joué ────────────
    const [homeMembers, awayMembers] = await Promise.all([
      this.prisma.teamMember.findMany({
        where: { team_id: match.home_team_id },
        select: { user_id: true },
      }),
      this.prisma.teamMember.findMany({
        where: { team_id: match.away_team_id },
        select: { user_id: true },
      }),
    ]);

    const allPlayerIds = [
      ...homeMembers.map((m) => m.user_id),
      ...awayMembers.map((m) => m.user_id),
    ];

    // ── Upsert player_stats pour chaque joueur ────────────────
    await Promise.all(
      allPlayerIds.map(async (userId) => {
        const goals   = goalsBy.get(userId)   ?? 0;
        const assists = assistsBy.get(userId) ?? 0;

        // Upsert : crée la ligne si absente, sinon incrémente
        await this.prisma.playerStats.upsert({
          where:  { user_id: userId },
          create: {
            user_id:        userId,
            matches_played: 1,
            goals,
            assists,
          },
          update: {
            matches_played: { increment: 1 },
            goals:          { increment: goals },
            assists:        { increment: assists },
          },
        });
      }),
    );

    this.logger.log(
      `[PlayerStats] Match ${matchId} — ${allPlayerIds.length} joueurs mis à jour ` +
      `(${goalsBy.size} buteurs, ${assistsBy.size} passeurs).`,
    );
  }
}
