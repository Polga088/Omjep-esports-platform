import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { User, MapPin, Save, CheckCircle, Shield, Gamepad2, Sparkles, Camera, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { OMJEP_XP_FLOW_EVENT, type XpFlowDetail } from '@/lib/refreshEconomyFromApi';
import PlayerIdentity, { type PlayerIdentityRarity } from '@/components/PlayerIdentity';
import MaintenancePrestige, { PRESTIGE_MSG } from '@/components/MaintenancePrestige';
import { ProfileHeroMedia } from '@/components/ProfileHeroMedia';
import { useShowcaseVortexHue } from '@/components/ProfileShowcaseHeroMedia';
import { uploadAvatar, uploadBanner } from '@/lib/profileUploads';
/** Portrait Lamine Yamal — CC BY 4.0, Wikimedia Commons (`yamal-photo.jpg`). */
import yamalPhotoUrl from '@/assets/profile/yamal-photo.jpg?url';
/** Asset transparent — remplaçable par `golden-boot.webp` ou `.png` (même dossier, même import `?url`). */
import goldenBootTrophyUrl from '@/assets/trophies/golden-boot.svg?url';

const POSITIONS = [
  { value: 'GK', label: 'GK — Gardien' },
  { value: 'DC', label: 'DC — Défenseur Central' },
  { value: 'LAT', label: 'LAT — Latéral Gauche' },
  { value: 'RAT', label: 'RAT — Latéral Droit' },
  { value: 'MDC', label: 'MDC — Milieu Défensif' },
  { value: 'MOC', label: 'MOC — Milieu Offensif' },
  { value: 'MG', label: 'MG — Milieu Gauche' },
  { value: 'MD', label: 'MD — Milieu Droit' },
  { value: 'BU', label: 'BU — Buteur' },
  { value: 'ATT', label: 'ATT — Attaquant' },
] as const;

interface ProfileForm {
  ea_persona_name: string;
  preferred_position: string;
  nationality: string;
}

interface MePayload extends ProfileForm {
  id?: string;
  level?: number;
  xp?: number;
  avatarUrl?: string | null;
  activeBannerUrl?: string | null;
  activeFrameUrl?: string | null;
  activeJerseyId?: string | null;
  avatarRarity?: PlayerIdentityRarity;
  teamPrimaryColor?: string;
  teamSecondaryColor?: string;
}

const profileBentoContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const profileBentoItem = {
  hidden: { opacity: 0, scale: 0.82, y: 44 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 420, damping: 24 },
  },
};

function formatXp(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

const LEVEL_UP_GOLD_CONFETTI = [
  '#FFD700',
  '#FACC15',
  '#EAB308',
  '#FDE047',
  '#CA8A04',
  '#FFFBEB',
  '#FBBF24',
];

/** Son court type « power-up » (Web Audio API, sans fichier). */
function playProfileLevelUpSound() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.connect(g);
    g.connect(ctx.destination);
    const t0 = ctx.currentTime;
    osc.frequency.setValueAtTime(220, t0);
    osc.frequency.exponentialRampToValueAtTime(880, t0 + 0.09);
    osc.frequency.exponentialRampToValueAtTime(1760, t0 + 0.17);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.1, t0 + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26);
    osc.start(t0);
    osc.stop(t0 + 0.28);
    osc.onended = () => void ctx.close();
  } catch {
    /* ignore */
  }
}

function fireLevelUpBlastAtAnchor(el: HTMLElement | null) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const x = (r.left + r.width / 2) / window.innerWidth;
  const y = (r.top + r.height / 2) / window.innerHeight;
  void confetti({
    particleCount: 160,
    spread: 360,
    startVelocity: 34,
    ticks: 320,
    origin: { x, y },
    colors: LEVEL_UP_GOLD_CONFETTI,
    scalar: 1.22,
    gravity: 0.52,
  });
  void confetti({
    particleCount: 90,
    angle: 90,
    spread: 58,
    startVelocity: 52,
    ticks: 240,
    origin: { x, y },
    colors: LEVEL_UP_GOLD_CONFETTI,
    scalar: 1,
  });
}

