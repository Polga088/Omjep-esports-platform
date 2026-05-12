import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Calendar,
  ChevronRight,
  Circle,
  Crown,
  Newspaper,
  Radio,
  Shield,
  Sparkles,
  Wallet,
} from 'lucide-react'
import type { User } from '@/store/useAuthStore'
import { formatCurrency } from '@/utils/formatCurrency'

interface ScheduleTeamBrief {
  id: string
  name: string
  logo_url: string | null
}

export interface CockpitScheduleMatch {
  id: string
  status: string
  round: string | null
  startTime: string | null
  played_at: string | null
  home_team_id: string
  away_team_id: string
  homeTeam: ScheduleTeamBrief
  awayTeam: ScheduleTeamBrief
  competition: { id: string; name: string; type: string } | null
  viewer_team_id: string | null
}

interface NewsEvent {
  id: string
  type: 'TRANSFER' | 'CONTRACT_RENEWAL' | 'TOURNAMENT_WIN' | 'SEASON_START' | 'RECORD_BROKEN' | 'OTHER'
  title: string
  description: string
  metadata: { playerName?: string; transferFee?: number; timestamp: string } | null
  created_at: string
}

interface TeamTotals {
  goals: number
  assists: number
  averageAmr: number
}

export interface CockpitPriorityAction {
  key: string
  title: string
  text: string
  ctaLabel: string
  ctaTo: string
  icon: LucideIcon
}

export interface CockpitCommandModulesProps {
  loading: boolean
  user: User | null
  dataTotals: TeamTotals | null
  scheduleMatchCount: number
  news: NewsEvent[]
  nextMatch: CockpitScheduleMatch | null
  nextKickoff: { date: string; time: string; tbd: boolean } | null
  nextOpponent: ScheduleTeamBrief | null
  myClubName: string | null
  hasClub: boolean
  roleLabel: string
  level: number
  xp: number
  xpPct: number
  oc: number
  jepy: number
  reservedOc: number | null
  playerRarityLabel: string
  priorities: CockpitPriorityAction[]
}

const shell =
  'group relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--omjep-gold)_24%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-bg-panel)_86%,#06030f)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--omjep-mauve)_14%,transparent),var(--omjep-shadow-md)] ring-1 ring-[color-mix(in_srgb,var(--omjep-border)_40%,transparent)] backdrop-blur-xl transition-[transform,box-shadow,border-color] duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-[color-mix(in_srgb,var(--omjep-mauve)_38%,var(--omjep-gold))] motion-safe:hover:shadow-[0_0_32px_color-mix(in_srgb,var(--omjep-mauve)_22%,transparent),var(--omjep-shadow-lg)]'

const shellGlow =
  'pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--omjep-mauve)_28%,transparent),transparent_70%)] opacity-70 motion-reduce:opacity-40'

function mercatoFeedChip(type: NewsEvent['type']): 'INFO' | 'OFFRE' | 'SIGNATURE' | 'SYSTÈME' {
  if (type === 'TRANSFER') return 'SIGNATURE'
  if (type === 'CONTRACT_RENEWAL') return 'OFFRE'
  if (type === 'TOURNAMENT_WIN' || type === 'SEASON_START' || type === 'RECORD_BROKEN') return 'INFO'
  return 'SYSTÈME'
}

