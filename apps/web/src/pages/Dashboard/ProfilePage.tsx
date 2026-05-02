import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
  User,
  MapPin,
  Save,
  CheckCircle,
  Shield,
  Gamepad2,
  Camera,
  X,
  Share2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { OMJEP_XP_FLOW_EVENT, type XpFlowDetail } from '@/lib/refreshEconomyFromApi';
import { type PlayerIdentityRarity } from '@/components/PlayerIdentity';
import MaintenancePrestige, { PRESTIGE_MSG } from '@/components/MaintenancePrestige';
import { uploadAvatar, uploadBanner } from '@/lib/profileUploads'
import { xpProgress, calculateLevel } from '@/lib/leveling'
import { useModalOpenSound } from '@/hooks/useModalOpenSound'
import PremiumPlayerProfile from '@/features/profile/components/PremiumPlayerProfile';
import ProfileIdentityDashboard from '@/features/profile/components/ProfileIdentityDashboard';
import {
  fetchMyPremiumProfile,
  getEquippedCardStyle,
  mapCardRarityToIdentityRarity,
  type UserPremiumProfile,
} from '@/features/profile/mocks/premiumProfile.mock';
import {
  PLAYER_CARD_STORE_CHANGED,
  resolveEquippedPlayerCardFromMock,
} from '@/features/store/models/playerCardStore.model';

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

