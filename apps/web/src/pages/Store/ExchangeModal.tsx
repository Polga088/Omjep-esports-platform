import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpDown,
  Coins,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency } from '@/utils/formatCurrency';

/** Taux unifié : 1000 OC ⟷ 1 Jepy */
const OC_PER_JEPY = 1000;

const JEPY_CONFETTI_COLORS = ['#3B82F6', '#60A5FA'];
const OC_CONFETTI_COLORS = ['#EAB308', '#FACC15'];

function fireJepyConfetti() {
  const opts = {
    particleCount: 90,
    spread: 72,
    origin: { y: 0.68 } as const,
    colors: JEPY_CONFETTI_COLORS,
    ticks: 220,
    gravity: 1.05,
    scalar: 1.05,
  };
  void confetti(opts);
  void confetti({
    ...opts,
    particleCount: 55,
    angle: 55,
    spread: 50,
    origin: { x: 0.12, y: 0.68 },
  });
  void confetti({
    ...opts,
    particleCount: 55,
    angle: 125,
    spread: 50,
    origin: { x: 0.88, y: 0.68 },
  });
}

function fireOcConfetti() {
  const opts = {
    particleCount: 90,
    spread: 72,
    origin: { y: 0.68 } as const,
    colors: OC_CONFETTI_COLORS,
    ticks: 220,
    gravity: 1.05,
    scalar: 1.05,
  };
  void confetti(opts);
  void confetti({
    ...opts,
    particleCount: 55,
    angle: 55,
    spread: 50,
    origin: { x: 0.12, y: 0.68 },
  });
  void confetti({
    ...opts,
    particleCount: 55,
    angle: 125,
    spread: 50,
    origin: { x: 0.88, y: 0.68 },
  });
}

type ExchangeMode = 'oc-to-jepy' | 'jepy-to-oc';

interface ExchangeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccessRefresh: () => void | Promise<void>;
  maxOc: number;
  maxJepy: number;
}

