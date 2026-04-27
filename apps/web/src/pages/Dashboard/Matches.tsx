import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Swords, Calendar, AlertCircle, TrendingUp, Zap } from 'lucide-react';
import api from '@/lib/api';
import { getCompTypeConfig } from '@/lib/competition-icons';
import MaintenancePrestige, { PRESTIGE_MSG } from '@/components/MaintenancePrestige';
import RankBadge from '@/components/RankBadge';
import MatchReportModal from '@/components/MatchReportModal';
import { MatchScoreProjection } from '@/components/kimi/MatchScoreProjection';

interface Team {
  id: string;
  name: string;
  logoUrl: string | null;
  manager?: { level: number } | null;
}

interface Match {
  id: string;
  status: 'SCHEDULED' | 'PENDING' | 'VALIDATED' | 'DISPUTE' | 'PLAYED';
  scheduledAt: string;
  homeScore: number | null;
  awayScore: number | null;
  proofUrl?: string | null;
  homeTeam: Team;
  awayTeam: Team;
  competition: {
    id: string;
    name: string;
    type: string;
  } | null;
  myTeamId: string;
}

type Tab = 'upcoming' | 'results';

const MATCH_START_NAV_MS = 580;

/**
 * Sifflet bref + impact sourd (Web Audio API), même esprit que le level-up profil.
 */
function playMatchStartSound() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const t0 = ctx.currentTime;

    const master = ctx.createGain();
    master.connect(ctx.destination);
    master.gain.setValueAtTime(0.0001, t0);
    master.gain.exponentialRampToValueAtTime(0.14, t0 + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.38);

    const whistle = ctx.createOscillator();
    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(1850, t0);
    whistle.frequency.linearRampToValueAtTime(2750, t0 + 0.07);
    whistle.frequency.linearRampToValueAtTime(2400, t0 + 0.14);
    whistle.frequency.linearRampToValueAtTime(2100, t0 + 0.22);
    whistle.connect(master);
    whistle.start(t0);
    whistle.stop(t0 + 0.26);

    let closed = false;
    const stopCtx = () => {
      if (closed) return;
      closed = true;
      try {
        void ctx.close();
      } catch {
        /* ignore */
      }
    };
    whistle.onended = stopCtx;
    setTimeout(stopCtx, 450);

    const thump = ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(95, t0);
    thump.frequency.exponentialRampToValueAtTime(38, t0 + 0.14);
    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(0.22, t0);
    thumpGain.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.18);
    thump.connect(thumpGain);
    thumpGain.connect(ctx.destination);
    thump.start(t0);
    thump.stop(t0 + 0.2);
  } catch {
    /* ignore */
  }
}

function captainLevel(team: Team): number {
  const lv = team.manager?.level;
  return typeof lv === 'number' && Number.isFinite(lv) && lv > 0 ? lv : 1;
}

