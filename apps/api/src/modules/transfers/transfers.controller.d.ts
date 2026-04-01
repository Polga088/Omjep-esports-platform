import { TransferOfferService } from './transfer-offer.service';
import { CreateTransferOfferDto } from './dto/create-transfer-offer.dto';
import { RespondTransferOfferDto } from './dto/respond-transfer-offer.dto';
export declare class TransfersController {
    private readonly transferOfferService;
    constructor(transferOfferService: TransferOfferService);
    createOffer(req: any, dto: CreateTransferOfferDto): Promise<{
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
    respondToOffer(req: any, id: string, dto: RespondTransferOfferDto): Promise<{
        id: string;
        created_at: Date;
        status: import("@omjep/database").$Enums.TransferStatus;
        player_id: string;
        amount: number;
        responded_at: Date | null;
        from_team_id: string;
        to_team_id: string;
    }>;
    listOffers(teamId?: string, status?: string): Promise<({
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
    getOffer(id: string): Promise<{
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
//# sourceMappingURL=transfers.controller.d.ts.map