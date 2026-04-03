import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

/** Vidéo stade par défaut — alignée sur ProfilePage */
export const SHOWCASE_STADIUM_VIDEO_URL =
  'https://assets.mixkit.co/videos/preview/mixkit-sports-stadium-at-night-4427-large.mp4';

export function isVideoBannerUrl(url: string): boolean {
  return /\.(mp4|webm|ogg)(\?|#|$)/i.test(url.trim());
}

/**
 * URL bannière : `bannerPreview` (query) prime sur la bannière équipée (profil).
 */
export function useResolvedShowcaseBanner(savedBannerUrl?: string | null): string | null {
  const [searchParams] = useSearchParams();
  const raw = searchParams.get('bannerPreview');
  if (raw) {
    try {
      const decoded = decodeURIComponent(raw);
      if (decoded.trim()) return decoded.trim();
    } catch {
      if (raw.trim()) return raw.trim();
    }
  }
  const saved = savedBannerUrl?.trim();
  return saved || null;
}

export function useShowcaseVortexHue(): boolean {
  const [searchParams] = useSearchParams();
  return searchParams.get('bannerHue') === 'vortex';
}

function ShowcaseMediaLayer({ url }: { url: string }) {
  if (isVideoBannerUrl(url)) {
    return (
      <video
        className="h-full w-full scale-[1.06] object-cover"
        autoPlay
        muted
        loop
        playsInline
        poster=""
      >
        <source
          src={url}
          type={/\.webm(\?|#|$)/i.test(url) ? 'video/webm' : 'video/mp4'}
        />
      </video>
    );
  }
  return (
    <img
      src={url}
      alt=""
      className="h-full w-full scale-[1.06] object-cover"
      loading="eager"
    />
  );
}

/**
 * Média hero avec fondu croisé 0,5s entre les thèmes (AnimatePresence mode sync).
 * `bannerUrl` résolu : null → vidéo stade par défaut.
 */
export function ProfileShowcaseHeroMedia({ bannerUrl }: { bannerUrl: string | null }) {
  const effective = bannerUrl?.trim() || null;
  const layerUrl = effective ?? SHOWCASE_STADIUM_VIDEO_URL;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={layerUrl}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <ShowcaseMediaLayer url={layerUrl} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
