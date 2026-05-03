import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@api/prisma/prisma.service'
import type { Prisma } from '@omjep/database'

export const LANDING_MEDIA_SINGLETON_ID = 'default'

export const COMPETITION_MEDIA_KEYS = ['ligue-elite', 'coupe-trone', 'ucl'] as const
export const CHAMPION_MEDIA_KEYS = ['atlas-wolves', 'rabat-united', 'casablanca-kings'] as const

export type CompetitionMediaKey = (typeof COMPETITION_MEDIA_KEYS)[number]
export type ChampionMediaKey = (typeof CHAMPION_MEDIA_KEYS)[number]

export interface CompetitionMediaEntry {
  trophyImageUrl: string | null
  cardImageUrl: string | null
}

export interface ChampionMediaEntry {
  badgeImageUrl: string | null
}

export interface PublicLandingMediaPayload {
  palmaresHeroVisualUrl: string | null
  palmaresCompetitionsMedia: Record<string, CompetitionMediaEntry>
  palmaresChampionsMedia: Record<string, ChampionMediaEntry>
}

function readJsonObject(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function pickString(v: unknown): string | null {
  if (typeof v !== 'string' || v.trim().length === 0) return null
  return v.trim().slice(0, 2048)
}

@Injectable()
export class LandingContentService {
  constructor(private readonly prisma: PrismaService) {}

  private emptyCompetitions(): Record<CompetitionMediaKey, CompetitionMediaEntry> {
    const out = {} as Record<CompetitionMediaKey, CompetitionMediaEntry>
    for (const k of COMPETITION_MEDIA_KEYS) {
      out[k] = { trophyImageUrl: null, cardImageUrl: null }
    }
    return out
  }

  private emptyChampions(): Record<ChampionMediaKey, ChampionMediaEntry> {
    const out = {} as Record<ChampionMediaKey, ChampionMediaEntry>
    for (const k of CHAMPION_MEDIA_KEYS) {
      out[k] = { badgeImageUrl: null }
    }
    return out
  }

  private parseCompetitionsMedia(raw: Prisma.JsonValue | null | undefined): Record<string, CompetitionMediaEntry> {
    const base = this.emptyCompetitions()
    const obj = readJsonObject(raw)
    for (const key of COMPETITION_MEDIA_KEYS) {
      const block = obj[key]
      if (!block || typeof block !== 'object' || Array.isArray(block)) continue
      const b = block as Record<string, unknown>
      base[key] = {
        trophyImageUrl: pickString(b.trophyImageUrl),
        cardImageUrl: pickString(b.cardImageUrl),
      }
    }
    return base
  }

  private parseChampionsMedia(raw: Prisma.JsonValue | null | undefined): Record<string, ChampionMediaEntry> {
    const base = this.emptyChampions()
    const obj = readJsonObject(raw)
    for (const key of CHAMPION_MEDIA_KEYS) {
      const block = obj[key]
      if (!block || typeof block !== 'object' || Array.isArray(block)) continue
      const b = block as Record<string, unknown>
      base[key] = { badgeImageUrl: pickString(b.badgeImageUrl) }
    }
    return base
  }

  async getPublicPayload(): Promise<PublicLandingMediaPayload> {
    const row = await this.prisma.publicLandingContent.findUnique({
      where: { id: LANDING_MEDIA_SINGLETON_ID },
    })
    if (!row) {
      return {
        palmaresHeroVisualUrl: null,
        palmaresCompetitionsMedia: this.emptyCompetitions(),
        palmaresChampionsMedia: this.emptyChampions(),
      }
    }
    return {
      palmaresHeroVisualUrl: row.palmaresHeroVisualUrl,
      palmaresCompetitionsMedia: this.parseCompetitionsMedia(row.palmaresCompetitionsMedia),
      palmaresChampionsMedia: this.parseChampionsMedia(row.palmaresChampionsMedia),
    }
  }

  async getAdminRecord() {
    const row = await this.prisma.publicLandingContent.findUnique({
      where: { id: LANDING_MEDIA_SINGLETON_ID },
    })
    if (!row) throw new NotFoundException('Landing media non initialisé')
    return row
  }

  async patch(dto: {
    palmaresHeroVisualUrl?: string | null
    palmaresCompetitionsMedia?: Record<string, unknown>
    palmaresChampionsMedia?: Record<string, unknown>
  }) {
    const existing = await this.prisma.publicLandingContent.findUnique({
      where: { id: LANDING_MEDIA_SINGLETON_ID },
    })
    if (!existing) throw new NotFoundException('Landing media non initialisé')

    const nextHero =
      dto.palmaresHeroVisualUrl === undefined
        ? existing.palmaresHeroVisualUrl
        : dto.palmaresHeroVisualUrl === null || dto.palmaresHeroVisualUrl === ''
          ? null
          : dto.palmaresHeroVisualUrl.trim().slice(0, 2048)

    let nextComp = readJsonObject(existing.palmaresCompetitionsMedia)
    if (dto.palmaresCompetitionsMedia) {
      nextComp = { ...nextComp }
      for (const key of COMPETITION_MEDIA_KEYS) {
        const patch = dto.palmaresCompetitionsMedia[key]
        if (!patch || typeof patch !== 'object' || Array.isArray(patch)) continue
        const cur = (nextComp[key] as Record<string, unknown> | undefined) ?? {}
        const p = patch as Record<string, unknown>
        const merged: Record<string, unknown> = { ...cur }
        if ('trophyImageUrl' in p) merged.trophyImageUrl = p.trophyImageUrl === null ? null : pickString(p.trophyImageUrl)
        if ('cardImageUrl' in p) merged.cardImageUrl = p.cardImageUrl === null ? null : pickString(p.cardImageUrl)
        nextComp[key] = merged
      }
    }

    let nextChamp = readJsonObject(existing.palmaresChampionsMedia)
    if (dto.palmaresChampionsMedia) {
      nextChamp = { ...nextChamp }
      for (const key of CHAMPION_MEDIA_KEYS) {
        const patch = dto.palmaresChampionsMedia[key]
        if (!patch || typeof patch !== 'object' || Array.isArray(patch)) continue
        const cur = (nextChamp[key] as Record<string, unknown> | undefined) ?? {}
        const p = patch as Record<string, unknown>
        const merged: Record<string, unknown> = { ...cur }
        if ('badgeImageUrl' in p) merged.badgeImageUrl = p.badgeImageUrl === null ? null : pickString(p.badgeImageUrl)
        nextChamp[key] = merged
      }
    }

    return this.prisma.publicLandingContent.update({
      where: { id: LANDING_MEDIA_SINGLETON_ID },
      data: {
        palmaresHeroVisualUrl: nextHero,
        palmaresCompetitionsMedia: nextComp as Prisma.InputJsonValue,
        palmaresChampionsMedia: nextChamp as Prisma.InputJsonValue,
      },
    })
  }

  async setPalmaresHeroVisualUrl(url: string | null) {
    return this.patch({ palmaresHeroVisualUrl: url })
  }

  async setCompetitionMediaUrl(
    competitionKey: CompetitionMediaKey,
    field: 'trophyImageUrl' | 'cardImageUrl',
    url: string | null,
  ) {
    return this.patch({
      palmaresCompetitionsMedia: {
        [competitionKey]: { [field]: url },
      },
    })
  }

  async setChampionBadgeUrl(championKey: ChampionMediaKey, url: string | null) {
    return this.patch({
      palmaresChampionsMedia: {
        [championKey]: { badgeImageUrl: url },
      },
    })
  }
}
