import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '@api/prisma/prisma.service'
import { EaClubsProviderFactory } from './providers/ea-clubs-provider.factory'
import {
  EA_CLUBS_PROVIDER,
  isEaClubsSyncEnabled,
  MATCH_SYNC_STATUS,
} from './ea-clubs-sync.config'
import type { EAClubRecentMatch } from './providers/ea-clubs.types'
import { Prisma } from '@omjep/database'

const RATE_MS = 30_000
const lastRun = new Map<string, number>()

const SYNCABLE_MATCH_STATUSES = new Set([
  'SCHEDULED',
  'PENDING',
  'LIVE',
])

@Injectable()
export class MatchSyncService {
  private readonly logger = new Logger(MatchSyncService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly eaProviderFactory: EaClubsProviderFactory,
  ) {}

  private rateLimitKey(userId: string, matchId: string) {
    return `${userId}:${matchId}`
  }

  private assertRate(userId: string, matchId: string) {
    const k = this.rateLimitKey(userId, matchId)
    const t = lastRun.get(k) ?? 0
    const now = Date.now()
    if (now - t < RATE_MS) {
      throw new ForbiddenException(
        'Trop de tentatives de synchronisation. Réessayez dans une minute.',
      )
    }
    lastRun.set(k, now)
  }

  async getStatus(matchId: string, viewerUserId: string) {
    await this.assertViewer(matchId, viewerUserId, false)

    const row = await this.prisma.matchSync.findUnique({
      where: {
        matchId_provider: { matchId, provider: EA_CLUBS_PROVIDER },
      },
    })

    return {
      syncEnabled: isEaClubsSyncEnabled(),
      provider: EA_CLUBS_PROVIDER,
      status: row?.status ?? null,
      attempts: row?.attempts ?? 0,
      lastError: row?.lastError ?? null,
      syncedAt: row?.syncedAt ?? null,
      providerMatchId: row?.providerMatchId ?? null,
    }
  }

