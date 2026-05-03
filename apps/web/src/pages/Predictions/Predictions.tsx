import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2, Clock3, Sparkles, Swords, Trophy, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { useAuthStore } from '@/store/useAuthStore'
import { formatCurrency } from '@/utils/formatCurrency'
import PredictStats from './PredictStats'
import PredictMatch from './PredictMatch'
import type { TeamFormLetter } from './predictionTypes'
import DashboardPageHeading from '@/components/dashboard/DashboardPageHeading'

type PredictionStatus = 'PENDING' | 'WON' | 'LOST'

interface TeamMini {
  id: string
  name: string
  logo_url: string | null
}

interface MatchRow {
  id: string
  home_team_id: string
  away_team_id: string
  home_score: number | null
  away_score: number | null
  status: string
  played_at: string | null
  round: string | null
  competition: { id: string; name: string; type: string } | null
  homeTeam: TeamMini
  awayTeam: TeamMini
  homeTeamForm?: TeamFormLetter[]
  awayTeamForm?: TeamFormLetter[]
  homeTeamRank?: number | null
  awayTeamRank?: number | null
}

interface MyPredictionRow {
  id: string
  homeScore: number
  awayScore: number
  betAmount: number
  status: PredictionStatus
  created_at: string
  match: MatchRow & {
    home_score: number | null
    away_score: number | null
  }
}

const STATUS_LABEL: Record<PredictionStatus, string> = {
  PENDING: 'En cours',
  WON: 'Gagné',
  LOST: 'Perdu',
}

const statusTone: Record<PredictionStatus, string> = {
  PENDING:
    'border-[color-mix(in_srgb,var(--omjep-gold)_30%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_8%,var(--omjep-bg-panel-soft))]',
  WON: 'border-emerald-500/40 bg-emerald-500/10',
  LOST: 'border-rose-500/40 bg-rose-500/10',
}

const statusIcon: Record<PredictionStatus, JSX.Element> = {
  PENDING: <Clock3 className="h-4 w-4 text-amber-400" aria-hidden />,
  WON: <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden />,
  LOST: <XCircle className="h-4 w-4 text-rose-400" aria-hidden />,
}

