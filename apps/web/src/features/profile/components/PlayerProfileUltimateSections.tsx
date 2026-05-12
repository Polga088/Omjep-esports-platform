import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  AtSign,
  Crown,
  ExternalLink,
  MessageCircle,
  PlayCircle,
  Radio,
  Shield,
  Sparkles,
  Tv,
  Users,
  Zap,
} from 'lucide-react'
import type { UserCardStyle } from '@/features/profile/mocks/premiumProfile.mock'
import type { PlayerCardStoreRarity } from '@/features/store/models/playerCardStore.model'
import {
  PLAYER_CARD_MOCK_CATALOG,
  playerCardRarityBadgeClass,
  playerCardRarityFrameClass,
  playerCardRarityLabel,
  readPlayerCardStoreState,
} from '@/features/store/models/playerCardStore.model'

export interface SocialLinkRow {
  id: 'instagram' | 'whatsapp' | 'discord' | 'youtube' | 'kick'
  label: string
  value: string
  href?: string | null
  isEmpty?: boolean
}

export interface CreatorProfileBundle {
  youtubeUrl: string
  kickUrl: string
  discordUrl: string
  streamUrl: string
  latestVideoUrl: string
  latestLiveUrl: string
}

const linkInputClass =
  'w-full min-w-0 rounded-xl border border-[color-mix(in_srgb,var(--omjep-mauve)_38%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-bg-panel)_92%,#06030f)] px-3 py-2.5 text-sm text-omjep-text-primary shadow-[inset_0_1px_0_color-mix(in_srgb,white_4%,transparent)] outline-none transition placeholder:text-omjep-text-muted focus:border-[color-mix(in_srgb,var(--omjep-gold)_42%,var(--omjep-mauve))] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--omjep-mauve)_28%,transparent)]'

export interface PlayerProfileHeroSectionProps {
  heroAvatar: ReactNode
  firstName: string
  lastName: string
  displayName: string
  gamertag: string
  platformConsole: string
  nationality: string
  mainPosition: string
  secondaryPositions: string[]
  clubName: string
  roleLabel: string
  level: number
  showVipBadge: boolean
  isPublicProfile: boolean
  onEditIdentity: () => void
  onTogglePublicProfile: () => void
  onShareProfile?: () => void
  shareCopied?: boolean
  tagline: string
  eaPersonaId: string
}

