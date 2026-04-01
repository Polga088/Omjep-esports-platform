import { PrismaService } from '@api/prisma/prisma.service';
import { Prisma } from '@omjep/database';
export type TeamMemberStatSnapshot = {
    userId: string;
    displayName: string | null;
    goals: number;
    assists: number;
    averageRating: number;
};
export type TeamStatsOverview = {
    totals: {
        goals: number;
        assists: number;
        averageAmr: number;
    };
    topScorer: TeamMemberStatSnapshot | null;
    mvp: TeamMemberStatSnapshot | null;
};
export type LadderEntry = {
    rank: number;
    teamId: string;
    teamName: string;
    logoUrl: string | null;
    platform: string;
    memberCount: number;
    averageRating: number;
    totalGoals: number;
    totalAssists: number;
};
export declare class TeamsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
    create(data: Prisma.ClubCreateInput): Promise<{
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
    update(id: string, data: Prisma.ClubUpdateInput): Promise<{
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
    findMyTeam(userId: string): Promise<{
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
    /**
     * Agrège buts, passes et AMR sur tout le roster, et désigne le meilleur buteur et le MVP (meilleure note moyenne).
     */
    getTeamStats(teamId: string): Promise<TeamStatsOverview>;
    /**
     * Classement général (Ladder) : toutes les équipes triées par note moyenne
     * décroissante, avec buts et passes cumulés du roster.
     */
    getLadder(): Promise<LadderEntry[]>;
    /** Stats d'overview pour l'équipe de l'utilisateur (lookup léger du team_id). */
    getMyTeamOverview(userId: string): Promise<TeamStatsOverview>;
}
//# sourceMappingURL=teams.service.d.ts.map