/**
 * Spring presets tuned for snappy feedback while staying light on the main thread.
 * Prefer transform/opacity only in consumers for consistent 60fps targets.
 */
export const springSnappy = { type: 'spring' as const, stiffness: 420, damping: 28, mass: 0.85 };
export const springSoft = { type: 'spring' as const, stiffness: 280, damping: 22, mass: 0.9 };
export const springPop = { type: 'spring' as const, stiffness: 520, damping: 32, mass: 0.75 };

export const tapScale = 0.97;
export const hoverLiftY = -2;
