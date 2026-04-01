import { PrismaService } from '@api/prisma/prisma.service';
export interface LevelUpResult {
    previousLevel: number;
    newLevel: number;
    totalXp: number;
    leveledUp: boolean;
}
export declare class LevelingService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    /**
     * Level = floor(sqrt(xp / 100)) + 1
     * e.g. 0 XP → L1, 100 XP → L2, 400 XP → L3, 900 XP → L4 …
     */
    calculateLevel(xp: number): number;
    addPlayerXp(userId: string, amount: number): Promise<LevelUpResult>;
    addTeamXp(teamId: string, amount: number): Promise<LevelUpResult>;
}
//# sourceMappingURL=leveling.service.d.ts.map