export default function ExchangeModal({
  open,
  onClose,
  onSuccessRefresh,
  maxOc,
  maxJepy,
}: ExchangeModalProps) {
  const patchUser = useAuthStore((s) => s.patchUser);
  const [mode, setMode] = useState<ExchangeMode>('oc-to-jepy');
  const [raw, setRaw] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setRaw('');
  }, [open]);

  const parsedAmount = useMemo(() => {
    const n = Number.parseInt(raw.replace(/\D/g, ''), 10);
    return Number.isFinite(n) ? n : 0;
  }, [raw]);

  const validOcToJepy =
    mode === 'oc-to-jepy' &&
    parsedAmount >= OC_PER_JEPY &&
    parsedAmount % OC_PER_JEPY === 0 &&
    parsedAmount <= maxOc;

  const validJepyToOc =
    mode === 'jepy-to-oc' &&
    parsedAmount >= 1 &&
    Number.isInteger(parsedAmount) &&
    parsedAmount <= maxJepy;

  /** Aperçu OC→Jepy dès que le montant est un multiple de 1000 (≥ 1000), ex. 10 000 OC → 10 Jepy */
  const previewJepyFromOc =
    mode === 'oc-to-jepy' &&
    parsedAmount >= OC_PER_JEPY &&
    parsedAmount % OC_PER_JEPY === 0
      ? parsedAmount / OC_PER_JEPY
      : null;

  const jepyGainOcMode = validOcToJepy ? parsedAmount / OC_PER_JEPY : 0;
  const ocGainJepyMode = validJepyToOc ? parsedAmount * OC_PER_JEPY : 0;

  const previewOcFromJepy =
    mode === 'jepy-to-oc' && parsedAmount >= 1 && Number.isInteger(parsedAmount)
      ? parsedAmount * OC_PER_JEPY
      : null;

  const valid =
    mode === 'oc-to-jepy' ? validOcToJepy : validJepyToOc;

  const toggleMode = () => {
    setMode((m) => (m === 'oc-to-jepy' ? 'jepy-to-oc' : 'oc-to-jepy'));
    setRaw('');
  };

  const handleSubmit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      if (mode === 'oc-to-jepy') {
        const { data } = await api.post<{
          user: { omjepCoins: number; jepyCoins: number };
        }>('/wallets/exchange', { oc_amount: parsedAmount });
        toast.success(
          `Félicitations ! Vous avez reçu ${formatCurrency(jepyGainOcMode, 'Jepy')}.`,
        );
        fireJepyConfetti();
        if (data?.user) {
          patchUser({
            omjepCoins: data.user.omjepCoins,
            jepyCoins: data.user.jepyCoins,
          });
        }
      } else {
        const { data } = await api.post<{
          user: { omjepCoins: number; jepyCoins: number };
        }>('/wallets/exchange-reverse', { jepy_amount: parsedAmount });
        toast.success(
          `Félicitations ! Vous avez reçu ${formatCurrency(ocGainJepyMode, 'OC')}.`,
        );
        fireOcConfetti();
        if (data?.user) {
          patchUser({
            omjepCoins: data.user.omjepCoins,
            jepyCoins: data.user.jepyCoins,
          });
        }
      }
      await onSuccessRefresh();
      setRaw('');
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response
        ?.data?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : msg;
      toast.error(typeof text === 'string' ? text : 'Échange impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const inputLabel = mode === 'oc-to-jepy' ? 'Montant (OC)' : 'Montant (Jepy)';

  const hintInvalid =
    mode === 'oc-to-jepy' && parsedAmount > 0 && !validOcToJepy
      ? parsedAmount < OC_PER_JEPY
        ? `Minimum ${OC_PER_JEPY} OC.`
        : parsedAmount % OC_PER_JEPY !== 0
          ? `Utilisez un multiple de ${OC_PER_JEPY} OC.`
          : parsedAmount > maxOc
            ? 'Solde OMJEP insuffisant.'
            : null
      : mode === 'jepy-to-oc' && parsedAmount > 0 && !validJepyToOc
        ? parsedAmount < 1
          ? 'Minimum 1 Jepy.'
          : !Number.isInteger(parsedAmount)
            ? 'Montant entier uniquement.'
            : parsedAmount > maxJepy
              ? 'Solde Jepy insuffisant.'
              : null
        : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exchange-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Fermer"
        onClick={() => !submitting && onClose()}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0B0D13] shadow-2xl shadow-black/60"
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="flex flex-col gap-1">
            <h2 id="exchange-modal-title" className="text-lg font-bold text-white">
              Échange de monnaie
            </h2>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Double sens
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={toggleMode}
              className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-2 text-xs font-bold text-slate-300 transition hover:border-cyan-500/40 hover:text-white"
              title="Inverser le sens"
              aria-label="Changer le sens de conversion"
            >
              <ArrowUpDown className="h-4 w-4" />
              <span className="hidden sm:inline">Switch</span>
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-5 py-6">
          {mode === 'oc-to-jepy' ? (
            <p className="text-sm text-slate-500">
              Taux :{' '}
              <span className="font-semibold text-slate-300">1 Jepy = 1000 OC</span>
              . Montant en multiple de 1000.
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              Taux :{' '}
              <span className="font-semibold text-slate-300">1 Jepy = 1000 OC</span>
              . Minimum 1 Jepy, montant entier.
            </p>
          )}

          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {inputLabel}
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder={mode === 'oc-to-jepy' ? 'ex. 10000' : 'ex. 2'}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-lg font-bold tabular-nums text-white placeholder:text-slate-600 focus:border-amber-400/40 focus:outline-none"
            />
            {hintInvalid && (
              <p className="mt-2 text-xs text-amber-500/90">{hintInvalid}</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/30 px-4 py-4">
            {mode === 'oc-to-jepy' ? (
              <>
                <div className="flex flex-col items-center gap-1">
                  <Coins className="h-8 w-8 text-amber-400" />
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">
                    OMJEP
                  </span>
                  <span className="text-sm font-bold tabular-nums text-white">
                    {parsedAmount > 0 ? formatCurrency(parsedAmount, 'OC') : '—'}
                  </span>
                </div>
                <motion.div
                  animate={{
                    x: [0, 4, 0],
                    opacity: [0.65, 1, 0.65],
                    scale: [1, 1.08, 1],
                  }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="flex flex-col items-center text-cyan-400"
                >
                  <ArrowRight className="h-7 w-7" strokeWidth={2.5} />
                </motion.div>
                <div className="flex flex-col items-center gap-1">
                  <Sparkles className="h-8 w-8 text-cyan-400" />
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">
                    Jepy
                  </span>
                  <span className="text-2xl font-black tabular-nums text-cyan-200">
                    {previewJepyFromOc != null
                      ? formatCurrency(previewJepyFromOc, 'Jepy')
                      : '—'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col items-center gap-1">
                  <Sparkles className="h-8 w-8 text-cyan-400" />
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">
                    Jepy
                  </span>
                  <span className="text-sm font-bold tabular-nums text-cyan-100">
                    {parsedAmount > 0 ? formatCurrency(parsedAmount, 'Jepy') : '—'}
                  </span>
                </div>
                <motion.div
                  animate={{
                    x: [0, 4, 0],
                    opacity: [0.65, 1, 0.65],
                    scale: [1, 1.08, 1],
                  }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="flex flex-col items-center text-amber-400"
                >
                  <ArrowRight className="h-7 w-7" strokeWidth={2.5} />
                </motion.div>
                <div className="flex flex-col items-center gap-1">
                  <Coins className="h-8 w-8 text-amber-400" />
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">
                    OMJEP
                  </span>
                  <span className="text-2xl font-black tabular-nums text-amber-100">
                    {previewOcFromJepy != null
                      ? formatCurrency(previewOcFromJepy, 'OC')
                      : '—'}
                  </span>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            disabled={!valid || submitting}
            onClick={() => void handleSubmit()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 py-3 text-sm font-bold text-[#0B0D13] shadow-lg shadow-amber-500/20 transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Confirmer l’échange'
            )}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
