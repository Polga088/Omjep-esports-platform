import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronUp, Loader2, Minus, Users } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { PlayerIdentity, type PlayerIdentityRarity } from '@/components/PlayerIdentity';
import RankBadge from '@/components/RankBadge';
import MaintenancePrestige, { PRESTIGE_MSG } from '@/components/MaintenancePrestige';
import { useLeaderboardRankDeltas } from '@/hooks/useLeaderboardRankDeltas';
import DashboardPageHeading from '@/components/dashboard/DashboardPageHeading'

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
    return <Minus className="h-2 w-2 shrink-0 text-slate-400 dark:text-white/20" strokeWidth={2.5} aria-hidden />;
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
      className={`leaderboard-row group block transition-colors duration-150 hover:bg-white/[0.05] ${
        isMe ? 'border-l-2 border-cyan-500 bg-violet-500/5 dark:border-cyan-400 dark:bg-white/[0.04]' : 'border-l-2 border-transparent'
      } ${!isLast ? 'border-b border-black/10 dark:border-white/20' : ''}`}
    >
      <div className={LEADERBOARD_ROW_GRID_CLASS}>
        <div className="text-center font-mono text-xs font-semibold tabular-nums text-slate-700 dark:text-white/80">
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
                isMe ? 'text-cyan-700 dark:text-cyan-200' : 'text-slate-900 group-hover:text-slate-950 dark:text-white dark:group-hover:text-white'
              }`}
            >
              {entry.name}
              {isMe ? (
                <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400/80">
                  (vous)
                </span>
              ) : null}
            </p>
            <p className="truncate text-[10px] text-slate-500 dark:text-white/35">
              {entry.team?.name ? entry.team.name : '—'}
              {entry.position ? ` · ${entry.position}` : ''}
            </p>
          </div>
        </div>
        <div className="text-right font-mono text-xs font-bold tabular-nums text-slate-800 dark:text-white/90">{entry.level}</div>
        <div className="text-right font-mono text-xs font-semibold tabular-nums text-slate-800 dark:text-white/90">
          {entry.xp.toLocaleString('fr-FR')}
        </div>
        <div className="text-right font-mono text-xs font-semibold tabular-nums text-slate-800 dark:text-white/90">
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
  const [isLongLoading, setIsLongLoading] = useState(false);

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

  useEffect(() => {
    if (!loading) {
      setIsLongLoading(false);
      return;
    }
    const timer = window.setTimeout(() => setIsLongLoading(true), 4000);
    return () => window.clearTimeout(timer);
  }, [loading]);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-center gap-4">
        <Link
          to="/dashboard/gamification"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-700 dark:text-white/40 dark:hover:text-white/70"
        >
          <ChevronLeft className="h-4 w-4" />
          Mon Parcours
        </Link>
      </div>

      <DashboardPageHeading
        eyebrow="Player Ranking"
        title="Classement"
        subtitle="XP global et progression des meilleurs joueurs"
      />

      {loading ? (
        <div className="rounded-[12px] border border-violet-200/70 bg-white/80 p-5 dark:border-white/20 dark:bg-[#08090c]">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-white/70">
            <Loader2 className="h-4 w-4 animate-spin text-slate-500 dark:text-white/60" />
            Chargement du classement…
          </div>
          {isLongLoading ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-white/45">
              Le classement met plus de temps à répondre. Affichage en attente.
            </p>
          ) : null}
          <div className="mt-4 space-y-2.5">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={`leaderboard-loading-${idx}`}
                className="h-12 animate-pulse rounded-lg border border-slate-200/80 bg-white/75 dark:border-white/10 dark:bg-white/[0.04]"
              />
            ))}
          </div>
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
        <div className="overflow-hidden rounded-[12px] border border-violet-200/70 bg-white/85 dark:border-white/20 dark:bg-[#08090c]">
          <div className="flex items-center gap-2 border-b border-black/10 px-3 py-3 sm:px-4 dark:border-white/20">
            <Users className="h-3.5 w-3.5 text-slate-400 dark:text-white/30" />
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-white/40">Classement XP</h2>
            <span className="ml-auto font-mono text-[10px] tabular-nums text-slate-400 dark:text-white/30">
              {leaderboard.length} joueurs
            </span>
          </div>

          <div
            className={`hidden sm:grid ${LEADERBOARD_ROW_GRID_CLASS} border-b border-black/10 py-2.5 text-[12px] font-semibold uppercase tracking-widest text-slate-400 dark:text-white/30 dark:border-white/20`}
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
              <p className="py-12 text-center text-sm text-slate-500 dark:text-white/35">Aucun joueur dans le classement</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
