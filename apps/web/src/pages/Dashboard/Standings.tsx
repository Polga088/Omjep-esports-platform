import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Trophy, ArrowLeft, Crown, ShieldAlert, TrendingUp } from 'lucide-react';
import api from '@/lib/api';

interface StandingTeam {
  rank: number;
  team: {
    id: string;
    name: string;
    logo_url: string | null;
  };
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form?: ('W' | 'D' | 'L')[];
}

interface CompetitionInfo {
  id: string;
  name: string;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-white/5">
      <td className="px-4 py-3.5"><div className="h-5 w-8 rounded-md bg-white/5 animate-pulse mx-auto" /></td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5 animate-pulse shrink-0" />
          <div className="h-4 w-28 rounded-md bg-white/5 animate-pulse" />
        </div>
      </td>
      {[...Array(8)].map((_, i) => (
        <td key={i} className="px-3 py-3.5"><div className="h-4 w-7 rounded-md bg-white/5 animate-pulse mx-auto" /></td>
      ))}
    </tr>
  );
}

function FormDot({ result }: { result: 'W' | 'D' | 'L' }) {
  const config = {
    W: 'bg-emerald-500 shadow-emerald-500/40',
    D: 'bg-slate-400 shadow-slate-400/40',
    L: 'bg-red-500 shadow-red-500/40',
  };
  const label = { W: 'V', D: 'N', L: 'D' };

  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold text-white shadow-sm ${config[result]}`}
      title={result === 'W' ? 'Victoire' : result === 'D' ? 'Nul' : 'Défaite'}
    >
      {label[result]}
    </span>
  );
}

export default function Standings() {
  const { id } = useParams<{ id: string }>();
  const [standings, setStandings] = useState<StandingTeam[]>([]);
  const [competition, setCompetition] = useState<CompetitionInfo | null>(null);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function fetchData() {
      try {
        const [standingsRes, teamRes] = await Promise.allSettled([
          api.get<{ competition: CompetitionInfo; standings: StandingTeam[] }>(
            `/competitions/${id}/standings`,
          ),
          api.get<{ id: string }>('/teams/my-team'),
        ]);

        if (cancelled) return;

        if (standingsRes.status === 'fulfilled') {
          setCompetition(standingsRes.value.data.competition);
          setStandings(standingsRes.value.data.standings);
        } else {
          setError('Impossible de charger le classement de cette compétition.');
        }

        if (teamRes.status === 'fulfilled') {
          setMyTeamId(teamRes.value.data.id);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [id]);

  const columns = ['#', 'Club', 'MJ', 'V', 'N', 'D', 'BP', 'BC', '+/-', 'Pts'];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          to="/dashboard/matches"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#00D4FF] transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour aux matchs
        </Link>

        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-400/70">Compétition</span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          {loading ? (
            <span className="inline-block w-56 h-8 rounded-lg bg-white/5 animate-pulse" />
          ) : (
            competition?.name ?? 'Classement'
          )}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {loading ? '\u00a0' : `${standings.length} club${standings.length > 1 ? 's' : ''} en lice`}
        </p>
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Standings Table */}
      <div className="rounded-2xl border border-white/5 bg-[#0D1221] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Classement Général</h2>
          </div>
          <span className="text-xs text-slate-600 bg-white/5 px-2.5 py-1 rounded-full">
            Saison 2025
          </span>
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
                    } ${col === '#' ? 'w-14' : ''}`}
                  >
                    {col}
                  </th>
                ))}
                {standings.some((s) => s.form && s.form.length > 0) && (
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-widest text-slate-600 text-center">
                    Forme
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [...Array(10)].map((_, i) => <SkeletonRow key={i} />)
              ) : standings.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                        <ShieldAlert className="w-6 h-6 text-slate-600" />
                      </div>
                      <p className="text-sm text-slate-500">
                        Aucun classement disponible pour cette compétition.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                standings.map((entry) => {
                  const isMyTeam = entry.team.id === myTeamId;
                  const isLeader = entry.rank === 1;
                  const hasForm = standings.some((s) => s.form && s.form.length > 0);

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
                      <td className="px-3 py-3.5 text-center w-14">
                        {isLeader ? (
                          <span className="text-lg leading-none" role="img" aria-label="1er">🥇</span>
                        ) : entry.rank === 2 ? (
                          <span className="text-lg leading-none" role="img" aria-label="2ème">🥈</span>
                        ) : entry.rank === 3 ? (
                          <span className="text-lg leading-none" role="img" aria-label="3ème">🥉</span>
                        ) : (
                          <span className="text-sm font-bold text-slate-500 tabular-nums">{entry.rank}</span>
                        )}
                      </td>

                      {/* Club */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          {entry.team.logo_url ? (
                            <img
                              src={entry.team.logo_url}
                              alt={entry.team.name}
                              className="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D4FF]/20 to-[#FF6B35]/10 border border-white/10 flex items-center justify-center text-xs font-bold text-[#00D4FF] uppercase shrink-0">
                              {entry.team.name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p
                                className={`text-sm font-semibold truncate transition-colors ${
                                  isMyTeam
                                    ? 'text-indigo-300'
                                    : isLeader
                                      ? 'text-amber-200 group-hover:text-amber-100'
                                      : 'text-white group-hover:text-[#00D4FF]'
                                }`}
                              >
                                {entry.team.name}
                              </p>
                              {isLeader && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/25 text-amber-400">
                                  <Crown className="w-3 h-3" />
                                  <span className="text-[9px] font-bold uppercase tracking-wider">Champion</span>
                                </span>
                              )}
                            </div>
                            {isMyTeam && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                                Mon club
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* MJ */}
                      <td className="px-3 py-3.5 text-center">
                        <span className="text-sm text-slate-300 tabular-nums">{entry.played}</span>
                      </td>

                      {/* V */}
                      <td className="px-3 py-3.5 text-center">
                        <span className="text-sm font-semibold text-emerald-400 tabular-nums">{entry.won}</span>
                      </td>

                      {/* N */}
                      <td className="px-3 py-3.5 text-center">
                        <span className="text-sm text-slate-400 tabular-nums">{entry.drawn}</span>
                      </td>

                      {/* D */}
                      <td className="px-3 py-3.5 text-center">
                        <span className="text-sm font-semibold text-red-400 tabular-nums">{entry.lost}</span>
                      </td>

                      {/* BP */}
                      <td className="px-3 py-3.5 text-center">
                        <span className="text-sm text-slate-300 tabular-nums">{entry.goalsFor}</span>
                      </td>

                      {/* BC */}
                      <td className="px-3 py-3.5 text-center">
                        <span className="text-sm text-slate-300 tabular-nums">{entry.goalsAgainst}</span>
                      </td>

                      {/* +/- */}
                      <td className="px-3 py-3.5 text-center">
                        <span
                          className={`text-sm font-bold tabular-nums ${
                            entry.goalDifference > 0
                              ? 'text-emerald-400'
                              : entry.goalDifference < 0
                                ? 'text-red-400'
                                : 'text-slate-500'
                          }`}
                        >
                          {entry.goalDifference > 0 ? '+' : ''}{entry.goalDifference}
                        </span>
                      </td>

                      {/* Pts */}
                      <td className="px-3 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-9 h-7 rounded-lg text-sm font-black tabular-nums ${
                            isLeader
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                              : isMyTeam
                                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25'
                                : 'text-white'
                          }`}
                        >
                          {entry.points}
                        </span>
                      </td>

                      {/* Form */}
                      {hasForm && (
                        <td className="px-3 py-3.5">
                          <div className="flex items-center justify-center gap-1">
                            {(entry.form ?? []).slice(-5).map((result, i) => (
                              <FormDot key={i} result={result} />
                            ))}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-xs text-slate-600">
            {loading ? '…' : `${standings.length} club${standings.length > 1 ? 's' : ''} au total`}
          </span>
          <span className="text-xs text-slate-700">Données live — v1.0</span>
        </div>
      </div>
    </div>
  );
}
