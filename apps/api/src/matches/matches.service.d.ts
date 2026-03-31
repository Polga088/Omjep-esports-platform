import { PrismaService } from '../prisma/prisma.service';
export declare class MatchesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findMyTeamMatches(userId: string): Promise<({
        competition: {
            id: string;
            name: string;
            type: import("@omjep/database").$Enums.CompetitionType;
        } | null;
        homeTeam: {
            id: string;
            name: string;
            logo_url: string | null;
        };
        awayTeam: {
            id: string;
            name: string;
            logo_url: string | null;
        };
    } & {
        id: string;
        status: import("@omjep/database").$Enums.MatchStatus;
        home_score: number | null;
        away_score: number | null;
        away_team_id: string;
        home_team_id: string;
        ea_match_id: string | null;
        competition_id: string | null;
        round: string | null;
        played_at: Date | null;
    })[]>;
    findCompetitionMatches(competitionId: string): Promise<({
        competition: {
            id: string;
            name: string;
            type: import("@omjep/database").$Enums.CompetitionType;
        } | null;
        homeTeam: {
            id: string;
            name: string;
            logo_url: string | null;
        };
        awayTeam: {
            id: string;
            name: string;
            logo_url: string | null;
        };
    } & {
        id: string;
        status: import("@omjep/database").$Enums.MatchStatus;
        home_score: number | null;
        away_score: number | null;
        away_team_id: string;
        home_team_id: string;
        ea_match_id: string | null;
        competition_id: string | null;
        round: string | null;
        played_at: Date | null;
    })[]>;
    submitScoreReport(userId: string, matchId: string, homeScore: number, awayScore: number): Promise<{
        reportingTeam: {
            id: string;
            name: string;
        };
        submittedBy: {
            ea_persona_name: string | null;
            email: string;
            id: string;
        };
    } & {
        id: string;
        created_at: Date;
        match_id: string;
        home_score: number;
        away_score: number;
        updated_at: Date;
        reporting_team_id: string;
        submitted_by_id: string;
    }>;
}
//# sourceMappingURL=matches.service.d.ts.map