export default function Predictions() {
  const prefersReducedMotion = useReducedMotion()
  const { patchUser } = useAuthStore()

  const [tab, setTab] = useState<'paris' | 'history'>('paris')
  const [upcoming, setUpcoming] = useState<MatchRow[]>([])
  const [mine, setMine] = useState<MyPredictionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [statsRefreshKey, setStatsRefreshKey] = useState(0)
  const [isLongLoading, setIsLongLoading] = useState(false)
  const [forms, setForms] = useState<Record<string, { home: string; away: string; bet: string }>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [u, m] = await Promise.all([
        api.get<MatchRow[]>('/predictions/upcoming'),
        api.get<MyPredictionRow[]>('/predictions/me'),
      ])
      setUpcoming(Array.isArray(u.data) ? u.data : [])
      setMine(Array.isArray(m.data) ? m.data : [])
      setForms((prev) => {
        const next = { ...prev }
        for (const match of u.data ?? []) {
          if (!next[match.id]) next[match.id] = { home: '0', away: '0', bet: '10' }
        }
        return next
      })
    } catch {
      toast.error('Impossible de charger les pronostics.')
      setUpcoming([])
      setMine([])
    } finally {
      setLoading(false)
      setStatsRefreshKey((k) => k + 1)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!loading) {
      setIsLongLoading(false)
      return
    }
    const timer = window.setTimeout(() => setIsLongLoading(true), 4000)
    return () => window.clearTimeout(timer)
  }, [loading])

  const predictedMatchIds = useMemo(() => new Set(mine.map((p) => p.match.id)), [mine])

  const liveKpis = useMemo(() => {
    const pending = mine.filter((p) => p.status === 'PENDING').length
    const wins = mine.filter((p) => p.status === 'WON').length
    const totalBet = mine.reduce((acc, p) => acc + p.betAmount, 0)
    return {
      available: upcoming.length,
      pending,
      wins,
      totalBet,
    }
  }, [mine, upcoming.length])

  const submit = async (match: MatchRow) => {
    const f = forms[match.id]
    if (!f) return

    const home = Number.parseInt(f.home, 10)
    const away = Number.parseInt(f.away, 10)
    const bet = Number.parseInt(f.bet, 10)

    if (Number.isNaN(home) || Number.isNaN(away) || home < 0 || away < 0) {
      toast.error('Scores invalides.')
      return
    }
    if (Number.isNaN(bet) || bet < 1) {
      toast.error('Mise Jepy minimale : 1.')
      return
    }

    setSubmitting(match.id)
    try {
      const { data } = await api.post<{ user: { jepyCoins: number; omjepCoins: number } }>('/predictions', {
        match_id: match.id,
        home_score: home,
        away_score: away,
        bet_amount: bet,
      })
      toast.success('Pronostic enregistré ! Bonne chance.')

      if (data?.user) {
        patchUser({
          jepyCoins: data.user.jepyCoins,
          omjepCoins: data.user.omjepCoins,
        })
      }

      await load()
      setTab('history')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      const text = Array.isArray(msg) ? msg.join(', ') : msg
      toast.error(typeof text === 'string' ? text : 'Enregistrement impossible.')
    } finally {
      setSubmitting(null)
    }
  }

  const updateForm = (matchId: string, field: 'home' | 'away' | 'bet', value: string) => {
    setForms((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [field]: value },
    }))
  }

  if (loading) {
    return (
      <div className="min-w-0 space-y-6 overflow-x-hidden">
        <div className="relative overflow-hidden rounded-2xl border border-omjep-border bg-omjep-bg-panel px-5 py-5 shadow-[var(--omjep-shadow-lg)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_25%_0%,color-mix(in_srgb,var(--omjep-mauve)_24%,transparent),transparent_58%),radial-gradient(ellipse_at_80%_100%,color-mix(in_srgb,var(--omjep-gold)_12%,transparent),transparent_55%)]" />
          <div className="relative">
            <p className="font-heading text-[10px] font-black uppercase tracking-[0.26em] text-omjep-text-muted">
              Predict & Win
            </p>
            <p className="mt-2 text-sm font-medium text-omjep-text-primary">
              Chargement du centre de pronostics...
            </p>
            <div
              className="relative mt-4 h-1.5 w-full max-w-[18rem] overflow-hidden rounded-full bg-omjep-bg-panel-soft"
              role="progressbar"
              aria-label="Progression du chargement"
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <motion.div
                className="absolute top-0 h-full w-[34%] rounded-full bg-gradient-to-r from-omjep-mauve to-[color-mix(in_srgb,var(--omjep-gold)_68%,var(--omjep-mauve))]"
                animate={prefersReducedMotion ? { left: 0, width: '100%', opacity: 0.6 } : { left: ['-36%', '100%'] }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0.2 }
                    : { duration: 1.2, repeat: Infinity, ease: 'linear' }
                }
              />
            </div>
            {isLongLoading ? (
              <p className="mt-3 text-xs text-omjep-text-muted">
                Synchronisation des matchs et de votre historique en cours.
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={`predictions-loading-kpi-${idx}`}
              className="h-24 animate-pulse rounded-2xl border border-omjep-border/60 bg-omjep-bg-panel-soft"
            />
          ))}
        </div>

        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div
              key={`predictions-loading-card-${idx}`}
              className="h-56 animate-pulse rounded-2xl border border-omjep-border/60 bg-omjep-bg-panel"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-7 overflow-x-hidden">
      <section className="relative overflow-hidden rounded-2xl border border-omjep-border bg-omjep-bg-panel px-5 py-5 shadow-[var(--omjep-shadow-lg)] sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_0%,color-mix(in_srgb,var(--omjep-mauve)_30%,transparent),transparent_58%),radial-gradient(ellipse_at_82%_100%,color-mix(in_srgb,var(--omjep-gold)_13%,transparent),transparent_56%)]" />
        <div className="pointer-events-none absolute right-6 top-5 hidden h-20 w-20 rounded-full border border-[color-mix(in_srgb,var(--omjep-gold)_35%,transparent)] bg-[radial-gradient(circle_at_35%_30%,color-mix(in_srgb,var(--omjep-gold)_20%,transparent),transparent_70%)] lg:block" />

        <div className="relative">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <DashboardPageHeading
              eyebrow="Predict & Win"
              title="Predict Arena"
              subtitle="Pronostiquez les scores, sécurisez vos mises Jepy et suivez vos performances en temps réel."
              className="border-b-0 pb-0"
            />

            <div className="inline-flex w-full max-w-full rounded-xl border border-omjep-border bg-omjep-bg-panel-soft p-1 sm:w-auto">
              <button
                type="button"
                onClick={() => setTab('paris')}
                className={`flex-1 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition sm:flex-none ${
                  tab === 'paris'
                    ? 'bg-[color-mix(in_srgb,var(--omjep-mauve)_22%,var(--omjep-bg-panel))] text-omjep-text-primary shadow-[0_0_0_1px_color-mix(in_srgb,var(--omjep-mauve)_40%,transparent)]'
                    : 'text-omjep-text-secondary hover:text-omjep-text-primary'
                }`}
              >
                Paris ouverts
              </button>
              <button
                type="button"
                onClick={() => setTab('history')}
                className={`flex-1 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition sm:flex-none ${
                  tab === 'history'
                    ? 'bg-[color-mix(in_srgb,var(--omjep-gold)_18%,var(--omjep-bg-panel))] text-omjep-text-primary shadow-[0_0_0_1px_color-mix(in_srgb,var(--omjep-gold)_38%,transparent)]'
                    : 'text-omjep-text-secondary hover:text-omjep-text-primary'
                }`}
              >
                Historique
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft/90 px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-omjep-text-muted">Matchs</p>
              <p className="mt-1 font-heading text-xl font-black text-omjep-text-primary">{liveKpis.available}</p>
            </div>
            <div className="rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft/90 px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-omjep-text-muted">En cours</p>
              <p className="mt-1 font-heading text-xl font-black text-omjep-text-primary">{liveKpis.pending}</p>
            </div>
            <div className="rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft/90 px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-omjep-text-muted">Gagnés</p>
              <p className="mt-1 font-heading text-xl font-black text-[color-mix(in_srgb,var(--omjep-gold)_86%,var(--omjep-mauve))]">
                {liveKpis.wins}
              </p>
            </div>
            <div className="rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft/90 px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-omjep-text-muted">Mises totales</p>
              <p className="mt-1 font-heading text-lg font-black text-omjep-text-primary">
                {formatCurrency(liveKpis.totalBet, 'Jepy')}
              </p>
            </div>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--omjep-gold)_35%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_10%,var(--omjep-bg-panel-soft))] px-3 py-1 text-[11px] font-semibold text-omjep-text-secondary">
            <Sparkles className="h-3.5 w-3.5 text-[color-mix(in_srgb,var(--omjep-gold)_82%,var(--omjep-mauve))]" aria-hidden />
            Score exact = gain x3. Une seule prédiction par match.
          </div>
        </div>
      </section>

      <PredictStats refreshKey={statsRefreshKey} />

      {tab === 'paris' ? (
        <section className="space-y-5">
          {upcoming.length === 0 ? (
            <div className="rounded-2xl border border-omjep-border bg-omjep-bg-panel-soft/70 px-6 py-14 text-center">
              <Trophy className="mx-auto h-8 w-8 text-omjep-text-muted" aria-hidden />
              <p className="mt-3 text-sm text-omjep-text-secondary">
                Aucun match ouvert aux paris pour le moment.
              </p>
            </div>
          ) : (
            upcoming.map((match, idx) => {
              const f = forms[match.id] ?? { home: '0', away: '0', bet: '10' }
              const already = predictedMatchIds.has(match.id)
              const cardMatch = {
                id: match.id,
                round: match.round ?? null,
                played_at: match.played_at,
                competition: match.competition,
                homeTeam: match.homeTeam,
                awayTeam: match.awayTeam,
                homeTeamForm: match.homeTeamForm ?? [],
                awayTeamForm: match.awayTeamForm ?? [],
                homeTeamRank: match.homeTeamRank ?? null,
                awayTeamRank: match.awayTeamRank ?? null,
              }

              return (
                <motion.div
                  key={match.id}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                  animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, delay: prefersReducedMotion ? 0 : idx * 0.05 }}
                >
                  <PredictMatch
                    match={cardMatch}
                    formHome={f.home}
                    formAway={f.away}
                    formBet={f.bet}
                    already={already}
                    submitting={submitting === match.id}
                    onChange={(field, value) => updateForm(match.id, field, value)}
                    onSubmit={() => void submit(match)}
                  />
                </motion.div>
              )
            })
          )}
        </section>
      ) : (
        <section className="space-y-3">
          {mine.length === 0 ? (
            <div className="rounded-2xl border border-omjep-border bg-omjep-bg-panel-soft/70 px-6 py-14 text-center">
              <Swords className="mx-auto h-8 w-8 text-omjep-text-muted" aria-hidden />
              <p className="mt-3 text-sm text-omjep-text-secondary">Aucun pronostic pour l’instant.</p>
            </div>
          ) : (
            mine.map((p, idx) => {
              const m = p.match
              const finalH = m.home_score
              const finalA = m.away_score

              return (
                <motion.article
                  key={p.id}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                  animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: prefersReducedMotion ? 0 : idx * 0.03 }}
                  className={`rounded-2xl border px-4 py-4 sm:px-5 ${statusTone[p.status]}`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {statusIcon[p.status]}
                        <p className="truncate text-sm font-bold text-omjep-text-primary">
                          {m.homeTeam.name ?? '—'} vs {m.awayTeam.name ?? '—'}
                        </p>
                        <span className="rounded-full border border-omjep-border/70 bg-omjep-bg-panel-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-omjep-text-muted">
                          {STATUS_LABEL[p.status]}
                        </span>
                      </div>

                      <p className="mt-1.5 text-xs text-omjep-text-secondary">
                        Votre prono: {p.homeScore} - {p.awayScore} · Mise {formatCurrency(p.betAmount, 'Jepy')}
                        {finalH != null && finalA != null ? (
                          <span className="text-omjep-text-muted"> · Résultat: {finalH} - {finalA}</span>
                        ) : null}
                      </p>

                      <p className="mt-1 text-[10px] text-omjep-text-muted">
                        {new Date(p.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>

                    {p.status === 'WON' ? (
                      <div className="inline-flex items-center rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-xs font-black text-emerald-300">
                        +{formatCurrency(p.betAmount * 3, 'Jepy')}
                      </div>
                    ) : null}
                  </div>
                </motion.article>
              )
            })
          )}
        </section>
      )}
    </div>
  )
}
