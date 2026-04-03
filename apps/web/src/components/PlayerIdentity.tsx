import { useMemo, type CSSProperties } from 'react';
import royalEagleFrameUrl from '@/assets/frames/royal-eagle.svg?url';
import carbonNeonJerseyUrl from '@/assets/jerseys/carbon-neon.svg?url';

export type PlayerIdentityRarity = 'common' | 'premium' | 'legendary';

/** Cadre mythique Royal Eagle (asset local) — utilisable seul ou avec `activeFrameUrl` qui prime */
export const ROYAL_EAGLE_FRAME_URL = royalEagleFrameUrl;

/** Maillot Carbon Neon — motif SVG (lignes néon + base carbone) */
export const CARBON_NEON_JERSEY_URL = carbonNeonJerseyUrl;

export interface PlayerIdentityProps {
  /** Initiale si pas d’image */
  initial: string;
  avatarUrl?: string | null;
  rarity?: PlayerIdentityRarity;
  activeFrameUrl?: string | null;
  /** Affiche le cadre Royal Eagle (SVG) si aucune `activeFrameUrl` */
  royalEagleFrame?: boolean;
  activeJerseyId?: string | null;
  /** Couleurs club — éclairent le radial sous le motif Carbon Neon */
  teamPrimaryColor?: string;
  teamSecondaryColor?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  imgAlt?: string;
  /**
   * Portrait photo « plein cadre » : pas de disque gris, image agrandie avec cheveux
   * pouvant dépasser le haut du cadre néon + ombre cyan (showcase type Yamal).
   */
  showcaseCutout?: boolean;
  /** Pulse temporaire — aura Electric Storm dominée par l’or (ex. level up profil). */
  auraGoldOverload?: boolean;
}

const SIZE_MAP = { xs: 32, sm: 72, md: 112, lg: 220, xl: 280 } as const;

/**
 * Masque radial circulaire (centre de la zone carrée) — bords adoucis, aligné sur le clip-path.
 */
const SHOWCASE_CUTOUT_MASK =
  'radial-gradient(circle 50% at 50% 50%, #fff 0%, #fff 72%, rgba(255,255,255,0.55) 86%, rgba(255,255,255,0.12) 94%, transparent 100%)';

/** Cercle strict au centre du carré — empêche tout débordement de la photo hors du disque */
const SHOWCASE_CUTOUT_CLIP_PATH = 'circle(50% at 50% 50%)';

function showcaseCutoutMaskStyle(): CSSProperties {
  return {
    WebkitMaskImage: SHOWCASE_CUTOUT_MASK,
    maskImage: SHOWCASE_CUTOUT_MASK,
    WebkitMaskSize: '100% 100%',
    maskSize: '100% 100%',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
  };
}

function showcaseCutoutClipStyle(): CSSProperties {
  return {
    clipPath: SHOWCASE_CUTOUT_CLIP_PATH,
    WebkitClipPath: SHOWCASE_CUTOUT_CLIP_PATH,
  };
}

/** Silhouette maillot (masque alpha) — identique à la zone du SVG Carbon Neon */
function jerseySilhouetteMaskDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"><path fill="white" d="M12 38c12-8 26-12 38-12s26 4 38 12l8 4v52H4V42l8-4z"/><ellipse cx="50" cy="28" rx="22" ry="10" fill="white"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function hashJerseyColors(id: string): { primary: string; secondary: string } {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n + id.charCodeAt(i) * (i + 7)) % 360;
  const h2 = (n + 48) % 360;
  return {
    primary: `hsl(${n} 72% 42%)`,
    secondary: `hsl(${h2} 55% 88%)`,
  };
}

/**
 * Moteur d’avatar multicouche (z-index documentés) :
 * 0 aura • 1 anneau conique (legendary) • 2 avatar (image + lueurs sous le cadre) • 3 maillot • 4 cadre néon au-dessus
 */
