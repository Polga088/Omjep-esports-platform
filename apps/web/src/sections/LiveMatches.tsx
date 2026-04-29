import { Radio } from 'lucide-react'
import type { MatchItem } from '@/data/dashboard'

interface LiveMatchesProps {
  matches: MatchItem[]
}

const statusClassMap: Record<MatchItem['status'], string> = {
  LIVE: 'border-rose-400/40 bg-rose-500/20 text-rose-100',
  UPCOMING: 'border-amber-300/40 bg-amber-400/20 text-amber-100',
  FINISHED: 'border-emerald-400/40 bg-emerald-500/20 text-emerald-100',
}

export default function LiveMatches({ matches }: LiveMatchesProps) {
  return (
    <section id="live-matches" className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 sm:p-7">
      <div className="mb-5 flex items-center gap-2">
        <Radio className="h-4 w-4 text-rose-300" aria-hidden />
        <h2 className="text-lg font-bold text-white sm:text-xl">Matchs officiels</h2>
      </div>
      <div className="space-y-3">
        {matches.map((match) => (
          <article key={match.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-widest text-slate-400">{match.competition}</p>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider ${statusClassMap[match.status]}`}>
                {match.status === 'UPCOMING' ? 'Upcoming' : match.status}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">{match.stage}</p>
            <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <p className="truncate text-sm font-semibold text-white">{match.homeTeam}</p>
              <p className="text-center text-sm font-bold text-amber-300">
                {typeof match.homeScore === 'number' && typeof match.awayScore === 'number'
                  ? `${match.homeScore} - ${match.awayScore}`
                  : 'VS'}
              </p>
              <p className="truncate text-right text-sm font-semibold text-white">{match.awayTeam}</p>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>{match.kickoff}</span>
              <span>{match.venue}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
