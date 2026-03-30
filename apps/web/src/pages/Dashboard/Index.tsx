import { useAuthStore } from '@/store/useAuthStore';
import { Trophy, Users, Swords, TrendingUp, Zap, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const quickStats = [
  { label: 'Matchs joués', value: '—', icon: Swords, color: 'text-[#00D4FF]', bg: 'bg-[#00D4FF]/10', border: 'border-[#00D4FF]/20' },
  { label: 'Victoires', value: '—', icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
  { label: 'Classement', value: '—', icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
  { label: 'Club', value: '—', icon: Users, color: 'text-[#FF6B35]', bg: 'bg-[#FF6B35]/10', border: 'border-[#FF6B35]/20' },
];

const quickActions = [
  { label: 'Mon Club', description: 'Gérer l\'effectif et les statistiques', to: '/dashboard/club', icon: Users },
  { label: 'Classement', description: 'Voir votre position dans la ligue', to: '/leaderboard', icon: Trophy },
  { label: 'Paramètres', description: 'Compte, profil et préférences', to: '/dashboard/settings', icon: Zap },
];

export default function DashboardIndex() {
  const { user } = useAuthStore();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="relative rounded-2xl border border-[#00D4FF]/15 bg-gradient-to-br from-[#00D4FF]/5 via-transparent to-transparent p-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#00D4FF]/5 blur-[80px] pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00D4FF]/30 to-[#FF6B35]/30 flex items-center justify-center text-lg font-bold text-[#00D4FF] uppercase border border-[#00D4FF]/20">
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
            Bienvenue sur votre tableau de bord OMJEP Eagles. Gérez votre carrière e-sport depuis ici.
          </p>
          {user?.role && (
            <span className="inline-block mt-3 px-3 py-1 rounded-full bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF] text-xs font-medium capitalize">
              {user.role === 'manager' ? 'Manager de Club' : 'Joueur'}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Statistiques
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickStats.map(({ label, value, icon: Icon, color, bg, border }) => (
            <div
              key={label}
              className={`p-5 rounded-xl border ${border} ${bg} flex flex-col gap-3`}
            >
              <Icon className={`w-5 h-5 ${color}`} />
              <div>
                <p className={`font-display font-bold text-2xl ${color}`}>{value}</p>
                <p className="text-slate-500 text-xs mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Accès rapide
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map(({ label, description, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="group p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-[#00D4FF]/20 transition-all flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#00D4FF]/10 group-hover:border-[#00D4FF]/20 transition-all">
                <Icon className="w-4 h-4 text-slate-400 group-hover:text-[#00D4FF] transition-colors" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white group-hover:text-[#00D4FF] transition-colors">
                  {label}
                </p>
                <p className="text-xs text-slate-500 truncate">{description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-[#00D4FF]/60 flex-shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent activity placeholder */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Activité récente
        </h2>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center">
          <Swords className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Aucune activité récente</p>
          <p className="text-slate-600 text-xs mt-1">Vos matchs et événements apparaîtront ici.</p>
        </div>
      </div>
    </div>
  );
}