function formatXp(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

const POSITION_SECONDARIES: Record<string, string[]> = {
  GK: ['DC'],
  DC: ['LAT', 'RAT'],
  LAT: ['DC', 'MDC'],
  RAT: ['DC', 'MDC'],
  MDC: ['MOC', 'DC'],
  MOC: ['ATT', 'MD'],
  MG: ['MOC', 'BU'],
  MD: ['MOC', 'BU'],
  BU: ['ATT', 'MOC'],
  ATT: ['BU', 'MOC'],
  LW: ['RW', 'CAM'],
  RW: ['LW', 'CAM'],
  CAM: ['LW', 'RW'],
  LM: ['MG', 'MOC'],
  RM: ['MD', 'MOC'],
  ST: ['BU', 'ATT'],
};

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

export default function ProfilePage() {
  const { user, patchUser } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [isPremiumView, setIsPremiumView] = useState(false);
  const [isLoadingPremiumProfile, setIsLoadingPremiumProfile] = useState(false);
  const [premiumProfile, setPremiumProfile] = useState<UserPremiumProfile | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [isPublicProfile, setIsPublicProfile] = useState(true);
  const [cardStoreRev, setCardStoreRev] = useState(0);
  const [gamePlatform, setGamePlatform] = useState<'PS5' | 'XBOX' | 'PC'>('PS5');

  useModalOpenSound(identityModalOpen);

  const avatarInputId = useId();
  const bannerInputId = useId();

  const avatarAnchorRef = useRef<HTMLDivElement>(null);
  const levelBaselineRef = useRef(1);
  const overloadClearRef = useRef<any>(null);

  const storeCosmeticsHref = useMemo(() => {
    const p = new URLSearchParams();
    p.set('tab', 'cosmetics');
    const bp = searchParams.get('bannerPreview');
    if (bp) p.set('bannerPreview', bp);
    const bh = searchParams.get('bannerHue');
    if (bh) p.set('bannerHue', bh);
    return `/dashboard/store?${p.toString()}`;
  }, [searchParams]);

  const storePlayerCardsHref = useMemo(() => '/dashboard/store?tab=card-styles', []);

  useEffect(() => {
    const handler = () => setCardStoreRev((n) => n + 1);
    window.addEventListener(PLAYER_CARD_STORE_CHANGED, handler);
    return () => window.removeEventListener(PLAYER_CARD_STORE_CHANGED, handler);
  }, []);

  useEffect(() => {
    const profileView = searchParams.get('view');
    setIsPremiumView(profileView === 'premium');
  }, [searchParams]);

  useEffect(() => {
    if (!isPremiumView) return;
    let isCancelled = false;

    setIsLoadingPremiumProfile(true);
    void fetchMyPremiumProfile()
      .then((data) => {
        if (isCancelled) return;
        setPremiumProfile(data);
        const equippedStyle = getEquippedCardStyle(data);
        if (equippedStyle) {
          patchUser({ avatarRarity: mapCardRarityToIdentityRarity(equippedStyle.rarity) });
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingPremiumProfile(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isPremiumView, patchUser]);

  useEffect(() => {
    if (isPremiumView) return;
    const equipped = resolveEquippedPlayerCardFromMock();
    if (equipped) {
      patchUser({ avatarRarity: mapCardRarityToIdentityRarity(equipped.rarity) });
    }
  }, [isPremiumView, cardStoreRev, patchUser]);

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

  const handleProfileViewChange = (view: 'classic' | 'premium') => {
    setIsPremiumView(view === 'premium');
    setSearchParams(
      (previousParams) => {
        const nextParams = new URLSearchParams(previousParams);
        if (view === 'premium') {
          nextParams.set('view', 'premium');
        } else {
          nextParams.delete('view');
        }
        return nextParams;
      },
      { replace: true },
    );
  };

  const handleShareProfile = async () => {
    const shareUrl = new URL(window.location.href);
    if (isPremiumView) {
      shareUrl.searchParams.set('view', 'premium');
    } else {
      shareUrl.searchParams.delete('view');
    }

    try {
      await navigator.clipboard.writeText(shareUrl.toString());
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1800);
    } catch {
      setShareCopied(false);
    }
  };

  const xp = me?.xp ?? 0;
  const computedLevel = Math.max(1, calculateLevel(xp));
  const level = me?.level ?? computedLevel;
  const xpProg = xpProgress(xp, computedLevel);
  const roleLabel =
    user?.role === 'MANAGER'
      ? 'Manager'
      : user?.role === 'ADMIN'
        ? 'Admin'
        : user?.role === 'MODERATOR'
          ? 'Modérateur'
          : 'Joueur';
  const equippedCardStyle = useMemo(() => {
    const fromMockStore = resolveEquippedPlayerCardFromMock();
    if (fromMockStore) return fromMockStore;
    return premiumProfile ? getEquippedCardStyle(premiumProfile) : undefined;
  }, [premiumProfile, cardStoreRev]);
  const playerName =
    form.ea_persona_name.trim() || user?.ea_persona_name || premiumProfile?.displayName || 'Joueur OMJEP';
  const playerPseudo = premiumProfile?.username || playerName.toLowerCase().replace(/\s+/g, '_');
  const nationality = form.nationality.trim() || premiumProfile?.nationality || user?.nationality || 'Non renseignée';
  const clubName = premiumProfile?.currentClub?.name || 'Sans club';
  const mainPosition = form.preferred_position || premiumProfile?.mainPosition || 'ATT';
  const secondaryPositions = POSITION_SECONDARIES[mainPosition] ?? ['MOC', 'BU'];
  const archetypes = premiumProfile?.playStyles?.length
    ? premiumProfile.playStyles.map((style) => style.label)
    : ['Vitesse explosive', 'Créateur', 'Finisseur'];
  const nameParts = playerName.trim().split(/\s+/).filter(Boolean);
  const profileFirstName = nameParts[0] ?? '';
  const profileLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
  const profileTagline = '';
  const platformConsoleLabel =
    gamePlatform === 'PS5' ? 'PlayStation 5' : gamePlatform === 'XBOX' ? 'Xbox Series X|S' : 'PC';

  const socialRows = [
    {
      id: 'instagram' as const,
      label: 'Instagram',
      value: '',
      href: null as string | null,
      isEmpty: true,
    },
    {
      id: 'whatsapp' as const,
      label: 'WhatsApp',
      value: '',
      href: null,
      isEmpty: true,
    },
    {
      id: 'discord' as const,
      label: 'Discord',
      value: `${playerPseudo}`,
      href: null,
      isEmpty: false,
    },
    {
      id: 'youtube' as const,
      label: 'YouTube',
      value: '',
      href: null,
      isEmpty: true,
    },
    {
      id: 'kick' as const,
      label: 'Kick',
      value: '',
      href: null,
      isEmpty: true,
    },
  ];

  const creatorBundle = {
    youtubeChannel: premiumProfile?.streamingProfile?.youtubeChannel ?? '',
    kickChannel: premiumProfile?.streamingProfile?.kickChannel ?? '',
    discordCommunity: premiumProfile?.streamingProfile?.discordCommunity ?? '',
    mainStreamUrl: premiumProfile?.streamingProfile?.mainStreamUrl ?? '',
    latestVideoLabel: premiumProfile?.streamingProfile?.latestVideoLabel ?? '',
    latestLiveLabel: premiumProfile?.streamingProfile?.latestLiveLabel ?? '',
  };

  const showVipBadge = Boolean(premiumProfile?.vipActive);
  const proClubIoPending = premiumProfile?.proClubIoSynced !== true;
  const statValues: Array<{ id: 'PAC' | 'SHO' | 'PAS' | 'DRI' | 'DEF' | 'PHY'; value: number }> = premiumProfile?.attributes
    ? [
        { id: 'PAC', value: premiumProfile.attributes.pace },
        { id: 'SHO', value: premiumProfile.attributes.shooting },
        { id: 'PAS', value: premiumProfile.attributes.passing },
        { id: 'DRI', value: premiumProfile.attributes.dribbling },
        { id: 'DEF', value: premiumProfile.attributes.defense },
        { id: 'PHY', value: premiumProfile.attributes.physical },
      ]
    : [
        { id: 'PAC', value: Math.min(99, 55 + Math.round(level * 1.3)) },
        { id: 'SHO', value: Math.min(99, 50 + (stats?.goals ?? 0) * 3 + Math.round(level * 0.7)) },
        { id: 'PAS', value: Math.min(99, 48 + (stats?.assists ?? 0) * 4 + Math.round(level * 0.6)) },
        { id: 'DRI', value: Math.min(99, 54 + Math.round(level * 1.1)) },
        { id: 'DEF', value: Math.min(99, 46 + Math.round(level * 0.8)) },
        { id: 'PHY', value: Math.min(99, 52 + Math.round(level * 0.9)) },
      ];
  const overallRating = Math.min(
    99,
    Math.round(statValues.reduce((a, s) => a + s.value, 0) / Math.max(statValues.length, 1)),
  );
  const cleanSheetsFromPremium = premiumProfile?.performance?.cleanSheets ?? null;

  if (loading) {
    return (
      <div className="relative min-h-[60vh] max-w-4xl space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-72 w-full rounded-2xl bg-omjep-bg-panel-soft/80" />
          <div className="mx-auto h-40 w-40 rounded-full bg-omjep-bg-panel-soft/80" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-omjep-bg-panel-soft/80" />
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-omjep-border bg-omjep-bg-panel/90 p-4 shadow-[var(--omjep-shadow-sm)]">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-omjep-mauve">
            Affichage profil
          </p>
          <p className="text-sm text-omjep-text-secondary">Classique ou carte premium OMJEP</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleShareProfile()}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wide transition ${
              shareCopied
                ? 'border-omjep-success/45 bg-omjep-success/12 text-omjep-text-primary'
                : 'border-omjep-border bg-omjep-bg-elevated/80 text-omjep-text-primary hover:border-omjep-mauve/40 hover:bg-omjep-mauve/10'
            }`}
          >
            <Share2 className="h-3.5 w-3.5" />
            {shareCopied ? 'Lien copié' : 'Partager mon profil'}
          </button>
          <div className="inline-flex rounded-xl border border-omjep-border bg-omjep-bg-panel-soft/60 p-1">
            <button
              type="button"
              onClick={() => handleProfileViewChange('classic')}
              className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
                !isPremiumView
                  ? 'bg-omjep-mauve/20 text-omjep-text-primary'
                  : 'text-omjep-text-muted hover:text-omjep-text-primary'
              }`}
            >
              Vue classique
            </button>
            <button
              type="button"
              onClick={() => handleProfileViewChange('premium')}
              className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
                isPremiumView
                  ? 'border border-omjep-border-gold/45 bg-omjep-gold/12 text-omjep-gold'
                  : 'text-omjep-text-muted hover:text-omjep-text-primary'
              }`}
            >
              Vue premium
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isPremiumView ? (
          <motion.div
            key="premium-profile"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <PremiumPlayerProfile profile={premiumProfile} isLoading={isLoadingPremiumProfile} />
          </motion.div>
        ) : (
          <motion.div
            key="classic-profile"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <div className="space-y-8">
              <div className="rounded-2xl border border-omjep-border bg-omjep-bg-panel/90 p-4 shadow-[var(--omjep-shadow-sm)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-omjep-cobalt">Plateforme principale</p>
                <p className="mt-1 text-xs text-omjep-text-secondary">EA SPORTS FC 26 · Crossplay</p>
                <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Choisir la plateforme">
                  {(['PS5', 'XBOX', 'PC'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setGamePlatform(p)}
                      className={`min-h-[44px] min-w-[5.5rem] rounded-xl border px-4 py-2.5 text-xs font-bold uppercase tracking-wide transition ${
                        gamePlatform === p
                          ? 'border-omjep-mauve/55 bg-omjep-mauve/20 text-omjep-text-primary'
                          : 'border-omjep-border bg-omjep-bg-elevated text-omjep-text-secondary hover:border-omjep-mauve/35'
                      }`}
                    >
                      {p === 'PS5' ? 'PS5' : p === 'XBOX' ? 'Xbox' : 'PC'}
                    </button>
                  ))}
                </div>
              </div>
              <ProfileIdentityDashboard
                playerName={playerName}
                playerPseudo={playerPseudo}
                firstName={profileFirstName}
                lastName={profileLastName}
                eaPersonaId={form.ea_persona_name.trim() || user?.ea_persona_name || '—'}
                tagline={profileTagline}
                platformConsole={platformConsoleLabel}
                nationality={nationality}
                clubName={clubName}
                roleLabel={roleLabel}
                level={level}
                xp={xp}
                xpProgressPct={Math.min(100, Math.max(0, xpProg.percentage))}
                xpProgressText={`${formatXp(xp)} XP · Palier ${xpProg.nextLevel}`}
                mainPosition={mainPosition}
                secondaryPositions={secondaryPositions}
                archetypes={archetypes}
                socialRows={socialRows}
                isPublicProfile={isPublicProfile}
                onTogglePublicProfile={() => setIsPublicProfile((prev) => !prev)}
                onOpenIdentityEditor={() => {
                  setIdentityModalOpen(true);
                  setAvatarFile(null);
                  setBannerFile(null);
                  setError(null);
                }}
                onShareProfile={() => void handleShareProfile()}
                shareCopied={shareCopied}
                storeCosmeticsHref={storeCosmeticsHref}
                storePlayerCardsHref={storePlayerCardsHref}
                equippedCardStyle={equippedCardStyle}
                avatarUrl={user?.avatarUrl ?? me?.avatarUrl ?? null}
                avatarRarity={user?.avatarRarity ?? me?.avatarRarity ?? 'legendary'}
                activeFrameUrl={user?.activeFrameUrl ?? me?.activeFrameUrl ?? null}
                activeJerseyId={user?.activeJerseyId ?? me?.activeJerseyId ?? null}
                activeBannerUrl={user?.activeBannerUrl ?? me?.activeBannerUrl ?? null}
                teamPrimaryColor={user?.teamPrimaryColor ?? me?.teamPrimaryColor}
                teamSecondaryColor={user?.teamSecondaryColor ?? me?.teamSecondaryColor}
                auraGoldOverload={auraGoldOverload}
                avatarAnchorRef={avatarAnchorRef}
                stats={statValues}
                matchStats={stats}
                cleanSheets={cleanSheetsFromPremium}
                overallRating={overallRating}
                proClubLevel={level}
                proClubIoPending={proClubIoPending}
                showVipBadge={showVipBadge}
                creator={creatorBundle}
                onConfigureStreamer={() => {
                  setIdentityModalOpen(true);
                  setAvatarFile(null);
                  setBannerFile(null);
                  setError(null);
                }}
              />

      {/* Réglages compétition — même logique formulaire, présentation carte */}
      <div className="relative z-[1] mt-8 space-y-6 sm:mt-10 sm:space-y-8">
        <div className="relative overflow-hidden rounded-2xl border border-omjep-border bg-omjep-bg-panel/95 p-8 shadow-[var(--omjep-shadow-sm)] backdrop-blur-sm">
          <div className="pointer-events-none absolute -right-20 top-0 h-48 w-48 rounded-full bg-omjep-mauve/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-bold text-omjep-text-primary">Réglages compétition</h2>
            <p className="mt-2 text-sm leading-relaxed text-omjep-text-secondary">
              Votre{' '}
              <span className="font-semibold text-omjep-mauve">pseudo EA Sports</span> est utilisé pour la
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
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl border border-omjep-mauve/45 bg-omjep-mauve/15 px-5 py-3 text-xs font-bold uppercase tracking-wide text-omjep-text-primary shadow-sm transition hover:border-omjep-mauve hover:bg-omjep-mauve/25 sm:min-h-0 sm:py-2.5"
            >
              <Camera className="h-4 w-4" aria-hidden />
              Modifier l&apos;identité
            </button>
          </div>
        </div>

        {success && (
          <div className="flex items-center gap-3 rounded-xl border border-omjep-success/30 bg-omjep-success/10 p-4 animate-in fade-in slide-in-from-top-2">
            <CheckCircle className="h-5 w-5 shrink-0 text-omjep-success" />
            <p className="text-sm font-medium text-omjep-text-primary">Profil mis à jour avec succès !</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-omjep-danger/25 bg-omjep-danger/10 p-4">
            <p className="text-sm text-omjep-danger">{error}</p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-8 rounded-2xl border border-omjep-border bg-omjep-bg-panel/80 p-6 shadow-[var(--omjep-shadow-sm)] md:p-8"
        >
          <section className="space-y-5">
            <div className="mb-1 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-omjep-mauve/30 bg-omjep-mauve/10">
                <Gamepad2 className="h-4 w-4 text-omjep-mauve" />
              </div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-omjep-text-muted">
                Informations de jeu
              </h3>
            </div>

            <div className="space-y-2">
              <label htmlFor="ea_name" className="block text-sm font-medium text-omjep-text-primary">
                Pseudo EA Sports
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <User className="h-4 w-4 text-omjep-text-muted" />
                </div>
                <input
                  id="ea_name"
                  type="text"
                  value={form.ea_persona_name}
                  onChange={(e) => update('ea_persona_name', e.target.value)}
                  placeholder="Ex: xEagle_Sniper"
                  className="w-full rounded-xl border border-omjep-border bg-omjep-bg-panel-soft py-3 pl-11 pr-4 text-sm text-omjep-text-primary outline-none transition-all placeholder:text-omjep-text-muted hover:border-omjep-mauve/35 focus:border-omjep-mauve focus:ring-2 focus:ring-omjep-mauve/20"
                />
              </div>
              <p className="text-xs text-omjep-text-muted">Doit correspondre exactement à votre pseudo en jeu.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="position" className="block text-sm font-medium text-omjep-text-primary">
                Position préférée
              </label>
              <div className="relative">
                <select
                  id="position"
                  value={form.preferred_position}
                  onChange={(e) => update('preferred_position', e.target.value)}
                  className="w-full cursor-pointer appearance-none rounded-xl border border-omjep-border bg-omjep-bg-panel-soft py-3 pl-4 pr-10 text-sm text-omjep-text-primary outline-none transition-all hover:border-omjep-mauve/35 focus:border-omjep-mauve focus:ring-2 focus:ring-omjep-mauve/20"
                >
                  <option value="" className="bg-omjep-bg-panel text-omjep-text-muted">
                    Sélectionnez une position
                  </option>
                  {POSITIONS.map(({ value, label }) => (
                    <option key={value} value={value} className="bg-omjep-bg-panel text-omjep-text-primary">
                      {label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                  <svg className="h-4 w-4 text-omjep-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </section>

          <div className="h-px bg-omjep-border/60" />

          <section className="space-y-5">
            <div className="mb-1 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-omjep-border bg-omjep-bg-elevated/80">
                <Shield className="h-4 w-4 text-omjep-mauve" />
              </div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-omjep-text-muted">Identité</h3>
            </div>

            <div className="space-y-2">
              <label htmlFor="nationality" className="block text-sm font-medium text-omjep-text-primary">
                Nationalité
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <MapPin className="h-4 w-4 text-omjep-text-muted" />
                </div>
                <input
                  id="nationality"
                  type="text"
                  value={form.nationality}
                  onChange={(e) => update('nationality', e.target.value)}
                  placeholder="Ex: Marocain"
                  className="w-full rounded-xl border border-omjep-border bg-omjep-bg-panel-soft py-3 pl-11 pr-4 text-sm text-omjep-text-primary outline-none transition-all placeholder:text-omjep-text-muted hover:border-omjep-mauve/35 focus:border-omjep-mauve focus:ring-2 focus:ring-omjep-mauve/20"
                />
              </div>
            </div>
          </section>

          <div className="h-px bg-omjep-border/60" />

          <button
            type="submit"
            disabled={saving}
            className="group relative inline-flex items-center gap-2.5 rounded-xl border border-omjep-mauve/50 bg-omjep-mauve/20 px-6 py-3 text-sm font-semibold text-omjep-text-primary shadow-[var(--omjep-glow-mauve-soft)] transition-all hover:bg-omjep-mauve/30 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
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
          className="tactical-modal-backdrop z-[200]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="identity-modal-title"
        >
          <div
            className="tactical-modal-dim"
            onClick={() => {
              setIdentityModalOpen(false);
              setAvatarFile(null);
              setBannerFile(null);
            }}
            role="presentation"
            aria-hidden
          />
          <div
            className="tactical-modal-panel max-w-md border border-omjep-border p-6 shadow-[var(--omjep-shadow-md)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setIdentityModalOpen(false);
                setAvatarFile(null);
                setBannerFile(null);
              }}
              className="absolute right-4 top-4 rounded-lg p-1 text-omjep-text-muted transition hover:bg-omjep-bg-panel-soft hover:text-omjep-text-primary"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 id="identity-modal-title" className="font-display pr-10 text-lg font-bold text-omjep-text-primary">
              Modifier l&apos;identité
            </h2>
            <p className="mt-2 text-sm text-omjep-text-secondary">
              Photo de profil (400x400px, max 5 Mo) et bannière (1500x500px ou vidéo MP4/WebM, max 30 Mo).
            </p>
            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <label htmlFor={avatarInputId} className="block text-sm font-medium text-omjep-text-primary">
                  Avatar
                </label>
                <input
                  id={avatarInputId}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="block w-full text-sm text-omjep-text-secondary file:mr-3 file:rounded-lg file:border-0 file:border file:border-omjep-border file:bg-omjep-mauve/12 file:px-3 file:py-2 file:text-xs file:font-bold file:uppercase file:text-omjep-text-primary"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-[10px] font-mono text-omjep-text-muted">Recommandé : Carré (PNG/JPG)</p>
                {avatarFile ? (
                  <p className="text-xs text-omjep-mauve">{avatarFile.name}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <label htmlFor={bannerInputId} className="block text-sm font-medium text-omjep-text-primary">
                  Bannière
                </label>
                <input
                  id={bannerInputId}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
                  className="block w-full text-sm text-omjep-text-secondary file:mr-3 file:rounded-lg file:border-0 file:border file:border-omjep-border file:bg-omjep-mauve/12 file:px-3 file:py-2 file:text-xs file:font-bold file:uppercase file:text-omjep-text-primary"
                  onChange={(e) => setBannerFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-[10px] font-mono text-omjep-text-muted">Recommandé : 3:1 (JPG ou MP4)</p>
                {bannerFile ? (
                  <p className="text-xs text-omjep-mauve">{bannerFile.name}</p>
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
                className="rounded-xl border border-omjep-border px-4 py-2.5 text-sm font-medium text-omjep-text-secondary transition hover:bg-omjep-bg-panel-soft"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={mediaUploading}
                onClick={() => void handleSaveIdentityMedia()}
                className="rounded-xl border border-omjep-mauve/45 bg-omjep-mauve/25 px-5 py-2.5 text-sm font-semibold text-omjep-text-primary shadow-[var(--omjep-glow-mauve-soft)] transition hover:bg-omjep-mauve/35 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mediaUploading ? 'Envoi…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
