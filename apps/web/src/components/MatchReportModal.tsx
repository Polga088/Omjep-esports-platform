import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ImageIcon,
  Loader2,
  Minus,
  Plus,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { useModalOpenSound } from '@/hooks/useModalOpenSound'

interface TeamLite {
  id: string
  name: string
  logoUrl: string | null
}

interface MatchLite {
  id: string
  homeTeam: TeamLite
  awayTeam: TeamLite
  homeScore: number | null
  awayScore: number | null
  status?: 'SCHEDULED' | 'PENDING' | 'VALIDATED' | 'DISPUTE' | 'PLAYED'
  scheduledAt?: string
  competition?: { id: string; name: string; type: string } | null
}

interface RankingSummary {
  homeTeam: { rank: number | null; points: number | null; pointsDelta: number }
  awayTeam: { rank: number | null; points: number | null; pointsDelta: number }
}

interface MatchReportModalProps {
  open: boolean
  match: MatchLite | null
  onClose: () => void
  onUpdated: () => void
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduced(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  return reduced
}

function modalStatusLabel(status: MatchLite['status']) {
  if (!status) return null
  if (status === 'PLAYED' || status === 'VALIDATED') return 'TERMINÉ'
  if (status === 'DISPUTE') return 'LITIGE'
  if (status === 'PENDING') return 'EN ATTENTE'
  return 'À VENIR'
}

function modalStatusTone(status: MatchLite['status']) {
  if (!status) {
    return 'border-omjep-border/50 bg-omjep-bg-panel-soft/80 text-omjep-text-secondary'
  }
  if (status === 'PLAYED' || status === 'VALIDATED') {
    return 'border-omjep-border/50 bg-[color-mix(in_srgb,var(--omjep-success)_10%,var(--omjep-bg-panel-soft))] text-[color-mix(in_srgb,var(--omjep-success)_92%,var(--omjep-text-primary))]'
  }
  if (status === 'DISPUTE') {
    return 'border-omjep-border/50 bg-[color-mix(in_srgb,var(--omjep-danger)_8%,var(--omjep-bg-panel-soft))] text-omjep-danger'
  }
  if (status === 'PENDING') {
    return 'border-omjep-border/50 bg-[color-mix(in_srgb,var(--omjep-gold)_8%,var(--omjep-bg-panel-soft))] text-[color-mix(in_srgb,var(--omjep-gold)_85%,var(--omjep-text-primary))]'
  }
  return 'border-omjep-border/50 bg-omjep-bg-panel-soft/70 text-omjep-text-secondary'
}

function formatScheduled(scheduledAt?: string) {
  if (!scheduledAt) return null
  const d = new Date(scheduledAt)
  if (Number.isNaN(d.getTime())) return null
  const date = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}

/** Logos / initiales max 44px (h-11) */
function TeamAvatarSm({ team }: { team: TeamLite }) {
  if (team.logoUrl) {
    return (
      <img
        src={team.logoUrl}
        alt=""
        className="h-11 w-11 max-h-[44px] max-w-[44px] shrink-0 rounded-lg border border-omjep-border/50 object-contain"
      />
    )
  }
  const initials = team.name.trim().slice(0, 2).toUpperCase() || '??'
  return (
    <div className="flex h-11 w-11 max-h-[44px] max-w-[44px] shrink-0 items-center justify-center rounded-lg border border-omjep-border/50 bg-omjep-bg-panel-soft text-[11px] font-black text-[color-mix(in_srgb,var(--omjep-gold)_78%,var(--omjep-text-primary))]">
      {initials}
    </div>
  )
}

function TeamAvatarMd({ team }: { team: TeamLite }) {
  if (team.logoUrl) {
    return (
      <img
        src={team.logoUrl}
        alt=""
        className="h-11 w-11 max-h-[44px] max-w-[44px] shrink-0 rounded-lg border border-omjep-border/50 object-contain"
      />
    )
  }
  const initials = team.name.trim().slice(0, 2).toUpperCase() || '??'
  return (
    <div className="flex h-11 w-11 max-h-[44px] max-w-[44px] shrink-0 items-center justify-center rounded-lg border border-omjep-border/50 bg-omjep-bg-panel-soft font-heading text-sm font-black text-[color-mix(in_srgb,var(--omjep-gold)_78%,var(--omjep-text-primary))]">
      {initials}
    </div>
  )
}

function MatchSummaryCompact({ match }: { match: MatchLite }) {
  const scheduled = formatScheduled(match.scheduledAt)
  const comp = match.competition?.name

  return (
    <section
      aria-label="Résumé du match"
      className="rounded-xl border border-omjep-border/50 bg-[color-mix(in_srgb,var(--omjep-bg-panel-soft)_75%,var(--omjep-bg-panel))] px-2.5 py-2 sm:px-3"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <TeamAvatarSm team={match.homeTeam} />
          <p className="min-w-0 flex-1 truncate text-center font-heading text-[13px] font-bold leading-tight text-omjep-text-primary sm:text-left">
            {match.homeTeam.name}
          </p>
        </div>
        <div className="flex shrink-0 items-center justify-center px-1">
          <span className="font-heading text-sm font-black tracking-[0.14em] text-[color-mix(in_srgb,var(--omjep-mauve)_85%,var(--omjep-text-primary))]">
            VS
          </span>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-row-reverse">
          <TeamAvatarSm team={match.awayTeam} />
          <p className="min-w-0 flex-1 truncate text-center font-heading text-[13px] font-bold leading-tight text-omjep-text-primary sm:text-right">
            {match.awayTeam.name}
          </p>
        </div>
      </div>
      {(comp || scheduled) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 pt-1.5 text-[10px] text-omjep-text-secondary sm:justify-between sm:text-[11px]">
          {comp ? <span className="max-w-[58%] truncate font-medium uppercase tracking-[0.1em] text-omjep-text-primary">{comp}</span> : <span />}
          {scheduled ? (
            <span className="inline-flex items-center gap-1 tabular-nums text-omjep-text-muted">
              <Calendar className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
              {scheduled}
            </span>
          ) : null}
        </div>
      )}
    </section>
  )
}

