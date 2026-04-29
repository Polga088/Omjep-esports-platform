import { useEffect, useRef, useState } from 'react'
import { animate, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Crown,
  Swords,
  Star,
  Flame,
  Trophy,
  Coins,
  Newspaper,
  ArrowUpRight,
} from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import api from '@/lib/api'
import { formatCurrency } from '@/utils/formatCurrency'
import LivePlayerCard from '@/components/LivePlayerCard'
import { TechnicalDataValue } from '@/components/kimi/TechnicalDataValue'
import WidgetGrid from '@/components/cockpit/WidgetGrid'
import WidgetTile from '@/components/cockpit/WidgetTile'
import ContactZone from '@/components/cockpit/ContactZone'
import DashboardPageHeading from '@/components/dashboard/DashboardPageHeading'

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

function WidgetSkeleton() {
  return <div className="h-full w-full animate-pulse border border-omjep-border bg-omjep-bg-panel/55" />
}

export default function DashboardIndex() {
  const { user, patchUser } = useAuthStore()
  const [data, setData] = useState<TeamOverview | null>(null)
  const [news, setNews] = useState<NewsEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [overviewRes, meRes, newsRes] = await Promise.allSettled([
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
  const walletSegOc = Math.min(100, Math.round((Math.log10(oc + 10) / 5) * 100))
  const walletSegJ = Math.min(100, Math.round((Math.log10(jepy + 10) / 4.2) * 100))

  const influenceRef = useCountUp(level, 0, !loading)
  const ocRef = useCountUp(oc, 0, !loading, 0.2)
  const jepyRef = useCountUp(jepy, 0, !loading, 0.25)

  return (
    <div className="cockpit-hub dashboard-phase3-home mx-auto h-full w-full max-w-[1640px] px-1 sm:px-0">
      <DashboardPageHeading
        eyebrow="Cockpit Overview"
        title="Cockpit"
        subtitle="Vue d’ensemble de votre progression, portefeuille et activité live"
        className="mb-6 border-omjep-border/60 pb-5"
      />
      <WidgetGrid cols={12} rowHeight="minmax(250px, auto)">
        {/* INFLUENCE — XP + niveau */}
        <WidgetTile
          serial="MOD-INF-010"
          title="Influence"
          subtitle="Commandement & XP"
          span={4}
          rowSpan={2}
          controls={
            <Link
              to="/dashboard/gamification"
              className="contact-zone rounded-md border border-omjep-border bg-omjep-bg-panel/35 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-omjep-text-secondary hover:border-omjep-border-gold hover:bg-omjep-bg-panel-soft/45 hover:text-omjep-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omjep-border-gold"
            >
              XP+
            </Link>
          }
        >
          {loading ? (
            <WidgetSkeleton />
          ) : (
            <div className="flex h-full flex-col justify-between px-1 py-0.5 sm:px-1.5">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-omjep-text-secondary">Niveau</span>
                <Crown className="h-5 w-5 text-omjep-gold/85" aria-hidden />
              </div>
              <div className="my-2.5 flex flex-col items-start gap-1 sm:my-3 sm:flex-row sm:items-end sm:gap-2">
                <TechnicalDataValue accent="gold" symbolScale="lg" className="text-5xl sm:text-6xl">
                  <span ref={influenceRef} className="font-mono text-5xl font-bold text-omjep-text-primary sm:text-6xl" />
                </TechnicalDataValue>
                <span className="pb-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-omjep-text-muted sm:pb-2 sm:text-[12px]">Influence</span>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <div className="h-[2px] w-full bg-omjep-border">
                  <div className="h-[2px] bg-omjep-mauve" style={{ width: `${xpPct}%` }} />
                </div>
                <p className="text-right text-[10px] uppercase tracking-[0.18em] text-omjep-text-muted">Lvl {level}</p>
              </div>
            </div>
          )}
        </WidgetTile>

        {/* PLAYER FOCUS — centre (rowSpan 2) */}
        <WidgetTile
          serial="MOD-PRF-009"
          title="Joueur · Saison 2026"
          subtitle="Module Uplink"
          span={8}
          rowSpan={2}
          focus
          bodyClassName="!p-0"
        >
          {loading ? (
            <div className="flex h-full items-center justify-center p-6">
              <WidgetSkeleton />
            </div>
          ) : (
            <div className="h-full overflow-hidden">
              <LivePlayerCard user={user} embedded />
            </div>
          )}
        </WidgetTile>

        {/* WALLET — OC */}
        <WidgetTile
          serial="MOD-OC-020"
          title="Portefeuille OC"
          subtitle="Trésor"
          span={6}
          rowSpan={2}
          controls={
            <Link
              to="/dashboard/store"
              className="contact-zone rounded-md border border-omjep-border bg-omjep-bg-panel/35 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-omjep-text-secondary hover:border-omjep-border-gold hover:bg-omjep-bg-panel-soft/45 hover:text-omjep-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omjep-border-gold"
            >
              Spend
            </Link>
          }
        >
          {loading ? (
            <WidgetSkeleton />
          ) : (
            <div className="flex h-full flex-col justify-between px-1 py-0.5 sm:px-1.5">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-omjep-text-secondary">Portefeuille</span>
                <Coins className="h-5 w-5 text-omjep-gold/85" aria-hidden />
              </div>
              <div className="my-2.5 sm:my-3">
                <TechnicalDataValue accent="gold" symbolScale="md" className="text-5xl sm:text-6xl">
                  <span ref={ocRef} className="font-mono text-5xl font-bold text-omjep-text-primary sm:text-6xl" />
                </TechnicalDataValue>
                <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-omjep-text-muted sm:mt-2 sm:text-[12px]" aria-label={formatCurrency(oc, 'OC')}>
                  OC
                </p>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <div className="h-[2px] w-full bg-omjep-border">
                  <div className="h-[2px] bg-omjep-mauve" style={{ width: `${walletSegOc}%` }} />
                </div>
                <p className="text-right text-[10px] uppercase tracking-[0.18em] text-omjep-text-muted">{walletSegOc}%</p>
              </div>
            </div>
          )}
        </WidgetTile>

        {/* WALLET — Jepy */}
        <WidgetTile
          serial="MOD-JP-021"
          title="Réserve Jepy"
          subtitle="Energie sociale"
          span={6}
          rowSpan={2}
          controls={
            <Link
              to="/dashboard/predictions"
              className="contact-zone rounded-md border border-omjep-border bg-omjep-bg-panel/35 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-omjep-text-secondary hover:border-omjep-border-gold hover:bg-omjep-bg-panel-soft/45 hover:text-omjep-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omjep-border-gold"
            >
              Bet
            </Link>
          }
        >
          {loading ? (
            <WidgetSkeleton />
          ) : (
            <div className="flex h-full flex-col justify-between px-1 py-0.5 sm:px-1.5">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-omjep-text-secondary">Balance</span>
                <Coins className="h-5 w-5 text-omjep-mauve/85" aria-hidden />
              </div>
              <div className="my-2.5 sm:my-3">
                <TechnicalDataValue accent="cyan" symbolScale="md" className="text-5xl sm:text-6xl">
                  <span ref={jepyRef} className="font-mono text-5xl font-bold text-omjep-mauve sm:text-6xl" />
                </TechnicalDataValue>
                <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-omjep-text-muted sm:mt-2 sm:text-[12px]" aria-label={formatCurrency(jepy, 'Jepy')}>
                  Jepy
                </p>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <div className="h-[2px] w-full bg-omjep-border">
                  <div className="h-[2px] bg-omjep-mauve" style={{ width: `${walletSegJ}%` }} />
                </div>
                <p className="text-right text-[10px] uppercase tracking-[0.18em] text-omjep-text-muted">{walletSegJ}%</p>
              </div>
            </div>
          )}
        </WidgetTile>

        {/* TOP SCORER */}
        <WidgetTile
          serial="MOD-TOP-014"
          title="Top Scorer"
          subtitle="Performances"
          span={6}
          rowSpan={1}
        >
          {loading ? (
            <WidgetSkeleton />
          ) : data?.topScorer ? (
            <div className="flex h-full flex-col justify-between px-1 py-0.5 sm:px-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-md border border-omjep-border-gold bg-omjep-gold/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-omjep-gold">
                  Golden boot
                </span>
                <Flame className="h-4 w-4 text-omjep-gold/80" aria-hidden />
              </div>
              <div className="my-2.5 sm:my-3">
                <p className="font-display text-[15px] font-bold text-omjep-text-primary sm:text-base">{data.topScorer.displayName ?? 'Anonyme'}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <TechnicalDataValue accent="gold" symbolScale="lg" className="text-4xl sm:text-5xl">
                    <span className="omjep-metric-metallic omjep-metric-crt">{data.topScorer.goals}</span>
                  </TechnicalDataValue>
                  <span className="kimi-kpi-label text-omjep-text-muted">BUTS</span>
                </div>
              </div>
              <ContactZone
                as="link"
                to="/dashboard/team"
                size="sm"
                variant="ghost"
                iconRight={<ArrowUpRight className="h-3.5 w-3.5" />}
              >
                Voir l'effectif
              </ContactZone>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Trophy className="mb-2 h-8 w-8 text-omjep-gold/75" />
              <p className="text-xs text-omjep-text-secondary">Aucun but enregistré</p>
            </div>
          )}
        </WidgetTile>

        {/* MVP */}
        <WidgetTile
          serial="MOD-MVP-015"
          title="MVP du mois"
          subtitle="Module performance"
          span={6}
          rowSpan={1}
        >
          {loading ? (
            <WidgetSkeleton />
          ) : data?.mvp ? (
            <div className="flex h-full flex-col justify-between gap-3 px-1 py-0.5 sm:px-1.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-[17px] font-bold leading-tight text-omjep-text-primary sm:text-lg">
                    {data.mvp.displayName ?? 'Anonyme'}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-omjep-gold">MVP courant</p>
                </div>
                <Crown className="h-6 w-6 text-omjep-gold" aria-hidden />
              </div>
              <div className="grid grid-cols-3 items-end gap-2.5 sm:gap-3">
                <div>
                  <TechnicalDataValue accent="cyan" symbolScale="md" className="text-3xl">
                    <span className="font-mono font-bold text-omjep-mauve">
                      {Number(data.mvp.averageRating ?? 0).toFixed(1)}
                    </span>
                  </TechnicalDataValue>
                  <p className="kimi-kpi-label mt-0.5 text-omjep-text-muted">AMR</p>
                </div>
                <div className="flex items-center gap-2">
                  <Swords className="h-4 w-4 text-omjep-gold/80" />
                  <div>
                    <TechnicalDataValue accent="gold" symbolScale="sm" className="text-xl text-omjep-text-primary">
                      <span>{data.mvp.goals}</span>
                    </TechnicalDataValue>
                    <p className="kimi-kpi-label text-omjep-text-muted">BUT</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-omjep-gold/80" />
                  <div>
                    <TechnicalDataValue accent="gold" symbolScale="sm" className="text-xl text-omjep-text-primary">
                      <span>{data.mvp.assists}</span>
                    </TechnicalDataValue>
                    <p className="kimi-kpi-label text-omjep-text-muted">PAS_D</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Crown className="mb-2 h-8 w-8 text-omjep-gold/75" />
              <p className="text-xs text-omjep-text-secondary">MVP en attente — jouez des matchs</p>
            </div>
          )}
        </WidgetTile>

        {/* NEWS — flux mercato */}
        <WidgetTile
          serial="MOD-NWS-040"
          title="Flux mercato"
          subtitle="Live news"
          span={12}
          rowSpan={2}
          bodyClassName="!p-0"
          controls={
            <Link
              to="/dashboard/transfers"
              className="contact-zone rounded-md border border-omjep-border bg-omjep-bg-panel/35 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-omjep-text-secondary hover:border-omjep-border-gold hover:bg-omjep-bg-panel-soft/45 hover:text-omjep-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omjep-border-gold"
            >
              Mercato
            </Link>
          }
        >
          {loading ? (
            <div className="p-3 sm:p-4">
              <WidgetSkeleton />
            </div>
          ) : news.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <Newspaper className="mb-2 h-8 w-8 text-omjep-mauve/75" />
              <p className="text-xs text-omjep-text-secondary">Aucune actualité récente</p>
            </div>
          ) : (
            <div className="flex h-full snap-x snap-mandatory gap-3 overflow-x-auto p-3 sm:gap-4 sm:p-4">
              {news.map((n) => (
                <motion.article
                  key={n.id}
                  layout
                  className="min-w-[280px] max-w-[420px] shrink-0 snap-start rounded-2xl border border-omjep-border bg-omjep-bg-panel/35 p-5 shadow-xl backdrop-blur-xl transition-colors hover:border-omjep-border-gold sm:min-w-[320px] sm:p-7"
                >
                  <p className="font-heading text-[10px] font-bold uppercase tracking-[0.2em] text-omjep-gold">
                    {n.type === 'TRANSFER' || n.type === 'CONTRACT_RENEWAL' ? 'Signature' : 'Actualité'}
                  </p>
                  <p className="mt-2.5 line-clamp-2 font-display text-[15px] font-bold text-omjep-text-primary sm:mt-3 sm:text-base">{n.title}</p>
                  <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-omjep-text-secondary sm:mt-2.5">{n.description}</p>
                </motion.article>
              ))}
            </div>
          )}
        </WidgetTile>

        {error === 'no-team' && (
          <WidgetTile
            serial="MOD-WRN-099"
            title="Aucun club"
            subtitle="Action requise"
            span={12}
            rowSpan={1}
          >
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Trophy className="mb-2 h-8 w-8 text-omjep-gold/90" />
              <p className="font-display text-base font-bold text-omjep-gold">Aucun club détecté</p>
              <p className="mt-1 text-xs text-omjep-text-secondary">Rejoignez ou créez un club pour activer le cockpit complet.</p>
              <ContactZone as="link" to="/dashboard/manager/club" size="sm" className="mt-3">
                Créer mon club
              </ContactZone>
            </div>
          </WidgetTile>
        )}
      </WidgetGrid>
    </div>
  )
}
