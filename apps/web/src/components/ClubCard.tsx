import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Building2, ChevronRight, Loader2, ShieldCheck, TrendingUp } from 'lucide-react'
import api from '@/lib/api'
import { TechnicalDataValue } from '@/components/kimi/TechnicalDataValue'

interface EaClubStats {
  division?: string | null
  points: number
  record?: string | null
  last_synced_at?: string
}

async function fetchMyClubStats(): Promise<EaClubStats | null> {
  const { data } = await api.get<EaClubStats | null>('/sync/ea-stats/my-club')
  return data
}

function getDivisionBadgeLogo(division?: string | null): string {
  const normalized = (division ?? 'D5').toUpperCase().replace(/\s+/g, '')
  if (normalized.includes('ELITE')) {
    return 'https://img.shields.io/badge/EAFC-ELITE-7f1dff?style=for-the-badge'
  }
  if (normalized.includes('D1') || normalized.includes('DIV1')) {
    return 'https://img.shields.io/badge/EAFC-D1-1d4ed8?style=for-the-badge'
  }
  if (normalized.includes('D2') || normalized.includes('DIV2')) {
    return 'https://img.shields.io/badge/EAFC-D2-2563eb?style=for-the-badge'
  }
  if (normalized.includes('D3') || normalized.includes('DIV3')) {
    return 'https://img.shields.io/badge/EAFC-D3-0ea5e9?style=for-the-badge'
  }
  if (normalized.includes('D4') || normalized.includes('DIV4')) {
    return 'https://img.shields.io/badge/EAFC-D4-10b981?style=for-the-badge'
  }
  return 'https://img.shields.io/badge/EAFC-D5-f59e0b?style=for-the-badge'
}

const TEAM_SEARCH_PATH = '/dashboard/team'

type ClubCardProps = {
  /** Sans panneau `tactical-bento` — pour insertion dans `TacticalBentoElite` */
  unframed?: boolean
}

export default function ClubCard({ unframed = false }: ClubCardProps) {
  const navigate = useNavigate()
  const [pointsDelta, setPointsDelta] = useState(0)
  const previousPointsRef = useRef<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['ea-live-club-stats'],
    queryFn: fetchMyClubStats,
    refetchInterval: 120_000,
  })

  useEffect(() => {
    if (!data) {
      previousPointsRef.current = null
      return undefined
    }
    const previousPoints = previousPointsRef.current
    previousPointsRef.current = data.points
    if (typeof previousPoints !== 'number') return undefined
    const delta = data.points - previousPoints
    if (delta > 0) {
      setPointsDelta(delta)
      const timeout = window.setTimeout(() => setPointsDelta(0), 2600)
      return () => window.clearTimeout(timeout)
    }
    return undefined
  }, [data])

  const handleGoToClubSearch = () => {
    navigate(TEAM_SEARCH_PATH)
  }

  const handleClubSearchKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleGoToClubSearch()
    }
  }

  const isLive =
    !!data?.last_synced_at &&
    Date.now() - new Date(data.last_synced_at).getTime() <= 24 * 60 * 60 * 1000

  const loadShell = unframed
    ? 'mt-0 flex min-h-[140px] items-center justify-center rounded-xl border border-white/[0.08] bg-black/15 p-5'
    : 'tactical-bento mt-4 flex min-h-[170px] items-center justify-center rounded-2xl p-5'

  const emptyShell = unframed
    ? 'mt-0 rounded-xl border border-amber-400/25 bg-gradient-to-b from-amber-400/[0.06] to-transparent p-5 shadow-[0_0_28px_rgba(212,175,55,0.05)]'
    : 'tactical-bento mt-4 rounded-2xl border border-amber-400/20 bg-gradient-to-b from-amber-400/[0.06] to-transparent p-5 shadow-[0_0_40px_rgba(212,175,55,0.06)]'

  const dataShell = unframed
    ? 'mt-0 rounded-xl border border-white/[0.08] bg-black/15 p-4 sm:p-5'
    : 'tactical-bento mt-4 rounded-2xl p-5'

  if (isLoading) {
    return (
      <div className={loadShell}>
        <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-cyan-200/75">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement club…
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className={emptyShell}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200/95">
              VOTRE CARRIÈRE COMMENCE ICI
            </p>
            <p className="mt-2 max-w-[18rem] text-sm leading-snug text-slate-200">
              Liez votre club EA ou rejoignez une équipe OMJEP pour afficher division, record et points en direct.
            </p>
          </div>
          <Building2 className="h-8 w-8 shrink-0 text-amber-400/50" aria-hidden />
        </div>

        <div
          role="button"
          tabIndex={0}
          aria-label="Ouvrir la recherche de club et mon équipe"
          onClick={handleGoToClubSearch}
          onKeyDown={handleClubSearchKeyDown}
          className="mt-5 cursor-pointer space-y-3 rounded-xl border border-white/12 bg-black/25 p-3 transition-colors hover:border-amber-400/35 hover:bg-black/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400/60"
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Division</p>
              <input
                readOnly
                tabIndex={-1}
                value="—"
                className="mt-1 w-full cursor-pointer rounded-lg border border-white/15 bg-white/[0.07] px-2.5 py-2 font-mono text-sm text-slate-100 outline-none"
                aria-hidden
              />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Record</p>
              <input
                readOnly
                tabIndex={-1}
                value="0-0-0"
                className="mt-1 w-full cursor-pointer rounded-lg border border-white/15 bg-white/[0.07] px-2.5 py-2 font-mono text-sm text-slate-100 outline-none"
                aria-hidden
              />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Points</p>
            <input
              readOnly
              tabIndex={-1}
              value="0"
              className="mt-1 w-full cursor-pointer rounded-lg border border-white/15 bg-white/[0.07] px-2.5 py-2 font-mono text-sm text-slate-100 outline-none"
              aria-hidden
            />
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-200/90">
              Rechercher / lier mon club
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={dataShell}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300/80">
            Club Sync
          </p>
          <p className="mt-1 font-['Rajdhani'] text-xl font-black italic uppercase tracking-[0.05em] text-white">
            Division & Record
          </p>
        </div>
        {isLive && (
          <span className="inline-flex animate-pulse items-center gap-1 rounded border border-[#00F2FF]/35 bg-[#00F2FF]/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#00F2FF]">
            LIVE
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4">
        <img
          src={getDivisionBadgeLogo(data.division)}
          alt={`Division ${data.division ?? 'D5'}`}
          className="h-8 rounded"
        />
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-400">
            {data.division ?? 'D5'}
          </p>
          <p className="text-sm text-slate-300">Record {data.record ?? '0-0-0'}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded border border-dashed border-[#22c55e]/22 bg-black/40 px-3 py-2 backdrop-blur-sm">
          <p className="kimi-kpi-label text-[#22c55e]/45">PTS</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
            <TechnicalDataValue accent="gold" symbolScale="sm" className="text-lg font-bold">
              <span className="text-[#22c55e]">{data.points}</span>
            </TechnicalDataValue>
            {pointsDelta > 0 && (
              <span className="animate-pulse text-[11px] font-bold text-[#00F2FF]">+{pointsDelta}</span>
            )}
          </div>
        </div>
        <div className="rounded border border-dashed border-[#00F2FF]/15 bg-black/40 px-3 py-2 backdrop-blur-sm">
          <p className="kimi-kpi-label text-[#00F2FF]/45">STAT</p>
          <p className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-[#00F2FF]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Synced
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">
        <TrendingUp className="h-3 w-3 text-[#00F2FF]/70" />
        Refetch en continu actif
      </div>
    </div>
  )
}