export const PlayerProfileHeroSection = ({
  heroAvatar,
  firstName,
  lastName,
  displayName,
  gamertag,
  platformConsole,
  nationality,
  mainPosition,
  secondaryPositions,
  clubName,
  roleLabel,
  level,
  showVipBadge,
  isPublicProfile,
  onEditIdentity,
  onTogglePublicProfile,
  onShareProfile,
  shareCopied,
  tagline,
  eaPersonaId,
}: PlayerProfileHeroSectionProps) => {
  const fn = firstName.trim() || '—'
  const ln = lastName.trim() || '—'
  const placeholder = (v: string) => v.trim() || '—'

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-omjep-border bg-omjep-bg-panel/95 shadow-[var(--omjep-shadow-md)] ring-1 ring-omjep-border/60"
      aria-label="En-tête profil joueur"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_-10%,color-mix(in_srgb,var(--omjep-mauve)_22%,transparent),transparent_55%),radial-gradient(ellipse_70%_50%_at_100%_0%,color-mix(in_srgb,var(--omjep-cobalt)_18%,transparent),transparent_50%)]"
        aria-hidden
      />
      <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[auto_1fr] lg:items-start lg:gap-8">
        <div className="mx-auto flex shrink-0 justify-center lg:mx-0">{heroAvatar}</div>
        <div className="min-w-0 space-y-4 text-center lg:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
            {showVipBadge ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-omjep-border-gold/50 bg-omjep-gold/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-omjep-gold">
                <Crown className="h-3.5 w-3.5" aria-hidden />
                VIP
              </span>
            ) : null}
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                isPublicProfile
                  ? 'border-omjep-success/45 bg-omjep-success/12 text-omjep-text-primary'
                  : 'border-omjep-border bg-omjep-bg-panel-soft text-omjep-text-secondary'
              }`}
            >
              {isPublicProfile ? 'Profil public' : 'Profil privé'}
            </span>
            <span className="inline-flex items-center rounded-full border border-omjep-cobalt/35 bg-omjep-cobalt/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-omjep-text-primary">
              Niv. {level}
            </span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-omjep-mauve">Identité OMJEP</p>
            <h1 className="mt-1 font-display text-2xl font-black uppercase tracking-tight text-omjep-text-primary sm:text-3xl lg:text-4xl">
              {displayName}
            </h1>
            <p className="mt-1 text-sm font-semibold text-omjep-mauve">@{gamertag}</p>
          </div>
          <div className="grid gap-2 text-xs text-omjep-text-secondary sm:grid-cols-2 sm:gap-x-6 sm:text-[13px]">
            <p>
              <span className="font-semibold text-omjep-text-primary">Prénom · Nom</span>
              <br />
              <span className="text-omjep-text-primary">
                {fn} · {ln}
              </span>
            </p>
            <p>
              <span className="font-semibold text-omjep-text-primary">Plateforme</span>
              <br />
              <span className="text-omjep-text-primary">{platformConsole}</span>
            </p>
            <p>
              <span className="font-semibold text-omjep-text-primary">Nationalité</span>
              <br />
              <span className="text-omjep-text-primary">{nationality}</span>
            </p>
            <p>
              <span className="font-semibold text-omjep-text-primary">Poste</span>
              <br />
              <span className="text-omjep-text-primary">
                {mainPosition}
                {secondaryPositions.length ? ` · ${secondaryPositions.join(' · ')}` : ''}
              </span>
            </p>
            <p className="sm:col-span-2">
              <span className="font-semibold text-omjep-text-primary">Club · Rôle</span>
              <br />
              <span className="text-balance text-omjep-text-primary">
                {clubName} · {roleLabel}
              </span>
            </p>
          </div>
          {tagline.trim() ? (
            <p className="rounded-xl border border-omjep-border/80 bg-omjep-bg-panel-soft/80 px-3 py-2 text-sm text-omjep-text-secondary">
              {tagline}
            </p>
          ) : (
            <p className="rounded-xl border border-dashed border-omjep-border bg-omjep-bg-panel-soft/50 px-3 py-2 text-sm italic text-omjep-text-muted">
              Ajoutez une courte accroche dans vos réglages (bientôt).
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
            <button
              type="button"
              onClick={onEditIdentity}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-omjep-mauve/50 bg-omjep-mauve/18 px-5 py-3 text-xs font-bold uppercase tracking-wide text-omjep-text-primary shadow-sm transition hover:border-omjep-mauve hover:bg-omjep-mauve/28"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-omjep-mauve" aria-hidden />
              Éditer l&apos;identité
            </button>
            <button
              type="button"
              onClick={onTogglePublicProfile}
              aria-pressed={isPublicProfile}
              className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-5 py-3 text-xs font-bold uppercase tracking-wide transition ${
                isPublicProfile
                  ? 'border-omjep-success/45 bg-omjep-success/12 text-omjep-text-primary'
                  : 'border-omjep-border bg-omjep-bg-elevated text-omjep-text-primary hover:border-omjep-mauve/35'
              }`}
            >
              <Shield className="h-4 w-4 shrink-0" aria-hidden />
              Visibilité {isPublicProfile ? 'publique' : 'privée'}
            </button>
            {onShareProfile ? (
              <button
                type="button"
                onClick={onShareProfile}
                className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-5 py-3 text-xs font-bold uppercase tracking-wide transition ${
                  shareCopied
                    ? 'border-omjep-success/45 bg-omjep-success/10 text-omjep-text-primary'
                    : 'border-omjep-border bg-omjep-bg-elevated text-omjep-text-primary hover:border-omjep-mauve/40'
                }`}
              >
                {shareCopied ? 'Lien copié' : 'Partager le profil'}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="relative border-t border-omjep-border/80 bg-omjep-bg-panel-soft/40 px-5 py-5 sm:px-6">
        <header className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-omjep-mauve">Informations générales</p>
          <h2 className="mt-0.5 font-display text-base font-bold text-omjep-text-primary">Fiche détaillée</h2>
        </header>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-omjep-border/80 bg-omjep-bg-panel/90 px-3 py-2.5">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-omjep-text-muted">Prénom</dt>
            <dd className="mt-0.5 font-semibold text-omjep-text-primary">{placeholder(firstName)}</dd>
          </div>
          <div className="rounded-xl border border-omjep-border/80 bg-omjep-bg-panel/90 px-3 py-2.5">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-omjep-text-muted">Nom</dt>
            <dd className="mt-0.5 font-semibold text-omjep-text-primary">{placeholder(lastName)}</dd>
          </div>
          <div className="rounded-xl border border-omjep-border/80 bg-omjep-bg-panel/90 px-3 py-2.5 sm:col-span-2">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-omjep-text-muted">ID EA FC 26 / Persona</dt>
            <dd className="mt-0.5 font-mono text-omjep-text-primary">{placeholder(eaPersonaId)}</dd>
          </div>
          <div className="rounded-xl border border-omjep-border/80 bg-omjep-bg-panel/90 px-3 py-2.5">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-omjep-text-muted">Nationalité</dt>
            <dd className="mt-0.5 font-semibold text-omjep-text-primary">{placeholder(nationality)}</dd>
          </div>
          <div className="rounded-xl border border-omjep-border/80 bg-omjep-bg-panel/90 px-3 py-2.5">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-omjep-text-muted">Position</dt>
            <dd className="mt-0.5 font-semibold text-omjep-text-primary">{placeholder(mainPosition)}</dd>
          </div>
          <div className="rounded-xl border border-omjep-border/80 bg-omjep-bg-panel/90 px-3 py-2.5 sm:col-span-2">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-omjep-text-muted">Plateforme</dt>
            <dd className="mt-0.5 text-omjep-text-primary">{placeholder(platformConsole)}</dd>
          </div>
          <div className="rounded-xl border border-omjep-border/80 bg-omjep-bg-panel/90 px-3 py-2.5 sm:col-span-2">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-omjep-text-muted">Bio / accroche</dt>
            <dd className="mt-0.5 text-omjep-text-secondary">
              {tagline.trim() ? tagline : <span className="italic text-omjep-text-muted">Non renseignée</span>}
            </dd>
          </div>
          <div className="rounded-xl border border-omjep-border/80 bg-omjep-bg-panel/90 px-3 py-2.5 sm:col-span-2">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-omjep-text-muted">Visibilité</dt>
            <dd className="mt-0.5 font-semibold text-omjep-text-primary">
              {isPublicProfile ? 'Public — réseaux visibles selon vos liens' : 'Privé — masquage public prévu'}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

export interface PlayerProClubsStatsSectionProps {
  proClubLevel: number
  overallRating: number
  xp: number
  xpProgressPct: number
  xpProgressText: string
  mainPosition: string
  archetypes: string[]
  stats: Array<{ id: 'PAC' | 'SHO' | 'PAS' | 'DRI' | 'DEF' | 'PHY'; value: number }>
  matches: number | null
  goals: number | null
  assists: number | null
  cleanSheets: number | null
  /** Valeur affichée pour l’ID EA FC 26 (persona) — vide = « À compléter » côté carte sync */
  eaFcPersonaDisplay: string
  /** Clic : scroll vers le champ ID dans la page profil */
  onConfigureEaFcId?: () => void
}

export const PlayerProClubsStatsSection = ({
  proClubLevel,
  overallRating,
  xp,
  xpProgressPct,
  xpProgressText,
  mainPosition,
  archetypes,
  stats,
  matches,
  goals,
  assists,
  cleanSheets,
  eaFcPersonaDisplay,
  onConfigureEaFcId,
}: PlayerProClubsStatsSectionProps) => {
  const fmt = (n: number | null) => (n === null || Number.isNaN(n) ? '—' : String(n))
  const personaTrim = eaFcPersonaDisplay.trim()
  const idLine = personaTrim ? personaTrim : 'À compléter'

  return (
    <section
      className="rounded-2xl border border-omjep-border bg-omjep-bg-panel/90 p-5 shadow-[var(--omjep-shadow-sm)] sm:p-6"
      aria-label="Statistiques Pro Clubs"
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-omjep-border/70 pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-omjep-cobalt">Pro Clubs · EA FC 26</p>
          <h2 className="mt-1 font-display text-lg font-bold text-omjep-text-primary">Attributs & progression</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-omjep-cobalt/40 bg-omjep-cobalt/10 px-3 py-2">
          <Zap className="h-4 w-4 text-omjep-cobalt" aria-hidden />
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-wide text-omjep-text-muted">GEN</p>
            <p className="text-xl font-black tabular-nums text-omjep-text-primary">{overallRating}</p>
          </div>
        </div>
      </header>

      <div
        className="mb-4 rounded-xl border border-[color-mix(in_srgb,var(--omjep-mauve)_32%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-mauve)_8%,var(--omjep-bg-panel-soft))] p-4 ring-1 ring-[color-mix(in_srgb,var(--omjep-gold)_18%,transparent)]"
        role="region"
        aria-label="Synchronisation EA FC 26"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <span className="inline-flex rounded-full border border-[color-mix(in_srgb,var(--omjep-gold)_42%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_12%,transparent)] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-[color-mix(in_srgb,var(--omjep-accent-gold)_95%,var(--omjep-text-primary))]">
              Beta
            </span>
            <p className="font-display text-base font-bold text-omjep-text-primary sm:text-lg">
              Synchronisation EA FC 26 bientôt disponible
            </p>
            <p className="text-xs leading-relaxed text-omjep-text-secondary sm:text-sm">
              La connexion proclubs.io sera activée progressivement pendant la beta. En attendant, complétez votre ID
              EA FC 26, vos liens sociaux et votre espace streamer.
            </p>
          </div>
        </div>
        <dl className="mt-4 grid gap-2 rounded-xl border border-omjep-border/70 bg-omjep-bg-panel/80 p-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="font-bold uppercase tracking-wide text-omjep-text-muted">Connexion</dt>
            <dd className="mt-0.5 font-semibold text-omjep-text-primary">Non connecté</dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wide text-omjep-text-muted">ID EA FC 26</dt>
            <dd className="mt-0.5 break-all font-semibold text-omjep-mauve">{idLine}</dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wide text-omjep-text-muted">Source</dt>
            <dd className="mt-0.5 text-omjep-text-primary">proclubs.io / EA Clubs</dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wide text-omjep-text-muted">Statut</dt>
            <dd className="mt-0.5 text-omjep-text-primary">Beta — sync bientôt disponible</dd>
          </div>
        </dl>
        {onConfigureEaFcId ? (
          <button
            type="button"
            onClick={onConfigureEaFcId}
            className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--omjep-gold)_45%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_12%,#0a0712)] px-4 py-2.5 text-xs font-black uppercase tracking-wide text-[color-mix(in_srgb,var(--omjep-accent-gold)_95%,var(--omjep-text-primary))] shadow-[0_0_14px_color-mix(in_srgb,var(--omjep-gold)_14%,transparent)] transition hover:brightness-110 sm:w-auto"
          >
            Configurer mon ID EA FC 26
          </button>
        ) : null}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-omjep-border bg-omjep-bg-elevated/90 px-3 py-2.5 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wide text-omjep-text-muted">Niv. PC</p>
          <p className="text-lg font-black tabular-nums text-omjep-text-primary">{proClubLevel}</p>
        </div>
        <div className="rounded-xl border border-omjep-border bg-omjep-bg-elevated/90 px-3 py-2.5 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wide text-omjep-text-muted">Matchs</p>
          <p className="text-lg font-black tabular-nums text-omjep-cobalt">{fmt(matches)}</p>
        </div>
        <div className="rounded-xl border border-omjep-border bg-omjep-bg-elevated/90 px-3 py-2.5 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wide text-omjep-text-muted">Buts</p>
          <p className="text-lg font-black tabular-nums text-omjep-cobalt">{fmt(goals)}</p>
        </div>
        <div className="rounded-xl border border-omjep-border bg-omjep-bg-elevated/90 px-3 py-2.5 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wide text-omjep-text-muted">Décis.</p>
          <p className="text-lg font-black tabular-nums text-omjep-cobalt">{fmt(assists)}</p>
        </div>
        <div className="col-span-2 rounded-xl border border-omjep-border bg-omjep-bg-elevated/90 px-3 py-2.5 text-center sm:col-span-4">
          <p className="text-[9px] font-bold uppercase tracking-wide text-omjep-text-muted">Clean sheets</p>
          <p className="text-lg font-black tabular-nums text-omjep-text-primary">{fmt(cleanSheets)}</p>
        </div>
      </div>

      <p className="mb-4 text-center text-[11px] font-medium leading-snug text-omjep-text-muted sm:text-left">
        Données estimées — synchronisation officielle à venir
      </p>

      <div className="mb-5 rounded-xl border border-omjep-border bg-omjep-bg-panel-soft/80 p-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-omjep-text-primary">
            XP: <span className="tabular-nums text-omjep-mauve">{xp.toLocaleString('fr-FR')}</span>
          </p>
          <p className="text-[11px] text-omjep-text-muted">{xpProgressText}</p>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-omjep-bg-elevated ring-1 ring-omjep-border/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-omjep-mauve via-omjep-cobalt to-omjep-gold/90 transition-[width] duration-700"
            style={{ width: `${Math.min(100, Math.max(0, xpProgressPct))}%` }}
            role="progressbar"
            aria-valuenow={Math.round(xpProgressPct)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-2.5">
        {stats.map((s) => (
          <div
            key={s.id}
            className="flex min-h-[4rem] flex-col justify-center rounded-xl border border-omjep-border bg-omjep-bg-elevated/95 px-2 py-2 text-center ring-1 ring-omjep-cobalt/15"
          >
            <p className="text-[10px] font-black uppercase tracking-wide text-omjep-cobalt">{s.id}</p>
            <p className="text-xl font-black tabular-nums text-omjep-text-primary">{s.value}</p>
            <div className="mx-auto mt-1 h-1 w-full max-w-[3rem] overflow-hidden rounded-full bg-omjep-bg-panel-soft">
              <div className="h-full rounded-full bg-omjep-cobalt/80" style={{ width: `${s.value}%` }} />
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-omjep-text-secondary">
        <span className="font-semibold text-omjep-text-primary">Poste préféré Pro Clubs:</span> {mainPosition}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {archetypes.map((a) => (
          <span
            key={a}
            className="inline-flex rounded-full border border-omjep-mauve/40 bg-omjep-mauve/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-omjep-mauve"
          >
            {a}
          </span>
        ))}
      </div>
    </section>
  )
}

const socialIconMap: Record<SocialLinkRow['id'], typeof AtSign> = {
  instagram: AtSign,
  whatsapp: MessageCircle,
  discord: Users,
  youtube: PlayCircle,
  kick: Radio,
}

export interface PlayerSocialLinksSectionProps {
  rows: SocialLinkRow[]
  isPublicProfile: boolean
  onEditSocial?: () => void
  editMode?: boolean
  draft?: {
    instagramUrl: string
    whatsappUrl: string
    discordUrl: string
    youtubeUrl: string
    kickUrl: string
  }
  onDraftChange?: (
    field: 'instagramUrl' | 'whatsappUrl' | 'discordUrl' | 'youtubeUrl' | 'kickUrl',
    value: string,
  ) => void
  onSaveSocial?: () => void
  onCancelSocial?: () => void
  socialSaving?: boolean
  socialError?: string | null
}

export const PlayerSocialLinksSection = ({
  rows,
  isPublicProfile,
  onEditSocial,
  editMode = false,
  draft,
  onDraftChange,
  onSaveSocial,
  onCancelSocial,
  socialSaving = false,
  socialError = null,
}: PlayerSocialLinksSectionProps) => {
  return (
    <section
      className="rounded-2xl border border-omjep-border bg-omjep-bg-panel/90 p-5 shadow-[var(--omjep-shadow-sm)] sm:p-6"
      aria-label="Réseaux sociaux"
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-omjep-border/70 pb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-omjep-mauve">Social</p>
        {!editMode && onEditSocial ? (
          <button
            type="button"
            onClick={onEditSocial}
            className="rounded-lg border border-[color-mix(in_srgb,var(--omjep-mauve)_40%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-mauve)_12%,transparent)] px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-omjep-text-primary transition hover:border-[color-mix(in_srgb,var(--omjep-gold)_45%,var(--omjep-mauve))] hover:bg-[color-mix(in_srgb,var(--omjep-mauve)_18%,transparent)]"
          >
            Modifier
          </button>
        ) : null}
      </header>
      {!isPublicProfile ? (
        <p className="mb-3 rounded-lg border border-omjep-border bg-omjep-bg-panel-soft/80 px-3 py-2 text-xs text-omjep-text-muted">
          Vue publique : les liens sensibles pourront être masqués automatiquement.
        </p>
      ) : null}

      {editMode && draft && onDraftChange && onSaveSocial && onCancelSocial ? (
        <div className="space-y-4">
          {(
            [
              ['instagramUrl', 'Instagram', 'https://instagram.com/… ou @pseudo'],
              ['whatsappUrl', 'WhatsApp', 'Numéro, wa.me/… ou lien'],
              ['discordUrl', 'Discord', 'Pseudo, invite ou lien Discord'],
              ['youtubeUrl', 'YouTube', 'Chaîne ou URL YouTube'],
              ['kickUrl', 'Kick', 'Chaîne ou URL Kick'],
            ] as const
          ).map(([field, label, ph]) => (
            <label key={field} className="block min-w-0">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-omjep-text-muted">
                {label}
              </span>
              <input
                type="text"
                value={draft[field]}
                onChange={(e) => onDraftChange(field, e.target.value)}
                placeholder={ph}
                autoComplete="off"
                className={linkInputClass}
              />
            </label>
          ))}
          {socialError ? (
            <p className="rounded-lg border border-omjep-danger/30 bg-omjep-danger/10 px-3 py-2 text-xs text-omjep-danger">{socialError}</p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancelSocial}
              disabled={socialSaving}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-omjep-border bg-omjep-bg-elevated px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-omjep-text-primary transition hover:border-omjep-mauve/35 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onSaveSocial}
              disabled={socialSaving}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--omjep-gold)_45%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_14%,#0a0712)] px-4 py-2.5 text-xs font-black uppercase tracking-wide text-[color-mix(in_srgb,var(--omjep-accent-gold)_95%,var(--omjep-text-primary))] shadow-[0_0_16px_color-mix(in_srgb,var(--omjep-gold)_18%,transparent)] transition hover:brightness-110 disabled:opacity-50"
            >
              {socialSaving ? 'Enregistrement…' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const Icon = socialIconMap[row.id]
            const showEmpty = row.isEmpty || !row.value.trim()
            return (
              <li
                key={row.id}
                className="flex flex-col gap-1 rounded-xl border border-omjep-border bg-omjep-bg-elevated/85 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="inline-flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-omjep-mauve" aria-hidden />
                  <span className="text-xs font-bold text-omjep-text-primary">{row.label}</span>
                </div>
                <div className="min-w-0 pl-6 sm:max-w-[60%] sm:pl-0 sm:text-right">
                  {showEmpty ? (
                    <span className="text-xs italic text-omjep-text-muted">Non renseigné</span>
                  ) : row.href ? (
                    <a
                      href={row.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 break-all text-xs font-medium text-omjep-mauve hover:underline"
                    >
                      {row.value}
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                    </a>
                  ) : (
                    <span className="break-all text-xs text-omjep-text-secondary">{row.value}</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export interface PlayerCardAndStoreSectionProps {
  playerName: string
  gamertag: string
  level: number
  nationality: string
  mainPosition: string
  clubName: string
  stats: Array<{ id: 'PAC' | 'SHO' | 'PAS' | 'DRI' | 'DEF' | 'PHY'; value: number }>
  equippedCardStyle?: UserCardStyle
  storePlayerCardsHref: string
  storeCosmeticsHref: string
  activeBannerUrl?: string | null
  activeFrameUrl?: string | null
  activeEffectLabel?: string
  showVipBadge: boolean
}

export const PlayerCardAndStoreSection = ({
  playerName,
  gamertag,
  level: omjepLevel,
  nationality,
  mainPosition,
  clubName,
  stats,
  equippedCardStyle,
  storePlayerCardsHref,
  storeCosmeticsHref,
  activeBannerUrl,
  activeFrameUrl,
  activeEffectLabel,
  showVipBadge,
}: PlayerCardAndStoreSectionProps) => {
  const selectedStyleName = equippedCardStyle?.name ?? 'Carbon Standard'
  const selectedRarity: PlayerCardStoreRarity = equippedCardStyle?.rarity ?? 'COMMON'
  const selectedCardImage = equippedCardStyle?.imageUrl ?? '/assets/card-shell-non-rare.svg'
  const badgeClass = playerCardRarityBadgeClass[selectedRarity]
  const frameClass = playerCardRarityFrameClass[selectedRarity]
  const storeState = readPlayerCardStoreState()
  const previewStyles = PLAYER_CARD_MOCK_CATALOG.filter((c) => c.rarity !== 'COMMON').slice(0, 3)

  const overall = Math.min(
    99,
    Math.round(stats.reduce((acc, s) => acc + s.value, 0) / Math.max(stats.length, 1)),
  )

  const rarityGlow =
    selectedRarity === 'LEGENDARY' || selectedRarity === 'EPIC'
      ? 'shadow-[0_0_40px_-8px_color-mix(in_srgb,var(--omjep-gold)_35%,transparent)]'
      : 'shadow-[var(--omjep-shadow-md)]'

  return (
    <section
      className={`rounded-2xl border p-5 sm:p-6 ${
        selectedRarity === 'EPIC' || selectedRarity === 'LEGENDARY'
          ? 'border-omjep-border-gold/45 bg-gradient-to-br from-omjep-bg-panel/95 via-omjep-bg-panel/90 to-omjep-mauve/[0.06] ring-1 ring-omjep-border-gold/25'
          : 'border-omjep-border bg-omjep-bg-panel/95 ring-1 ring-omjep-border/80'
      }`}
      aria-label="Carte joueur et boutique"
    >
      <header className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-omjep-mauve">Vitrine carte</p>
          <h2 className="font-display text-lg font-bold text-omjep-text-primary">Mon style FUT</h2>
        </div>
        {showVipBadge ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-omjep-border-gold/45 bg-omjep-gold/12 px-2 py-1 text-[9px] font-black uppercase text-omjep-gold">
            <Crown className="h-3 w-3" aria-hidden />
            Event
          </span>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,220px)_1fr] lg:items-start">
        <div className="mx-auto w-full max-w-[200px] lg:mx-0">
          <div className={`relative overflow-hidden rounded-2xl ${frameClass} ${rarityGlow}`}>
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />
            <img src={selectedCardImage} alt="" className="relative z-[1] h-auto w-full object-contain p-1" />
            <div className="absolute left-2 top-2 z-[2] flex flex-col gap-0.5">
              <span className="rounded-md border border-omjep-border bg-omjep-bg-panel/95 px-1.5 py-0.5 text-lg font-black tabular-nums text-omjep-text-primary">
                {overall}
              </span>
              <span className="rounded border border-omjep-cobalt/40 bg-omjep-cobalt/15 px-1.5 py-0.5 text-center text-[9px] font-bold text-omjep-text-primary">
                LV {omjepLevel}
              </span>
              <span className="rounded border border-omjep-cobalt/40 bg-omjep-cobalt/15 px-1.5 py-0.5 text-center text-[10px] font-black text-omjep-text-primary">
                {mainPosition}
              </span>
            </div>
            <div className="absolute bottom-2 left-2 right-2 z-[2] rounded-lg border border-omjep-border/80 bg-omjep-bg-panel/92 px-2 py-1.5 backdrop-blur-sm">
              <p className="truncate text-center text-[11px] font-black uppercase text-omjep-text-primary">{playerName}</p>
              <p className="truncate text-center text-[9px] text-omjep-text-muted">@{gamertag}</p>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-3">
          <div className="grid grid-cols-6 gap-1.5">
            {stats.map((s) => (
              <div key={s.id} className="rounded-lg border border-omjep-border bg-omjep-bg-elevated/90 py-1.5 text-center">
                <p className="text-[8px] font-black text-omjep-cobalt">{s.id}</p>
                <p className="text-sm font-black tabular-nums text-omjep-text-primary">{s.value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-omjep-text-secondary">
            <span className="font-semibold text-omjep-text-primary">Club:</span> {clubName} ·{' '}
            <span className="font-semibold text-omjep-text-primary">Pays:</span> {nationality}
          </p>
          <p className="text-xs text-omjep-text-secondary">
            <span className="font-semibold text-omjep-text-primary">Rareté:</span>{' '}
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${badgeClass}`}>
              {playerCardRarityLabel[selectedRarity]}
            </span>
            {' · '}
            <span className="font-semibold text-omjep-text-primary">Style actif:</span> {selectedStyleName}
          </p>
          <p className="text-[11px] text-omjep-text-muted">
            <span className="font-semibold text-omjep-text-primary">Effet:</span>{' '}
            {activeEffectLabel ?? equippedCardStyle?.cssEffect ?? 'Standard'}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              to={storePlayerCardsHref}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border-2 border-omjep-mauve/50 bg-omjep-mauve px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-white shadow-[var(--omjep-glow-mauve-soft)] transition hover:brightness-110"
            >
              Personnaliser ma carte
            </Link>
            <Link
              to={storePlayerCardsHref}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-omjep-border bg-omjep-bg-elevated px-4 py-3 text-xs font-bold uppercase tracking-wide text-omjep-text-primary transition hover:border-omjep-mauve/40"
            >
              Boutique cartes
            </Link>
            <Link
              to={
                storePlayerCardsHref.includes('?')
                  ? `${storePlayerCardsHref}&highlight=premium`
                  : `${storePlayerCardsHref}?highlight=premium`
              }
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-omjep-border-gold/40 bg-omjep-gold/10 px-4 py-3 text-xs font-bold uppercase tracking-wide text-omjep-gold transition hover:bg-omjep-gold/16"
            >
              Voir styles premium
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-omjep-border bg-omjep-bg-panel-soft/70 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-omjep-mauve">Équipement visuel</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          <li className="rounded-lg border border-omjep-border/80 bg-omjep-bg-elevated/80 px-3 py-2 text-xs">
            <span className="text-omjep-text-muted">Style carte</span>
            <p className="font-semibold text-omjep-text-primary">{selectedStyleName}</p>
          </li>
          <li className="rounded-lg border border-omjep-border/80 bg-omjep-bg-elevated/80 px-3 py-2 text-xs">
            <span className="text-omjep-text-muted">Cadre avatar</span>
            <p className="font-semibold text-omjep-text-primary">{activeFrameUrl ? 'Cadre boutique' : 'Royal Eagle'}</p>
          </li>
          <li className="rounded-lg border border-omjep-border/80 bg-omjep-bg-elevated/80 px-3 py-2 text-xs">
            <span className="text-omjep-text-muted">Bannière</span>
            <p className="font-semibold text-omjep-text-primary">{activeBannerUrl ? 'Active' : 'Non définie'}</p>
          </li>
          <li className="rounded-lg border border-omjep-border/80 bg-omjep-bg-elevated/80 px-3 py-2 text-xs">
            <span className="text-omjep-text-muted">Badge / effet</span>
            <p className="font-semibold text-omjep-text-primary">
              {showVipBadge ? 'VIP' : '—'} · {activeEffectLabel ?? '—'}
            </p>
          </li>
        </ul>
      </div>

      <div className="mt-4 rounded-xl border border-omjep-border bg-omjep-bg-panel-soft/60 p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-omjep-text-muted">Aperçu styles premium (JPY)</p>
          <span className="text-[10px] font-mono text-omjep-text-secondary">Solde JPY mock: {storeState.jpyBalance.toLocaleString('fr-FR')}</span>
        </div>
        <ul className="space-y-2">
          {previewStyles.map((item) => {
            const owned = storeState.inventoryIds.includes(item.id)
            const active = storeState.activeId === item.id
            let stateLabel = 'Acheter'
            if (active) stateLabel = 'Actif'
            else if (owned) stateLabel = 'Possédé'
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-omjep-border bg-omjep-bg-elevated/90 px-3 py-2"
              >
                <span className="text-xs font-semibold text-omjep-text-primary">{item.name}</span>
                <span className="text-[11px] font-bold text-omjep-gold">{item.priceJpy.toLocaleString('fr-FR')} JPY</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                    active
                      ? 'border-omjep-success/45 bg-omjep-success/12 text-omjep-text-primary'
                      : owned
                        ? 'border-omjep-mauve/40 bg-omjep-mauve/10 text-omjep-mauve'
                        : 'border-omjep-border text-omjep-text-muted'
                  }`}
                >
                  {stateLabel}
                </span>
              </li>
            )
          })}
        </ul>
        <p className="mt-2 text-[10px] text-omjep-text-muted">
          Les cosmétiques carte sont en <span className="font-semibold text-omjep-mauve">JPY</span>. L&apos;économie match
          (OC) reste distincte.
        </p>
        <Link
          to={storeCosmeticsHref}
          className="mt-3 inline-block text-[11px] font-semibold text-omjep-mauve underline-offset-2 hover:underline"
        >
          Cadres &amp; bannières (cosmétiques)
        </Link>
      </div>
    </section>
  )
}

export interface PlayerStreamerCreatorSectionProps {
  creator: CreatorProfileBundle
  onConfigure: () => void
  editMode?: boolean
  draft?: {
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
}

function externalHref(v: string): string | null {
  const t = v.trim()
  if (!t) return null
  return /^https?:\/\//i.test(t) ? t : null
}

export const PlayerStreamerCreatorSection = ({
  creator,
  onConfigure,
  editMode = false,
  draft,
  onStreamerDraftChange,
  onSaveStreamer,
  onCancelStreamer,
  streamerSaving = false,
  streamerError = null,
}: PlayerStreamerCreatorSectionProps) => {
  const hasAny =
    creator.youtubeUrl.trim() ||
    creator.kickUrl.trim() ||
    creator.discordUrl.trim() ||
    creator.streamUrl.trim() ||
    creator.latestVideoUrl.trim() ||
    creator.latestLiveUrl.trim()

  const renderValue = (value: string) => {
    const t = value.trim()
    if (!t) {
      return <span className="italic text-omjep-text-muted">Non renseigné</span>
    }
    const href = externalHref(t)
    if (href) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full items-center gap-1 truncate text-sm font-semibold text-omjep-mauve hover:underline"
        >
          <span className="truncate">{t}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        </a>
      )
    }
    return <span className="break-all text-sm font-semibold text-omjep-text-primary">{t}</span>
  }

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-omjep-border-gold/35 bg-omjep-bg-panel/95 p-5 shadow-[var(--omjep-shadow-md)] ring-1 ring-omjep-border-gold/20 sm:p-6"
      aria-label="Espace streamer"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--omjep-gold)_22%,transparent),transparent_70%)] blur-2xl"
        aria-hidden
      />
      <div className="relative">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-omjep-border-gold/40 bg-omjep-gold/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-omjep-gold">
          <Tv className="h-3.5 w-3.5" aria-hidden />
          Streamer / Créateur
        </div>
        <h2 className="font-display text-lg font-bold text-omjep-text-primary">Votre vitrine contenu</h2>
        <p className="mt-1 text-sm text-omjep-text-secondary">
          Chaînes, communauté et liens stream — synchronisés avec la section Social pour YouTube, Kick et Discord.
        </p>

        {editMode && draft && onStreamerDraftChange && onSaveStreamer && onCancelStreamer ? (
          <div className="mt-4 space-y-4">
            {(
              [
                ['youtubeUrl', 'YouTube', 'URL ou handle chaîne YouTube'],
                ['kickUrl', 'Kick', 'URL ou chaîne Kick'],
                ['discordUrl', 'Discord', 'Communauté / invite / pseudo'],
                ['streamUrl', 'Stream principal', 'Lien multistream ou page officielle'],
                ['latestVideoUrl', 'Dernière vidéo', 'Lien direct vers la dernière vidéo'],
                ['latestLiveUrl', 'Dernier live', 'Replay ou lien du dernier live'],
              ] as const
            ).map(([field, label, ph]) => (
              <label key={field} className="block min-w-0">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-omjep-text-muted">
                  {label}
                </span>
                <input
                  type="text"
                  value={draft[field]}
                  onChange={(e) => onStreamerDraftChange(field, e.target.value)}
                  placeholder={ph}
                  autoComplete="off"
                  className={linkInputClass}
                />
              </label>
            ))}
            {streamerError ? (
              <p className="rounded-lg border border-omjep-danger/30 bg-omjep-danger/10 px-3 py-2 text-xs text-omjep-danger">{streamerError}</p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancelStreamer}
                disabled={streamerSaving}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-omjep-border bg-omjep-bg-elevated px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-omjep-text-primary transition hover:border-omjep-mauve/35 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={onSaveStreamer}
                disabled={streamerSaving}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--omjep-gold)_45%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_14%,#0a0712)] px-4 py-2.5 text-xs font-black uppercase tracking-wide text-[color-mix(in_srgb,var(--omjep-accent-gold)_95%,var(--omjep-text-primary))] shadow-[0_0_16px_color-mix(in_srgb,var(--omjep-gold)_18%,transparent)] transition hover:brightness-110 disabled:opacity-50"
              >
                {streamerSaving ? 'Enregistrement…' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              <li className="rounded-xl border border-omjep-border bg-omjep-bg-elevated/90 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase text-omjep-text-muted">YouTube</p>
                <div className="mt-1 min-w-0">{renderValue(creator.youtubeUrl)}</div>
              </li>
              <li className="rounded-xl border border-omjep-border bg-omjep-bg-elevated/90 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase text-omjep-text-muted">Kick</p>
                <div className="mt-1 min-w-0">{renderValue(creator.kickUrl)}</div>
              </li>
              <li className="rounded-xl border border-omjep-border bg-omjep-bg-elevated/90 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase text-omjep-text-muted">Discord</p>
                <div className="mt-1 min-w-0">{renderValue(creator.discordUrl)}</div>
              </li>
              <li className="rounded-xl border border-omjep-border bg-omjep-bg-elevated/90 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase text-omjep-text-muted">Stream principal</p>
                <div className="mt-1 min-w-0">{renderValue(creator.streamUrl)}</div>
              </li>
            </ul>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-dashed border-omjep-border bg-omjep-bg-panel-soft/60 px-3 py-3">
                <p className="text-[10px] font-bold uppercase text-omjep-text-muted">Dernière vidéo</p>
                <div className="mt-1 min-w-0">{renderValue(creator.latestVideoUrl)}</div>
              </div>
              <div className="rounded-xl border border-dashed border-omjep-border bg-omjep-bg-panel-soft/60 px-3 py-3">
                <p className="text-[10px] font-bold uppercase text-omjep-text-muted">Dernier live</p>
                <div className="mt-1 min-w-0">{renderValue(creator.latestLiveUrl)}</div>
              </div>
            </div>

            {!hasAny ? (
              <p className="mt-3 text-xs text-omjep-text-muted">
                Ajoutez vos liens pour afficher votre vitrine créateur sur votre profil public.
              </p>
            ) : null}

            <button
              type="button"
              onClick={onConfigure}
              className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-omjep-border-gold/45 bg-omjep-gold/12 px-4 py-3 text-xs font-black uppercase tracking-wide text-omjep-gold transition hover:bg-omjep-gold/18 sm:w-auto"
            >
              Configurer espace streamer
            </button>
          </>
        )}
      </div>
    </section>
  )
}
