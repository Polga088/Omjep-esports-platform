import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShoppingBag,
  Loader2,
  Coins,
  Sparkles,
  Check,
  Crown,
  Gem,
  Trophy,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

type StoreCategory = 'BANNER' | 'AVATAR_FRAME' | 'BADGE';

type StoreTab = 'cosmetics' | 'vip' | 'rewards';

interface StoreItemRow {
  id: string;
  name: string;
  description: string;
  priceJepy: number;
  category: StoreCategory;
  imageUrl: string;
  isAvailable: boolean;
}

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
  const { user, patchUser } = useAuthStore();
  const [tab, setTab] = useState<StoreTab>('cosmetics');
  const [items, setItems] = useState<StoreItemRow[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const [plans, setPlans] = useState<SubscriptionPlanRow[]>([]);
  const [mySubs, setMySubs] = useState<MySubscriptionRow[]>([]);
  const [vipLoading, setVipLoading] = useState(false);
  const [buyingPlan, setBuyingPlan] = useState<string | null>(null);

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

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) =>
        a.category === b.category ? a.priceJepy - b.priceJepy : a.category.localeCompare(b.category),
      ),
    [items],
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
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-3xl border border-white/[0.06] bg-[#0B0D13]/80 backdrop-blur-md">
        <div className="border-b border-white/[0.06] bg-white/[0.02] px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/25 bg-gradient-to-br from-amber-400/15 to-transparent">
                <ShoppingBag className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400/70">
                  Boutique
                </p>
                <h1 className="text-2xl font-black tracking-tight text-white">OMJEP Store</h1>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 backdrop-blur-sm">
                <Coins className="h-4 w-4 text-amber-400" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">OMJEP</p>
                  <p className="tabular-nums text-sm font-bold text-white">{omjep.toLocaleString('fr-FR')}</p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-black/20 px-4 py-2.5 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">JEPY</p>
                  <p className="tabular-nums text-sm font-bold text-cyan-100">{jepy.toLocaleString('fr-FR')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Cosmétiques et abonnements VIP — payez en JEPY Coins.
            </p>

            <div className="relative flex w-full max-w-lg rounded-xl border border-white/[0.08] bg-black/25 p-1 sm:w-auto">
              {(['cosmetics', 'vip', 'rewards'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`relative flex-1 rounded-lg py-2.5 text-center text-sm font-semibold transition-colors sm:min-w-[8rem] ${
                    tab === key ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab === key && (
                    <motion.div
                      layoutId="store-tab-pill"
                      className="absolute inset-0 rounded-lg bg-gradient-to-r from-amber-500/25 via-amber-500/15 to-amber-600/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 inline-flex items-center justify-center gap-2">
                    {key === 'cosmetics' ? (
                      <><Gem className="h-4 w-4 opacity-80" />Cosmétiques</>
                    ) : key === 'vip' ? (
                      <><Crown className="h-4 w-4 text-amber-300/90" />Abonnements VIP</>
                    ) : (
                      <><Trophy className="h-4 w-4 text-amber-400/90" />Récompenses</>
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
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {sortedItems.map((item) => {
                const owned = ownedIds.has(item.id);
                const canAfford = jepy >= item.priceJepy;
                const busy = buyingId === item.id;

                return (
                  <article
                    key={item.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0B0D13]/90 shadow-lg shadow-black/30 backdrop-blur-md transition hover:border-amber-400/20"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-900/50">
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                      <span className="absolute left-3 top-3 rounded-md border border-white/10 bg-black/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-200 backdrop-blur-sm">
                        {CATEGORY_LABEL[item.category]}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h2 className="text-lg font-bold text-white">{item.name}</h2>
                      <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-500">{item.description}</p>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-cyan-300">
                          <Sparkles className="h-4 w-4" />
                          {item.priceJepy} JEPY
                        </span>
                        {owned ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400">
                            <Check className="h-3.5 w-3.5" />
                            Possédé
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={!item.isAvailable || busy || !canAfford}
                            onClick={() => void buy(item)}
                            className="rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 px-4 py-2 text-xs font-bold text-[#0B0D13] shadow-md shadow-amber-500/10 transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {busy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : !canAfford ? (
                              'Solde insuffisant'
                            ) : (
                              'Acheter'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {sortedItems.length === 0 && (
              <div className="rounded-2xl border border-white/5 bg-[#0B0D13]/60 p-12 text-center backdrop-blur-sm">
                <p className="text-sm text-slate-500">Aucun article pour le moment.</p>
              </div>
            )}
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
                  const isPresident = plan.code === 'PRESIDENT';
                  const active = activeByPlanCode.get(plan.code);
                  const features = parseFeatureList(plan.features);
                  const canAfford = jepy >= plan.priceJepy;
                  const busy = buyingPlan === plan.code;

                  const cardGradient = isPlayer
                    ? 'from-violet-600/35 via-fuchsia-500/20 to-indigo-900/40'
                    : 'from-amber-500/40 via-yellow-500/15 to-amber-900/35';

                  const borderGlow = isPlayer
                    ? 'border-violet-400/25 shadow-[0_0_40px_rgba(139,92,246,0.12)]'
                    : 'border-amber-400/30 shadow-[0_0_44px_rgba(245,158,11,0.14)]';

                  return (
                    <div
                      key={plan.id}
                      className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br ${cardGradient} ${borderGlow} p-[1px]`}
                    >
                      <motion.div
                        className="pointer-events-none absolute -inset-[40%] -left-1/2 top-0 h-[45%] w-[200%] rotate-12 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent"
                        animate={{ x: ['-30%', '120%'] }}
                        transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
                      />
                      <div className="relative overflow-hidden rounded-[22px] bg-[#070a12]/80 p-6 sm:p-8 backdrop-blur-md">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              {isPlayer ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-200">
                                  <Sparkles className="h-3.5 w-3.5" />
                                  Player
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/45 bg-amber-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                                  <Crown className="h-3.5 w-3.5" />
                                  President
                                </span>
                              )}
                              {active && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                                  Actif
                                </span>
                              )}
                            </div>
                            <h2 className="text-2xl font-black tracking-tight text-white">{plan.name}</h2>
                            {active && (
                              <p className="mt-1 text-sm text-slate-400">
                                Fin :{' '}
                                <span className="font-semibold text-slate-200">
                                  {formatEndDate(active.end_date)}
                                </span>
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500">Prix</p>
                            <p className="text-2xl font-black tabular-nums text-cyan-200">
                              {plan.priceJepy}{' '}
                              <span className="text-[11px] font-bold text-cyan-400/80">JEPY</span>
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              +{plan.durationDays} jours par achat
                            </p>
                          </div>
                        </div>

                        <ul className="mt-6 space-y-2.5">
                          {features.length === 0 ? (
                            <li className="text-sm text-slate-500">Aucun détail disponible.</li>
                          ) : (
                            features.map((f) => (
                              <li
                                key={f}
                                className="flex items-start gap-2.5 text-sm text-slate-300"
                              >
                                <span
                                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                    isPresident
                                      ? 'border-amber-400/30 bg-amber-500/10 text-amber-300'
                                      : 'border-violet-400/30 bg-violet-500/10 text-violet-200'
                                  }`}
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
                            className={`w-full rounded-xl px-4 py-3.5 text-sm font-bold transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 ${
                              isPresident
                                ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-[#0B0D13] shadow-lg shadow-amber-500/10'
                                : 'bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/15'
                            }`}
                          >
                            {busy ? (
                              <span className="inline-flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Paiement…
                              </span>
                            ) : !canAfford ? (
                              'Solde JEPY insuffisant'
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
              <div className="rounded-2xl border border-white/5 bg-[#0B0D13]/60 p-12 text-center backdrop-blur-sm">
                <p className="text-sm text-slate-500">Aucun plan VIP disponible.</p>
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
                  value: omjep.toLocaleString('fr-FR'),
                  suffix: 'OC',
                  icon: Coins,
                  color: 'text-amber-400',
                  bg: 'bg-amber-400/10',
                  border: 'border-amber-400/20',
                  desc: 'Gagnés en jouant des matchs',
                },
                {
                  label: 'JEPY Coins',
                  value: jepy.toLocaleString('fr-FR'),
                  suffix: 'JP',
                  icon: Sparkles,
                  color: 'text-cyan-400',
                  bg: 'bg-cyan-400/10',
                  border: 'border-cyan-400/20',
                  desc: 'Monnaie premium (store)',
                },
                {
                  label: 'Niveau',
                  value: String(user?.level ?? 1),
                  suffix: '',
                  icon: TrendingUp,
                  color: 'text-emerald-400',
                  bg: 'bg-emerald-400/10',
                  border: 'border-emerald-400/20',
                  desc: `${(user?.xp ?? 0).toLocaleString('fr-FR')} XP accumulés`,
                },
              ].map(({ label, value, suffix, icon: Icon, color, bg, border, desc }) => (
                <div key={label} className={`rounded-2xl border ${border} ${bg} p-6 flex items-center gap-4`}>
                  <div className={`w-12 h-12 rounded-xl ${bg} border ${border} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-6 h-6 ${color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
                    <p className={`text-2xl font-black tabular-nums ${color}`}>
                      {value}<span className="text-sm font-semibold ml-1 opacity-60">{suffix}</span>
                    </p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Rewards table */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0B0D13]/90 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-white">Barème des récompenses par match</h2>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {[
                  {
                    result: 'Victoire',
                    xp: '+50 XP',
                    coins: '+100 OC',
                    emoji: '🏆',
                    color: 'text-emerald-400',
                    bg: 'bg-emerald-500/[0.04]',
                  },
                  {
                    result: 'Match Nul',
                    xp: '+25 XP',
                    coins: '+50 OC',
                    emoji: '🤝',
                    color: 'text-amber-400',
                    bg: 'bg-amber-500/[0.04]',
                  },
                  {
                    result: 'Défaite',
                    xp: '+10 XP',
                    coins: '+20 OC',
                    emoji: '💪',
                    color: 'text-slate-400',
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
                        <p className="text-xs text-slate-500">Expérience</p>
                        <p className={`text-sm font-black tabular-nums ${color}`}>{xp}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">OMJEP Coins</p>
                        <p className={`text-sm font-black tabular-nums ${color}`}>{coins}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-6 py-3 border-t border-white/[0.04] bg-white/[0.01]">
                <p className="text-[11px] text-slate-600">
                  Les récompenses sont distribuées automatiquement à tous les membres de l'équipe après validation du score par l'admin ou le commissaire.
                </p>
              </div>
            </div>

            {/* Level system */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0B0D13]/90 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-white">Système de niveaux</h2>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-400">
                  Chaque niveau requiert <span className="text-amber-400 font-semibold">niveau² × 100 XP</span> depuis le début.
                </p>
                <div className="grid sm:grid-cols-4 gap-3">
                  {[1, 5, 10, 20].map((lvl) => {
                    const needed = lvl * lvl * 100;
                    const isCurrentLevel = user?.level === lvl;
                    return (
                      <div key={lvl} className={`rounded-xl border p-4 text-center ${
                        isCurrentLevel
                          ? 'border-amber-400/40 bg-amber-400/10'
                          : 'border-white/[0.06] bg-white/[0.02]'
                      }`}>
                        <p className={`text-2xl font-black ${isCurrentLevel ? 'text-amber-400' : 'text-white'}`}>
                          Niv.{lvl}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 tabular-nums">
                          {needed.toLocaleString('fr-FR')} XP
                        </p>
                        {isCurrentLevel && (
                          <span className="mt-2 inline-block text-[9px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
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
