import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Package,
  Pencil,
  Plus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { formatCurrency } from '@/utils/formatCurrency';

type StoreCategory = 'BANNER' | 'AVATAR_FRAME' | 'BADGE';

interface StoreItemRow {
  id: string;
  name: string;
  description: string;
  priceJepy: number;
  category: StoreCategory;
  imageUrl: string;
  isAvailable: boolean;
}

interface Stats {
  activeSubscriptionsCount: number;
  theoreticalRevenueJepy: number;
  cosmeticRevenueJepy: number;
  subscriptionRevenueJepy: number;
  topSellingItem: { id: string; name: string; salesCount: number } | null;
}

interface PlanRow {
  id: string;
  code: string;
  name: string;
  priceJepy: number;
  durationDays: number;
  features: unknown;
}

const CATEGORY_LABEL: Record<StoreCategory, string> = {
  BANNER: 'Bannière',
  AVATAR_FRAME: 'Cadre',
  BADGE: 'Badge',
};

function parseFeaturesToText(features: unknown): string {
  if (features == null) return '[]';
  if (typeof features === 'string') return features;
  try {
    return JSON.stringify(features, null, 2);
  } catch {
    return '[]';
  }
}

function parseFeaturesFromText(text: string): unknown {
  const t = text.trim();
  if (!t) return [];
  return JSON.parse(t) as unknown;
}

