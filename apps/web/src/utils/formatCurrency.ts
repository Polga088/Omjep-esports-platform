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
