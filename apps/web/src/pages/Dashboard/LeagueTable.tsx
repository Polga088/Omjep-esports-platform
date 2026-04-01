import { Crown, TrendingUp, ShieldAlert } from 'lucide-react';

export interface StandingRow {
  rank: number;
  team: { id: string; name: string; logo_url: string | null };
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  diff: number;
}

interface Props {
  standings: StandingRow[];
  myTeamId?: string | null;
  title?: string;
  /** Compact mode: hide label column headers description */
  compact?: boolean;
}


export default function LeagueTable({ standings, myTeamId, title = 'Classement', compact = false }: Props) {
  if (standings.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-[#0D1221] px-6 py-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6 text-slate-600" />
        </div>
        <p className="text-sm text-slate-500">Aucun classement disponible — les matchs n'ont pas encore été joués.</p>
      </div>
    );
  }

  const columns = compact
    ? ['#', 'Club', 'MJ', 'V', 'N', 'D', '+/-', 'Pts']
    : ['#', 'Club', 'MJ', 'V', 'N', 'D', 'BP', 'BC', '+/-', 'Pts'];

  return (
    <div className="rounded-2xl border border-white/5 bg-[#0D1221] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              {columns.map((col) => (
                <th
                  key={col}
                  className={`px-3 py-3 text-xs font-semibold uppercase tracking-widest text-slate-600 ${
                    col === 'Club' ? 'text-left pl-4' : 'text-center'
                  } ${col === '#' ? 'w-12' : ''}`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {standings.map((entry) => {
              const isMyTeam = entry.team.id === myTeamId;
              const isLeader = entry.rank === 1;

              return (
                <tr
                  key={entry.team.id}
                  className={`group transition-colors duration-150 ${
                    isMyTeam
                      ? 'bg-indigo-500/10 border-l-4 border-l-indigo-500'
                      : isLeader
                        ? 'bg-amber-500/[0.04] border-l-4 border-l-amber-400'
                        : 'hover:bg-white/[0.03] border-l-4 border-l-transparent'
                  }`}
                >
                  {/* Rank */}
                  <td className="px-3 py-3 text-center w-12">
                    {entry.rank === 1 ? (
                      <span role="img" aria-label="1er" className="text-base">🥇</span>
                    ) : entry.rank === 2 ? (
                      <span role="img" aria-label="2ème" className="text-base">🥈</span>
                    ) : entry.rank === 3 ? (
                      <span role="img" aria-label="3ème" className="text-base">🥉</span>
                    ) : (
                      <span className="text-sm font-bold text-slate-500 tabular-nums">{entry.rank}</span>
                    )}
                  </td>

                  {/* Club */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {entry.team.logo_url ? (
                        <img
                          src={entry.team.logo_url}
                          alt={entry.team.name}
                          className="w-7 h-7 rounded-lg object-cover border border-white/10 shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-white/10 flex items-center justify-center text-xs font-bold text-amber-400 uppercase shrink-0">
                          {entry.team.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p
                            className={`text-sm font-semibold truncate ${
                              isMyTeam ? 'text-indigo-300' : isLeader ? 'text-amber-200' : 'text-white group-hover:text-amber-400'
                            }`}
                          >
                            {entry.team.name}
                          </p>
                          {isLeader && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/25 text-amber-400">
                              <Crown className="w-3 h-3" />
                              <span className="text-[9px] font-bold uppercase tracking-wider">Leader</span>
                            </span>
                          )}
                        </div>
                        {isMyTeam && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Mon club</span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-3 text-center"><span className="text-sm text-slate-300 tabular-nums">{entry.played}</span></td>
                  <td className="px-3 py-3 text-center"><span className="text-sm font-semibold text-emerald-400 tabular-nums">{entry.won}</span></td>
                  <td className="px-3 py-3 text-center"><span className="text-sm text-slate-400 tabular-nums">{entry.drawn}</span></td>
                  <td className="px-3 py-3 text-center"><span className="text-sm font-semibold text-red-400 tabular-nums">{entry.lost}</span></td>

                  {!compact && (
                    <>
                      <td className="px-3 py-3 text-center"><span className="text-sm text-slate-300 tabular-nums">{entry.goalsFor}</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-sm text-slate-300 tabular-nums">{entry.goalsAgainst}</span></td>
                    </>
                  )}

                  {/* +/- */}
                  <td className="px-3 py-3 text-center">
                    <span className={`text-sm font-bold tabular-nums ${
                      entry.diff > 0 ? 'text-emerald-400' : entry.diff < 0 ? 'text-red-400' : 'text-slate-500'
                    }`}>
                      {entry.diff > 0 ? '+' : ''}{entry.diff}
                    </span>
                  </td>

                  {/* Pts */}
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-flex items-center justify-center w-9 h-7 rounded-lg text-sm font-black tabular-nums ${
                      isLeader
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                        : isMyTeam
                          ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25'
                          : 'text-white'
                    }`}>
                      {entry.points}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
