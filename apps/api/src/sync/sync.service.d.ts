import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
export declare class SyncService {
    private readonly prisma;
    private readonly http;
    private readonly logger;
    private readonly apiBaseUrl;
    constructor(prisma: PrismaService, http: HttpService);
    syncClubStats(): Promise<void>;
    private syncTeam;
    private fetchClubStats;
    private getMockClubStats;
}
//# sourceMappingURL=sync.service.d.ts.map