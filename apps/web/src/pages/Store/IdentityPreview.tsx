import { useMemo } from 'react';
import { Sparkles, Loader2, Gem, Eye, Crown } from 'lucide-react';
import PlayerIdentity, { type PlayerIdentityRarity } from '@/components/PlayerIdentity';
import type { User } from '@/store/useAuthStore';
import { formatCurrency } from '@/utils/formatCurrency';

/** Aligné sur la liste boutique `/store/items` */
export interface StoreItemRow {
  id: string;
  name: string;
  description: string;
  priceJepy: number;
  category: 'BANNER' | 'AVATAR_FRAME' | 'BADGE';
  imageUrl: string;
  isAvailable: boolean;
}

export function inferStoreItemRarity(item: StoreItemRow | null): PlayerIdentityRarity {
  if (!item) return 'common';
  const n = item.name.toLowerCase();
  if (
    /\b(diamond|diamant|légende|legendary|mythic|ultime)\b/i.test(n) ||
    n.includes('diamond')
  ) {
    return 'legendary';
  }
  if (/\b(gold|or|premium|elite|platine|platinum)\b/i.test(n) || n.includes('gold')) {
    return 'premium';
  }
  return 'common';
}

/** Look actuel + essayage : cadre boutique → `activeFrameUrl` + rareté dérivée du nom (ex. Diamond → legendary) */
function buildCurrentIdentity(user: User | null, selected: StoreItemRow | null) {
  const profileRarity =
    (user?.avatarRarity as PlayerIdentityRarity | undefined) ??
    (user?.isPremium ? 'premium' : 'common');
  const rarity: PlayerIdentityRarity =
    selected?.category === 'AVATAR_FRAME' ? inferStoreItemRarity(selected) : profileRarity;

  let activeFrameUrl = user?.activeFrameUrl;
  if (selected?.category === 'AVATAR_FRAME') {
    activeFrameUrl = selected.imageUrl;
  }

  return {
    initial: user?.ea_persona_name?.charAt(0) ?? 'U',
    avatarUrl: user?.avatarUrl,
    rarity,
    activeFrameUrl,
    royalEagleFrame: false,
    activeJerseyId: user?.activeJerseyId,
    teamPrimaryColor: user?.teamPrimaryColor,
    teamSecondaryColor: user?.teamSecondaryColor,
    imgAlt: user?.ea_persona_name ?? 'Vous',
  };
}

/** Look « Full Prestige » : legendary + cadre sélectionné (cadre) ou Royal Eagle par défaut */
function buildPrestigeIdentity(user: User | null, selected: StoreItemRow | null) {
  const base = {
    initial: user?.ea_persona_name?.charAt(0) ?? 'U',
    avatarUrl: user?.avatarUrl,
    rarity: 'legendary' as PlayerIdentityRarity,
    activeJerseyId: user?.activeJerseyId,
    teamPrimaryColor: user?.teamPrimaryColor ?? '#fbbf24',
    teamSecondaryColor: user?.teamSecondaryColor ?? '#22d3ee',
    imgAlt: user?.ea_persona_name ?? 'Prestige',
  };

  if (selected?.category === 'AVATAR_FRAME') {
    return {
      ...base,
      activeFrameUrl: selected.imageUrl,
      royalEagleFrame: false,
    };
  }

  return {
    ...base,
    activeFrameUrl: user?.activeFrameUrl ?? undefined,
    royalEagleFrame: true,
  };
}

function rarityUnlockButtonClass(r: PlayerIdentityRarity): string {
  switch (r) {
    case 'legendary':
      return 'shadow-[0_0_28px_rgba(234,179,8,0.45),0_0_48px_rgba(251,191,36,0.2)] border-amber-400/50 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-[#0a0a0a] hover:shadow-[0_0_36px_rgba(251,191,36,0.55)]';
    case 'premium':
      return 'shadow-[0_0_24px_rgba(34,211,238,0.4),0_0_40px_rgba(56,189,248,0.15)] border-cyan-400/45 bg-gradient-to-r from-cyan-500 to-cyan-600 text-[#020617] hover:shadow-[0_0_32px_rgba(34,211,238,0.5)]';
    default:
      return 'shadow-[0_0_16px_rgba(148,163,184,0.25)] border-slate-400/35 bg-gradient-to-r from-slate-600 to-slate-700 text-white hover:shadow-[0_0_22px_rgba(148,163,184,0.35)]';
  }
}

export interface IdentityPreviewProps {
  user: User | null;
  selectedItem: StoreItemRow | null;
  /** 0 = avant (look actuel), 1 = après (Full Prestige) */
  prestigeBlend: number;
  onPrestigeBlendChange: (v: number) => void;
  jepy: number;
  owned: boolean;
  buying: boolean;
  canAfford: boolean;
  onUnlock: () => void;
}

/** @deprecated Utiliser `IdentityPreviewProps` */
export type StorePreviewProps = IdentityPreviewProps;

/**
 * Bloc central boutique : PlayerIdentity `lg`, sélection cadre réactive, comparateur Avant / Après, CTA Jepy.
 */