function CockpitSectionHeader() {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--omjep-mauve)_30%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-bg-panel)_78%,#050818)] p-5 shadow-[var(--omjep-shadow-md)] ring-1 ring-[color-mix(in_srgb,var(--omjep-border)_45%,transparent)] backdrop-blur-xl sm:p-6">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--omjep-mauve)_65%,var(--omjep-gold))] to-transparent opacity-90"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_12%_-20%,color-mix(in_srgb,var(--omjep-mauve)_18%,transparent),transparent_55%)]" aria-hidden />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-heading text-[10px] font-extrabold uppercase tracking-[0.28em] text-[color-mix(in_srgb,var(--omjep-gold)_70%,var(--omjep-text-muted))]">
            Command center
          </p>
          <h2 className="mt-1 font-heading text-xl font-black tracking-tight text-omjep-text-primary sm:text-2xl">
            Modules cockpit
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-omjep-text-secondary sm:text-[15px]">
            Votre centre de pilotage pour suivre la saison, vos priorités et votre progression OMJEP.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--omjep-gold)_38%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_10%,var(--omjep-bg-panel-soft))] px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--omjep-accent-gold)_95%,var(--omjep-text-primary))]">
            <Sparkles className="h-3 w-3" aria-hidden />
            Synchronisé
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--omjep-mauve)_35%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-mauve)_12%,transparent)] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-omjep-text-primary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color-mix(in_srgb,var(--omjep-mauve)_55%,transparent)] opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-omjep-mauve shadow-[0_0_10px_var(--omjep-mauve)]" />
            </span>
            Live cockpit
          </span>
        </div>
      </div>
    </header>
  )
}

function ModuleSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative min-h-[200px] overflow-hidden rounded-2xl border border-omjep-border/60 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_75%,#040210)] ${className}`.trim()}
    >
      <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_40%,color-mix(in_srgb,white_6%,transparent)_50%,transparent_60%)] motion-safe:animate-[pulse_2.2s_ease-in-out_infinite] motion-reduce:animate-none" aria-hidden />
      <div className="p-5">
        <div className="h-3 w-1/3 rounded-md bg-omjep-bg-panel-soft" />
        <div className="mt-4 h-8 w-2/3 rounded-lg bg-omjep-bg-panel-soft/80" />
        <div className="mt-6 h-2 w-full rounded bg-omjep-border/50" />
        <div className="mt-2 h-2 w-4/5 rounded bg-omjep-border/40" />
      </div>
    </div>
  )
}

function DecorativeSparkline() {
  return (
    <svg viewBox="0 0 120 36" className="h-9 w-full text-[color-mix(in_srgb,var(--omjep-mauve)_55%,transparent)]" aria-hidden>
      <defs>
        <linearGradient id="cockpit-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--omjep-mauve)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--omjep-mauve)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 28 L12 22 L28 26 L44 14 L60 18 L76 8 L92 12 L108 4 L120 10 L120 36 L0 36 Z"
        fill="url(#cockpit-spark-fill)"
        className="motion-safe:opacity-90"
      />
      <path
        d="M0 28 L12 22 L28 26 L44 14 L60 18 L76 8 L92 12 L108 4 L120 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-[color-mix(in_srgb,var(--omjep-gold)_45%,var(--omjep-mauve))]"
      />
    </svg>
  )
}

