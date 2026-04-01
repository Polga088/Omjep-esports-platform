import { GamificationService } from './gamification.service';
export declare class GamificationController {
    private readonly gamification;
    constructor(gamification: GamificationService);
    getMyProfile(req: {
        user: {
            id: string;
        };
    }): Promise<import("./gamification.service").GamificationProfile>;
    getLeaderboard(limit?: string): Promise<{
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
//# sourceMappingURL=gamification.controller.d.ts.map