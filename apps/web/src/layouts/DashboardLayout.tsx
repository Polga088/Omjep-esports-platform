import { useState, useEffect, useCallback } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Crown, LayoutDashboard, Users, Trophy, ShoppingBag,
  LogOut, ChevronRight, Menu, X, UserCog, Swords, Settings, Wallet, Repeat, Scale, Gamepad2,
  Building2,
  Dices,
  Medal,
  MessageCircle,
  Coins,
  Archive,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import NotificationBell from '@/components/NotificationBell';
import LiveTicker from '@/components/LiveTicker';
import GoldConfetti from '@/components/GoldConfetti';
import { useTransferNotifications } from '@/hooks/useTransferNotifications';
import { useAppNotifications } from '@/hooks/useAppNotifications';
import { useAppNotificationStore } from '@/store/useAppNotificationStore';
import api from '@/lib/api';
import { formatCurrency } from '@/utils/formatCurrency';

type SidebarLink = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  managerOnly?: boolean;
};

const sidebarLinks: SidebarLink[] = [
  { to: '/dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard, exact: true },
  { to: '/dashboard/team', label: 'Mon Équipe', icon: Users },
  { to: '/dashboard/ladder', label: 'Classement clubs', icon: Trophy },
  { to: '/dashboard/leaderboard', label: 'Classement global', icon: Medal },
  { to: '/hall-of-fame', label: 'Palmarès', icon: Medal },
  { to: '/dashboard/matches', label: 'Matchs', icon: Swords },
  { to: '/dashboard/gamification', label: 'Mon Parcours', icon: Gamepad2 },
  { to: '/dashboard/predictions', label: 'Predict & Win', icon: Dices },
  { to: '/dashboard/store', label: 'Boutique', icon: ShoppingBag },
  { to: '/dashboard/vault', label: 'The Vault', icon: Archive },
  { to: '/dashboard/transfers', label: 'Mercato Live', icon: Repeat },
  { to: '/dashboard/chat', label: 'Tactical Link', icon: MessageCircle },
  { to: '/dashboard/profile', label: 'Mon Profil', icon: UserCog },
  { to: '/dashboard/settings', label: 'Paramètres', icon: Settings },
  { to: '/dashboard/manager/club', label: 'Créer mon club', icon: Building2, managerOnly: true },
];

const pageTitles: Record<string, string> = {
  '/dashboard': 'Vue d\'ensemble',
  '/dashboard/team': 'Mon Équipe',
  '/dashboard/ladder': 'Classement clubs',
  '/dashboard/leaderboard': 'Classement global',
  '/dashboard/matches': 'Matchs',
  '/dashboard/gamification': 'Mon Parcours',
  '/dashboard/predictions': 'Predict & Win',
  '/dashboard/store': 'Boutique',
  '/dashboard/vault': 'The Vault',
  '/dashboard/transfers': 'Mercato Live',
  '/dashboard/chat': 'Tactical Link',
  '/dashboard/profile': 'Mon Profil',
  '/dashboard/settings': 'Paramètres',
  '/dashboard/manager/club': 'Créer mon club',
};

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, patchUser } = useAuthStore();
  const isManagerRole = user?.role === 'MANAGER';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [budget, setBudget] = useState<number | null>(null);
  const { showConfetti, mercatoLiveBadge } = useTransferNotifications();
  const { notifications, refreshNotifications, syncUnread } = useAppNotifications();
  const appUnreadCount = useAppNotificationStore((s) => s.unreadCount);

  const refreshTeamBudget = useCallback(() => {
    void api
      .get<{ budget: number }>('/teams/my-team')
      .then(({ data }) => setBudget(data.budget))
      .catch(() => setBudget(null));
  }, []);

  useEffect(() => {
    refreshTeamBudget();
  }, [refreshTeamBudget]);

  /** Mercato / transferts : budget club + portefeuille à jour */
  useEffect(() => {
    const onTransfers = () => {
      refreshTeamBudget();
      void api
        .get<{
          omjepCoins?: number;
          jepyCoins?: number;
          isPremium?: boolean;
          avatarUrl?: string | null;
          avatarRarity?: 'common' | 'premium' | 'legendary';
          activeBannerUrl?: string | null;
          activeFrameUrl?: string | null;
          activeJerseyId?: string | null;
          teamPrimaryColor?: string;
          teamSecondaryColor?: string;
        }>('/auth/me')
        .then(({ data }) => {
          if (!data) return;
          patchUser({
            omjepCoins:
              typeof data.omjepCoins === 'number' && Number.isFinite(data.omjepCoins) ? data.omjepCoins : undefined,
            jepyCoins:
              typeof data.jepyCoins === 'number' && Number.isFinite(data.jepyCoins) ? data.jepyCoins : undefined,
            isPremium: data.isPremium === true,
            avatarUrl: data.avatarUrl ?? undefined,
            avatarRarity: data.avatarRarity,
            activeBannerUrl: data.activeBannerUrl ?? undefined,
            activeFrameUrl: data.activeFrameUrl ?? undefined,
            activeJerseyId: data.activeJerseyId ?? undefined,
            teamPrimaryColor: data.teamPrimaryColor,
            teamSecondaryColor: data.teamSecondaryColor,
          });
        })
        .catch(() => {});
    };
    window.addEventListener('omjep:transfers-refresh', onTransfers);
    return () => window.removeEventListener('omjep:transfers-refresh', onTransfers);
  }, [patchUser, refreshTeamBudget]);

  /** Synchronise le wallet (OMJEP/JEPY) avec le JWT / DB — évite un state obsolète après ajout des colonnes. */
  useEffect(() => {
    let cancelled = false;
    api
      .get<{
        omjepCoins?: number;
        jepyCoins?: number;
        isPremium?: boolean;
        avatarUrl?: string | null;
        avatarRarity?: 'common' | 'premium' | 'legendary';
        activeBannerUrl?: string | null;
        activeFrameUrl?: string | null;
        activeJerseyId?: string | null;
        teamPrimaryColor?: string;
        teamSecondaryColor?: string;
      }>('/auth/me')
      .then(({ data }) => {
        if (cancelled || !data) return;
        const o = data.omjepCoins;
        const j = data.jepyCoins;
        patchUser({
          omjepCoins:
            typeof o === 'number' && Number.isFinite(o) ? o : 1000,
          jepyCoins:
            typeof j === 'number' && Number.isFinite(j) ? j : 0,
          isPremium: data.isPremium === true,
          avatarUrl: data.avatarUrl ?? undefined,
          avatarRarity: data.avatarRarity,
          activeBannerUrl: data.activeBannerUrl ?? undefined,
          activeFrameUrl: data.activeFrameUrl ?? undefined,
          activeJerseyId: data.activeJerseyId ?? undefined,
          teamPrimaryColor: data.teamPrimaryColor,
          teamSecondaryColor: data.teamSecondaryColor,
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [patchUser]);

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
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.ea_persona_name ?? 'Joueur'}</p>
              {user?.isPremium === true && (
                <span
                  className="inline-flex shrink-0 items-center justify-center rounded-md border border-amber-400/35 bg-gradient-to-br from-amber-400/20 to-amber-600/10 p-1 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.25)]"
                  title="VIP"
                  aria-label="Compte VIP"
                >
                  <Crown className="h-3.5 w-3.5" fill="currentColor" />
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {user?.role === 'MODERATOR'
                ? 'Commissaire'
                : user?.role === 'ADMIN'
                  ? 'Admin'
                  : user?.role === 'MANAGER'
                    ? 'Manager'
                    : 'Joueur'}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {sidebarLinks
          .filter((link) => !link.managerOnly || user?.role === 'MANAGER')
          .map(({ to, label, icon: Icon, exact }) => {
          const active = isActive(to, exact);
          const mercatoPulse = to === '/dashboard/transfers' && mercatoLiveBadge;
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                active
                  ? 'text-amber-400 bg-amber-400/10 border border-amber-400/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <span className="relative shrink-0">
                <Icon
                  className={`w-4 h-4 transition-colors duration-200 ${
                    active ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                  style={
                    active
                      ? {
                          filter:
                            'drop-shadow(0 0 3px rgba(34, 211, 238, 0.35)) drop-shadow(0 0 10px rgba(6, 182, 212, 0.1))',
                        }
                      : undefined
                  }
                />
                {mercatoPulse && (
                  <span
                    className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#020617]"
                    aria-hidden
                  />
                )}
              </span>
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 text-amber-400/60" />}
            </Link>
          );
        })}

        {user?.role === 'MODERATOR' && (
          <Link
            to="/moderator"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group mt-2 border ${
              location.pathname.startsWith('/moderator')
                ? 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-400/5 border-transparent'
            }`}
          >
            <Scale
              className="w-4 h-4 shrink-0"
              style={
                location.pathname.startsWith('/moderator')
                  ? {
                      filter:
                        'drop-shadow(0 0 3px rgba(34, 211, 238, 0.4)) drop-shadow(0 0 10px rgba(6, 182, 212, 0.12))',
                    }
                  : undefined
              }
            />
            <span className="flex-1">Commissaire de ligue</span>
            {location.pathname.startsWith('/moderator') && (
              <ChevronRight className="w-3.5 h-3.5 text-cyan-400/60" />
            )}
          </Link>
        )}
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
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex">
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
        <header className="dashboard-top-glass sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-white/[0.07] bg-[#070b12]/45 px-4 shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl backdrop-saturate-150 lg:px-8">
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

          <div className="ml-auto flex items-center gap-2 sm:gap-3 flex-wrap justify-end max-w-[min(100vw-6rem,36rem)]">
            <div
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20"
              title="Jepy"
            >
              <Coins className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <span className="hidden sm:inline text-[10px] uppercase tracking-wide text-slate-500">Jepy</span>
              <span className="text-xs sm:text-sm font-bold text-violet-300 tabular-nums">
                {formatCurrency(user?.jepyCoins ?? 0, 'Jepy')}
              </span>
            </div>
            <div
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20"
              title="OMJEP perso"
            >
              <span className="text-[10px] uppercase tracking-wide text-slate-500 hidden sm:inline">OC</span>
              <span className="text-xs sm:text-sm font-bold text-amber-300 tabular-nums">
                {formatCurrency(user?.omjepCoins ?? 0, 'OC')}
              </span>
            </div>
            {isManagerRole && budget !== null && (
              <div
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
                title="Budget club"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-[10px] uppercase tracking-wide text-slate-500 hidden sm:inline">Club</span>
                <span className="text-xs sm:text-sm font-bold text-emerald-400 tabular-nums">
                  {formatCurrency(budget, 'OC')}
                </span>
              </div>
            )}
            <NotificationBell
              appUnreadCount={appUnreadCount}
              inboxNotifications={notifications}
              onRefreshInbox={async () => {
                await refreshNotifications();
                await syncUnread();
              }}
            />
          </div>
        </header>

        <div className="shrink-0">
          <LiveTicker />
        </div>

        <div className="dashboard-layout-scroll flex-1 overflow-auto p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
