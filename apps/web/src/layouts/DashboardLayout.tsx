import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  UserCog,
  Swords,
  Settings,
  Repeat,
  Gamepad2,
  Calendar,
  Building2,
  Dices,
  Medal,
  MessageCircle,
  Archive,
  ChevronRight,
  Headphones,
  Trophy,
  Newspaper,
  Bell,
  Sun,
  Moon,
  Menu,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useTheme } from '@/context/ThemeContext';
import PlayerIdentity from '@/components/PlayerIdentity';
import LiveTicker from '@/components/LiveTicker';
import GoldConfetti from '@/components/GoldConfetti';
import SystemStatusIndicator from '@/components/SystemStatusIndicator';
import type { DockItem } from '@/components/cockpit/BottomDock';
import { useTransferNotifications } from '@/hooks/useTransferNotifications';
import api from '@/lib/api';
import { formatAmountDigits } from '@/utils/formatCurrency';
import {
  fetchMyPremiumProfile,
  getEquippedCardStyle,
  mapCardRarityToIdentityRarity,
} from '@/features/profile/mocks/premiumProfile.mock';
const dockPrimary: DockItem[] = [
  { to: '/dashboard', label: 'Cockpit', icon: LayoutDashboard, exact: true },
  { to: '/dashboard/team', label: 'Mon Équipe', icon: Users },
  { to: '/dashboard/matches', label: 'Matchs', icon: Swords },
  { to: '/dashboard/transfers', label: 'Mercato', icon: Repeat },
  { to: '/dashboard/leaderboard', label: 'Classement', icon: Medal },
  { to: '/dashboard/ladder', label: 'Classement compétition', icon: Trophy },
  { to: '/community', label: 'Community', icon: Newspaper },
  { to: '/dashboard/store', label: 'Boutique', icon: ShoppingBag },
  { to: '/dashboard/predictions', label: 'Predict', icon: Dices },
];

const dockSecondary: DockItem[] = [
  { to: '/dashboard/schedule', label: 'Calendrier', icon: Calendar },
  { to: '/dashboard/gamification', label: 'Parcours', icon: Gamepad2 },
  { to: '/dashboard/vault', label: 'The Vault', icon: Archive },
  { to: '/dashboard/chat', label: 'Tactical Link', icon: MessageCircle },
  { to: '/dashboard/support', label: 'Support', icon: Headphones },
  { to: '/dashboard/profile', label: 'Profil', icon: UserCog },
  { to: '/dashboard/settings', label: 'Paramètres', icon: Settings },
];

