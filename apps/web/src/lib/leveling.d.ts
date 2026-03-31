/**
 * Mirrors the backend formula: Level = floor(sqrt(xp / 100)) + 1
 * XP thresholds: L1=0, L2=100, L3=400, L4=900, L5=1600, …
 */
export declare function calculateLevel(xp: number): number;
export declare function xpForLevel(level: number): number;
export declare function xpProgress(xp: number, level: number): {
    current: number;
    needed: number;
    nextLevel: number;
    percentage: number;
    totalXp: number;
};
//# sourceMappingURL=leveling.d.ts.map