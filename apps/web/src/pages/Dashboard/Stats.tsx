import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Trophy, Zap, ArrowLeft, Loader2, ShieldAlert, Crown,
} from 'lucide-react';
import api from '@/lib/api';

function PlayerLink({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <Link to={`/dashboard/profile/${id}`} className={className}>
      {children}
    </Link>
  );
}

interface TopPlayer {
  player: { id: string; ea_persona_name: string | null };
  team: { id: string; name: string; logo_url: string | null };
  count: number;
}

interface TopStatsResponse {
  topScorers: TopPlayer[];
  topAssisters: TopPlayer[];
}

type TabKey = 'scorers' | 'assisters';

const MEDAL_RING: Record<number, string> = {
  0: 'ring-amber-400 shadow-amber-400/40',
  1: 'ring-slate-300 shadow-slate-300/30',
  2: 'ring-amber-700 shadow-amber-700/30',
};

const MEDAL_BG: Record<number, string> = {
  0: 'from-amber-400/25 to-amber-600/10',
  1: 'from-slate-300/20 to-slate-500/5',
  2: 'from-amber-700/20 to-amber-800/5',
};

const MEDAL_TEXT: Record<number, string> = {
  0: 'text-amber-300',
  1: 'text-slate-300',
  2: 'text-amber-600',
};

const MEDAL_LABEL = ['1er', '2ème', '3ème'];