export function PlayerIdentity({
  initial,
  avatarUrl,
  rarity = 'common',
  activeFrameUrl,
  royalEagleFrame = false,
  activeJerseyId,
  teamPrimaryColor,
  teamSecondaryColor,
  size = 'md',
  className = '',
  imgAlt = 'Avatar',
  showcaseCutout = false,
  auraGoldOverload = false,
}: PlayerIdentityProps) {
  const px = SIZE_MAP[size];

  const frameBackgroundUrl =
    activeFrameUrl?.trim() ||
    (royalEagleFrame ? royalEagleFrameUrl : null);

  const hologramSync = !!frameBackgroundUrl;
  const frameShimmer =
    hologramSync && (rarity === 'legendary' || royalEagleFrame);

  const jerseyColors = useMemo(() => {
    if (teamPrimaryColor && teamSecondaryColor) {
      return { primary: teamPrimaryColor, secondary: teamSecondaryColor };
    }
    if (activeJerseyId) return hashJerseyColors(activeJerseyId);
    return { primary: '#1e3a8a', secondary: '#e2e8f0' };
  }, [activeJerseyId, teamPrimaryColor, teamSecondaryColor]);

  const hasJerseyContext = !!(activeJerseyId || teamPrimaryColor);
  const showJerseyOverlay = hasJerseyContext && !showcaseCutout;

  const maskUrl = useMemo(() => jerseySilhouetteMaskDataUrl(), []);

  const jerseyMaskStyle = useMemo(
    (): CSSProperties => ({
      WebkitMaskImage: maskUrl,
      maskImage: maskUrl,
      WebkitMaskSize: '100% 100%',
      maskSize: '100% 100%',
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center bottom',
      maskPosition: 'center bottom',
    }),
    [maskUrl],
  );

  /** Radial dynamique — éclaire les lignes néon depuis l’intérieur du torse */
  const carbonJerseyGlowBackground = useMemo(() => {
    const { primary, secondary } = jerseyColors;
    return `radial-gradient(ellipse 82% 70% at 50% 30%, ${primary} 0%, ${secondary} 36%, transparent 64%)`;
  }, [jerseyColors]);

  const legendaryAvatarFilter: CSSProperties | undefined =
    rarity === 'legendary'
      ? { filter: 'brightness(1.2) contrast(1.1)' }
      : undefined;

  const initialLetter = (initial || '?').slice(0, 1).toUpperCase();

  const commonAuraBg =
    'radial-gradient(circle at 50% 50%, rgba(148,163,184,0.14) 0%, transparent 72%)';

  const electricStormVortexA = useMemo(
    () =>
      rarity === 'legendary'
        ? 'conic-gradient(from 38deg, rgba(251,191,36,0.55) 0deg, rgba(180,83,9,0.12) 55deg, transparent 110deg, rgba(252,211,77,0.42) 180deg, transparent 235deg, rgba(234,179,8,0.48) 290deg, rgba(251,191,36,0.5) 360deg)'
        : 'conic-gradient(from 95deg, rgba(34,211,238,0.48) 0deg, transparent 70deg, rgba(168,85,247,0.32) 155deg, transparent 210deg, rgba(56,189,248,0.45) 280deg, rgba(236,72,153,0.22) 330deg, rgba(34,211,238,0.42) 360deg)',
    [rarity],
  );

  const electricStormVortexB = useMemo(
    () =>
      rarity === 'legendary'
        ? 'conic-gradient(from 200deg, transparent 0deg, rgba(253,230,138,0.35) 90deg, transparent 180deg, rgba(217,119,6,0.25) 270deg, transparent 360deg)'
        : 'conic-gradient(from -40deg, rgba(6,182,212,0.35) 0deg, transparent 100deg, rgba(139,92,246,0.28) 200deg, transparent 300deg)',
    [rarity],
  );

  const goldOverloadVortexA = useMemo(
    () =>
      'conic-gradient(from 32deg, rgba(254,249,195,0.92) 0deg, rgba(250,204,21,0.88) 70deg, rgba(234,179,8,0.72) 140deg, rgba(202,138,4,0.55) 210deg, rgba(253,224,71,0.9) 290deg, rgba(251,191,36,0.85) 360deg)',
    [],
  );

  const goldOverloadVortexB = useMemo(
    () =>
      'conic-gradient(from 180deg, rgba(253,230,138,0.65) 0deg, rgba(245,158,11,0.5) 100deg, transparent 200deg, rgba(250,204,21,0.55) 280deg, rgba(254,243,199,0.4) 360deg)',
    [],
  );

  const stormA = auraGoldOverload ? goldOverloadVortexA : electricStormVortexA;
  const stormB = auraGoldOverload ? goldOverloadVortexB : electricStormVortexB;

  const showElectricStorm = rarity === 'legendary' || rarity === 'premium';

  return (
    <div
      className={`relative shrink-0 ${showcaseCutout ? 'isolate overflow-hidden rounded-full' : ''} ${hologramSync ? 'player-identity-hologram-sync' : ''} ${auraGoldOverload ? 'player-identity-aura-gold-overload' : ''} ${className}`}
      style={{ width: px, height: px }}
      data-rarity={rarity}
      data-royal-eagle={royalEagleFrame ? 'true' : undefined}
      data-aura-gold-overload={auraGoldOverload ? 'true' : undefined}
    >
      {/* Layer 0 — Aura : Electric Storm (legendary/premium) ou discret (common) */}
      {showElectricStorm ? (
        <div
          className="player-identity-electric-storm pointer-events-none absolute inset-0 z-0 overflow-visible"
          aria-hidden
        >
          {/* Tourbillon d’énergie — conic + blur-2xl, pulsation 4s (sync cadre Royal Eagle) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="player-identity-electric-storm-core absolute inset-0 flex items-center justify-center">
              <div
                className="absolute h-[138%] w-[138%] rounded-full blur-2xl opacity-[0.92] animate-spin-slow"
                style={{
                  background: stormA,
                  animationDuration: auraGoldOverload ? '5.5s' : '14s',
                }}
              />
              <div
                className="absolute h-[128%] w-[128%] rounded-full blur-2xl opacity-[0.72] animate-spin-slow [animation-direction:reverse]"
                style={{
                  background: stormB,
                  animationDuration: auraGoldOverload ? '7.5s' : '21s',
                }}
              />
            </div>
          </div>
          {/* Aberration chromatique cyber — bords rouge / bleu (atténuée en surcharge or) */}
          <div
            className={`pointer-events-none absolute -inset-3 z-[1] rounded-full blur-2xl mix-blend-screen player-identity-electric-storm-ca player-identity-electric-storm-ca--red ${auraGoldOverload ? 'opacity-40' : ''}`}
          />
          <div
            className={`pointer-events-none absolute -inset-3 z-[1] rounded-full blur-2xl mix-blend-screen player-identity-electric-storm-ca player-identity-electric-storm-ca--blue ${auraGoldOverload ? 'opacity-0' : ''}`}
          />
          {/* Particules — orbites derrière l’avatar (animate-float / orbits CSS) */}
          <div className="pointer-events-none absolute inset-0 z-[2]">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={`player-id-storm-particle player-id-storm-particle--${n}`} />
            ))}
          </div>
        </div>
      ) : (
        <div
          className="player-identity-aura pointer-events-none absolute inset-0 z-0 rounded-full blur-xl"
          style={{ background: commonAuraBg }}
          aria-hidden
        />
      )}

      {/* Layer 1 — Anneau conique legendary */}
      {rarity === 'legendary' ? (
        <div
          className="pointer-events-none absolute inset-0 z-[10] animate-spin-slow rounded-full"
          style={{
            animationDuration: '8s',
            ...(showcaseCutout ? showcaseCutoutMaskStyle() : {}),
          }}
          aria-hidden
        >
          <div
            className="h-full w-full rounded-full"
            style={{
              background:
                'conic-gradient(from 0deg, transparent, #EAB308, transparent)',
            }}
          />
        </div>
      ) : null}

      {/* Layer 2 — Avatar */}
      <div
        className={`absolute z-[12] ${
          showcaseCutout
            ? 'aspect-square overflow-hidden rounded-full border-0 bg-transparent [clip-path:inset(0_round_50%)]'
            : `overflow-hidden rounded-full border border-white/10 bg-slate-900/90 ${
                rarity === 'premium' ? 'player-identity-premium-frame' : ''
              }`
        } ${rarity === 'legendary' ? 'inset-[3px]' : 'inset-0'}`}
      >
        {avatarUrl && showcaseCutout ? (
          <>
            {/* Lueur derrière silhouette — cyan (défaut) ou or intense (level up) */}
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 z-[8] w-[135%] max-w-none -translate-x-1/2 -translate-y-[54%] scale-110"
              style={{
                aspectRatio: '1 / 1.15',
                background: auraGoldOverload
                  ? 'radial-gradient(ellipse 44% 50% at 50% 32%, rgba(253, 224, 71, 0.72) 0%, rgba(234, 179, 8, 0.55) 28%, rgba(202, 138, 4, 0.32) 52%, rgba(254, 243, 199, 0.14) 70%, transparent 82%)'
                  : 'radial-gradient(ellipse 44% 50% at 50% 32%, rgba(103, 232, 249, 0.55) 0%, rgba(34, 211, 238, 0.42) 28%, rgba(6, 182, 212, 0.2) 52%, rgba(8, 145, 178, 0.08) 68%, transparent 82%)',
                filter: 'blur(36px)',
                mixBlendMode: 'screen',
              }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 z-[9] w-[95%] max-w-none -translate-x-1/2 -translate-y-[50%]"
              style={{
                height: '88%',
                background: auraGoldOverload
                  ? 'radial-gradient(ellipse 38% 46% at 50% 32%, rgba(254, 249, 195, 0.55) 0%, rgba(250, 204, 21, 0.22) 45%, transparent 70%)'
                  : 'radial-gradient(ellipse 38% 46% at 50% 32%, rgba(207, 250, 254, 0.5) 0%, rgba(34, 211, 238, 0.15) 45%, transparent 70%)',
                filter: 'blur(18px)',
                mixBlendMode: 'screen',
              }}
              aria-hidden
            />
            <img
              src={avatarUrl}
              alt={imgAlt}
              className="pointer-events-none absolute left-1/2 top-1/2 z-[10] aspect-square min-h-[118%] w-[118%] max-w-none -translate-x-1/2 -translate-y-1/2 select-none object-cover object-center"
              style={{
                ...showcaseCutoutMaskStyle(),
                ...showcaseCutoutClipStyle(),
                filter: auraGoldOverload
                  ? 'drop-shadow(0 18px 28px rgba(0, 0, 0, 0.45)) drop-shadow(0 0 32px rgba(251, 191, 36, 0.55)) drop-shadow(0 0 56px rgba(234, 179, 8, 0.35)) drop-shadow(0 0 28px rgba(34, 211, 238, 0.35))'
                  : 'drop-shadow(0 22px 36px rgba(0, 0, 0, 0.55)) drop-shadow(0 0 36px rgba(34, 211, 238, 0.58)) drop-shadow(0 0 56px rgba(6, 182, 212, 0.42)) drop-shadow(0 0 88px rgba(8, 145, 178, 0.22))',
              }}
              draggable={false}
            />
          </>
        ) : avatarUrl ? (
          <img
            src={avatarUrl}
            alt={imgAlt}
            className="h-full w-full object-cover"
            style={legendaryAvatarFilter}
            draggable={false}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 font-display text-5xl font-black uppercase text-slate-200 sm:text-6xl"
            style={legendaryAvatarFilter}
          >
            {initialLetter}
          </div>
        )}

        {/* Layer 3 — Carbon Neon : radial club + SVG masqué + pulse 2s */}
        <div
          className={`pointer-events-none absolute inset-0 z-[11] mix-blend-normal ${
            showJerseyOverlay ? (hasJerseyContext ? 'opacity-[0.94]' : 'opacity-40') : 'opacity-0'
          }`}
          style={jerseyMaskStyle}
          aria-hidden
        >
          {/* Sous-couche : éclairage intérieur (couleurs club) */}
          <div
            className="absolute inset-0 animate-jersey-glow"
            style={{ background: carbonJerseyGlowBackground }}
          />
          {/* Dessus : motif Carbon Neon (lignes néon) — même masque sur le conteneur parent */}
          <div
            className="absolute inset-0 animate-jersey-glow"
            style={{
              backgroundImage: `url(${carbonNeonJerseyUrl})`,
              backgroundSize: '100% 100%',
              backgroundPosition: 'center bottom',
              backgroundRepeat: 'no-repeat',
              mixBlendMode: 'screen',
            }}
          />
        </div>
      </div>

      {/* Layer 4 — Cadre (backgroundImage + shimmer + particules cyan) */}
      {frameBackgroundUrl ? (
        <div
          className={`player-identity-frame-layer pointer-events-none absolute inset-0 z-[40] rounded-full bg-contain bg-center bg-no-repeat ${
            showcaseCutout ? 'overflow-hidden' : ''
          } ${frameShimmer ? 'player-identity-legendary-shimmer' : ''} player-identity-frame-hologram`}
          style={{
            backgroundImage: `url(${frameBackgroundUrl})`,
          }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}

export default PlayerIdentity;
