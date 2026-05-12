export interface EAClubMatchPlayer {
  personaName: string
  platform?: string
  rating?: number
  goals?: number
  assists?: number
  saves?: number
  cleanSheet?: boolean
  position?: string
  raw: unknown
}

export interface EAClubRecentMatch {
  providerMatchId: string
  timestamp: string
  homeClubId?: string
  awayClubId?: string
  homeClubName?: string
  awayClubName?: string
  homeScore?: number
  awayScore?: number
  players?: EAClubMatchPlayer[]
  raw: unknown
}

export interface EAClubsProviderGetRecentInput {
  eaClubId: string
  platform: string
}

/** Abstraction EA Clubs / proclubs.io — aucun credential utilisateur. */
export interface EAClubsProvider {
  getRecentMatches(input: EAClubsProviderGetRecentInput): Promise<EAClubRecentMatch[]>
}
