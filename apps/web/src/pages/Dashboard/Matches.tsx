import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Swords, Trophy, Calendar, AlertCircle, TrendingUp } from 'lucide-react';
import api from '@/lib/api';

interface Team {
  id: string;
  name: string;
  logoUrl: string | null;
}

interface Match {
  id: string;
  status: 'SCHEDULED' | 'PLAYED';
  scheduledAt: string;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: Team;
  awayTeam: Team;
  competition: {
    id: string;
    name: string;
  } | null;
  myTeamId: string;
}

type Tab = 'upcoming' | 'results';

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 animate-pulse">
      <div className="flex items-center justify-between mb-5">
        <div className="h-4 w-20 rounded bg-white/[0.06]" />
        <div className="h-4 w-4 rounded bg-white/[0.06]" />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-xl bg-white/[0.06]" />
          <div className="h-5 w-24 rounded bg-white/[0.06]" />
        </div>
        <div className="flex flex-col items-center gap-1.5 px-4">
          <div className="h-4 w-8 rounded bg-white/[0.06]" />
          <div className="h-6 w-16 rounded bg-white/[0.06]" />
        </div>
        <div className="flex items-center gap-3 flex-1 justify-end">
          <div className="h-5 w-24 rounded bg-white/[0.06]" />
          <div className="w-12 h-12 rounded-xl bg-white/[0.06]" />
        </div>
      </div>
    </div>
  );
}

function TeamLogo({ team, side }: { team: Team; side: 'home' | 'away' }) {
  const initials = team.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const gradients =
    side === 'home'
      ? 'from-amber-400/20 to-amber-600/10 border-amber-400/15'
      : 'from-[#FF6B35]/20 to-[#CC5529]/10 border-[#FF6B35]/15';

  const textColor = side === 'home' ? 'text-amber-400' : 'text-[#FF6B35]';

  if (team.logoUrl) {
    return (
      <div
        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradients} border flex items-center justify-center overflow-hidden`}
      >
        <img
          src={team.logoUrl}
          alt={team.name}
          className="w-10 h-10 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).parentElement!.textContent = initials;
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradients} border flex items-center justify-center`}
    >
      <span className={`font-display font-bold text-sm ${textColor}`}>{initials}</span>
    </div>
  );
}

function ResultBadge({ isWin, isDraw }: { isWin: boolean; isDraw: boolean }) {
  if (isDraw) {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-500/15 text-slate-400 border border-slate-500/20">
        Nul
      </span>
    );
  }
  if (isWin) {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
        Victoire
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/20">
      Défaite
    </span>
  );
}

