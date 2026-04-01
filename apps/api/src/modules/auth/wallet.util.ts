/** Valeurs par défaut si la ligne SQL est ancienne ou NULL (post-migration). */
export const DEFAULT_OMJEP_COINS = 1000;
export const DEFAULT_JEPY_COINS = 0;

export type WithWallet = {
  omjepCoins: number;
  jepyCoins: number;
  isPremium: boolean;
};

/**
 * Garantit des nombres finis pour les soldes (évite null/undefined côté JSON).
 */
export function withWalletDefaults<
  T extends {
    omjepCoins?: number | null;
    jepyCoins?: number | null;
    isPremium?: boolean | null;
  },
>(u: T): T & WithWallet {
  const o = u.omjepCoins;
  const j = u.jepyCoins;
  return {
    ...u,
    omjepCoins:
      typeof o === 'number' && Number.isFinite(o) ? o : DEFAULT_OMJEP_COINS,
    jepyCoins:
      typeof j === 'number' && Number.isFinite(j) ? j : DEFAULT_JEPY_COINS,
    isPremium: u.isPremium === true,
  };
}
