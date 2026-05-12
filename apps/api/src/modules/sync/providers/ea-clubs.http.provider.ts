import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import type {
  EAClubsProvider,
  EAClubsProviderGetRecentInput,
  EAClubRecentMatch,
} from './ea-clubs.types'

const DEFAULT_TIMEOUT_MS = 8_000
const CACHE_TTL_MS = 45_000

type CacheEntry = { at: number; data: EAClubRecentMatch[] }

/**
 * Client HTTP optionnel vers un agrégateur interne (URL à configurer).
 * Contrat JSON attendu : { "matches": EAClubRecentMatch[] } ou tableau racine.
 * Aucune donnée inventée : en cas d’erreur / schéma inconnu → [].
 */
@Injectable()
export class EaClubsHttpProvider implements EAClubsProvider {
  private readonly logger = new Logger(EaClubsHttpProvider.name)
  private readonly cache = new Map<string, CacheEntry>()

  constructor(private readonly http: HttpService) {}

  private cacheKey(input: EAClubsProviderGetRecentInput) {
    return `${input.eaClubId}:${input.platform}`
  }

  async getRecentMatches(input: EAClubsProviderGetRecentInput): Promise<EAClubRecentMatch[]> {
    const base = process.env.EA_CLUBS_RECENT_MATCHES_URL?.trim()
    if (!base) {
      this.logger.warn('[EA_HTTP] EA_CLUBS_RECENT_MATCHES_URL non défini → []')
      return []
    }

    const ck = this.cacheKey(input)
    const hit = this.cache.get(ck)
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      return hit.data
    }

    const url = base
      .replace('{eaClubId}', encodeURIComponent(input.eaClubId))
      .replace('{platform}', encodeURIComponent(input.platform))

    try {
      const res = await firstValueFrom(
        this.http.get<unknown>(url, {
          timeout: Number(process.env.EA_CLUBS_HTTP_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
          validateStatus: () => true,
        }),
      )

      if (res.status < 200 || res.status >= 300) {
        this.logger.warn(`[EA_HTTP] ${url} → status ${res.status}`)
        return []
      }

      const parsed = this.parseBody(res.data)
      this.cache.set(ck, { at: Date.now(), data: parsed })
      return parsed
    } catch (e) {
      this.logger.warn(`[EA_HTTP] ${url} failed: ${(e as Error).message}`)
      return []
    }
  }

  private parseBody(body: unknown): EAClubRecentMatch[] {
    if (body == null) return []
    let raw: unknown[] = []
    if (Array.isArray(body)) raw = body
    else if (typeof body === 'object' && body !== null && 'matches' in body) {
      const m = (body as { matches: unknown }).matches
      if (Array.isArray(m)) raw = m
    }
    const out: EAClubRecentMatch[] = []
    for (const row of raw) {
      if (typeof row !== 'object' || row === null) continue
      const o = row as Record<string, unknown>
      const providerMatchId = String(o.providerMatchId ?? o.id ?? '').trim()
      const timestamp = String(o.timestamp ?? o.playedAt ?? o.date ?? '').trim()
      if (!providerMatchId || !timestamp) continue
      out.push({
        providerMatchId,
        timestamp,
        homeClubId: o.homeClubId != null ? String(o.homeClubId) : undefined,
        awayClubId: o.awayClubId != null ? String(o.awayClubId) : undefined,
        homeClubName: o.homeClubName != null ? String(o.homeClubName) : undefined,
        awayClubName: o.awayClubName != null ? String(o.awayClubName) : undefined,
        homeScore: typeof o.homeScore === 'number' ? o.homeScore : undefined,
        awayScore: typeof o.awayScore === 'number' ? o.awayScore : undefined,
        players: Array.isArray(o.players) ? this.parsePlayers(o.players) : undefined,
        raw: row,
      })
    }
    return out
  }

  private parsePlayers(arr: unknown[]): EAClubRecentMatch['players'] {
    const players: NonNullable<EAClubRecentMatch['players']> = []
    for (const p of arr) {
      if (typeof p !== 'object' || p === null) continue
      const o = p as Record<string, unknown>
      const personaName = String(o.personaName ?? o.name ?? '').trim()
      if (!personaName) continue
      players.push({
        personaName,
        platform: o.platform != null ? String(o.platform) : undefined,
        rating: typeof o.rating === 'number' ? o.rating : undefined,
        goals: typeof o.goals === 'number' ? o.goals : undefined,
        assists: typeof o.assists === 'number' ? o.assists : undefined,
        saves: typeof o.saves === 'number' ? o.saves : undefined,
        cleanSheet: typeof o.cleanSheet === 'boolean' ? o.cleanSheet : undefined,
        position: o.position != null ? String(o.position) : undefined,
        raw: p,
      })
    }
    return players
  }
}
