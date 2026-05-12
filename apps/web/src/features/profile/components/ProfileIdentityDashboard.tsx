import type { RefObject } from 'react'
import { Camera } from 'lucide-react'
import PlayerIdentity, { type PlayerIdentityRarity } from '@/components/PlayerIdentity'
import type { UserCardStyle } from '@/features/profile/mocks/premiumProfile.mock'
import {
  PlayerCardAndStoreSection,
  PlayerProfileHeroSection,
  PlayerProClubsStatsSection,
  PlayerSocialLinksSection,
  PlayerStreamerCreatorSection,
  type CreatorProfileBundle,
  type SocialLinkRow,
} from './PlayerProfileUltimateSections'

interface ProfileIdentityDashboardProps {
  playerName: string
  playerPseudo: string
  firstName: string
  lastName: string
  eaPersonaId: string
  tagline: string
  platformConsole: string
  nationality: string
  clubName: string
  roleLabel: string
  level: number
  xp: number
  xpProgressPct: number
  xpProgressText: string
  mainPosition: string
  secondaryPositions: string[]
  archetypes: string[]
  socialRows: SocialLinkRow[]
  isPublicProfile: boolean
  onTogglePublicProfile: () => void
  onOpenIdentityEditor: () => void
  onShareProfile?: () => void
  shareCopied?: boolean
  storeCosmeticsHref: string
  storePlayerCardsHref: string
  equippedCardStyle?: UserCardStyle
  avatarUrl?: string | null
  avatarRarity?: PlayerIdentityRarity
  activeFrameUrl?: string | null
  activeJerseyId?: string | null
  activeBannerUrl?: string | null
  teamPrimaryColor?: string
  teamSecondaryColor?: string
  auraGoldOverload?: boolean
  avatarAnchorRef: RefObject<HTMLDivElement>
  stats: Array<{
    id: 'PAC' | 'SHO' | 'PAS' | 'DRI' | 'DEF' | 'PHY'
    value: number
  }>
  matchStats: { matches: number; goals: number; assists: number } | null
  cleanSheets: number | null
  overallRating: number
  proClubLevel: number
  eaFcPersonaDisplay: string
  onConfigureEaFcId?: () => void
  showVipBadge: boolean
  creator: CreatorProfileBundle
  onConfigureStreamer: () => void
  onEditSocial?: () => void
  socialEditMode?: boolean
  socialDraft?: {
    instagramUrl: string
    whatsappUrl: string
    discordUrl: string
    youtubeUrl: string
    kickUrl: string
  }
  onSocialDraftChange?: (
    field: 'instagramUrl' | 'whatsappUrl' | 'discordUrl' | 'youtubeUrl' | 'kickUrl',
    value: string,
  ) => void
  onSaveSocial?: () => void
  onCancelSocial?: () => void
  socialSaving?: boolean
  socialError?: string | null
  socialFeedback?: string | null
  streamerEditMode?: boolean
  streamerDraft?: {
    youtubeUrl: string
    kickUrl: string
    discordUrl: string
    streamUrl: string
    latestVideoUrl: string
    latestLiveUrl: string
  }
  onStreamerDraftChange?: (
    field: 'youtubeUrl' | 'kickUrl' | 'discordUrl' | 'streamUrl' | 'latestVideoUrl' | 'latestLiveUrl',
    value: string,
  ) => void
  onSaveStreamer?: () => void
  onCancelStreamer?: () => void
  streamerSaving?: boolean
  streamerError?: string | null
  streamerFeedback?: string | null
}

