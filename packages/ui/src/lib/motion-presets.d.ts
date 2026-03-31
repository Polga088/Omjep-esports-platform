/**
 * Spring presets tuned for snappy feedback while staying light on the main thread.
 * Prefer transform/opacity only in consumers for consistent 60fps targets.
 */
export declare const springSnappy: {
    type: "spring";
    stiffness: number;
    damping: number;
    mass: number;
};
export declare const springSoft: {
    type: "spring";
    stiffness: number;
    damping: number;
    mass: number;
};
export declare const springPop: {
    type: "spring";
    stiffness: number;
    damping: number;
    mass: number;
};
export declare const tapScale = 0.97;
export declare const hoverLiftY = -2;
//# sourceMappingURL=motion-presets.d.ts.map