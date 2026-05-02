import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, Gem, Lock } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore, type User } from '@/store/useAuthStore';
import {
  ProfileShowcaseHeroMedia,
  useResolvedShowcaseBanner,
  useShowcaseVortexHue,
} from '@/components/ProfileShowcaseHeroMedia';
import type { StoreItemRow } from '@/pages/Store/IdentityPreview';
import DashboardPageHeading from '@/components/dashboard/DashboardPageHeading'

const CATEGORY_LABEL: Record<StoreItemRow['category'], string> = {
  BANNER: 'Bannière',
  AVATAR_FRAME: 'Cadre',
  BADGE: 'Badge',
};

interface InventoryApiRow {
  item_id?: string;
  item?: {
    id: string;
    name: string;
    description: string;
    priceJepy: number;
    category: StoreItemRow['category'];
    imageUrl: string;
    isAvailable: boolean;
  };
}

function toStoreRow(raw: InventoryApiRow['item']): StoreItemRow | null {
  if (!raw?.id || !raw.name) return null;
  const { id, name, description, priceJepy, category, imageUrl, isAvailable } = raw;
  if (category !== 'BANNER' && category !== 'AVATAR_FRAME' && category !== 'BADGE') {
    return null;
  }
  return {
    id,
    name,
    description: description ?? '',
    priceJepy: typeof priceJepy === 'number' ? priceJepy : 0,
    category,
    imageUrl: imageUrl ?? '',
    isAvailable: isAvailable !== false,
  };
}

function isItemEquipped(item: StoreItemRow, user: User | null): boolean {
  if (!user) return false;
  const url = (item.imageUrl ?? '').trim();
  if (item.category === 'BANNER') {
    return (user.activeBannerUrl?.trim() || '') === url;
  }
  if (item.category === 'AVATAR_FRAME') {
    return (user.activeFrameUrl?.trim() || '') === url;
  }
  return false;
}

function VaultHeader() {
  return (
    <DashboardPageHeading
      eyebrow="Inventory"
      title="The Vault"
      subtitle="Cosmétiques possédés et prévisualisation de votre identité"
    />
  );
}

export default function Vault() {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [ownedItems, setOwnedItems] = useState<StoreItemRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const invRes = await api.get<InventoryApiRow[]>('/store/my-inventory');
      const inv = Array.isArray(invRes.data) ? invRes.data : [];
      const rows: StoreItemRow[] = [];
      for (const row of inv) {
        const mapped = toStoreRow(row.item);
        if (mapped) rows.push(mapped);
      }
      setOwnedItems(rows);
    } catch {
      setOwnedItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedOwned = useMemo(
    () =>
      [...ownedItems].sort((a, b) =>
        a.category === b.category ? a.name.localeCompare(b.name) : a.category.localeCompare(b.category),
      ),
    [ownedItems],
  );

  const resolvedBanner = useResolvedShowcaseBanner(user?.activeBannerUrl?.trim() || null);
  const vortexHud = useShowcaseVortexHue();
  const hasBannerPreview = Boolean(searchParams.get('bannerPreview'));

  const onItemClick = useCallback(
    (item: StoreItemRow) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
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
    },
    [setSearchParams],
  );

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-omjep-mauve" />
      </div>
    );
  }

  if (sortedOwned.length === 0) {
    return (
      <div className="space-y-8">
        <VaultHeader />
        <div className="omjep-surface-card flex flex-col items-center gap-6 px-6 py-14 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-omjep-border bg-omjep-bg-panel-soft shadow-sm">
            <Lock className="h-7 w-7 text-omjep-mauve" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="max-w-md space-y-2">
            <h2 className="font-heading text-xl font-semibold tracking-tight text-omjep-text-primary">The Vault</h2>
            <p className="text-sm leading-relaxed text-omjep-text-secondary">
              Coffre-fort vide. Accédez à la boutique pour débloquer bannières, cadres et badges.
            </p>
          </div>
          <Link
            to="/dashboard/store"
            className="inline-flex items-center justify-center rounded-xl border border-omjep-border-gold/35 bg-omjep-gold/[0.08] px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-omjep-text-primary transition hover:border-omjep-border-gold/50 hover:bg-omjep-gold/[0.12]"
          >
            Ouvrir la boutique
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <VaultHeader />

      <div
        className={`relative overflow-hidden rounded-2xl border border-omjep-border bg-omjep-bg-panel shadow-sm dark:border-cyan-500/20 dark:bg-[#070b12] dark:shadow-none ${vortexHud ? 'showcase-hud-vortex' : ''}`}
      >
        <div className="relative h-44 w-full overflow-hidden sm:h-52">
          <ProfileShowcaseHeroMedia bannerUrl={resolvedBanner} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-omjep-bg-panel via-transparent to-omjep-text-primary/5 dark:from-[#070b12] dark:to-black/40" />
        </div>
        <div className="relative z-[1] flex flex-col items-center gap-2 border-t border-omjep-border bg-omjep-bg-panel-soft px-4 py-3 sm:flex-row sm:justify-center sm:gap-4 dark:border-white/[0.06] dark:bg-transparent">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-omjep-text-muted dark:text-cyan-400/85">
            Prévisualisation — identique au hero du tableau de bord
          </p>
          {hasBannerPreview ? (
            <Link
              to={{ pathname: '/dashboard', search: searchParams.toString() }}
              className="text-[10px] font-bold uppercase tracking-widest text-omjep-mauve underline-offset-2 hover:text-omjep-brand hover:underline dark:text-amber-400/90 dark:hover:text-amber-300"
            >
              Ouvrir le tableau de bord avec cette bannière
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sortedOwned.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemClick(item)}
            className="group relative overflow-hidden rounded-xl border border-omjep-border bg-omjep-bg-panel text-left shadow-sm transition hover:border-omjep-mauve/35 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-omjep-mauve/40 dark:border-white/[0.08] dark:bg-[#0B0D13]/92 dark:shadow-[inset_0_0_36px_rgba(34,211,238,0.06),0_8px_28px_rgba(0,0,0,0.35)] dark:hover:border-cyan-400/25"
          >
            {isItemEquipped(item, user) ? (
              <span
                className="absolute left-3 top-3 z-[2] rounded-md border border-omjep-border-gold/50 bg-omjep-bg-panel px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-omjep-gold shadow-sm dark:border-cyan-400/70 dark:bg-black/80 dark:text-cyan-200"
                aria-label="Équipé"
              >
                ACTIVE
              </span>
            ) : null}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-omjep-bg-panel-soft dark:bg-black/40">
              <img
                src={item.imageUrl}
                alt=""
                className="h-full w-full object-cover opacity-95 transition group-hover:scale-[1.02] group-hover:opacity-100"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-omjep-bg-panel via-transparent to-transparent dark:from-[#0B0D13]" />
            </div>
            <div className="relative z-[1] space-y-1 p-3.5 pt-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 font-display text-sm font-bold leading-snug text-omjep-text-primary">
                  {item.name}
                </p>
                <Gem className="h-4 w-4 shrink-0 text-omjep-mauve/50 dark:text-cyan-400/50" aria-hidden />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-omjep-text-muted">
                {CATEGORY_LABEL[item.category]}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