function PerformanceModule({
  level,
  xp,
  xpPct,
  scheduleMatchCount,
  dataTotals,
}: Pick<CockpitCommandModulesProps, 'level' | 'xp' | 'xpPct' | 'scheduleMatchCount' | 'dataTotals'>) {
  const influenceScore = level * 100 + xpPct
  const goals = dataTotals?.goals ?? 0
  const hasTeamStats = dataTotals !== null

  return (
    <article className={`${shell} lg:col-span-4`}>
      <div className={shellGlow} aria-hidden />
      <div className="relative flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-omjep-text-muted">Performance</p>
            <p className="mt-1 font-heading text-lg font-black text-omjep-text-primary">Influence & XP</p>
          </div>
          <span className="rounded-lg border border-[color-mix(in_srgb,var(--omjep-gold)_35%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_10%,transparent)] px-2 py-1 text-[10px] font-black tabular-nums text-[color-mix(in_srgb,var(--omjep-accent-gold)_95%,var(--omjep-text-primary))]">
            LVL {level}
          </span>
        </div>

        <div className="mt-5 flex items-end justify-between gap-2 border-b border-[color-mix(in_srgb,var(--omjep-border)_55%,transparent)] pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-omjep-text-muted">Score influence</p>
            <p className="font-mono text-2xl font-black tabular-nums text-omjep-text-primary">{influenceScore.toLocaleString('fr-FR')}</p>
          </div>
          <Crown className="h-6 w-6 shrink-0 text-[color-mix(in_srgb,var(--omjep-gold)_85%,var(--omjep-mauve))]" aria-hidden />
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-omjep-text-muted">
            <span>Progression XP</span>
            <span className="font-mono text-omjep-text-secondary">{xpPct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--omjep-bg-panel-soft)_90%,var(--omjep-border))] ring-1 ring-[color-mix(in_srgb,var(--omjep-mauve)_20%,transparent)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-omjep-mauve via-[color-mix(in_srgb,var(--omjep-mauve)_70%,var(--omjep-gold))] to-[color-mix(in_srgb,var(--omjep-gold)_75%,var(--omjep-mauve))] shadow-[0_0_12px_color-mix(in_srgb,var(--omjep-mauve)_45%,transparent)] transition-[width] duration-500"
              style={{ width: `${xpPct}%` }}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--omjep-mauve)_22%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-mauve)_8%,var(--omjep-bg-panel-soft))] px-2 py-2.5 text-center">
            <p className="text-[9px] font-bold uppercase tracking-wider text-omjep-text-muted">XP</p>
            <p className="mt-0.5 font-mono text-sm font-black tabular-nums text-omjep-text-primary">{xp.toLocaleString('fr-FR')}</p>
          </div>
          <div className="rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft/80 px-2 py-2.5 text-center">
            <p className="text-[9px] font-bold uppercase tracking-wider text-omjep-text-muted">Matchs</p>
            <p className="mt-0.5 font-mono text-sm font-black tabular-nums text-omjep-text-primary">{scheduleMatchCount}</p>
          </div>
          <div className="rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft/80 px-2 py-2.5 text-center">
            <p className="text-[9px] font-bold uppercase tracking-wider text-omjep-text-muted">Club</p>
            <p className="mt-0.5 font-mono text-xs font-black tabular-nums leading-tight text-omjep-mauve">{hasTeamStats ? goals : '—'}</p>
            <p className="text-[8px] font-semibold uppercase tracking-wide text-omjep-text-muted">buts</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--omjep-border)_60%,transparent)] bg-[color-mix(in_srgb,#05020c_40%,var(--omjep-bg-panel-soft))] p-2">
          <DecorativeSparkline />
        </div>
      </div>
    </article>
  )
}

function rarityStyles(r: string) {
  const u = r.toUpperCase()
  if (u.includes('LEGEND')) {
    return 'border-[color-mix(in_srgb,var(--omjep-gold)_55%,#f59e0b)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--omjep-gold)_22%,transparent),color-mix(in_srgb,var(--omjep-mauve)_12%,transparent))] text-[color-mix(in_srgb,var(--omjep-accent-gold)_95%,white)]'
  }
  if (u.includes('PREMIUM')) {
    return 'border-[color-mix(in_srgb,var(--omjep-mauve)_50%,var(--omjep-gold))] bg-[color-mix(in_srgb,var(--omjep-mauve)_14%,transparent)] text-indigo-100'
  }
  return 'border-omjep-border/70 bg-omjep-bg-panel-soft/80 text-omjep-text-secondary'
}

