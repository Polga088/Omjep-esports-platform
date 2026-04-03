import {
  ProfileShowcaseHeroMedia,
  useResolvedShowcaseBanner,
} from '@/components/ProfileShowcaseHeroMedia';

/**
 * Hero profil / dashboard : bannière sauvegardée (`activeBannerUrl`) + override URL `bannerPreview`.
 * Si aucune URL valide : retombe sur la vidéo stade Mixkit (voir `ProfileShowcaseHeroMedia`).
 */
export function ProfileHeroMedia({ savedBannerUrl }: { savedBannerUrl?: string | null }) {
  const resolved = useResolvedShowcaseBanner(savedBannerUrl ?? null);
  return <ProfileShowcaseHeroMedia bannerUrl={resolved} />;
}
