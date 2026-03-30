/**
 * Mirrors the backend formula: Level = floor(sqrt(xp / 100)) + 1
 * XP thresholds: L1=0, L2=100, L3=400, L4=900, L5=1600, …
 */

export function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function xpForLevel(level: number): number {
  return (level - 1) ** 2 * 100;
}

export function xpProgress(xp: number, level: number) {
  const currentThreshold = xpForLevel(level);
  const nextThreshold = xpForLevel(level + 1);
  const needed = nextThreshold - currentThreshold;
  const earned = xp - currentThreshold;
  return {
    current: earned,
    needed,
    nextLevel: level + 1,
    percentage: needed > 0 ? Math.min((earned / needed) * 100, 100) : 0,
    totalXp: xp,
  };
}
