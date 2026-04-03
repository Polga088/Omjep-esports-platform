import { useMemo, useState } from 'react';
import { Star, Trophy, LayoutGrid } from 'lucide-react';
import type { StandingRow } from './LeagueTable';
import type { MatchBrief } from './TournamentBrackets';
import CupView from './CupView';
import CompetitionGroups from './CompetitionGroups';

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
              <h2 className="text-base font-bold text-white">Groupes</h2>
              <p className="text-xs text-slate-500">
                Grille 2×2 (tablette) · 4 colonnes (grand écran) · {groups.length} groupe
                {groups.length > 1 ? 's' : ''}
                {poolsComplete ? ' · Phase terminée' : ''}
              </p>
            </div>
          </div>

          <CompetitionGroups groups={groups} myTeamId={myTeamId} />
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
