import { useState, useEffect, useCallback, useMemo, type MouseEvent as ReactMouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
  Coins,
  Archive,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import PlayerIdentity from '@/components/PlayerIdentity';
import NotificationCenter from '@/components/NotificationCenter';
import LiveTicker from '@/components/LiveTicker';
import GoldConfetti from '@/components/GoldConfetti';
import SystemStatusIndicator from '@/components/SystemStatusIndicator';
import BottomDock, { type DockItem } from '@/components/cockpit/BottomDock';
import CinematicRouteStage from '@/components/cockpit/CinematicRouteStage';
import ContactZone from '@/components/cockpit/ContactZone';
import { useTransferNotifications } from '@/hooks/useTransferNotifications';
import { useAppNotifications } from '@/hooks/useAppNotifications';
import { useAppNotificationStore } from '@/store/useAppNotificationStore';
import api from '@/lib/api';
import { formatAmountDigits } from '@/utils/formatCurrency';
import {
  fetchMyPremiumProfile,
  getEquippedCardStyle,
  mapCardRarityToIdentityRarity,
} from '@/features/profile/mocks/premiumProfile.mock';
import { useTheme } from '@/context/ThemeContext';

const dockPrimary: DockItem[] = [
  { to: '/dashboard/team', label: 'Mon Équipe', icon: Users },
  { to: '/dashboard/matches', label: 'Matchs', icon: Swords },
  { to: '/dashboard/transfers', label: 'Mercato', icon: Repeat },
  { to: '/dashboard/leaderboard', label: 'Classement', icon: Medal },
  { to: '/dashboard/store', label: 'Boutique', icon: ShoppingBag },
  { to: '/dashboard/predictions', label: 'Predict', icon: Dices },
];

const dockCenter: DockItem = {
  to: '/dashboard',
  label: 'Cockpit',
  icon: LayoutDashboard,
  exact: true,
};

const dockSecondary: DockItem[] = [
  { to: '/dashboard/schedule', label: 'Calendrier', icon: Calendar },
  { to: '/dashboard/gamification', label: 'Parcours', icon: Gamepad2 },
  { to: '/dashboard/vault', label: 'The Vault', icon: Archive },
  { to: '/dashboard/chat', label: 'Tactical Link', icon: MessageCircle },
  { to: '/dashboard/profile', label: 'Profil', icon: UserCog },
  { to: '/dashboard/settings', label: 'Paramètres', icon: Settings },
];

const pageTitles: Record<string, string> = {
  '/dashboard': 'Cockpit',
  '/dashboard/team': 'Mon Équipe',
  '/dashboard/ladder': 'Classement clubs',
  '/dashboard/leaderboard': 'Classement global',
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
};

export default function DashboardLayout() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, patchUser } = useAuthStore();
  const isManagerRole = user?.role === 'MANAGER';
  const [budget, setBudget] = useState<number | null>(null);
  const [extraOpen, setExtraOpen] = useState(false);
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

  /** Plein écran cockpit : bloque le scroll body. */
  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.documentElement.classList.add('cockpit-fullscreen');
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
      document.documentElement.classList.remove('cockpit-fullscreen');
    };
  }, []);

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

  /** Auto-close du panneau extras quand la route change */
  useEffect(() => {
    setExtraOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const currentPageTitle =
    pageTitles[location.pathname] ?? location.pathname.split('/').pop() ?? '';
  const rawOc = user?.omjepCoins ?? 100000;
  const rawJepy = user?.jepyCoins ?? 0;
  const walletText = `${rawOc.toLocaleString('de-DE')} OC`;
  const jepyText = `${rawJepy.toLocaleString('de-DE')} JPY`;
  const budgetText = budget !== null ? `${formatAmountDigits(budget)} OC` : null;

  const handleDashboardMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    event.currentTarget.style.setProperty('--omjep-mx', `${x}px`);
    event.currentTarget.style.setProperty('--omjep-my', `${y}px`);
  };

  const handleDashboardMouseLeave = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty('--omjep-mx', '0px');
    event.currentTarget.style.setProperty('--omjep-my', '0px');
  };

  const dockItems = useMemo(() => {
    const list = [...dockPrimary];
    if (isManagerRole) list.push({ to: '/dashboard/manager/club', label: 'Club Manager', icon: Building2 });
    return list;
  }, [isManagerRole]);

  return (
    <div
      className={`dashboard-layout-shell dashboard-cockpit-shell fixed inset-0 z-0 flex h-[100dvh] w-[100vw] flex-col overflow-hidden ${isDark ? 'bg-[#000000] text-slate-100' : 'bg-[#FFFFFF] text-slate-900'}`}
      onMouseMove={handleDashboardMouseMove}
      onMouseLeave={handleDashboardMouseLeave}
    >
      <GoldConfetti active={showConfetti} />

      {/* Top HUD compact (toujours visible) */}
      <header className={`dashboard-cockpit-topbar relative z-30 flex h-14 shrink-0 items-center gap-3 border-b px-3 backdrop-blur-2xl sm:px-5 ${isDark ? 'border-white/10 bg-black' : 'border-black/10 bg-white'}`}>
        <Link
          to="/dashboard"
          className="flex shrink-0 items-center gap-2"
          aria-label="Cockpit OMJEP"
        >
          <span className={`font-heading text-[11px] font-semibold uppercase tracking-[0.28em] ${isDark ? 'text-white/80' : 'text-black/80'}`}>
            OMJEP
          </span>
        </Link>

        <span className={`hidden h-5 w-px sm:block ${isDark ? 'bg-white/10' : 'bg-black/10'}`} aria-hidden />

        <div className={`font-mono min-w-0 flex-1 truncate text-[11px] uppercase tracking-[0.24em] ${isDark ? 'text-white/50' : 'text-black/50'}`}>
          {currentPageTitle}
        </div>

        {/* Identité minimale */}
        <div className="hidden items-center gap-2 lg:flex">
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
          <div className="min-w-0 leading-none">
            <p className={`truncate font-display text-xs font-bold ${isDark ? 'text-white' : 'text-black'}`}>
              {user?.ea_persona_name ?? 'Joueur'}
            </p>
            <p className={`text-[9px] font-bold uppercase tracking-[0.22em] ${isDark ? 'text-white/45' : 'text-black/45'}`}>
              {user?.role === 'MANAGER' ? 'Manager' : user?.role === 'ADMIN' ? 'Admin' : 'Joueur'}
            </p>
          </div>
        </div>

        <span className={`hidden h-5 w-px sm:block ${isDark ? 'bg-white/10' : 'bg-black/10'}`} aria-hidden />

        <button
          type="button"
          className={`font-mono text-[11px] tracking-[0.14em] rounded-none border px-3 py-1.5 ${isDark ? 'border-white/20 bg-black/60 text-white' : 'border-black/10 bg-black/[0.03] text-black'}`}
        >
          {walletText}
        </button>
        <button
          type="button"
          className={`font-mono text-[11px] tracking-[0.14em] rounded-none border px-3 py-1.5 ${isDark ? 'border-white/20 bg-black/60 text-white' : 'border-black/10 bg-black/[0.03] text-black'}`}
        >
          {jepyText}
        </button>
        {isManagerRole && budgetText ? (
          <>
            <span className={`hidden h-5 w-px md:block ${isDark ? 'bg-white/10' : 'bg-black/10'}`} aria-hidden />
            <div className={`hidden rounded-none border px-3 py-1.5 font-mono text-[11px] tracking-[0.14em] md:block ${isDark ? 'border-white/20 bg-black/60 text-white/85' : 'border-black/10 bg-black/[0.03] text-black/85'}`}>
              {budgetText}
            </div>
          </>
        ) : null}

        <span className={`hidden h-5 w-px sm:block ${isDark ? 'bg-white/10' : 'bg-black/10'}`} aria-hidden />
        <button
          type="button"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          className={`font-mono text-[11px] uppercase tracking-[0.2em] transition-none ${isDark ? 'text-white hover:text-white' : 'text-black hover:text-black'}`}
        >
          [ {isDark ? 'DARK' : 'LIGHT'} ]
        </button>
        <span className={`hidden h-5 w-px sm:block ${isDark ? 'bg-white/10' : 'bg-black/10'}`} aria-hidden />
        <div className={`${isDark ? 'text-white/70' : 'text-black/70'}`}>
          <SystemStatusIndicator />
        </div>

        <NotificationCenter
          appUnreadCount={appUnreadCount}
          inboxNotifications={notifications}
          onRefreshInbox={async () => {
            await refreshNotifications();
            await syncUnread();
          }}
        />

        <button
          type="button"
          onClick={handleLogout}
          aria-label="Déconnexion"
          className={`hidden rounded-none border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] transition-none md:inline-flex ${isDark ? 'border-white/20 bg-black/60 text-white hover:text-white' : 'border-black/10 bg-black/[0.03] text-black hover:text-black'}`}
        >
          &gt; [ LOGOUT ] &lt;
        </button>
      </header>

      {/* Live ticker tout en haut du flux principal */}
      <div className={`shrink-0 ${isDark ? 'bg-black' : 'bg-white'}`}>
        <LiveTicker />
      </div>

      {/* Stage cinématique — 100% width, scroll interne par widget */}
      <main
        id="cockpit-stage"
        className="dashboard-cockpit-stage relative z-10 flex min-h-0 w-full flex-1 flex-col overflow-hidden"
      >
        <div className="relative flex h-full w-full flex-1 flex-col overflow-hidden p-4 sm:p-6 lg:p-7">
          <CinematicRouteStage>
            <div className="dashboard-cockpit-canvas relative h-full w-full overflow-hidden">
              <div className="absolute inset-0 overflow-y-auto pb-28 pr-1.5">
                <Outlet />
              </div>
            </div>
          </CinematicRouteStage>
        </div>
        {mercatoLiveBadge && (
          <span
            className="pointer-events-none fixed right-4 top-16 z-40 rounded-full border border-emerald-400/55 bg-[#020202]/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-200 shadow-[0_0_24px_-4px_rgba(34,197,94,0.55)]"
            aria-live="polite"
          >
            Mercato live
          </span>
        )}
      </main>

      {/* Satellite hub : flou gaussien progressif sur le cockpit */}
      <AnimatePresence>
        {extraOpen ? (
          <>
            <motion.button
              key="cockpit-satellite-scrim"
              type="button"
              aria-label="Fermer le menu étendu"
              onClick={() => setExtraOpen(false)}
              className="cockpit-satellite-scrim fixed inset-0 z-[38] cursor-default border-0 p-0"
              initial={{ opacity: 0, ['--satellite-blur' as string]: 'blur(0px)' }}
              animate={{ opacity: 1, ['--satellite-blur' as string]: 'blur(24px)' }}
              exit={{ opacity: 0, ['--satellite-blur' as string]: 'blur(0px)' }}
              transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.aside
              key="cockpit-satellite-panel"
              role="dialog"
              aria-label="Modules secondaires"
              aria-modal="true"
              className={`cockpit-satellite-panel fixed bottom-24 left-1/2 z-[45] w-[min(92vw,520px)] -translate-x-1/2 rounded-3xl border-none p-8 shadow-2xl backdrop-blur-2xl ${isDark ? 'bg-white/[0.05]' : 'bg-black/[0.05]'}`}
              initial={{ opacity: 0, y: 32, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 400, damping: 34, mass: 0.85 }}
            >
              <div className="mb-6 flex items-center justify-between">
              <p className={`font-heading text-[11px] font-semibold uppercase tracking-[0.24em] ${isDark ? 'text-white/70' : 'text-black/70'}`}>
                Modules satellites
              </p>
                <button
                  type="button"
                  onClick={() => setExtraOpen(false)}
                  className={`text-[10px] uppercase tracking-[0.2em] transition ${isDark ? 'text-white/55 hover:text-white' : 'text-black/55 hover:text-black'}`}
                >
                  Close
                </button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {dockSecondary.map((it) => {
                  const Icon = it.icon;
                  return (
                    <Link
                      key={it.to}
                      to={it.to}
                      onClick={() => setExtraOpen(false)}
                      className={`group flex flex-col items-center justify-center gap-1.5 rounded-2xl border-none p-4 shadow-2xl backdrop-blur-xl transition-colors ${isDark ? 'bg-white/[0.04] text-white/85 hover:text-white' : 'bg-black/[0.04] text-black/85 hover:text-black'}`}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-white/70' : 'text-black/70'}`}>
                        {it.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      {/* Dock flottant */}
      <BottomDock items={dockItems} centerItem={dockCenter} />

      {/* Bouton "+" extras */}
      <button
        type="button"
        onClick={() => setExtraOpen((v) => !v)}
        aria-label="Ouvrir les modules secondaires"
        aria-expanded={extraOpen}
        className="contact-zone fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/35 bg-[#020202]/90 text-emerald-300 backdrop-blur-2xl transition-[border-color,box-shadow,color] hover:border-emerald-300/85 hover:text-white hover:shadow-[0_0_28px_-4px_rgba(34,197,94,0.6)]"
      >
        <span className={`text-xl font-light leading-none transition-transform ${extraOpen ? 'rotate-45' : ''}`}>+</span>
      </button>
    </div>
  );
}
