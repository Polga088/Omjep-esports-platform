declare const POSITIONS: readonly ["GK", "DC", "LAT", "RAT", "MDC", "MOC", "MG", "MD", "BU", "ATT"];
declare const PLATFORMS: readonly ["CROSSPLAY", "PS5", "XBOX", "PC"];
export declare class RegisterDto {
    email: string;
    password: string;
    ea_persona_name?: string;
    gamertag_psn?: string;
    gamertag_xbox?: string;
    preferred_position?: (typeof POSITIONS)[number];
    nationality?: string;
    platform?: (typeof PLATFORMS)[number];
}
export {};
//# sourceMappingURL=register.dto.d.ts.map