/** Radar SVG tournant — filigrane collection / accent */
function StatRadarWatermark() {
  const rid = useId().replace(/:/g, '');
  const gradId = `ea-rw-${rid}`;
  return (
    <svg
      viewBox="0 0 100 100"
      className="pointer-events-none absolute -bottom-1 -right-1 h-[5.5rem] w-[5.5rem] opacity-[0.14]"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#eab308" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      <circle cx="50" cy="50" r="16" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      <line x1="50" y1="6" x2="50" y2="94" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      <line x1="6" y1="50" x2="94" y2="50" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      <g className="ea-fc-stat-radar-sweep" style={{ transformOrigin: '50px 50px' }}>
        <path d="M 50 50 L 50 8 A 42 42 0 0 1 88 50 Z" fill={`url(#${gradId})`} opacity="0.55" />
      </g>
    </svg>
  );
}

function StatGaugeIcon({ pct, animationDelay = 0.12 }: { pct: number; animationDelay?: number }) {
  const gid = useId().replace(/:/g, '');
  const gradId = `ea-g-${gid}`;
  const r = 36;
  const c = 2 * Math.PI * r;
  const target = c * (1 - Math.min(100, Math.max(0, pct)) / 100);
  return (
    <svg viewBox="0 0 100 100" className="relative z-[1] h-16 w-16 shrink-0" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="55%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
      </defs>
      <g transform="translate(50 50) rotate(-90)">
        <circle r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <motion.circle
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: target }}
          transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1] as const, delay: animationDelay }}
        />
      </g>
    </svg>
  );
}

function BentoStatCard({
  label,
  value,
  sub,
  icon,
  valuePopDelay = 0.28,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: ReactNode;
  valuePopDelay?: number;
}) {
  return (
    <motion.div
      variants={profileBentoItem}
      className="ea-fc-carbon-card ea-fc-bento-collection group relative overflow-hidden rounded-2xl border border-cyan-500/20 p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.07)] transition-[box-shadow,border-color] duration-500 hover:border-cyan-400/40 hover:shadow-[0_0_48px_rgba(34,211,238,0.22),0_0_80px_rgba(34,211,238,0.08),0_0_60px_rgba(234,179,8,0.06)]"
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(ellipse 95% 75% at 50% -15%, rgba(34,211,238,0.28), transparent 55%), radial-gradient(ellipse 60% 45% at 100% 100%, rgba(234,179,8,0.12), transparent 50%)',
        }}
      />
      <StatRadarWatermark />
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-cyan-500/10 blur-2xl transition-opacity duration-500 group-hover:opacity-[1.35]" />
      <div className="relative z-[1] flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-[10px] font-black uppercase tracking-[0.42em] text-cyan-300/95 drop-shadow-[0_0_14px_rgba(34,211,238,0.45)]">
            {label}
          </p>
          <motion.p
            className="mt-2 truncate font-display text-3xl font-black tabular-nums tracking-tight text-white [text-shadow:0_0_28px_rgba(34,211,238,0.35),0_0_4px_rgba(234,179,8,0.45)]"
            initial={{ scale: 0.35, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring' as const, stiffness: 480, damping: 17, delay: valuePopDelay }}
          >
            {value}
          </motion.p>
          {sub ? (
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{sub}</p>
          ) : null}
        </div>
        <div className="relative z-[1] opacity-95 transition-transform duration-300 group-hover:scale-105">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

const goldenBootParallaxSpring = { stiffness: 100, damping: 22, mass: 0.45 } as const;

/** Trophée Golden Boot — parallaxe souris + aura 4s (sync avatar) + drop-shadow doré */
function GoldenBootTrophyParallax({ goalsText, popDelay = 0.45 }: { goalsText: string; popDelay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [4.5, -4.5]), goldenBootParallaxSpring);
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-5.5, 5.5]), goldenBootParallaxSpring);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative z-[1] mt-4 flex w-full flex-col items-center [perspective:720px]"
    >
      <div className="relative flex h-[108px] w-full max-w-[160px] items-center justify-center">
        <div
          className="golden-boot-trophy-aura pointer-events-none absolute left-1/2 top-1/2 h-[92px] w-[88px] -translate-x-1/2 -translate-y-1/2 rounded-[45%] bg-[#EAB308]/40 blur-2xl"
          aria-hidden
        />
        <motion.div
          className="relative z-[1] will-change-transform"
          style={{
            rotateX,
            rotateY,
            transformStyle: 'preserve-3d',
          }}
        >
          <img
            src={goldenBootTrophyUrl}
            alt="Trophée Golden Boot"
            className="mx-auto h-[84px] w-auto max-w-[120px] select-none object-contain"
            style={{ filter: 'drop-shadow(0 0 30px #EAB308)' }}
            draggable={false}
          />
        </motion.div>
      </div>
      <motion.p
        className="mt-2 bg-gradient-to-br from-[#FEF9C3] from-25% via-[#EAB308] via-50% to-cyan-400 to-95% bg-clip-text font-display text-3xl font-black tabular-nums tracking-tight text-transparent [filter:drop-shadow(0_0_10px_rgba(234,179,8,0.4))]"
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring' as const, stiffness: 500, damping: 16, delay: popDelay }}
      >
        {goalsText}
      </motion.p>
    </div>
  );
}

