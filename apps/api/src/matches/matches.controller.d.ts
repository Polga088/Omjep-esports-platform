import { MatchesService } from './matches.service';
import { SubmitScoreReportDto } from './dto/submit-score-report.dto';
export declare class MatchesController {
    private readonly matchesService;
    constructor(matchesService: MatchesService);
    findMyTeamMatches(req: {
        user: {
            id: string;
        };
    }): Promise<({
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
    submitScoreReport(req: {
        user: {
            id: string;
        };
    }, id: string, body: SubmitScoreReportDto): Promise<{
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
    findCompetitionMatches(id: string): Promise<({
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
}
//# sourceMappingURL=matches.controller.d.ts.map