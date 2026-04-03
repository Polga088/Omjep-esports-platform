import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronUp, Loader2, Minus, Trophy, Users } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { PlayerIdentity, type PlayerIdentityRarity } from '@/components/PlayerIdentity';
import RankBadge from '@/components/RankBadge';
import MaintenancePrestige, { PRESTIGE_MSG } from '@/components/MaintenancePrestige';
import { useLeaderboardRankDeltas } from '@/hooks/useLeaderboardRankDeltas';

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  position: string | null;
  level: number;
  xp: number;
  goals: number;
  assists: number;
  matchesPlayed: number;
  averageRating: number;
  team: {
    id: string;
    name: string;
    logo_url: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
  } | null;
  avatarUrl: string | null;
  avatarRarity: string;
  activeFrameUrl: string | null;
  activeJerseyId: string | null;
  teamPrimaryColor?: string;
  teamSecondaryColor?: string;
}

function normalizeRarity(raw: string | undefined | null): PlayerIdentityRarity {
  const v = (raw ?? 'common').toLowerCase();
  if (v === 'premium' || v === 'legendary' || v === 'common') return v;
  return 'common';
}

/** Grille alignée header + lignes (page Classement + bloc Parcours). */
export const LEADERBOARD_ROW_GRID_CLASS =
  'grid w-full grid-cols-[minmax(0,2.5rem)_minmax(0,1.25rem)_minmax(0,1fr)_2.5rem_4.5rem_3.75rem] items-center gap-x-2 gap-y-1 px-3 py-2.5 sm:grid-cols-[minmax(0,2.75rem)_minmax(0,1.25rem)_minmax(0,1fr)_2.75rem_5rem_4rem] sm:px-4';

function RankTrendIcon({ delta }: { delta: number | undefined }) {
  if (delta === undefined || delta === 0) {
    return <Minus className="h-2 w-2 shrink-0 text-white/20" strokeWidth={2.5} aria-hidden />;
  }
  if (delta > 0) {
    return <ChevronUp className="h-2 w-2 shrink-0 text-emerald-400" strokeWidth={2.5} aria-hidden />;
  }
  return <ChevronDown className="h-2 w-2 shrink-0 text-red-400/90" strokeWidth={2.5} aria-hidden />;
}

export function LeaderboardRow({
  entry,
  isMe,
  rankDelta,
  isLast,
}: {
  entry: LeaderboardEntry;
  isMe: boolean;
  rankDelta?: number;
  isLast?: boolean;
}) {
  return (
    <Link
      to={`/dashboard/profile/${entry.id}`}
      className={`leaderboard-row group block transition-colors duration-150 hover:bg-white/[0.02] ${
        isMe ? 'border-l-2 border-cyan-400 bg-white/[0.04]' : 'border-l-2 border-transparent'
      } ${!isLast ? 'border-b-[0.5px] border-white/[0.05]' : ''}`}
    >
      <div className={LEADERBOARD_ROW_GRID_CLASS}>
        <div className="text-center font-mono text-xs font-semibold tabular-nums text-white/80">
          {entry.rank}
        </div>
        <div className="flex justify-center" aria-hidden>
          <RankTrendIcon delta={rankDelta} />
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#0c0e12] ring-1 ring-white/10">
            <PlayerIdentity
              initial={entry.name.charAt(0) || '?'}
              avatarUrl={entry.avatarUrl}
              rarity={normalizeRarity(entry.avatarRarity)}
              activeFrameUrl={entry.activeFrameUrl}
              royalEagleFrame={false}
              activeJerseyId={entry.activeJerseyId}
              teamPrimaryColor={entry.teamPrimaryColor}
              teamSecondaryColor={entry.teamSecondaryColor}
              size="xs"
              imgAlt={entry.name}
              className="pointer-events-none"
            />
          </div>
          <RankBadge level={entry.level} size="sm" className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p
              className={`truncate text-sm font-semibold leading-tight ${
                isMe ? 'text-cyan-200' : 'text-white group-hover:text-white'
              }`}
            >
              {entry.name}
              {isMe ? (
                <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider text-cyan-400/80">
                  (vous)
                </span>
              ) : null}
            </p>
            <p className="truncate text-[10px] text-white/35">
              {entry.team?.name ? entry.team.name : '—'}
              {entry.position ? ` · ${entry.position}` : ''}
            </p>
          </div>
        </div>
        <div className="text-right font-mono text-xs font-bold tabular-nums text-white/90">{entry.level}</div>
        <div className="text-right font-mono text-xs font-semibold tabular-nums text-white/90">
          {entry.xp.toLocaleString('fr-FR')}
        </div>
        <div className="text-right font-mono text-xs font-semibold tabular-nums text-white/90">
          {entry.matchesPlayed}
        </div>
      </div>
    </Link>
  );
}

export default function Leaderboard() {
  const { user } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rankDeltas = useLeaderboardRankDeltas(leaderboard);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<LeaderboardEntry[]>('/gamification/leaderboard?limit=50');
        if (!cancelled) setLeaderboard(data ?? []);
      } catch {
        if (!cancelled) setError('Impossible de charger le classement global.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-center gap-4">
        <Link
          to="/dashboard/gamification"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/40 transition-colors hover:text-white/70"
        >
          <ChevronLeft className="h-4 w-4" />
          Mon Parcours
        </Link>
      </div>

      <div className="rounded-[12px] border-[0.5px] border-white/10 bg-[#08090c] p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border-[0.5px] border-white/10 bg-white/[0.03]">
            <Trophy className="h-5 w-5 text-amber-400/90" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-black tracking-tight text-white">Classement global</h1>
            <p className="mt-0.5 text-xs text-white/35">XP — Top joueurs de la plateforme</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-[12px] border-[0.5px] border-white/10 bg-[#08090c] py-16">
          <Loader2 className="h-8 w-8 animate-spin text-white/30" />
          <p className="text-sm text-white/35">Chargement du classement…</p>
        </div>
      ) : error ? (
        <MaintenancePrestige
          overlay
          title="Classement global"
          message={PRESTIGE_MSG}
          className="border-white/10"
        />
      ) : null}

      {!loading && !error ? (
        <div className="overflow-hidden rounded-[12px] border-[0.5px] border-white/10 bg-[#08090c]">
          <div className="flex items-center gap-2 border-b-[0.5px] border-white/[0.05] px-3 py-3 sm:px-4">
            <Users className="h-3.5 w-3.5 text-white/30" />
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-white/40">Classement XP</h2>
            <span className="ml-auto font-mono text-[10px] tabular-nums text-white/30">
              {leaderboard.length} joueurs
            </span>
          </div>

          <div
            className={`hidden sm:grid ${LEADERBOARD_ROW_GRID_CLASS} border-b-[0.5px] border-white/[0.05] py-2.5 text-[10px] font-semibold uppercase tracking-widest text-white/30`}
          >
            <span className="text-center">#</span>
            <span className="text-center" aria-hidden>
              ∆
            </span>
            <span>Joueur</span>
            <span className="text-right">Niv</span>
            <span className="text-right">Pts</span>
            <span className="text-right" title="Matchs joués">
              Mj
            </span>
          </div>

          <div>
            {leaderboard.map((entry, i) => (
              <LeaderboardRow
                key={entry.id}
                entry={entry}
                isMe={entry.id === user?.id}
                rankDelta={rankDeltas[entry.id]}
                isLast={i === leaderboard.length - 1}
              />
            ))}
            {leaderboard.length === 0 && (
              <p className="py-12 text-center text-sm text-white/35">Aucun joueur dans le classement</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