function MatchCard({ match }: { match: Match }) {
  const isPlayed = match.status === 'PLAYED';
  const isHome = match.myTeamId === match.homeTeam.id;

  const myScore = isHome ? match.homeScore : match.awayScore;
  const opponentScore = isHome ? match.awayScore : match.homeScore;
  const isWin = myScore != null && opponentScore != null && myScore > opponentScore;
  const isDraw = myScore != null && opponentScore != null && myScore === opponentScore;

  const glowColor = isPlayed
    ? isWin
      ? 'hover:shadow-emerald-500/8'
      : isDraw
        ? 'hover:shadow-slate-400/8'
        : 'hover:shadow-red-500/8'
    : 'hover:shadow-amber-400/8';

  const scheduledDate = new Date(match.scheduledAt);
  const formattedDate = scheduledDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
  const formattedTime = scheduledDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-xl ${glowColor} overflow-hidden`}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-white/[0.02] via-transparent to-transparent" />

      {/* Competition badge */}
      <div className="relative flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {match.competition ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/8 border border-amber-400/15 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
              <Trophy className="w-3 h-3" />
              {match.competition.name}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
              Match Amical
            </span>
          )}
          {match.competition && (
            <Link
              to={`/dashboard/competitions/${match.competition.id}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-all"
            >
              <TrendingUp className="w-3 h-3" />
              Classement
            </Link>
          )}
        </div>

        {isPlayed && <ResultBadge isWin={isWin} isDraw={isDraw} />}
      </div>

      {/* Versus layout */}
      <div className="relative flex items-center justify-between gap-2 sm:gap-4">
        {/* Home team */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <TeamLogo team={match.homeTeam} side="home" />
          <p
            className={`font-display font-bold text-sm sm:text-base truncate ${
              isHome ? 'text-amber-400' : 'text-white'
            }`}
          >
            {match.homeTeam.name}
          </p>
        </div>

        {/* Center: score or date */}
        <div className="flex flex-col items-center gap-1 px-2 sm:px-4 shrink-0">
          {isPlayed ? (
            <>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-2xl sm:text-3xl text-white">
                  {match.homeScore}
                </span>
                <span className="text-slate-600 font-bold text-lg">-</span>
                <span className="font-display font-bold text-2xl sm:text-3xl text-white">
                  {match.awayScore}
                </span>
              </div>
              <span className="text-slate-600 text-[10px] uppercase tracking-wider">
                Terminé
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/5 border border-amber-400/10 text-[9px] font-semibold text-amber-400/50 mt-0.5">
                Source: ProClubs.io
              </span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-amber-400">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-display font-bold text-sm">{formattedTime}</span>
              </div>
              <span className="text-slate-500 text-[10px] uppercase tracking-wider">
                {formattedDate}
              </span>
            </>
          )}
        </div>

        {/* Away team */}
        <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
          <p
            className={`font-display font-bold text-sm sm:text-base truncate text-right ${
              !isHome ? 'text-[#FF6B35]' : 'text-white'
            }`}
          >
            {match.awayTeam.name}
          </p>
          <TeamLogo team={match.awayTeam} side="away" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 flex flex-col items-center justify-center text-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800/10 to-transparent pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-amber-400/[0.03] blur-[80px] pointer-events-none" />

      <div className="relative">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
          {tab === 'upcoming' ? (
            <Calendar className="w-9 h-9 text-slate-600" />
          ) : (
            <Swords className="w-9 h-9 text-slate-600" />
          )}
        </div>
        <h3 className="font-display font-bold text-xl text-slate-400 mb-2">
          {tab === 'upcoming' ? 'Aucun match prévu' : 'Aucun résultat'}
        </h3>
        <p className="text-slate-600 text-sm max-w-xs mx-auto leading-relaxed">
          {tab === 'upcoming'
            ? 'Aucun match prévu pour le moment. Préparez vos crampons !'
            : 'Vous n\'avez pas encore disputé de match. Les résultats apparaîtront ici.'}
        </p>
      </div>
    </div>
  );
}

export default function Matches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<Match[]>('/matches/my-team');
        if (!cancelled) setMatches(res.data);
      } catch (err: any) {
        if (!cancelled) {
          const status = err?.response?.status;
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

  const upcoming = matches
    .filter((m) => m.status === 'SCHEDULED')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const results = matches
    .filter((m) => m.status === 'PLAYED')
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const currentList = activeTab === 'upcoming' ? upcoming : results;

  const tabs: { key: Tab; label: string; icon: typeof Calendar; count: number }[] = [
    { key: 'upcoming', label: 'Calendrier', icon: Calendar, count: upcoming.length },
    { key: 'results', label: 'Résultats', icon: Swords, count: results.length },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative rounded-2xl border border-amber-400/15 bg-gradient-to-br from-amber-400/5 via-transparent to-transparent p-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-amber-400/5 blur-[80px] pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/30 to-amber-600/30 flex items-center justify-center border border-amber-400/20">
            <Swords className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-white">Matchs</h1>
            <p className="text-slate-400 text-sm">
              Calendrier et résultats de votre équipe
            </p>
          </div>
        </div>
      </div>

      {/* Error states */}
      {error === 'no-team' && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="font-display font-bold text-xl text-amber-300 mb-2">
            Aucun club trouvé
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Rejoignez un club pour voir vos matchs et résultats.
          </p>
        </div>
      )}

      {error === 'generic' && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="text-red-300 text-sm">
            Une erreur est survenue lors du chargement des matchs. Veuillez réessayer.
          </p>
        </div>
      )}

      {/* Tabs + content */}
      {!error && (
        <>
          {/* Tab bar */}
          <div className="flex gap-2 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
            {tabs.map(({ key, label, icon: Icon, count }) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20 shadow-sm shadow-amber-400/5'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {!loading && (
                    <span
                      className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        active
                          ? 'bg-amber-400/20 text-amber-400'
                          : 'bg-white/5 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Match list */}
          {loading ? (
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : currentList.length === 0 ? (
            <EmptyState tab={activeTab} />
          ) : (
            <div className="space-y-4">
              {currentList.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
