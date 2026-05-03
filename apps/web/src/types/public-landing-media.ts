/** Réponse `GET /api/v1/public/landing-media` — fusionnée côté UI avec `PALMARES_DATA`. */
export interface PalmaresCompetitionMediaEntry {
  trophyImageUrl: string | null
  cardImageUrl: string | null
}

export interface PalmaresChampionMediaEntry {
  badgeImageUrl: string | null
}

export interface PublicLandingMediaPayload {
  palmaresHeroVisualUrl: string | null
  palmaresCompetitionsMedia: Record<string, PalmaresCompetitionMediaEntry>
  palmaresChampionsMedia: Record<string, PalmaresChampionMediaEntry>
}
