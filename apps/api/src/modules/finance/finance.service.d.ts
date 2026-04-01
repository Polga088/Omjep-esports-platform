import { CreateContractDto } from './dto/create-contract.dto';
import { PrismaService } from '@api/prisma/prisma.service';
export declare class FinanceService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    addMatchReward(teamId: string, result: 'W' | 'D' | 'L'): Promise<{
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
    processWeeklyWages(): Promise<void>;
    private static readonly STAFF_CLUB_ROLES;
    assertStaffOrAdminForTeam(actorUserId: string, actorRole: string, teamId: string): Promise<void>;
    getTeamFinances(teamId: string, actorUserId: string, actorRole: string): Promise<{
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
    createContract(actorUserId: string, actorRole: string, dto: CreateContractDto): Promise<{
        id: string;
        team_id: string;
        user_id: string;
        salary: number;
        release_clause: number;
        expires_at: Date;
    }>;
}
//# sourceMappingURL=finance.service.d.ts.map