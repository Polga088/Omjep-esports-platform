import { History } from 'lucide-react';
import LeagueTable, { StandingRow } from './LeagueTable';
import type { MatchBrief } from './TournamentBrackets';

interface Props {
  standings: StandingRow[];
  recentMatches: MatchBrief[];
  myTeamId?: string | null;
}

export default function LeagueView({ standings, recentMatches, myTeamId }: Props) {
  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
      <div className="min-w-0 space-y-3">
        <LeagueTable standings={standings} myTeamId={myTeamId} title="Classement général" />
      </div>

      <div className="min-w-0">
        <div className="rounded-2xl border border-white/5 bg-[#0D1221] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Derniers matchs</h3>
            <span className="ml-auto text-[10px] text-slate-600 bg-white/[0.04] px-2 py-0.5 rounded-full">
              {recentMatches.length} rencontre{recentMatches.length !== 1 ? 's' : ''}
            </span>
          </div>

          {recentMatches.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-500">
              Aucun match joué pour le moment.
            </div>
          ) : (
            <ul className="divide-y divide-white/5 max-h-[min(70vh,520px)] overflow-y-auto">
              {recentMatches.map((match) => {
                const isPlayed = match.status === 'PLAYED';
                const isMy =
                  match.homeTeam.id === myTeamId || match.awayTeam.id === myTeamId;
                return (
                  <li
                    key={match.id}
                    className={`px-4 py-3 flex items-center gap-3 text-xs ${
                      isMy ? 'bg-indigo-500/[0.06]' : ''
                    }`}
                  >
                    <span className="flex-1 text-right font-medium text-slate-300 truncate">
                      {match.homeTeam.name}
                    </span>
                    <span
                      className={`shrink-0 px-2.5 py-1 rounded-lg font-black tabular-nums min-w-[52px] text-center ${
                        isPlayed
                          ? 'bg-white/[0.06] text-white'
                          : 'text-slate-600 border border-dashed border-white/10'
                      }`}
                    >
                      {isPlayed ? `${match.home_score} – ${match.away_score}` : '—'}
                    </span>
                    <span className="flex-1 font-medium text-slate-300 truncate">
                      {match.awayTeam.name}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
