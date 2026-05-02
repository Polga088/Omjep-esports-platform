import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronUp, Loader2, Minus, Users, Medal, Dices, Gamepad2 } from 'lucide-react';
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
    return <Minus className="h-2 w-2 shrink-0 text-omjep-text-muted" strokeWidth={2.5} aria-hidden />;
  }
  if (delta > 0) {
    return <ChevronUp className="h-2 w-2 shrink-0 text-omjep-success" strokeWidth={2.5} aria-hidden />;
  }
  return <ChevronDown className="h-2 w-2 shrink-0 text-omjep-warning" strokeWidth={2.5} aria-hidden />;
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
      className={`leaderboard-row group block transition-colors duration-150 hover:bg-omjep-mauve/8 ${
        isMe ? 'border-l-2 border-omjep-mauve bg-omjep-mauve/10' : 'border-l-2 border-transparent'
      } ${!isLast ? 'border-b border-omjep-border' : ''}`}
    >
      <div className={LEADERBOARD_ROW_GRID_CLASS}>
        <div className="text-center font-mono text-xs font-semibold tabular-nums text-omjep-text-secondary">
          {entry.rank}
        </div>
        <div className="flex justify-center" aria-hidden>
          <RankTrendIcon delta={rankDelta} />
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-omjep-bg-elevated ring-1 ring-omjep-border">
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
                isMe ? 'text-omjep-mauve' : 'text-omjep-text-primary group-hover:text-omjep-text-primary'
              }`}
            >
              {entry.name}
              {isMe ? (
                <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider text-omjep-mauve/90">
                  (vous)
                </span>
              ) : null}
            </p>
            <p className="truncate text-[10px] text-omjep-text-muted">
              {entry.team?.name ? entry.team.name : '—'}
              {entry.position ? ` · ${entry.position}` : ''}
            </p>
          </div>
        </div>
        <div className="text-right font-mono text-xs font-bold tabular-nums text-omjep-text-primary">{entry.level}</div>
        <div className="text-right font-mono text-xs font-semibold tabular-nums text-omjep-text-primary">
          {entry.xp.toLocaleString('fr-FR')}
        </div>
        <div className="text-right font-mono text-xs font-semibold tabular-nums text-omjep-text-primary">
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
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-omjep-text-muted transition-colors hover:text-omjep-text-primary"
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
        <div className="omjep-dash-card p-5">
          <div className="flex items-center gap-2 text-sm text-omjep-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin text-omjep-mauve" />
            Chargement du classement…
          </div>
          {isLongLoading ? (
            <p className="mt-2 text-xs text-omjep-text-muted">
              Le classement met plus de temps à répondre. Affichage en attente.
            </p>
          ) : null}
          <div className="mt-4 space-y-2.5">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={`leaderboard-loading-${idx}`}
                className="h-12 animate-pulse rounded-lg border border-omjep-border bg-omjep-bg-panel-soft/80"
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
        <div className="omjep-dash-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-omjep-border px-3 py-3 sm:px-4">
            <Users className="h-3.5 w-3.5 text-omjep-text-muted" />
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-omjep-text-muted">Classement XP</h2>
            <span className="ml-auto font-mono text-[10px] tabular-nums text-omjep-text-muted">
              {leaderboard.length} joueurs
            </span>
          </div>

          <div
            className={`hidden sm:grid ${LEADERBOARD_ROW_GRID_CLASS} border-b border-omjep-border py-2.5 text-[12px] font-semibold uppercase tracking-widest text-omjep-text-muted`}
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
              <div className="border-t border-omjep-border px-6 py-14 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-omjep-mauve/35 bg-omjep-mauve/10 text-omjep-mauve">
                  <Medal className="h-7 w-7" aria-hidden />
                </div>
                <h3 className="text-base font-bold text-omjep-text-primary">Le classement XP est vide</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-omjep-text-secondary">
                  Dès que les joueurs accumulent de l&apos;expérience en compétition, le top apparaîtra ici. Lancez-vous sur le parcours ou les prédictions pour monter en visibilité.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    to="/dashboard/gamification"
                    className="inline-flex items-center gap-2 rounded-xl border border-omjep-mauve/45 bg-omjep-mauve/12 px-4 py-2.5 text-sm font-semibold text-omjep-text-primary transition-colors hover:bg-omjep-mauve/18"
                  >
                    <Gamepad2 className="h-4 w-4 text-omjep-mauve" aria-hidden />
                    Mon parcours
                  </Link>
                  <Link
                    to="/dashboard/predictions"
                    className="inline-flex items-center gap-2 rounded-xl border border-omjep-border bg-omjep-bg-elevated/90 px-4 py-2.5 text-sm font-semibold text-omjep-text-primary transition-colors hover:border-omjep-mauve/35"
                  >
                    <Dices className="h-4 w-4 text-omjep-text-secondary" aria-hidden />
                    Predict &amp; Win
                  </Link>
                  <Link
                    to="/dashboard/profile"
                    className="inline-flex items-center gap-2 rounded-xl border border-omjep-border-gold/45 bg-omjep-gold/10 px-4 py-2.5 text-sm font-semibold text-omjep-gold transition-colors hover:bg-omjep-gold/15"
                  >
                    Mon profil
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