function GoldConfettiBurst({ active, disabled }: { active: boolean; disabled: boolean }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, idx) => ({
        id: idx,
        x: (Math.random() - 0.5) * 380,
        y: -Math.random() * 260 - 28,
        rotate: Math.random() * 720 - 360,
        delay: Math.random() * 0.28,
      })),
    [],
  )

  if (disabled) return null

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-[90]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {particles.map((p) => (
            <motion.span
              key={p.id}
              className="absolute left-1/2 top-1/2 h-2 w-1.5 rounded-full bg-[color-mix(in_srgb,var(--omjep-gold)_90%,#fff)] shadow-[0_0_12px_color-mix(in_srgb,var(--omjep-gold)_70%,transparent)]"
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
              animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 0.65 }}
              transition={{ duration: 1.05, delay: p.delay, ease: 'easeOut' }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

type ScoreSide = 'home' | 'away'

interface ScoreTeamPanelProps {
  side: ScoreSide
  team: TeamLite
  value: number
  disabled: boolean
  onDelta: (delta: number) => void
  onInput: (value: number) => void
}

function ScoreTeamPanel({ side, team, value, disabled, onDelta, onInput }: ScoreTeamPanelProps) {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0
  const decLabel = side === 'home' ? 'Diminuer le score domicile' : 'Diminuer le score extérieur'
  const incLabel = side === 'home' ? 'Augmenter le score domicile' : 'Augmenter le score extérieur'

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        onDelta(1)
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        onDelta(-1)
      }
    },
    [disabled, onDelta],
  )

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-2 rounded-xl border border-omjep-border/50 bg-omjep-bg-panel-soft/70 p-2.5 sm:p-3">
      <div className="flex items-center gap-2">
        <TeamAvatarMd team={team} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-[13px] font-bold text-omjep-text-primary">{team.name}</p>
          <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-omjep-text-muted">{side === 'home' ? 'Domicile' : 'Extérieur'}</p>
        </div>
      </div>

      <div className="flex min-w-0 max-w-full items-stretch justify-center gap-1.5">
        <button
          type="button"
          disabled={disabled || safe <= 0}
          aria-label={decLabel}
          onClick={() => onDelta(-1)}
          className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-omjep-border/50 bg-omjep-bg-panel text-omjep-text-primary transition hover:border-omjep-border/80 hover:bg-omjep-bg-panel-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--omjep-mauve)_45%,transparent)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="h-5 w-5" aria-hidden />
        </button>

        <label className="flex min-w-0 flex-1 flex-col justify-center">
          <span className="sr-only">Score {team.name}</span>
          <input
            data-match-report-score={side}
            type="number"
            min={0}
            inputMode="numeric"
            disabled={disabled}
            value={safe}
            onChange={(e) => onInput(Math.max(0, Number(e.target.value || 0)))}
            onKeyDown={handleKeyDown}
            className="omjep-field min-h-[48px] w-full min-w-0 max-w-full border-omjep-border/50 py-1.5 text-center font-heading text-3xl font-black tabular-nums leading-none text-omjep-text-primary focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--omjep-focus-ring)_40%,transparent)]"
          />
        </label>

        <button
          type="button"
          disabled={disabled}
          aria-label={incLabel}
          onClick={() => onDelta(1)}
          className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-omjep-border/50 bg-omjep-bg-panel text-omjep-text-primary transition hover:border-omjep-border/80 hover:bg-omjep-bg-panel-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--omjep-gold)_45%,transparent)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  )
}