function BentoGoldenBootCard({
  label,
  goalsText,
  sub,
  goalsPopDelay = 0.52,
}: {
  label: string;
  goalsText: string;
  sub?: string;
  goalsPopDelay?: number;
}) {
  return (
    <motion.div
      variants={profileBentoItem}
      className="ea-fc-carbon-card ea-fc-bento-collection group relative overflow-hidden rounded-2xl border border-cyan-500/20 p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.07)] transition-[box-shadow,border-color] duration-500 hover:border-amber-400/40 hover:shadow-[0_0_52px_rgba(234,179,8,0.18),0_0_64px_rgba(34,211,238,0.12)]"
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 50% -10%, rgba(234,179,8,0.2), transparent 52%), radial-gradient(ellipse 55% 40% at 0% 100%, rgba(34,211,238,0.14), transparent 48%)',
        }}
      />
      <StatRadarWatermark />
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-amber-500/10 blur-2xl transition-opacity duration-500 group-hover:opacity-[1.35]" />
      <p className="relative z-[1] text-center font-display text-[10px] font-black uppercase tracking-[0.42em] text-cyan-300/95 drop-shadow-[0_0_14px_rgba(34,211,238,0.45)] sm:text-left">
        {label}
      </p>
      <GoldenBootTrophyParallax goalsText={goalsText} popDelay={goalsPopDelay} />
      {sub ? (
        <p className="relative z-[1] mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 sm:text-left">
          {sub}
        </p>
      ) : null}
    </motion.div>
  );
}

