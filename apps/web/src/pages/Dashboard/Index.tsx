import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { motion, animate, type Variants } from 'framer-motion';
import { useAuthStore } from '@/store/useAuthStore';
import {
  Swords,
  Star,
  Crown,
  Flame,
  Trophy,
  ChevronRight,
  Users,
  Zap,
  Coins,
  TrendingUp,
  Newspaper,
  Megaphone,
  Shield,
  Paintbrush,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { formatCurrency } from '@/utils/formatCurrency';
import { ProfileHeroMedia } from '@/components/ProfileHeroMedia';
import RankBadge from '@/components/RankBadge';
import PlayerIdentity from '@/components/PlayerIdentity';
import MaintenancePrestige, { PRESTIGE_MSG } from '@/components/MaintenancePrestige';
/** Portrait Lamine Yamal — CC BY 4.0, Wikimedia Commons (fichier local). */
import yamalPhotoUrl from '@/assets/profile/yamal-photo.jpg?url';
// ─── XP helpers ──────────────────────────────────────────────────────────────
// Formule miroir du backend : level = floor(sqrt(xp / 100)) + 1
function xpForLevel(level: number) { return (level - 1) ** 2 * 100; }
function xpForNextLevel(level: number) { return level ** 2 * 100; }
function xpProgress(xp: number, level: number): number {
  const base = xpForLevel(level);
  const next = xpForNextLevel(level);
  if (next <= base) return 100;
  return Math.min(100, Math.round(((xp - base) / (next - base)) * 100));
}

interface MemberSnapshot {
  userId: string;
  displayName: string | null;
  goals: number;
  assists: number;
  averageRating: number;
}

interface TeamOverview {
  totals: {
    goals: number;
    assists: number;
    averageAmr: number;
  };
  topScorer: MemberSnapshot | null;
  mvp: MemberSnapshot | null;
}

interface NewsEvent {
  id: string;
  type: 'TRANSFER' | 'CONTRACT_RENEWAL' | 'TOURNAMENT_WIN' | 'SEASON_START' | 'RECORD_BROKEN' | 'OTHER';
  title: string;
  description: string;
  metadata: {
    playerName?: string;
    fromTeamName?: string;
    toTeamName?: string;
    transferFee?: number;
    offeredSalary?: number;
    releaseClauseMet?: boolean;
    timestamp: string;
  } | null;
  created_at: string;
}

const quickActions = [
  { label: 'Mon Club', description: "Gérer l'effectif et les statistiques", to: '/dashboard/team', icon: Users },
  { label: 'Classement', description: 'Voir votre position dans la ligue', to: '/leaderboard', icon: Trophy },
  { label: 'Paramètres', description: 'Compte, profil et préférences', to: '/dashboard/settings', icon: Zap },
];

/** Bordure ticket Mercato : vert = signature / transfert officialisé, bleu = offre / négociation */
function mercatoTicketKind(item: NewsEvent): 'signature' | 'offer' | 'neutral' {
  const blob = `${item.title} ${item.description}`.toLowerCase();
  if (/\b(offre|proposition|contre-proposition|contre proposition|négociation|negociation)\b/.test(blob)) {
    return 'offer';
  }
  if (
    item.type === 'TRANSFER' ||
    item.type === 'CONTRACT_RENEWAL' ||
    /\b(signature|signe|officialisé|officialise)\b/.test(blob)
  ) {
    return 'signature';
  }
  return 'neutral';
}

/** Heuristique texte : mention « élite » / « elite » dans l’actu */
function mercatoNewsIsElite(item: NewsEvent): boolean {
  const blob = `${item.title} ${item.description} ${item.metadata?.playerName ?? ''}`.toLowerCase();
  return /\b(élite|elite)\b/u.test(blob);
}

function MercatoActionBadge({ ticket }: { ticket: 'signature' | 'offer' | 'neutral' }) {
  const base =
    'inline-block rounded-sm border-[0.5px] bg-[#0a0a0c] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide';
  if (ticket === 'signature') {
    return (
      <span className={`${base} border-emerald-500/60 text-emerald-200/95`} title="Signature">
        SIGNATURE
      </span>
    );
  }
  if (ticket === 'offer') {
    return (
      <span className={`${base} border-cyan-500/60 text-cyan-200/95`} title="Transfert / négociation">
        TRANSFERT
      </span>
    );
  }
  return (
    <span className={`${base} border-white/15 text-slate-400`} title="Actualité">
      ACTU
    </span>
  );
}

function SkeletonPulse({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} />;
}

const BENTO_COUNT_DURATION = 1.5;
/** Délai après l’entrée de l’avatar avant le stagger des cartes stats */
const DASHBOARD_STATS_AFTER_AVATAR_S = 0.56;
const STATS_BENTO_STAGGER_S = 0.15;

const statsBentoContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: STATS_BENTO_STAGGER_S,
      delayChildren: DASHBOARD_STATS_AFTER_AVATAR_S,
    },
  },
};

