import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, LayoutGroup } from 'framer-motion'
import { Search, Trophy } from 'lucide-react'
import api from '@/lib/api'

type FormR = 'W' | 'L' | 'D'

export type LeaderRow = {
  id: string
  rank: number
  name: string
  club: string
  pts: number
  winrate: number
  ratio: number
  form: FormR[]
}

const rankStyle = (r: number) => {
  if (r === 1) return 'bg-gradient-to-b from-amber-300/25 to-amber-600/5 shadow-[0_0_32px_rgba(251,191,36,0.25)]'
  if (r === 2) return 'bg-gradient-to-b from-slate-200/20 to-slate-500/5 shadow-[0_0_28px_rgba(148,163,184,0.18)]'
  if (r === 3) return 'bg-gradient-to-b from-amber-800/30 to-amber-950/20 shadow-[0_0_24px_rgba(180,83,9,0.2)]'
  return 'bg-white/[0.02]'
}

const FormPill = ({ r, i }: { r: FormR; i: number }) => {
  const cls =
    r === 'W'
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/35'
      : r === 'L'
        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
        : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
  return (
    <motion.span
      initial={{ scale: 0.65, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay: i * 0.04, type: 'spring', stiffness: 400, damping: 22 }}
      className={`inline-flex h-6 min-w-[1.4rem] items-center justify-center rounded border px-1.5 text-[10px] font-bold ${cls}`}
    >
      {r}
    </motion.span>
  )
}

type PlayerLeaderboardProps = {
  competitionId?: string
}

/**
 * Classement stylisé — top 3 or/argent/bronze, forme W/L/D, recherche.
 */
export default function PlayerLeaderboard({ competitionId }: PlayerLeaderboardProps) {
  const [q, setQ] = useState('')
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['competition-leaderboard', competitionId],
    queryFn: async () => {
      const { data } = await api.get<LeaderRow[]>(`/competitions/${competitionId}/leaderboard`)
      return data ?? []
    },
    enabled: Boolean(competitionId),
  })

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    const matches = rows.filter(
      (p) => p.name.toLowerCase().includes(s) || p.club.toLowerCase().includes(s) || p.id === s
    )
    // Réordonnancement contextuel : meilleure correspondance remonte en tête.
    return [...matches].sort((a, b) => {
      const aName = a.name.toLowerCase()
      const bName = b.name.toLowerCase()
      const aStart = aName.startsWith(s) ? 0 : 1
      const bStart = bName.startsWith(s) ? 0 : 1
      if (aStart !== bStart) return aStart - bStart
      const aIndex = aName.indexOf(s)
      const bIndex = bName.indexOf(s)
      if (aIndex !== bIndex) return aIndex - bIndex
      return a.rank - b.rank
    })
  }, [q, rows])

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#050505]/60 shadow-[0_0_0_1px_rgba(34,197,94,0.08)] backdrop-blur-xl">
      <div className="flex flex-col gap-4 border-b border-white/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-400" aria-hidden />
          <h2 className="font-heading text-xl font-bold text-white sm:text-2xl">Classement — Saison 2026</h2>
        </div>
        <div className="relative">
          <label htmlFor="leader-search" className="sr-only">
            Filtrer les joueurs
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            aria-hidden
          />
          <input
            id="leader-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Recherche instantanée…"
            className="w-full min-w-0 rounded-xl border border-white/10 bg-[#020202]/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 sm:min-w-[280px]"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 font-semibold sm:px-6">#</th>
              <th className="px-4 py-3 font-semibold sm:px-6">Joueur</th>
              <th className="px-4 py-3 font-semibold sm:px-6">Club</th>
              <th className="px-4 py-3 text-right font-semibold sm:px-6">Pts</th>
              <th className="px-4 py-3 text-right font-semibold sm:px-6">Winrate</th>
              <th className="px-4 py-3 text-right font-semibold sm:px-6">Ratio</th>
              <th className="px-4 py-3 font-semibold sm:px-6">Forme</th>
            </tr>
          </thead>
          <LayoutGroup>
            <motion.tbody layout>
              {filtered.map((p) => (
                <motion.tr
                  key={p.id}
                  layout="position"
                  transition={{ type: 'spring', damping: 30, stiffness: 260 }}
                  className={`border-b border-white/[0.04] last:border-0 ${rankStyle(p.rank)}`}
                >
                  <td className="px-4 py-3.5 font-heading text-lg font-bold text-white sm:px-6">{p.rank}</td>
                  <td className="px-4 py-3.5">
                    <span className="font-medium text-slate-100">{p.name}</span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-400">{p.club}</td>
                  <td className="px-4 py-3.5 text-right font-heading text-base font-bold tabular-nums text-emerald-300">
                    {p.pts.toLocaleString('fr-FR')}
                  </td>
                  <td className="px-4 py-3.5 text-right font-heading text-sm font-bold tabular-nums text-emerald-200">
                    {p.winrate.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3.5 text-right font-heading text-sm font-bold tabular-nums text-slate-200">
                    {p.ratio.toFixed(2)}
                  </td>
                  <td className="px-4 py-3.5 sm:px-6">
                    <div className="flex flex-wrap gap-1">
                      {p.form.map((f, i) => (
                        <FormPill key={`${p.id}-f${i}`} r={f} i={i} />
                      ))}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </LayoutGroup>
        </table>
      </div>
      {isLoading && (
        <p className="p-8 text-center text-slate-500">Chargement du classement…</p>
      )}
      {!competitionId && (
        <p className="p-8 text-center text-slate-500">Compétition indisponible pour afficher le classement.</p>
      )}
      {!isLoading && Boolean(competitionId) && filtered.length === 0 && (
        <p className="p-8 text-center text-slate-500">Aucun joueur ne correspond à « {q} »</p>
      )}
    </div>
  )
}
