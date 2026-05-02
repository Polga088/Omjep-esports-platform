/** Raretés boutique « business card » — 5 niveaux (JPY uniquement dans cette phase). */
export type PlayerCardStoreRarity = 'COMMON' | 'RARE' | 'ELITE' | 'EPIC' | 'LEGENDARY'

/** Style de carte équipé / inventaire (aligné profil premium + mock store). */
export interface UserCardStyle {
  storeItemId: string
  rarity: PlayerCardStoreRarity
  name: string
  imageUrl: string
  cssEffect?: string
  isEquipped: boolean
  unlockedAt: string
}

export interface PlayerCardStoreItem {
  id: string
  name: string
  description: string
  /** Prix affiché et débité en mock local (JPY). */
  priceJpy: number
  imageUrl: string
  rarity: PlayerCardStoreRarity
}

export const PLAYER_CARD_STORAGE_INVENTORY = 'omjep-player-cards-inventory-v1'
export const PLAYER_CARD_STORAGE_ACTIVE = 'omjep-player-card-active-v1'
export const PLAYER_CARD_STORAGE_JPY_BALANCE = 'omjep-player-cards-jpy-balance-v1'
export const PLAYER_CARD_STARTING_JPY_BALANCE = 12_000

export const PLAYER_CARD_STORE_CHANGED = 'omjep-player-cards-changed'

export const playerCardRarityLabel: Record<PlayerCardStoreRarity, string> = {
  COMMON: 'Commun',
  RARE: 'Rare',
  ELITE: 'Élite',
  EPIC: 'Épique',
  LEGENDARY: 'Légendaire',
}

/** Gold réservé aux paliers premium EPIC / LEGENDARY (OMJEP). */
export const isGoldTierRarity = (r: PlayerCardStoreRarity): r is 'EPIC' | 'LEGENDARY' =>
  r === 'EPIC' || r === 'LEGENDARY'

/** Halo / bordure carte preview & grille store (tokens OMJEP). */
export const playerCardRarityFrameClass: Record<PlayerCardStoreRarity, string> = {
  COMMON:
    'border-omjep-border bg-omjep-bg-elevated shadow-[var(--omjep-shadow-sm)] ring-1 ring-omjep-border/80',
  RARE:
    'border-omjep-mauve/40 bg-omjep-bg-elevated shadow-[var(--omjep-shadow-md)] ring-1 ring-omjep-mauve/25',
  ELITE:
    'border-omjep-cobalt/45 bg-omjep-bg-elevated shadow-[var(--omjep-shadow-md)] ring-1 ring-omjep-cobalt/30',
  EPIC:
    'border-omjep-border-gold/55 bg-omjep-bg-elevated shadow-[var(--omjep-shadow-lg),0_0_36px_-10px_color-mix(in_srgb,var(--omjep-gold)_28%,transparent)] ring-2 ring-omjep-border-gold/35',
  LEGENDARY:
    'border-omjep-border-gold/70 bg-omjep-bg-elevated shadow-[var(--omjep-shadow-lg),0_0_48px_-8px_color-mix(in_srgb,var(--omjep-gold)_40%,transparent),0_0_80px_-20px_color-mix(in_srgb,var(--omjep-mauve)_25%,transparent)] ring-2 ring-omjep-border-gold/50',
}

export const playerCardRarityBadgeClass: Record<PlayerCardStoreRarity, string> = {
  COMMON: 'border-omjep-border bg-omjep-bg-panel-soft text-omjep-text-secondary',
  RARE: 'border-omjep-mauve/40 bg-omjep-mauve/12 text-omjep-mauve',
  ELITE: 'border-omjep-cobalt/40 bg-omjep-cobalt/12 text-omjep-text-primary',
  EPIC: 'border-omjep-border-gold/50 bg-omjep-gold/14 text-omjep-gold',
  LEGENDARY:
    'border-omjep-border-gold/60 bg-[color-mix(in_srgb,var(--omjep-gold)_18%,var(--omjep-bg-panel))] text-omjep-gold shadow-[0_0_20px_color-mix(in_srgb,var(--omjep-gold)_22%,transparent)]',
}

/** Grille store : fond carte par rareté (dégradé discret). */
export const playerCardStoreTileBg: Record<PlayerCardStoreRarity, string> = {
  COMMON: 'from-omjep-bg-panel-soft/90 to-omjep-bg-elevated',
  RARE: 'from-omjep-mauve/12 to-omjep-bg-elevated',
  ELITE: 'from-omjep-cobalt/14 to-omjep-bg-elevated',
  EPIC: 'from-omjep-gold/16 to-omjep-bg-elevated',
  LEGENDARY: 'from-omjep-gold/22 via-omjep-mauve/10 to-omjep-bg-elevated',
}

