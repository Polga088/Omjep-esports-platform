import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@api/prisma/prisma.service';
import { LevelingService } from '../leveling/leveling.service';
import { NotificationsService } from '../notifications/notifications.service';

// ─── Reward constants ─────────────────────────────────────────────────────────

const REWARDS = {
  WIN:  { xp: 50,  omjepCoins: 100 },
  DRAW: { xp: 25,  omjepCoins: 50  },
  LOSE: { xp: 10,  omjepCoins: 20  },
} as const;

export interface MatchRewardSummary {
  matchId: string;
  homeTeamResult: 'WIN' | 'DRAW' | 'LOSE';
  playersRewarded: number;
  levelUps: { userId: string; previousLevel: number; newLevel: number }[];
}

@Injectable()
export class RewardsService {
  private readonly logger = new Logger(RewardsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leveling: LevelingService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Distribue XP + OMJEP Coins à tous les membres des deux équipes
   * en fonction du résultat du match.
   *
   * - Vainqueur : +50 XP, +100 OMJEP Coins
   * - Nul       : +25 XP, +50  OMJEP Coins
   * - Perdant   : +10 XP, +20  OMJEP Coins
   *
   * Si l'XP dépasse le seuil du prochain niveau (level * 1000), le joueur
   * monte de niveau (délégué à LevelingService qui utilise la formule sqrt).
   *
   * @returns Résumé des récompenses distribuées et des level-ups
   */
  async distributeRewards(matchId: string): Promise<MatchRewardSummary> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        status: true,
        home_score: true,
        away_score: true,
        home_team_id: true,
        away_team_id: true,
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
      },
    });

    if (!match || match.status !== 'PLAYED') {
      this.logger.warn(
        `[Rewards] distributeRewards appelé sur le match ${matchId} mais status=${match?.status ?? 'null'} — ignoré.`,
      );
      return { matchId, homeTeamResult: 'DRAW', playersRewarded: 0, levelUps: [] };
    }

    const homeScore = match.home_score ?? 0;
    const awayScore = match.away_score ?? 0;

    const homeResult: 'WIN' | 'DRAW' | 'LOSE' =
      homeScore > awayScore ? 'WIN' : homeScore < awayScore ? 'LOSE' : 'DRAW';
    const awayResult: 'WIN' | 'DRAW' | 'LOSE' =
      homeScore < awayScore ? 'WIN' : homeScore > awayScore ? 'LOSE' : 'DRAW';

    // Charger les membres des deux équipes
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

    const allPlayers: { userId: string; result: 'WIN' | 'DRAW' | 'LOSE' }[] = [
      ...homeMembers.map((m) => ({ userId: m.user_id, result: homeResult })),
      ...awayMembers.map((m) => ({ userId: m.user_id, result: awayResult })),
    ];

    if (allPlayers.length === 0) {
      this.logger.warn(`[Rewards] Match ${matchId} : aucun joueur trouvé dans les deux équipes.`);
      return { matchId, homeTeamResult: homeResult, playersRewarded: 0, levelUps: [] };
    }

    // Distribuer coins à tous les joueurs en une seule opération par résultat
    const winnerIds  = allPlayers.filter((p) => p.result === 'WIN' ).map((p) => p.userId);
    const drawerIds  = allPlayers.filter((p) => p.result === 'DRAW').map((p) => p.userId);
    const loserIds   = allPlayers.filter((p) => p.result === 'LOSE').map((p) => p.userId);

    await Promise.all([
      winnerIds.length > 0 && this.prisma.user.updateMany({
        where: { id: { in: winnerIds } },
        data: { omjepCoins: { increment: REWARDS.WIN.omjepCoins } },
      }),
      drawerIds.length > 0 && this.prisma.user.updateMany({
        where: { id: { in: drawerIds } },
        data: { omjepCoins: { increment: REWARDS.DRAW.omjepCoins } },
      }),
      loserIds.length > 0 && this.prisma.user.updateMany({
        where: { id: { in: loserIds } },
        data: { omjepCoins: { increment: REWARDS.LOSE.omjepCoins } },
      }),
    ]);

    // Distribuer XP joueur par joueur (LevelingService gère le level-up)
    const levelUps: MatchRewardSummary['levelUps'] = [];

    await Promise.all(
      allPlayers.map(async ({ userId, result }) => {
        const reward = REWARDS[result];
        const lvlResult = await this.leveling.addPlayerXp(userId, reward.xp);

        if (lvlResult.leveledUp) {
          levelUps.push({
            userId,
            previousLevel: lvlResult.previousLevel,
            newLevel: lvlResult.newLevel,
          });

          // Notifier le joueur de son level-up
          await this.notifications.send(
            userId,
            '🎉 Niveau supérieur !',
            `Félicitations ! Tu viens de passer au niveau ${lvlResult.newLevel}.`,
            { previousLevel: lvlResult.previousLevel, newLevel: lvlResult.newLevel },
          );
        }
      }),
    );

    const resultLabel =
      homeResult === 'WIN'
        ? `${match.homeTeam.name} WIN`
        : homeResult === 'LOSE'
          ? `${match.awayTeam.name} WIN`
          : 'Nul';

    this.logger.log(
      `[Rewards] Match ${matchId} (${resultLabel}) — ${allPlayers.length} joueurs récompensés, ${levelUps.length} level-up(s).`,
    );

    return {
      matchId,
      homeTeamResult: homeResult,
      playersRewarded: allPlayers.length,
      levelUps,
    };
  }
}
