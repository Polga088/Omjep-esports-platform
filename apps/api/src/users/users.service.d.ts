import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { LevelingService } from '../leveling/leveling.service';
export declare class UsersService {
    private readonly prisma;
    private readonly leveling;
    constructor(prisma: PrismaService, leveling: LevelingService);
    findAll(): Promise<{
        ea_persona_name: string | null;
        preferred_position: import("@omjep/database").$Enums.Position | null;
        nationality: string | null;
        email: string;
        role: import("@omjep/database").$Enums.UserRole;
        gamertag_psn: string | null;
        gamertag_xbox: string | null;
        id: string;
        created_at: Date;
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
    }[]>;
    findOne(id: string): Promise<{
        ea_persona_name: string | null;
        preferred_position: import("@omjep/database").$Enums.Position | null;
        nationality: string | null;
        email: string;
        role: import("@omjep/database").$Enums.UserRole;
        gamertag_psn: string | null;
        gamertag_xbox: string | null;
        xp: number;
        level: number;
        id: string;
        external_id: string | null;
        created_at: Date;
        teamMemberships: ({
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
            club_role: import("@omjep/database").$Enums.ClubRole;
            joined_at: Date;
            team_id: string;
            user_id: string;
        })[];
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
    }>;
    adminCreate(dto: AdminCreateUserDto): Promise<{
        ea_persona_name: string | null;
        preferred_position: import("@omjep/database").$Enums.Position | null;
        nationality: string | null;
        email: string;
        role: import("@omjep/database").$Enums.UserRole;
        gamertag_psn: string | null;
        gamertag_xbox: string | null;
        id: string;
        created_at: Date;
    }>;
    adminUpdate(id: string, dto: AdminUpdateUserDto): Promise<{
        ea_persona_name: string | null;
        preferred_position: import("@omjep/database").$Enums.Position | null;
        nationality: string | null;
        email: string;
        role: import("@omjep/database").$Enums.UserRole;
        gamertag_psn: string | null;
        gamertag_xbox: string | null;
        xp: number;
        level: number;
        id: string;
        created_at: Date;
    }>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<{
        ea_persona_name: string | null;
        preferred_position: import("@omjep/database").$Enums.Position | null;
        nationality: string | null;
        email: string;
        role: import("@omjep/database").$Enums.UserRole;
        id: string;
    }>;
    getProfileCard(id: string): Promise<{
        user: {
            ea_persona_name: string | null;
            preferred_position: import("@omjep/database").$Enums.Position | null;
            nationality: string | null;
            email: string;
            role: import("@omjep/database").$Enums.UserRole;
            gamertag_psn: string | null;
            gamertag_xbox: string | null;
            xp: number;
            level: number;
            id: string;
            created_at: Date;
        };
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
        } | null;
        stats: {
            goals: number;
            assists: number;
            matches: number;
        };
        contract: {
            salary: number;
            release_clause: number;
            expires_at: Date;
        } | null;
    }>;
    remove(id: string): Promise<{
        ea_persona_name: string | null;
        preferred_position: import("@omjep/database").$Enums.Position | null;
        nationality: string | null;
        email: string;
        role: import("@omjep/database").$Enums.UserRole;
        gamertag_psn: string | null;
        gamertag_xbox: string | null;
        xp: number;
        level: number;
        id: string;
        external_id: string | null;
        password_hash: string;
        created_at: Date;
    }>;
}
//# sourceMappingURL=users.service.d.ts.map