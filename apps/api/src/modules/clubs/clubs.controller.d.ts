import { ClubsService } from './clubs.service';
import { RequestClubCreationDto } from './dto/request-club-creation.dto';
import { AdminValidateClubDto } from './dto/admin-validate-club.dto';
export declare class ClubsController {
    private readonly clubsService;
    constructor(clubsService: ClubsService);
    requestClubCreation(req: {
        user: {
            id: string;
        };
    }, dto: RequestClubCreationDto): Promise<{
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
    adminValidateClub(id: string, dto: AdminValidateClubDto): Promise<{
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
//# sourceMappingURL=clubs.controller.d.ts.map