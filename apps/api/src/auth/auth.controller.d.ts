import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
    login(dto: LoginDto): Promise<{
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
    getMe(req: {
        user: unknown;
    }): unknown;
}
//# sourceMappingURL=auth.controller.d.ts.map