export default function ProfilePage() {
  const { user, patchUser } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<ProfileForm>({
    ea_persona_name: '',
    preferred_position: '',
    nationality: '',
  });
  const [me, setMe] = useState<MePayload | null>(null);
  const [stats, setStats] = useState<{
    matches: number;
    goals: number;
    assists: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auraGoldOverload, setAuraGoldOverload] = useState(false);
  const [identityModalOpen, setIdentityModalOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [mediaUploading, setMediaUploading] = useState(false);

  const avatarInputId = useId();
  const bannerInputId = useId();

  const avatarAnchorRef = useRef<HTMLDivElement>(null);
  const levelBaselineRef = useRef(1);
  const overloadClearRef = useRef<any>(null);

  const vortexHud = useShowcaseVortexHue();
  const storeCosmeticsHref = useMemo(() => {
    const p = new URLSearchParams();
    p.set('tab', 'cosmetics');
    const bp = searchParams.get('bannerPreview');
    if (bp) p.set('bannerPreview', bp);
    const bh = searchParams.get('bannerHue');
    if (bh) p.set('bannerHue', bh);
    return `/dashboard/store?${p.toString()}`;
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<MePayload>('/auth/me');
        if (!cancelled) {
          setMe(data);
          setForm({
            ea_persona_name: data.ea_persona_name ?? '',
            preferred_position: data.preferred_position ?? '',
            nationality: data.nationality ?? '',
          });
          patchUser({
            avatarUrl: data.avatarUrl ?? undefined,
            activeBannerUrl: data.activeBannerUrl ?? undefined,
            activeFrameUrl: data.activeFrameUrl ?? undefined,
            activeJerseyId: data.activeJerseyId ?? undefined,
            avatarRarity: data.avatarRarity,
            teamPrimaryColor: data.teamPrimaryColor,
            teamSecondaryColor: data.teamSecondaryColor,
            level: typeof data.level === 'number' ? data.level : undefined,
            xp: typeof data.xp === 'number' ? data.xp : undefined,
          });
        }
        if (data.id && !cancelled) {
          try {
            const card = await api.get<{
              stats: { matches: number; goals: number; assists: number } | null;
            }>(`/users/${data.id}/profile-card`);
            if (!cancelled && card.data?.stats) {
              setStats({
                matches: card.data.stats.matches,
                goals: card.data.stats.goals,
                assists: card.data.stats.assists,
              });
            }
          } catch {
            /* stats optionnelles */
          }
        }
      } catch {
        if (!cancelled) setError('Impossible de charger votre profil.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patchUser]);

  useEffect(() => {
    if (typeof me?.level === 'number' && Number.isFinite(me.level)) {
      levelBaselineRef.current = me.level;
    }
  }, [me?.level]);

  useEffect(() => {
    const onXpFlow = (e: Event) => {
      const d = (e as CustomEvent<XpFlowDetail>).detail;
      if (d.level === undefined || !Number.isFinite(d.level)) return;
      if (d.level <= levelBaselineRef.current) return;
      levelBaselineRef.current = d.level;
      setMe((prev) =>
        prev ? { ...prev, level: d.level!, xp: typeof d.xp === 'number' ? d.xp : prev.xp } : prev,
      );
      patchUser({
        level: d.level,
        xp: typeof d.xp === 'number' ? d.xp : undefined,
      });
      fireLevelUpBlastAtAnchor(avatarAnchorRef.current);
      playProfileLevelUpSound();
      setAuraGoldOverload(true);
      if (overloadClearRef.current) clearTimeout(overloadClearRef.current);
      overloadClearRef.current = setTimeout(() => setAuraGoldOverload(false), 3000);
    };
    window.addEventListener(OMJEP_XP_FLOW_EVENT, onXpFlow);
    return () => {
      window.removeEventListener(OMJEP_XP_FLOW_EVENT, onXpFlow);
      if (overloadClearRef.current) clearTimeout(overloadClearRef.current);
    };
  }, [patchUser]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await api.patch('/users/profile', form);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch {
      setError('Une erreur est survenue lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveIdentityMedia = async () => {
    if (!avatarFile && !bannerFile) {
      setError('Sélectionnez au moins une photo de profil ou une bannière.');
      return;
    }
    setMediaUploading(true);
    setError(null);
    try {
      let nextAvatar: string | null | undefined;
      let nextBanner: string | null | undefined;
      if (avatarFile) {
        const r = await uploadAvatar(avatarFile);
        nextAvatar = r.avatarUrl ?? undefined;
        if (nextAvatar) patchUser({ avatarUrl: nextAvatar });
      }
      if (bannerFile) {
        const r = await uploadBanner(bannerFile);
        nextBanner = r.activeBannerUrl ?? undefined;
        if (nextBanner !== undefined) patchUser({ activeBannerUrl: nextBanner });
      }
      setMe((prev) =>
        prev
          ? {
              ...prev,
              ...(nextAvatar !== undefined ? { avatarUrl: nextAvatar } : {}),
              ...(nextBanner !== undefined ? { activeBannerUrl: nextBanner } : {}),
            }
          : prev,
      );
      setIdentityModalOpen(false);
      setAvatarFile(null);
      setBannerFile(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch {
      setError("Impossible d'envoyer les fichiers (format ou taille non supporté).");
    } finally {
      setMediaUploading(false);
    }
  };

  const update = (field: keyof ProfileForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const level = me?.level ?? 1;
  const xp = me?.xp ?? 0;
  const levelGaugePct = Math.min(100, Math.max(0, ((level % 10) / 10) * 100 || 35));
  const xpGaugePct = Math.min(100, (xp % 5000) / 50);

  if (loading) {
    return (
      <div className="relative min-h-[60vh] max-w-4xl space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-96 w-full rounded-b-[2rem] bg-white/[0.06]" />
          <div className="mx-auto h-40 w-40 rounded-full bg-white/[0.06]" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-white/[0.06]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !me) {
    return (
      <div className="relative mx-auto w-full max-w-lg px-4 py-10">
        <MaintenancePrestige title="Mon Profil" message={PRESTIGE_MSG} />
      </div>
    );
  }

  return (
    <div
      className={`ea-fc-tactical-profile relative w-full max-w-4xl bg-[#070b12] pb-16 ${vortexHud ? 'showcase-hud-vortex' : ''}`}
    >
      {/* Hero — média sync URL (bannerPreview) + crossfade */}
      <section className="relative z-[1] -mx-4 mb-0 h-96 w-[calc(100%+2rem)] overflow-hidden rounded-b-[2rem] border-b border-cyan-500/20 shadow-[0_24px_100px_rgba(0,0,0,0.72)] lg:-mx-8 lg:w-[calc(100%+4rem)]">
        <ProfileHeroMedia savedBannerUrl={user?.activeBannerUrl ?? me?.activeBannerUrl ?? null} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070b12] via-[#070b12]/78 to-[#070b12]/28" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/45" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[2] h-32 bg-gradient-to-t from-[#070b12] to-transparent" />

        <div className="relative z-[3] flex h-full flex-col justify-end px-6 pb-10 md:px-10">
          <p className="font-display text-[10px] font-black uppercase tracking-[0.55em] text-cyan-300/90 drop-shadow-[0_0_22px_rgba(34,211,238,0.55)]">
            Gamer Showcase HUD
          </p>
          <h1 className="mt-1 font-display text-2xl font-black uppercase tracking-tight text-white md:text-3xl [text-shadow:0_0_48px_rgba(234,179,8,0.28)]">
            Carte joueur
          </h1>
        </div>
      </section>

      {/* Bloc identité + stats — aura radiale légère derrière l’avatar */}
      <div className="relative z-[2] -mt-32 px-4 md:px-6">
        <div
          className="pointer-events-none absolute left-1/2 top-0 z-0 h-[min(400px,92vw)] w-[min(400px,92vw)] -translate-x-1/2 -translate-y-[46%] transition-[background] duration-700 md:left-8 md:h-[400px] md:w-[400px] md:translate-x-0 md:-translate-y-[46%]"
          style={{
            background: auraGoldOverload
              ? 'radial-gradient(ellipse 68% 64% at 50% 50%, rgba(251, 191, 36, 0.14) 0%, rgba(234, 179, 8, 0.08) 38%, transparent 70%)'
              : 'radial-gradient(ellipse 68% 64% at 50% 50%, rgba(56, 189, 248, 0.065) 0%, rgba(15, 23, 42, 0.04) 38%, transparent 70%)',
          }}
          aria-hidden
        />
        <div
          ref={avatarAnchorRef}
          className="absolute left-1/2 top-0 z-[4] w-[280px] max-w-[min(280px,88vw)] -translate-x-1/2 -translate-y-[56%] md:left-8 md:translate-x-0"
        >
          <div
            className={`transition-[filter] duration-500 ${
              auraGoldOverload
                ? 'drop-shadow-[0_52px_100px_rgba(0,0,0,0.94),0_0_90px_rgba(251,191,36,0.5),0_0_150px_rgba(234,179,8,0.32)]'
                : 'drop-shadow-[0_52px_100px_rgba(0,0,0,0.88),0_28px_64px_rgba(0,0,0,0.72),0_0_48px_rgba(34,211,238,0.52),0_0_88px_rgba(6,182,212,0.32),0_0_140px_rgba(34,211,238,0.14)]'
            }`}
          >
            <div className="aspect-square w-full isolate overflow-hidden rounded-full [clip-path:inset(0_round_50%)]">
              <PlayerIdentity
                size="xl"
                initial={(user?.ea_persona_name || me?.ea_persona_name || 'Y').charAt(0).toUpperCase()}
                avatarUrl={
                  (user?.avatarUrl ?? me?.avatarUrl)?.trim() ? (user?.avatarUrl ?? me?.avatarUrl) : yamalPhotoUrl
                }
                rarity={user?.avatarRarity ?? me?.avatarRarity ?? 'legendary'}
                activeFrameUrl={user?.activeFrameUrl ?? me?.activeFrameUrl}
                royalEagleFrame={!(user?.activeFrameUrl ?? me?.activeFrameUrl)?.trim()}
                activeJerseyId={user?.activeJerseyId ?? me?.activeJerseyId}
                teamPrimaryColor={user?.teamPrimaryColor ?? me?.teamPrimaryColor ?? '#c41e3a'}
                teamSecondaryColor={user?.teamSecondaryColor ?? me?.teamSecondaryColor ?? '#fbbf24'}
                showcaseCutout
                auraGoldOverload={auraGoldOverload}
                imgAlt={form.ea_persona_name?.trim() || user?.ea_persona_name || me?.ea_persona_name || 'Joueur'}
              />
            </div>
          </div>
        </div>

        <div className="relative z-[16] flex flex-col gap-6 pt-[160px] md:flex-row md:items-end md:gap-8 md:pl-[300px] md:pt-12 md:pb-1">
          <div className="min-w-0 flex-1 text-center md:text-left">
            <p className="font-display text-xs font-bold uppercase tracking-[0.28em] text-amber-400/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.85),0_0_12px_rgba(251,191,36,0.3)]">
              Profil
            </p>
            <p className="mt-1 truncate font-display text-xl font-black text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.9),0_0_24px_rgba(34,211,238,0.35)] md:text-2xl">
              {form.ea_persona_name?.trim() || 'Votre pseudo EA'}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {form.preferred_position
                ? POSITIONS.find((p) => p.value === form.preferred_position)?.label ?? form.preferred_position
                : 'Position à définir'}
              {form.nationality ? ` · ${form.nationality}` : ''}
            </p>
            <Link
              to={storeCosmeticsHref}
              className="showcase-neon-link mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/55 bg-cyan-500/10 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-cyan-200 shadow-[0_0_28px_rgba(34,211,238,0.35),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all hover:border-cyan-300/80 hover:bg-cyan-500/15 hover:shadow-[0_0_40px_rgba(34,211,238,0.5)] md:inline-flex"
            >
              <Sparkles className="h-4 w-4 text-cyan-300" />
              Personnaliser mon Profil
            </Link>
          </div>
        </div>

        <motion.div
          className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3"
          variants={profileBentoContainer}
          initial="hidden"
          animate="show"
        >
          <BentoStatCard
            label="Niveau"
            value={String(level)}
            sub="Carrière"
            valuePopDelay={0.3}
            icon={<StatGaugeIcon pct={levelGaugePct} animationDelay={0.38} />}
          />
          <BentoStatCard
            label="XP Total"
            value={formatXp(xp)}
            sub="Progression"
            valuePopDelay={0.42}
            icon={<StatGaugeIcon pct={xpGaugePct} animationDelay={0.5} />}
          />
          <BentoGoldenBootCard
            label="Buts"
            goalsText={stats ? String(stats.goals) : '—'}
            goalsPopDelay={0.58}
            sub={
              stats
                ? `${stats.assists} passes D. · ${stats.matches} m. équipe`
                : 'Sync. stats'
            }
          />
        </motion.div>
      </div>

      {/* Formulaire */}
      <div className="relative z-[1] mt-14 space-y-8 px-1">
        <div className="relative overflow-hidden rounded-2xl border border-cyan-500/10 bg-[#0c1018]/90 p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm">
          <div className="pointer-events-none absolute -right-20 top-0 h-48 w-48 rounded-full bg-cyan-500/5 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
            <h2 className="font-display font-bold text-xl text-white">Paramètres du profil</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Votre{' '}
              <span className="font-semibold text-cyan-400">pseudo EA Sports</span> est utilisé pour la
              récupération des stats. Il doit correspondre à votre gamertag.
            </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIdentityModalOpen(true);
                setAvatarFile(null);
                setBannerFile(null);
                setError(null);
              }}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-400/45 bg-cyan-500/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.2)] transition hover:border-cyan-300/70 hover:bg-cyan-500/15"
            >
              <Camera className="h-4 w-4 text-cyan-300" aria-hidden />
              Modifier l&apos;Identité
            </button>
          </div>
        </div>

        {success && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 animate-in fade-in slide-in-from-top-2">
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
            <p className="text-sm font-medium text-emerald-300">Profil mis à jour avec succès !</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="space-y-5">
            <div className="mb-1 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-400/10">
                <Gamepad2 className="h-4 w-4 text-amber-400" />
              </div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Informations de jeu
              </h3>
            </div>

            <div className="space-y-2">
              <label htmlFor="ea_name" className="block text-sm font-medium text-slate-300">
                Pseudo EA Sports
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <User className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  id="ea_name"
                  type="text"
                  value={form.ea_persona_name}
                  onChange={(e) => update('ea_persona_name', e.target.value)}
                  placeholder="Ex: xEagle_Sniper"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-11 pr-4 text-sm text-white outline-none transition-all placeholder:text-slate-600 hover:border-white/20 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
              <p className="text-xs text-slate-600">Doit correspondre exactement à votre pseudo en jeu.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="position" className="block text-sm font-medium text-slate-300">
                Position préférée
              </label>
              <div className="relative">
                <select
                  id="position"
                  value={form.preferred_position}
                  onChange={(e) => update('preferred_position', e.target.value)}
                  className="w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-4 pr-10 text-sm text-white outline-none transition-all hover:border-white/20 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                >
                  <option value="" className="bg-[#0D1221] text-slate-400">
                    Sélectionnez une position
                  </option>
                  {POSITIONS.map(({ value, label }) => (
                    <option key={value} value={value} className="bg-[#0D1221] text-white">
                      {label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                  <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </section>

          <div className="h-px bg-white/5" />

          <section className="space-y-5">
            <div className="mb-1 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#FF6B35]/20 bg-[#FF6B35]/10">
                <Shield className="h-4 w-4 text-[#FF6B35]" />
              </div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Identité</h3>
            </div>

            <div className="space-y-2">
              <label htmlFor="nationality" className="block text-sm font-medium text-slate-300">
                Nationalité
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <MapPin className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  id="nationality"
                  type="text"
                  value={form.nationality}
                  onChange={(e) => update('nationality', e.target.value)}
                  placeholder="Ex: Marocain"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-11 pr-4 text-sm text-white outline-none transition-all placeholder:text-slate-600 hover:border-white/20 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
            </div>
          </section>

          <div className="h-px bg-white/5" />

          <button
            type="submit"
            disabled={saving}
            className="showcase-neon-submit group relative inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-600/25 transition-all hover:from-cyan-500 hover:to-sky-500 hover:shadow-cyan-500/35 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            {saving ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <Save className="h-4 w-4 transition-transform group-hover:scale-110" />
            )}
            {saving ? 'Enregistrement…' : 'Sauvegarder les modifications'}
          </button>
        </form>
      </div>

      {identityModalOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="identity-modal-title"
        >
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#0c1018] p-6 shadow-[0_0_48px_rgba(34,211,238,0.12)]">
            <button
              type="button"
              onClick={() => {
                setIdentityModalOpen(false);
                setAvatarFile(null);
                setBannerFile(null);
              }}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-500 transition hover:bg-white/5 hover:text-white"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 id="identity-modal-title" className="font-display pr-10 text-lg font-bold text-white">
              Modifier l&apos;identité
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Photo de profil (image) et bannière (image ou courte vidéo MP4/WebM). Max. ~5&nbsp;Mo / ~30&nbsp;Mo.
            </p>
            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <label htmlFor={avatarInputId} className="block text-sm font-medium text-slate-300">
                  Avatar
                </label>
                <input
                  id={avatarInputId}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="block w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500/15 file:px-3 file:py-2 file:text-xs file:font-bold file:uppercase file:text-cyan-200"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                />
                {avatarFile ? (
                  <p className="text-xs text-cyan-400/80">{avatarFile.name}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <label htmlFor={bannerInputId} className="block text-sm font-medium text-slate-300">
                  Bannière
                </label>
                <input
                  id={bannerInputId}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
                  className="block w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500/15 file:px-3 file:py-2 file:text-xs file:font-bold file:uppercase file:text-cyan-200"
                  onChange={(e) => setBannerFile(e.target.files?.[0] ?? null)}
                />
                {bannerFile ? (
                  <p className="text-xs text-cyan-400/80">{bannerFile.name}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-8 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIdentityModalOpen(false);
                  setAvatarFile(null);
                  setBannerFile(null);
                }}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={mediaUploading}
                onClick={() => void handleSaveIdentityMedia()}
                className="rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-600/25 transition hover:from-cyan-500 hover:to-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mediaUploading ? 'Envoi…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
