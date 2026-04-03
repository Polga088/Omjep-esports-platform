import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Archive, Loader2, Gem } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore, type User } from '@/store/useAuthStore';
import {
  ProfileShowcaseHeroMedia,
  useResolvedShowcaseBanner,
  useShowcaseVortexHue,
} from '@/components/ProfileShowcaseHeroMedia';
import MaintenancePrestige from '@/components/MaintenancePrestige';
import type { StoreItemRow } from '@/pages/Store/IdentityPreview';

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
    <div className="overflow-hidden rounded-3xl border border-white/[0.06] bg-[#0B0D13]/80 backdrop-blur-md">
      <div className="border-b border-white/[0.06] bg-white/[0.02] px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/25 bg-gradient-to-br from-cyan-400/15 to-transparent">
            <Archive className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/70">Inventaire</p>
            <h1 className="text-2xl font-black tracking-tight text-white">The Vault</h1>
          </div>
        </div>
      </div>
    </div>
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
        <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (sortedOwned.length === 0) {
    return (
      <div className="space-y-8">
        <VaultHeader />
        <MaintenancePrestige
          title="The Vault"
          message="Coffre-fort vide. Accédez au Store pour débloquer votre identité."
          icon="lock"
        >
          <Link
            to="/dashboard/store"
            className="rounded-xl border border-cyan-400/45 bg-cyan-500/15 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.25)] transition hover:bg-cyan-500/25"
          >
            Ouvrir la boutique
          </Link>
        </MaintenancePrestige>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <VaultHeader />

      <div
        className={`relative overflow-hidden rounded-2xl border border-cyan-500/15 bg-[#070b12] ${vortexHud ? 'showcase-hud-vortex' : ''}`}
      >
        <div className="relative h-44 w-full overflow-hidden sm:h-52">
          <ProfileShowcaseHeroMedia bannerUrl={resolvedBanner} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#070b12] via-transparent to-black/40" />
        </div>
        <div className="relative z-[1] flex flex-col items-center gap-2 border-t border-white/[0.06] px-4 py-3 sm:flex-row sm:justify-center sm:gap-4">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/80">
            Prévisualisation — identique au hero du tableau de bord
          </p>
          {hasBannerPreview ? (
            <Link
              to={{ pathname: '/dashboard', search: searchParams.toString() }}
              className="text-[10px] font-bold uppercase tracking-widest text-amber-400/90 underline-offset-2 hover:text-amber-300 hover:underline"
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
            className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0B0D13]/90 text-left shadow-[inset_0_0_48px_rgba(34,211,238,0.07),inset_0_1px_0_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.35)] transition hover:border-cyan-400/25 hover:shadow-[inset_0_0_56px_rgba(34,211,238,0.12),inset_0_1px_0_rgba(255,255,255,0.08),0_12px_40px_rgba(34,211,238,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400/50"
          >
            {isItemEquipped(item, user) ? (
              <span
                className="absolute left-3 top-3 z-[2] rounded border border-cyan-400/80 bg-black/75 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.95),inset_0_0_10px_rgba(34,211,238,0.25)]"
                aria-label="Équipé"
              >
                ACTIVE
              </span>
            ) : null}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/40">
              <img
                src={item.imageUrl}
                alt=""
                className="h-full w-full object-cover opacity-95 transition group-hover:opacity-100 group-hover:scale-[1.02]"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B0D13] via-transparent to-transparent" />
            </div>
            <div className="relative z-[1] space-y-1 p-4 pt-3">
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 font-display text-sm font-bold leading-snug text-white">{item.name}</p>
                <Gem className="h-4 w-4 shrink-0 text-cyan-400/50" aria-hidden />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {CATEGORY_LABEL[item.category]}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
