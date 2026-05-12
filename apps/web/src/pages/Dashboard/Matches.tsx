import { useEffect, useMemo, useState } from 'react'
import { Calendar, Clock3, Loader2, Shield, Swords } from 'lucide-react'
import api from '@/lib/api'
import MaintenancePrestige, { PRESTIGE_MSG } from '@/components/MaintenancePrestige'
import MatchReportModal from '@/components/MatchReportModal'

interface Team {
  id: string
  name: string
  logoUrl: string | null
  managerId?: string | null
  manager?: { level: number } | null
}

interface Match {
  id: string
  status: 'SCHEDULED' | 'PENDING' | 'VALIDATED' | 'DISPUTE' | 'PLAYED'
  scheduledAt: string
  homeScore: number | null
  awayScore: number | null
  proofUrl?: string | null
  homeTeam: Team
  awayTeam: Team
  competition: {
    id: string
    name: string
    type: string
  } | null
  myTeamId: string
  eaClubsSyncEnabled?: boolean
  canRunEaMatchSync?: boolean
}

type Tab = 'upcoming' | 'results'

function SkeletonMatchRow() {
  return (
    <div className="rounded-xl border border-omjep-border/60 bg-omjep-bg-panel-soft/40 p-3 animate-pulse md:grid md:grid-cols-[9rem_1fr_5rem_1fr_7.5rem] md:items-center md:gap-3">
      <div className="mb-3 space-y-2 md:mb-0">
        <div className="h-5 w-16 rounded-full bg-omjep-bg-panel" />
        <div className="h-3 w-24 rounded bg-omjep-bg-panel" />
      </div>
      <div className="mb-3 flex items-center gap-2 md:mb-0">
        <div className="h-9 w-9 rounded-lg bg-omjep-bg-panel" />
        <div className="h-4 flex-1 rounded bg-omjep-bg-panel" />
      </div>
      <div className="mb-3 flex justify-center md:mb-0">
        <div className="h-10 w-12 rounded-lg bg-omjep-bg-panel" />
      </div>
      <div className="mb-3 flex items-center justify-end gap-2 md:mb-0">
        <div className="h-4 flex-1 rounded bg-omjep-bg-panel" />
        <div className="h-9 w-9 rounded-lg bg-omjep-bg-panel" />
      </div>
      <div className="h-9 rounded-lg bg-omjep-bg-panel md:h-9" />
    </div>
  )
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <p className="rounded-xl border border-dashed border-omjep-border/80 bg-[color-mix(in_srgb,var(--omjep-bg-panel-soft)_55%,transparent)] py-12 text-center text-sm font-medium text-omjep-text-secondary">
      {tab === 'upcoming' ? 'Pas de match prévu pour le moment.' : 'Pas encore de résultat enregistré.'}
    </p>
  )
}

function teamInitial(name: string | null | undefined) {
  const n = name?.trim() ?? ''
  return n.length > 0 ? n.slice(0, 2).toUpperCase() : '??'
}

function statusLabel(status: Match['status']) {
  if (status === 'PLAYED' || status === 'VALIDATED') return 'TERMINÉ'
  if (status === 'DISPUTE') return 'LITIGE'
  if (status === 'PENDING') return 'EN ATTENTE'
  return 'À VENIR'
}

function statusTone(status: Match['status']) {
  if (status === 'PLAYED' || status === 'VALIDATED') {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
  }
  if (status === 'DISPUTE') {
    return 'border-rose-500/40 bg-rose-500/10 text-rose-200'
  }
  if (status === 'PENDING') {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-200'
  }
  return 'border-[color-mix(in_srgb,var(--omjep-gold)_32%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_8%,var(--omjep-bg-panel))] text-omjep-text-secondary'
}

function TeamBlock({ team, align }: { team: Team; align: 'left' | 'right' }) {
  const isRight = align === 'right'
  const avatar = team.logoUrl ? (
    <img
      src={team.logoUrl}
      alt=""
      className="h-9 w-9 shrink-0 rounded-lg border border-omjep-border/60 object-cover"
    />
  ) : (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-omjep-border/60 bg-omjep-bg-panel text-[11px] font-black text-[color-mix(in_srgb,var(--omjep-gold)_75%,var(--omjep-text-primary))]">
      {teamInitial(team.name)}
    </div>
  )
  return (
    <div className={`flex min-w-0 items-center gap-2 ${isRight ? 'md:flex-row-reverse md:text-right' : ''}`}>
      {avatar}
      <div className="min-w-0 flex-1">
        <p className="truncate font-heading text-sm font-bold leading-tight text-omjep-text-primary">{team.name}</p>
        <p className="mt-0.5 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] text-omjep-text-muted">
          <Shield className="h-2.5 w-2.5 shrink-0" aria-hidden />
          Club
        </p>
      </div>
    </div>
  )
}

