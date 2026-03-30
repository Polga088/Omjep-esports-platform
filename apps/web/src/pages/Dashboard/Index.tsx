import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Swords, Star, Shield, Crown, Flame, Trophy, ChevronRight, Users, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';

interface MemberSnapshot {
  userId: string;
  displayName: string | null;
  goals: number;
  assists: number;
  averageRating: number;
}

interface TeamOverview {
  totals: {
    goals: number;
    assists: number;
    averageAmr: number;
  };
  topScorer: MemberSnapshot | null;
  mvp: MemberSnapshot | null;
}

const quickActions = [
  { label: 'Mon Club', description: "Gérer l'effectif et les statistiques", to: '/dashboard/club', icon: Users },
  { label: 'Classement', description: 'Voir votre position dans la ligue', to: '/leaderboard', icon: Trophy },
  { label: 'Paramètres', description: 'Compte, profil et préférences', to: '/dashboard/settings', icon: Zap },
];

function SkeletonPulse({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} />;
}

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
      <SkeletonPulse className="w-10 h-10 rounded-xl mb-4" />
      <SkeletonPulse className="w-20 h-8 mb-2" />
      <SkeletonPulse className="w-28 h-4" />
    </div>
  );
}

function EmptyDataCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 flex flex-col items-center justify-center text-center min-h-[280px] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800/20 to-transparent pointer-events-none" />
      <div className="relative">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
          <Crown className="w-7 h-7 text-slate-600" />
        </div>
        <h3 className="font-display font-bold text-lg text-slate-400 mb-1">{title}</h3>
        <p className="text-slate-600 text-sm max-w-[240px]">{message}</p>
      </div>
    </div>
  );
}