function TeamLogoXL({ team, side }: { team: Team; side: 'home' | 'away' }) {
  const initials = team.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const gradients =
    side === 'home'
      ? 'from-amber-400/25 to-amber-700/15 border-amber-400/25 shadow-[0_0_40px_rgba(251,191,36,0.12)]'
      : 'from-[#FF6B35]/25 to-[#CC5529]/12 border-[#FF6B35]/30 shadow-[0_0_36px_rgba(255,107,53,0.12)]';

  const textColor = side === 'home' ? 'text-amber-400' : 'text-[#FF6B35]';

  if (team.logoUrl) {
    return (
      <div
        className={`flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-gradient-to-br sm:h-32 sm:w-32 ${gradients}`}
      >
        <img
          src={team.logoUrl}
          alt={team.name}
          className="h-[5.25rem] w-[5.25rem] object-contain sm:h-[6.75rem] sm:w-[6.75rem]"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            const p = (e.target as HTMLImageElement).parentElement;
            if (p) p.innerHTML = `<span class="font-display text-2xl font-black ${textColor}">${initials}</span>`;
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border bg-gradient-to-br text-2xl font-black sm:h-32 sm:w-32 sm:text-3xl ${gradients} ${textColor} font-display`}
    >
      {initials}
    </div>
  );
}

function NeonLightningDivider({ isPlayed }: { isPlayed: boolean }) {
  return (
    <div className="relative flex min-w-[4.5rem] flex-col items-center justify-center gap-2 px-1 sm:min-w-[6rem] sm:px-3">
      <motion.div
        className="relative"
        animate={
          isPlayed
            ? undefined
            : {
                filter: [
                  'drop-shadow(0 0 14px rgba(34,211,238,0.85)) drop-shadow(0 0 28px rgba(6,182,212,0.45))',
                  'drop-shadow(0 0 22px rgba(34,211,238,1)) drop-shadow(0 0 40px rgba(103,232,249,0.55))',
                  'drop-shadow(0 0 14px rgba(34,211,238,0.85)) drop-shadow(0 0 28px rgba(6,182,212,0.45))',
                ],
              }
        }
        transition={isPlayed ? undefined : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Zap
          className="h-10 w-10 text-cyan-300 sm:h-14 sm:w-14"
          strokeWidth={1.75}
          fill="currentColor"
          fillOpacity={0.15}
          aria-hidden
        />
      </motion.div>
    </div>
  );
}

function ResultBadge({ isWin, isDraw }: { isWin: boolean; isDraw: boolean }) {
  if (isDraw) {
    return (
      <span className="rounded-full border border-slate-500/20 bg-slate-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Nul
      </span>
    );
  }
  if (isWin) {
    return (
      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
        Victoire
      </span>
    );
  }
  return (
    <span className="rounded-full border border-red-500/20 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
      Défaite
    </span>
  );
}

function DuelArenaCard({ match, onOpenReport }: { match: Match; onOpenReport: (match: Match) => void }) {
  const navigate = useNavigate();
  const [enteringArena, setEnteringArena] = useState(false);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPlayed = match.status === 'PLAYED' || match.status === 'VALIDATED';
  const isHome = match.myTeamId === match.homeTeam.id;

  const myScore = isHome ? match.homeScore : match.awayScore;
  const opponentScore = isHome ? match.awayScore : match.homeScore;
  const isWin = myScore != null && opponentScore != null && myScore > opponentScore;
  const isDraw = myScore != null && opponentScore != null && myScore === opponentScore;

  const scheduledDate = new Date(match.scheduledAt);
  const formattedDate = scheduledDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
  const formattedTime = scheduledDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const arenaHref = match.competition
    ? `/dashboard/competitions/${match.competition.id}`
    : '/dashboard/team';

  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, []);

  const handleEnterArena = () => {
    if (enteringArena) return;
    setEnteringArena(true);
    playMatchStartSound();
    navTimerRef.current = setTimeout(() => {
      navigate(arenaHref);
    }, MATCH_START_NAV_MS);
  };

  return (
    <div
      className="group relative overflow-hidden rounded-none border border-black/10 bg-black/[0.02] p-10 backdrop-blur-xl transition-colors duration-300 dark:border-white/20 dark:bg-black/40"
    >
      <AnimatePresence>
        {enteringArena ? (
          <motion.div
            key="portal-flash"
            className="pointer-events-none absolute inset-0 z-[60] rounded-[inherit] bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.42, times: [0, 0.22, 1], ease: 'easeInOut' }}
          />
        ) : null}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-current opacity-20" />

      <div className="relative z-[1] mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {match.competition ? (
            (() => {
              const ccfg = getCompTypeConfig(match.competition.type);
              const CIcon = ccfg.Icon;
              return (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${ccfg.bg} ${ccfg.border} ${ccfg.color}`}
                >
                  <CIcon className="h-3 w-3" />
                  {match.competition.name}
                </span>
              );
            })()
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Match Amical
            </span>
          )}
          {match.competition && (
            <Link
              to={`/dashboard/competitions/${match.competition.id}`}
              className="inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-0.5 text-[10px] font-semibold text-slate-500 transition-all hover:border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-400"
            >
              <TrendingUp className="h-3 w-3" />
              Classement
            </Link>
          )}
        </div>
        {isPlayed && <ResultBadge isWin={isWin} isDraw={isDraw} />}
      </div>

      <motion.div
        className="relative z-[1] flex flex-col items-stretch gap-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        animate={
          enteringArena
            ? { scale: 0.88 }
            : { scale: 1 }
        }
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Home — s’écarte vers la gauche (effet entrée stade) */}
        <motion.div
          className="flex flex-1 flex-col items-center gap-3 sm:items-start"
          animate={
            enteringArena
              ? { x: '-32vw', scale: 0.82, opacity: 0.88 }
              : { x: 0, scale: 1, opacity: 1 }
          }
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <TeamLogoXL team={match.homeTeam} side="home" />
          <p
            className={`max-w-[12rem] text-center font-display text-base font-bold sm:text-left sm:text-lg ${
              isHome ? 'text-amber-400' : 'text-white'
            }`}
          >
            {match.homeTeam.name}
          </p>
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Capitaine</span>
            <RankBadge level={captainLevel(match.homeTeam)} size="md" />
          </div>
        </motion.div>

        {/* Éclair central + score / horaire */}
        <motion.div
          className="flex shrink-0 flex-col items-center justify-center gap-3 px-2 sm:px-4"
          animate={
            enteringArena
              ? { scale: 0.42, opacity: 0.2, filter: 'blur(4px)' }
              : { scale: 1, opacity: 1, filter: 'blur(0px)' }
          }
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <NeonLightningDivider isPlayed={isPlayed} />
          {isPlayed ? (
            <>
              <MatchScoreProjection
                home={match.homeScore ?? 0}
                away={match.awayScore ?? 0}
                size="hero"
                className="px-1"
              />
              <span className="text-[10px] uppercase tracking-widest text-slate-600">Terminé</span>
              <span className="rounded-full border border-amber-400/10 bg-amber-400/5 px-2 py-0.5 text-[9px] font-semibold text-amber-400/45">
                Source: ProClubs.io
              </span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-amber-400">
                <Clock className="h-4 w-4" />
                <span className="font-display text-lg font-bold">{formattedTime}</span>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-slate-500">{formattedDate}</span>
            </>
          )}
        </motion.div>

        {/* Away — s’écarte vers la droite */}
        <motion.div
          className="flex flex-1 flex-col items-center gap-3 sm:items-end"
          animate={
            enteringArena
              ? { x: '32vw', scale: 0.82, opacity: 0.88 }
              : { x: 0, scale: 1, opacity: 1 }
          }
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <TeamLogoXL team={match.awayTeam} side="away" />
          <p
            className={`max-w-[12rem] text-center font-display text-base font-bold sm:text-right sm:text-lg ${
              !isHome ? 'text-[#FF6B35]' : 'text-white'
            }`}
          >
            {match.awayTeam.name}
          </p>
          <div className="flex flex-col items-center gap-1 sm:items-end">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Capitaine</span>
            <RankBadge level={captainLevel(match.awayTeam)} size="md" />
          </div>
        </motion.div>
      </motion.div>

      <div className="relative z-[1] mt-8 flex justify-center">
        {isPlayed ? (
          <Link
            to={arenaHref}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-8 py-3 text-xs font-black uppercase tracking-[0.2em] text-slate-300 transition hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-100"
          >
            Voir l&apos;arène
          </Link>
        ) : (
          <div className="flex flex-wrap justify-center gap-3">
            <motion.button
              type="button"
              disabled={enteringArena}
              onClick={handleEnterArena}
              className="inline-flex items-center justify-center rounded-xl border border-cyan-400/50 bg-gradient-to-r from-cyan-600/90 to-sky-600/90 px-8 py-3.5 text-xs font-black uppercase tracking-[0.24em] text-white shadow-[0_0_32px_rgba(34,211,238,0.35)] disabled:pointer-events-none disabled:opacity-60"
              animate={
                enteringArena
                  ? { scale: 0.94, opacity: 0.75 }
                  : {
                      scale: [1, 1.045, 1],
                      boxShadow: [
                        '0 0 28px rgba(34,211,238,0.35)',
                        '0 0 48px rgba(34,211,238,0.55)',
                        '0 0 28px rgba(34,211,238,0.35)',
                      ],
                    }
              }
              transition={
                enteringArena
                  ? { duration: 0.35 }
                  : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
              }
              whileHover={enteringArena ? undefined : { scale: 1.06 }}
              whileTap={enteringArena ? undefined : { scale: 0.98 }}
            >
              {enteringArena ? 'Match Start…' : 'Enter Arena'}
            </motion.button>
            <button
              type="button"
              onClick={() => onOpenReport(match)}
              className="inline-flex items-center justify-center rounded-xl border border-amber-300/30 bg-amber-400/10 px-6 py-3 text-xs font-black uppercase tracking-[0.17em] text-amber-200 transition hover:bg-amber-400/20"
            >
              Match Day Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonDuelCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-none border border-black/10 bg-black/[0.02] p-10 backdrop-blur-xl dark:border-white/20 dark:bg-black/40">
      <div className="mb-6 h-6 w-40 rounded-full bg-white/[0.06]" />
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
        <div className="flex flex-col items-center gap-3">
          <div className="h-28 w-28 rounded-2xl bg-white/[0.06] sm:h-32 sm:w-32" />
          <div className="h-4 w-28 rounded bg-white/[0.06]" />
          <div className="h-8 w-24 rounded-lg bg-white/[0.06]" />
        </div>
        <div className="h-12 w-12 rounded-full bg-white/[0.06]" />
        <div className="flex flex-col items-center gap-3">
          <div className="h-28 w-28 rounded-2xl bg-white/[0.06] sm:h-32 sm:w-32" />
          <div className="h-4 w-28 rounded bg-white/[0.06]" />
          <div className="h-8 w-24 rounded-lg bg-white/[0.06]" />
        </div>
      </div>
      <div className="mt-8 flex justify-center">
        <div className="h-12 w-48 rounded-xl bg-white/[0.06]" />
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <p className="py-16 text-center text-sm font-thin text-black/50 dark:text-white/40">
      {tab === 'upcoming' ? 'Pas de match prévu pour le moment.' : 'Pas encore de résultat enregistré.'}
    </p>
  );
}