export default function IdentityPreview({
  user,
  selectedItem,
  prestigeBlend,
  onPrestigeBlendChange,
  jepy,
  owned,
  buying,
  canAfford,
  onUnlock,
}: IdentityPreviewProps) {
  const currentProps = useMemo(
    () => buildCurrentIdentity(user, selectedItem),
    [user, selectedItem],
  );
  const prestigeProps = useMemo(
    () => buildPrestigeIdentity(user, selectedItem),
    [user, selectedItem],
  );

  const rarityForCta = inferStoreItemRarity(selectedItem);
  const showCta = selectedItem && !owned;
  const isAfter = prestigeBlend >= 0.5;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#070a12]/90 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md sm:p-8">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-500/10">
            <Gem className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-400/70">
              Identity Preview
            </p>
            <h2 className="text-lg font-black text-white">Aperçu en direct</h2>
          </div>
        </div>
        {selectedItem && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            <Sparkles className="h-3 w-3 text-cyan-400" />
            {selectedItem.name}
          </span>
        )}
      </div>

      {/* Comparateur Avant / Après */}
      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Comparaison
          </span>
          <div className="flex rounded-lg border border-white/10 bg-black/30 p-0.5">
            <button
              type="button"
              onClick={() => onPrestigeBlendChange(0)}
              className={`inline-flex flex-col items-center gap-0.5 rounded-md px-3 py-1.5 text-xs font-bold transition sm:flex-row sm:gap-1.5 ${
                !isAfter ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Eye className="h-3.5 w-3.5 shrink-0 opacity-80" />
              <span>Avant</span>
              <span className="hidden text-[9px] font-semibold uppercase tracking-wide text-slate-500 sm:inline">
                · actuel
              </span>
            </button>
            <button
              type="button"
              onClick={() => onPrestigeBlendChange(1)}
              className={`inline-flex flex-col items-center gap-0.5 rounded-md px-3 py-1.5 text-xs font-bold transition sm:flex-row sm:gap-1.5 ${
                isAfter
                  ? 'bg-gradient-to-r from-amber-500/25 to-cyan-500/20 text-amber-200 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Crown className="h-3.5 w-3.5 shrink-0 text-amber-400/90" />
              <span>Après</span>
              <span className="hidden text-[9px] font-semibold uppercase tracking-wide text-amber-400/50 sm:inline">
                · Full Prestige
              </span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-[10px] font-medium text-slate-500">Avant</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(prestigeBlend * 100)}
            onChange={(e) => onPrestigeBlendChange(Number(e.target.value) / 100)}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-amber-400 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-400 [&::-webkit-slider-thumb]:bg-[#0B0D13]"
            aria-label="Fondu entre look actuel (Avant) et Full Prestige (Après)"
          />
          <span className="w-14 shrink-0 text-right text-[10px] font-medium text-amber-400/80">
            Après
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <div className="relative mx-auto flex min-h-[min(280px,72vw)] w-full max-w-[280px] items-center justify-center">
          <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-gradient-to-b from-cyan-500/5 via-transparent to-amber-500/5 blur-3xl" />
          <div className="relative h-[220px] w-[220px] shrink-0">
            <div
              className="absolute inset-0 flex items-center justify-center transition-opacity duration-300 ease-out"
              style={{ opacity: 1 - prestigeBlend }}
            >
              <PlayerIdentity
                {...currentProps}
                size="lg"
                className="drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]"
              />
            </div>
            <div
              className="absolute inset-0 flex items-center justify-center transition-opacity duration-300 ease-out"
              style={{ opacity: prestigeBlend }}
            >
              <PlayerIdentity
                {...prestigeProps}
                size="lg"
                className="drop-shadow-[0_0_28px_rgba(251,191,36,0.15)]"
              />
            </div>
          </div>
        </div>

        {selectedItem && (
          <div className="mt-4 flex w-full max-w-sm flex-col items-center gap-2">
            {showCta ? (
              <button
                type="button"
                disabled={buying || !canAfford || !selectedItem.isAvailable}
                onClick={onUnlock}
                className={`relative w-full rounded-xl border px-5 py-3.5 text-sm font-black uppercase tracking-wide transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 ${rarityUnlockButtonClass(
                  rarityForCta,
                )}`}
              >
                {buying ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Traitement…
                  </span>
                ) : !canAfford ? (
                  `Solde insuffisant (${formatCurrency(jepy, 'Jepy')})`
                ) : (
                  <>Débloquer pour {formatCurrency(selectedItem.priceJepy, 'Jepy')}</>
                )}
              </button>
            ) : (
              <p className="text-center text-xs font-semibold text-emerald-400/90">
                Cet article est déjà dans votre inventaire.
              </p>
            )}
            <p className="text-center text-[10px] text-slate-600">
              Cadre sélectionné : aperçu instantané · mode Après : légendaire + Royal Eagle si hors cadre
            </p>
          </div>
        )}
      </div>

      {!selectedItem && (
        <p className="mt-6 text-center text-xs text-slate-500">
          Sélectionnez un article ci-dessous pour prévisualiser votre identité et débloquer avec vos Jepy.
        </p>
      )}
    </div>
  );
}
