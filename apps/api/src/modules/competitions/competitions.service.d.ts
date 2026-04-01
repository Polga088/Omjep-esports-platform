import { PrismaService } from '@api/prisma/prisma.service';
interface StandingRow {
    team: {
        id: string;
        name: string;
        logo_url: string | null;
    };
    points: number;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    diff: number;
}
interface TopPlayerRow {
    player: {
        id: string;
        ea_persona_name: string | null;
    };
    team: {
        id: string;
        name: string;
        logo_url: string | null;
    };
    count: number;
}
export declare class CompetitionsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getTopStats(competitionId: string): Promise<{
        topScorers: TopPlayerRow[];
        topAssisters: TopPlayerRow[];
    }>;
    getStandings(competitionId: string): Promise<StandingRow[]>;
}
export {};
//# sourceMappingURL=competitions.service.d.ts.map