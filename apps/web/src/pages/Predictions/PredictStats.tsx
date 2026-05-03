import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3, Loader2, TrendingUp } from 'lucide-react'
import api from '@/lib/api'
import MaintenancePrestige, { PRESTIGE_MSG } from '@/components/MaintenancePrestige'

export type PredictStatsPayload = {
  currentJepy: number
  jepyHistory: { date: string; balanceJepy: number }[]
  predictionsByStatus: { PENDING: number; WON: number; LOST: number }
}

const PIE_COLORS = {
  WON: '#34d399',
  LOST: '#fb7185',
  PENDING: '#a78bfa',
} as const

const LABEL_FR: Record<keyof typeof PIE_COLORS, string> = {
  WON: 'Gagnes',
  LOST: 'Perdus',
  PENDING: 'En cours',
}

type PredictStatsProps = {
  refreshKey?: number
}

export default function PredictStats({ refreshKey = 0 }: PredictStatsProps) {
  const [data, setData] = useState<PredictStatsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)

    void api
      .get<PredictStatsPayload>('/predict/stats')
      .then(({ data: d }) => {
        if (!cancelled) setData(d)
      })
      .catch(() => {
        if (!cancelled) {
          setError(true)
          setData(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const pieData = useMemo(() => {
    if (!data) return []
    const { predictionsByStatus: s } = data
    return (['WON', 'LOST', 'PENDING'] as const)
      .map((key) => ({
        name: LABEL_FR[key],
        key,
        value: s[key],
        color: PIE_COLORS[key],
      }))
      .filter((d) => d.value > 0)
  }, [data])

  const successRate = useMemo(() => {
    if (!data) return null
    const { WON, LOST } = data.predictionsByStatus
    const decided = WON + LOST
    if (decided === 0) return null
    return Math.round((WON / decided) * 1000) / 10
  }, [data])

  const totalPredictions = useMemo(() => {
    if (!data) return 0
    const { PENDING, WON, LOST } = data.predictionsByStatus
    return PENDING + WON + LOST
  }, [data])

  if (loading) {
    return (
      <div className="rounded-2xl border border-omjep-border bg-omjep-bg-panel px-6 py-12">
        <div className="flex items-center justify-center gap-3 text-omjep-text-secondary">
          <Loader2 className="h-7 w-7 animate-spin text-[color-mix(in_srgb,var(--omjep-gold)_80%,var(--omjep-mauve))]" />
          <span className="text-sm">Chargement des statistiques premium...</span>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return <MaintenancePrestige title="Statistiques" message={PRESTIGE_MSG} />
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-omjep-border bg-omjep-bg-panel shadow-[var(--omjep-shadow-lg)]">
      <div className="border-b border-omjep-border/70 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[color-mix(in_srgb,var(--omjep-gold)_82%,var(--omjep-mauve))]" />
            <h2 className="font-heading text-lg font-bold text-omjep-text-primary">Performance Arena</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-full border border-omjep-border/70 bg-omjep-bg-panel-soft px-2.5 py-1 font-semibold text-omjep-text-secondary">
              Total: {totalPredictions}
            </span>
            {successRate != null ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-bold text-emerald-300">
                <TrendingUp className="h-3.5 w-3.5" />
                {successRate}% réussite
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-2">
        <article className="rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft/80 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-omjep-text-muted">Évolution du solde Jepy</p>
          <div className="mt-3 h-[248px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.jepyHistory} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="predict-stats-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5} />
                    <stop offset="70%" stopColor="#8b5cf6" stopOpacity={0.16} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(v: string) => {
                    const parts = v.split('-')
                    const d = parts[2]
                    const m = parts[1]
                    return d && m ? `${d}/${m}` : v
                  }}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  width={44}
                  tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                />
                <Tooltip
                  allowEscapeViewBox={{ x: true, y: true }}
                  wrapperStyle={{ zIndex: 30, maxWidth: 'min(100vw - 1.5rem, 280px)' }}
                  contentStyle={{
                    background: 'rgba(4, 8, 18, 0.95)',
                    border: '1px solid rgba(148, 163, 184, 0.22)',
                    borderRadius: '12px',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    boxSizing: 'border-box',
                  }}
                  labelFormatter={(label) => `Date: ${label}`}
                  formatter={(value) => [`${Math.round(Number(value ?? 0))} Jepy`, 'Solde']}
                />
                <Area
                  type="monotone"
                  dataKey="balanceJepy"
                  stroke="#f59e0b"
                  strokeWidth={2.2}
                  fill="url(#predict-stats-area)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#f59e0b', stroke: '#111827', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft/80 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-omjep-text-muted">Répartition des résultats</p>
          {pieData.length === 0 ? (
            <div className="flex h-[248px] items-center justify-center text-sm text-omjep-text-secondary">
              Aucun pronostic pour le diagramme.
            </div>
          ) : (
            <>
              <div className="h-[206px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={2}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} stroke="rgba(8, 12, 24, 0.8)" strokeWidth={1} />
                      ))}
                    </Pie>
                    <Tooltip
                      allowEscapeViewBox={{ x: true, y: true }}
                      wrapperStyle={{ zIndex: 30, maxWidth: 'min(100vw - 1.5rem, 280px)' }}
                      contentStyle={{
                        background: 'rgba(4, 8, 18, 0.95)',
                        border: '1px solid rgba(148, 163, 184, 0.22)',
                        borderRadius: '12px',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        boxSizing: 'border-box',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <ul className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2">
                {pieData.map((entry) => (
                  <li key={entry.key} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} aria-hidden />
                    <span className="text-omjep-text-secondary">{entry.name}</span>
                    <span className="font-mono text-omjep-text-muted">{entry.value}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </article>
      </div>
    </section>
  )
}