export const PLAYER_CARD_MOCK_CATALOG: PlayerCardStoreItem[] = [
  {
    id: 'pc-carbon-common',
    name: 'Carbon Standard',
    description: 'Carte sobre, lisible partout. Idéal pour commencer en OMJEP.',
    priceJpy: 890,
    imageUrl: '/assets/card-shell-non-rare.svg',
    rarity: 'COMMON',
  },
  {
    id: 'pc-velocity-rare',
    name: 'Velocity Rare',
    description: 'Accents mauve et relief léger pour se démarquer en club.',
    priceJpy: 1490,
    imageUrl: '/assets/card-shell-non-rare.svg',
    rarity: 'RARE',
  },
  {
    id: 'pc-titan-elite',
    name: 'Titan Élite',
    description: 'Finition cobalt, bordures renforcées, présence « roster pro ».',
    priceJpy: 2990,
    imageUrl: '/assets/card-shell-non-rare.svg',
    rarity: 'ELITE',
  },
  {
    id: 'pc-apex-epic',
    name: 'Apex Épique',
    description: 'Halo or mesuré et profondeur renforcée — réservé aux cadres.',
    priceJpy: 5890,
    imageUrl: '/assets/card-shell-non-rare.svg',
    rarity: 'EPIC',
  },
  {
    id: 'pc-mythic-legendary',
    name: 'Mythic Légendaire',
    description: 'Sommet de la gamme : double halo, contraste maximal, effet signature.',
    priceJpy: 9990,
    imageUrl: '/assets/card-shell-non-rare.svg',
    rarity: 'LEGENDARY',
  },
]

function readInventoryIds(): string[] {
  try {
    const raw = localStorage.getItem(PLAYER_CARD_STORAGE_INVENTORY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function writeInventoryIds(ids: string[]) {
  localStorage.setItem(PLAYER_CARD_STORAGE_INVENTORY, JSON.stringify(ids))
}

function readActiveId(): string | null {
  return localStorage.getItem(PLAYER_CARD_STORAGE_ACTIVE)
}

function writeActiveId(id: string) {
  localStorage.setItem(PLAYER_CARD_STORAGE_ACTIVE, id)
}

function readJpyBalanceRaw(): number | null {
  const raw = localStorage.getItem(PLAYER_CARD_STORAGE_JPY_BALANCE)
  if (!raw) return null
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.floor(parsed)
}

function writeJpyBalance(balance: number) {
  localStorage.setItem(PLAYER_CARD_STORAGE_JPY_BALANCE, String(Math.max(0, Math.floor(balance))))
}

export function ensurePlayerCardJpyBalance(): number {
  const existing = readJpyBalanceRaw()
  if (existing !== null) return existing
  writeJpyBalance(PLAYER_CARD_STARTING_JPY_BALANCE)
  return PLAYER_CARD_STARTING_JPY_BALANCE
}

export function getPlayerCardJpyBalance(): number {
  return ensurePlayerCardJpyBalance()
}

/**
 * Première visite : inventaire de démo aligné sur le mock profil premium (COMMON, RARE, ELITE + ELITE actif).
 * Sinon ne modifie pas les données déjà présentes en localStorage.
 */
export function seedPlayerCardMockIfEmpty(): { inventory: string[]; activeId: string | null } {
  ensurePlayerCardJpyBalance()
  let inv = readInventoryIds()
  let active = readActiveId()
  if (inv.length === 0 && !active) {
    inv = ['pc-carbon-common', 'pc-velocity-rare', 'pc-titan-elite']
    active = 'pc-titan-elite'
    writeInventoryIds(inv)
    writeActiveId(active)
  }
  if (active && !inv.includes(active)) {
    active = inv[0] ?? null
    if (active) writeActiveId(active)
  }
  return { inventory: inv, activeId: active }
}

export function dispatchPlayerCardStoreChanged() {
  window.dispatchEvent(new CustomEvent(PLAYER_CARD_STORE_CHANGED))
}

export function buyPlayerCardMock(itemId: string, priceJpy: number, currentJpy: number): boolean {
  const wallet = ensurePlayerCardJpyBalance()
  const sourceBalance = Math.min(wallet, Math.max(0, Math.floor(currentJpy)))
  if (sourceBalance < priceJpy) return false
  const inv = readInventoryIds()
  if (inv.includes(itemId)) return false
  writeInventoryIds([...inv, itemId])
  writeJpyBalance(sourceBalance - priceJpy)
  dispatchPlayerCardStoreChanged()
  return true
}

export function activatePlayerCardMock(itemId: string): boolean {
  const inv = readInventoryIds()
  if (!inv.includes(itemId)) return false
  writeActiveId(itemId)
  dispatchPlayerCardStoreChanged()
  return true
}

export function toUserCardStyle(item: PlayerCardStoreItem, equipped: boolean): UserCardStyle {
  return {
    storeItemId: item.id,
    rarity: item.rarity,
    name: item.name,
    imageUrl: item.imageUrl,
    isEquipped: equipped,
    unlockedAt: new Date().toISOString(),
  }
}

/** Carte actuellement équipée côté mock (profil classique). */
export function resolveEquippedPlayerCardFromMock(): UserCardStyle | undefined {
  const { inventory, activeId } = seedPlayerCardMockIfEmpty()
  if (!activeId) return undefined
  const item = PLAYER_CARD_MOCK_CATALOG.find((c) => c.id === activeId)
  if (!item || !inventory.includes(item.id)) return undefined
  return toUserCardStyle(item, true)
}

export function readPlayerCardStoreState(): {
  inventoryIds: string[]
  activeId: string | null
  jpyBalance: number
} {
  const { inventory, activeId } = seedPlayerCardMockIfEmpty()
  return {
    inventoryIds: inventory,
    activeId,
    jpyBalance: getPlayerCardJpyBalance(),
  }
}
