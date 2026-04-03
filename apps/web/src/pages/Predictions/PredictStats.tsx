import { useEffect, useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BarChart3, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import MaintenancePrestige, { PRESTIGE_MSG } from '@/components/MaintenancePrestige';

export type PredictStatsPayload = {
  currentJepy: number;
  jepyHistory: { date: string; balanceJepy: number }[];
  predictionsByStatus: { PENDING: number; WON: number; LOST: number };
};

const PIE_COLORS = {
  WON: '#22c55e',
  LOST: '#ef4444',
  PENDING: '#64748b',
} as const;

const LABEL_FR: Record<keyof typeof PIE_COLORS, string> = {
  WON: 'Gagnés',
  LOST: 'Perdus',
  PENDING: 'En cours',
};

type PredictStatsProps = {
  /** Incrémenter après un pari / reload pour rafraîchir les graphiques */
  refreshKey?: number;
};

export default function PredictStats({ refreshKey = 0 }: PredictStatsProps) {
  const [data, setData] = useState<PredictStatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    void api
      .get<PredictStatsPayload>('/predict/stats')
      .then(({ data: d }) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const pieData = useMemo(() => {
    if (!data) return [];
    const { predictionsByStatus: s } = data;
    return (['WON', 'LOST', 'PENDING'] as const)
      .map((key) => ({
        name: LABEL_FR[key],
        key,
        value: s[key],
        color: PIE_COLORS[key],
      }))
      .filter((d) => d.value > 0);
  }, [data]);

  const successRate = useMemo(() => {
    if (!data) return null;
    const { WON, LOST } = data.predictionsByStatus;
    const decided = WON + LOST;
    if (decided === 0) return null;
    return Math.round((WON / decided) * 1000) / 10;
  }, [data]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-md px-6 py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400/80" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <MaintenancePrestige title="Statistiques" message={PRESTIGE_MSG} />
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-md overflow-hidden">
      <div className="border-b border-white/[0.06] px-5 py-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-yellow-500" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">Statistiques</h2>
        {successRate != null && (
          <span className="ml-auto text-xs text-slate-500">
            Taux de réussite : <span className="text-emerald-400 font-semibold">{successRate}%</span>
            {' '}
            <span className="text-slate-600">(sur pronos terminés)</span>
          </span>
        )}
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-2">
        <div className="min-h-[260px]">
          <p className="text-xs font-medium text-slate-500 mb-3">Évolution du solde Jepy</p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.jepyHistory} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="jepyAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EAB308" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#EAB308" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(v: string) => {
                  const parts = v.split('-');
                  const d = parts[2];
                  const m = parts[1];
                  return d && m ? `${d}/${m}` : v;
                }}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                width={44}
                tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
              />
              <Tooltip
                contentStyle={{
                  background: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                }}
                labelFormatter={(label) => `Date : ${label}`}
                formatter={(value) => [
                  `${Math.round(Number(value ?? 0))} Jepy`,
                  'Solde',
                ]}
              />
              <Area
                type="monotone"
                dataKey="balanceJepy"
                stroke="#EAB308"
                strokeWidth={2}
                fill="url(#jepyAreaFill)"
                dot={false}
                activeDot={{ r: 4, fill: '#EAB308', stroke: '#0f172a', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="min-h-[260px] flex flex-col">
          <p className="text-xs font-medium text-slate-500 mb-2">Répartition par statut</p>
          {pieData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-600">
              Aucun pronostic pour le diagramme.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={2}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} stroke="rgba(15,23,42,0.8)" strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#0f172a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-2">
                {pieData.map((d) => (
                  <li key={d.key} className="flex items-center gap-2 text-xs text-slate-400">
                    <span
                      className="h-2.5 w-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: d.color }}
                      aria-hidden
                    />
                    <span className="text-slate-300">{d.name}</span>
                    <span className="font-mono text-slate-500">{d.value}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
