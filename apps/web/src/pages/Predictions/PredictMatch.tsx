import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Tilt from 'react-parallax-tilt'
import { Clock3, Loader2, Minus, Plus, Shield, Sparkles, Sword, Trophy } from 'lucide-react'
import type { TeamFormLetter } from './predictionTypes'

export function formatJourneeLabel(round: string | null | undefined): string | null {
  if (!round?.trim()) return null
  const value = round.trim()
  if (/^\d+$/.test(value)) return `Journée ${value}`
  return value
}

function formatJourneeDisplayUpper(round: string | null | undefined): string | null {
  if (!round?.trim()) return null
  const value = round.trim()
  if (/^\d+$/.test(value)) return `JOURNÉE ${value}`
  return formatJourneeLabel(round)?.toUpperCase() ?? value.toUpperCase()
}

function formLetterToLabel(letter: TeamFormLetter): 'V' | 'N' | 'D' {
  if (letter === 'W') return 'V'
  if (letter === 'D') return 'N'
  return 'D'
}

const FORM_SLOT_COUNT = 5

export function TeamForm({ form }: { form: TeamFormLetter[] }) {
  const slots: (TeamFormLetter | null)[] = Array.from({ length: FORM_SLOT_COUNT }, (_, i) => form[i] ?? null)

  return (
    <div className="flex justify-center gap-1.5" aria-label="Forme des 5 derniers matchs">
      {slots.map((letter, idx) => {
        if (!letter) {
          return (
            <span
              key={`empty-${idx}`}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-omjep-border/70 bg-omjep-bg-panel-soft text-[9px] font-bold text-omjep-text-muted"
            >
              -
            </span>
          )
        }

        const label = formLetterToLabel(letter)
        const tone =
          letter === 'W'
            ? 'border-emerald-500/50 bg-emerald-500/16 text-emerald-300'
            : letter === 'D'
              ? 'border-slate-400/40 bg-slate-400/14 text-slate-200'
              : 'border-rose-500/50 bg-rose-500/16 text-rose-300'

        return (
          <span
            key={`${idx}-${letter}`}
            className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-black ${tone}`}
          >
            {label}
          </span>
        )
      })}
    </div>
  )
}

function RankHexBadge({ rank }: { rank: number }) {
  return (
    <span
      className="relative inline-flex h-8 w-[2rem] shrink-0 items-center justify-center text-[10px] font-black tabular-nums text-[color-mix(in_srgb,var(--omjep-gold)_88%,var(--omjep-text-primary))]"
      style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
      title={`Rang ${rank}`}
    >
      <span className="absolute inset-0 rounded-sm border border-[color-mix(in_srgb,var(--omjep-gold)_42%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-mauve)_30%,var(--omjep-bg-panel))]" />
      <span className="relative">#{rank}</span>
    </span>
  )
}

function GoldenScoreBurst({ burstId }: { burstId: number }) {
  const particles = useMemo(() => {
    if (!burstId) return []
    return Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2 + (((burstId * 7 + i) % 10) / 100 - 0.05)
      const dist = 24 + ((burstId + i * 7) % 16)
      return { angle, dist, i }
    })
  }, [burstId])

  if (particles.length === 0) return null

  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
      {particles.map(({ angle, dist, i }) => (
        <motion.span
          key={`${burstId}-${i}`}
          className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-[color-mix(in_srgb,var(--omjep-gold)_90%,#fff)]"
          style={{ boxShadow: '0 0 10px rgba(251, 191, 36, 0.9)' }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1.15 }}
          animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, opacity: 0, scale: 0.1 }}
          transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </div>
  )
}

function ScoreStepper({
  label,
  value,
  onChange,
  burstId,
  onBurst,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  burstId: number
  onBurst: () => void
}) {
  const n = Math.max(0, Number.parseInt(value, 10) || 0)

  const apply = (next: number) => {
    const clamped = Math.max(0, Math.min(99, next))
    onChange(String(clamped))
    onBurst()
  }

  return (
    <div className="flex-1">
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-omjep-text-muted">
        {label}
      </label>
      <div className="relative flex items-center justify-between rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft/90 px-1 py-1.5 backdrop-blur-sm">
        <GoldenScoreBurst burstId={burstId} />
        <button
          type="button"
          onClick={() => apply(n - 1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-omjep-border/80 bg-omjep-bg-panel text-omjep-text-secondary transition hover:border-[color-mix(in_srgb,var(--omjep-gold)_40%,var(--omjep-border))] hover:text-omjep-text-primary active:scale-95"
          aria-label={`Diminuer le score ${label}`}
        >
          <Minus className="h-4 w-4" strokeWidth={2.4} />
        </button>

        <motion.span
          key={n}
          className="inline-block min-w-[2.5rem] text-center font-heading text-2xl font-black tabular-nums text-omjep-text-primary"
          initial={{ scale: 1.18 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 520, damping: 16, mass: 0.55 }}
        >
          {n}
        </motion.span>

        <button
          type="button"
          onClick={() => apply(n + 1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-omjep-border/80 bg-omjep-bg-panel text-omjep-text-secondary transition hover:border-[color-mix(in_srgb,var(--omjep-gold)_40%,var(--omjep-border))] hover:text-omjep-text-primary active:scale-95"
          aria-label={`Augmenter le score ${label}`}
        >
          <Plus className="h-4 w-4" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  )
}

export interface PredictMatchRow {
  id: string
  round: string | null
  played_at: string | null
  competition: { id: string; name: string; type: string } | null
  homeTeam: { id: string; name: string; logo_url: string | null }
  awayTeam: { id: string; name: string; logo_url: string | null }
  homeTeamForm: TeamFormLetter[]
  awayTeamForm: TeamFormLetter[]
  homeTeamRank: number | null
  awayTeamRank: number | null
}

interface PredictMatchProps {
  match: PredictMatchRow
  formHome: string
  formAway: string
  formBet: string
  already: boolean
  submitting: boolean
  onChange: (field: 'home' | 'away' | 'bet', value: string) => void
  onSubmit: () => void
}

function TeamPod({
  team,
  form,
  rank,
  side,
}: {
  team: PredictMatchRow['homeTeam']
  form: TeamFormLetter[]
  rank: number | null
  side: 'home' | 'away'
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-3 text-center">
      {team.logo_url ? (
        <img
          src={team.logo_url}
          alt=""
          className="h-16 w-16 rounded-2xl object-cover ring-1 ring-omjep-border/60 sm:h-[72px] sm:w-[72px]"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-omjep-border/70 bg-omjep-bg-panel-soft text-xl font-bold text-omjep-text-muted sm:h-[72px] sm:w-[72px]">
          {(team.name ?? '??').slice(0, 2).toUpperCase()}
        </div>
      )}

      <div className="inline-flex items-center gap-1 rounded-full border border-omjep-border/60 bg-omjep-bg-panel-soft px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-omjep-text-muted">
        <Shield className="h-3 w-3" />
        {side === 'home' ? 'Domicile' : 'Extérieur'}
      </div>

      <TeamForm form={form} />

      <div className="flex max-w-[220px] items-center justify-center gap-2">
        {rank != null ? <RankHexBadge rank={rank} /> : null}
        <span className="min-w-0 text-left text-sm font-bold leading-tight text-omjep-text-primary sm:text-base">
          {team.name ?? '-'}
        </span>
      </div>
    </div>
  )
}

export default function PredictMatch({
  match,
  formHome,
  formAway,
  formBet,
  already,
  submitting,
  onChange,
  onSubmit,
}: PredictMatchProps) {
  const prefersReducedMotion = useReducedMotion()
  const journeeUpper = formatJourneeDisplayUpper(match.round)
  const compName = match.competition?.name?.trim() || null

  const [homeBurst, setHomeBurst] = useState(0)
  const [awayBurst, setAwayBurst] = useState(0)

  return (
    <Tilt
      tiltMaxAngleX={prefersReducedMotion ? 0 : 4}
      tiltMaxAngleY={prefersReducedMotion ? 0 : 4}
      perspective={1000}
      glareEnable={!prefersReducedMotion}
      glareMaxOpacity={prefersReducedMotion ? 0 : 0.1}
      className="rounded-2xl [transform-style:preserve-3d]"
    >
      <article className="overflow-hidden rounded-2xl border border-omjep-border bg-omjep-bg-panel shadow-[var(--omjep-shadow-lg)]">
        <header className="relative border-b border-omjep-border/60 px-4 pb-8 pt-7 sm:px-6 sm:pt-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_10%_0%,color-mix(in_srgb,var(--omjep-mauve)_24%,transparent),transparent_58%),radial-gradient(ellipse_at_85%_100%,color-mix(in_srgb,var(--omjep-gold)_12%,transparent),transparent_58%)]" />

          {match.played_at ? (
            <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 text-[11px] text-omjep-text-muted">
              <Clock3 className="h-3.5 w-3.5 shrink-0" />
              {new Date(match.played_at).toLocaleString('fr-FR')}
            </span>
          ) : null}

          <div className="relative mx-auto max-w-xl text-center">
            <p className="font-heading text-2xl font-black tracking-tight text-omjep-text-primary sm:text-3xl">
              {compName ?? '-'}
            </p>
            {journeeUpper ? (
              <p className="mt-2 text-xs font-black uppercase tracking-[0.25em] text-[color-mix(in_srgb,var(--omjep-gold)_86%,var(--omjep-mauve))] sm:text-sm">
                {journeeUpper}
              </p>
            ) : null}
          </div>

          <div className="relative mt-8 flex flex-col items-stretch gap-6 sm:flex-row sm:items-start sm:justify-center sm:gap-8">
            <TeamPod
              team={match.homeTeam}
              form={match.homeTeamForm}
              rank={match.homeTeamRank}
              side="home"
            />

            <div className="flex flex-col items-center justify-center gap-1.5">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--omjep-gold)_35%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-bg-panel-soft)_90%,transparent)]">
                <Sword className="h-5 w-5 text-[color-mix(in_srgb,var(--omjep-gold)_85%,var(--omjep-mauve))]" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-[0.24em] text-omjep-text-muted">Duel</span>
            </div>

            <TeamPod
              team={match.awayTeam}
              form={match.awayTeamForm}
              rank={match.awayTeamRank}
              side="away"
            />
          </div>
        </header>

        <div className="p-4 sm:p-5">
          {already ? (
            <div className="rounded-xl border border-[color-mix(in_srgb,var(--omjep-gold)_35%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_8%,var(--omjep-bg-panel-soft))] px-4 py-3 text-center text-sm font-medium text-omjep-text-secondary">
              Vous avez déjà un pronostic en cours sur ce match.
            </div>
          ) : (
            <div className="mx-auto max-w-xl rounded-xl border border-omjep-border/80 bg-omjep-bg-panel-soft/85 p-4">
              <div className="rounded-xl border border-omjep-border/80 bg-omjep-bg-panel/95 p-3">
                <div className="flex items-end justify-center gap-2 sm:gap-3">
                  <ScoreStepper
                    label="Domicile"
                    value={formHome}
                    onChange={(v) => onChange('home', v)}
                    burstId={homeBurst}
                    onBurst={() => setHomeBurst((k) => k + 1)}
                  />
                  <span className="mb-2 shrink-0 pb-8 font-heading text-2xl font-black text-omjep-text-muted">:</span>
                  <ScoreStepper
                    label="Extérieur"
                    value={formAway}
                    onChange={(v) => onChange('away', v)}
                    burstId={awayBurst}
                    onBurst={() => setAwayBurst((k) => k + 1)}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-omjep-text-muted">
                  <Sparkles className="h-3 w-3 shrink-0 text-[color-mix(in_srgb,var(--omjep-gold)_90%,var(--omjep-mauve))]" />
                  Mise (Jepy)
                </label>
                <input
                  type="number"
                  min={1}
                  value={formBet}
                  onChange={(e) => onChange('bet', e.target.value)}
                  className="omjep-field py-2.5 shadow-[0_0_0_1px_color-mix(in_srgb,var(--omjep-gold)_18%,transparent)] transition focus:border-[color-mix(in_srgb,var(--omjep-gold)_55%,var(--omjep-border))] focus:shadow-[0_0_0_2px_color-mix(in_srgb,var(--omjep-gold)_28%,transparent)]"
                />
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={onSubmit}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--omjep-gold)_52%,var(--omjep-border))] bg-gradient-to-r from-[color-mix(in_srgb,var(--omjep-gold)_18%,var(--omjep-bg-panel-soft))] via-[color-mix(in_srgb,var(--omjep-mauve)_24%,var(--omjep-bg-panel))] to-[color-mix(in_srgb,var(--omjep-gold)_16%,var(--omjep-bg-panel-soft))] py-3 text-sm font-black text-omjep-text-primary shadow-[0_10px_26px_-16px_color-mix(in_srgb,var(--omjep-gold)_55%,transparent)] transition hover:brightness-110 disabled:opacity-55"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
                Valider le prono
              </button>
            </div>
          )}
        </div>
      </article>
    </Tilt>
  )
}