const statsBentoCard: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 32 },
  },
};

/** Compteur 0 → cible sur `duration` (Framer `animate`), avec `delay` optionnel. */
function useCountUp(
  target: number,
  decimals: number,
  enabled: boolean,
  delay: number,
  duration: number,
) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!enabled || !ref.current) return;
    const el = ref.current;
    el.textContent = decimals > 0 ? Number(0).toFixed(decimals) : '0';
    const ctrl = animate(0, target, {
      duration,
      delay,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent =
          decimals > 0 ? v.toFixed(decimals) : String(Math.round(v));
      },
    });
    return () => ctrl.stop();
  }, [target, decimals, enabled, delay, duration]);
  return ref;
}

function StatsBentoGauge({
  fillRatio,
  strokeNeon,
  trackColor,
  delay,
  duration,
}: {
  fillRatio: number;
  strokeNeon: string;
  trackColor: string;
  delay: number;
  duration: number;
}) {
  const size = 118;
  const stroke = 2;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const safeRatio = Math.min(1, Math.max(0, fillRatio));
  return (
    <svg
      width={size}
      height={size}
      className="pointer-events-none absolute inset-0 -rotate-90"
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={trackColor}
        strokeWidth={stroke}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={strokeNeon}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - safeRatio) }}
        transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}

function StatsBentoCard({
  label,
  value,
  decimals,
  cap,
  icon: Icon,
  iconColor,
  strokeNeon,
  trackColor,
  accentHoverBorder,
  countStartDelay,
}: {
  label: string;
  value: number;
  decimals: number;
  cap: number;
  icon: LucideIcon;
  iconColor: string;
  strokeNeon: string;
  trackColor: string;
  accentHoverBorder: string;
  countStartDelay: number;
}) {
  const fillRatio = cap > 0 ? Math.min(1, Math.max(0, value / cap)) : 0;
  const countRef = useCountUp(value, decimals, true, countStartDelay, BENTO_COUNT_DURATION);
  const gaugeSize = 118;

  return (
    <motion.div
      variants={statsBentoCard}
      className={`relative flex w-full min-h-[158px] flex-col items-center justify-end rounded-[12px] border-[0.5px] border-solid border-white/10 bg-[#08090c] px-4 pb-5 pt-8 transition-colors duration-200 ease-out hover:border-white/[0.14] ${accentHoverBorder}`}
    >
      <Icon
        className="absolute right-3 top-3 h-4 w-4 opacity-50"
        style={{ color: iconColor }}
        aria-hidden
        strokeWidth={2}
      />
      <div className="relative flex h-[7.25rem] w-full items-center justify-center">
        <div
          className="relative shrink-0"
          style={{ width: gaugeSize, height: gaugeSize }}
        >
          <StatsBentoGauge
            fillRatio={fillRatio}
            strokeNeon={strokeNeon}
            trackColor={trackColor}
            delay={countStartDelay}
            duration={BENTO_COUNT_DURATION}
          />
          <span
            ref={countRef}
            className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center font-mono text-[2.65rem] font-bold tabular-nums leading-none tracking-tight text-[#ffffff] antialiased sm:text-[3.1rem]"
          />
        </div>
      </div>
      <p className="relative z-[1] mt-2 max-w-[12rem] text-center text-[10px] font-medium uppercase leading-snug tracking-widest text-white/45">
        {label}
      </p>
    </motion.div>
  );
}

function DashboardStatsBento({ totals }: { totals: TeamOverview['totals'] }) {
  const goals = Number(totals?.goals ?? 0);
  const assists = Number(totals?.assists ?? 0);
  const amr = Number(totals?.averageAmr ?? 0);

  const delay0 = DASHBOARD_STATS_AFTER_AVATAR_S;
  const delay1 = DASHBOARD_STATS_AFTER_AVATAR_S + STATS_BENTO_STAGGER_S;
  const delay2 = DASHBOARD_STATS_AFTER_AVATAR_S + STATS_BENTO_STAGGER_S * 2;

  return (
    <motion.div
      variants={statsBentoContainer}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-3"
    >
      <StatsBentoCard
        label="PUISSANCE DE FEU"
        value={goals}
        decimals={0}
        cap={60}
        icon={Swords}
        iconColor="#FF1744"
        strokeNeon="#FF1744"
        trackColor="rgba(255,255,255,0.12)"
        accentHoverBorder="hover:border-red-500/25"
        countStartDelay={delay0}
      />
      <StatsBentoCard
        label="MAÎTRES DU JEU"
        value={assists}
        decimals={0}
        cap={60}
        icon={Star}
        iconColor="#00E5FF"
        strokeNeon="#00E5FF"
        trackColor="rgba(255,255,255,0.12)"
        accentHoverBorder="hover:border-cyan-400/25"
        countStartDelay={delay1}
      />
      <StatsBentoCard
        label="DISCIPLINE COLLECTIVE"
        value={amr}
        decimals={1}
        cap={10}
        icon={Shield}
        iconColor="#00E676"
        strokeNeon="#00E676"
        trackColor="rgba(255,255,255,0.12)"
        accentHoverBorder="hover:border-emerald-400/25"
        countStartDelay={delay2}
      />
    </motion.div>
  );
}

function NeonFootballIcon({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} style={style} aria-hidden>
      <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="2.25" fill="rgba(234,179,8,0.14)" />
      <path
        fill="currentColor"
        fillOpacity={0.92}
        d="M32 11l8.2 5.2 3 9.4-5.6 7.7-11.2 0-5.6-7.7 3-9.4z"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 26c5.5 3.5 21.5 3.5 36 0M18 38c8-5 20-5 28 0M32 11v10M24.5 16.5l-4 8M39.5 16.5l4 8M20 42l6 8M38 42l-6 8"
      />
    </svg>
  );
}

