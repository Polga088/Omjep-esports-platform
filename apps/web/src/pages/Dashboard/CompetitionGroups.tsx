import PlayerIdentity from '@/components/PlayerIdentity';
import type { StandingRow } from './LeagueTable';
import type { MatchBrief } from './TournamentBrackets';

export interface CompetitionGroupData {
  name: string;
  standings: StandingRow[];
  matches: MatchBrief[];
}

interface Props {
  groups: CompetitionGroupData[];
  myTeamId?: string | null;
}

/**
 * Phase de groupes type UCL : grille 2×2 (sm+) ou 4 colonnes (xl+), cartes #08090c + bordure 0.5px.
 */
export default function CompetitionGroups({ groups, myTeamId }: Props) {
  if (groups.length === 0) {
    return (
      <div className="rounded-xl border-[0.5px] border-dashed border-white/10 bg-[#08090c] py-12 text-center">
        <p className="font-mono text-xs text-slate-500">Phase de groupes non générée.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {groups.map((group) => (
        <GroupCard key={group.name} group={group} myTeamId={myTeamId} />
      ))}
    </div>
  );
}

function GroupCard({
  group,
  myTeamId,
}: {
  group: CompetitionGroupData;
  myTeamId?: string | null;
}) {
  const playedCount = group.matches.filter((m) => m.status === 'PLAYED').length;

  return (
    <div className="flex flex-col rounded-xl border-[0.5px] border-white/10 bg-[#08090c] overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5">
        <h3 className="font-mono text-[11px] font-medium uppercase tracking-wider text-slate-300 truncate">
          {group.name}
        </h3>
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-slate-600">
          {playedCount}/{group.matches.length}
        </span>
      </div>

      {group.standings.length === 0 ? (
        <div className="px-3 py-6 text-center font-mono text-[11px] text-slate-600">
          En attente de matchs joués
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-2 py-2 font-mono text-[9px] font-medium uppercase tracking-wider text-slate-600 w-8">
                  #
                </th>
                <th className="px-2 py-2 font-mono text-[9px] font-medium uppercase tracking-wider text-slate-600">
                  Club
                </th>
                <th className="px-1 py-2 font-mono text-[9px] font-medium uppercase tracking-wider text-slate-600 text-center w-7">
                  J
                </th>
                <th className="px-1 py-2 font-mono text-[9px] font-medium uppercase tracking-wider text-slate-600 text-center w-7">
                  V
                </th>
                <th className="px-1 py-2 font-mono text-[9px] font-medium uppercase tracking-wider text-slate-600 text-center w-7">
                  N
                </th>
                <th className="px-1 py-2 font-mono text-[9px] font-medium uppercase tracking-wider text-slate-600 text-center w-7">
                  D
                </th>
                <th className="px-1 py-2 font-mono text-[9px] font-medium uppercase tracking-wider text-slate-600 text-center w-8">
                  +/-
                </th>
                <th className="px-2 py-2 font-mono text-[9px] font-medium uppercase tracking-wider text-slate-600 text-center w-9">
                  Pts
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {group.standings.map((entry) => {
                const isMyTeam = entry.team.id === myTeamId;
                const q = entry.rank <= 2;
                return (
                  <tr
                    key={entry.team.id}
                    className={
                      isMyTeam
                        ? 'bg-white/[0.04]'
                        : q
                          ? 'bg-white/[0.02]'
                          : undefined
                    }
                  >
                    <td className="px-2 py-2 align-middle">
                      <span className="font-mono text-xs tabular-nums text-slate-500">{entry.rank}</span>
                    </td>
                    <td className="px-2 py-1.5 align-middle min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <PlayerIdentity
                          size="xs"
                          initial={(entry.team.name || '?').slice(0, 1).toUpperCase()}
                          avatarUrl={entry.team.logo_url}
                          rarity="common"
                          imgAlt={entry.team.name}
                          className="shrink-0"
                        />
                        <span
                          className={`min-w-0 truncate font-mono text-[11px] ${
                            isMyTeam ? 'text-slate-100' : 'text-slate-400'
                          }`}
                        >
                          {entry.team.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-1 py-2 text-center font-mono text-[11px] tabular-nums text-slate-500">
                      {entry.played}
                    </td>
                    <td className="px-1 py-2 text-center font-mono text-[11px] tabular-nums text-slate-400">
                      {entry.won}
                    </td>
                    <td className="px-1 py-2 text-center font-mono text-[11px] tabular-nums text-slate-500">
                      {entry.drawn}
                    </td>
                    <td className="px-1 py-2 text-center font-mono text-[11px] tabular-nums text-slate-500">
                      {entry.lost}
                    </td>
                    <td
                      className={`px-1 py-2 text-center font-mono text-[11px] tabular-nums ${
                        entry.diff > 0
                          ? 'text-slate-300'
                          : entry.diff < 0
                            ? 'text-slate-600'
                            : 'text-slate-500'
                      }`}
                    >
                      {entry.diff > 0 ? `+${entry.diff}` : entry.diff}
                    </td>
                    <td className="px-2 py-2 text-center font-mono text-xs font-semibold tabular-nums text-slate-200">
                      {entry.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {group.standings.length > 0 && (
        <div className="border-t border-white/10 px-3 py-2 font-mono text-[10px] text-slate-600">
          Qualifiés : {group.standings.slice(0, 2).map((s) => s.team.name).join(' · ')}
        </div>
      )}

      {group.matches.length > 0 && (
        <details className="group/details border-t border-white/10">
          <summary className="cursor-pointer list-none px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-slate-600 hover:text-slate-400 select-none flex items-center gap-1.5">
            <span className="transition-transform group-open/details:rotate-90 inline-block">›</span>
            Matchs ({group.matches.length})
          </summary>
          <div className="space-y-1 px-2 pb-2">
            {group.matches.map((match) => {
              const isPlayed = match.status === 'PLAYED';
              const isMyMatch =
                match.homeTeam.id === myTeamId || match.awayTeam.id === myTeamId;
              return (
                <div
                  key={match.id}
                  className={`rounded border-[0.5px] px-2 py-1.5 font-mono text-[10px] ${
                    isMyMatch ? 'border-white/15 bg-white/[0.03]' : 'border-white/10 bg-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-right text-slate-500 truncate">{match.homeTeam.name}</span>
                    <span className="shrink-0 tabular-nums text-slate-400">
                      {isPlayed ? `${match.home_score}–${match.away_score}` : 'vs'}
                    </span>
                    <span className="flex-1 text-slate-500 truncate">{match.awayTeam.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
