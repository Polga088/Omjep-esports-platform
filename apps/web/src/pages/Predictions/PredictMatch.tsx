import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
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
              className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[9px] font-bold text-slate-600"
            >
              —
            </span>
          );
        }
        const label = formLetterToLabel(letter);
        const base =
          letter === 'W'
            ? 'border-emerald-400/80 bg-emerald-500/25 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.55)]'
            : letter === 'D'
              ? 'border-slate-400/70 bg-slate-500/30 text-slate-200 shadow-[0_0_10px_rgba(148,163,184,0.45)]'
              : 'border-rose-400/80 bg-rose-600/30 text-rose-100 shadow-[0_0_12px_rgba(251,113,133,0.55)]';
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
      className="relative inline-flex h-9 w-[2.1rem] shrink-0 items-center justify-center bg-gradient-to-b from-slate-500/90 to-slate-800 text-[11px] font-black tabular-nums text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_12px_rgba(15,23,42,0.8)] ring-1 ring-white/10"
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
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </label>
      <div className="relative flex items-center justify-between gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-1 py-1.5 backdrop-blur-sm">
        <GoldenScoreBurst burstId={burstId} />
        <button
          type="button"
          onClick={() => apply(n - 1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-slate-300 transition hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-200 active:scale-95"
          aria-label={`Diminuer le score ${label}`}
        >
          <Minus className="h-4 w-4" strokeWidth={2.5} />
        </button>
        <motion.span
          key={n}
          className="inline-block min-w-[2.5rem] text-center text-2xl font-black tabular-nums text-white"
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
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-slate-300 transition hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-200 active:scale-95"
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
  const journeeUpper = formatJourneeDisplayUpper(match.round);
  const compName = match.competition?.name?.trim() || null;

  const [homeBurst, setHomeBurst] = useState(0);
  const [awayBurst, setAwayBurst] = useState(0);

  return (
    <Tilt
      tiltMaxAngleX={4}
      tiltMaxAngleY={4}
      perspective={1000}
      glareEnable
      glareMaxOpacity={0.15}
      className="rounded-2xl [transform-style:preserve-3d]"
    >
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0B0D13]/90 shadow-xl shadow-black/40 backdrop-blur-xl">
        {/* En-tête agrandi, centré */}
        <div className="relative border-b border-white/[0.06] bg-gradient-to-b from-white/[0.06] to-transparent px-4 pb-8 pt-10 sm:px-8 sm:pb-10 sm:pt-12">
          {match.played_at && (
            <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 text-[11px] text-slate-500">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {new Date(match.played_at).toLocaleString('fr-FR')}
            </span>
          )}

          <div className="mx-auto max-w-xl text-center">
            <p className="text-2xl font-black tracking-tight text-white drop-shadow-sm sm:text-3xl">
              {compName ?? '—'}
            </p>
            {journeeUpper && (
              <p
                className="mt-3 text-sm font-black uppercase tracking-[0.22em] sm:text-base"
                style={{
                  color: '#10B981',
                  textShadow: '0 0 24px rgba(16, 185, 129, 0.55), 0 0 8px rgba(16, 185, 129, 0.4)',
                }}
              >
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
                  className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/10 sm:h-[72px] sm:w-[72px]"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-xl font-bold text-slate-400 sm:h-[72px] sm:w-[72px]">
                  {(match.homeTeam.name ?? '??').slice(0, 2).toUpperCase()}
                </div>
              )}
              <TeamForm form={match.homeTeamForm} />
              <div className="flex max-w-[220px] items-center justify-center gap-2">
                {match.homeTeamRank != null && <RankHexBadge rank={match.homeTeamRank} />}
                <span className="min-w-0 text-left text-sm font-bold leading-tight text-white sm:text-base">
                  {match.homeTeam.name ?? '—'}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-1.5">
              <span className="text-3xl font-black uppercase tracking-[0.2em] text-slate-700/90">
                VS
              </span>
              <span className="h-px w-12 bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
            </div>

            <div className="flex flex-1 flex-col items-center gap-3 text-center">
              {match.awayTeam.logo_url ? (
                <img
                  src={match.awayTeam.logo_url}
                  alt=""
                  className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/10 sm:h-[72px] sm:w-[72px]"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-xl font-bold text-slate-400 sm:h-[72px] sm:w-[72px]">
                  {(match.awayTeam.name ?? '??').slice(0, 2).toUpperCase()}
                </div>
              )}
              <TeamForm form={match.awayTeamForm} />
              <div className="flex max-w-[220px] items-center justify-center gap-2">
                {match.awayTeamRank != null && <RankHexBadge rank={match.awayTeamRank} />}
                <span className="min-w-0 text-left text-sm font-bold leading-tight text-white sm:text-base">
                  {match.awayTeam.name ?? '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {already ? (
            <p className="text-center text-sm text-amber-400/90">
              Vous avez déjà un pronostic en cours sur ce match.
            </p>
          ) : (
            <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900/50 p-4 backdrop-blur-sm sm:p-5">
              {/* Snake border — uniquement autour de la saisie des scores */}
              <div className="predict-match-snake-border">
                <div className="predict-match-snake-border__rotate" aria-hidden />
                <div className="predict-match-snake-border__inner border border-slate-800/80 bg-[#0a0d14]/95 p-3 backdrop-blur-md">
                  <div className="flex items-end justify-center gap-2 sm:gap-3">
                    <ScoreStepper
                      label="Domicile"
                      value={formHome}
                      onChange={(v) => onChange('home', v)}
                      burstId={homeBurst}
                      onBurst={() => setHomeBurst((k) => k + 1)}
                    />
                    <span className="mb-2 shrink-0 pb-8 text-lg font-black text-slate-600">:</span>
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

              <div className="mt-4">
                <label className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <Sparkles className="h-3 w-3 text-[#EAB308]" />
                  Mise (Jepy)
                </label>
                <input
                  type="number"
                  min={1}
                  value={formBet}
                  onChange={(e) => onChange('bet', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-white shadow-[0_0_0_1px_rgba(234,179,8,0.15)] backdrop-blur-sm transition focus:border-[#EAB308]/60 focus:outline-none focus:shadow-[0_0_0_1px_rgba(234,179,8,0.35),0_0_20px_rgba(234,179,8,0.25)]"
                />
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={onSubmit}
                className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-700 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50 disabled:shadow-none disabled:animate-none ${
                  !submitting ? 'predict-match-submit-pulse' : ''
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
