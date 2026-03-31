import { PrismaService } from '../prisma/prisma.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
export declare class InvitationsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(inviterId: string, dto: CreateInvitationDto): Promise<{
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
    findPendingForUser(userId: string): Promise<({
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
    respond(invitationId: string, userId: string, status: 'ACCEPTED' | 'REJECTED'): Promise<{
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
//# sourceMappingURL=invitations.service.d.ts.map