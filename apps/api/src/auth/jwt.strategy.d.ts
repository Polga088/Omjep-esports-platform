import { Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
}
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly prisma;
    constructor(prisma: PrismaService);
    validate(payload: JwtPayload): Promise<{
        ea_persona_name: string | null;
        preferred_position: import("@omjep/database").$Enums.Position | null;
        nationality: string | null;
        email: string;
        role: import("@omjep/database").$Enums.UserRole;
        gamertag_psn: string | null;
        gamertag_xbox: string | null;
        id: string;
        created_at: Date;
    }>;
}
export {};
//# sourceMappingURL=jwt.strategy.d.ts.map