function HudCornerDecor({ labels }: { labels: { tl: string; tr: string; bl: string; br: string } }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]" aria-hidden>
      <div className="absolute left-2 top-2 flex items-start gap-2 opacity-40">
        <svg width="20" height="20" viewBox="0 0 20 20" className="text-sky-500/50">
          <line x1="10" y1="0" x2="10" y2="20" stroke="currentColor" strokeWidth="0.75" />
          <line x1="0" y1="10" x2="20" y2="10" stroke="currentColor" strokeWidth="0.75" />
          <circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
        </svg>
        <span className="font-mono text-[9px] tabular-nums text-slate-500">{labels.tl}%</span>
      </div>
      <div className="absolute right-2 top-2 flex flex-row-reverse items-start gap-2 opacity-40">
        <svg width="20" height="20" viewBox="0 0 20 20" className="text-sky-500/50">
          <line x1="10" y1="0" x2="10" y2="20" stroke="currentColor" strokeWidth="0.75" />
          <line x1="0" y1="10" x2="20" y2="10" stroke="currentColor" strokeWidth="0.75" />
        </svg>
        <span className="font-mono text-[9px] tabular-nums text-slate-500">{labels.tr}%</span>
      </div>
      <div className="absolute bottom-2 left-2 font-mono text-[9px] tabular-nums text-slate-600 opacity-[0.35]">
        SIG · {labels.bl}%
      </div>
      <div className="absolute bottom-2 right-2 font-mono text-[9px] tabular-nums text-slate-600 opacity-[0.35]">
        {labels.br}% · SYNC
      </div>
    </div>
  );
}

function EmptyDataCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="relative flex min-h-[280px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/[0.08] p-8 text-center backdrop-blur-md">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800/10 to-transparent pointer-events-none" />
      <div className="relative">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
          <Crown className="w-7 h-7 text-slate-600" />
        </div>
        <h3 className="font-display font-bold text-lg text-slate-400 mb-1">{title}</h3>
        <p className="text-slate-600 text-sm max-w-[240px]">{message}</p>
      </div>
    </div>
  );
}

