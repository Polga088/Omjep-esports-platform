import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
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
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
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
  { to: '/dashboard/team', label: 'Mon Équipe', icon: Users },
  { to: '/dashboard/matches', label: 'Matchs', icon: Swords },
  { to: '/dashboard/transfers', label: 'Mercato', icon: Repeat },
  { to: '/dashboard/leaderboard', label: 'Classement', icon: Medal },
  { to: '/dashboard/store', label: 'Boutique', icon: ShoppingBag },
  { to: '/dashboard/predictions', label: 'Predict', icon: Dices },
];

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
  '/dashboard-preview': 'Cockpit Preview',
};

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, patchUser } = useAuthStore();
  const isManagerRole = user?.role === 'MANAGER';
  const [budget, setBudget] = useState<number | null>(null);
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

  const isItemActive = (item: DockItem) =>
    item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to)

  return (
    <div className={`dashboard-layout-shell flex min-h-[100dvh] bg-omjep-bg text-omjep-text-primary`}>
      <GoldConfetti active={showConfetti} />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-omjep-border bg-omjep-bg-panel/88 px-4 py-5 backdrop-blur-2xl lg:flex lg:flex-col">
        <Link to="/dashboard" className="mb-6 flex items-center gap-2 px-2" aria-label="Cockpit OMJEP">
          <span className="font-heading text-xs font-semibold uppercase tracking-[0.28em] text-omjep-gold">OMJEP</span>
        </Link>

        <nav className="flex-1 space-y-1.5" aria-label="Navigation dashboard">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const active = isItemActive(item)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                  active
                    ? 'border-omjep-mauve/65 bg-omjep-mauve/15 text-omjep-mauve shadow-[0_0_24px_-8px_rgba(110,89,217,0.7)]'
                    : 'border-transparent text-omjep-text-secondary hover:border-omjep-mauve/35 hover:bg-omjep-bg-panel-soft/45 hover:text-omjep-text-primary hover:shadow-[0_0_20px_-10px_rgba(110,89,217,0.75)]'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className={`h-[18px] w-[18px] ${active ? 'text-omjep-mauve' : ''}`} aria-hidden />
                <span className="text-sm font-semibold tracking-wide">{item.label}</span>
                {active ? <ChevronRight className="ml-auto h-4 w-4 text-omjep-mauve/80" aria-hidden /> : null}
              </Link>
            )
          })}
        </nav>

        <div className="space-y-2 rounded-xl border border-omjep-border bg-omjep-bg-panel-soft/35 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-omjep-text-muted">{walletText}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-omjep-text-muted">{jepyText}</p>
          {isManagerRole && budgetText ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-omjep-gold">{budgetText}</p>
          ) : null}
        </div>
      </aside>

      <section className="flex min-h-[100dvh] w-full flex-col lg:pl-72">
        <header className="dashboard-cockpit-topbar sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-omjep-border bg-omjep-bg-panel/90 px-5 backdrop-blur-xl">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold text-omjep-text-primary">{currentPageTitle}</h1>
            <p className="text-[11px] uppercase tracking-[0.16em] text-omjep-text-muted">Dashboard operation shell</p>
          </div>
          <div className="flex items-center gap-3">
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
              <div className="min-w-0">
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
              className="rounded-lg border border-omjep-border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-omjep-text-secondary transition-colors hover:border-omjep-border-gold hover:text-omjep-text-primary"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="border-b border-omjep-border/60 bg-omjep-bg-panel-soft/75">
          <LiveTicker />
          {mercatoLiveBadge ? (
            <div className="container-dashboard pt-0">
              <span className="inline-flex rounded-full border border-omjep-border-gold bg-omjep-bg-panel/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-omjep-gold">
                Mercato live
              </span>
            </div>
          ) : null}
        </div>

        <main className="dashboard-layout-scroll flex-1 overflow-y-auto py-6">
          <div className="container-dashboard">
            <Outlet />
          </div>
        </main>
      </section>
    </div>
  );
}
