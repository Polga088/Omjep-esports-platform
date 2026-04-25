export interface StoreItem {
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

export const storeCardStyleItemsMock: StoreItem[] = [
  {
    id: 'card-style-bronze-ea-fc-26',
    type: 'CARD_STYLE',
    name: 'Style Non Rare Bronze EA FC 26',
    description:
      'Version bronze sobre et nerveuse inspirée du visuel Non Rare. Idéale pour un rendu élégant sans surbrillance agressive.',
    price: 200,
    imageUrl: '/assets/card-shell-non-rare.svg',
    rarity: 'BRONZE',
    metadata: {
      cssEffect: 'glimmer-bronze',
    },
  },
  {
    id: 'card-style-silver-ea-fc-26',
    type: 'CARD_STYLE',
    name: 'Style Non Rare Argent EA FC 26',
    description:
      'Habillage argent premium avec contours plus lumineux pour renforcer le contraste et la lisibilité des stats.',
    price: 300,
    imageUrl: '/assets/card-shell-non-rare.svg',
    rarity: 'SILVER',
    metadata: {
      cssEffect: 'shine-silver',
    },
  },
  {
    id: 'card-style-gold-ea-fc-26',
    type: 'CARD_STYLE',
    name: 'Style Non Rare Or EA FC 26',
    description:
      'Finition or signature avec reflet subtil et présence visuelle forte pour les profils premium.',
    price: 450,
    imageUrl: '/assets/card-shell-non-rare.svg',
    rarity: 'GOLD',
    metadata: {
      cssEffect: 'aura-gold',
    },
  },
]
