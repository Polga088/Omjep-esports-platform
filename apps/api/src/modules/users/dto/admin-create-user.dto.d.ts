declare const POSITIONS: readonly ["GK", "DC", "LAT", "RAT", "MDC", "MOC", "MG", "MD", "BU", "ATT"];
declare const USER_ROLES: readonly ["ADMIN", "MODERATOR", "MANAGER", "PLAYER"];
export declare class AdminCreateUserDto {
    email: string;
    password: string;
    role?: (typeof USER_ROLES)[number];
    ea_persona_name?: string;
    gamertag_psn?: string;
    gamertag_xbox?: string;
    preferred_position?: (typeof POSITIONS)[number];
    nationality?: string;
}
export {};
//# sourceMappingURL=admin-create-user.dto.d.ts.map