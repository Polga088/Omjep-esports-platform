/** Sync automatique matchs / stats EA Clubs (feature flag global). */
export function isEaClubsSyncEnabled(): boolean {
  const v = process.env.EA_CLUBS_SYNC_ENABLED
  return v === '1' || String(v).toLowerCase() === 'true'
}

/**
 * Quand false : pas d’appels HTTP planifiés vers proclubs.io (SyncService, EaStatsService cron),
 * ni scrape ProClubs côté `ProClubsService` / sync manuelle exposée (beta silencieuse).
 */
export const EXTERNAL_EA_PROCLUBS_SYNC_DISABLED_MESSAGE =
  'Synchronisation désactivée pendant la beta.'

export const EA_CLUBS_PROVIDER = 'EA_CLUBS' as const

export const MATCH_SYNC_STATUS = {
  PENDING: 'pending',
  SYNCED: 'synced',
  FAILED: 'failed',
  MANUAL_REVIEW: 'manual_review',
  SKIPPED_MISSING_LINKS: 'skipped_missing_external_links',
} as const