function PlayerPassModule({
  user,
  roleLabel,
  hasClub,
  myClubName,
  playerRarityLabel,
}: Pick<CockpitCommandModulesProps, 'user' | 'roleLabel' | 'hasClub' | 'myClubName' | 'playerRarityLabel'>) {
  const display = (user?.ea_persona_name?.trim() || user?.email || 'Joueur').trim()
  const initial = (display.charAt(0) || 'U').toUpperCase()

  return (
    <article className={`${shell} lg:col-span-4`}>
      <div className={shellGlow} aria-hidden />
      <div className="relative flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-omjep-text-muted">Identité</p>
          <span className="rounded-md border border-[color-mix(in_srgb,var(--omjep-mauve)_35%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-mauve)_12%,transparent)] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-omjep-text-primary">
            Profil joueur
          </span>
        </div>
        <p className="mt-1 font-heading text-lg font-black text-omjep-text-primary">Player Pass</p>

        <div className="mt-5 flex gap-4">
          <div className="relative shrink-0">
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-[color-mix(in_srgb,var(--omjep-gold)_50%,transparent)] via-transparent to-[color-mix(in_srgb,var(--omjep-mauve)_45%,transparent)] opacity-80 motion-reduce:opacity-50" aria-hidden />
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="relative h-16 w-16 rounded-2xl border border-omjep-border/80 object-cover shadow-[var(--omjep-shadow-md)]"
              />
            ) : (
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-omjep-border/80 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_90%,#0a0618)] font-heading text-xl font-black text-omjep-text-primary shadow-[var(--omjep-shadow-md)]">
                {initial}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-lg font-black tracking-tight text-omjep-text-primary">{display}</p>
            <p className="mt-1 text-xs text-omjep-text-secondary">
              Rôle : <span className="font-semibold text-omjep-text-primary">{roleLabel}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${rarityStyles(playerRarityLabel)}`}>
                {playerRarityLabel}
              </span>
              {user?.activeJerseyId ? (
                <span className="rounded-full border border-omjep-border/60 bg-omjep-bg-panel-soft/80 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-omjep-text-muted">
                  Maillot actif
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-[color-mix(in_srgb,var(--omjep-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--omjep-bg-panel-soft)_70%,transparent)] px-4 py-3">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-omjep-text-muted">Club actif</p>
          <p className="mt-1 text-sm font-bold text-omjep-text-primary">
            {hasClub ? myClubName ?? 'Rattaché à un club OMJEP' : 'Aucun club — complétez votre affiliation'}
          </p>
        </div>

        <div className="mt-auto flex pt-5">
          <Link
            to="/dashboard/profile"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--omjep-mauve)_35%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-mauve)_12%,var(--omjep-bg-panel-soft))] py-2.5 text-sm font-semibold text-omjep-text-primary transition hover:border-[color-mix(in_srgb,var(--omjep-gold)_40%,var(--omjep-mauve))] hover:bg-[color-mix(in_srgb,var(--omjep-mauve)_18%,var(--omjep-bg-panel-soft))]"
          >
            Voir profil
            <ChevronRight className="h-4 w-4 opacity-70" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  )
}

function WalletModule({ oc, jepy, reservedOc }: Pick<CockpitCommandModulesProps, 'oc' | 'jepy' | 'reservedOc'>) {
  return (
    <article className={`${shell} lg:col-span-4`}>
      <div className={shellGlow} aria-hidden />
      <div className="relative flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-[color-mix(in_srgb,var(--omjep-gold)_90%,var(--omjep-mauve))]" aria-hidden />
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-omjep-text-muted">Économie</p>
          </div>
          <Shield className="h-4 w-4 text-omjep-mauve/80" aria-hidden />
        </div>
        <p className="mt-1 font-heading text-lg font-black text-omjep-text-primary">Wallet OMJEP</p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--omjep-gold)_42%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_10%,#0a0712)] p-3 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--omjep-gold)_15%,transparent)]">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[color-mix(in_srgb,var(--omjep-accent-gold)_90%,var(--omjep-text-muted))]">OC</p>
            <p className="mt-1 font-mono text-xl font-black tabular-nums text-omjep-text-primary">{formatCurrency(oc, 'OC')}</p>
            <p className="mt-1 text-[10px] text-omjep-text-muted">Omjep Coins</p>
          </div>
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--omjep-mauve)_40%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-mauve)_12%,#07051a)] p-3 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--omjep-mauve)_18%,transparent)]">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-200/90">Jepy</p>
            <p className="mt-1 font-mono text-xl font-black tabular-nums text-indigo-100">{formatCurrency(jepy, 'Jepy')}</p>
            <p className="mt-1 text-[10px] text-omjep-text-muted">Crédits progression</p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-omjep-border/65 bg-omjep-bg-panel-soft/70 px-3 py-2.5">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-omjep-text-muted">OC réservé</p>
          <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-omjep-text-primary">
            {reservedOc !== null ? formatCurrency(reservedOc, 'OC') : '—'}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            to="/dashboard/store"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--omjep-gold)_35%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_8%,var(--omjep-bg-panel-soft))] py-2.5 text-xs font-bold text-omjep-text-primary transition hover:brightness-110"
          >
            Boutique
          </Link>
          <Link
            to="/dashboard/transfers"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--omjep-mauve)_38%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-mauve)_10%,var(--omjep-bg-panel-soft))] py-2.5 text-xs font-bold text-omjep-text-primary transition hover:brightness-110"
          >
            Mercato
          </Link>
        </div>
      </div>
    </article>
  )
}

function NextMatchModule({
  nextMatch,
  nextKickoff,
  nextOpponent,
}: Pick<CockpitCommandModulesProps, 'nextMatch' | 'nextKickoff' | 'nextOpponent'>) {
  const empty = !nextMatch || !nextKickoff

  return (
    <article className={`${shell} min-h-[280px] lg:col-span-5`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_0%,color-mix(in_srgb,var(--omjep-mauve)_16%,transparent),transparent_55%)]" aria-hidden />
      <div className="relative flex h-full min-h-[260px] flex-1 flex-col p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-omjep-text-muted">
              <Activity className="h-3.5 w-3.5 text-omjep-mauve" aria-hidden />
              Next operation
            </p>
            <p className="mt-1 font-heading text-xl font-black text-omjep-text-primary">Prochain match</p>
          </div>
          {nextMatch?.competition?.name ? (
            <span className="max-w-[min(100%,200px)] truncate rounded-lg border border-[color-mix(in_srgb,var(--omjep-gold)_40%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_10%,transparent)] px-2.5 py-1 text-center text-[10px] font-black uppercase tracking-wide text-[color-mix(in_srgb,var(--omjep-accent-gold)_95%,var(--omjep-text-primary))]">
              {nextMatch.competition.name}
            </span>
          ) : null}
        </div>

        {empty ? (
          <div className="mt-6 flex flex-1 flex-col items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--omjep-mauve)_25%,var(--omjep-border))] bg-[color-mix(in_srgb,#05020f_65%,var(--omjep-bg-panel-soft))] px-4 py-10 text-center ring-1 ring-[color-mix(in_srgb,var(--omjep-border)_40%,transparent)]">
            <Calendar className="mb-3 h-10 w-10 text-[color-mix(in_srgb,var(--omjep-gold)_85%,var(--omjep-mauve))]" aria-hidden />
            <p className="font-heading text-base font-bold text-omjep-text-primary">Aucun rendez-vous planifié pour le moment</p>
            <p className="mt-2 max-w-md text-sm text-omjep-text-secondary">
              Dès qu’un match vous est assigné, il apparaîtra ici avec le statut officiel et le lien vers le calendrier.
            </p>
            <Link
              to="/dashboard/schedule"
              className="omjep-btn-secondary mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold normal-case tracking-normal"
            >
              Voir le calendrier
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-1 flex-col justify-center">
              <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <p className="truncate font-heading text-lg font-black text-omjep-text-primary sm:text-xl">{nextMatch!.homeTeam.name}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-omjep-text-muted">Domicile</p>
                </div>
                <div className="flex shrink-0 flex-col items-center px-2">
                  <span className="rounded-full border border-[color-mix(in_srgb,var(--omjep-mauve)_45%,var(--omjep-gold))] bg-[color-mix(in_srgb,var(--omjep-mauve)_15%,#0a0618)] px-4 py-2 font-heading text-sm font-black tracking-[0.2em] text-white shadow-[0_0_20px_color-mix(in_srgb,var(--omjep-mauve)_35%,transparent)]">
                    VS
                  </span>
                  <span className="mt-2 rounded-md border border-omjep-border/60 bg-omjep-bg-panel-soft/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-omjep-text-muted">
                    {nextMatch!.status}
                  </span>
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-right">
                  <p className="truncate font-heading text-lg font-black text-omjep-text-primary sm:text-xl">{nextMatch!.awayTeam.name}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-omjep-text-muted">Extérieur</p>
                </div>
              </div>
              <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--omjep-mauve)_45%,var(--omjep-gold))] to-transparent opacity-80" aria-hidden />
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-omjep-text-secondary">
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-omjep-gold/85" aria-hidden />
                  <span className="font-semibold text-omjep-text-primary">
                    {nextKickoff!.tbd ? 'À planifier' : `${nextKickoff!.date} · ${nextKickoff!.time || ''}`}
                  </span>
                </span>
                {nextOpponent?.name ? (
                  <span className="inline-flex items-center gap-2">
                    <Circle className="h-3 w-3 fill-omjep-mauve text-omjep-mauve" aria-hidden />
                    <span>
                      Prochain adversaire : <span className="font-bold text-omjep-text-primary">{nextOpponent.name}</span>
                    </span>
                  </span>
                ) : null}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link to="/dashboard/schedule" className="omjep-btn-primary inline-flex flex-1 min-w-[140px] items-center justify-center gap-2 py-2.5 text-sm font-semibold normal-case tracking-normal sm:flex-none">
                Voir calendrier
              </Link>
              <Link
                to="/dashboard/matches"
                className="inline-flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-xl border border-omjep-border/80 bg-omjep-bg-panel-soft/80 py-2.5 text-sm font-semibold text-omjep-text-primary transition hover:border-[color-mix(in_srgb,var(--omjep-mauve)_35%,var(--omjep-border))] sm:flex-none"
              >
                Voir matchs
              </Link>
            </div>
          </>
        )}
      </div>
    </article>
  )
}

function PriorityActionsModule({ priorities }: Pick<CockpitCommandModulesProps, 'priorities'>) {
  return (
    <article className={`${shell} lg:col-span-3`}>
      <div className={shellGlow} aria-hidden />
      <div className="relative flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-omjep-mauve" aria-hidden />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-omjep-text-muted">Priorités</p>
        </div>
        <p className="mt-1 font-heading text-base font-black text-omjep-text-primary">Actions cockpit</p>

        <div className="mt-4 flex min-h-[180px] flex-1 flex-col">
          {priorities.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--omjep-mauve)_22%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-mauve)_6%,var(--omjep-bg-panel-soft))] px-3 py-8 text-center">
              <Sparkles className="mb-2 h-8 w-8 text-[color-mix(in_srgb,var(--omjep-gold)_80%,var(--omjep-mauve))]" aria-hidden />
              <p className="text-sm font-bold text-omjep-text-primary">Tout est sous contrôle</p>
              <p className="mt-1 text-xs text-omjep-text-secondary">Aucune action urgente détectée pour votre compte.</p>
            </div>
          ) : (
            <ul className="flex flex-1 flex-col gap-2">
              {priorities.slice(0, 4).map((item) => {
                const Icon = item.icon
                return (
                  <li
                    key={item.key}
                    className="flex gap-2 rounded-xl border border-omjep-border/60 bg-[color-mix(in_srgb,var(--omjep-bg-panel-soft)_85%,transparent)] p-2.5 transition hover:border-[color-mix(in_srgb,var(--omjep-mauve)_30%,var(--omjep-border))]"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--omjep-gold)_30%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_8%,var(--omjep-bg-panel))] text-[color-mix(in_srgb,var(--omjep-gold)_90%,var(--omjep-mauve))]">
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-omjep-text-primary">{item.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-omjep-text-secondary">{item.text}</p>
                      <Link
                        to={item.ctaTo}
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-omjep-mauve hover:underline"
                      >
                        {item.ctaLabel}
                        <ChevronRight className="h-3 w-3" aria-hidden />
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </article>
  )
}

function MarketFeedModule({ news }: Pick<CockpitCommandModulesProps, 'news'>) {
  const slice = news.slice(0, 4)

  return (
    <article className={`${shell} lg:col-span-4`}>
      <div className={shellGlow} aria-hidden />
      <div className="relative flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-omjep-text-muted">Flux mercato</p>
            <p className="mt-1 font-heading text-lg font-black text-omjep-text-primary">Système & signaux</p>
          </div>
          <span className="rounded-md border border-omjep-border/70 bg-omjep-bg-panel-soft/80 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-omjep-text-muted">
            Max 4
          </span>
        </div>

        <div className="mt-4 flex min-h-[200px] flex-1 flex-col gap-2">
          {slice.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[color-mix(in_srgb,var(--omjep-mauve)_28%,var(--omjep-border))] bg-[color-mix(in_srgb,#05020f_55%,var(--omjep-bg-panel-soft))] px-4 py-10 text-center">
              <Newspaper className="mb-2 h-9 w-9 text-[color-mix(in_srgb,var(--omjep-gold)_75%,var(--omjep-mauve))]" aria-hidden />
              <p className="text-sm font-bold text-omjep-text-primary">Flux en veille — aucune activité récente</p>
              <p className="mt-1 text-xs text-omjep-text-secondary">Les annonces officielles et mouvements apparaîtront ici.</p>
            </div>
          ) : (
            slice.map((n) => {
              const ts = new Date(n.metadata?.timestamp ?? n.created_at)
              const timeLabel = Number.isNaN(ts.getTime())
                ? '—'
                : ts.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
              const chip = mercatoFeedChip(n.type)
              return (
                <article
                  key={n.id}
                  className="rounded-xl border border-omjep-border/60 bg-[color-mix(in_srgb,var(--omjep-bg-panel-soft)_88%,transparent)] px-3 py-2.5 transition hover:border-[color-mix(in_srgb,var(--omjep-mauve)_28%,var(--omjep-border))]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] ${
                        chip === 'SIGNATURE'
                          ? 'border-[color-mix(in_srgb,var(--omjep-gold)_45%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_12%,transparent)] text-[color-mix(in_srgb,var(--omjep-accent-gold)_95%,var(--omjep-text-primary))]'
                          : chip === 'OFFRE'
                            ? 'border-orange-500/35 bg-orange-500/10 text-orange-200'
                            : chip === 'INFO'
                              ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100'
                              : 'border-omjep-border/70 bg-omjep-bg-panel text-omjep-text-muted'
                      }`}
                    >
                      {chip}
                    </span>
                    <time className="text-[10px] font-mono text-omjep-text-muted" dateTime={n.created_at}>
                      {timeLabel}
                    </time>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm font-bold text-omjep-text-primary">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-omjep-text-secondary">{n.description}</p>
                </article>
              )
            })
          )}
        </div>

        <Link
          to="/dashboard/transfers"
          className="omjep-btn-secondary mt-4 inline-flex w-full items-center justify-center gap-2 py-2.5 text-sm font-semibold normal-case tracking-normal"
        >
          Ouvrir le mercato
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </article>
  )
}

