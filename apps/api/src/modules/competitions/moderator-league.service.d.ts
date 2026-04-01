import { PrismaService } from '@api/prisma/prisma.service';
import { CreateModeratorMatchDto } from './dto/create-moderator-match.dto';
import { ModeratorValidateScoreDto } from './dto/moderator-validate-score.dto';
export declare class ModeratorLeagueService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listCompetitions(): Promise<({
        _count: {
            matches: number;
        };
        teams: ({
            team: {
                xp: number;
                id: string;
                created_at: Date;
                name: string;
                proclubs_url: string | null;
                ea_club_id: string | null;
                logo_url: string | null;
                platform: import("@omjep/database").$Enums.Platform;
                budget: number;
                prestige_level: number;
                validation_status: import("@omjep/database").$Enums.ValidationStatus;
                manager_id: string | null;
            };
        } & {
            joined_at: Date;
            team_id: string;
            competition_id: string;
        })[];
    } & {
        id: string;
        created_at: Date;
        name: string;
        status: import("@omjep/database").$Enums.CompetitionStatus;
        type: import("@omjep/database").$Enums.CompetitionType;
        start_date: Date | null;
        end_date: Date | null;
    })[]>;
    listMatches(competitionId?: string): Promise<({
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
        events: ({
            team: {
                id: string;
                name: string;
            };
            player: {
                ea_persona_name: string | null;
                id: string;
            };
        } & {
            id: string;
            team_id: string;
            player_id: string;
            type: import("@omjep/database").$Enums.EventType;
            minute: number | null;
            match_id: string;
        })[];
        scoreReports: ({
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
        })[];
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
    createMatch(competitionId: string, dto: CreateModeratorMatchDto): Promise<{
        message: string;
        match: {
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
            events: ({
                team: {
                    id: string;
                    name: string;
                };
                player: {
                    ea_persona_name: string | null;
                    id: string;
                };
            } & {
                id: string;
                team_id: string;
                player_id: string;
                type: import("@omjep/database").$Enums.EventType;
                minute: number | null;
                match_id: string;
            })[];
            scoreReports: ({
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
            })[];
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
        };
    }>;
    generateCalendar(competitionId: string): Promise<{
        message: string;
        matchCount: number;
    }>;
    validateScore(matchId: string, body: ModeratorValidateScoreDto): Promise<{
        message: string;
        match: {
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
            events: ({
                team: {
                    id: string;
                    name: string;
                };
                player: {
                    ea_persona_name: string | null;
                    id: string;
                };
            } & {
                id: string;
                team_id: string;
                player_id: string;
                type: import("@omjep/database").$Enums.EventType;
                minute: number | null;
                match_id: string;
            })[];
            scoreReports: ({
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
            })[];
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
        };
    }>;
    private buildRoundRobinMatches;
}
//# sourceMappingURL=moderator-league.service.d.ts.map