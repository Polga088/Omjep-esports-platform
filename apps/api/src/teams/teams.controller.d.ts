import { TeamsService } from './teams.service';
import { Prisma } from '@omjep/database';
export declare class TeamsController {
    private readonly teamsService;
    constructor(teamsService: TeamsService);
    findAll(): Promise<({
        _count: {
            members: number;
        };
    } & {
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
    })[]>;
    findMyTeam(req: {
        user: {
            id: string;
        };
    }): Promise<{
        members: ({
            user: {
                ea_persona_name: string | null;
                preferred_position: import("@omjep/database").$Enums.Position | null;
                nationality: string | null;
                id: string;
                stats: {
                    id: string;
                    user_id: string;
                    matches_played: number;
                    goals: number;
                    assists: number;
                    clean_sheets: number;
                    motm: number;
                    average_rating: number;
                } | null;
            };
        } & {
            club_role: import("@omjep/database").$Enums.ClubRole;
            joined_at: Date;
            team_id: string;
            user_id: string;
        })[];
    } & {
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
    }>;
    getMyTeamOverview(req: {
        user: {
            id: string;
        };
    }): Promise<import("./teams.service").TeamStatsOverview>;
    getLadder(): Promise<import("./teams.service").LadderEntry[]>;
    findOne(id: string): Promise<{
        members: ({
            user: {
                ea_persona_name: string | null;
                preferred_position: import("@omjep/database").$Enums.Position | null;
                id: string;
                stats: {
                    id: string;
                    user_id: string;
                    matches_played: number;
                    goals: number;
                    assists: number;
                    clean_sheets: number;
                    motm: number;
                    average_rating: number;
                } | null;
            };
        } & {
            club_role: import("@omjep/database").$Enums.ClubRole;
            joined_at: Date;
            team_id: string;
            user_id: string;
        })[];
    } & {
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
    }>;
    create(body: Prisma.ClubCreateInput): Promise<{
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
    }>;
    update(id: string, body: Prisma.ClubUpdateInput): Promise<{
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
    }>;
    remove(id: string): Promise<{
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
    }>;
    addMember(teamId: string, userId: string, clubRole: Prisma.TeamMemberCreateInput['club_role']): Promise<{
        club_role: import("@omjep/database").$Enums.ClubRole;
        joined_at: Date;
        team_id: string;
        user_id: string;
    }>;
    removeMember(teamId: string, userId: string): Promise<{
        club_role: import("@omjep/database").$Enums.ClubRole;
        joined_at: Date;
        team_id: string;
        user_id: string;
    }>;
}
//# sourceMappingURL=teams.controller.d.ts.map