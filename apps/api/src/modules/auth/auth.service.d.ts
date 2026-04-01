import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@api/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    register(dto: RegisterDto): Promise<{
        message: string;
        user: {
            ea_persona_name: string | null;
            preferred_position: import("@omjep/database").$Enums.Position | null;
            nationality: string | null;
            email: string;
            role: import("@omjep/database").$Enums.UserRole;
            gamertag_psn: string | null;
            gamertag_xbox: string | null;
            id: string;
            created_at: Date;
        };
    }>;
    validateUser(email: string, password: string): Promise<{
        ea_persona_name: string | null;
        preferred_position: import("@omjep/database").$Enums.Position | null;
        nationality: string | null;
        email: string;
        role: import("@omjep/database").$Enums.UserRole;
        gamertag_psn: string | null;
        gamertag_xbox: string | null;
        xp: number;
        level: number;
        id: string;
        external_id: string | null;
        created_at: Date;
    }>;
    login(email: string, password: string): Promise<{
        access_token: string;
        user: {
            ea_persona_name: string | null;
            preferred_position: import("@omjep/database").$Enums.Position | null;
            nationality: string | null;
            email: string;
            role: import("@omjep/database").$Enums.UserRole;
            gamertag_psn: string | null;
            gamertag_xbox: string | null;
            xp: number;
            level: number;
            id: string;
            external_id: string | null;
            created_at: Date;
        };
    }>;
}
//# sourceMappingURL=auth.service.d.ts.map