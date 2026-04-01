import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Crown, Trophy, Users, ChevronRight, Star, Shield, Swords,
  TrendingUp, Newspaper, Medal, ArrowRight, Flame, Coins,
} from 'lucide-react';
import api from '@/lib/api';

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
  color = 'amber',
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  suffix?: string;
  color?: string;
}) {
  const animated = useCountUp(value);
  const colorClasses: Record<string, string> = {
    amber: 'bg-amber-400/10 border-amber-400/20 text-amber-400',
    emerald: 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400',
    sky: 'bg-sky-400/10 border-sky-400/20 text-sky-400',
    violet: 'bg-violet-400/10 border-violet-400/20 text-violet-400',
  };
  const cls = colorClasses[color] ?? colorClasses.amber;

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
          ? 'border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-[#0D1221] hover:shadow-violet-900/20'
          : 'border-amber-400/15 bg-gradient-to-br from-amber-400/5 to-[#0D1221] hover:shadow-amber-900/20'
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
          isClause ? 'bg-violet-500/15' : 'bg-amber-400/15'
        }`}>
          <Newspaper className={`w-5 h-5 ${isClause ? 'text-violet-400' : 'text-amber-400'}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-white leading-snug line-clamp-2">{item.title}</p>
          {item.metadata?.playerName && (
            <p className="text-xs text-slate-400 mt-1 truncate">
              {item.metadata.playerName}
              {item.metadata.toTeamName && (
                <span className="text-amber-400"> → {item.metadata.toTeamName}</span>
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

  return (
    <div className="flex flex-col">

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="relative min-h-[96vh] flex items-center overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] rounded-full bg-amber-400/6 blur-[140px]" />
          <div className="absolute bottom-1/4 right-1/5 w-[400px] h-[400px] rounded-full bg-orange-600/5 blur-[100px]" />
          <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-amber-500/4 blur-[80px]" />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: `linear-gradient(rgba(251,191,36,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.6) 1px, transparent 1px)`,
              backgroundSize: '72px 72px',
            }}
          />
          {/* Diagonal lines */}
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, rgba(251,191,36,0.4) 0, rgba(251,191,36,0.4) 1px, transparent 0, transparent 50%)`,
              backgroundSize: '36px 36px',
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
          <div className="max-w-5xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-amber-400/25 bg-amber-400/8 text-amber-400 text-sm font-semibold mb-10 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Saison 2026 — EA FC 26 · Inscriptions ouvertes
            </div>

            <h1 className="font-display font-black leading-none mb-8">
              <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-white">
                REJOIGNEZ
              </span>
              <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500">
                L'ÉLITE
              </span>
              <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-white">
                EA FC 26
              </span>
            </h1>

            <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mb-4 leading-relaxed">
              La plateforme officielle <span className="text-amber-400 font-semibold">OMJEP</span> pour les compétitions EA FC au Maroc.
              Créez votre club, signez des joueurs, et prouvez que vous êtes le meilleur.
            </p>

            {stats && (
              <p className="text-slate-500 text-sm mb-10">
                Déjà{' '}
                <span className="text-white font-bold">{stats.totalPlayers.toLocaleString('fr-FR')}</span> joueurs
                {' '}dans{' '}
                <span className="text-white font-bold">{stats.totalClubs}</span> clubs actifs
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-amber-400 to-orange-500 text-[#0A0E1A] hover:from-amber-300 hover:to-orange-400 transition-all shadow-xl shadow-amber-400/30 hover:shadow-amber-400/50 hover:-translate-y-0.5 active:translate-y-0"
              >
                <Crown className="w-5 h-5" fill="currentColor" />
                Rejoindre l'aventure
              </Link>
              <Link
                to="/hall-of-fame"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg border border-white/10 text-white hover:bg-white/5 hover:border-amber-400/30 hover:text-amber-400 transition-all"
              >
                <Medal className="w-5 h-5" />
                Palmarès
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0A0E1A] to-transparent pointer-events-none" />
      </section>

      {/* ── LIVE STATS ─────────────────────────────────────────── */}
      <section className="py-16 border-y border-white/5 bg-white/[0.015]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <AnimatedStat
              label="Joueurs inscrits"
              value={stats?.totalPlayers ?? 0}
              icon={Users}
              color="amber"
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
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Live</span>
                </div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-white">
                  Derniers Transferts
                </h2>
                <p className="text-slate-500 text-sm mt-1">Les moves officiels en temps réel</p>
              </div>
              <Link
                to="/register"
                className="hidden sm:flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 font-semibold transition-colors"
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
        <section className="py-20 border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-400/20 bg-amber-400/5 mb-4">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 text-xs font-bold uppercase tracking-widest">Palmarès Historique</span>
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
                      ? 'border-amber-400/30 bg-gradient-to-br from-amber-400/15 to-[#0D1221] hover:shadow-amber-900/30'
                      : 'border-white/8 bg-gradient-to-br from-white/[0.03] to-[#0D1221] hover:shadow-slate-900/30'
                  }`}
                >
                  {i === 0 && (
                    <div className="absolute top-3 right-3">
                      <div className="w-7 h-7 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
                        <Crown className="w-3.5 h-3.5 text-amber-400" fill="currentColor" />
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
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold ${
                            i === 0 ? 'bg-amber-400/20 text-amber-400' : 'bg-white/5 text-slate-400'
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
                        <Star className="w-3 h-3 text-amber-400 flex-shrink-0" />
                        <span>
                          <span className="text-amber-400 font-semibold">{entry.goldenBoot.ea_persona_name}</span>
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
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-amber-400/20 text-amber-400 hover:bg-amber-400/10 transition-all font-semibold text-sm"
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
      <section className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-white mb-4">
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
                color: 'amber',
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl border border-amber-400/20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400/8 via-orange-500/4 to-transparent" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full bg-amber-400/6 blur-[100px] pointer-events-none" />

            <div className="relative p-12 sm:p-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-400/30">
                <Crown className="w-8 h-8 text-[#0A0E1A]" fill="currentColor" />
              </div>
              <h2 className="font-display font-black text-4xl sm:text-5xl text-white mb-4">
                Prêt à dominer ?
              </h2>
              <p className="text-slate-400 max-w-lg mx-auto mb-3 text-lg">
                Créez votre compte gratuitement et recevez{' '}
                <span className="text-amber-400 font-bold">500 OMJEP Coins</span> de bienvenue.
              </p>
              <p className="text-slate-600 text-sm mb-10">
                Rejoignez la communauté OMJEP · Fédération E-sport Maroc
              </p>
              <Link
                to="/register"
                className="inline-flex items-center gap-3 px-10 py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-amber-400 to-orange-500 text-[#0A0E1A] hover:from-amber-300 hover:to-orange-400 transition-all shadow-xl shadow-amber-400/30 hover:shadow-amber-400/50 hover:-translate-y-0.5"
              >
                <Crown className="w-5 h-5" fill="currentColor" />
                Créer mon compte — Gratuit
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
