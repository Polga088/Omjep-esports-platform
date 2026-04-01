import { FinanceService } from './finance.service';
import { TransferService } from './transfer.service';
import { AddMatchRewardDto } from './dto/add-match-reward.dto';
import { InitiateTransferDto } from './dto/initiate-transfer.dto';
import { CreateContractDto } from './dto/create-contract.dto';
type AuthedRequest = {
    user: {
        id: string;
        role: string;
    };
};
export declare class FinanceController {
    private readonly financeService;
    private readonly transferService;
    constructor(financeService: FinanceService, transferService: TransferService);
    getTeamFinances(teamId: string, req: AuthedRequest): Promise<{
        budget: number;
        transactions: {
            id: string;
            created_at: Date;
            team_id: string;
            type: import("@omjep/database").$Enums.TransactionType;
            amount: number;
            description: string | null;
        }[];
        contracts: ({
            user: {
                ea_persona_name: string | null;
                id: string;
            };
        } & {
            id: string;
            team_id: string;
            user_id: string;
            salary: number;
            release_clause: number;
            expires_at: Date;
        })[];
    }>;
    addMatchReward(dto: AddMatchRewardDto): Promise<{
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
    initiateTransfer(dto: InitiateTransferDto, req: AuthedRequest): Promise<{
        message: string;
        release_clause: number;
        buying_team_id: string;
        selling_team_id: string;
    }>;
    createContract(dto: CreateContractDto, req: AuthedRequest): Promise<{
        id: string;
        team_id: string;
        user_id: string;
        salary: number;
        release_clause: number;
        expires_at: Date;
    }>;
}
export {};
//# sourceMappingURL=finance.controller.d.ts.map