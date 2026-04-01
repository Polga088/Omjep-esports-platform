/**
 * Source unique de vérité pour les icônes et couleurs des types de compétition.
 * Toute la palette reste dans la famille Amber/Orange Eagles pour une cohérence de marque.
 *
 * LEAGUE    → ListOrdered  amber-400   (classement/tableau de ligue)
 * CUP       → Medal        orange-400  (coupe/médaille)
 * CHAMPIONS → Sparkles     amber-300   (phase de groupes UCL — prestige/or)
 */
import { ListOrdered, Medal, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface CompetitionTypeConfig {
  label: string;
  Icon: LucideIcon;
  /** Tailwind text color class */
  color: string;
  /** Tailwind background color class */
  bg: string;
  /** Tailwind border color class */
  border: string;
  /** Gradient stripe class for card top-border */
  stripe: string;
}

export const COMPETITION_TYPE_CONFIG = {
  LEAGUE: {
    label: 'Ligue',
    Icon: ListOrdered,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
    stripe: 'from-amber-400/60 to-amber-600/20',
  },
  CUP: {
    label: 'Coupe',
    Icon: Medal,
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/20',
    stripe: 'from-orange-400/60 to-orange-600/20',
  },
  CHAMPIONS: {
    label: 'Champions',
    Icon: Sparkles,
    color: 'text-amber-300',
    bg: 'bg-amber-300/10',
    border: 'border-amber-300/20',
    stripe: 'from-amber-300/60 to-yellow-500/20',
  },
} as const satisfies Record<string, CompetitionTypeConfig>;

export type CompetitionType = keyof typeof COMPETITION_TYPE_CONFIG;

/** Retourne la config pour un type donné, avec fallback sur LEAGUE. */
export function getCompTypeConfig(type: string): CompetitionTypeConfig {
  return COMPETITION_TYPE_CONFIG[type as CompetitionType] ?? COMPETITION_TYPE_CONFIG.LEAGUE;
}
