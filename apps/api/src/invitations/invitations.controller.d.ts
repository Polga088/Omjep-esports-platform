import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { RespondInvitationDto } from './dto/respond-invitation.dto';
export declare class InvitationsController {
    private readonly invitationsService;
    constructor(invitationsService: InvitationsService);
    create(req: {
        user: {
            id: string;
        };
    }, dto: CreateInvitationDto): Promise<{
        team: {
            id: string;
            name: string;
            logo_url: string | null;
        };
    } & {
        id: string;
        created_at: Date;
        team_id: string;
        status: import("@omjep/database").$Enums.InvitationStatus;
        invitee_email: string;
        invitee_id: string | null;
        inviter_id: string;
    }>;
    findMyPending(req: {
        user: {
            id: string;
        };
    }): Promise<({
        team: {
            id: string;
            name: string;
            logo_url: string | null;
            platform: import("@omjep/database").$Enums.Platform;
        };
        inviter: {
            ea_persona_name: string | null;
            email: string;
            id: string;
        };
    } & {
        id: string;
        created_at: Date;
        team_id: string;
        status: import("@omjep/database").$Enums.InvitationStatus;
        invitee_email: string;
        invitee_id: string | null;
        inviter_id: string;
    })[]>;
    respond(id: string, req: {
        user: {
            id: string;
        };
    }, dto: RespondInvitationDto): Promise<{
        team: {
            id: string;
            name: string;
            logo_url: string | null;
        };
    } & {
        id: string;
        created_at: Date;
        team_id: string;
        status: import("@omjep/database").$Enums.InvitationStatus;
        invitee_email: string;
        invitee_id: string | null;
        inviter_id: string;
    }>;
}
//# sourceMappingURL=invitations.controller.d.ts.map