function PodiumAvatar({ player, index }: { player: TopPlayer; index: number }) {
  const isFirst = index === 0;
  const size = isFirst ? 'w-24 h-24' : 'w-18 h-18';
  const textSize = isFirst ? 'text-2xl' : 'text-lg';
  const nameSize = isFirst ? 'text-lg' : 'text-sm';
  const countSize = isFirst ? 'text-3xl' : 'text-xl';
  const initial = (player.player.ea_persona_name ?? '?').charAt(0).toUpperCase();

  return (
    <div className={`flex flex-col items-center gap-2 ${isFirst ? 'order-2 -mt-4' : index === 1 ? 'order-1 mt-6' : 'order-3 mt-6'}`}>
      {isFirst && <Crown className="w-7 h-7 text-amber-400 mb-1 animate-[float_3s_ease-in-out_infinite]" />}

      <div className={`relative ${size} rounded-full bg-gradient-to-br ${MEDAL_BG[index]} ring-2 ${MEDAL_RING[index]} flex items-center justify-center shadow-lg`}>
        <span className={`font-black ${textSize} ${MEDAL_TEXT[index]} uppercase`}>{initial}</span>
        <span className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-[#0D1221] border-2 border-white/10 flex items-center justify-center text-[10px] font-black text-white">
          {MEDAL_LABEL[index]}
        </span>
      </div>

      <PlayerLink id={player.player.id} className={`font-bold ${nameSize} text-white text-center truncate max-w-[120px] hover:text-amber-300 transition-colors`}>
        {player.player.ea_persona_name ?? 'Anonyme'}
      </PlayerLink>

      <div className="flex items-center gap-1.5">
        {player.team.logo_url ? (
          <img src={player.team.logo_url} alt="" className="w-4 h-4 rounded object-cover" />
        ) : (
          <div className="w-4 h-4 rounded bg-white/10 flex items-center justify-center text-[7px] font-bold text-slate-400">
            {player.team.name.charAt(0)}
          </div>
        )}
        <span className="text-[11px] text-slate-500 truncate max-w-[80px]">{player.team.name}</span>
      </div>

      <span className={`font-black ${countSize} bg-gradient-to-b ${
        isFirst ? 'from-amber-300 to-amber-500' : index === 1 ? 'from-slate-200 to-slate-400' : 'from-amber-600 to-amber-800'
      } bg-clip-text text-transparent tabular-nums`}>
        {player.count}
      </span>
    </div>
  );
}

function Podium({ players, label }: { players: TopPlayer[]; label: string }) {
  const top3 = players.slice(0, 3);

  if (top3.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
          <ShieldAlert className="w-7 h-7 text-slate-600" />
        </div>
        <p className="text-sm text-slate-500">
          Aucun {label.toLowerCase()} enregistré pour cette compétition.
        </p>
      </div>
    );
  }

  return (
    <div className="relative py-8">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-amber-500/[0.04] blur-[100px]" />
      </div>

      <div className="relative flex items-end justify-center gap-6 sm:gap-10">
        {top3.length > 1 && <PodiumAvatar player={top3[1]} index={1} />}
        <PodiumAvatar player={top3[0]} index={0} />
        {top3.length > 2 && <PodiumAvatar player={top3[2]} index={2} />}
      </div>

      <div className="flex justify-center gap-6 sm:gap-10 mt-4">
        {[top3[1], top3[0], top3[2]].map((_, i) => {
          const heights = ['h-16', 'h-24', 'h-12'];
          const bgs = ['bg-slate-300/10', 'bg-amber-400/15', 'bg-amber-700/10'];
          const borders = ['border-slate-300/20', 'border-amber-400/25', 'border-amber-700/20'];
          if (!top3[i === 1 ? 0 : i === 0 ? 1 : 2]) return <div key={i} className="w-24" />;
          return (
            <div
              key={i}
              className={`${heights[i]} w-20 sm:w-24 rounded-t-xl ${bgs[i]} border-t ${borders[i]} border-x ${borders[i]}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function RankTable({ players }: { players: TopPlayer[] }) {
  const rest = players.slice(3, 10);

  if (rest.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/5 bg-[#0D1221] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              {['#', 'Joueur', 'Club', 'Total'].map((col) => (
                <th
                  key={col}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-600 ${
                    col === 'Joueur' || col === 'Club' ? 'text-left' : 'text-center'
                  }`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rest.map((entry, i) => {
              const rank = i + 4;
              return (
                <tr key={entry.player.id} className="group hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3.5 text-center w-14">
                    <span className="text-sm font-bold text-slate-500 tabular-nums">{rank}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400/15 to-amber-600/10 border border-white/10 flex items-center justify-center text-xs font-bold text-amber-400 uppercase shrink-0">
                        {(entry.player.ea_persona_name ?? '?').charAt(0)}
                      </div>
                      <PlayerLink id={entry.player.id} className="text-sm font-semibold text-white group-hover:text-amber-400 transition-colors truncate">
                        {entry.player.ea_persona_name ?? 'Anonyme'}
                      </PlayerLink>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      {entry.team.logo_url ? (
                        <img src={entry.team.logo_url} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-[8px] font-bold text-slate-400 shrink-0">
                          {entry.team.name.charAt(0)}
                        </div>
                      )}
                      <span className="text-sm text-slate-400 truncate">{entry.team.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-flex items-center justify-center w-9 h-7 rounded-lg bg-white/[0.05] text-sm font-black text-white tabular-nums">
                      {entry.count}
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

export default function Stats() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<TopStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('scorers');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get<TopStatsResponse>(`/competitions/${id}/top-stats`);
        if (!cancelled) setData(res.data);
      } catch {
        if (!cancelled) setError('Impossible de charger les statistiques.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id]);

  const tabs: { key: TabKey; label: string; icon: typeof Trophy }[] = [
    { key: 'scorers', label: "Soulier d'Or", icon: Trophy },
    { key: 'assisters', label: 'Maîtres à jouer', icon: Zap },
  ];

  const currentPlayers =
    tab === 'scorers' ? (data?.topScorers ?? []) : (data?.topAssisters ?? []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          to={`/dashboard/competitions/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-amber-400 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour au classement
        </Link>

        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-400/70">
            Statistiques
          </span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          Podium des Légendes
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Les meilleurs buteurs et passeurs de la compétition
        </p>
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        </div>
      )}

      {/* Content */}
      {!loading && !error && data && (
        <>
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-amber-400/10 w-fit">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  tab === key
                    ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20 shadow-sm'
                    : 'text-slate-500 hover:text-slate-300 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                <span className={`ml-1 text-xs px-2 py-0.5 rounded-full ${
                  tab === key ? 'bg-amber-400/20 text-amber-400' : 'bg-white/[0.05] text-slate-600'
                }`}>
                  {key === 'scorers' ? data.topScorers.length : data.topAssisters.length}
                </span>
              </button>
            ))}
          </div>

          {/* Podium */}
          <div className="rounded-2xl border border-white/5 bg-[#0D1221] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {tab === 'scorers' ? (
                  <Trophy className="w-4 h-4 text-amber-400" />
                ) : (
                  <Zap className="w-4 h-4 text-amber-400" />
                )}
                <h2 className="text-sm font-semibold text-white">
                  {tab === 'scorers' ? 'Top Buteurs' : 'Top Passeurs'}
                </h2>
              </div>
              <span className="text-xs text-slate-600 bg-white/5 px-2.5 py-1 rounded-full">
                Top 3
              </span>
            </div>

            <Podium
              players={currentPlayers}
              label={tab === 'scorers' ? 'buteur' : 'passeur'}
            />
          </div>

          {/* Remaining table (4-10) */}
          {currentPlayers.length > 3 && (
            <div>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
                Classement complet
              </h2>
              <RankTable players={currentPlayers} />
            </div>
          )}
        </>
      )}

      {/* Float animation keyframe */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
