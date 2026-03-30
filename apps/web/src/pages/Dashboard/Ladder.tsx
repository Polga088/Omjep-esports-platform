import { useState, useEffect, useMemo } from 'react';
import { Trophy, Search, Users, ShieldAlert } from 'lucide-react';
import api from '@/lib/api';

interface LadderTeam {
  id: string;
  name: string;
  logo_url: string | null;
  memberCount: number;
  averageRating: number;
  totalGoals: number;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-white/5">
      <td className="px-6 py-4"><div className="h-5 w-8 rounded-md bg-white/5 animate-pulse" /></td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/5 animate-pulse shrink-0" />
          <div className="h-4 w-32 rounded-md bg-white/5 animate-pulse" />
        </div>
      </td>
      <td className="px-6 py-4"><div className="h-4 w-10 rounded-md bg-white/5 animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-4 w-12 rounded-md bg-white/5 animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-4 w-10 rounded-md bg-white/5 animate-pulse" /></td>
    </tr>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-2xl leading-none" role="img" aria-label="1er">🥇</span>;
  if (rank === 2) return <span className="text-2xl leading-none" role="img" aria-label="2ème">🥈</span>;
  if (rank === 3) return <span className="text-2xl leading-none" role="img" aria-label="3ème">🥉</span>;
  return <span className="text-sm font-bold text-slate-500 tabular-nums">{rank}</span>;
}

function RatingPill({ value }: { value: number }) {
  const color =
    value >= 8   ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
    value >= 6.5 ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                   'text-amber-400 bg-amber-500/10 border-amber-500/20';

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border tabular-nums ${color}`}>
      {value > 0 ? value.toFixed(1) : 'N/A'}
    </span>
  );
}

export default function Ladder() {
  const [teams, setTeams] = useState<LadderTeam[]>([]);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const [ladderRes, myTeamRes] = await Promise.allSettled([
          api.get<LadderTeam[]>('/teams/ladder'),
          api.get<{ id: string }>('/teams/my-team'),
        ]);

        if (cancelled) return;

        if (ladderRes.status === 'fulfilled') {
          setTeams(ladderRes.value.data);
        } else {
          setError('Impossible de charger le classement.');
        }

        if (myTeamRes.status === 'fulfilled') {
          setMyTeamId(myTeamRes.value.data.id);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return teams;
    const q = search.toLowerCase();
    return teams.filter((t) => t.name.toLowerCase().includes(q));
  }, [teams, search]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-400/70">Ligue</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Classement</h1>
          <p className="mt-1 text-sm text-slate-500">
            {loading ? '\u00a0' : `${teams.length} club${teams.length > 1 ? 's' : ''} enregistré${teams.length > 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher un club…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0D1221] border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#00D4FF]/40 focus:ring-1 focus:ring-[#00D4FF]/20 transition-all"
          />
        </div>
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-white/5 bg-[#0D1221] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Leaderboard</h2>
          </div>
          <span className="text-xs text-slate-600 bg-white/5 px-2.5 py-1 rounded-full">
            Saison 2025
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['#', 'Club', 'Joueurs', 'Note Moy.', 'Buts'].map((col) => (
                  <th
                    key={col}
                    className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-600"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                        {search.trim() ? (
                          <Search className="w-6 h-6 text-slate-600" />
                        ) : (
                          <ShieldAlert className="w-6 h-6 text-slate-600" />
                        )}
                      </div>
                      <p className="text-sm text-slate-500">
                        {search.trim()
                          ? `Aucun club trouvé pour « ${search} »`
                          : 'Aucun club dans le classement.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((team, index) => {
                  const globalRank = teams.indexOf(team) + 1;
                  const isMyTeam = team.id === myTeamId;

                  return (
                    <tr
                      key={team.id}
                      className={`group transition-colors duration-150 ${
                        isMyTeam
                          ? 'bg-indigo-500/5 border-l-4 border-l-indigo-500'
                          : 'hover:bg-white/[0.03] border-l-4 border-l-transparent'
                      }`}
                    >
                      {/* Rank */}
                      <td className="px-6 py-4 w-16">
                        <RankBadge rank={globalRank} />
                      </td>

                      {/* Club */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {team.logo_url ? (
                            <img
                              src={team.logo_url}
                              alt={team.name}
                              className="w-9 h-9 rounded-xl object-cover border border-white/10 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00D4FF]/20 to-[#FF6B35]/10 border border-white/10 flex items-center justify-center text-sm font-bold text-[#00D4FF] uppercase shrink-0">
                              {team.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className={`text-sm font-semibold transition-colors ${
                              isMyTeam
                                ? 'text-indigo-300'
                                : 'text-white group-hover:text-[#00D4FF]'
                            }`}>
                              {team.name}
                            </p>
                            {isMyTeam && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                                Mon club
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Members */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-600" />
                          <span className="text-sm font-bold text-white tabular-nums">
                            {team.memberCount}
                          </span>
                        </div>
                      </td>

                      {/* Average Rating */}
                      <td className="px-6 py-4">
                        <RatingPill value={team.averageRating} />
                      </td>

                      {/* Goals */}
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-white tabular-nums">
                          {team.totalGoals}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-xs text-slate-600">
            {loading
              ? '…'
              : search.trim()
                ? `${filtered.length} résultat${filtered.length > 1 ? 's' : ''}`
                : `${teams.length} club${teams.length > 1 ? 's' : ''} au total`}
          </span>
          <span className="text-xs text-slate-700">Données live — v1.0</span>
        </div>
      </div>
    </div>
  );
}