const pageTitles: Record<string, string> = {
  '/dashboard': 'Cockpit',
  '/dashboard/team': 'Mon Équipe',
  '/dashboard/ladder': 'Classement compétition',
  '/dashboard/leaderboard': 'Classement global',
  '/community': 'Community',
  '/dashboard/matches': 'Matchs',
  '/dashboard/schedule': 'Calendrier',
  '/dashboard/gamification': 'Mon Parcours',
  '/dashboard/predictions': 'Predict & Win',
  '/dashboard/store': 'Boutique',
  '/dashboard/vault': 'The Vault',
  '/dashboard/transfers': 'Mercato Live',
  '/dashboard/chat': 'Tactical Link',
  '/dashboard/support': 'Support',
  '/dashboard/profile': 'Mon Profil',
  '/dashboard/settings': 'Paramètres',
  '/dashboard/manager/club': 'Créer mon club',
  '/dashboard-preview': 'Cockpit Preview',
};

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, patchUser } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const isManagerRole = user?.role === 'MANAGER';
  const [budget, setBudget] = useState<number | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { showConfetti, mercatoLiveBadge } = useTransferNotifications();

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

  useEffect(() => {
    let cancelled = false;
    void fetchMyPremiumProfile().then((profile) => {
      if (cancelled) return;
      const equippedStyle = getEquippedCardStyle(profile);
      if (!equippedStyle) return;
      patchUser({
        avatarRarity: mapCardRarityToIdentityRarity(equippedStyle.rarity),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [patchUser]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const currentPageTitle =
    pageTitles[location.pathname] ?? location.pathname.split('/').pop() ?? '';
  const rawOc = user?.omjepCoins ?? 100000;
  const rawJepy = user?.jepyCoins ?? 0;
  const walletText = `${rawOc.toLocaleString('de-DE')} OC`
  const jepyText = `${rawJepy.toLocaleString('de-DE')} JPY`
  const budgetText = budget !== null ? `${formatAmountDigits(budget)} OC` : null;
  const sidebarItems = useMemo(() => {
    const list = [...dockPrimary];
    if (isManagerRole) list.push({ to: '/dashboard/manager/club', label: 'Club Manager', icon: Building2 });
    list.push(...dockSecondary);
    return list;
  }, [isManagerRole]);

  const isItemActive = (item: DockItem) => {
    if (item.exact) return location.pathname === item.to;
    if (item.to === '/community') {
      return location.pathname === '/community' || location.pathname.startsWith('/community/');
    }
    return location.pathname.startsWith(item.to);
  };

  return (
    <div className={`dashboard-layout-shell relative flex min-h-[100dvh] overflow-x-hidden bg-omjep-bg text-omjep-text-primary`}>
      <div className="omjep-dashboard-ambient" aria-hidden />
      <GoldConfetti active={showConfetti} />
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-[35] bg-[color-mix(in_srgb,#020308_55%,transparent)] backdrop-blur-sm lg:hidden"
          aria-label="Fermer le menu"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(18rem,100vw-3rem)] flex-col border-r border-omjep-border/90 bg-omjep-bg-panel/95 px-4 py-5 shadow-[inset_-1px_0_0_color-mix(in_srgb,var(--omjep-border)_40%,transparent)] backdrop-blur-2xl transition-transform duration-200 ease-out lg:z-30 lg:w-72 lg:max-w-none lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-2 lg:mb-6 lg:block">
          <Link
            to="/dashboard"
            className="flex flex-1 items-center gap-2 px-2 lg:mb-0"
            aria-label="Cockpit OMJEP"
            onClick={() => setMobileNavOpen(false)}
          >
            <span className="font-heading text-xs font-semibold uppercase tracking-[0.28em] text-omjep-gold">OMJEP</span>
          </Link>
          <button
            type="button"
            className="rounded-lg border border-omjep-border/70 p-2 text-omjep-text-secondary transition hover:bg-omjep-bg-panel-soft/60 hover:text-omjep-text-primary lg:hidden"
            aria-label="Fermer la navigation"
            onClick={() => setMobileNavOpen(false)}
          >
            <ChevronRight className="h-4 w-4 rotate-180" aria-hidden />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto overscroll-contain" aria-label="Navigation dashboard">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const active = isItemActive(item)
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileNavOpen(false)}
                className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                  active
                    ? 'border-omjep-mauve/65 bg-omjep-mauve/15 text-omjep-mauve shadow-[0_0_24px_-8px_rgba(110,89,217,0.7)]'
                    : 'border-transparent text-omjep-text-secondary hover:border-omjep-mauve/35 hover:bg-omjep-bg-panel-soft/45 hover:text-omjep-text-primary hover:shadow-[0_0_20px_-10px_rgba(110,89,217,0.75)]'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-omjep-mauve' : ''}`} aria-hidden />
                <span className="text-sm font-semibold tracking-wide">{item.label}</span>
                {active ? <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-omjep-mauve/80" aria-hidden /> : null}
              </Link>
            )
          })}
        </nav>

        <div className="space-y-2 rounded-xl border border-omjep-border/80 bg-omjep-bg-panel-soft/50 p-3 shadow-sm">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-omjep-text-muted">{walletText}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-omjep-text-muted">{jepyText}</p>
          {isManagerRole && budgetText ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-omjep-gold">{budgetText}</p>
          ) : null}
        </div>
      </aside>

      <section className="relative z-10 flex min-h-[100dvh] w-full flex-col lg:pl-72">
        <header className="dashboard-cockpit-topbar sticky top-0 z-20 flex min-h-16 flex-wrap items-center justify-between gap-2 border-b border-omjep-border px-3 py-2.5 backdrop-blur-xl sm:gap-3 sm:px-5 sm:py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="shrink-0 rounded-lg border border-omjep-border/70 p-2 text-omjep-text-secondary transition hover:bg-omjep-bg-panel-soft/50 hover:text-omjep-text-primary lg:hidden"
              aria-label="Ouvrir la navigation"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-heading text-base font-extrabold tracking-tight text-omjep-text-primary sm:text-lg md:text-xl">
                {currentPageTitle}
              </h1>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-omjep-text-muted">Cockpit</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
            <button
              type="button"
              className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-omjep-border/80 bg-omjep-bg-panel-soft/70 text-omjep-text-primary transition hover:border-omjep-mauve/40 hover:bg-omjep-bg-panel-soft"
              aria-label="Notifications, 3 non lues (démo)"
            >
              <Bell className="h-4 w-4" aria-hidden />
              <span className="absolute right-1 top-1 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-omjep-mauve px-0.5 text-[8px] font-black tabular-nums text-white">
                3
              </span>
            </button>
            <button
              type="button"
              onClick={() => toggleTheme()}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-omjep-border/80 bg-omjep-bg-panel-soft/70 text-omjep-text-primary transition hover:border-omjep-mauve/40 hover:bg-omjep-bg-panel-soft"
              aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-omjep-gold" aria-hidden />
              ) : (
                <Moon className="h-4 w-4 text-omjep-mauve" aria-hidden />
              )}
            </button>
            <div className="hidden items-center gap-2 sm:flex">
              <PlayerIdentity
                size="sm"
                initial={user?.ea_persona_name?.charAt(0) ?? 'U'}
                avatarUrl={user?.avatarUrl}
                rarity={user?.avatarRarity ?? 'common'}
                activeFrameUrl={user?.activeFrameUrl}
                activeJerseyId={user?.activeJerseyId}
                teamPrimaryColor={user?.teamPrimaryColor}
                teamSecondaryColor={user?.teamSecondaryColor}
              />
              <div className="min-w-0 max-w-[10rem] md:max-w-[14rem]">
                <p className="truncate text-sm font-semibold text-omjep-text-primary">{user?.ea_persona_name ?? 'Joueur'}</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-omjep-text-muted">
                  {user?.role === 'MANAGER' ? 'Manager' : user?.role === 'ADMIN' ? 'Admin' : 'Joueur'}
                </p>
              </div>
            </div>
            <SystemStatusIndicator />
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Déconnexion"
              className="shrink-0 rounded-lg border border-omjep-border px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-omjep-text-secondary transition-colors hover:border-omjep-border-gold hover:text-omjep-text-primary sm:px-3 sm:text-[11px]"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="border-b border-omjep-border/50 bg-omjep-bg-panel-soft/60 backdrop-blur-md">
          <LiveTicker />
          {mercatoLiveBadge ? (
            <div className="container-dashboard pt-0">
              <span className="omjep-badge omjep-badge--gold mt-2 inline-flex">Mercato live</span>
            </div>
          ) : null}
        </div>

        <main className="dashboard-layout-scroll omjep-shell-main-fill flex-1 overflow-y-auto overflow-x-hidden py-6">
          <div className="container-dashboard">
            <Outlet />
          </div>
        </main>
      </section>
    </div>
  );
}
