import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Tilt from 'react-parallax-tilt';
import {
  Clock,
  Loader2,
  Minus,
  Plus,
  Sparkles,
  Trophy,
} from 'lucide-react';
import type { TeamFormLetter } from './predictionTypes';

export function formatJourneeLabel(round: string | null | undefined): string | null {
  if (!round?.trim()) return null;
  const t = round.trim();
  if (/^\d+$/.test(t)) return `Journée ${t}`;
  return t;
}

/** Affichage type « JOURNÉE 8 » pour l’en-tête néon. */
function formatJourneeDisplayUpper(round: string | null | undefined): string | null {
  if (!round?.trim()) return null;
  const t = round.trim();
  if (/^\d+$/.test(t)) return `JOURNÉE ${t}`;
  return formatJourneeLabel(round)?.toUpperCase() ?? t.toUpperCase();
}

function formLetterToLabel(letter: TeamFormLetter): 'V' | 'N' | 'D' {
  if (letter === 'W') return 'V';
  if (letter === 'D') return 'N';
  return 'D';
}

const FORM_SLOT_COUNT = 5;

/** Pastilles de forme (V/N/D) — vert / gris / rouge. */
export function TeamForm({ form }: { form: TeamFormLetter[] }) {
  const slots: (TeamFormLetter | null)[] = Array.from(
    { length: FORM_SLOT_COUNT },
    (_, i) => form[i] ?? null,
  );

  return (
    <div className="flex justify-center gap-1.5" aria-label="Forme des 5 derniers matchs">
      {slots.map((letter, idx) => {
        if (!letter) {
          return (
            <span
              key={`empty-${idx}`}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-omjep-border/60 bg-omjep-bg-panel-soft text-[9px] font-bold text-omjep-text-muted"
            >
              —
            </span>
          );
        }
        const label = formLetterToLabel(letter);
        const base =
          letter === 'W'
            ? 'border-emerald-500/45 bg-emerald-500/15 text-emerald-800 shadow-sm dark:border-emerald-400/80 dark:bg-emerald-500/25 dark:text-emerald-200 dark:shadow-[0_0_12px_rgba(52,211,153,0.45)]'
            : letter === 'D'
              ? 'border-omjep-border/80 bg-omjep-bg-panel-soft text-omjep-text-secondary shadow-sm dark:border-slate-400/70 dark:bg-slate-500/30 dark:text-slate-200 dark:shadow-[0_0_10px_rgba(148,163,184,0.35)]'
              : 'border-rose-500/45 bg-rose-500/15 text-rose-800 shadow-sm dark:border-rose-400/80 dark:bg-rose-600/30 dark:text-rose-100 dark:shadow-[0_0_12px_rgba(251,113,133,0.45)]';
        return (
          <span
            key={`${idx}-${letter}`}
            className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-black ${base}`}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

/** Badge hexagonal pour le rang (#1, #2, …). */
function RankHexBadge({ rank }: { rank: number }) {
  return (
    <span
      className="relative inline-flex h-9 w-[2.1rem] shrink-0 items-center justify-center bg-gradient-to-b from-[color-mix(in_srgb,var(--omjep-mauve)_35%,var(--omjep-bg-panel))] to-[color-mix(in_srgb,var(--omjep-bg-panel-soft)_90%,var(--omjep-mauve))] text-[11px] font-black tabular-nums text-[color-mix(in_srgb,var(--omjep-gold)_88%,var(--omjep-text-primary))] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--omjep-text-primary)_12%,transparent)] ring-1 ring-omjep-border/50 dark:from-slate-500/90 dark:to-slate-800 dark:text-amber-50 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_12px_rgba(15,23,42,0.8)] dark:ring-white/10"
      style={{
        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
      }}
      title={`Rang ${rank}`}
    >
      #{rank}
    </span>
  );
}

/** Particules dorées autour du score au clic sur + / −. */
function GoldenScoreBurst({ burstId }: { burstId: number }) {
  const particles = useMemo(() => {
    if (!burstId) return [];
    const count = 14;
    return Array.from({ length: count }, (_, i) => {
      const baseAngle = (i / count) * Math.PI * 2;
      const jitter = ((burstId * 13 + i * 7) % 17) / 100 - 0.08;
      const angle = baseAngle + jitter;
      const dist = 26 + ((burstId + i * 11) % 22);
      return { angle, dist, i };
    });
  }, [burstId]);

  if (particles.length === 0) return null;

  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
      {particles.map(({ angle, dist, i }) => (
        <motion.span
          key={`${burstId}-${i}`}
          className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-[#EAB308]"
          style={{ boxShadow: '0 0 10px rgba(234, 179, 8, 0.9)' }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1.15 }}
          animate={{
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist,
            opacity: 0,
            scale: 0.1,
          }}
          transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </div>
  );
}

function ScoreStepper({
  label,
  value,
  onChange,
  burstId,
  onBurst,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  burstId: number;
  onBurst: () => void;
}) {
  const n = Math.max(0, Number.parseInt(value, 10) || 0);

  const apply = (next: number) => {
    const clamped = Math.max(0, Math.min(99, next));
    onChange(String(clamped));
    onBurst();
  };

  return (
    <div className="flex-1">
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-omjep-text-muted">
        {label}
      </label>
      <div className="relative flex items-center justify-between gap-1 rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft/90 px-1 py-1.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
        <GoldenScoreBurst burstId={burstId} />
        <button
          type="button"
          onClick={() => apply(n - 1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-omjep-border/70 bg-omjep-bg-panel text-omjep-text-secondary transition hover:border-[color-mix(in_srgb,var(--omjep-gold)_40%,var(--omjep-border))] hover:bg-[color-mix(in_srgb,var(--omjep-gold)_10%,transparent)] hover:text-omjep-text-primary active:scale-95 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:text-amber-200"
          aria-label={`Diminuer le score ${label}`}
        >
          <Minus className="h-4 w-4" strokeWidth={2.5} />
        </button>
        <motion.span
          key={n}
          className="inline-block min-w-[2.5rem] text-center text-2xl font-black tabular-nums text-omjep-text-primary"
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 520,
            damping: 16,
            mass: 0.55,
          }}
        >
          {n}
        </motion.span>
        <button
          type="button"
          onClick={() => apply(n + 1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-omjep-border/70 bg-omjep-bg-panel text-omjep-text-secondary transition hover:border-[color-mix(in_srgb,var(--omjep-gold)_40%,var(--omjep-border))] hover:bg-[color-mix(in_srgb,var(--omjep-gold)_10%,transparent)] hover:text-omjep-text-primary active:scale-95 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:text-amber-200"
          aria-label={`Augmenter le score ${label}`}
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

export interface PredictMatchRow {
  id: string;
  round: string | null;
  played_at: string | null;
  competition: { id: string; name: string; type: string } | null;
  homeTeam: { id: string; name: string; logo_url: string | null };
  awayTeam: { id: string; name: string; logo_url: string | null };
  homeTeamForm: TeamFormLetter[];
  awayTeamForm: TeamFormLetter[];
  homeTeamRank: number | null;
  awayTeamRank: number | null;
}

interface PredictMatchProps {
  match: PredictMatchRow;
  formHome: string;
  formAway: string;
  formBet: string;
  already: boolean;
  submitting: boolean;
  onChange: (field: 'home' | 'away' | 'bet', value: string) => void;
  onSubmit: () => void;
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
  const prefersReducedMotion = useReducedMotion();
  const journeeUpper = formatJourneeDisplayUpper(match.round);
  const compName = match.competition?.name?.trim() || null;

  const [homeBurst, setHomeBurst] = useState(0);
  const [awayBurst, setAwayBurst] = useState(0);

  return (
    <Tilt
      tiltMaxAngleX={prefersReducedMotion ? 0 : 4}
      tiltMaxAngleY={prefersReducedMotion ? 0 : 4}
      perspective={1000}
      glareEnable={!prefersReducedMotion}
      glareMaxOpacity={prefersReducedMotion ? 0 : 0.12}
      className="rounded-2xl [transform-style:preserve-3d]"
    >
      <div className="overflow-hidden rounded-2xl border border-omjep-border bg-omjep-bg-panel/95 shadow-[var(--omjep-shadow-lg)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-[color-mix(in_srgb,var(--omjep-bg-panel)_88%,#050508)] dark:shadow-xl dark:shadow-black/40">
        {/* En-tête agrandi, centré */}
        <div className="relative border-b border-omjep-border/50 bg-gradient-to-b from-omjep-bg-panel-soft/90 to-transparent px-4 pb-8 pt-10 dark:border-white/[0.06] dark:from-white/[0.06] sm:px-8 sm:pb-10 sm:pt-12">
          {match.played_at && (
            <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 text-[11px] text-omjep-text-muted">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {new Date(match.played_at).toLocaleString('fr-FR')}
            </span>
          )}

          <div className="mx-auto max-w-xl text-center">
            <p className="text-2xl font-black tracking-tight text-omjep-text-primary drop-shadow-sm sm:text-3xl">
              {compName ?? '—'}
            </p>
            {journeeUpper && (
              <p className="mt-3 text-sm font-black uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-400 sm:text-base dark:[text-shadow:0_0_24px_rgba(16,185,129,0.45),0_0_8px_rgba(16,185,129,0.35)]">
                {journeeUpper}
              </p>
            )}
          </div>

          {/* Parties : logo → forme → rang hex + nom */}
          <div className="mt-10 flex flex-col items-stretch gap-6 sm:flex-row sm:items-start sm:justify-center sm:gap-8">
            <div className="flex flex-1 flex-col items-center gap-3 text-center">
              {match.homeTeam.logo_url ? (
                <img
                  src={match.homeTeam.logo_url}
                  alt=""
                  className="h-16 w-16 rounded-2xl object-cover ring-1 ring-omjep-border/60 dark:ring-white/10 sm:h-[72px] sm:w-[72px]"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-omjep-bg-panel-soft text-xl font-bold text-omjep-text-muted dark:bg-white/5 dark:text-slate-400 sm:h-[72px] sm:w-[72px]">
                  {(match.homeTeam.name ?? '??').slice(0, 2).toUpperCase()}
                </div>
              )}
              <TeamForm form={match.homeTeamForm} />
              <div className="flex max-w-[220px] items-center justify-center gap-2">
                {match.homeTeamRank != null && <RankHexBadge rank={match.homeTeamRank} />}
                <span className="min-w-0 text-left text-sm font-bold leading-tight text-omjep-text-primary sm:text-base">
                  {match.homeTeam.name ?? '—'}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-1.5">
              <span className="text-3xl font-black uppercase tracking-[0.2em] text-omjep-text-muted">
                VS
              </span>
              <span className="h-px w-12 bg-gradient-to-r from-transparent via-omjep-border to-transparent" />
            </div>

            <div className="flex flex-1 flex-col items-center gap-3 text-center">
              {match.awayTeam.logo_url ? (
                <img
                  src={match.awayTeam.logo_url}
                  alt=""
                  className="h-16 w-16 rounded-2xl object-cover ring-1 ring-omjep-border/60 dark:ring-white/10 sm:h-[72px] sm:w-[72px]"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-omjep-bg-panel-soft text-xl font-bold text-omjep-text-muted dark:bg-white/5 dark:text-slate-400 sm:h-[72px] sm:w-[72px]">
                  {(match.awayTeam.name ?? '??').slice(0, 2).toUpperCase()}
                </div>
              )}
              <TeamForm form={match.awayTeamForm} />
              <div className="flex max-w-[220px] items-center justify-center gap-2">
                {match.awayTeamRank != null && <RankHexBadge rank={match.awayTeamRank} />}
                <span className="min-w-0 text-left text-sm font-bold leading-tight text-omjep-text-primary sm:text-base">
                  {match.awayTeam.name ?? '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {already ? (
            <p className="text-center text-sm text-amber-700 dark:text-amber-400/90">
              Vous avez déjà un pronostic en cours sur ce match.
            </p>
          ) : (
            <div className="mx-auto max-w-md rounded-2xl border border-omjep-border bg-omjep-bg-panel-soft/95 p-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50 sm:p-5">
              {/* Snake border — uniquement autour de la saisie des scores */}
              {prefersReducedMotion ? (
                <div className="rounded-xl border border-omjep-border/80 bg-omjep-bg-elevated/95 p-3 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#0a0d14]/95">
                  <div className="flex items-end justify-center gap-2 sm:gap-3">
                    <ScoreStepper
                      label="Domicile"
                      value={formHome}
                      onChange={(v) => onChange('home', v)}
                      burstId={homeBurst}
                      onBurst={() => setHomeBurst((k) => k + 1)}
                    />
                    <span className="mb-2 shrink-0 pb-8 text-lg font-black text-omjep-text-muted">:</span>
                    <ScoreStepper
                      label="Extérieur"
                      value={formAway}
                      onChange={(v) => onChange('away', v)}
                      burstId={awayBurst}
                      onBurst={() => setAwayBurst((k) => k + 1)}
                    />
                  </div>
                </div>
              ) : (
                <div className="predict-match-snake-border">
                  <div className="predict-match-snake-border__rotate" aria-hidden />
                  <div className="predict-match-snake-border__inner border border-omjep-border/80 bg-omjep-bg-elevated/95 p-3 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#0a0d14]/95">
                    <div className="flex items-end justify-center gap-2 sm:gap-3">
                      <ScoreStepper
                        label="Domicile"
                        value={formHome}
                        onChange={(v) => onChange('home', v)}
                        burstId={homeBurst}
                        onBurst={() => setHomeBurst((k) => k + 1)}
                      />
                      <span className="mb-2 shrink-0 pb-8 text-lg font-black text-omjep-text-muted">:</span>
                      <ScoreStepper
                        label="Extérieur"
                        value={formAway}
                        onChange={(v) => onChange('away', v)}
                        burstId={awayBurst}
                        onBurst={() => setAwayBurst((k) => k + 1)}
                      />
                    </div>
                  </div>
                </div>
              )}

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
                  className="omjep-field py-2.5 shadow-[0_0_0_1px_color-mix(in_srgb,var(--omjep-gold)_18%,transparent)] transition focus:border-[color-mix(in_srgb,var(--omjep-gold)_55%,var(--omjep-border))] focus:shadow-[0_0_0_2px_color-mix(in_srgb,var(--omjep-gold)_28%,transparent)] dark:bg-white/[0.04] dark:shadow-[0_0_0_1px_rgba(234,179,8,0.15)]"
                />
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={onSubmit}
                className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-800 py-3 text-sm font-bold text-white shadow-md transition hover:brightness-110 disabled:opacity-50 disabled:shadow-none disabled:animate-none dark:from-emerald-500 dark:to-emerald-700 ${
                  !submitting && !prefersReducedMotion ? 'predict-match-submit-pulse' : ''
                }`}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trophy className="h-4 w-4" />
                )}
                Valider le prono
              </button>
            </div>
          )}
        </div>
      </div>
    </Tilt>
  );
}
