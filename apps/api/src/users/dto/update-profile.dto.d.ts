declare const POSITIONS: readonly ["GK", "DC", "LAT", "RAT", "MDC", "MOC", "MG", "MD", "BU", "ATT"];
export declare class UpdateProfileDto {
    ea_persona_name?: string;
    preferred_position?: (typeof POSITIONS)[number];
    nationality?: string;
}
export {};
//# sourceMappingURL=update-profile.dto.d.ts.map