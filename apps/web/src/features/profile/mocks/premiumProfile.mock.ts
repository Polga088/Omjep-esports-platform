import api from '@/lib/api'

export interface UserCardStyle {
  storeItemId: string
  rarity: 'BRONZE' | 'SILVER' | 'GOLD'
  name: string
  imageUrl: string
  cssEffect?: string
  isEquipped: boolean
  unlockedAt: string
}

export interface UserPremiumProfile {
  id: string
  username: string
  displayName: string
  age: number
  heightCm: number
  preferredFoot: 'RIGHT' | 'LEFT'
  nationality: string
  nationalityCode: string
  mainPosition: 'LW' | 'RW' | 'RM' | 'LM' | 'ST' | 'CAM'
  currentClub: {
    id: string
    name: string
    league: string
    logoUrl: string
  }
  attributes: {
    pace: number
    dribbling: number
    shooting: number
    passing: number
    defense: number
    physical: number
  }
  playStyles: Array<{
    id: string
    label: string
    icon: 'speed' | 'dribble' | 'finishing' | 'creation'
  }>
  performance: {
    bestRating: number
    matchesPlayed: number
    goals: number
    assists: number
    marketValue: number
  }
  cardStylesInventory: UserCardStyle[]
}

export const premiumProfileMock: UserPremiumProfile = {
  id: 'user-polga00088',
  username: 'polga00088',
  displayName: 'Ransford-Yeboah Königsdörffer',
  age: 24,
  heightCm: 189,
  preferredFoot: 'LEFT',
  nationality: 'Allemagne',
  nationalityCode: 'DE',
  mainPosition: 'LW',
  currentClub: {
    id: 'club-hamburger-sv',
    name: 'Hamburger SV',
    league: 'Bundesliga',
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/en/thumb/e/e7/Hamburger_SV_logo.svg/200px-Hamburger_SV_logo.svg.png',
  },
  attributes: {
    pace: 92,
    dribbling: 89,
    shooting: 84,
    passing: 78,
    defense: 45,
    physical: 81,
  },
  playStyles: [
    { id: 'speed-explosive', label: 'Vitesse explosive', icon: 'speed' },
    { id: 'dribble-agile', label: 'Dribbles agiles', icon: 'dribble' },
    { id: 'finishing-clinical', label: 'Finitions cliniques', icon: 'finishing' },
    { id: 'chance-creation', label: "Création d'occasions", icon: 'creation' },
  ],
  performance: {
    bestRating: 8.6,
    matchesPlayed: 124,
    goals: 38,
    assists: 27,
    marketValue: 18_500_000,
  },
  cardStylesInventory: [
    {
      storeItemId: 'card-style-bronze-ea-fc-26',
      rarity: 'BRONZE',
      name: 'Style Non Rare Bronze EA FC 26',
      imageUrl: '/assets/card-shell-non-rare.svg',
      cssEffect: 'glimmer-bronze',
      isEquipped: false,
      unlockedAt: '2026-04-10T10:30:00.000Z',
    },
    {
      storeItemId: 'card-style-silver-ea-fc-26',
      rarity: 'SILVER',
      name: 'Style Non Rare Argent EA FC 26',
      imageUrl: '/assets/card-shell-non-rare.svg',
      cssEffect: 'shine-silver',
      isEquipped: false,
      unlockedAt: '2026-04-14T11:45:00.000Z',
    },
    {
      storeItemId: 'card-style-gold-ea-fc-26',
      rarity: 'GOLD',
      name: 'Style Non Rare Or EA FC 26',
      imageUrl: '/assets/card-shell-non-rare.svg',
      cssEffect: 'aura-gold',
      isEquipped: true,
      unlockedAt: '2026-04-22T19:05:00.000Z',
    },
  ],
}

export const mapCardRarityToIdentityRarity = (
  rarity: UserCardStyle['rarity'],
): 'common' | 'premium' | 'legendary' => {
  if (rarity === 'GOLD') return 'legendary'
  if (rarity === 'SILVER') return 'premium'
  return 'common'
}

export const getEquippedCardStyle = (
  profile: UserPremiumProfile,
): UserCardStyle | undefined =>
  profile.cardStylesInventory.find((cardStyle) => cardStyle.isEquipped)

export const fetchMyPremiumProfile = async (): Promise<UserPremiumProfile> => {
  try {
    const { data } = await api.get<UserPremiumProfile>('/users/me/profile')
    if (data?.username) {
      return data
    }
  } catch {
    // fallback local mock
  }

  return premiumProfileMock
}
