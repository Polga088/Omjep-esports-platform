import { useEffect, useState } from 'react'
import { Coins, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import {
  getEquippedCardStyle,
  premiumProfileMock,
} from '@/features/profile/mocks/premiumProfile.mock'

interface StoreItem {
  id: string
  type: 'CARD_STYLE'
  name: string
  description: string
  price: number
  imageUrl: string
  rarity: 'BRONZE' | 'SILVER' | 'GOLD'
  metadata: {
    cssEffect?: string
  }
}

const DEFAULT_USER_COINS = 500
const EQUIPPED_CARD_STYLE_STORAGE_KEY = 'omjep-equipped-card-style-id'

const fallbackCardStyleItems: StoreItem[] = [
  {
    id: 'card-style-bronze-ea-fc-26',
    type: 'CARD_STYLE',
    name: 'Style Non Rare Bronze EA FC 26',
    description: 'Palette bronze avec reflet léger pour une carte sobre et élégante.',
    price: 200,
    imageUrl: '/assets/card-shell-non-rare.svg',
    rarity: 'BRONZE',
    metadata: { cssEffect: 'glimmer-bronze' },
  },
  {
    id: 'card-style-silver-ea-fc-26',
    type: 'CARD_STYLE',
    name: 'Style Non Rare Argent EA FC 26',
    description: 'Finition argent et contour renforcé pour une présence plus premium.',
    price: 300,
    imageUrl: '/assets/card-shell-non-rare.svg',
    rarity: 'SILVER',
    metadata: { cssEffect: 'shine-silver' },
  },
  {
    id: 'card-style-gold-ea-fc-26',
    type: 'CARD_STYLE',
    name: 'Style Non Rare Or EA FC 26',
    description: 'Cadre or signature avec un rendu rare inspiré des visuels de référence.',
    price: 450,
    imageUrl: '/assets/card-shell-non-rare.svg',
    rarity: 'GOLD',
    metadata: { cssEffect: 'aura-gold' },
  },
]

const rarityStyles: Record<StoreItem['rarity'], string> = {
  BRONZE: 'border-[#ad6f35]/40 from-[#ad6f35]/20 to-[#120d09]',
  SILVER: 'border-slate-300/35 from-slate-300/20 to-[#0f1218]',
  GOLD: 'border-amber-300/45 from-amber-400/30 to-[#171308]',
}

interface CardStyleStoreProps {
  userCoins?: number
  onWalletChange?: (nextCoins: number) => void
  onEquippedStyleChange?: (rarity: StoreItem['rarity']) => void
}

const CardStyleStore = ({
  userCoins: userCoinsProp,
  onWalletChange,
  onEquippedStyleChange,
}: CardStyleStoreProps) => {
  const [isLoading, setIsLoading] = useState(true)
  const [isBuyingId, setIsBuyingId] = useState<string | null>(null)
  const [userCoins, setUserCoins] = useState(userCoinsProp ?? DEFAULT_USER_COINS)
  const [items, setItems] = useState<StoreItem[]>([])
  const [inventoryIds, setInventoryIds] = useState<string[]>([])
  const [equippedStyleId, setEquippedStyleId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof userCoinsProp === 'number' && Number.isFinite(userCoinsProp)) {
      setUserCoins(userCoinsProp)
    }
  }, [userCoinsProp])

  useEffect(() => {
    let isCancelled = false

    const loadItems = async () => {
      try {
        const { data } = await api.get<StoreItem[]>('/store/items', {
          params: { type: 'CARD_STYLE' },
        })
        if (!isCancelled && Array.isArray(data) && data.length > 0) {
          setItems(data)
          return
        }
      } catch {
        // Fallback local tant que le backend mock n'est pas branché
      }

      if (!isCancelled) {
        setItems(fallbackCardStyleItems)

        const initialInventory = premiumProfileMock.cardStylesInventory.map(
          (cardStyle) => cardStyle.storeItemId,
        )
        setInventoryIds(initialInventory)

        const localEquippedStyleId = localStorage.getItem(EQUIPPED_CARD_STYLE_STORAGE_KEY)
        const mockEquippedStyle = getEquippedCardStyle(premiumProfileMock)
        const resolvedEquippedStyleId = localEquippedStyleId ?? mockEquippedStyle?.storeItemId ?? null
        setEquippedStyleId(resolvedEquippedStyleId)

        const equippedRarity = fallbackCardStyleItems.find(
          (item) => item.id === resolvedEquippedStyleId,
        )?.rarity
        if (equippedRarity) {
          onEquippedStyleChange?.(equippedRarity)
        } else if (mockEquippedStyle?.rarity) {
          onEquippedStyleChange?.(mockEquippedStyle.rarity)
        }
      }
    }

    void loadItems().finally(() => {
      if (!isCancelled) {
        setIsLoading(false)
      }
    })

    return () => {
      isCancelled = true
    }
  }, [])

  const equipStyle = (item: StoreItem) => {
    setEquippedStyleId(item.id)
    localStorage.setItem(EQUIPPED_CARD_STYLE_STORAGE_KEY, item.id)
    onEquippedStyleChange?.(item.rarity)
    toast.success(`${item.name} équipé sur votre profil`)
  }

  const handleBuy = async (item: StoreItem) => {
    if (userCoins < item.price) {
      toast.error('Solde OC insuffisant pour cet achat')
      return
    }

    if (inventoryIds.includes(item.id)) {
      equipStyle(item)
      return
    }

    setIsBuyingId(item.id)
    await new Promise((resolve) => setTimeout(resolve, 450))
    const nextCoins = userCoins - item.price
    setUserCoins(nextCoins)
    onWalletChange?.(nextCoins)
    setInventoryIds((previousIds) => [...previousIds, item.id])
    equipStyle(item)
    setIsBuyingId(null)
    toast.success(`${item.name} débloqué et ajouté à l'inventaire`)
  }

  const ownedCount = inventoryIds.length

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-white/10 bg-[#090b12]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    )
  }

  return (
    <section className="space-y-5 rounded-2xl border border-white/10 bg-[#080a12] p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-300/80">
            Store Customisation
          </p>
          <h2 className="text-xl font-black text-white">Styles de cartes premium</h2>
        </div>
        <div className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200">
            <Coins className="h-4 w-4" />
            {userCoins} OC
          </span>
          <span className="rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200">
            {ownedCount} débloqué(s)
          </span>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => {
          const isOwned = inventoryIds.includes(item.id)
          const isBusy = isBuyingId === item.id
          const isEquipped = equippedStyleId === item.id

          return (
            <article
              key={item.id}
              className={`overflow-hidden rounded-xl border bg-gradient-to-b ${rarityStyles[item.rarity]}`}
            >
              <div className="relative aspect-[7/10] border-b border-white/10 bg-[#090b12] p-3">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-full w-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.65)]"
                />
              </div>
              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    {item.rarity}
                  </p>
                  {isEquipped ? (
                    <span className="rounded-md border border-cyan-400/35 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-200">
                      Équipé
                    </span>
                  ) : null}
                </div>
                <h3 className="line-clamp-2 min-h-[3rem] text-base font-bold text-white">
                  {item.name}
                </h3>
                <p className="line-clamp-2 min-h-[2.5rem] text-sm text-slate-300/90">
                  {item.description}
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-black text-amber-200">{item.price} OC</span>
                  <button
                    type="button"
                    onClick={() => void handleBuy(item)}
                    disabled={isOwned || isBusy}
                    className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 px-3 py-1.5 text-xs font-bold text-[#0b0d14] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isOwned ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        {isEquipped ? 'Équipé' : 'Équiper'}
                      </>
                    ) : isBusy ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Achat...
                      </>
                    ) : (
                      'Acheter'
                    )}
                  </button>
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