export function CockpitCommandModules(props: CockpitCommandModulesProps) {
  const { loading } = props

  if (loading) {
    return (
      <section className="space-y-4" aria-label="Modules cockpit">
        <CockpitSectionHeader />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <ModuleSkeleton className="lg:col-span-4" />
          <ModuleSkeleton className="lg:col-span-4" />
          <ModuleSkeleton className="lg:col-span-4" />
          <ModuleSkeleton className="min-h-[280px] lg:col-span-5" />
          <ModuleSkeleton className="lg:col-span-3" />
          <ModuleSkeleton className="lg:col-span-4" />
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-4" aria-label="Modules cockpit">
      <CockpitSectionHeader />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <PerformanceModule
          level={props.level}
          xp={props.xp}
          xpPct={props.xpPct}
          scheduleMatchCount={props.scheduleMatchCount}
          dataTotals={props.dataTotals}
        />
        <PlayerPassModule
          user={props.user}
          roleLabel={props.roleLabel}
          hasClub={props.hasClub}
          myClubName={props.myClubName}
          playerRarityLabel={props.playerRarityLabel}
        />
        <WalletModule oc={props.oc} jepy={props.jepy} reservedOc={props.reservedOc} />
        <NextMatchModule nextMatch={props.nextMatch} nextKickoff={props.nextKickoff} nextOpponent={props.nextOpponent} />
        <PriorityActionsModule priorities={props.priorities} />
        <MarketFeedModule news={props.news} />
      </div>
    </section>
  )
}
