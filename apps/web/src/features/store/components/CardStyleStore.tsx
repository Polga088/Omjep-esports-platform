import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/utils/formatCurrency'
import type { PlayerCardStoreItem, PlayerCardStoreRarity } from '@/features/store/models/playerCardStore.model'
import {
  PLAYER_CARD_MOCK_CATALOG,
  PLAYER_CARD_STORE_CHANGED,
  activatePlayerCardMock,
  buyPlayerCardMock,
  getPlayerCardJpyBalance,
  isGoldTierRarity,
  playerCardRarityBadgeClass,
  playerCardRarityLabel,
  playerCardStoreTileBg,
  readPlayerCardStoreState,
  seedPlayerCardMockIfEmpty,
} from '@/features/store/models/playerCardStore.model'

interface CardStyleStoreProps {
  /** Solde JPY (mock : décrémenté localement + patch parent). */
  balanceJpy: number
  onBalanceJpyChange?: (nextJpy: number) => void
  onEquippedRarityChange?: (rarity: PlayerCardStoreRarity) => void
}

const CardStyleStore = ({
  balanceJpy,
  onBalanceJpyChange,
  onEquippedRarityChange,
}: CardStyleStoreProps) => {
  const [ready, setReady] = useState(false)
  const [tick, setTick] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [jpyBalance, setJpyBalance] = useState<number>(balanceJpy)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    const state = readPlayerCardStoreState()
    setJpyBalance(state.jpyBalance)
    onBalanceJpyChange?.(state.jpyBalance)
    setReady(true)
  }, [onBalanceJpyChange])

  useEffect(() => {
    const handler = () => refresh()
    window.addEventListener(PLAYER_CARD_STORE_CHANGED, handler)
    return () => window.removeEventListener(PLAYER_CARD_STORE_CHANGED, handler)
  }, [refresh])

  const { inventoryIds, activeId } = useMemo(() => {
    void tick
    const { inventory, activeId: a } = seedPlayerCardMockIfEmpty()
    return { inventoryIds: new Set(inventory), activeId: a }
  }, [tick])

  useEffect(() => {
    if (!ready) return
    const next = getPlayerCardJpyBalance()
    setJpyBalance(next)
    onBalanceJpyChange?.(next)
  }, [tick, ready, onBalanceJpyChange])

  const sortedCatalog = useMemo(
    () =>
      [...PLAYER_CARD_MOCK_CATALOG].sort((a, b) => {
        const order: PlayerCardStoreRarity[] = ['COMMON', 'RARE', 'ELITE', 'EPIC', 'LEGENDARY']
        return order.indexOf(a.rarity) - order.indexOf(b.rarity)
      }),
    [],
  )

  const handleBuy = (item: PlayerCardStoreItem) => {
    if (inventoryIds.has(item.id)) return
    if (jpyBalance < item.priceJpy) {
      toast.error('Solde Jepy insuffisant.')
      return
    }
    setBusyId(item.id)
    window.setTimeout(() => {
      const ok = buyPlayerCardMock(item.id, item.priceJpy, jpyBalance)
      if (!ok) {
        toast.error('Solde Jepy insuffisant.')
        setBusyId(null)
        return
      }
      const next = getPlayerCardJpyBalance()
      setJpyBalance(next)
      onBalanceJpyChange?.(next)
      toast.success(`Achat confirmé : « ${item.name} » ajoutée à votre inventaire.`)
      refresh()
      setBusyId(null)
    }, 380)
  }

  const handleActivate = (item: PlayerCardStoreItem) => {
    if (!inventoryIds.has(item.id)) return
    setBusyId(item.id)
    window.setTimeout(() => {
      const ok = activatePlayerCardMock(item.id)
      if (!ok) {
        toast.error('Activation impossible pour cette carte.')
        setBusyId(null)
        return
      }
      onEquippedRarityChange?.(item.rarity)
      toast.success(`Carte active : ${item.name}`)
      refresh()
      setBusyId(null)
    }, 200)
  }

  if (!ready) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-omjep-border bg-omjep-bg-panel/90">
        <Loader2 className="h-9 w-9 animate-spin text-omjep-mauve" aria-hidden />
      </div>
    )
  }

  return (
    <section className="space-y-6" aria-labelledby="player-cards-store-heading">
      <header className="flex flex-col gap-4 border-b border-omjep-border/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-omjep-mauve">Boutique JPY</p>
          <h2 id="player-cards-store-heading" className="font-display text-2xl font-black text-omjep-text-primary">
            Cartes joueur
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-omjep-text-secondary">
            Styles et cadres achetables en <span className="font-semibold text-omjep-mauve">Jepy</span> uniquement.
            Équipez une carte pour votre profil public et vos exports — phase mock locale, sans persistance serveur.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-omjep-border bg-omjep-bg-panel-soft/80 px-4 py-3">
          <Sparkles className="h-5 w-5 text-omjep-mauve" aria-hidden />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-omjep-text-muted">Solde</p>
            <p className="font-mono text-lg font-black tabular-nums text-omjep-text-primary">
              {formatCurrency(jpyBalance, 'Jepy')}
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {sortedCatalog.map((item) => {
          const owned = inventoryIds.has(item.id)
          const active = activeId === item.id
          const busy = busyId === item.id
          const goldTier = isGoldTierRarity(item.rarity)
          const tileBg = playerCardStoreTileBg[item.rarity]

          return (
            <article
              key={item.id}
              className={`flex flex-col overflow-hidden rounded-2xl border border-omjep-border bg-gradient-to-b ${tileBg} shadow-[var(--omjep-shadow-sm)] transition hover:border-omjep-mauve/35 hover:shadow-[var(--omjep-shadow-md)]`}
            >
              <div
                className={`relative aspect-[7/10] border-b border-omjep-border/70 bg-omjep-bg-elevated/90 p-4 ${
                  goldTier ? 'ring-1 ring-omjep-border-gold/30' : ''
                }`}
              >
                <div
                  className={`pointer-events-none absolute inset-0 opacity-90 ${
                    goldTier
                      ? 'bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_srgb,var(--omjep-gold)_22%,transparent),transparent_58%)]'
                      : 'bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_srgb,var(--omjep-mauve)_12%,transparent),transparent_55%)]'
                  }`}
                />
                <img
                  src={item.imageUrl}
                  alt=""
                  className="relative z-[1] mx-auto h-full max-h-[min(100%,220px)] w-full object-contain drop-shadow-[0_16px_36px_rgba(0,0,0,0.45)]"
                />
                <span
                  className={`absolute right-3 top-3 z-[2] rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${playerCardRarityBadgeClass[item.rarity]}`}
                >
                  {playerCardRarityLabel[item.rarity]}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                <div className="min-h-0 flex-1 space-y-2">
                  <h3 className="text-base font-bold leading-snug text-omjep-text-primary">{item.name}</h3>
                  <p className="line-clamp-3 text-sm text-omjep-text-secondary">{item.description}</p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-omjep-border/60 pt-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-omjep-text-muted">Prix</p>
                    <p
                      className={`font-mono text-lg font-black tabular-nums ${
                        goldTier ? 'text-omjep-gold' : 'text-omjep-text-primary'
                      }`}
                    >
                      {formatCurrency(item.priceJpy, 'Jepy')}
                    </p>
                  </div>
                  <div className="flex flex-col items-stretch gap-2 sm:items-end">
                    {active ? (
                      <span className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-omjep-success/45 bg-omjep-success/12 px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-omjep-success">
                        Actif
                      </span>
                    ) : null}
                    {!owned ? (
                      <div className="flex flex-col items-stretch gap-2">
                        <button
                          type="button"
                          disabled={busy || jpyBalance < item.priceJpy}
                          onClick={() => handleBuy(item)}
                          className="inline-flex min-h-[44px] min-w-[8.5rem] items-center justify-center rounded-xl border border-omjep-mauve/50 bg-omjep-mauve px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : 'Acheter'}
                        </button>
                        {jpyBalance < item.priceJpy ? (
                          <span className="text-center text-[10px] font-semibold text-omjep-danger">
                            Solde insuffisant
                          </span>
                        ) : null}
                      </div>
                    ) : !active ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleActivate(item)}
                        className="inline-flex min-h-[44px] min-w-[8.5rem] items-center justify-center rounded-xl border border-omjep-border bg-omjep-bg-panel-soft px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-omjep-text-primary transition hover:border-omjep-mauve/40 hover:bg-omjep-mauve/10 disabled:opacity-50"
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : 'Activer'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default CardStyleStore