export default function StoreManagement() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [items, setItems] = useState<StoreItemRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [editItem, setEditItem] = useState<StoreItemRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [savingItem, setSavingItem] = useState(false);

  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formCategory, setFormCategory] = useState<StoreCategory>('BANNER');
  const [formAvailable, setFormAvailable] = useState(true);

  const [planEdits, setPlanEdits] = useState<Record<string, { price: string; featuresText: string }>>(
    {},
  );
  const [savingPlanCode, setSavingPlanCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, itemsRes, plansRes] = await Promise.all([
        api.get<Stats>('/admin/store/stats'),
        api.get<StoreItemRow[]>('/store/items'),
        api.get<PlanRow[]>('/subscriptions/plans'),
      ]);
      setStats(statsRes.data);
      setItems(Array.isArray(itemsRes.data) ? itemsRes.data : []);
      const plist = Array.isArray(plansRes.data) ? plansRes.data : [];
      setPlans(plist);
      const next: Record<string, { price: string; featuresText: string }> = {};
      for (const p of plist) {
        next[p.code] = {
          price: String(p.priceJepy),
          featuresText: parseFeaturesToText(p.features),
        };
      }
      setPlanEdits(next);
    } catch {
      toast.error('Impossible de charger la gestion boutique.');
      setStats(null);
      setItems([]);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (row: StoreItemRow) => {
    setEditItem(row);
    setFormName(row.name);
    setFormDesc(row.description);
    setFormPrice(String(row.priceJepy));
    setFormImage(row.imageUrl);
    setFormCategory(row.category);
    setFormAvailable(row.isAvailable);
  };

  const closeModals = () => {
    setEditItem(null);
    setCreateOpen(false);
  };

  const submitItem = async (mode: 'create' | 'edit') => {
    const price = Number.parseInt(formPrice, 10);
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Prix Jepy invalide.');
      return;
    }
    setSavingItem(true);
    try {
      if (mode === 'create') {
        await api.post('/admin/store/items', {
          name: formName.trim(),
          description: formDesc.trim(),
          priceJepy: price,
          category: formCategory,
          imageUrl: formImage.trim(),
          isAvailable: formAvailable,
        });
        toast.success('Article créé.');
      } else if (editItem) {
        await api.patch(`/admin/store/items/${editItem.id}`, {
          name: formName.trim(),
          description: formDesc.trim(),
          priceJepy: price,
          imageUrl: formImage.trim(),
          isAvailable: formAvailable,
        });
        toast.success('Article mis à jour.');
      }
      closeModals();
      await load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : msg;
      toast.error(typeof text === 'string' ? text : 'Enregistrement impossible.');
    } finally {
      setSavingItem(false);
    }
  };

  const toggleAvailable = async (row: StoreItemRow) => {
    setTogglingId(row.id);
    try {
      await api.patch(`/admin/store/items/${row.id}`, {
        isAvailable: !row.isAvailable,
      });
      setItems((prev) =>
        prev.map((i) => (i.id === row.id ? { ...i, isAvailable: !i.isAvailable } : i)),
      );
      toast.success(row.isAvailable ? 'Article masqué du catalogue.' : 'Article disponible.');
    } catch {
      toast.error('Mise à jour impossible.');
    } finally {
      setTogglingId(null);
    }
  };

  const savePlan = async (code: string) => {
    const ed = planEdits[code];
    if (!ed) return;
    const price = Number.parseInt(ed.price, 10);
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Prix Jepy invalide.');
      return;
    }
    let features: unknown;
    try {
      features = parseFeaturesFromText(ed.featuresText);
    } catch {
      toast.error('JSON des avantages invalide.');
      return;
    }
    setSavingPlanCode(code);
    try {
      await api.patch(`/admin/store/plans/${code}`, { priceJepy: price, features });
      toast.success(`Plan ${code} enregistré.`);
      await load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : msg;
      toast.error(typeof text === 'string' ? text : 'Enregistrement impossible.');
    } finally {
      setSavingPlanCode(null);
    }
  };

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) =>
        a.category === b.category ? a.name.localeCompare(b.name) : a.category.localeCompare(b.category),
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

  if (loading && !stats) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400/70">
          Administration
        </p>
        <h1 className="text-2xl font-black tracking-tight text-white">Gestion boutique</h1>
        <p className="mt-1 text-sm text-slate-500">
          Articles cosmétiques, abonnements VIP et indicateurs de performance.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10">
              <Sparkles className="h-5 w-5 text-violet-300" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Abonnements actifs</p>
              <p className="text-2xl font-black tabular-nums text-white">
                {stats?.activeSubscriptionsCount ?? '—'}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/10">
              <TrendingUp className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Revenu théorique (Jepy)
              </p>
              <p className="text-2xl font-black tabular-nums text-cyan-100">
                {formatCurrency(stats?.theoreticalRevenueJepy ?? 0, 'Jepy')}
              </p>
              <p className="text-[10px] text-slate-600 mt-0.5">
                Cosmétiques + lignes d’abonnements (estimation)
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-500/10">
              <Package className="h-5 w-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Top vente</p>
              {stats?.topSellingItem ? (
                <>
                  <p className="font-bold text-white truncate">{stats.topSellingItem.name}</p>
                  <p className="text-xs text-slate-500">
                    {stats.topSellingItem.salesCount} vente
                    {stats.topSellingItem.salesCount > 1 ? 's' : ''}
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500">Aucune vente</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0a0f18]/80 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-amber-400/80" />
            <h2 className="text-lg font-bold text-white">Articles cosmétiques</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setFormName('');
              setFormDesc('');
              setFormPrice('0');
              setFormImage('');
              setFormCategory('BANNER');
              setFormAvailable(true);
              setCreateOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/15"
          >
            <Plus className="h-4 w-4" />
            Nouvel article
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3 font-semibold">Article</th>
                <th className="px-5 py-3 font-semibold">Catégorie</th>
                <th className="px-5 py-3 font-semibold">Prix (Jepy)</th>
                <th className="px-5 py-3 font-semibold">Disponible</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-white/[0.04] text-slate-300 hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-3">
                    <p className="font-medium text-white">{row.name}</p>
                    <p className="text-xs text-slate-500 line-clamp-1 max-w-[240px]">{row.description}</p>
                  </td>
                  <td className="px-5 py-3 text-xs">{CATEGORY_LABEL[row.category]}</td>
                  <td className="px-5 py-3 tabular-nums">{formatCurrency(row.priceJepy, 'Jepy')}</td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      disabled={togglingId === row.id}
                      onClick={() => void toggleAvailable(row)}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border transition-colors ${
                        row.isAvailable
                          ? 'border-emerald-500/40 bg-emerald-500/15'
                          : 'border-slate-600 bg-slate-800'
                      } ${togglingId === row.id ? 'opacity-50' : ''}`}
                      aria-pressed={row.isAvailable}
                    >
                      <span
                        className={`pointer-events-none absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                          row.isAvailable ? 'left-5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Éditer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sortedItems.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-slate-500">Aucun article.</p>
          )}
        </div>
      </div>

      {/* Plans */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0a0f18]/80 overflow-hidden">
        <div className="border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-lg font-bold text-white">Plans d’abonnement</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Prix et avantages (JSON) affichés sur l’onglet Abonnements VIP de la boutique.
          </p>
        </div>
        <div className="divide-y divide-white/[0.06]">
          {sortedPlans.map((plan) => {
            const ed = planEdits[plan.code];
            return (
              <div key={plan.id} className="p-5 space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wide text-amber-400/80">
                      {plan.code}
                    </span>
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    <p className="text-xs text-slate-500 tabular-nums mt-0.5">
                      Prix catalogue : {formatCurrency(plan.priceJepy, 'Jepy')}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="block">
                      <span className="text-[10px] uppercase text-slate-500">Prix (Jepy)</span>
                      <input
                        type="number"
                        min={0}
                        value={ed?.price ?? String(plan.priceJepy)}
                        onChange={(e) =>
                          setPlanEdits((prev) => ({
                            ...prev,
                            [plan.code]: {
                              price: e.target.value,
                              featuresText: prev[plan.code]?.featuresText ?? '',
                            },
                          }))
                        }
                        className="mt-1 w-28 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white tabular-nums"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={savingPlanCode === plan.code}
                      onClick={() => void savePlan(plan.code)}
                      className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-bold text-[#0a0f18] disabled:opacity-50"
                    >
                      {savingPlanCode === plan.code ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Enregistrer'
                      )}
                    </button>
                  </div>
                </div>
                <label className="block">
                  <span className="text-[10px] uppercase text-slate-500">Avantages (JSON)</span>
                  <textarea
                    value={ed?.featuresText ?? parseFeaturesToText(plan.features)}
                    onChange={(e) =>
                      setPlanEdits((prev) => ({
                        ...prev,
                        [plan.code]: {
                          price: prev[plan.code]?.price ?? String(plan.priceJepy),
                          featuresText: e.target.value,
                        },
                      }))
                    }
                    rows={6}
                    spellCheck={false}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:border-amber-400/40 focus:outline-none"
                    placeholder='["Avantage 1", "Avantage 2"]'
                  />
                </label>
              </div>
            );
          })}
          {sortedPlans.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-slate-500">Aucun plan.</p>
          )}
        </div>
      </div>

      {/* Modal create / edit — glass */}
      {(createOpen || editItem) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal
          onClick={closeModals}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d1524]/90 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-5">
              <h3 className="text-lg font-bold text-white">
                {createOpen ? 'Nouvel article' : 'Modifier l’article'}
              </h3>
              <button
                type="button"
                onClick={closeModals}
                className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <label className="block text-sm">
                <span className="text-slate-400">Nom</span>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-400">Description</span>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="text-slate-400">Prix (Jepy)</span>
                  <input
                    type="number"
                    min={0}
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white tabular-nums"
                  />
                </label>
                {createOpen && (
                  <label className="block text-sm">
                    <span className="text-slate-400">Catégorie</span>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as StoreCategory)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white"
                    >
                      <option value="BANNER">Bannière</option>
                      <option value="AVATAR_FRAME">Cadre</option>
                      <option value="BADGE">Badge</option>
                    </select>
                  </label>
                )}
              </div>
              <label className="block text-sm">
                <span className="text-slate-400">URL image</span>
                <input
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white text-sm"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formAvailable}
                  onChange={(e) => setFormAvailable(e.target.checked)}
                  className="rounded border-white/20"
                />
                Disponible à la vente
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModals}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={savingItem}
                  onClick={() => void submitItem(createOpen ? 'create' : 'edit')}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-[#0a0f18] disabled:opacity-50"
                >
                  {savingItem ? <Loader2 className="h-4 w-4 animate-spin inline" /> : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