export default function DashboardIndex() {
  const { user } = useAuthStore();
  const [data, setData] = useState<TeamOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<TeamOverview>('/teams/my-team/overview');
        if (!cancelled) setData(res.data);
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
    return () => { cancelled = true; };
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const statCards = data
    ? [
        {
          label: 'Puissance de Feu',
          value: data.totals.goals,
          icon: Swords,
          gradient: 'from-red-500/20 to-orange-500/10',
          border: 'border-red-500/20',
          color: 'text-red-400',
          glow: 'bg-red-500/10',
        },
        {
          label: 'Maîtres du Jeu',
          value: data.totals.assists,
          icon: Star,
          gradient: 'from-blue-500/20 to-cyan-500/10',
          border: 'border-blue-500/20',
          color: 'text-blue-400',
          glow: 'bg-blue-500/10',
        },
        {
          label: 'Discipline Collective',
          value: data.totals.averageAmr.toFixed(1),
          icon: Shield,
          gradient: 'from-emerald-500/20 to-teal-500/10',
          border: 'border-emerald-500/20',
          color: 'text-emerald-400',
          glow: 'bg-emerald-500/10',
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="relative rounded-2xl border border-amber-400/15 bg-gradient-to-br from-amber-400/5 via-transparent to-transparent p-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-amber-400/5 blur-[80px] pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/30 to-amber-600/30 flex items-center justify-center text-lg font-bold text-amber-400 uppercase border border-amber-400/20">
              {user?.ea_persona_name?.charAt(0) ?? 'U'}
            </div>
            <div>
              <p className="text-slate-500 text-sm">{greeting()},</p>
              <h1 className="font-display font-bold text-2xl text-white">
                {user?.ea_persona_name}
              </h1>
            </div>
          </div>
          <p className="text-slate-400 text-sm">
            Centre de commandement — OMJEP
          </p>
          {user?.role && (
            <span className="inline-block mt-3 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-medium capitalize">
              {user.role === 'manager' ? 'Manager de Club' : 'Joueur'}
            </span>
          )}
        </div>
      </div>

      {/* Error: No Team */}
      {error === 'no-team' && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Users className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="font-display font-bold text-xl text-amber-300 mb-2">
            Aucun club trouvé
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-4">
            Vous n'appartenez à aucune équipe pour le moment. Rejoignez un club ou créez le vôtre pour débloquer vos statistiques.
          </p>
          <Link
            to="/dashboard/club"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm font-semibold hover:bg-amber-500/20 transition-all"
          >
            Rejoindre un club
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {error === 'generic' && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="text-red-300 text-sm">
            Une erreur est survenue lors du chargement des données. Veuillez réessayer.
          </p>
        </div>
      )}

      {/* Section 1: Global Stats */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
          Statistiques Globales
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {statCards.map(({ label, value, icon: Icon, gradient, border, color, glow }) => (
              <div
                key={label}
                className={`group relative rounded-2xl border ${border} bg-gradient-to-br ${gradient} p-6 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20`}
              >
                <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full ${glow} blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative">
                  <div className={`w-10 h-10 rounded-xl ${glow} border ${border} flex items-center justify-center mb-4`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <p className={`font-display font-bold text-3xl ${color}`}>{value}</p>
                  <p className="text-slate-500 text-xs mt-1 uppercase tracking-wide">{label}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Section 2: MVP & Top Scorer */}
      {(loading || data) && (
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
            Performances Individuelles
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
                <SkeletonPulse className="w-32 h-6 mb-6" />
                <SkeletonPulse className="w-48 h-10 mb-4" />
                <SkeletonPulse className="w-full h-4 mb-2" />
                <SkeletonPulse className="w-3/4 h-4" />
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
                <SkeletonPulse className="w-24 h-6 mb-6" />
                <SkeletonPulse className="w-16 h-16 rounded-full mx-auto mb-4" />
                <SkeletonPulse className="w-32 h-8 mx-auto" />
              </div>
            </div>
          ) : data ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* MVP Card */}
              {data.mvp ? (
                <div className="group lg:col-span-2 relative rounded-2xl border border-blue-500/20 overflow-hidden transition-all duration-300 hover:border-blue-400/30 hover:shadow-xl hover:shadow-blue-900/10">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-indigo-600/10 to-transparent" />
                  <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-indigo-500/5 blur-[60px] pointer-events-none" />

                  <div className="relative p-8">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                        <Crown className="w-4 h-4 text-blue-400" />
                        <span className="text-blue-300 text-xs font-bold uppercase tracking-wider">MVP du Mois</span>
                      </div>
                    </div>

                    <div className="flex items-end justify-between">
                      <div>
                        <h3 className="font-display font-bold text-3xl text-white mb-1 group-hover:text-blue-100 transition-colors">
                          {data.mvp.displayName ?? 'Anonyme'}
                        </h3>
                        <div className="flex items-baseline gap-1 mb-6">
                          <span className="font-display font-bold text-5xl bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                            {data.mvp.averageRating.toFixed(1)}
                          </span>
                          <span className="text-blue-400/60 text-sm font-medium">AMR</span>
                        </div>

                        <div className="flex gap-6">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                              <Swords className="w-4 h-4 text-slate-400" />
                            </div>
                            <div>
                              <p className="font-display font-bold text-lg text-white">{data.mvp.goals}</p>
                              <p className="text-slate-500 text-[10px] uppercase tracking-wider">Buts</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                              <Star className="w-4 h-4 text-slate-400" />
                            </div>
                            <div>
                              <p className="font-display font-bold text-lg text-white">{data.mvp.assists}</p>
                              <p className="text-slate-500 text-[10px] uppercase tracking-wider">Passes D.</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="hidden sm:flex w-28 h-28 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/10 items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                        <Crown className="w-12 h-12 text-blue-400/80" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="lg:col-span-2">
                  <EmptyDataCard
                    title="MVP en attente"
                    message="Ajoutez des joueurs à votre club et jouez des matchs pour révéler le MVP."
                  />
                </div>
              )}

              {/* Top Scorer Card */}
              {data.topScorer ? (
                <div className="group relative rounded-2xl border border-amber-500/20 overflow-hidden transition-all duration-300 hover:border-amber-400/30 hover:shadow-xl hover:shadow-amber-900/10">
                  <div className="absolute inset-0 bg-gradient-to-b from-amber-500/15 via-orange-600/5 to-transparent" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-amber-500/10 blur-[80px] pointer-events-none" />

                  <div className="relative p-8 flex flex-col items-center text-center h-full justify-center">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
                      <Flame className="w-4 h-4 text-amber-400" />
                      <span className="text-amber-300 text-xs font-bold uppercase tracking-wider">Top Scorer</span>
                    </div>

                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                      <Trophy className="w-9 h-9 text-amber-400" />
                    </div>

                    <h3 className="font-display font-bold text-xl text-white mb-1 group-hover:text-amber-100 transition-colors">
                      {data.topScorer.displayName ?? 'Anonyme'}
                    </h3>

                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="font-display font-bold text-4xl bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                        {data.topScorer.goals}
                      </span>
                      <span className="text-amber-400/60 text-sm font-medium">buts</span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-500/20">
                      <span className="text-amber-300 text-[11px] font-bold uppercase tracking-wider">Golden Boot</span>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyDataCard
                  title="Buteur en attente"
                  message="Aucun but enregistré pour le moment. Les stats se mettent à jour automatiquement."
                />
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
          Accès rapide
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map(({ label, description, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="group p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-amber-400/20 transition-all duration-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-400/10 group-hover:border-amber-400/20 transition-all">
                  <Icon className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white group-hover:text-amber-400 transition-colors">
                    {label}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400/60 flex-shrink-0 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
