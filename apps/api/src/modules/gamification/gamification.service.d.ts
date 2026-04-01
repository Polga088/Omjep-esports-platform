import { PrismaService } from '@api/prisma/prisma.service';
export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'goals' | 'assists' | 'matches' | 'level' | 'team' | 'special';
    tier: 'bronze' | 'silver' | 'gold' | 'diamond';
    unlocked: boolean;
    progress: number;
    target: number;
    unlockedAt?: string;
}
export interface GamificationProfile {
    player: {
        id: string;
        name: string;
        position: string | null;
        nationality: string | null;
        level: number;
        xp: number;
        xpProgress: {
            current: number;
            needed: number;
            percentage: number;
            nextLevel: number;
        };
    };
    team: {
        id: string;
        name: string;
        logo_url: string | null;
        prestige_level: number;
        xp: number;
    } | null;
    stats: {
        goals: number;
        assists: number;
        matches: number;
        cleanSheets: number;
        motm: number;
        averageRating: number;
        goalsPerGame: number;
        assistsPerGame: number;
    };
    achievements: Achievement[];
    ranking: {
        position: number;
        totalPlayers: number;
        topPercentage: number;
    };
    seasonForm: {
        matchId: string;
        result: 'W' | 'D' | 'L';
        goalsScored: number;
        goalsAgainst: number;
        date: string;
    }[];
    milestones: {
        label: string;
        xpRequired: number;
        reached: boolean;
        level: number;
    }[];
    contract: {
        salary: number;
        release_clause: number;
        expires_at: string;
    } | null;
    overall: number;
}
export declare class GamificationService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private xpForLevel;
    private xpProgress;
    private computeOverall;
    private computeAchievements;
    getGamificationProfile(userId: string): Promise<GamificationProfile>;
    getLeaderboard(limit?: number): Promise<{
        rank: number;
        id: string;
        name: string;
        position: import("@omjep/database").$Enums.Position | null;
        level: number;
        xp: number;
        goals: number;
        assists: number;
        matchesPlayed: number;
        averageRating: number;
        team: {
            id: string;
            name: string;
            logo_url: string | null;
        };
    }[]>;
}
//# sourceMappingURL=gamification.service.d.ts.map