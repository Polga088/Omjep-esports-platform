import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTransferOfferDto } from './dto/create-transfer-offer.dto';
export declare class TransferOfferService {
    private readonly prisma;
    private readonly notifications;
    constructor(prisma: PrismaService, notifications: NotificationsService);
    createOffer(requestingUserId: string, dto: CreateTransferOfferDto): Promise<{
        player: {
            ea_persona_name: string | null;
            id: string;
        };
        fromTeam: {
            id: string;
            name: string;
        };
        toTeam: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        created_at: Date;
        status: import("@omjep/database").$Enums.TransferStatus;
        player_id: string;
        amount: number;
        responded_at: Date | null;
        from_team_id: string;
        to_team_id: string;
    }>;
    respondToOffer(requestingUserId: string, offerId: string, status: 'ACCEPTED' | 'REJECTED'): Promise<{
        id: string;
        created_at: Date;
        status: import("@omjep/database").$Enums.TransferStatus;
        player_id: string;
        amount: number;
        responded_at: Date | null;
        from_team_id: string;
        to_team_id: string;
    }>;
    listOffers(filters?: {
        team_id?: string;
        status?: string;
    }): Promise<({
        player: {
            ea_persona_name: string | null;
            preferred_position: import("@omjep/database").$Enums.Position | null;
            id: string;
        };
        fromTeam: {
            id: string;
            name: string;
            logo_url: string | null;
        };
        toTeam: {
            id: string;
            name: string;
            logo_url: string | null;
        };
    } & {
        id: string;
        created_at: Date;
        status: import("@omjep/database").$Enums.TransferStatus;
        player_id: string;
        amount: number;
        responded_at: Date | null;
        from_team_id: string;
        to_team_id: string;
    })[]>;
    getOffer(offerId: string): Promise<{
        player: {
            ea_persona_name: string | null;
            preferred_position: import("@omjep/database").$Enums.Position | null;
            id: string;
        };
        fromTeam: {
            id: string;
            name: string;
            logo_url: string | null;
            budget: number;
        };
        toTeam: {
            id: string;
            name: string;
            logo_url: string | null;
        };
    } & {
        id: string;
        created_at: Date;
        status: import("@omjep/database").$Enums.TransferStatus;
        player_id: string;
        amount: number;
        responded_at: Date | null;
        from_team_id: string;
        to_team_id: string;
    }>;
}
//# sourceMappingURL=transfer-offer.service.d.ts.map