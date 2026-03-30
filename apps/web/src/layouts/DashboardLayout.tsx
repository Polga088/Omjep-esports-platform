import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Crown, LayoutDashboard, Users, Trophy, ShoppingBag,
  LogOut, ChevronRight, Menu, X, UserCog, Swords, Settings, Wallet, Repeat,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import NotificationBell from '@/components/NotificationBell';
import GoldConfetti from '@/components/GoldConfetti';
import { useTransferNotifications } from '@/hooks/useTransferNotifications';
import api from '@/lib/api';

const sidebarLinks = [
  { to: '/dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard, exact: true },
  { to: '/dashboard/team', label: 'Mon Équipe', icon: Users },
  { to: '/dashboard/ladder', label: 'Classement', icon: Trophy },
  { to: '/dashboard/matches', label: 'Matchs', icon: Swords },
  { to: '/dashboard/store', label: 'Boutique', icon: ShoppingBag },
  { to: '/dashboard/transfers', label: 'Mercato Live', icon: Repeat },
  { to: '/dashboard/profile', label: 'Mon Profil', icon: UserCog },
  { to: '/dashboard/settings', label: 'Paramètres', icon: Settings },
];

const pageTitles: Record<string, string> = {
  '/dashboard': 'Vue d\'ensemble',
  '/dashboard/team': 'Mon Équipe',
  '/dashboard/ladder': 'Classement',
  '/dashboard/matches': 'Matchs',
  '/dashboard/store': 'Market Place',
  '/dashboard/transfers': 'Mercato Live',
  '/dashboard/profile': 'Mon Profil',
  '/dashboard/settings': 'Paramètres',
};

function formatBudget(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toFixed(0);
}

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [budget, setBudget] = useState<number | null>(null);
  const { showConfetti } = useTransferNotifications();

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ budget: number }>('/teams/my-team')
      .then(({ data }) => {
        if (!cancelled) setBudget(data.budget);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  const currentPageTitle = pageTitles[location.pathname] ?? location.pathname.split('/').pop();

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-amber-400/10">
        <Link to="/" className="flex items-center gap-3 group" onClick={() => setSidebarOpen(false)}>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-400/20">
            <Crown className="w-5 h-5 text-[#0A0E1A]" fill="currentColor" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-widest text-amber-400 uppercase block leading-tight">
              OMJEP
            </span>
            <span className="text-[10px] text-slate-500 tracking-wider uppercase leading-tight block">
              Org. Marocaine des Jeux Électroniques Pro
            </span>
          </div>
        </Link>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-amber-400/10">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400/30 to-amber-600/30 flex items-center justify-center text-sm font-bold text-amber-400 uppercase border border-amber-400/20 shrink-0">
            {user?.ea_persona_name?.charAt(0) ?? 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.ea_persona_name ?? 'Joueur'}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role ?? 'manager'}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {sidebarLinks.map(({ to, label, icon: Icon, exact }) => {
          const active = isActive(to, exact);
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                active
                  ? 'text-amber-400 bg-amber-400/10 border border-amber-400/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 text-amber-400/60" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-amber-400/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/10 transition-all group"
        >
          <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          Déconnexion
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-slate-100 flex">
      <GoldConfetti active={showConfetti} />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — desktop always visible, mobile drawer */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-64 min-h-screen flex flex-col
          border-r border-amber-400/10 bg-[#020617]
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b border-amber-400/10 bg-[#0A0E1A]/80 backdrop-blur-md flex items-center px-4 lg:px-8 gap-4 sticky top-0 z-10">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Ouvrir le menu"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Dashboard</span>
            {location.pathname !== '/dashboard' && (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-slate-300 capitalize">{currentPageTitle}</span>
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-3">
            {budget !== null && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-400 tabular-nums">
                  {formatBudget(budget)} €
                </span>
              </div>
            )}
            <NotificationBell />
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
