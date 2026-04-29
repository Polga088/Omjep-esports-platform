import { Crown } from 'lucide-react'
import type { LeaderboardEntry } from '@/data/dashboard'

interface LeaderboardProps {
  entries: LeaderboardEntry[]
}

const formClassMap: Record<'W' | 'L' | 'D', string> = {
  W: 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200',
  L: 'border-rose-400/40 bg-rose-500/20 text-rose-200',
  D: 'border-slate-400/40 bg-slate-500/20 text-slate-200',
}

export default function Leaderboard({ entries }: LeaderboardProps) {
  return (
    <section id="leaderboard" className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 sm:p-7">
      <div className="mb-5 flex items-center gap-2">
        <Crown className="h-4 w-4 text-amber-300" aria-hidden />
        <h2 className="text-lg font-bold text-white sm:text-xl">Ranking national EA FC</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
              <th className="px-3 py-3">Rang</th>
              <th className="px-3 py-3">Joueur</th>
              <th className="px-3 py-3">Club</th>
              <th className="px-3 py-3 text-right">Points</th>
              <th className="px-3 py-3 text-right">Win rate</th>
              <th className="px-3 py-3 text-right">Buts +/-</th>
              <th className="px-3 py-3">Forme</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.03]">
                <td className="px-3 py-3 font-semibold text-amber-300">#{entry.rank}</td>
                <td className="px-3 py-3 font-semibold text-white">{entry.gamertag}</td>
                <td className="px-3 py-3 text-slate-300">{entry.club}</td>
                <td className="px-3 py-3 text-right font-semibold text-emerald-300">{entry.points.toLocaleString('fr-FR')}</td>
                <td className="px-3 py-3 text-right text-slate-200">{entry.winRate.toFixed(1)}%</td>
                <td className="px-3 py-3 text-right text-slate-200">
                  {entry.goalsFor} / {entry.goalsAgainst}
                </td>
                <td className="px-3 py-3">
                  <div className="flex gap-1">
                    {entry.form.map((state, index) => (
                      <span key={`${entry.id}-${index}`} className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${formClassMap[state]}`}>
                        {state}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