export default function DashboardIndex() {
  const { user, patchUser } = useAuthStore();
  const [data, setData] = useState<TeamOverview | null>(null);
  const [news, setNews] = useState<NewsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [overviewRes, meRes, newsRes] = await Promise.allSettled([
          api.get<TeamOverview>('/teams/my-team/overview'),
          api.get<{
            omjepCoins?: number;
            jepyCoins?: number;
            isPremium?: boolean;
            level?: number;
            xp?: number;
            avatarUrl?: string | null;
            avatarRarity?: 'common' | 'premium' | 'legendary';
            activeBannerUrl?: string | null;
            activeFrameUrl?: string | null;
            activeJerseyId?: string | null;
            teamPrimaryColor?: string;
            teamSecondaryColor?: string;
          }>('/auth/me'),
          api.get<NewsEvent[]>('/news/transfers?limit=5'),
        ]);
        if (cancelled) return;

        if (overviewRes.status === 'fulfilled') setData(overviewRes.value.data);
        else {
          const status = (overviewRes.reason as any)?.response?.status;
          setError(status === 404 ? 'no-team' : 'generic');
        }

        if (meRes.status === 'fulfilled') {
          const d = meRes.value.data;
          patchUser({
            omjepCoins: typeof d.omjepCoins === 'number' ? d.omjepCoins : undefined,
            jepyCoins: typeof d.jepyCoins === 'number' ? d.jepyCoins : undefined,
            isPremium: typeof d.isPremium === 'boolean' ? d.isPremium : undefined,
            level: typeof d.level === 'number' ? d.level : undefined,
            xp: typeof d.xp === 'number' ? d.xp : undefined,
            avatarUrl: d.avatarUrl ?? undefined,
            avatarRarity: d.avatarRarity,
            activeBannerUrl: d.activeBannerUrl ?? undefined,
            activeFrameUrl: d.activeFrameUrl ?? undefined,
            activeJerseyId: d.activeJerseyId ?? undefined,
            teamPrimaryColor: d.teamPrimaryColor,
            teamSecondaryColor: d.teamSecondaryColor,
          });
        }

        if (newsRes.status === 'fulfilled') {
          setNews(newsRes.value.data);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setNewsLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [patchUser]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const hudLabels = useMemo(
    () => ({
      tl: String(Math.min(99, 31 + (user?.level ?? 2) * 4)),
      tr: String(Math.min(99, 52 + ((user?.xp ?? 0) % 41))),
      bl: String(Math.min(99, 44 + ((user?.omjepCoins ?? 0) % 37))),
      br: String(Math.min(99, 19 + ((user?.jepyCoins ?? 0) % 29))),
    }),
    [user?.level, user?.xp, user?.omjepCoins, user?.jepyCoins],
  );

  return (
    <div className="relative overflow-x-hidden overflow-y-visible rounded-2xl dashboard-tactical-hud">
      <HudCornerDecor labels={hudLabels} />

      <div className="relative z-[1] space-y-8">
        {/* Hero + avatar XL qui chevauche le bas — bannière `activeBannerUrl` ou vidéo stade */}
        <div className="relative -mx-4 w-[calc(100%+2rem)] overflow-visible bg-[#070b12] lg:-mx-8 lg:w-[calc(100%+4rem)]">
          <section
            className="relative h-96 w-full overflow-hidden rounded-t-2xl border-b border-cyan-500/20 shadow-[0_20px_80px_rgba(0,0,0,0.45)]"
            aria-label="Bannière du tableau de bord"
          >
            {loading ? (
              <div
                className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-900 via-[#0f172a] to-slate-950"
                aria-busy
              />
            ) : (
              <ProfileHeroMedia savedBannerUrl={user?.activeBannerUrl?.trim() || null} />
            )}
            {/* Bleu sombre (gauche / zone Yamal) → noir total (droite) */}
            <div
              className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-[#0a1a32] via-[#050810] to-black"
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#0a0e1a]/95 via-[#0a0e1a]/35 to-transparent" />
            {/* Grille technologique (lignes fines + léger bias diagonal) */}
            <div className="dashboard-hero-tech-grid pointer-events-none absolute inset-0 z-[2]" aria-hidden />
            {/* Balayage lumineux horizontal — cycle 4s */}
            <div className="pointer-events-none absolute inset-0 z-[3] overflow-hidden" aria-hidden>
              <div className="dashboard-hero-scanline-sweep" />
            </div>

          <div className="absolute right-3 top-3 z-10 flex flex-wrap items-center justify-end gap-2 sm:right-5 sm:top-4">
            {user?.omjepCoins !== undefined && (
              <div className="flex items-center gap-1.5 rounded-lg border-[0.5px] border-white/10 bg-[#08090c] px-2.5 py-1.5 transition-colors hover:border-white/20">
                <Coins className="h-3.5 w-3.5 text-amber-400" />
                <span className="font-mono text-xs font-semibold tabular-nums text-amber-400 sm:text-sm">
                  {formatCurrency(user.omjepCoins, 'OC')}
                </span>
              </div>
            )}
            {user?.jepyCoins !== undefined && user.jepyCoins > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg border-[0.5px] border-white/10 bg-[#08090c] px-2.5 py-1.5 transition-colors hover:border-white/20">
                <Zap className="h-3.5 w-3.5 text-indigo-400" />
                <span className="font-mono text-xs font-semibold tabular-nums text-indigo-400 sm:text-sm">
                  {formatCurrency(user.jepyCoins, 'Jepy')}
                </span>
              </div>
            )}
          </div>

          <Link
            to="/dashboard/store?tab=cosmetics"
            className="absolute bottom-4 right-4 z-30 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/45 px-2.5 py-2 text-xs font-semibold uppercase leading-tight tracking-wide text-cyan-100/90 backdrop-blur-md transition hover:border-white/20 hover:bg-black/55 sm:bottom-5 sm:right-5 sm:px-3"
          >
            <Paintbrush className="h-3.5 w-3.5 shrink-0 text-cyan-300/90" aria-hidden />
            Personnaliser mon profil
          </Link>
          </section>

          <motion.div
            className="relative z-[50] -mt-[9.35rem] flex flex-col-reverse items-center gap-5 px-4 pb-1 sm:-mt-[9.85rem] sm:flex-row sm:items-start sm:justify-start sm:gap-8 sm:pl-8 md:gap-10 md:pl-12"
            initial={{ opacity: 0, y: 44, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24, mass: 0.85 }}
          >
            <div
              className="pointer-events-none absolute left-1/2 top-[2.5rem] z-0 h-[min(400px,92vw)] w-[min(400px,92vw)] -translate-x-1/2 -translate-y-1/2 sm:top-8 md:left-8 md:h-[400px] md:w-[400px] md:translate-x-0"
              style={{
                background:
                  'radial-gradient(ellipse 68% 64% at 50% 38%, rgba(56, 189, 248, 0.1) 0%, rgba(15, 23, 42, 0.04) 38%, transparent 70%)',
              }}
              aria-hidden
            />
            <div className="relative z-[51] -translate-y-3 shrink-0 sm:-translate-y-4 md:-translate-y-[1.35rem]">
              <div className="drop-shadow-[0_28px_64px_rgba(0,0,0,0.78),0_0_42px_rgba(34,211,238,0.55),0_0_72px_rgba(6,182,212,0.35),0_0_120px_rgba(34,211,238,0.12)]">
                <div className="aspect-square w-[280px] max-w-[min(280px,88vw)] isolate overflow-hidden rounded-full [clip-path:inset(0_round_50%)]">
                  <PlayerIdentity
                    initial={(user?.ea_persona_name ?? 'J').charAt(0).toUpperCase()}
                    avatarUrl={user?.avatarUrl?.trim() ? user.avatarUrl : yamalPhotoUrl}
                    rarity={user?.avatarRarity ?? 'legendary'}
                    activeFrameUrl={user?.activeFrameUrl}
                    royalEagleFrame={!user?.activeFrameUrl?.trim()}
                    activeJerseyId={undefined}
                    teamPrimaryColor={undefined}
                    teamSecondaryColor={undefined}
                    size="xl"
                    showcaseCutout
                    imgAlt={user?.ea_persona_name ?? 'Joueur'}
                    className="pointer-events-auto scale-[0.92] sm:scale-100"
                  />
                </div>
              </div>
            </div>
            {/* Salutation + pseudo : même ligne que l’avatar, bords supérieurs alignés (sm:items-start) */}
            <div className="relative z-[52] flex w-full max-w-[min(22rem,85vw)] flex-col items-center text-center sm:min-w-0 sm:max-w-none sm:flex-1 sm:items-start sm:pt-0 sm:text-left">
              <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">
                {greeting().toUpperCase()},
              </p>
              <div className="mt-1 flex min-w-0 flex-wrap items-center justify-center gap-2 sm:justify-start">
                <p className="min-w-0 truncate text-2xl font-bold leading-tight text-white">
                  {user?.ea_persona_name ?? 'Joueur'}
                </p>
                {user?.level !== undefined && (
                  <RankBadge level={user.level} size="sm" className="shrink-0" />
                )}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="space-y-8 px-3 pb-4 pt-3 sm:px-5 sm:pt-5">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex min-h-[158px] flex-col items-center justify-center rounded-[12px] border-[0.5px] border-white/10 bg-[#08090c] p-6"
                >
                  <SkeletonPulse className="h-[4.75rem] w-[4.75rem] rounded-full" />
                  <SkeletonPulse className="mt-4 h-2.5 w-28" />
                </div>
              ))}
            </div>
          ) : (
            <DashboardStatsBento
              totals={data?.totals ?? { goals: 0, assists: 0, averageAmr: 0 }}
            />
          )}

          {user?.xp !== undefined && user?.level !== undefined && (
            <div className="relative mx-auto max-w-2xl space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-500">
                  <TrendingUp className="h-3.5 w-3.5 text-amber-400/60" />
                  Niveau {user.level}
                </span>
                <span className="tabular-nums text-slate-600">
                  {user.xp.toLocaleString('fr-FR')} / {xpForNextLevel(user.level).toLocaleString('fr-FR')} XP
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700"
                  style={{ width: `${xpProgress(user.xp, user.level)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-600">
                {xpForNextLevel(user.level) - user.xp} XP avant le niveau {user.level + 1}
              </p>
            </div>
          )}

          <p className="text-center text-sm text-slate-500 sm:text-left">
            Centre de commandement — OMJEP
          </p>
          {user?.role && (
            <span className="inline-flex rounded-full border border-amber-400/25 bg-transparent px-3 py-1 text-xs font-medium text-amber-400 backdrop-blur-sm">
              {user.role === 'MANAGER'
                ? 'Manager de Club'
                : user.role === 'MODERATOR'
                  ? 'Commissaire de ligue'
                  : user.role === 'ADMIN'
                    ? 'Administrateur'
                    : 'Joueur'}
            </span>
          )}

      {/* Error: No Team */}
      {error === 'no-team' && (
        <div className="rounded-2xl border border-amber-500/25 p-8 text-center backdrop-blur-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Users className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="font-display font-bold text-xl text-amber-300 mb-2">
            Aucun club trouvé
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-4">
            Vous n'appartenez à aucune équipe pour le moment. Rejoignez un club ou créez le vôtre pour débloquer vos statistiques.
          </p>
          <Link
            to="/dashboard/club"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm font-semibold hover:bg-amber-500/20 transition-all"
          >
            Rejoindre un club
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {error === 'generic' && (
        <MaintenancePrestige overlay title="Vue d’ensemble" message={PRESTIGE_MSG} className="border-white/10" />
      )}

      {/* Section 2: MVP & Top Scorer */}
      {(loading || data) && (
        <div>
          <h2 className="mb-4 font-scifi text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
            Performances Individuelles
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 rounded-2xl border border-white/[0.08] p-8 backdrop-blur-sm">
                <SkeletonPulse className="w-32 h-6 mb-6" />
                <SkeletonPulse className="w-48 h-10 mb-4" />
                <SkeletonPulse className="w-full h-4 mb-2" />
                <SkeletonPulse className="w-3/4 h-4" />
              </div>
              <div className="rounded-2xl border border-white/[0.08] p-8 backdrop-blur-sm">
                <SkeletonPulse className="w-24 h-6 mb-6" />
                <SkeletonPulse className="w-16 h-16 rounded-full mx-auto mb-4" />
                <SkeletonPulse className="w-32 h-8 mx-auto" />
              </div>
            </div>
          ) : data ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {data.mvp ? (
                <div className="relative overflow-hidden rounded-xl border-y border-r border-[0.5px] border-white/10 border-l-2 border-l-blue-500 bg-[#08090c] px-4 py-8 sm:px-8 lg:col-span-2">
                  <div className="relative z-[1]">
                    <div className="mb-6 flex items-center gap-2">
                      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5">
                        <Crown className="h-4 w-4 text-blue-400" />
                        <span className="font-scifi text-[11px] font-medium uppercase tracking-[0.2em] text-slate-300">
                          MVP du Mois
                        </span>
                      </div>
                    </div>

                    <div className="flex items-end justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="mb-1 font-scifi text-2xl font-semibold text-white sm:text-3xl">
                          {data.mvp.displayName ?? 'Anonyme'}
                        </h3>
                        <div className="mb-6 flex flex-wrap items-baseline gap-2">
                          <span className="font-mono text-5xl font-bold tabular-nums text-blue-400 sm:text-6xl">
                            {Number(data.mvp?.averageRating ?? 0).toFixed(1)}
                          </span>
                          <span className="font-scifi text-sm font-medium tracking-[0.15em] text-slate-500">
                            AMR
                          </span>
                        </div>

                        <div className="flex gap-6">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded border border-white/10 bg-white/[0.02]">
                              <Swords className="h-4 w-4 text-slate-500" />
                            </div>
                            <div>
                              <p className="font-mono text-lg font-semibold tabular-nums text-white">
                                {Number(data.mvp?.goals ?? 0)}
                              </p>
                              <p className="font-scifi text-[10px] font-medium uppercase tracking-wider text-slate-500">
                                Buts
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded border border-white/10 bg-white/[0.02]">
                              <Star className="h-4 w-4 text-slate-500" />
                            </div>
                            <div>
                              <p className="font-mono text-lg font-semibold tabular-nums text-white">
                                {Number(data.mvp?.assists ?? 0)}
                              </p>
                              <p className="font-scifi text-[10px] font-medium uppercase tracking-wider text-slate-500">
                                Passes D.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="relative hidden h-28 w-28 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.02] sm:flex">
                        <Crown className="h-12 w-12 text-blue-400/80" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="lg:col-span-2">
                  <EmptyDataCard
                    title="MVP en attente"
                    message="Ajoutez des joueurs à votre club et jouez des matchs pour révéler le MVP."
                  />
                </div>
              )}

              {data.topScorer ? (
                <div className="relative overflow-hidden rounded-xl border-y border-r border-[0.5px] border-white/10 border-l-2 border-l-amber-400 bg-[#08090c] px-4 py-8 text-center">
                  <div className="relative z-[1] flex h-full flex-col items-center justify-center">
                    <div className="mb-6 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5">
                      <Flame className="h-4 w-4 text-amber-400" />
                      <span className="font-scifi text-[11px] font-medium uppercase tracking-[0.2em] text-amber-200/90">
                        Top Scorer
                      </span>
                    </div>

                    <div className="relative mx-auto mb-6 flex h-[108px] w-[108px] items-center justify-center rounded-lg border border-white/10 bg-white/[0.02]">
                      <NeonFootballIcon className="h-11 w-11 text-amber-400/90" />
                    </div>

                    <h3 className="mb-2 font-scifi text-xl font-semibold text-white">
                      {data.topScorer.displayName ?? 'Anonyme'}
                    </h3>

                    <div className="mb-4 flex flex-wrap items-end justify-center gap-2">
                      <span className="font-mono text-7xl font-bold tabular-nums leading-none text-amber-300 sm:text-8xl">
                        {Number(data.topScorer?.goals ?? 0)}
                      </span>
                      <span className="pb-1 text-sm font-medium text-amber-500/80">buts</span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1">
                      <span className="font-scifi text-[10px] font-medium uppercase tracking-[0.18em] text-amber-200/80">
                        Golden Boot
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyDataCard
                  title="Buteur en attente"
                  message="Aucun but enregistré pour le moment. Les stats se mettent à jour automatiquement."
                />
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Fil d'actualité Mercato */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-scifi text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
            <Megaphone className="h-4 w-4" />
            Journal du Mercato
          </h2>
          <Link to="/dashboard/transfers" className="text-xs text-[#FFD700] hover:underline">
            Voir tout →
          </Link>
        </div>

        {newsLoading ? (
          <div className="rounded-[12px] border-[0.5px] border-white/10 bg-[#08090c] p-6">
            <SkeletonPulse className="mb-3 h-4 w-3/4" />
            <SkeletonPulse className="mb-3 h-4 w-1/2" />
            <SkeletonPulse className="h-4 w-2/3" />
          </div>
        ) : news.length === 0 ? (
          <div className="rounded-[12px] border-[0.5px] border-white/10 bg-[#08090c] p-8 text-center">
            <Newspaper className="mx-auto mb-3 h-10 w-10 text-slate-600" />
            <p className="text-sm text-slate-500">Aucune actualité pour le moment.</p>
            <p className="mt-1 text-xs text-slate-600">Les transferts officialisés apparaîtront ici.</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute bottom-3 left-[11px] top-3 w-px bg-white/10" aria-hidden />
            <ul className="relative space-y-0">
              {news.map((item) => {
                const ticket = mercatoTicketKind(item);
                const isElite = mercatoNewsIsElite(item);
                const meta = item.metadata;
                const fee =
                  typeof meta?.transferFee === 'number' && meta.transferFee > 0 ? meta.transferFee : null;
                const salary =
                  typeof meta?.offeredSalary === 'number' && meta.offeredSalary > 0
                    ? meta.offeredSalary
                    : null;
                const d = new Date(item.created_at);
                const datePart = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                const timePart = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                const hasGrid =
                  Boolean(meta?.playerName?.trim()) ||
                  Boolean(meta?.fromTeamName?.trim()) ||
                  Boolean(meta?.toTeamName?.trim()) ||
                  fee !== null ||
                  salary !== null;

                return (
                  <li key={item.id} className="relative pb-10 pl-9 last:pb-2">
                    <span
                      className="absolute left-[11px] top-[0.65rem] z-[1] h-2 w-2 -translate-x-1/2 rounded-full border border-white/20 bg-[#08090c]"
                      aria-hidden
                    />
                    <div
                      className={`min-w-0 rounded-md py-2 pl-3 pr-2 transition-colors hover:bg-white/[0.02] ${
                        isElite ? 'border-l-2 border-[#D4AF37]' : 'border-l-2 border-transparent'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <MercatoActionBadge ticket={ticket} />
                        <span className="text-[10px] text-white/40">
                          <span>{datePart}</span>
                          <span className="mx-1 text-white/25">·</span>
                          <span className="font-mono tabular-nums text-white/55">{timePart}</span>
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold leading-snug tracking-tight text-white">
                        {item.title}
                      </p>
                      {item.description?.trim() ? (
                        <p className="mt-1 text-xs font-medium leading-relaxed text-slate-400">
                          {item.description}
                        </p>
                      ) : null}
                      {hasGrid ? (
                        <dl className="mt-3 grid max-w-lg grid-cols-[5.75rem_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-[11px] leading-tight">
                          {meta?.playerName?.trim() ? (
                            <>
                              <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                                Joueur
                              </dt>
                              <dd className="font-medium text-white/95">{meta.playerName.trim()}</dd>
                            </>
                          ) : null}
                          {meta?.fromTeamName?.trim() ? (
                            <>
                              <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                                Provenance
                              </dt>
                              <dd className="font-medium text-white/90">{meta.fromTeamName.trim()}</dd>
                            </>
                          ) : null}
                          {meta?.toTeamName?.trim() ? (
                            <>
                              <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                                Destination
                              </dt>
                              <dd className="font-medium text-white/90">{meta.toTeamName.trim()}</dd>
                            </>
                          ) : null}
                          {fee !== null ? (
                            <>
                              <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                                Montant
                              </dt>
                              <dd className="font-mono font-semibold tabular-nums text-white/90">
                                {formatCurrency(fee, 'OC')}
                              </dd>
                            </>
                          ) : null}
                          {salary !== null ? (
                            <>
                              <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                                Salaire
                              </dt>
                              <dd className="font-mono font-semibold tabular-nums text-white/90">
                                {formatCurrency(salary, 'OC')}
                              </dd>
                            </>
                          ) : null}
                        </dl>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 font-scifi text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
          Accès rapide
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map(({ label, description, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="group rounded-xl border border-white/10 bg-transparent p-5 backdrop-blur-sm transition-all duration-200 hover:border-amber-400/30 hover:bg-white/[0.03]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-transparent transition-all group-hover:border-amber-400/35">
                  <Icon className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white group-hover:text-amber-400 transition-colors">
                    {label}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400/60 flex-shrink-0 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}
