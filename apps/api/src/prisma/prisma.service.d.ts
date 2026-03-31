import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@omjep/database';
export declare class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor();
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
//# sourceMappingURL=prisma.service.d.ts.map