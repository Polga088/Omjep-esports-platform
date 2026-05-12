import { useEffect, useMemo, useRef, useState } from 'react'
import { animate } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Swords,
  Trophy,
  Calendar,
  Repeat,
  ShoppingBag,
  Headphones,
  MapPin,
  Users,
} from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import api from '@/lib/api'
import LivePlayerCard from '@/components/LivePlayerCard'
import DashboardPageHeading from '@/components/dashboard/DashboardPageHeading'
import { CockpitCommandModules } from '@/components/dashboard/CockpitModules'

function xpForLevel(level: number) { return (level - 1) ** 2 * 100 }
function xpForNextLevel(level: number) { return level ** 2 * 100 }
function xpProgress(xp: number, level: number): number {
  const base = xpForLevel(level)
  const next = xpForNextLevel(level)
  if (next <= base) return 100
  return Math.min(100, Math.round(((xp - base) / (next - base)) * 100))
}

interface MemberSnapshot {
  userId: string
  displayName: string | null
  goals: number
  assists: number
  averageRating: number
}

interface TeamOverview {
  totals: { goals: number; assists: number; averageAmr: number }
  topScorer: MemberSnapshot | null
  mvp: MemberSnapshot | null
}

interface NewsEvent {
  id: string
  type: 'TRANSFER' | 'CONTRACT_RENEWAL' | 'TOURNAMENT_WIN' | 'SEASON_START' | 'RECORD_BROKEN' | 'OTHER'
  title: string
  description: string
  metadata: { playerName?: string; transferFee?: number; timestamp: string } | null
  created_at: string
}

interface ScheduleTeamBrief {
  id: string
  name: string
  logo_url: string | null
}

interface ScheduleMatch {
  id: string
  status: string
  round: string | null
  startTime: string | null
  played_at: string | null
  home_team_id: string
  away_team_id: string
  homeTeam: ScheduleTeamBrief
  awayTeam: ScheduleTeamBrief
  competition: { id: string; name: string; type: string } | null
  viewer_team_id: string | null
}

function scheduleKickoffLabel(m: ScheduleMatch): { date: string; time: string; tbd: boolean } {
  const raw = m.startTime ?? m.played_at
  if (!raw) {
    return { date: 'À planifier', time: '', tbd: true }
  }
  const d = new Date(raw)
  return {
    date: d.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }),
    time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    tbd: false,
  }
}

function scheduleKickoffMs(m: ScheduleMatch): number {
  const raw = m.startTime ?? m.played_at
  if (!raw) return Number.POSITIVE_INFINITY
  const t = new Date(raw).getTime()
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t
}

function useCountUp(target: number, decimals: number, enabled: boolean, delay = 0, duration = 1.4) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!enabled || !ref.current) return
    const el = ref.current
    el.textContent = decimals > 0 ? Number(0).toFixed(decimals) : '0'
    const ctrl = animate(0, target, {
      duration,
      delay,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = decimals > 0 ? v.toFixed(decimals) : String(Math.round(v))
      },
    })
    return () => ctrl.stop()
  }, [target, decimals, enabled, delay, duration])
  return ref
}

const COCKPIT_SHORTCUTS: { to: string; label: string; icon: typeof Users }[] = [
  { to: '/dashboard/team', label: 'Mon équipe', icon: Users },
  { to: '/dashboard/matches', label: 'Matchs', icon: Swords },
  { to: '/dashboard/transfers', label: 'Mercato', icon: Repeat },
  { to: '/dashboard/store', label: 'Boutique', icon: ShoppingBag },
  { to: '/dashboard/support', label: 'Support', icon: Headphones },
  { to: '/dashboard/leaderboard', label: 'Classement compétition', icon: Trophy },
]

