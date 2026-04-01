import { PrismaService } from '@api/prisma/prisma.service';
import { ClubsService } from '../clubs/clubs.service';
import { AdminValidateClubDto } from '../clubs/dto/admin-validate-club.dto';
export declare class AdminClubsController {
    private readonly prisma;
    private readonly clubsService;
    constructor(prisma: PrismaService, clubsService: ClubsService);
    listPendingValidation(): Promise<({
        _count: {
            members: number;
        };
        manager: {
            ea_persona_name: string | null;
            email: string;
            id: string;
        } | null;
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
    validateClub(id: string, dto: AdminValidateClubDto): Promise<{
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
}
//# sourceMappingURL=admin-clubs.controller.d.ts.map