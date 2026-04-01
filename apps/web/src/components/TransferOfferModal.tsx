import { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Loader2,
  Wallet,
  AlertTriangle,
  User,
  ArrowRight,
  FileText,
  Scale,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { formatCurrency } from '@/utils/formatCurrency';

/** Semaines → mois (aligné 52 sem. = 12 mois), borné 1–60 pour l’API. */
function weeksToDurationMonths(weeks: number): number {
  if (!Number.isFinite(weeks) || weeks <= 0) return 12;
  const m = Math.round((weeks * 12) / 52);
  return Math.min(60, Math.max(1, m));
}

interface Props {
  open: boolean;
  onClose: () => void;
  player: {
    id: string;
    name: string;
    position: string | null;
    teamId: string;
    teamName: string;
    marketValue: number | null;
  };
  myTeam: {
    id: string;
    name: string;
    budget: number;
  };
  onSuccess?: () => void;
}

export default function TransferOfferModal({ open, onClose, player, myTeam, onSuccess }: Props) {
  const [transferFee, setTransferFee] = useState('');
  const [weeklySalary, setWeeklySalary] = useState('');
  const [releaseClause, setReleaseClause] = useState('');
  const [durationWeeks, setDurationWeeks] = useState(52);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const hint = player.marketValue ?? 5_000_000;
      setTransferFee(String(hint));
      const annualSalary = Math.max(100_000, Math.round(hint * 0.08));
      setWeeklySalary(String(Math.max(1, Math.round(annualSalary / 52))));
      setReleaseClause(String(Math.round(hint * 1.2)));
      setDurationWeeks(52);
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, player.marketValue]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const numFee = Number(transferFee) || 0;
  const numWeekly = Number(weeklySalary) || 0;
  const annualCost = numWeekly * 52;
  const numClause = Number(releaseClause) || 0;
  const totalCommitment = numFee + annualCost;
  const remainingBalance = myTeam.budget - totalCommitment;
  const overBudget = totalCommitment > myTeam.budget;
  const invalid = numFee <= 0 || numWeekly <= 0 || numClause <= 0 || durationWeeks < 1;
  const durationMonths = weeksToDurationMonths(durationWeeks);
  const canSubmit = !invalid && !overBudget && !sending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSending(true);
    setError('');
    try {
      await api.post('/transfers/offer', {
        player_id: player.id,
        from_team_id: myTeam.id,
        to_team_id: player.teamId,
        transfer_fee: numFee,
        salaryPropose: numWeekly,
        releaseClausePropose: numClause,
        offered_salary: annualCost,
        offered_clause: numClause,
        duration_months: durationMonths,
      });
      toast.success(`Contrat proposé à ${player.name} — en attente de signature.`);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg ?? "Erreur lors de l'envoi de l'offre.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#030712]/85 backdrop-blur-md" onClick={onClose} aria-hidden />

      <div
        className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl border border-[#c9a227]/25 shadow-[0_0_0_1px_rgba(201,162,39,0.08),0_25px_80px_-12px_rgba(0,0,0,0.85)] animate-in fade-in zoom-in-95 duration-200"
        style={{
          background:
            'linear-gradient(165deg, rgba(15,23,42,0.98) 0%, rgba(8,12,24,0.99) 45%, rgba(6,8,18,1) 100%)',
        }}
      >
        {/* Filigrane décoratif */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04] rounded-2xl"
          style={{
            backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 12px, rgba(201,162,39,0.5) 12px, rgba(201,162,39,0.5) 13px)`,
          }}
        />

        <header className="relative border-b border-[#c9a227]/20 px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#c9a227]/35 bg-gradient-to-br from-[#c9a227]/15 to-transparent shadow-inner">
                <FileText className="h-6 w-6 text-[#e8d48b]" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#a89f7a]/90">
                  Négociation · OMJEP Coins
                </p>
                <h2 className="mt-1 font-serif text-xl font-semibold tracking-tight text-[#faf8f3] md:text-2xl">
                  Offre contractuelle
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Proposition engageante — frais de transfert, rémunération et clause libératoire.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-white"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Parties */}
        <div className="relative border-b border-white/5 px-6 py-5">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#c9a227]/80">
            <Scale className="h-3.5 w-3.5" />
            Parties
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Joueur ciblé</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#c9a227]/20 bg-gradient-to-br from-[#c9a227]/10 to-transparent text-base font-bold text-[#e8d48b]">
                  {(player.name ?? '?').charAt(0) || '?'}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{player.name}</p>
                  <p className="text-xs text-slate-500">
                    {player.position ?? '—'} · {player.teamName}
                  </p>
                </div>
              </div>
            </div>
            <ArrowRight className="mx-auto hidden h-5 w-5 text-[#c9a227]/40 sm:block" />
            <div className="rounded-xl border border-[#c9a227]/15 bg-[#c9a227]/[0.06] p-3">
              <p className="text-[10px] uppercase tracking-wide text-[#a89f7a]">Club employeur (vous)</p>
              <div className="mt-2 flex items-center gap-2">
                <Building2 className="h-4 w-4 shrink-0 text-[#e8d48b]/80" />
                <p className="font-semibold text-[#faf8f3]">{myTeam.name}</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="relative space-y-5 px-6 py-6">
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <Wallet className="h-3.5 w-3.5 text-[#c9a227]/70" />
              Conditions financières
            </h3>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-400">
                  Montant du transfert (vers le club vendeur) · OC
                </span>
                <input
                  ref={inputRef}
                  type="number"
                  min={1}
                  step={1000}
                  required
                  value={transferFee}
                  onChange={(e) => {
                    setTransferFee(e.target.value);
                    if (error) setError('');
                  }}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white tabular-nums placeholder:text-slate-600 focus:border-[#c9a227]/45 focus:outline-none focus:ring-2 focus:ring-[#c9a227]/15"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-400">
                  Salaire hebdomadaire proposé (OC)
                </span>
                <input
                  type="number"
                  min={1}
                  step={100}
                  required
                  value={weeklySalary}
                  onChange={(e) => setWeeklySalary(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white tabular-nums focus:border-[#c9a227]/45 focus:outline-none focus:ring-2 focus:ring-[#c9a227]/15"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-400">Clause libératoire (OC)</span>
                <input
                  type="number"
                  min={1}
                  step={1000}
                  required
                  value={releaseClause}
                  onChange={(e) => setReleaseClause(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white tabular-nums focus:border-[#c9a227]/45 focus:outline-none focus:ring-2 focus:ring-[#c9a227]/15"
                />
              </label>

              <div>
                <span className="mb-1.5 block text-xs font-medium text-slate-400">
                  Durée du contrat (en semaines)
                </span>
                <div className="flex flex-wrap gap-2">
                  {[26, 39, 52, 78, 104].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setDurationWeeks(w)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                        durationWeeks === w
                          ? 'border-[#c9a227]/50 bg-[#c9a227]/15 text-[#e8d48b]'
                          : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20'
                      }`}
                    >
                      {w} sem.
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={260}
                    value={durationWeeks}
                    onChange={(e) => setDurationWeeks(Math.max(1, Number(e.target.value) || 1))}
                    className="w-28 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white tabular-nums focus:border-[#c9a227]/45 focus:outline-none"
                  />
                  <span className="text-xs text-slate-500">
                    → équivalent env. <span className="font-semibold text-slate-400">{durationMonths} mois</span> (envoi API)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Calcul dynamique */}
          <div className="rounded-xl border border-[#c9a227]/20 bg-gradient-to-br from-[#c9a227]/[0.07] to-transparent p-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-[#a89f7a]">
              Mémo · coût première année
            </p>
            <div className="space-y-2 font-mono text-sm text-slate-300">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/5 pb-2">
                <span className="text-slate-500">Salaire hebdo × 52</span>
                <span className="text-right tabular-nums text-white">
                  <span className="text-slate-300">
                    {numWeekly.toLocaleString('fr-FR')} OC × 52 =
                  </span>{' '}
                  <span className="font-semibold text-[#e8d48b]">{formatCurrency(annualCost, 'OC')}</span>
                  <span className="ml-1 text-[11px] font-sans text-slate-500">(coût annuel)</span>
                </span>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 pt-1">
                <span className="text-slate-500">+ Montant transfert</span>
                <span className="tabular-nums font-semibold text-white">{formatCurrency(numFee, 'OC')}</span>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-[#c9a227]/20 pt-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Engagement total (année 1)</span>
                <span className="text-base font-bold tabular-nums text-[#e8d48b]">{formatCurrency(totalCommitment, 'OC')}</span>
              </div>
            </div>
          </div>

          {/* Solde club */}
          <div className="overflow-hidden rounded-xl border border-white/8 bg-black/30">
            <div className="grid divide-y divide-white/[0.06] sm:grid-cols-1">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  <User className="h-3.5 w-3.5" />
                  Budget club actuel
                </span>
                <span className="text-sm font-bold tabular-nums text-emerald-400/95">
                  {formatCurrency(myTeam.budget, 'OC')}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-slate-500">Après transfert + 1ʳᵉ année de salaire</span>
                <span className={`text-sm font-black tabular-nums ${overBudget ? 'text-red-400' : 'text-emerald-400'}`}>
                  {totalCommitment > 0 ? formatCurrency(remainingBalance, 'OC') : '—'}
                </span>
              </div>
            </div>
            <p className="border-t border-white/5 bg-white/[0.02] px-4 py-2 text-[10px] text-slate-500">
              Solde restant du club = budget − (montant transfert + coût annuel de salaire).
            </p>
          </div>

          {overBudget && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-xs leading-relaxed text-red-300/95">
                Budget insuffisant : l’engagement dépasse le trésor du club. Ajustez les montants ou le salaire
                hebdomadaire.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-xs text-red-300/95">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold transition ${
              canSubmit
                ? 'bg-gradient-to-r from-[#c9a227] via-[#d4af37] to-[#b8860b] text-[#0a0a0a] shadow-lg shadow-[#c9a227]/20 hover:brightness-105 active:scale-[0.99]'
                : 'cursor-not-allowed bg-slate-700/80 text-slate-500 shadow-inner'
            }`}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? 'Envoi en cours…' : 'Envoyer le contrat'}
          </button>
        </form>
      </div>
    </div>
  );
}
