import { PrismaService } from '@api/prisma/prisma.service';
import { EventType } from '@omjep/database';
interface ScoreEventDto {
    player_id: string;
    team_id?: string;
    type: EventType;
    minute?: number;
}
interface UpdateScoreDto {
    home_score: number;
    away_score: number;
    events?: ScoreEventDto[];
}
export declare class AdminMatchesController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(competitionId?: string): Promise<({
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
    updateScore(id: string, body: UpdateScoreDto): Promise<{
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
}
export {};
//# sourceMappingURL=admin-matches.controller.d.ts.map