function MatchCenterRow({
  match,
  onReport,
}: {
  match: Match
  onReport: (m: Match) => void
}) {
  const isPlayed = match.status === 'PLAYED' || match.status === 'VALIDATED'
  const matchStatusLabel = statusLabel(match.status)
  const scheduledDate = new Date(match.scheduledAt)
  const meta = match.competition?.name

  return (
    <article className="group relative overflow-hidden rounded-xl border border-omjep-border/70 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_88%,#0a1020)] shadow-sm transition duration-200 hover:border-[color-mix(in_srgb,var(--omjep-mauve)_45%,var(--omjep-border))] hover:shadow-[var(--omjep-glow-mauve-soft)]">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-[color-mix(in_srgb,var(--omjep-mauve)_55%,transparent)] to-transparent opacity-0 transition group-hover:opacity-100"
        aria-hidden
      />
      <div className="relative flex flex-col gap-3 p-3 sm:p-3.5 md:grid md:grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)_minmax(4.5rem,auto)_minmax(0,1fr)_auto] md:items-center md:gap-x-3 md:gap-y-0">
        <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-start md:gap-1.5">
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${statusTone(match.status)}`}
          >
            {matchStatusLabel}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium tabular-nums text-omjep-text-secondary">
            <Clock3 className="h-3 w-3 shrink-0 text-omjep-text-muted" aria-hidden />
            {scheduledDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} ·{' '}
            {scheduledDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <TeamBlock team={match.homeTeam} align="left" />

        <div className="flex justify-center py-1 md:py-0">
          <div className="flex min-w-[4.5rem] flex-col items-center justify-center rounded-lg border border-omjep-border/60 bg-[color-mix(in_srgb,var(--omjep-bg-panel-soft)_70%,#050a14)] px-2 py-1.5 text-center">
            {isPlayed ? (
              <>
                <p className="font-heading text-lg font-black tabular-nums leading-none text-omjep-text-primary sm:text-xl">
                  {match.homeScore ?? 0}
                  <span className="mx-0.5 text-omjep-text-muted">·</span>
                  {match.awayScore ?? 0}
                </p>
                <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.16em] text-omjep-text-muted">Score</p>
              </>
            ) : (
              <>
                <p className="font-heading text-sm font-black uppercase tracking-[0.2em] text-[color-mix(in_srgb,var(--omjep-mauve)_92%,var(--omjep-text-primary))]">
                  VS
                </p>
                <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-omjep-text-muted">À venir</p>
              </>
            )}
          </div>
        </div>

        <TeamBlock team={match.awayTeam} align="right" />

        <div className="flex md:justify-end">
          <button
            type="button"
            onClick={() => onReport(match)}
            className="w-full rounded-lg border border-[color-mix(in_srgb,var(--omjep-gold)_28%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_6%,var(--omjep-bg-panel-soft))] px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-omjep-text-primary transition hover:border-[color-mix(in_srgb,var(--omjep-gold)_48%,var(--omjep-mauve))] hover:bg-[color-mix(in_srgb,var(--omjep-gold)_10%,var(--omjep-bg-panel-soft))] md:w-auto md:min-w-[7.5rem]"
          >
            Signaler / preuve
          </button>
        </div>
      </div>
      {meta ? (
        <div className="border-t border-omjep-border/50 bg-[color-mix(in_srgb,#050a14_40%,transparent)] px-3 py-1.5 sm:px-3.5">
          <p className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-omjep-text-muted">{meta}</p>
        </div>
      ) : null}
    </article>
  )
}

export default function Matches() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('upcoming')
  const [reportingMatch, setReportingMatch] = useState<Match | null>(null)
  const [isLongLoading, setIsLongLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await api.get<Match[]>('/matches/my-team')
        if (!cancelled) setMatches(res.data)
      } catch (err: unknown) {
        if (!cancelled) {
          const status = (err as { response?: { status?: number } })?.response?.status
          if (status === 404) {
            setError('no-team')
          } else {
            setError('generic')
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!loading) {
      setIsLongLoading(false)
      return
    }
    const timer = window.setTimeout(() => setIsLongLoading(true), 4000)
    return () => window.clearTimeout(timer)
  }, [loading])

  useEffect(() => {
    const onRefresh = () => {
      void api
        .get<Match[]>('/matches/my-team')
        .then((res) => setMatches(res.data))
        .catch(() => {})
    }
    window.addEventListener('omjep:matches-refresh', onRefresh)
    return () => window.removeEventListener('omjep:matches-refresh', onRefresh)
  }, [])

  const upcoming = useMemo(
    () =>
      matches
        .filter((m) => ['SCHEDULED', 'PENDING', 'DISPUTE'].includes(m.status))
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [matches],
  )

  const results = useMemo(
    () =>
      matches
        .filter((m) => m.status === 'PLAYED' || m.status === 'VALIDATED')
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()),
    [matches],
  )

  const currentList = activeTab === 'upcoming' ? upcoming : results

  const tabs: { key: Tab; label: string; icon: typeof Calendar; count: number }[] = [
    { key: 'upcoming', label: 'Calendrier', icon: Calendar, count: upcoming.length },
    { key: 'results', label: 'Résultats', icon: Swords, count: results.length },
  ]

  const kpis = useMemo(() => {
    const played = results.length
    const upcomingCount = upcoming.length
    const nextMatch = upcoming[0] ?? null
    return { played, upcomingCount, nextMatch }
  }, [results, upcoming])

  return (
    <div className="cockpit-page dashboard-phase3-matches space-y-5">
      <section className="relative overflow-hidden rounded-xl border border-omjep-border/80 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_90%,#070d18)] px-4 py-4 shadow-[var(--omjep-shadow-lg)] sm:px-5 sm:py-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_10%_-10%,color-mix(in_srgb,var(--omjep-mauve)_22%,transparent),transparent_55%),radial-gradient(ellipse_60%_50%_at_100%_100%,color-mix(in_srgb,var(--omjep-gold)_12%,transparent),transparent_50%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-omjep-text-muted">MATCH CENTER</p>
            <h1 className="font-heading text-2xl font-extrabold tracking-tight text-omjep-text-primary sm:text-3xl">
              Matchs
            </h1>
            <p className="max-w-2xl text-xs leading-relaxed text-omjep-text-secondary sm:text-sm">
              Calendrier des rencontres, résultats officiels et reporting de match en un seul hub.
            </p>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-2 sm:max-w-md lg:w-auto lg:max-w-xl lg:flex-row lg:items-stretch">
            <div className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-[5.25rem_5.25rem]">
              <div className="rounded-lg border border-omjep-border/60 bg-[color-mix(in_srgb,#050a14_35%,var(--omjep-bg-panel-soft))] px-2.5 py-2 text-center">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-omjep-text-muted">À venir</p>
                <p className="mt-0.5 font-heading text-xl font-black tabular-nums text-omjep-text-primary">
                  {kpis.upcomingCount}
                </p>
              </div>
              <div className="rounded-lg border border-omjep-border/60 bg-[color-mix(in_srgb,#050a14_35%,var(--omjep-bg-panel-soft))] px-2.5 py-2 text-center">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-omjep-text-muted">Résultats</p>
                <p className="mt-0.5 font-heading text-xl font-black tabular-nums text-[color-mix(in_srgb,var(--omjep-gold)_82%,var(--omjep-mauve))]">
                  {kpis.played}
                </p>
              </div>
            </div>
            <div className="min-w-0 flex-1 rounded-lg border border-omjep-border/60 bg-[color-mix(in_srgb,#050a14_35%,var(--omjep-bg-panel-soft))] px-2.5 py-2 lg:min-w-[11rem]">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-omjep-text-muted">Prochain match</p>
              <p className="mt-0.5 truncate text-xs font-semibold text-omjep-text-primary">
                {kpis.nextMatch
                  ? `${kpis.nextMatch.homeTeam.name} vs ${kpis.nextMatch.awayTeam.name}`
                  : 'Aucun match programmé'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {error === 'no-team' && (
        <p className="omjep-empty-panel py-12 text-center text-sm font-medium text-omjep-text-secondary">
          Aucun club trouvé. Rejoignez un club pour voir vos matchs.
        </p>
      )}

      {error === 'generic' && (
        <MaintenancePrestige overlay title="Matchs" message={PRESTIGE_MSG} className="border-white/10" />
      )}

      {!error && (
        <>
          <div className="omjep-tabrail w-fit max-w-full">
            {tabs.map(({ key, label, icon: Icon, count }) => {
              const active = activeTab === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`omjep-tabrail__btn ${active ? 'omjep-tabrail__btn--active' : ''}`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {label}
                  {!loading ? (
                    <span className="omjep-badge ml-0.5 py-0 font-mono tabular-nums">{count}</span>
                  ) : null}
                </button>
              )
            })}
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft/80 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-omjep-text-secondary">
                  <Loader2 className="h-4 w-4 animate-spin text-omjep-mauve" aria-hidden />
                  Chargement du calendrier des matchs…
                </div>
                {isLongLoading ? (
                  <p className="mt-2 text-xs text-omjep-text-muted">
                    Le chargement prend plus de temps que prévu. Le module reste actif.
                  </p>
                ) : null}
              </div>
              <SkeletonMatchRow />
              <SkeletonMatchRow />
            </div>
          ) : currentList.length === 0 ? (
            <EmptyState tab={activeTab} />
          ) : (
            <div className="space-y-2.5">
              {currentList.map((match) => (
                <MatchCenterRow key={match.id} match={match} onReport={setReportingMatch} />
              ))}
            </div>
          )}
        </>
      )}
      <MatchReportModal
        key={reportingMatch?.id ?? 'match-report-closed'}
        open={reportingMatch !== null}
        match={reportingMatch}
        onClose={() => setReportingMatch(null)}
        onUpdated={() => {
          window.dispatchEvent(new CustomEvent('omjep:matches-refresh'))
        }}
      />
    </div>
  )
}
