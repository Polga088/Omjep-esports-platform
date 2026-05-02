import api from '@/lib/api'
import type { PlayerCardStoreRarity, UserCardStyle } from '@/features/store/models/playerCardStore.model'

export type { UserCardStyle }

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
    cleanSheets?: number
  }
  cardStylesInventory: UserCardStyle[]
  /** false / undefined = callout synchronisation proclub.io côté UI */
  proClubIoSynced?: boolean
  vipActive?: boolean
  streamingProfile?: {
    youtubeChannel: string
    kickChannel: string
    discordCommunity: string
    mainStreamUrl: string
    latestVideoLabel: string
    latestLiveLabel: string
  }
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
    cleanSheets: 41,
  },
  proClubIoSynced: false,
  vipActive: true,
  streamingProfile: {
    youtubeChannel: 'https://youtube.com/@omjep-showcase',
    kickChannel: 'https://kick.com/omjep',
    discordCommunity: 'https://discord.gg/omjep',
    mainStreamUrl: 'https://twitch.tv/omjep',
    latestVideoLabel: 'Highlights OMJEP — Pro Clubs Semaine 12',
    latestLiveLabel: 'Mercato Live — samedi 21h',
  },
  cardStylesInventory: [
    {
      storeItemId: 'pc-carbon-common',
      rarity: 'COMMON',
      name: 'Carbon Standard',
      imageUrl: '/assets/card-shell-non-rare.svg',
      cssEffect: 'glimmer-bronze',
      isEquipped: false,
      unlockedAt: '2026-04-10T10:30:00.000Z',
    },
    {
      storeItemId: 'pc-velocity-rare',
      rarity: 'RARE',
      name: 'Velocity Rare',
      imageUrl: '/assets/card-shell-non-rare.svg',
      cssEffect: 'shine-silver',
      isEquipped: false,
      unlockedAt: '2026-04-14T11:45:00.000Z',
    },
    {
      storeItemId: 'pc-titan-elite',
      rarity: 'ELITE',
      name: 'Titan Élite',
      imageUrl: '/assets/card-shell-non-rare.svg',
      cssEffect: 'aura-gold',
      isEquipped: true,
      unlockedAt: '2026-04-22T19:05:00.000Z',
    },
  ],
}

/** Mappe rareté carte → aura avatar (inclut anciennes valeurs API mock BRONZE/SILVER/GOLD). */
export const mapCardRarityToIdentityRarity = (
  rarity: PlayerCardStoreRarity | 'BRONZE' | 'SILVER' | 'GOLD',
): 'common' | 'premium' | 'legendary' => {
  if (rarity === 'LEGENDARY' || rarity === 'EPIC' || rarity === 'GOLD') return 'legendary'
  if (rarity === 'ELITE' || rarity === 'RARE' || rarity === 'SILVER') return 'premium'
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
