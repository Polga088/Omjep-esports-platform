import { Star } from 'lucide-react';
import LeagueTable, { StandingRow } from './LeagueTable';
import TournamentBrackets, { MatchBrief } from './TournamentBrackets';

interface Group {
  name: string;
  standings: StandingRow[];
  matches: MatchBrief[];
}

interface Props {
  groups: Group[];
  knockoutRounds: { name: string; matches: MatchBrief[] }[];
  myTeamId?: string | null;
}

export default function UCLGroupView({ groups, knockoutRounds, myTeamId }: Props) {
  return (
    <div className="space-y-10">
      {/* ── Group stage ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 flex items-center justify-center">
            <Star className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Phase de Groupes</h2>
            <p className="text-xs text-slate-500">{groups.length} groupe{groups.length > 1 ? 's' : ''} · Les 2 premiers de chaque groupe se qualifient</p>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center">
            <p className="text-sm text-slate-500">Phase de groupes non générée.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {groups.map((group) => (
              <div key={group.name} className="space-y-3">
                {/* Group header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white tracking-wide">{group.name}</h3>
                  <span className="text-[10px] text-slate-600 bg-white/[0.04] px-2 py-1 rounded-full">
                    {group.matches.filter((m) => m.status === 'PLAYED').length}/{group.matches.length} matchs joués
                  </span>
                </div>

                {/* Standings table (compact) */}
                <LeagueTable
                  standings={group.standings}
                  myTeamId={myTeamId}
                  title={group.name}
                  compact
                />

                {/* Qualification indicators */}
                {group.standings.length > 0 && (
                  <div className="flex items-center gap-2 text-[10px] text-slate-600 px-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500/60" />
                    <span>Qualifiés : {group.standings.slice(0, 2).map((s) => s.team.name).join(', ')}</span>
                  </div>
                )}

                {/* Group matches */}
                {group.matches.length > 0 && (
                  <details className="group/details">
                    <summary className="cursor-pointer text-[11px] font-semibold text-slate-500 hover:text-slate-300 transition-colors px-1 select-none list-none flex items-center gap-1.5">
                      <svg
                        className="w-3 h-3 transition-transform group-open/details:rotate-90"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                      Matchs du groupe ({group.matches.length})
                    </summary>
                    <div className="mt-2 space-y-1.5">
                      {group.matches.map((match) => {
                        const isPlayed = match.status === 'PLAYED';
                        const isMyMatch = match.homeTeam.id === myTeamId || match.awayTeam.id === myTeamId;
                        return (
                          <div
                            key={match.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                              isMyMatch
                                ? 'bg-indigo-500/[0.07] border border-indigo-500/15'
                                : 'bg-white/[0.02] border border-white/[0.05]'
                            }`}
                          >
                            <span className="flex-1 text-right font-medium text-slate-300 truncate">
                              {match.homeTeam.name}
                            </span>
                            <span className={`shrink-0 px-2 py-0.5 rounded-md font-black tabular-nums text-center min-w-[50px] ${
                              isPlayed
                                ? 'bg-white/[0.05] text-white'
                                : 'text-slate-600 border border-dashed border-white/10'
                            }`}>
                              {isPlayed ? `${match.home_score} – ${match.away_score}` : 'vs'}
                            </span>
                            <span className="flex-1 font-medium text-slate-300 truncate">
                              {match.awayTeam.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Knockout stage ──────────────────────────────────────────── */}
      {knockoutRounds.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center">
              <span className="text-base">🏆</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Phase à Élimination Directe</h2>
              <p className="text-xs text-slate-500">À partir des qualifiés des groupes</p>
            </div>
          </div>
          <TournamentBrackets rounds={knockoutRounds} myTeamId={myTeamId} />
        </section>
      )}

      {knockoutRounds.length === 0 && (
        <section className="rounded-2xl border border-dashed border-amber-400/10 py-10 text-center space-y-2">
          <span className="text-2xl">🏆</span>
          <p className="text-sm text-slate-500 font-medium">Phase à élimination directe</p>
          <p className="text-xs text-slate-600">Sera disponible une fois la phase de groupes terminée.</p>
        </section>
      )}
    </div>
  );
}
