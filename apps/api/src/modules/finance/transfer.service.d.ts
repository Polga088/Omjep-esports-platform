import { PrismaService } from '@api/prisma/prisma.service';
export declare class TransferService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    initiateTransfer(actorUserId: string, actorRole: string, buyingTeamId: string, playerId: string): Promise<{
        message: string;
        release_clause: number;
        buying_team_id: string;
        selling_team_id: string;
    }>;
}
//# sourceMappingURL=transfer.service.d.ts.map