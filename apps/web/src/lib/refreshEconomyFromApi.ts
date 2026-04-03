import api from '@/lib/api';
import type { User } from '@/store/useAuthStore';

/** Déclenché après un gain d’XP (ex. Mercato) pour synchroniser la timeline Gamification. */
export const OMJEP_XP_FLOW_EVENT = 'omjep:xp-flow';

export type XpFlowDetail = {
  xp: number;
  level?: number;
  delta: number;
};

/**
 * Rafraîchit portefeuille + XP depuis `/auth/me` et émet `omjep:xp-flow` si l’XP augmente.
 */
export async function refreshEconomyFromApi(
  patchUser: (p: Partial<User>) => void,
  previousXp: number | undefined,
): Promise<void> {
  try {
    const { data } = await api.get<{
      omjepCoins?: number;
      jepyCoins?: number;
      isPremium?: boolean;
      xp?: number;
      level?: number;
    }>('/auth/me');
    if (!data) return;

    const patch: Partial<User> = {
      omjepCoins:
        typeof data.omjepCoins === 'number' && Number.isFinite(data.omjepCoins)
          ? data.omjepCoins
          : undefined,
      jepyCoins:
        typeof data.jepyCoins === 'number' && Number.isFinite(data.jepyCoins)
          ? data.jepyCoins
          : undefined,
      isPremium: data.isPremium === true,
    };
    if (typeof data.xp === 'number' && Number.isFinite(data.xp)) {
      patch.xp = data.xp;
    }
    if (typeof data.level === 'number' && Number.isFinite(data.level)) {
      patch.level = Math.floor(data.level);
    }
    patchUser(patch);

    if (typeof data.xp !== 'number' || !Number.isFinite(data.xp)) return;
    if (typeof previousXp !== 'number' || !Number.isFinite(previousXp)) return;

    const delta = data.xp - previousXp;
    if (delta > 0) {
      window.dispatchEvent(
        new CustomEvent(OMJEP_XP_FLOW_EVENT, {
          detail: { xp: data.xp, level: data.level, delta } satisfies XpFlowDetail,
        }),
      );
    }
  } catch {
    /* ignore */
  }
}
