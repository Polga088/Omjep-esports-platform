/**
 * Affichage des montants OMJEP (OC) vs Jepy (prédictions / store Jepy).
 * Pas de symbole € — aligné branding OMJEP.
 */
export type CurrencyBrand = 'OC' | 'Jepy';

export function formatCurrency(amount: number, type: CurrencyBrand): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const abs = Math.abs(n);
  let num: string;
  if (abs >= 1_000_000) {
    num = `${(n / 1_000_000).toFixed(2)}M`;
  } else if (abs >= 1_000) {
    num = `${(n / 1_000).toFixed(0)}K`;
  } else {
    num = n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
  }
  const suffix = type === 'OC' ? 'OC' : 'Jepy';
  return `${num} ${suffix}`;
}

/** Chiffres seuls (même logique que formatCurrency, sans suffixe) — affichage HUD `> [ … ] <` */
export function formatAmountDigits(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
}
