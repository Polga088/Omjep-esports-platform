import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface LevelUpResult {
  previousLevel: number;
  newLevel: number;
  totalXp: number;
  leveledUp: boolean;
}

@Injectable()
export class LevelingService {
  private readonly logger = new Logger(LevelingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Level = floor(sqrt(xp / 100)) + 1
   * e.g. 0 XP → L1, 100 XP → L2, 400 XP → L3, 900 XP → L4 …
   */
  calculateLevel(xp: number): number {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }

  async addPlayerXp(
    userId: string,
    amount: number,
  ): Promise<LevelUpResult> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: amount } },
      select: { id: true, xp: true, level: true },
    });

    const newLevel = this.calculateLevel(user.xp);
    const leveledUp = newLevel > user.level;

    if (leveledUp) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { level: newLevel },
      });
      this.logger.log(
        `[Leveling] Player ${userId} leveled up: ${user.level} → ${newLevel} (${user.xp} XP)`,
      );
    }

    return {
      previousLevel: user.level,
      newLevel,
      totalXp: user.xp,
      leveledUp,
    };
  }

  async addTeamXp(
    teamId: string,
    amount: number,
  ): Promise<LevelUpResult> {
    const team = await this.prisma.team.update({
      where: { id: teamId },
      data: { xp: { increment: amount } },
      select: { id: true, xp: true, prestige_level: true },
    });

    const newLevel = this.calculateLevel(team.xp);
    const leveledUp = newLevel > team.prestige_level;

    if (leveledUp) {
      await this.prisma.team.update({
        where: { id: teamId },
        data: { prestige_level: newLevel },
      });
      this.logger.log(
        `[Leveling] Team ${teamId} leveled up: ${team.prestige_level} → ${newLevel} (${team.xp} XP)`,
      );
    }

    return {
      previousLevel: team.prestige_level,
      newLevel,
      totalXp: team.xp,
      leveledUp,
    };
  }
}