  private async assertViewer(matchId: string, viewerUserId: string, requireManager: boolean) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        home_team_id: true,
        away_team_id: true,
        homeTeam: { select: { manager_id: true } },
        awayTeam: { select: { manager_id: true } },
      },
    })
    if (!match) throw new NotFoundException('Match introuvable.')

    const user = await this.prisma.user.findUnique({
      where: { id: viewerUserId },
      select: { role: true },
    })
    if (user?.role === 'ADMIN') return match

    const memberships = await this.prisma.teamMember.findMany({
      where: {
        user_id: viewerUserId,
        team_id: { in: [match.home_team_id, match.away_team_id] },
      },
      select: { team_id: true, club_role: true },
    })
    if (memberships.length === 0) {
      throw new ForbiddenException('Accès refusé à ce match.')
    }

    if (!requireManager) return match

    const isAdminCap =
      match.homeTeam.manager_id === viewerUserId ||
      match.awayTeam.manager_id === viewerUserId
    const isStaff = memberships.some((m) =>
      ['FOUNDER', 'MANAGER', 'CO_MANAGER'].includes(m.club_role),
    )
    if (!isAdminCap && !isStaff) {
      throw new ForbiddenException('Seuls les dirigeants du club peuvent lancer la synchronisation.')
    }

    return match
  }

  private async resolveEaClub(teamId: string): Promise<{ eaClubId: string; platform: string } | null> {
    const link = await this.prisma.teamExternalLink.findUnique({
      where: {
        teamId_provider: { teamId, provider: EA_CLUBS_PROVIDER },
      },
    })
    if (link) {
      return { eaClubId: link.eaClubId.trim(), platform: link.platform.trim() }
    }
    const club = await this.prisma.club.findUnique({
      where: { id: teamId },
      select: { ea_club_id: true, platform: true },
    })
    if (club?.ea_club_id?.trim()) {
      return {
        eaClubId: club.ea_club_id.trim(),
        platform: String(club.platform ?? 'CROSSPLAY'),
      }
    }
    return null
  }

  /**
   * Synchronise score (+ stats externes) depuis le provider EA Clubs.
   * Ne supprime pas les rapports manuels existants ; met à jour le match si statut compatible.
   */
  async syncMatch(matchId: string, actorUserId: string) {
    if (!isEaClubsSyncEnabled()) {
      return {
        ok: false,
        code: 'sync_disabled',
        message:
          'La synchronisation automatique EA FC 26 est désactivée sur cet environnement. Utilisez la saisie manuelle.',
      }
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { role: true },
    })
    if (actor?.role !== 'ADMIN') {
      this.assertRate(actorUserId, matchId)
    }
    await this.assertViewer(matchId, actorUserId, true)

    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
      },
    })
    if (!match) throw new NotFoundException('Match introuvable.')

    if (!SYNCABLE_MATCH_STATUSES.has(match.status)) {
      await this.upsertSyncRow(matchId, {
        status: MATCH_SYNC_STATUS.MANUAL_REVIEW,
        lastError: 'Statut du match incompatible avec une sync automatique.',
        incrementAttempts: true,
      })
      return {
        ok: false,
        code: 'manual_review',
        message: 'Revue manuelle requise — le statut du match ne permet pas la sync auto.',
      }
    }

    const homeEa = await this.resolveEaClub(match.home_team_id)
    const awayEa = await this.resolveEaClub(match.away_team_id)

    if (!homeEa || !awayEa) {
      await this.upsertSyncRow(matchId, {
        status: MATCH_SYNC_STATUS.SKIPPED_MISSING_LINKS,
        lastError: !homeEa
          ? 'Club EA domicile non lié.'
          : 'Club EA extérieur non lié.',
        homeEaClubId: homeEa?.eaClubId ?? null,
        awayEaClubId: awayEa?.eaClubId ?? null,
        incrementAttempts: true,
      })
      return {
        ok: false,
        code: 'missing_links',
        message: !homeEa ? 'Club EA non lié (domicile).' : 'Adversaire EA non lié.',
      }
    }

    const provider = this.eaProviderFactory.create()
    let recent: EAClubRecentMatch[] = []
    try {
      recent = await provider.getRecentMatches({
        eaClubId: homeEa.eaClubId,
        platform: homeEa.platform,
      })
    } catch (e) {
      this.logger.warn(`[MatchSync] provider error: ${(e as Error).message}`)
      await this.upsertSyncRow(matchId, {
        status: MATCH_SYNC_STATUS.FAILED,
        lastError: 'Erreur lors de la récupération des matchs distants.',
        homeEaClubId: homeEa.eaClubId,
        awayEaClubId: awayEa.eaClubId,
        incrementAttempts: true,
      })
      return {
        ok: false,
        code: 'provider_error',
        message: 'Impossible de contacter la source EA. Réessayez plus tard ou saisissez le score manuellement.',
      }
    }

    const scheduled = match.startTime ?? match.played_at
    const candidate = this.pickBestMatch(recent, homeEa.eaClubId, awayEa.eaClubId, scheduled)

    if (!candidate) {
      await this.upsertSyncRow(matchId, {
        status: MATCH_SYNC_STATUS.FAILED,
        lastError: 'Aucun match récent correspondant.',
        homeEaClubId: homeEa.eaClubId,
        awayEaClubId: awayEa.eaClubId,
        rawPayload: { sampleSize: recent.length } as Prisma.InputJsonValue,
        incrementAttempts: true,
      })
      return {
        ok: false,
        code: 'no_match',
        message: 'Aucun match récent correspondant.',
      }
    }

    if (
      candidate.homeScore == null ||
      candidate.awayScore == null ||
      Number.isNaN(candidate.homeScore) ||
      Number.isNaN(candidate.awayScore)
    ) {
      await this.upsertSyncRow(matchId, {
        status: MATCH_SYNC_STATUS.MANUAL_REVIEW,
        lastError: 'Score incomplet côté EA.',
        providerMatchId: candidate.providerMatchId,
        homeEaClubId: homeEa.eaClubId,
        awayEaClubId: awayEa.eaClubId,
        rawPayload: candidate.raw as Prisma.InputJsonValue,
        incrementAttempts: true,
      })
      return {
        ok: false,
        code: 'manual_review',
        message: 'Revue manuelle requise — score EA incomplet.',
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.match.update({
        where: { id: matchId },
        data: {
          home_score: candidate.homeScore,
          away_score: candidate.awayScore,
          played_at: new Date(candidate.timestamp),
          status: 'PLAYED',
          ea_match_id: candidate.providerMatchId,
        },
      })

      await tx.matchSync.upsert({
        where: {
          matchId_provider: { matchId, provider: EA_CLUBS_PROVIDER },
        },
        create: {
          matchId,
          provider: EA_CLUBS_PROVIDER,
          providerMatchId: candidate.providerMatchId,
          homeEaClubId: homeEa.eaClubId,
          awayEaClubId: awayEa.eaClubId,
          status: MATCH_SYNC_STATUS.SYNCED,
          attempts: 1,
          rawPayload: candidate.raw as Prisma.InputJsonValue,
          syncedAt: new Date(),
        },
        update: {
          providerMatchId: candidate.providerMatchId,
          homeEaClubId: homeEa.eaClubId,
          awayEaClubId: awayEa.eaClubId,
          status: MATCH_SYNC_STATUS.SYNCED,
          attempts: { increment: 1 },
          lastError: null,
          rawPayload: candidate.raw as Prisma.InputJsonValue,
          syncedAt: new Date(),
        },
      })

      await tx.playerMatchExternalStat.deleteMany({
        where: { matchId, provider: EA_CLUBS_PROVIDER },
      })

      if (candidate.players?.length) {
        for (const pl of candidate.players) {
          const user = await tx.user.findFirst({
            where: {
              OR: [
                { ea_persona_name: { equals: pl.personaName.trim(), mode: 'insensitive' } },
                {
                  playerExternalLinks: {
                    some: {
                      provider: EA_CLUBS_PROVIDER,
                      personaName: { equals: pl.personaName.trim(), mode: 'insensitive' },
                    },
                  },
                },
              ],
            },
            select: { id: true },
          })
          await tx.playerMatchExternalStat.create({
            data: {
              matchId,
              userId: user?.id ?? null,
              provider: EA_CLUBS_PROVIDER,
              personaName: pl.personaName.trim(),
              rating: pl.rating ?? null,
              goals: pl.goals ?? null,
              assists: pl.assists ?? null,
              saves: pl.saves ?? null,
              cleanSheet: pl.cleanSheet ?? null,
              position: pl.position ?? null,
              rawPayload: pl.raw as Prisma.InputJsonValue,
            },
          })
        }
      }
    })

    this.logger.log(`[MatchSync] match ${matchId} synced from EA providerMatchId=${candidate.providerMatchId}`)

    return {
      ok: true,
      code: 'synced',
      message: 'Synchronisation réussie',
      homeScore: candidate.homeScore,
      awayScore: candidate.awayScore,
    }
  }

  private pickBestMatch(
    recent: EAClubRecentMatch[],
    homeEaId: string,
    awayEaId: string,
    scheduled: Date | null,
  ): EAClubRecentMatch | null {
    const h = homeEaId.trim()
    const a = awayEaId.trim()
    const windowMs = 3 * 60 * 60 * 1000
    const anchor = scheduled?.getTime() ?? Date.now()

    const scored = recent.filter(
      (m) => m.homeScore != null && m.awayScore != null && m.timestamp,
    )

    const fits = scored.filter((m) => {
      const hi = (m.homeClubId ?? '').trim()
      const ai = (m.awayClubId ?? '').trim()
      const direct = hi === h && ai === a
      const swap = hi === a && ai === h
      if (!direct && !swap) return false
      const t = Date.parse(m.timestamp)
      if (Number.isNaN(t)) return false
      return Math.abs(t - anchor) <= windowMs
    })

    if (fits.length === 0) return null
    fits.sort((x, y) => Math.abs(Date.parse(y.timestamp) - anchor) - Math.abs(Date.parse(x.timestamp) - anchor))
    return fits[0] ?? null
  }

  private async upsertSyncRow(
    matchId: string,
    patch: {
      status: string
      lastError?: string | null
      providerMatchId?: string | null
      homeEaClubId?: string | null
      awayEaClubId?: string | null
      rawPayload?: Prisma.InputJsonValue | null
      incrementAttempts?: boolean
    },
  ) {
    await this.prisma.matchSync.upsert({
      where: {
        matchId_provider: { matchId, provider: EA_CLUBS_PROVIDER },
      },
      create: {
        matchId,
        provider: EA_CLUBS_PROVIDER,
        status: patch.status,
        lastError: patch.lastError ?? null,
        providerMatchId: patch.providerMatchId ?? null,
        homeEaClubId: patch.homeEaClubId ?? null,
        awayEaClubId: patch.awayEaClubId ?? null,
        rawPayload: patch.rawPayload ?? undefined,
        attempts: patch.incrementAttempts ? 1 : 0,
      },
      update: {
        status: patch.status,
        lastError: patch.lastError ?? undefined,
        providerMatchId: patch.providerMatchId ?? undefined,
        homeEaClubId: patch.homeEaClubId ?? undefined,
        awayEaClubId: patch.awayEaClubId ?? undefined,
        rawPayload:
          patch.rawPayload === undefined
            ? undefined
            : patch.rawPayload === null
              ? Prisma.JsonNull
              : patch.rawPayload,
        attempts: patch.incrementAttempts ? { increment: 1 } : undefined,
      },
    })
  }

  async listProblematicForAdmin(statuses: string[] = ['failed', 'manual_review']) {
    return this.prisma.matchSync.findMany({
      where: { status: { in: statuses } },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: {
        match: {
          select: {
            id: true,
            status: true,
            home_score: true,
            away_score: true,
            homeTeam: { select: { name: true } },
            awayTeam: { select: { name: true } },
          },
        },
      },
    })
  }
}
