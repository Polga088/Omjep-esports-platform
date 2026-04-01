import { useMemo, useState } from 'react';
import { Star, Trophy, LayoutGrid } from 'lucide-react';
import LeagueTable, { StandingRow } from './LeagueTable';
import type { MatchBrief } from './TournamentBrackets';
import CupView from './CupView';

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

export default function ChampionsView({ groups, knockoutRounds, myTeamId }: Props) {
  const [tab, setTab] = useState<'groups' | 'final'>('groups');

  const poolsComplete = useMemo(() => {
    if (groups.length === 0) return false;
    return groups.every(
      (g) => g.matches.length > 0 && g.matches.every((m) => m.status === 'PLAYED'),
    );
  }, [groups]);

  const hasKnockout = knockoutRounds.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 p-1 rounded-2xl bg-black/25 border border-amber-500/10">
        <button
          type="button"
          onClick={() => setTab('groups')}
          className={`flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
            tab === 'groups'
              ? 'bg-amber-500/15 text-amber-200 border border-amber-500/25 shadow-[0_0_20px_rgba(245,158,11,0.12)]'
              : 'text-slate-500 hover:text-slate-300 border border-transparent'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Phase de groupes
        </button>
        <button
          type="button"
          onClick={() => setTab('final')}
          className={`flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
            tab === 'final'
              ? 'bg-amber-500/15 text-amber-200 border border-amber-500/25 shadow-[0_0_20px_rgba(245,158,11,0.12)]'
              : 'text-slate-500 hover:text-slate-300 border border-transparent'
          }`}
        >
          <Trophy className="w-4 h-4" />
          Phase finale
          {hasKnockout && (
            <span className="text-[10px] font-semibold normal-case tracking-normal text-amber-400/80">
              ({knockoutRounds.reduce((a, r) => a + r.matches.length, 0)} matchs)
            </span>
          )}
        </button>
      </div>

      {tab === 'groups' && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/25 to-amber-900/20 border border-amber-500/20 flex items-center justify-center">
              <Star className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Mini-tableaux</h2>
              <p className="text-xs text-slate-500">
                {groups.length} groupe{groups.length > 1 ? 's' : ''}
                {poolsComplete ? ' · Phase de groupes terminée' : ''}
              </p>
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
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white tracking-wide">{group.name}</h3>
                    <span className="text-[10px] text-slate-600 bg-white/[0.04] px-2 py-1 rounded-full">
                      {group.matches.filter((m) => m.status === 'PLAYED').length}/
                      {group.matches.length} joués
                    </span>
                  </div>

                  <LeagueTable
                    standings={group.standings}
                    myTeamId={myTeamId}
                    title={group.name}
                    compact
                  />

                  {group.standings.length > 0 && (
                    <div className="flex items-center gap-2 text-[10px] text-slate-600 px-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500/60" />
                      <span>
                        Qualifiés :{' '}
                        {group.standings.slice(0, 2).map((s) => s.team.name).join(', ')}
                      </span>
                    </div>
                  )}

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
                          const isMyMatch =
                            match.homeTeam.id === myTeamId || match.awayTeam.id === myTeamId;
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
                              <span
                                className={`shrink-0 px-2 py-0.5 rounded-md font-black tabular-nums text-center min-w-[50px] ${
                                  isPlayed
                                    ? 'bg-white/[0.05] text-white'
                                    : 'text-slate-600 border border-dashed border-white/10'
                                }`}
                              >
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
      )}

      {tab === 'final' && (
        <section className="space-y-4">
          {!hasKnockout && (
            <div className="rounded-2xl border border-dashed border-amber-400/15 bg-amber-500/[0.03] px-5 py-8 text-center space-y-2">
              <span className="text-2xl inline-block">🏆</span>
              <p className="text-sm text-slate-400 font-medium">Phase à élimination directe</p>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                {poolsComplete
                  ? 'Le tableau final sera affiché dès que les matchs seront générés.'
                  : 'Disponible une fois tous les matchs de poule joués et le tirage au sort effectué.'}
              </p>
            </div>
          )}

          {hasKnockout && <CupView rounds={knockoutRounds} myTeamId={myTeamId} />}
        </section>
      )}
    </div>
  );
}
