import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Loader2,
  Coins,
  Sparkles,
  Check,
  Crown,
  Gem,
  Trophy,
  TrendingUp,
  Zap,
  History,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import {
  ProfileShowcaseHeroMedia,
  useResolvedShowcaseBanner,
  useShowcaseVortexHue,
} from '@/components/ProfileShowcaseHeroMedia';
import { formatCurrency } from '@/utils/formatCurrency';
import ExchangeModal from './ExchangeModal';
import IdentityPreview, { inferStoreItemRarity, type StoreItemRow } from './IdentityPreview';
import CardStyleStore from '@/features/store/components/CardStyleStore';
import { mapCardRarityToIdentityRarity } from '@/features/profile/mocks/premiumProfile.mock';
import DashboardPageHeading from '@/components/dashboard/DashboardPageHeading'

type StoreCategory = 'BANNER' | 'AVATAR_FRAME' | 'BADGE';

type StoreTab = 'cosmetics' | 'card-styles' | 'vip' | 'rewards';

interface SubscriptionPlanRow {
  id: string;
  code: string;
  name: string;
  priceJepy: number;
  durationDays: number;
  features: unknown;
}

interface MySubscriptionRow {
  id: string;
  end_date: string;
  plan: SubscriptionPlanRow;
}

interface WalletHistoryRow {
  id: string;
  type: 'EXCHANGE' | 'ADMIN_GRANT';
  amount: number;
  description: string | null;
  created_at: string;
}

const CATEGORY_LABEL: Record<StoreCategory, string> = {
  BANNER: 'Bannière',
  AVATAR_FRAME: 'Cadre',
  BADGE: 'Badge',
};

function parseFeatureList(features: unknown): string[] {
  if (Array.isArray(features)) {
    return features.filter((x): x is string => typeof x === 'string');
  }
  if (features && typeof features === 'object' && !Array.isArray(features)) {
    return Object.entries(features as Record<string, unknown>)
      .filter(([, v]) => v === true || typeof v === 'string')
      .map(([k, v]) => (typeof v === 'string' ? v : k));
  }
  return [];
}

function formatEndDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function Store() {
  const { user, patchUser, updateProfileCosmetics } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<StoreTab>('cosmetics');

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'cosmetics' || t === 'card-styles' || t === 'vip' || t === 'rewards') {
      setTab(t);
    }
  }, [searchParams]);
  const [items, setItems] = useState<StoreItemRow[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const [plans, setPlans] = useState<SubscriptionPlanRow[]>([]);
  const [mySubs, setMySubs] = useState<MySubscriptionRow[]>([]);
  const [vipLoading, setVipLoading] = useState(false);
  const [buyingPlan, setBuyingPlan] = useState<string | null>(null);
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [walletHistory, setWalletHistory] = useState<WalletHistoryRow[]>([]);
  const [walletHistoryLoading, setWalletHistoryLoading] = useState(false);
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const [prestigeBlend, setPrestigeBlend] = useState(0);

  const syncWallet = useCallback(async () => {
    try {
      const { data } = await api.get<{
        omjepCoins?: number;
        jepyCoins?: number;
        isPremium?: boolean;
      }>('/auth/me');
      if (data && typeof data.omjepCoins === 'number' && typeof data.jepyCoins === 'number') {
        patchUser({
          omjepCoins: data.omjepCoins,
          jepyCoins: data.jepyCoins,
          isPremium: data.isPremium === true,
        });
      }
    } catch {
      /* ignore */
    }
  }, [patchUser]);

  const refreshWalletHistory = useCallback(async () => {
    try {
      const { data } = await api.get<WalletHistoryRow[]>('/wallets/history');
      setWalletHistory(Array.isArray(data) ? data : []);
    } catch {
      setWalletHistory([]);
    }
  }, []);

  const loadCosmetics = useCallback(async () => {
    const itemsRes = await api.get<StoreItemRow[]>('/store/items');
    const list = itemsRes.data;
    setItems(Array.isArray(list) ? list : []);

    let inv: Array<{ item_id?: string; item?: { id: string } }> = [];
    try {
      const invRes = await api.get<
        Array<{ item_id: string; item: { id: string } }>
      >('/store/my-inventory');
      inv = Array.isArray(invRes.data) ? invRes.data : [];
    } catch {
      inv = [];
    }
    const ids = new Set<string>();
    for (const row of inv) {
      const id = row.item?.id ?? row.item_id;
      if (id) ids.add(id);
    }
    setOwnedIds(ids);
  }, []);

  const loadVip = useCallback(async () => {
    setVipLoading(true);
    try {
      const [plansRes, subsRes] = await Promise.all([
        api.get<SubscriptionPlanRow[]>('/subscriptions/plans'),
        api.get<MySubscriptionRow[]>('/subscriptions/me'),
      ]);
      setPlans(Array.isArray(plansRes.data) ? plansRes.data : []);
      setMySubs(Array.isArray(subsRes.data) ? subsRes.data : []);
    } catch {
      toast.error('Impossible de charger les abonnements.');
      setPlans([]);
      setMySubs([]);
    } finally {
      setVipLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadCosmetics(), loadVip()]);
      await syncWallet();
    } catch {
      toast.error('Impossible de charger la boutique.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [loadCosmetics, loadVip, syncWallet]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tab === 'vip') loadVip();
  }, [tab, loadVip]);

  useEffect(() => {
    if (tab !== 'rewards') return;
    let cancelled = false;
    setWalletHistoryLoading(true);
    void (async () => {
      try {
        const { data } = await api.get<WalletHistoryRow[]>('/wallets/history');
        if (!cancelled) {
          setWalletHistory(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) {
          setWalletHistory([]);
        }
      } finally {
        if (!cancelled) {
          setWalletHistoryLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const omjep = user?.omjepCoins ?? 1000;
  const jepy = user?.jepyCoins ?? 0;

  const activeByPlanCode = useMemo(() => {
    const m = new Map<string, MySubscriptionRow>();
    for (const s of mySubs) {
      const code = s.plan?.code;
      if (!code) continue;
      const prev = m.get(code);
      if (!prev || new Date(s.end_date) > new Date(prev.end_date)) {
        m.set(code, s);
      }
    }
    return m;
  }, [mySubs]);

  const buy = async (item: StoreItemRow) => {
    if (ownedIds.has(item.id)) return;
    setBuyingId(item.id);
    try {
      const { data } = await api.post<{
        user: { omjepCoins: number; jepyCoins: number };
      }>(`/store/buy/${item.id}`);
      toast.success(`« ${item.name} » est dans votre inventaire !`);
      if (data?.user) {
        patchUser({
          omjepCoins: data.user.omjepCoins,
          jepyCoins: data.user.jepyCoins,
        });
      }
      setOwnedIds((prev) => new Set(prev).add(item.id));
      if (item.category === 'BANNER' || item.category === 'AVATAR_FRAME') {
        try {
          if (item.category === 'BANNER') {
            await updateProfileCosmetics({ activeBannerUrl: item.imageUrl });
          } else {
            await updateProfileCosmetics({
              activeFrameUrl: item.imageUrl,
              avatarRarity: inferStoreItemRarity(item),
            });
          }
        } catch {
          toast.error("Cosmétique acheté — synchronisation de l'équipement impossible pour le moment.");
        }
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : msg;
      toast.error(typeof text === 'string' ? text : 'Achat impossible.');
    } finally {
      setBuyingId(null);
    }
  };

  const buySubscription = async (planCode: string) => {
    setBuyingPlan(planCode);
    try {
      const { data } = await api.post<{
        user: { omjepCoins: number; jepyCoins: number; isPremium?: boolean };
      }>(`/subscriptions/buy/${planCode}`);
      toast.success('Abonnement mis à jour !');
      if (data?.user) {
        patchUser({
          omjepCoins: data.user.omjepCoins,
          jepyCoins: data.user.jepyCoins,
          isPremium: data.user.isPremium === true,
        });
      }
      await loadVip();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : msg;
      toast.error(typeof text === 'string' ? text : 'Achat impossible.');
    } finally {
      setBuyingPlan(null);
    }
  };

  const handleCardStyleWalletChange = (nextCoins: number) => {
    patchUser({ omjepCoins: nextCoins });
  };

  const handleCardStyleEquippedChange = (
    rarity: 'BRONZE' | 'SILVER' | 'GOLD',
  ) => {
    patchUser({ avatarRarity: mapCardRarityToIdentityRarity(rarity) });
  };

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) =>
        a.category === b.category ? a.priceJepy - b.priceJepy : a.category.localeCompare(b.category),
      ),
    [items],
  );

  const previewSelectedItem = useMemo(
    () => (previewItemId ? sortedItems.find((i) => i.id === previewItemId) ?? null : null),
    [sortedItems, previewItemId],
  );

  const resolvedStoreBannerPreview = useResolvedShowcaseBanner(null);
  const storeVortexHud = useShowcaseVortexHue();

  const selectCosmeticItem = useCallback(
    (item: StoreItemRow) => {
      setPreviewItemId(item.id);
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set('tab', 'cosmetics');
          if (item.category === 'BANNER') {
            p.set('bannerPreview', item.imageUrl);
            if (/vortex/i.test(item.name)) p.set('bannerHue', 'vortex');
            else p.delete('bannerHue');
          } else {
            p.delete('bannerPreview');
            p.delete('bannerHue');
          }
          return p;
        },
        { replace: true },
      );
      if (ownedIds.has(item.id)) {
        if (item.category === 'BANNER') {
          void updateProfileCosmetics({ activeBannerUrl: item.imageUrl }).catch(() => {
            toast.error("Impossible d'équiper la bannière pour le moment.");
          });
        } else if (item.category === 'AVATAR_FRAME') {
          void updateProfileCosmetics({
            activeFrameUrl: item.imageUrl,
            avatarRarity: inferStoreItemRarity(item),
          }).catch(() => {
            toast.error("Impossible d'équiper le cadre pour le moment.");
          });
        }
      }
    },
    [setSearchParams, ownedIds, updateProfileCosmetics],
  );

  const sortedPlans = useMemo(
    () =>
      [...plans].sort((a, b) => {
        if (a.code === 'PLAYER' && b.code === 'PRESIDENT') return -1;
        if (a.code === 'PRESIDENT' && b.code === 'PLAYER') return 1;
        return a.name.localeCompare(b.name);
      }),
    [plans],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-none border border-neutral-200 bg-white/70 px-8 py-8 backdrop-blur-sm dark:border-neutral-800 dark:bg-black/45">
          <div className="h-4 w-28 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <div className="mt-3 h-10 w-56 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-black/10 dark:bg-white/10" />
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="rounded-2xl border border-neutral-200 bg-white/70 p-6 dark:border-neutral-800 dark:bg-black/45 xl:col-span-5">
            <div className="aspect-square max-w-[320px] animate-pulse rounded-xl bg-black/10 dark:bg-white/10" />
            <div className="mt-4 h-3 w-64 max-w-full animate-pulse rounded bg-black/10 dark:bg-white/10" />
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:col-span-7">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={`store-loading-${idx}`} className="overflow-hidden rounded-none border border-neutral-200 bg-white/60 p-5 dark:border-neutral-800 dark:bg-black/40">
                <div className="aspect-[16/10] animate-pulse rounded bg-black/10 dark:bg-white/10" />
                <div className="mt-4 h-5 w-2/3 animate-pulse rounded bg-black/10 dark:bg-white/10" />
                <div className="mt-2 h-4 w-full animate-pulse rounded bg-black/10 dark:bg-white/10" />
                <div className="mt-5 h-9 w-1/2 animate-pulse rounded bg-black/10 dark:bg-white/10" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white/70 py-3 text-sm text-black/70 dark:border-neutral-800 dark:bg-black/45 dark:text-white/70">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement de la boutique OMJEP…
        </div>
      </div>
    );
  }

  return (
    <div className="kimi-luxury-store-page space-y-8">
      <ExchangeModal
        open={exchangeOpen}
        onClose={() => setExchangeOpen(false)}
        onSuccessRefresh={async () => {
          await syncWallet();
          await refreshWalletHistory();
        }}
        maxOc={omjep}
        maxJepy={jepy}
      />
      <div className="overflow-hidden rounded-none border border-black/10 bg-transparent backdrop-blur-xl dark:border-white/20">
        <div className="border-b border-black/10 bg-transparent px-12 py-12 dark:border-white/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <DashboardPageHeading
              eyebrow="Storefront"
              title="Boutique"
              subtitle="Cosmétiques, styles de cartes et abonnements VIP"
              className="border-b-0 pb-0"
            />

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="inline-flex items-center gap-2 rounded-none border border-violet-200/70 bg-white/70 px-4 py-2.5 backdrop-blur-sm dark:border-white/20 dark:bg-black/40">
                <div>
                  <p className="text-[12px] uppercase tracking-widest text-slate-600 dark:text-white/65">OMJEP</p>
                  <p className="font-mono text-6xl font-bold tracking-tight text-slate-950 dark:text-white">{formatCurrency(omjep, 'OC')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExchangeOpen(true)}
                className="rounded-none border border-neutral-200 bg-transparent px-3 py-2 text-xs font-bold uppercase tracking-wide text-black transition dark:border-neutral-800 dark:text-white"
              >
                Convertir
              </button>
              <div className="inline-flex items-center gap-2 rounded-none border border-violet-200/70 bg-white/70 px-4 py-2.5 backdrop-blur-sm dark:border-white/20 dark:bg-black/40">
                <div>
                  <p className="text-[12px] uppercase tracking-widest text-slate-600 dark:text-white/65">JPY</p>
                  <p className="font-mono text-6xl font-bold tracking-tight text-slate-950 dark:text-white">{formatCurrency(jepy, 'Jepy')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Cosmétiques et abonnements VIP — payez en Jepy.
            </p>

            <div className="relative flex w-full max-w-lg rounded-none border border-violet-200 bg-white/80 p-1 sm:w-auto dark:border-neutral-800 dark:bg-black/35">
              {(['cosmetics', 'card-styles', 'vip', 'rewards'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`relative flex-1 rounded-none py-2.5 text-center text-sm font-semibold transition-colors sm:min-w-[8rem] ${
                    tab === key
                      ? 'text-slate-950 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white'
                  }`}
                >
                  {tab === key && (
                    <motion.div
                      layoutId="store-tab-pill"
                      className="absolute inset-0 rounded-none bg-violet-100/80 dark:bg-white/[0.10]"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 inline-flex items-center justify-center gap-2">
                    {key === 'cosmetics' ? (
                      <><Gem className="h-4 w-4 opacity-80" />Cosmétiques</>
                    ) : key === 'card-styles' ? (
                      <><Gem className="h-4 w-4 text-black dark:text-white" />Styles de Cartes 🦅</>
                    ) : key === 'vip' ? (
                      <><Crown className="h-4 w-4 text-black dark:text-white" />Abonnements VIP</>
                    ) : (
                      <><Trophy className="h-4 w-4 text-black dark:text-white" />Récompenses</>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'cosmetics' && (
          <motion.div
            key="cosmetics"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
              <div
                className={`xl:col-span-5 xl:sticky xl:top-6 xl:self-start ${storeVortexHud ? 'showcase-hud-vortex' : ''}`}
              >
                {searchParams.get('bannerPreview') ? (
                  <div className="relative mb-4 h-44 overflow-hidden rounded-none border border-neutral-200 sm:h-52 dark:border-neutral-800">
                    <ProfileShowcaseHeroMedia bannerUrl={resolvedStoreBannerPreview} />
                    <div className="pointer-events-none absolute inset-0 bg-transparent" />
                    <p className="pointer-events-none absolute bottom-2 left-3 text-[10px] font-bold uppercase tracking-[0.2em] text-black/80 dark:text-white/80">
                      Aperçu profil
                    </p>
                  </div>
                ) : null}
                <IdentityPreview
                  user={user}
                  selectedItem={previewSelectedItem}
                  prestigeBlend={prestigeBlend}
                  onPrestigeBlendChange={setPrestigeBlend}
                  jepy={jepy}
                  owned={previewSelectedItem ? ownedIds.has(previewSelectedItem.id) : false}
                  buying={previewSelectedItem ? buyingId === previewSelectedItem.id : false}
                  canAfford={previewSelectedItem ? jepy >= previewSelectedItem.priceJepy : false}
                  onUnlock={() => {
                    if (previewSelectedItem) void buy(previewSelectedItem);
                  }}
                />
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:col-span-7">
              {sortedItems.map((item) => {
                const owned = ownedIds.has(item.id);
                const canAfford = jepy >= item.priceJepy;
                const busy = buyingId === item.id;
                const isPreviewSelected = previewItemId === item.id;

                return (
                  <article
                    key={item.id}
                    tabIndex={0}
                    onClick={() => selectCosmeticItem(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectCosmeticItem(item);
                      }
                    }}
                    className={`group flex cursor-pointer flex-col overflow-hidden rounded-none border bg-white/[0.02] backdrop-blur-md outline-none transition hover:border-neutral-200 focus-visible:ring-0 dark:hover:border-neutral-800 ${
                      isPreviewSelected
                        ? 'border-neutral-200 ring-0 dark:border-neutral-800'
                        : 'border-neutral-200 dark:border-neutral-800'
                    }`}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-900/50">
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                      <span className="absolute left-3 top-3 rounded-none border border-neutral-200 bg-white/[0.02] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black dark:border-neutral-800 dark:text-white">
                        {CATEGORY_LABEL[item.category]}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-12">
                      <h2 className="text-lg font-bold text-black dark:text-white">{item.name}</h2>
                      <p className="mt-1 line-clamp-2 flex-1 text-sm text-black/65 dark:text-white/65">{item.description}</p>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-black dark:text-white">
                          <Sparkles className="h-4 w-4 text-black dark:text-white" />
                          {formatCurrency(item.priceJepy, 'Jepy')}
                        </span>
                        {owned ? (
                          <span className="inline-flex items-center gap-1.5 rounded-none border border-neutral-200 bg-transparent px-3 py-2 text-xs font-semibold text-black dark:border-neutral-800 dark:text-white">
                            <Check className="h-3.5 w-3.5" />
                            Possédé
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={!item.isAvailable || busy || !canAfford}
                            onClick={(e) => {
                              e.stopPropagation();
                              void buy(item);
                            }}
                            className="rounded-none border border-neutral-200 bg-transparent px-4 py-2 text-xs font-bold text-black transition disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-800 dark:text-white"
                          >
                            {busy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : !canAfford ? (
                              'Solde insuffisant'
                            ) : (
                              '[ ACQUÉRIR ]'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
              </div>
            </div>

            {sortedItems.length === 0 && (
              <div className="rounded-none border border-neutral-200 bg-white/[0.02] p-12 text-center backdrop-blur-sm dark:border-neutral-800">
                <p className="text-sm text-black/60 dark:text-white/60">Aucun article pour le moment.</p>
              </div>
            )}
          </motion.div>
        )}
        {tab === 'card-styles' && (
          <motion.div
            key="card-styles"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <CardStyleStore
              userCoins={omjep}
              onWalletChange={handleCardStyleWalletChange}
              onEquippedStyleChange={handleCardStyleEquippedChange}
            />
          </motion.div>
        )}
        {tab === 'vip' && (
          <motion.div
            key="vip"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="space-y-6"
          >
            {vipLoading && sortedPlans.length === 0 ? (
              <div className="flex min-h-[30vh] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {sortedPlans.map((plan) => {
                  const isPlayer = plan.code === 'PLAYER';
                  const active = activeByPlanCode.get(plan.code);
                  const features = parseFeatureList(plan.features);
                  const canAfford = jepy >= plan.priceJepy;
                  const busy = buyingPlan === plan.code;

                  return (
                    <div
                      key={plan.id}
                      className="relative overflow-hidden rounded-none border border-neutral-200 bg-white/[0.02] p-[1px] dark:border-neutral-800"
                    >
                      <motion.div
                        className="pointer-events-none absolute -inset-[40%] -left-1/2 top-0 h-[45%] w-[200%] rotate-12 bg-transparent"
                        animate={{ x: ['-30%', '120%'] }}
                        transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
                      />
                      <div className="relative overflow-hidden rounded-none bg-white/[0.02] p-6 sm:p-8 backdrop-blur-md">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              {isPlayer ? (
                                <span className="inline-flex items-center gap-1.5 rounded-none border border-neutral-200 bg-transparent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-black dark:border-neutral-800 dark:text-white">
                                  <Sparkles className="h-3.5 w-3.5" />
                                  Player
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-none border border-neutral-200 bg-transparent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-black dark:border-neutral-800 dark:text-white">
                                  <Crown className="h-3.5 w-3.5" />
                                  President
                                </span>
                              )}
                              {active && (
                                <span className="inline-flex items-center gap-1 rounded-none border border-neutral-200 bg-transparent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black dark:border-neutral-800 dark:text-white">
                                  Actif
                                </span>
                              )}
                            </div>
                            <h2 className="text-2xl font-black tracking-tight text-black dark:text-white">{plan.name}</h2>
                            {active && (
                              <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                                Fin :{' '}
                                <span className="font-semibold text-black dark:text-white">
                                  {formatEndDate(active.end_date)}
                                </span>
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wider text-black/60 dark:text-white/60">Prix</p>
                            <p className="font-mono text-2xl font-black tabular-nums text-black dark:text-white">
                              {formatCurrency(plan.priceJepy, 'Jepy')}
                            </p>
                            <p className="mt-0.5 text-xs text-black/60 dark:text-white/60">
                              +{plan.durationDays} jours par achat
                            </p>
                          </div>
                        </div>

                        <ul className="mt-6 space-y-2.5">
                          {features.length === 0 ? (
                            <li className="text-sm text-black/60 dark:text-white/60">Aucun détail disponible.</li>
                          ) : (
                            features.map((f) => (
                              <li
                                key={f}
                                className="flex items-start gap-2.5 text-sm text-black/75 dark:text-white/75"
                              >
                                <span
                                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-none border border-neutral-200 bg-transparent text-black dark:border-neutral-800 dark:text-white"
                                >
                                  <Check className="h-3 w-3" strokeWidth={3} />
                                </span>
                                {f}
                              </li>
                            ))
                          )}
                        </ul>

                        <div className="mt-8">
                          <button
                            type="button"
                            disabled={busy || !canAfford}
                            onClick={() => void buySubscription(plan.code)}
                            className="w-full rounded-none border border-neutral-200 bg-transparent px-4 py-3.5 text-sm font-bold text-black transition disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-800 dark:text-white"
                          >
                            {busy ? (
                              <span className="inline-flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Paiement…
                              </span>
                            ) : !canAfford ? (
                              'Solde Jepy insuffisant'
                            ) : active ? (
                              `Prolonger (+${plan.durationDays} jours)`
                            ) : (
                              'Souscrire'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {sortedPlans.length === 0 && !vipLoading && (
              <div className="rounded-none border border-neutral-200 bg-white/[0.02] p-12 text-center backdrop-blur-sm dark:border-neutral-800">
                <p className="text-sm text-black/60 dark:text-white/60">Aucun plan VIP disponible.</p>
              </div>
            )}
          </motion.div>
        )}
        {tab === 'rewards' && (
          <motion.div
            key="rewards"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="space-y-8"
          >
            {/* Current balance recap */}
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                {
                  label: 'OMJEP Coins',
                  display: formatCurrency(omjep, 'OC'),
                  icon: Coins,
                  color: 'text-black dark:text-white',
                  bg: 'bg-white/[0.02]',
                  border: 'border-neutral-200 dark:border-neutral-800',
                  desc: 'Gagnés en jouant des matchs',
                },
                {
                  label: 'Jepy',
                  display: formatCurrency(jepy, 'Jepy'),
                  icon: Sparkles,
                  color: 'text-black dark:text-white',
                  bg: 'bg-white/[0.02]',
                  border: 'border-neutral-200 dark:border-neutral-800',
                  desc: 'Monnaie premium (store)',
                },
                {
                  label: 'Niveau',
                  display: String(user?.level ?? 1),
                  icon: TrendingUp,
                  color: 'text-black dark:text-white',
                  bg: 'bg-white/[0.02]',
                  border: 'border-neutral-200 dark:border-neutral-800',
                  desc: `${(user?.xp ?? 0).toLocaleString('fr-FR')} XP accumulés`,
                },
              ].map(({ label, display, icon: Icon, color, bg, border, desc }) => (
                <div key={label} className={`rounded-none border ${border} ${bg} p-6 flex items-center gap-4`}>
                  <div className={`w-12 h-12 rounded-none ${bg} border ${border} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-6 h-6 ${color}`} />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-black/60 dark:text-white/60">{label}</p>
                    <p className={`font-mono text-2xl font-black tabular-nums ${color}`}>
                      {display}
                    </p>
                    <p className="mt-0.5 text-[10px] text-black/60 dark:text-white/60">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Historique EXCHANGE + ADMIN_GRANT */}
            <div className="overflow-hidden rounded-none border border-neutral-200 bg-white/[0.02] dark:border-neutral-800">
              <div className="flex items-center gap-2 border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
                <History className="h-4 w-4 text-black dark:text-white" />
                <h2 className="text-sm font-bold text-black dark:text-white">Historique des gains</h2>
              </div>
              {walletHistoryLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-black/70 dark:text-white/70" />
                </div>
              ) : walletHistory.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-black/60 dark:text-white/60">
                  Aucun mouvement récent (échanges OC → Jepy ou récompenses admin).
                </p>
              ) : (
                <ul className="divide-y divide-white/[0.04]">
                  {walletHistory.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0">
                        <span className="inline-block rounded-none border border-neutral-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black dark:border-neutral-800 dark:text-white">
                          {row.type === 'EXCHANGE' ? 'Échange' : 'Récompense admin'}
                        </span>
                        <p className="mt-1.5 text-sm text-black/75 dark:text-white/75">
                          {row.description ?? '—'}
                        </p>
                      </div>
                      <p className="shrink-0 font-mono text-xs tabular-nums text-black/60 dark:text-white/60">
                        {new Date(row.created_at).toLocaleString('fr-FR')}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Rewards table */}
            <div className="overflow-hidden rounded-none border border-neutral-200 bg-white/[0.02] dark:border-neutral-800">
              <div className="flex items-center gap-2 border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
                <Trophy className="w-4 h-4 text-black dark:text-white" />
                <h2 className="text-sm font-bold text-black dark:text-white">Barème des récompenses par match</h2>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {[
                  {
                    result: 'Victoire',
                    xp: '+50 XP',
                    coins: '+100 OC',
                    emoji: '🏆',
                    color: 'text-black dark:text-white',
                    bg: 'bg-white/[0.02]',
                  },
                  {
                    result: 'Match Nul',
                    xp: '+25 XP',
                    coins: '+50 OC',
                    emoji: '🤝',
                    color: 'text-black dark:text-white',
                    bg: 'bg-white/[0.02]',
                  },
                  {
                    result: 'Défaite',
                    xp: '+10 XP',
                    coins: '+20 OC',
                    emoji: '💪',
                    color: 'text-black/70 dark:text-white/70',
                    bg: '',
                  },
                ].map(({ result, xp, coins, emoji, color, bg }) => (
                  <div key={result} className={`flex items-center justify-between px-6 py-4 ${bg}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{emoji}</span>
                      <span className={`text-sm font-bold ${color}`}>{result}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-black/60 dark:text-white/60">Expérience</p>
                        <p className={`font-mono text-sm font-black tabular-nums ${color}`}>{xp}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-black/60 dark:text-white/60">OMJEP Coins</p>
                        <p className={`font-mono text-sm font-black tabular-nums ${color}`}>{coins}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-neutral-200 bg-white/[0.01] px-6 py-3 dark:border-neutral-800">
                <p className="text-[11px] text-black/60 dark:text-white/60">
                  Les récompenses sont distribuées automatiquement à tous les membres de l'équipe après validation du score par l'admin ou le commissaire.
                </p>
              </div>
            </div>

            {/* Level system */}
            <div className="overflow-hidden rounded-none border border-neutral-200 bg-white/[0.02] dark:border-neutral-800">
              <div className="flex items-center gap-2 border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
                <Zap className="w-4 h-4 text-black dark:text-white" />
                <h2 className="text-sm font-bold text-black dark:text-white">Système de niveaux</h2>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-black/70 dark:text-white/70">
                  Chaque niveau requiert <span className="font-semibold text-black dark:text-white">niveau² × 100 XP</span> depuis le début.
                </p>
                <div className="grid sm:grid-cols-4 gap-3">
                  {[1, 5, 10, 20].map((lvl) => {
                    const needed = lvl * lvl * 100;
                    const isCurrentLevel = user?.level === lvl;
                    return (
                      <div key={lvl} className={`rounded-none border p-4 text-center ${
                        isCurrentLevel
                          ? 'border-neutral-200 bg-white/[0.02] dark:border-neutral-800'
                          : 'border-neutral-200 bg-white/[0.02] dark:border-neutral-800'
                      }`}>
                        <p className={`text-2xl font-black ${isCurrentLevel ? 'text-black dark:text-white' : 'text-black dark:text-white'}`}>
                          Niv.{lvl}
                        </p>
                        <p className="mt-1 font-mono text-[10px] tabular-nums text-black/60 dark:text-white/60">
                          {needed.toLocaleString('fr-FR')} XP
                        </p>
                        {isCurrentLevel && (
                          <span className="mt-2 inline-block rounded-none border border-neutral-200 bg-transparent px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black dark:border-neutral-800 dark:text-white">
                            Niveau actuel
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