function CenterScoreDisplay({ home, away }: { home: number; away: number }) {
  const h = Number.isFinite(home) ? Math.max(0, home) : 0
  const a = Number.isFinite(away) ? Math.max(0, away) : 0
  return (
    <div className="flex min-h-[3.75rem] w-full max-w-[11rem] min-w-0 shrink-0 flex-col items-center justify-center rounded-xl border border-omjep-border/50 bg-omjep-bg-panel/90 px-2 py-2 sm:max-w-[12rem] lg:max-w-none lg:flex-1">
      <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-omjep-text-muted">Live</p>
      <p className="mt-0.5 flex items-baseline justify-center gap-1 font-heading text-2xl font-black tabular-nums leading-none text-omjep-text-primary sm:text-3xl">
        <span className="text-[color-mix(in_srgb,var(--omjep-gold)_82%,var(--omjep-text-primary))]">{h}</span>
        <span className="select-none text-base font-bold text-omjep-text-muted">—</span>
        <span className="text-[color-mix(in_srgb,var(--omjep-gold)_82%,var(--omjep-text-primary))]">{a}</span>
      </p>
    </div>
  )
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function MatchReportModal({ open, match, onClose, onUpdated }: MatchReportModalProps) {
  const currentMatch = match
  const [homeScore, setHomeScore] = useState<number>(match?.homeScore ?? 0)
  const [awayScore, setAwayScore] = useState<number>(match?.awayScore ?? 0)
  const [proofUrl, setProofUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingAction, setPendingAction] = useState<'report' | 'confirm' | null>(null)
  const [rankingSummary, setRankingSummary] = useState<RankingSummary | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [scoreError, setScoreError] = useState<string | null>(null)
  const [proofError, setProofError] = useState<string | null>(null)
  const [consignesOpen, setConsignesOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()

  useModalOpenSound(Boolean(open && match))

  useEffect(() => {
    if (!open || !match) return
    setHomeScore(match.homeScore ?? 0)
    setAwayScore(match.awayScore ?? 0)
    setProofUrl('')
    setRankingSummary(null)
    setShowConfetti(false)
    setDragging(false)
    setScoreError(null)
    setProofError(null)
    setPendingAction(null)
    setConsignesOpen(false)
  }, [open, match?.id])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open || !panelRef.current) return
    const root = panelRef.current
    const onTrap = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      const focusable = nodes.filter((el) => {
        if (el.closest('[inert]')) return false
        if ((el as HTMLButtonElement).disabled || (el as HTMLInputElement).disabled) return false
        const s = window.getComputedStyle(el)
        return s.visibility !== 'hidden' && s.display !== 'none'
      })
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else if (active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    root.addEventListener('keydown', onTrap)
    return () => root.removeEventListener('keydown', onTrap)
  }, [open, match?.id])

  useEffect(() => {
    if (!open || !match) return
    const id = requestAnimationFrame(() => {
      const el = panelRef.current?.querySelector<HTMLInputElement>('[data-match-report-score="home"]')
      el?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [open, match?.id])

  const validateScores = useCallback((): boolean => {
    const h = homeScore
    const a = awayScore
    if (!Number.isFinite(h) || !Number.isFinite(a)) {
      setScoreError('Les scores doivent être des nombres valides.')
      return false
    }
    if (h < 0 || a < 0) {
      setScoreError('Les scores ne peuvent pas être négatifs.')
      return false
    }
    setScoreError(null)
    return true
  }, [homeScore, awayScore])

  if (!open || !currentMatch) return null

  const liveHome = Number.isFinite(homeScore) ? Math.max(0, homeScore) : 0
  const liveAway = Number.isFinite(awayScore) ? Math.max(0, awayScore) : 0
  const liveSummary = `Résultat en cours : ${currentMatch.homeTeam.name} ${liveHome} — ${liveAway} ${currentMatch.awayTeam.name}`

  async function readFileAsDataUrl(file: File) {
    setProofError(null)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result ?? ''))
        reader.onerror = () => reject(new Error('Lecture du fichier impossible'))
        reader.readAsDataURL(file)
      })
      setProofUrl(dataUrl)
    } catch {
      setProofError('Impossible de lire le fichier. Réessayez avec une image plus légère.')
      toast.error('Lecture de la preuve impossible')
    }
  }

  async function handleReport() {
    const m = currentMatch
    if (!m?.id) return
    if (!validateScores()) return
    const targetId = m.id
    setIsSubmitting(true)
    setPendingAction('report')
    try {
      await api.patch(`/matches/${targetId}/report`, {
        homeScore: liveHome,
        awayScore: liveAway,
        proofUrl: proofUrl || undefined,
      })
      toast.success('Score reporté (PENDING)')
      onUpdated()
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Report impossible'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
      setPendingAction(null)
    }
  }

  async function handleConfirm() {
    const m = currentMatch
    if (!m?.id) return
    if (!validateScores()) return
    const targetId = m.id
    setIsSubmitting(true)
    setPendingAction('confirm')
    try {
      const { data } = await api.patch(`/matches/${targetId}/confirm`, {
        homeScore: liveHome,
        awayScore: liveAway,
      })
      if (data?.status === 'DISPUTE') {
        toast.error('Conflit détecté, match placé en litige')
        onUpdated()
        return
      }
      setRankingSummary(data?.rankingSummary ?? null)
      if (!reducedMotion) {
        setShowConfetti(true)
        window.setTimeout(() => setShowConfetti(false), 1400)
      }
      toast.success('Match validé')
      onUpdated()
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Confirmation impossible'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
      setPendingAction(null)
    }
  }

  const motionProps = reducedMotion
    ? { initial: false, animate: { opacity: 1 }, transition: { duration: 0 } }
    : { initial: { opacity: 0, y: 10, scale: 0.99 }, animate: { opacity: 1, y: 0, scale: 1 } }

  const isImageProof = proofUrl.startsWith('data:image')

  const badgeLabel = modalStatusLabel(currentMatch.status)
  const scheduledShort = formatScheduled(currentMatch.scheduledAt)
  const competitionShort = currentMatch.competition?.name

  const modalTree = (
    <div className="tactical-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      <div className="tactical-modal-dim" onClick={onClose} role="presentation" aria-hidden />
      <motion.div
        ref={panelRef}
        {...motionProps}
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-report-title"
        onClick={(event) => event.stopPropagation()}
        className="tactical-modal-panel omjep-surface-elevated relative mx-auto flex max-h-[calc(100vh-2rem)] w-[min(860px,calc(100vw-2rem))] max-w-[860px] flex-col overflow-hidden rounded-2xl border border-omjep-border/60 shadow-[var(--omjep-shadow-lg)] [clip-path:unset]"
      >
        <GoldConfettiBurst active={showConfetti} disabled={reducedMotion} />

        <header className="sticky top-0 z-20 shrink-0 border-b border-omjep-border/50 bg-omjep-bg-panel/95 px-2.5 py-2 backdrop-blur-md sm:px-3 sm:py-2.5">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 overflow-hidden">
              <h2 id="match-report-title" className="truncate font-heading text-[15px] font-extrabold tracking-tight text-omjep-text-primary sm:text-base">
                Saisie du résultat
              </h2>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] leading-snug text-omjep-text-secondary sm:text-[11px]">
                <span className="shrink-0 font-mono text-[9px] text-omjep-text-muted tabular-nums" title={currentMatch.id}>
                  {currentMatch.id.slice(0, 6)}…
                </span>
                {badgeLabel ? (
                  <span
                    className={`inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] ${modalStatusTone(currentMatch.status)}`}
                  >
                    {badgeLabel}
                  </span>
                ) : null}
                {competitionShort ? (
                  <span className="min-w-0 max-w-full truncate font-medium text-omjep-text-primary">{competitionShort}</span>
                ) : null}
                {scheduledShort ? (
                  <span className="inline-flex min-w-0 max-w-full items-center gap-0.5 truncate tabular-nums text-omjep-text-muted">
                    <Calendar className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                    <span className="truncate">{scheduledShort}</span>
                  </span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="omjep-btn-ghost shrink-0 rounded-lg px-2 py-1.5 text-omjep-text-secondary"
              aria-label="Fermer la fenêtre"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain scroll-smooth px-2.5 py-2 sm:px-3 sm:py-2.5">
          <div className="space-y-2.5 sm:space-y-3">
            <MatchSummaryCompact match={currentMatch} />

            <section aria-labelledby="scoreboard-heading" className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 id="scoreboard-heading" className="font-heading text-sm font-bold text-omjep-text-primary">
                  Score
                </h3>
                <p className="text-[10px] text-omjep-text-muted">↑↓ dans le champ · min. 0</p>
              </div>

              <div className="grid max-w-full grid-cols-1 gap-2 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(5.5rem,7.5rem)_minmax(0,1fr)] lg:items-stretch lg:gap-2">
                <ScoreTeamPanel
                  side="home"
                  team={currentMatch.homeTeam}
                  value={homeScore}
                  disabled={isSubmitting}
                  onDelta={(d) => setHomeScore((v) => Math.max(0, (Number.isFinite(v) ? v : 0) + d))}
                  onInput={setHomeScore}
                />

                <div className="flex w-full justify-center lg:min-w-0 lg:items-stretch">
                  <CenterScoreDisplay home={liveHome} away={liveAway} />
                </div>

                <ScoreTeamPanel
                  side="away"
                  team={currentMatch.awayTeam}
                  value={awayScore}
                  disabled={isSubmitting}
                  onDelta={(d) => setAwayScore((v) => Math.max(0, (Number.isFinite(v) ? v : 0) + d))}
                  onInput={setAwayScore}
                />
              </div>

              <div className="rounded-full border border-omjep-border/40 bg-omjep-bg-panel-soft/60 px-2.5 py-1.5 text-center">
                <p className="text-[11px] font-semibold leading-snug text-omjep-text-primary sm:text-xs">{liveSummary}</p>
              </div>

              {scoreError ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-[color-mix(in_srgb,var(--omjep-danger)_35%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-danger)_10%,var(--omjep-bg-panel-soft))] px-3 py-2.5"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-omjep-danger" aria-hidden />
                  <p className="text-sm text-omjep-danger">{scoreError}</p>
                </div>
              ) : null}
            </section>

            <section aria-labelledby="proof-heading" className="space-y-1.5">
              <h3 id="proof-heading" className="font-heading text-xs font-bold text-omjep-text-primary sm:text-sm">
                Preuve
              </h3>
              <div
                className={`rounded-lg border border-dashed transition ${dragging ? 'border-omjep-border/70 bg-omjep-bg-panel-soft/80' : 'border-omjep-border/45 bg-omjep-bg-panel-soft/50'}`}
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={async (event) => {
                  event.preventDefault()
                  setDragging(false)
                  const file = event.dataTransfer.files?.[0]
                  if (file) await readFileAsDataUrl(file)
                }}
              >
                <div className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center sm:gap-3 sm:p-2.5">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-omjep-text-primary">
                      <Upload className="h-3.5 w-3.5 shrink-0 text-omjep-mauve" aria-hidden />
                      <span>Capture</span>
                    </div>
                    <p className="text-[10px] leading-snug text-omjep-text-muted">Optionnel · envoyée avec le report.</p>
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/*"
                      tabIndex={-1}
                      className="sr-only"
                      aria-label="Choisir une image de preuve"
                      onChange={async (event) => {
                        const file = event.target.files?.[0]
                        if (file) await readFileAsDataUrl(file)
                      }}
                    />
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => inputRef.current?.click()}
                      className="omjep-btn-secondary mt-0.5 inline-flex w-full justify-center py-2 text-[11px] sm:w-auto sm:px-3"
                    >
                      Importer
                    </button>
                  </div>
                  {isImageProof ? (
                    <div className="flex w-full shrink-0 flex-col items-center gap-1 sm:w-auto sm:max-w-[140px]">
                      <div className="w-full overflow-hidden rounded-md border border-omjep-border/50 bg-omjep-bg-panel">
                        <img src={proofUrl} alt="" className="max-h-[96px] w-full object-cover object-center" />
                      </div>
                      <p className="flex items-center gap-1 text-[10px] font-medium text-omjep-text-secondary">
                        <CheckCircle2 className="h-3 w-3 text-[color-mix(in_srgb,var(--omjep-success)_88%,var(--omjep-text-primary))]" aria-hidden />
                        Prête
                      </p>
                    </div>
                  ) : proofUrl ? (
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-omjep-text-secondary">
                      <ImageIcon className="h-3.5 w-3.5 shrink-0 text-omjep-mauve" aria-hidden />
                      Fichier joint
                    </div>
                  ) : null}
                </div>
              </div>
              {proofError ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-[color-mix(in_srgb,var(--omjep-danger)_35%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-danger)_10%,var(--omjep-bg-panel-soft))] px-3 py-2.5"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-omjep-danger" aria-hidden />
                  <p className="text-sm text-omjep-danger">{proofError}</p>
                </div>
              ) : null}
            </section>

            {rankingSummary ? (
              <div className="rounded-lg border border-omjep-border/50 bg-[color-mix(in_srgb,var(--omjep-gold)_6%,var(--omjep-bg-panel-soft))] px-2.5 py-2">
                <p className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-omjep-text-primary">
                  <ShieldCheck className="h-3.5 w-3.5 text-[color-mix(in_srgb,var(--omjep-gold)_85%,var(--omjep-text-primary))]" aria-hidden />
                  Classement
                </p>
                <div className="grid grid-cols-1 gap-1 text-[10px] text-omjep-text-secondary sm:grid-cols-2 sm:text-[11px]">
                  <p>
                    Dom. #{rankingSummary.homeTeam.rank ?? '-'} · {rankingSummary.homeTeam.points ?? '-'} pts (
                    {rankingSummary.homeTeam.pointsDelta >= 0 ? '+' : ''}
                    {rankingSummary.homeTeam.pointsDelta})
                  </p>
                  <p>
                    Ext. #{rankingSummary.awayTeam.rank ?? '-'} · {rankingSummary.awayTeam.points ?? '-'} pts (
                    {rankingSummary.awayTeam.pointsDelta >= 0 ? '+' : ''}
                    {rankingSummary.awayTeam.pointsDelta})
                  </p>
                </div>
              </div>
            ) : null}

            <div className="rounded-lg border border-omjep-border/45 bg-omjep-bg-panel-soft/50">
              <button
                type="button"
                onClick={() => setConsignesOpen((o) => !o)}
                className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-[11px] font-bold text-omjep-text-primary transition hover:bg-omjep-bg-panel/30 sm:py-2 sm:text-xs"
                aria-expanded={consignesOpen}
                id="consignes-toggle"
              >
                <span>Consignes</span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-omjep-text-muted transition ${consignesOpen ? 'rotate-180' : ''}`} aria-hidden />
              </button>
              {consignesOpen ? (
                <div className="border-t border-omjep-border/40 px-2.5 pb-2 pt-1.5" role="region" aria-labelledby="consignes-toggle">
                  <ul className="list-inside list-disc space-y-1 text-[10px] leading-snug text-omjep-text-secondary sm:text-[11px]">
                    <li>Seul ce match (ID ci-dessus) est modifié par vos actions.</li>
                    <li>Reporter = proposition ; validation finale par les capitaines.</li>
                    <li>Écart de score → possible passage en litige.</li>
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <footer className="sticky bottom-0 z-20 shrink-0 border-t border-omjep-border/50 bg-omjep-bg-panel/95 px-2.5 py-2.5 backdrop-blur-md sm:px-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="omjep-btn-ghost order-2 min-h-[44px] w-full justify-center sm:order-1 sm:w-auto sm:min-w-[6.5rem]"
            >
              Annuler
            </button>
            <div className="order-1 grid grid-cols-2 gap-2 sm:order-2 sm:flex sm:flex-1 sm:justify-end sm:gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleReport}
                className="omjep-btn-secondary min-h-[44px] justify-center gap-1.5 px-2.5 py-2 text-[10px] sm:min-w-[9.5rem] sm:px-4 sm:text-[11px]"
                aria-busy={pendingAction === 'report'}
              >
                {pendingAction === 'report' ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : null}
                {pendingAction === 'report' ? 'Envoi…' : 'Reporter (PENDING)'}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirm}
                className="omjep-btn-primary min-h-[44px] justify-center gap-1.5 px-2.5 py-2 text-[10px] sm:min-w-[10rem] sm:px-5 sm:text-[11px]"
                aria-busy={pendingAction === 'confirm'}
              >
                {pendingAction === 'confirm' ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : null}
                {pendingAction === 'confirm' ? 'Validation…' : 'Confirmer & valider'}
              </button>
            </div>
          </div>
        </footer>
      </motion.div>
    </div>
  )

  if (typeof document === 'undefined' || !document.body) return null
  return createPortal(modalTree, document.body)
}
