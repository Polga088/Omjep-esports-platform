import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Activity, Swords, Star, TrendingUp } from 'lucide-react'
import PlayerIdentity from '@/components/PlayerIdentity'
import RankBadge from '@/components/RankBadge'
import TacticalHudFrame from '@/components/TacticalHudFrame'
import { TechnicalDataValue } from '@/components/kimi/TechnicalDataValue'
import type { User } from '@/store/useAuthStore'
import api from '@/lib/api'

interface EaStats {
  games: number
  goals: number
  assists: number
  avg_rating: number
  division?: string | null
  overall_rating?: number | null
  last_synced_at?: string
}

interface LivePlayerCardProps {
  user: User | null
  /** Sans panneau `tactical-bento` externe — pour insertion dans `TacticalBentoElite` */
  embedded?: boolean
}

type DeltaMap = Partial<Record<'goals' | 'assists' | 'games', number>>

async function fetchMyEaStats(): Promise<EaStats | null> {
  const { data } = await api.get<EaStats | null>('/sync/ea-stats/me')
  return data
}

export default function LivePlayerCard({ user, embedded = false }: LivePlayerCardProps) {
  const [deltaMap, setDeltaMap] = useState<DeltaMap>({})
  const previousStatsRef = useRef<EaStats | null>(null)
  const { data: eaStats, isLoading } = useQuery({
    queryKey: ['ea-live-player-stats'],
    queryFn: fetchMyEaStats,
    refetchInterval: 120_000,
  })

  useEffect(() => {
    if (!eaStats) {
      previousStatsRef.current = null
      return undefined
    }
    const previousStats = previousStatsRef.current
    previousStatsRef.current = eaStats
    if (!previousStats) return undefined

    const nextDelta: DeltaMap = {}
    if (eaStats.goals > previousStats.goals) nextDelta.goals = eaStats.goals - previousStats.goals
    if (eaStats.assists > previousStats.assists) nextDelta.assists = eaStats.assists - previousStats.assists
    if (eaStats.games > previousStats.games) nextDelta.games = eaStats.games - previousStats.games

    if (Object.keys(nextDelta).length > 0) {
      setDeltaMap(nextDelta)
      const timeout = window.setTimeout(() => setDeltaMap({}), 2600)
      return () => window.clearTimeout(timeout)
    }
    return undefined
  }, [eaStats])

  const hasStats = !!eaStats && eaStats.games > 0
  const isLive = !!eaStats?.last_synced_at && Date.now() - new Date(eaStats.last_synced_at).getTime() <= 24 * 60 * 60 * 1000
  const overall = hasStats && eaStats?.overall_rating != null ? String(eaStats.overall_rating) : '—'

  const shellClass = embedded
    ? 'relative w-full max-w-none'
    : 'eafc-card-3d relative mx-auto w-full max-w-[22rem]'

  const panelClass = embedded
    ? 'relative flex min-h-[20rem] w-full flex-col rounded-xl border border-omjep-border bg-omjep-bg-panel/35 p-4 sm:min-h-[22rem] sm:p-5'
    : 'tactical-bento relative flex min-h-[22rem] flex-col p-4 sm:min-h-[24rem] sm:p-5'

  return (
    <div className={shellClass}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28, delay: 0.12 }}
        className={panelClass}
      >
        <TacticalHudFrame topLeftCode="EA-FC" bottomRightCode="LIVE" />
        {isLive && (
          <span className="absolute right-4 top-3 z-[5] inline-flex animate-pulse items-center gap-1 rounded border border-omjep-mauve/35 bg-omjep-mauve/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-omjep-text-primary">LIVE</span>
        )}

        <div className="relative z-[3] flex items-start gap-3">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden [clip-path:polygon(8%_0,100%_0,100%_92%,92%_100%,0_100%,0_8%)] sm:h-24 sm:w-24">
              <div className="absolute inset-0 bg-gradient-to-br from-omjep-mauve/25 to-omjep-bg ring-1 ring-omjep-border-gold" />
              <PlayerIdentity
                size="md"
                initial={(user?.ea_persona_name ?? 'J').charAt(0).toUpperCase()}
                avatarUrl={user?.avatarUrl}
                rarity={user?.avatarRarity ?? 'common'}
                activeFrameUrl={user?.activeFrameUrl}
                royalEagleFrame={!user?.activeFrameUrl?.trim()}
                className="scale-[1.02]"
              />
            </div>
            <div className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center border border-omjep-border-gold bg-omjep-bg-panel/90 font-display text-sm font-black tabular-nums text-omjep-gold [clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)] sm:h-9 sm:w-9 sm:text-base">{overall}</div>
          </div>

          <div className="min-w-0 flex-1 pt-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-display text-lg font-extrabold italic tracking-wide text-omjep-text-primary sm:text-xl">{user?.ea_persona_name ?? 'Persona'}</h3>
              {user?.level !== undefined && <RankBadge level={user.level} size="sm" className="shrink-0" />}
            </div>
            <p className="mt-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-omjep-gold">Pro Clubs · Uplink</p>
            {hasStats && eaStats?.division && (
              <span className="mt-2 inline-flex items-center border border-omjep-border bg-omjep-bg-panel-soft/35 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-omjep-text-secondary">{eaStats.division}</span>
            )}
          </div>
        </div>

        <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-omjep-border-gold to-transparent" />

        {isLoading && (
          <div className="mt-4 flex min-h-[11rem] flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-omjep-border bg-omjep-bg-panel/30 px-3 py-6">
            <Activity className="h-8 w-8 animate-pulse text-omjep-mauve/75" />
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-omjep-text-secondary">Uplink EA FC…</p>
          </div>
        )}

        {!isLoading && hasStats && eaStats && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <StatPill
              accent="gold"
              icon={<Swords className="h-3.5 w-3.5 text-omjep-gold" strokeWidth={1.5} />}
              label="Buts"
              value={eaStats.goals}
              delta={deltaMap.goals}
            />
            <StatPill
              accent="cyan"
              icon={<Star className="h-3.5 w-3.5 text-omjep-mauve" strokeWidth={1.5} />}
              label="Passes D."
              value={eaStats.assists}
              delta={deltaMap.assists}
            />
            <StatPill
              accent="cyan"
              icon={<Activity className="h-3.5 w-3.5 text-omjep-mauve" strokeWidth={1.5} />}
              label="Matchs"
              value={eaStats.games}
              delta={deltaMap.games}
            />
            <StatPill
              accent="gold"
              icon={<TrendingUp className="h-3.5 w-3.5 text-omjep-gold" strokeWidth={1.5} />}
              label="Note"
              value={eaStats.avg_rating.toFixed(1)}
            />
          </div>
        )}
      </motion.div>
    </div>
  )
}

function StatPill({
  icon,
  label,
  value,
  delta,
  accent = 'gold',
}: {
  icon: ReactNode
  label: string
  value: string | number
  delta?: number
  accent?: 'gold' | 'cyan'
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded border border-dashed border-omjep-border bg-omjep-bg-panel/35 px-2.5 py-2 backdrop-blur-sm transition-colors hover:border-omjep-mauve/45">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center border border-dashed border-omjep-border bg-omjep-bg-panel-soft/35">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-1.5">
          <TechnicalDataValue accent={accent} symbolScale="sm" className="text-sm font-semibold text-omjep-text-primary">
            <span>{value}</span>
          </TechnicalDataValue>
          {!!delta && <span className="animate-pulse text-[10px] font-bold text-omjep-gold">+{delta}</span>}
        </div>
        <p className="kimi-kpi-label mt-0.5 text-omjep-text-muted">{label}</p>
      </div>
    </div>
  )
}
