import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Crown, Trophy, Users, ChevronRight, Star, Shield, Swords,
  TrendingUp, Newspaper, Medal, ArrowRight, Flame, Coins,
} from 'lucide-react';
import api from '@/lib/api';
import LandingHero from '@/components/landing/LandingHero';
import { useAuth } from '@/hooks/useAuth';

// ─── Types ──────────────────────────────────────────────────────────────────
interface PlatformStats {
  totalPlayers: number;
  totalClubs: number;
  transferVolume: number;
  totalMatches: number;
}

interface HallOfFameEntry {
  competition: { id: string; name: string; type: string };
  seasonLabel: string;
  champion: { id: string; name: string; logo_url: string | null } | null;
  goldenBoot: { ea_persona_name: string; goals: number } | null;
}

interface NewsEvent {
  id: string;
  title: string;
  description: string;
  created_at: string;
  metadata: {
    playerName?: string;
    toTeamName?: string;
    transferFee?: number;
    releaseClauseMet?: boolean;
  } | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function useCountUp(target: number, duration = 1800) {
  const [count, setCount] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (target === 0) return;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(ease * target));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return count;
}

// ─── Animated Stat ─────────────────────────────────────────────────────────
function AnimatedStat({
  label,
  value,
  icon: Icon,
  suffix = '',
  color = 'indigo',
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  suffix?: string;
  color?: string;
}) {
  const animated = useCountUp(value);
  const colorClasses: Record<string, string> = {
    indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
    amber: 'bg-amber-400/10 border-amber-400/20 text-amber-400',
    emerald: 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400',
    sky: 'bg-sky-400/10 border-sky-400/20 text-sky-400',
    violet: 'bg-violet-400/10 border-violet-400/20 text-violet-400',
  };
  const cls = colorClasses[color] ?? colorClasses.indigo;

  return (
    <div className="flex items-center gap-4 justify-center sm:justify-start">
      <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center flex-shrink-0 ${cls}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="font-display font-black text-3xl text-white tracking-tight">
          {formatNumber(animated)}{suffix}
        </p>
        <p className="text-slate-500 text-sm">{label}</p>
      </div>
    </div>
  );
}

