import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Search, Loader2, Filter, Users } from 'lucide-react';
import api from '@/lib/api';
import PlayerCard from '@/components/PlayerCard';

interface PlayerEntry {
  id: string;
  ea_persona_name: string | null;
  preferred_position: string | null;
  nationality: string | null;
  stats: {
    matches_played: number;
    goals: number;
    assists: number;
    average_rating: number;
  } | null;
}

interface TeamWithRoster {
  id: string;
  name: string;
  logo_url: string | null;
  members: {
    user: PlayerEntry;
  }[];
}

function computeOverall(stats: PlayerEntry['stats']): number {
  if (!stats || stats.matches_played === 0) return 50;
  const amr = stats.average_rating;
  const goalsPerGame = stats.goals / Math.max(stats.matches_played, 1);
  const assistsPerGame = stats.assists / Math.max(stats.matches_played, 1);
  const base = amr * 8;
  const bonus = Math.min((goalsPerGame + assistsPerGame * 0.6) * 3, 20);
  return Math.min(99, Math.max(40, Math.round(base + bonus)));
}

function estimateMarketValue(overall: number): number {
  if (overall >= 90) return 150_000_000;
  if (overall >= 85) return 80_000_000;
  if (overall >= 80) return 40_000_000;
  if (overall >= 75) return 20_000_000;
  if (overall >= 70) return 10_000_000;
  if (overall >= 65) return 5_000_000;
  if (overall >= 60) return 2_000_000;
  return 500_000;
}

export default function Store() {
  const [teams, setTeams] = useState<TeamWithRoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState<string>('ALL');

  useEffect(() => {
    let cancelled = false;
    api
      .get<TeamWithRoster[]>('/teams')
      .then(({ data }) => { if (!cancelled) setTeams(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const allPlayers = teams.flatMap((t) =>
    t.members.map((m) => ({
      ...m.user,
      teamName: t.name,
      teamLogo: t.logo_url,
    })),
  );

  const positions = ['ALL', ...new Set(allPlayers.map((p) => p.preferred_position).filter(Boolean))] as string[];

  const filtered = allPlayers.filter((p) => {
    const name = (p.ea_persona_name ?? '').toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (posFilter !== 'ALL' && p.preferred_position !== posFilter) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400/20 to-amber-400/5 border border-amber-400/20 flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-400/70">
            Market Place
          </span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Mercato</h1>
        <p className="mt-1 text-sm text-slate-500">
          Explorez les joueurs disponibles et leur valeur marchande
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un joueur…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:border-amber-400/30 focus:ring-1 focus:ring-amber-400/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={posFilter}
            onChange={(e) => setPosFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-amber-400/30 transition-all appearance-none cursor-pointer"
          >
            {positions.map((pos) => (
              <option key={pos} value={pos} className="bg-[#0D1221] text-white">
                {pos === 'ALL' ? 'Tous les postes' : pos}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-slate-600" />
        <span className="text-xs text-slate-500">
          {loading ? 'Chargement…' : `${filtered.length} joueur${filtered.length > 1 ? 's' : ''} trouvé${filtered.length > 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        </div>
      )}

      {/* Player grid */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 justify-items-center">
          {filtered.map((player) => {
            const overall = computeOverall(player.stats);
            const value = estimateMarketValue(overall);
            return (
              <Link
                key={player.id}
                to={`/dashboard/profile/${player.id}`}
                className="transition-transform duration-200 hover:scale-[1.03]"
              >
                <PlayerCard
                  rating={overall}
                  position={player.preferred_position ?? '??'}
                  name={player.ea_persona_name ?? 'Anonyme'}
                  goals={player.stats?.goals ?? 0}
                  assists={player.stats?.assists ?? 0}
                  appearances={player.stats?.matches_played ?? 0}
                  nationality={player.nationality ?? undefined}
                  clubName={player.teamName}
                  clubLogoUrl={player.teamLogo}
                  marketValue={value}
                />
              </Link>
            );
          })}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="rounded-2xl border border-white/5 bg-[#0D1221] p-12 text-center">
          <p className="text-slate-500 text-sm">Aucun joueur ne correspond à vos critères.</p>
        </div>
      )}
    </div>
  );
}