const ProfileIdentityDashboard = ({
  playerName,
  playerPseudo,
  firstName,
  lastName,
  eaPersonaId,
  tagline,
  platformConsole,
  nationality,
  clubName,
  roleLabel,
  level,
  xp,
  xpProgressPct,
  xpProgressText,
  mainPosition,
  secondaryPositions,
  archetypes,
  socialRows,
  isPublicProfile,
  onTogglePublicProfile,
  onOpenIdentityEditor,
  onShareProfile,
  shareCopied,
  storeCosmeticsHref,
  storePlayerCardsHref,
  equippedCardStyle,
  avatarUrl,
  avatarRarity = 'legendary',
  activeFrameUrl,
  activeJerseyId,
  activeBannerUrl,
  teamPrimaryColor,
  teamSecondaryColor,
  auraGoldOverload = false,
  avatarAnchorRef,
  stats,
  matchStats,
  cleanSheets,
  overallRating,
  proClubLevel,
  eaFcPersonaDisplay,
  onConfigureEaFcId,
  showVipBadge,
  creator,
  onConfigureStreamer,
  onEditSocial,
  socialEditMode = false,
  socialDraft,
  onSocialDraftChange,
  onSaveSocial,
  onCancelSocial,
  socialSaving = false,
  socialError = null,
  socialFeedback = null,
  streamerEditMode = false,
  streamerDraft,
  onStreamerDraftChange,
  onSaveStreamer,
  onCancelStreamer,
  streamerSaving = false,
  streamerError = null,
  streamerFeedback = null,
}: ProfileIdentityDashboardProps) => {
  const heroAvatar = (
    <div ref={avatarAnchorRef} className="flex justify-center">
      <div className="relative rounded-2xl p-1 ring-1 ring-omjep-border/80 ring-offset-2 ring-offset-omjep-bg-panel/90">
        <PlayerIdentity
          size="lg"
          initial={playerName.charAt(0).toUpperCase()}
          avatarUrl={avatarUrl}
          rarity={avatarRarity}
          activeFrameUrl={activeFrameUrl}
          royalEagleFrame={!activeFrameUrl}
          activeJerseyId={activeJerseyId}
          teamPrimaryColor={teamPrimaryColor}
          teamSecondaryColor={teamSecondaryColor}
          auraGoldOverload={auraGoldOverload}
          imgAlt={playerName}
        />
      </div>
    </div>
  )

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 sm:space-y-6" aria-label="Hub profil joueur OMJEP">
      <PlayerProfileHeroSection
        heroAvatar={heroAvatar}
        firstName={firstName}
        lastName={lastName}
        displayName={playerName}
        gamertag={playerPseudo}
        platformConsole={platformConsole}
        nationality={nationality}
        mainPosition={mainPosition}
        secondaryPositions={secondaryPositions}
        clubName={clubName}
        roleLabel={roleLabel}
        level={level}
        showVipBadge={showVipBadge}
        isPublicProfile={isPublicProfile}
        onEditIdentity={onOpenIdentityEditor}
        onTogglePublicProfile={onTogglePublicProfile}
        onShareProfile={onShareProfile}
        shareCopied={shareCopied}
        tagline={tagline}
        eaPersonaId={eaPersonaId}
      />

      <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="space-y-5 lg:col-span-7">
          <PlayerProClubsStatsSection
            proClubLevel={proClubLevel}
            overallRating={overallRating}
            xp={xp}
            xpProgressPct={xpProgressPct}
            xpProgressText={xpProgressText}
            mainPosition={mainPosition}
            archetypes={archetypes}
            stats={stats}
            matches={matchStats?.matches ?? null}
            goals={matchStats?.goals ?? null}
            assists={matchStats?.assists ?? null}
            cleanSheets={cleanSheets}
            eaFcPersonaDisplay={eaFcPersonaDisplay}
            onConfigureEaFcId={onConfigureEaFcId}
          />
          {socialFeedback && !socialEditMode ? (
            <p className="rounded-lg border border-omjep-success/35 bg-omjep-success/10 px-3 py-2 text-xs font-medium text-omjep-text-primary">
              {socialFeedback}
            </p>
          ) : null}
          <PlayerSocialLinksSection
            rows={socialRows}
            isPublicProfile={isPublicProfile}
            onEditSocial={onEditSocial}
            editMode={socialEditMode}
            draft={socialDraft}
            onDraftChange={onSocialDraftChange}
            onSaveSocial={onSaveSocial}
            onCancelSocial={onCancelSocial}
            socialSaving={socialSaving}
            socialError={socialError}
          />
        </div>
        <div className="space-y-5 lg:col-span-5">
          <PlayerCardAndStoreSection
            playerName={playerName}
            gamertag={playerPseudo}
            level={level}
            nationality={nationality}
            mainPosition={mainPosition}
            clubName={clubName}
            stats={stats}
            equippedCardStyle={equippedCardStyle}
            storePlayerCardsHref={storePlayerCardsHref}
            storeCosmeticsHref={storeCosmeticsHref}
            activeBannerUrl={activeBannerUrl}
            activeFrameUrl={activeFrameUrl}
            activeEffectLabel={equippedCardStyle?.cssEffect}
            showVipBadge={showVipBadge}
          />
          {streamerFeedback && !streamerEditMode ? (
            <p className="rounded-lg border border-omjep-success/35 bg-omjep-success/10 px-3 py-2 text-xs font-medium text-omjep-text-primary">
              {streamerFeedback}
            </p>
          ) : null}
          <PlayerStreamerCreatorSection
            creator={creator}
            onConfigure={onConfigureStreamer}
            editMode={streamerEditMode}
            draft={streamerDraft}
            onStreamerDraftChange={onStreamerDraftChange}
            onSaveStreamer={onSaveStreamer}
            onCancelStreamer={onCancelStreamer}
            streamerSaving={streamerSaving}
            streamerError={streamerError}
          />
        </div>
      </div>

      <p className="text-center text-[10px] text-omjep-text-muted sm:text-left">
        <Camera className="mr-1 inline h-3 w-3 align-middle text-omjep-mauve" aria-hidden />
        Avatar &amp; bannière via « Éditer l&apos;identité » — styles carte en JPY (boutique).
      </p>
    </div>
  )
}

export default ProfileIdentityDashboard