export default function DashboardIndex() {
  const { user, patchUser } = useAuthStore()
  const [data, setData] = useState<TeamOverview | null>(null)
  const [news, setNews] = useState<NewsEvent[]>([])
  const [scheduleMatches, setScheduleMatches] = useState<ScheduleMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [overviewRes, meRes, newsRes, scheduleRes] = await Promise.allSettled([
          api.get<TeamOverview>('/teams/my-team/overview'),
          api.get<{
            omjepCoins?: number
            jepyCoins?: number
            isPremium?: boolean
            level?: number
            xp?: number
            avatarUrl?: string | null
            avatarRarity?: 'common' | 'premium' | 'legendary'
            activeBannerUrl?: string | null
            activeFrameUrl?: string | null
            activeJerseyId?: string | null
            teamPrimaryColor?: string
            teamSecondaryColor?: string
          }>('/auth/me'),
          api.get<NewsEvent[]>('/news/transfers?limit=5'),
          api.get<ScheduleMatch[]>('/matches/my-schedule'),
        ])
        if (!cancelled && overviewRes.status === 'fulfilled') setData(overviewRes.value.data)
        else if (!cancelled && overviewRes.status === 'rejected') {
          const status = (overviewRes.reason as { response?: { status?: number } })?.response?.status
          setError(status === 404 ? 'no-team' : 'generic')
        }
        if (!cancelled && meRes.status === 'fulfilled') {
          const d = meRes.value.data
          patchUser({
            omjepCoins: typeof d.omjepCoins === 'number' ? d.omjepCoins : undefined,
            jepyCoins: typeof d.jepyCoins === 'number' ? d.jepyCoins : undefined,
            isPremium: typeof d.isPremium === 'boolean' ? d.isPremium : undefined,
            level: typeof d.level === 'number' ? d.level : undefined,
            xp: typeof d.xp === 'number' ? d.xp : undefined,
            avatarUrl: d.avatarUrl ?? undefined,
            avatarRarity: d.avatarRarity,
            activeBannerUrl: d.activeBannerUrl ?? undefined,
            activeFrameUrl: d.activeFrameUrl ?? undefined,
            activeJerseyId: d.activeJerseyId ?? undefined,
            teamPrimaryColor: d.teamPrimaryColor,
            teamSecondaryColor: d.teamSecondaryColor,
          })
        }
        if (!cancelled && newsRes.status === 'fulfilled') setNews(newsRes.value.data)
        if (!cancelled && scheduleRes.status === 'fulfilled') {
          setScheduleMatches(Array.isArray(scheduleRes.value.data) ? scheduleRes.value.data : [])
        } else if (!cancelled) {
          setScheduleMatches([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [patchUser])

  const level = user?.level ?? 1
  const xp = user?.xp ?? 0
  const xpPct = xpProgress(xp, level)
  const oc = user?.omjepCoins ?? 0
  const jepy = user?.jepyCoins ?? 0

  const influenceRef = useCountUp(level, 0, !loading)
  const ocRef = useCountUp(oc, 0, !loading, 0.2)
  const jepyRef = useCountUp(jepy, 0, !loading, 0.25)

  const upcomingDisplay = useMemo(() => {
    const done = new Set(['PLAYED', 'VALIDATED'])
    const list = scheduleMatches.filter((m) => !done.has(m.status))
    list.sort((a, b) => scheduleKickoffMs(a) - scheduleKickoffMs(b))
    return list.slice(0, 3)
  }, [scheduleMatches])

  const roleLabel =
    user?.role === 'MANAGER' ? 'Manager' : user?.role === 'ADMIN' ? 'Admin' : 'Joueur'

  const nextMatch = upcomingDisplay[0] ?? null
  const latestNews = news[0] ?? null
  const hasClub = error !== 'no-team'
  const myClubName = useMemo(() => {
    const sample = scheduleMatches.find((m) => m.viewer_team_id)
    if (!sample || !sample.viewer_team_id) return null
    if (sample.viewer_team_id === sample.home_team_id) return sample.homeTeam?.name ?? null
    if (sample.viewer_team_id === sample.away_team_id) return sample.awayTeam?.name ?? null
    return null
  }, [scheduleMatches])

  const nextKickoff = nextMatch ? scheduleKickoffLabel(nextMatch) : null
  const nextOpponent = nextMatch
    ? nextMatch.viewer_team_id === nextMatch.home_team_id
      ? nextMatch.awayTeam
      : nextMatch.homeTeam
    : null
  const reservedOc = typeof (user as { reservedOc?: number } | null)?.reservedOc === 'number'
    ? (user as { reservedOc?: number }).reservedOc ?? 0
    : null
  const playerRarity = user?.avatarRarity ? user.avatarRarity.toUpperCase() : 'STANDARD'

  const priorities = [
    !hasClub
      ? {
          key: 'club',
          title: 'Club requis',
          text: 'Activez le cockpit complet en créant ou rejoignant un club.',
          ctaLabel: 'Créer ou rejoindre',
          ctaTo: '/dashboard/manager/club',
          icon: Users,
        }
      : null,
    nextMatch
      ? {
          key: 'next',
          title: 'Prochain rendez-vous',
          text: `${nextOpponent?.name ?? 'Adversaire à confirmer'} · ${nextKickoff?.date ?? 'À planifier'}${nextKickoff?.time ? ` ${nextKickoff.time}` : ''}`,
          ctaLabel: 'Ouvrir le calendrier',
          ctaTo: '/dashboard/schedule',
          icon: Calendar,
        }
      : {
          key: 'next-empty',
          title: 'Calendrier en attente',
          text: 'Aucune rencontre planifiée pour le moment. Consultez régulièrement les publications.',
          ctaLabel: 'Voir le calendrier',
          ctaTo: '/dashboard/schedule',
          icon: Calendar,
        },
    latestNews
      ? {
          key: 'news',
          title: 'Mercato live',
          text: latestNews.title,
          ctaLabel: 'Voir le flux',
          ctaTo: '/dashboard/transfers',
          icon: Repeat,
        }
      : {
          key: 'support',
          title: 'Canal support',
          text: 'Besoin d’assistance opérationnelle? Ouvrez un ticket support.',
          ctaLabel: 'Contacter le support',
          ctaTo: '/dashboard/support',
          icon: Headphones,
        },
  ].filter(Boolean) as {
    key: string
    title: string
    text: string
    ctaLabel: string
    ctaTo: string
    icon: typeof Users
  }[]

  return (
    <div className="cockpit-hub dashboard-phase3-home mx-auto h-full w-full max-w-[1640px] space-y-6 px-1 sm:px-0">
      <DashboardPageHeading
        eyebrow="Cockpit Overview"
        title="Cockpit"
        subtitle="Centre de commande — club, calendrier, économie et raccourcis"
        className="border-omjep-border/60 pb-4"
      />

      <section className="grid gap-4 lg:grid-cols-12" aria-label="Hero command panel">
        <div className="lg:col-span-7">
          {loading ? (
            <div className="omjep-surface-elevated h-[280px] animate-pulse border-omjep-border/70 bg-omjep-bg-panel-soft/80" />
          ) : (
            <div className="omjep-surface-elevated relative h-full overflow-hidden border-omjep-border/80 p-5 sm:p-6">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,color-mix(in_srgb,var(--omjep-mauve)_20%,transparent),transparent_58%),radial-gradient(ellipse_at_100%_100%,color-mix(in_srgb,var(--omjep-gold)_12%,transparent),transparent_62%)]" />
              <div className="relative grid h-full gap-5 lg:grid-cols-[1.2fr_1fr]">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user?.ea_persona_name ?? 'Joueur'}
                        className="h-14 w-14 rounded-xl border border-omjep-border/80 object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-omjep-border/80 bg-omjep-bg-panel-soft text-lg font-black text-omjep-text-primary">
                        {(user?.ea_persona_name ?? 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-omjep-text-muted">Identité joueur</p>
                      <p className="truncate font-heading text-xl font-black tracking-tight text-omjep-text-primary">
                        {user?.ea_persona_name ?? 'Joueur'}
                      </p>
                      <p className="mt-1 text-xs text-omjep-text-secondary">
                        Rôle: <span className="font-semibold text-omjep-text-primary">{roleLabel}</span>
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft/70 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-omjep-text-muted">Statut club</p>
                    {hasClub ? (
                      <>
                        <p className="mt-1 text-sm font-semibold text-omjep-text-primary">
                          {myClubName ? `Club actif: ${myClubName}` : 'Club actif détecté'}
                        </p>
                        <p className="mt-0.5 text-xs text-omjep-text-secondary">
                          Le centre de commande est synchronisé pour les modules équipe, matchs et économie.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="mt-1 text-sm font-semibold text-omjep-text-primary">Aucun club rattaché</p>
                        <p className="mt-0.5 text-xs text-omjep-text-secondary">
                          Créez ou rejoignez un club pour activer le cockpit complet.
                        </p>
                        <Link to="/dashboard/manager/club" className="omjep-btn-primary mt-3 inline-flex normal-case tracking-normal">
                          Créer ou rejoindre un club
                        </Link>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-omjep-border/70 bg-omjep-bg-panel-soft/65 px-2.5 py-2">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-omjep-text-muted">Niveau</p>
                      <p className="mt-0.5 font-mono text-lg font-black text-omjep-text-primary">
                        <span ref={influenceRef} />
                      </p>
                    </div>
                    <div className="rounded-lg border border-omjep-border/70 bg-omjep-bg-panel-soft/65 px-2.5 py-2">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-omjep-text-muted">Buts club</p>
                      <p className="mt-0.5 font-mono text-lg font-black text-omjep-text-primary">{data?.totals.goals ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-omjep-border/70 bg-omjep-bg-panel-soft/65 px-2.5 py-2">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-omjep-text-muted">AMR</p>
                      <p className="mt-0.5 font-mono text-lg font-black text-omjep-mauve">
                        {Number(data?.totals.averageAmr ?? 0).toFixed(1)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-xl border border-omjep-border/75 bg-omjep-bg-panel-soft/70 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-omjep-text-muted">Portefeuille</p>
                      <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-300">
                        SYS-STABLE
                      </span>
                    </div>
                    <div className="mt-3 space-y-2.5">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-omjep-text-muted">OC</p>
                        <p className="font-mono text-2xl font-black text-omjep-text-primary">
                          <span ref={ocRef} />
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-omjep-text-muted">Jepy</p>
                        <p className="font-mono text-xl font-black text-omjep-mauve">
                          <span ref={jepyRef} />
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-omjep-border/75 bg-omjep-bg-panel-soft/70 p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-omjep-text-muted">Carte joueur</p>
                    <div className="mt-2 min-h-[170px] overflow-hidden rounded-lg border border-omjep-border/60">
                      <LivePlayerCard user={user} embedded />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-5">
          {loading ? (
            <div className="omjep-surface-card h-[280px] animate-pulse border-omjep-border/70 bg-omjep-bg-panel-soft/80" />
          ) : (
            <div className="omjep-surface-card h-full p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-omjep-text-muted">Prochain rendez-vous</p>
                  <p className="mt-1 font-heading text-lg font-black text-omjep-text-primary">Season pulse</p>
                </div>
                <Link to="/dashboard/schedule" className="omjep-btn-secondary px-3 py-2 text-[10px] normal-case tracking-normal">
                  Calendrier
                </Link>
              </div>

              {!nextMatch || !nextKickoff ? (
                <div className="flex h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-omjep-border/80 bg-omjep-bg-panel-soft/55 px-4 text-center">
                  <Calendar className="mb-2 h-8 w-8 text-omjep-gold/80" aria-hidden />
                  <p className="text-sm font-semibold text-omjep-text-primary">Aucune rencontre planifiée</p>
                  <p className="mt-1 max-w-sm text-xs text-omjep-text-secondary">
                    Le calendrier de la saison n’a pas encore publié votre prochain match.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border border-omjep-border/80 bg-omjep-bg-panel-soft/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-md border border-omjep-border-gold/35 bg-omjep-gold/[0.08] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-omjep-gold">
                      {nextMatch.competition?.name ?? 'Compétition'}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-omjep-text-muted">
                      {nextMatch.status}
                    </span>
                  </div>
                  <p className="font-heading text-2xl font-black tracking-tight text-omjep-text-primary">
                    {nextMatch.homeTeam.name} <span className="text-omjep-mauve">vs</span> {nextMatch.awayTeam.name}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <p className="inline-flex items-center gap-1.5 text-xs text-omjep-text-secondary">
                      <Calendar className="h-3.5 w-3.5 text-omjep-gold/85" />
                      {nextKickoff.date} {nextKickoff.time}
                    </p>
                    <p className="inline-flex items-center gap-1.5 text-xs text-omjep-text-secondary">
                      <MapPin className="h-3.5 w-3.5 text-omjep-gold/85" />
                      {nextMatch.viewer_team_id === nextMatch.home_team_id ? 'Domicile' : 'Extérieur'}
                    </p>
                  </div>
                  <Link to="/dashboard/schedule" className="omjep-btn-primary inline-flex normal-case tracking-normal">
                    Ouvrir le calendrier
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <nav aria-label="Raccourcis cockpit">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
          {COCKPIT_SHORTCUTS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="group rounded-xl border border-omjep-border bg-omjep-bg-panel-soft/70 p-3 transition hover:border-omjep-border-gold/45 hover:bg-omjep-bg-panel"
            >
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-omjep-text-primary">
                <Icon className="h-4 w-4 shrink-0 text-omjep-gold/85" aria-hidden />
                <span className="truncate">{label}</span>
              </p>
              <p className="mt-1 text-[11px] text-omjep-text-secondary">
                {to === '/dashboard/team' && 'Effectif et rôles'}
                {to === '/dashboard/matches' && 'Calendrier et résultats'}
                {to === '/dashboard/transfers' && 'Offres et budget'}
                {to === '/dashboard/store' && 'Objets et boosts'}
                {to === '/dashboard/support' && 'Tickets et assistance'}
                {to === '/dashboard/leaderboard' && 'Classement de saison'}
              </p>
            </Link>
          ))}
        </div>
      </nav>

      {error === 'generic' && !loading ? (
        <div className="omjep-surface-card mb-6 border-omjep-warning/35 bg-omjep-warning/10 px-4 py-3 text-sm text-omjep-text-primary">
          Certaines données du cockpit n’ont pas pu être chargées. Les widgets se mettront à jour au prochain
          chargement.
        </div>
      ) : null}

      <CockpitCommandModules
        loading={loading}
        user={user}
        dataTotals={data?.totals ?? null}
        scheduleMatchCount={scheduleMatches.length}
        news={news}
        nextMatch={nextMatch}
        nextKickoff={nextKickoff}
        nextOpponent={nextOpponent}
        myClubName={myClubName}
        hasClub={hasClub}
        roleLabel={roleLabel}
        level={level}
        xp={xp}
        xpPct={xpPct}
        oc={oc}
        jepy={jepy}
        reservedOc={reservedOc}
        playerRarityLabel={playerRarity}
        priorities={priorities}
      />
    </div>
  )
}