// ─── Transfer Highlight Card ─────────────────────────────────────────────────
function TransferCard({ item, index }: { item: NewsEvent; index: number }) {
  const isClause = item.metadata?.releaseClauseMet;
  return (
    <div
      className={`relative flex-shrink-0 w-72 rounded-2xl border p-5 transition-all hover:-translate-y-1 hover:shadow-xl ${
        isClause
          ? 'border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-[#0a0a0c] hover:shadow-violet-900/20'
          : 'border-indigo-500/15 bg-gradient-to-br from-indigo-500/8 to-[#0a0a0c] hover:shadow-indigo-950/30'
      }`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {isClause && (
        <span className="absolute -top-2 left-4 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 border border-violet-500/30 text-violet-300 uppercase tracking-wider">
          Clause libératoire
        </span>
      )}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isClause ? 'bg-violet-500/15' : 'bg-indigo-500/12'
        }`}>
          <Newspaper className={`w-5 h-5 ${isClause ? 'text-violet-400' : 'text-indigo-400'}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-white leading-snug line-clamp-2">{item.title}</p>
          {item.metadata?.playerName && (
            <p className="text-xs text-slate-400 mt-1 truncate">
              {item.metadata.playerName}
              {item.metadata.toTeamName && (
                <span className="text-indigo-400"> → {item.metadata.toTeamName}</span>
              )}
            </p>
          )}
          {typeof item.metadata?.transferFee === 'number' && item.metadata.transferFee > 0 && (
            <p className="mt-1.5 text-xs font-bold text-emerald-400">
              {formatNumber(item.metadata.transferFee)} OC
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  const { isAuthenticated } = useAuth();
  const authed = isAuthenticated();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [hof, setHof] = useState<HallOfFameEntry[]>([]);
  const [news, setNews] = useState<NewsEvent[]>([]);

  useEffect(() => {
    const load = async () => {
      const [statsRes, hofRes, newsRes] = await Promise.allSettled([
        api.get<PlatformStats>('/stats/public'),
        api.get<HallOfFameEntry[]>('/competitions/hall-of-fame'),
        api.get<NewsEvent[]>('/news/transfers?limit=8'),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (hofRes.status === 'fulfilled') setHof(hofRes.value.data.slice(0, 3));
      if (newsRes.status === 'fulfilled') setNews(newsRes.value.data);
    };
    load();
  }, []);

  const statsLine =
    stats ? (
      <>
        Déjà{' '}
        <span className="font-bold text-white">{stats.totalPlayers.toLocaleString('fr-FR')}</span> joueurs dans{' '}
        <span className="font-bold text-white">{stats.totalClubs}</span> clubs actifs
      </>
    ) : null;

  return (
    <div className="flex flex-col">
      <LandingHero statsLine={statsLine} />

      {/* ── LIVE STATS ─────────────────────────────────────────── */}
      <section className="border-y border-indigo-500/10 bg-indigo-500/[0.03] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <AnimatedStat
              label="Joueurs inscrits"
              value={stats?.totalPlayers ?? 0}
              icon={Users}
              color="indigo"
            />
            <AnimatedStat
              label="Clubs actifs"
              value={stats?.totalClubs ?? 0}
              icon={Shield}
              color="sky"
            />
            <AnimatedStat
              label="Matchs joués"
              value={stats?.totalMatches ?? 0}
              icon={Swords}
              color="emerald"
            />
            <AnimatedStat
              label="Volume des transferts"
              value={stats?.transferVolume ?? 0}
              icon={Coins}
              suffix=" OC"
              color="violet"
            />
          </div>
        </div>
      </section>

      {/* ── MARKET HIGHLIGHTS ──────────────────────────────────── */}
      {news.length > 0 && (
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">Live</span>
                </div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-white">
                  Derniers Transferts
                </h2>
                <p className="text-slate-500 text-sm mt-1">Les moves officiels en temps réel</p>
              </div>
              <Link
                to="/register"
                className="hidden items-center gap-2 text-sm font-semibold text-indigo-400 transition-colors hover:text-indigo-300 sm:flex"
              >
                Rejoindre pour voir tout
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
              {news.map((item, i) => (
                <TransferCard key={item.id} item={item} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── HALL OF FAME PREVIEW ────────────────────────────────── */}
      {hof.length > 0 && (
        <section className="border-t border-indigo-500/10 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-4 py-2">
                <Trophy className="h-4 w-4 text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">Palmarès Historique</span>
              </div>
              <h2 className="font-display font-bold text-3xl sm:text-4xl text-white mb-3">
                Les Champions de l'Histoire
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto">
                Rejoignez la plateforme et gravez votre nom dans le Palmarès OMJEP.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {hof.map((entry, i) => (
                <div
                  key={entry.competition.id}
                  className={`relative rounded-2xl border overflow-hidden transition-all hover:-translate-y-1 hover:shadow-2xl ${
                    i === 0
                      ? 'border-indigo-500/30 bg-gradient-to-br from-indigo-500/12 to-[#0a0a0c] hover:shadow-indigo-950/40'
                      : 'border-white/8 bg-gradient-to-br from-white/[0.03] to-[#0a0a0c] hover:shadow-slate-900/30'
                  }`}
                >
                  {i === 0 && (
                    <div className="absolute top-3 right-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-400/15">
                        <Crown className="h-3.5 w-3.5 text-indigo-300" fill="currentColor" />
                      </div>
                    </div>
                  )}
                  <div className="p-6">
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{entry.seasonLabel}</p>
                    <h3 className="font-display font-bold text-lg text-white mb-4 pr-8">
                      {entry.competition.name}
                    </h3>

                    {entry.champion ? (
                      <div className="flex items-center gap-3 mb-4">
                        {entry.champion.logo_url ? (
                          <img
                            src={entry.champion.logo_url}
                            alt={entry.champion.name}
                            className="w-12 h-12 rounded-xl object-cover border border-white/10"
                          />
                        ) : (
                          <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-base font-bold ${
                            i === 0 ? 'bg-indigo-400/20 text-indigo-300' : 'bg-white/5 text-slate-400'
                          }`}>
                            {entry.champion.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Champion</p>
                          <p className="font-bold text-white">{entry.champion.name}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600 mb-4">Champion non déterminé</p>
                    )}

                    {entry.goldenBoot && (
                      <div className="flex items-center gap-2 text-xs text-slate-400 border-t border-white/5 pt-3">
                        <Star className="h-3 w-3 flex-shrink-0 text-indigo-400" />
                        <span>
                          <span className="font-semibold text-indigo-300">{entry.goldenBoot.ea_persona_name}</span>
                          {' — '}{entry.goldenBoot.goals} buts
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link
                to="/hall-of-fame"
                className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/25 px-6 py-3 text-sm font-semibold text-indigo-300 transition-all hover:bg-indigo-500/10"
              >
                <Medal className="w-4 h-4" />
                Voir le Palmarès complet
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section className="border-t border-indigo-500/10 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 font-display text-3xl font-bold tracking-tighter text-white sm:text-4xl">
              Une plateforme complète
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Tout ce dont vous avez besoin pour vivre la compétition EA FC au niveau supérieur.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Swords,
                title: 'Compétitions officielles',
                description: 'Ligues, coupes et Champions League — participez aux tournois OMJEP et écrivez l\'histoire.',
                color: 'indigo',
              },
              {
                icon: Users,
                title: 'Mercato & Transferts',
                description: 'Signez des agents libres, négociez des contrats et activez des clauses libératoires.',
                color: 'emerald',
              },
              {
                icon: TrendingUp,
                title: 'Stats & Gamification',
                description: 'Suivez vos stats, montez en niveau, débloquez des badges et comparez-vous aux meilleurs.',
                color: 'sky',
              },
            ].map(({ icon: Icon, title, description, color }) => {
              const cls: Record<string, string> = {
                indigo: 'border-indigo-500/15 bg-indigo-500/10 text-indigo-400 group-hover:border-indigo-500/30 group-hover:bg-indigo-500/20',
                amber: 'bg-amber-400/10 border-amber-400/15 text-amber-400 group-hover:bg-amber-400/20 group-hover:border-amber-400/30',
                emerald: 'bg-emerald-400/10 border-emerald-400/15 text-emerald-400 group-hover:bg-emerald-400/20 group-hover:border-emerald-400/30',
                sky: 'bg-sky-400/10 border-sky-400/15 text-sky-400 group-hover:bg-sky-400/20 group-hover:border-sky-400/30',
              };
              return (
                <div
                  key={title}
                  className="group p-7 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all"
                >
                  <div className={`w-13 h-13 w-12 h-12 rounded-xl border flex items-center justify-center mb-5 transition-all ${cls[color]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-display font-bold text-xl text-white mb-3">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-indigo-600/5 to-transparent" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-[350px] w-[700px] -translate-x-1/2 rounded-full bg-indigo-500/8 blur-[100px]" />

            <div className="relative p-12 text-center sm:p-16">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-400/25 bg-gradient-to-br from-indigo-500/40 to-indigo-700/30 shadow-[0_0_40px_-8px_rgba(99,102,241,0.5)]">
                <Crown className="h-8 w-8 text-white" fill="currentColor" />
              </div>
              <h2 className="mb-4 font-display text-4xl font-black tracking-tighter text-white sm:text-5xl">
                Prêt à dominer ?
              </h2>
              <p className="mx-auto mb-3 max-w-lg text-lg text-slate-400">
                {authed ? (
                  <>Retrouvez vos ligues, votre mercato et vos stats dans le dashboard.</>
                ) : (
                  <>
                    Créez votre compte gratuitement et recevez{' '}
                    <span className="font-bold text-indigo-300">500 OMJEP Coins</span> de bienvenue.
                  </>
                )}
              </p>
              <p className="mb-10 text-sm text-slate-600">Rejoignez la communauté OMJEP · Fédération E-sport Maroc</p>
              {authed ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-3 rounded-lg border-[0.5px] border-indigo-400/35 bg-[#08090c] px-10 py-4 text-lg font-bold text-white shadow-[0_0_32px_-8px_rgba(99,102,241,0.45)] transition-all hover:border-indigo-400/50 hover:shadow-[0_0_40px_-4px_rgba(99,102,241,0.55)]"
                >
                  <Crown className="h-5 w-5 text-indigo-300" fill="currentColor" />
                  Accéder au Dashboard
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="inline-flex items-center gap-3 rounded-lg border-[0.5px] border-indigo-400/30 bg-[#08090c] px-10 py-4 text-lg font-bold text-white shadow-[0_0_28px_-8px_rgba(99,102,241,0.4)] transition-all hover:border-indigo-400/45 hover:shadow-[0_0_36px_-4px_rgba(99,102,241,0.5)]"
                >
                  <Crown className="h-5 w-5 text-indigo-300" fill="currentColor" />
                  Créer mon compte — Gratuit
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