export default function Matches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const [reportingMatch, setReportingMatch] = useState<Match | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<Match[]>('/matches/my-team');
        if (!cancelled) setMatches(res.data);
      } catch (err: unknown) {
        if (!cancelled) {
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 404) {
            setError('no-team');
          } else {
            setError('generic');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onRefresh = () => {
      void api
        .get<Match[]>('/matches/my-team')
        .then((res) => setMatches(res.data))
        .catch(() => {});
    };
    window.addEventListener('omjep:matches-refresh', onRefresh);
    return () => window.removeEventListener('omjep:matches-refresh', onRefresh);
  }, []);

  const upcoming = useMemo(
    () =>
      matches
        .filter((m) => ['SCHEDULED', 'PENDING', 'DISPUTE'].includes(m.status))
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [matches],
  );

  const results = useMemo(
    () =>
      matches
        .filter((m) => m.status === 'PLAYED' || m.status === 'VALIDATED')
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()),
    [matches],
  );

  const currentList = activeTab === 'upcoming' ? upcoming : results;

  const tabs: { key: Tab; label: string; icon: typeof Calendar; count: number }[] = [
    { key: 'upcoming', label: 'Calendrier', icon: Calendar, count: upcoming.length },
    { key: 'results', label: 'Résultats', icon: Swords, count: results.length },
  ];

  return (
    <div className="cockpit-page space-y-6">
      <div className="border-b border-black/10 px-12 py-12 dark:border-white/20">
        <h1 className="text-4xl font-bold tracking-tight text-black dark:text-white">MATCHS</h1>
        <p className="text-[12px] uppercase tracking-widest opacity-50">Calendrier et résultats</p>
      </div>

      {error === 'no-team' && (
        <p className="py-16 text-center text-sm font-thin text-black/50 dark:text-white/40">
          Aucun club trouvé. Rejoignez un club pour voir vos matchs.
        </p>
      )}

      {error === 'generic' && (
        <MaintenancePrestige overlay title="Matchs" message={PRESTIGE_MSG} className="border-white/10" />
      )}

      {!error && (
        <>
          <div className="flex w-fit gap-2 border-b border-black/10 p-1 dark:border-white/20">
            {tabs.map(({ key, label, icon: Icon, count }) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-2 rounded-none border border-black/10 px-4 py-2.5 text-sm font-semibold transition-all duration-200 dark:border-white/20 ${
                    active
                      ? 'bg-transparent text-black dark:text-white'
                      : 'text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {!loading && (
                    <span className="ml-1 px-1.5 py-0.5 font-mono text-[10px] font-bold text-black/70 dark:text-white/70">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="space-y-6">
              <SkeletonDuelCard />
              <SkeletonDuelCard />
            </div>
          ) : currentList.length === 0 ? (
            <EmptyState tab={activeTab} />
          ) : (
            <div className="space-y-0">
              {currentList.map((match) => {
                const isPlayed = match.status === 'PLAYED' || match.status === 'VALIDATED'
                const statusLabel = isPlayed ? 'TERMINÉ' : 'À VENIR'
                const scheduledDate = new Date(match.scheduledAt)
                return (
                  <div key={match.id} className="border-b border-black/10 px-12 py-12 dark:border-white/20">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                      <div>
                        <p className="text-[12px] uppercase tracking-widest opacity-50">{statusLabel}</p>
                        <p className="font-mono text-2xl font-bold text-black dark:text-white">
                          {match.homeTeam.name} — {match.awayTeam.name}
                        </p>
                        <p className="font-mono text-sm text-black/60 dark:text-white/60">
                          {scheduledDate.toLocaleDateString('fr-FR')} {scheduledDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <p className="font-mono text-6xl font-bold text-black dark:text-white">
                        {isPlayed ? `${match.homeScore ?? 0}:${match.awayScore ?? 0}` : '—'}
                      </p>
                      <div className="flex flex-wrap gap-3 md:justify-end">
                        <button
                          type="button"
                          onClick={() => setReportingMatch(match)}
                          className="rounded-none border border-black/10 bg-transparent px-3 py-2 text-xs uppercase tracking-[0.2em] dark:border-white/20"
                        >
                          [ ACTION ]
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
      <MatchReportModal
        open={reportingMatch !== null}
        match={reportingMatch}
        onClose={() => setReportingMatch(null)}
        onUpdated={() => {
          window.dispatchEvent(new CustomEvent('omjep:matches-refresh'))
        }}
      />
    </div>
  );
}
