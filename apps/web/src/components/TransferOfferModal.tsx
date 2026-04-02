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
  Clock,
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

/** Offre déjà envoyée par le club acheteur pour ce joueur (formulaire remplacé par le récap). */
export type PendingOfferRecap = {
  id: string;
  transfer_fee: number;
  offered_salary: number;
  offered_clause: number;
  duration_months: number;
  status: 'PENDING' | 'COUNTER_OFFER';
  negotiation_turn: 'PLAYER' | 'BUYING_CLUB';
};

interface Props {
  /** Alias de `isOpen` pour compatibilité */
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  player: {
    id: string;
    name: string;
    position: string | null;
    teamId: string;
    teamName: string;
    marketValue: number | null;
    /** Agent libre sans club : frais 0, API envoie `to_team_id: null` */
    isFreeAgent?: boolean;
  };
  myTeam: {
    id: string;
    name: string;
    budget: number;
  };
  onSuccess?: () => void;
  /** Si défini : pas de nouveau formulaire, affichage du récapitulatif en attente */
  pendingOfferFromMyClub?: PendingOfferRecap | null;
}

export default function TransferOfferModal({
  open: openProp,
  isOpen,
  onClose,
  player,
  myTeam,
  onSuccess,
  pendingOfferFromMyClub,
}: Props) {
  const open = Boolean(isOpen ?? openProp);
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
      setTransferFee(player.isFreeAgent ? '0' : String(hint));
      const annualSalary = Math.max(100_000, Math.round(hint * 0.08));
      setWeeklySalary(String(Math.max(1, Math.round(annualSalary / 52))));
      setReleaseClause(String(Math.round(hint * 1.2)));
      setDurationWeeks(52);
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, player.marketValue, player.isFreeAgent]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  if (pendingOfferFromMyClub) {
    const p = pendingOfferFromMyClub;
    const waitingMsg =
      p.status === 'COUNTER_OFFER' && p.negotiation_turn === 'BUYING_CLUB'
        ? 'Le joueur a fait une contre-proposition. Répondez depuis Mercato Live (Mon club → Offres envoyées).'
        : 'Offre envoyée. En attente de la réponse du joueur…';

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
          <header className="relative border-b border-[#c9a227]/20 px-6 pt-6 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#c9a227]/35 bg-gradient-to-br from-[#c9a227]/15 to-transparent shadow-inner">
                  <Clock className="h-6 w-6 text-[#e8d48b]" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#a89f7a]/90">
                    Mercato · suivi
                  </p>
                  <h2 className="mt-1 font-serif text-xl font-semibold tracking-tight text-[#faf8f3] md:text-2xl">
                    Offre en cours
                  </h2>
                  <p className="mt-2 text-sm text-sky-300/90">{waitingMsg}</p>
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

          <div className="relative border-b border-white/5 px-6 py-4">
            <p className="text-sm text-white">
              <span className="font-semibold text-[#e8d48b]">{player.name}</span>
              <span className="text-slate-500"> · {player.position ?? '—'}</span>
            </p>
          </div>

          <div className="px-6 py-6 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#a89f7a]">
              Récapitulatif de votre proposition
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-white/5 px-3 py-2.5 border border-white/5">
                <span className="text-xs uppercase text-slate-500 block">Indemnité de transfert</span>
                <div className="text-lg font-bold text-[#FFD700] tabular-nums mt-1">
                  {formatCurrency(p.transfer_fee, 'OC')}
                </div>
              </div>
              <div className="rounded-lg bg-white/5 px-3 py-2.5 border border-white/5">
                <span className="text-xs uppercase text-slate-500 block">Salaire /an</span>
                <div className="text-lg font-bold text-emerald-400/90 tabular-nums mt-1">
                  {formatCurrency(p.offered_salary, 'OC')}
                </div>
              </div>
              <div className="rounded-lg bg-white/5 px-3 py-2.5 border border-white/5">
                <span className="text-xs uppercase text-slate-500 block">Clause Libératoire</span>
                <div className="text-lg font-bold text-sky-400/90 tabular-nums mt-1">
                  {formatCurrency(p.offered_clause, 'OC')}
                </div>
              </div>
              <div className="rounded-lg bg-white/5 px-3 py-2.5 border border-white/5">
                <span className="text-xs uppercase text-slate-500 block">Durée</span>
                <div className="text-lg font-bold text-slate-200 mt-1">{p.duration_months} mois</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full mt-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/[0.08]"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  const numFee = Number(transferFee) || 0;
  const numWeekly = Number(weeklySalary) || 0;
  const annualCost = numWeekly * 52;
  const numClause = Number(releaseClause) || 0;
  const totalCommitment = numFee + annualCost;
  const remainingBalance = myTeam.budget - totalCommitment;
  const overBudget = totalCommitment > myTeam.budget;
  const feeValid = player.isFreeAgent ? numFee >= 0 : numFee > 0;
  const invalid = !feeValid || numWeekly <= 0 || numClause <= 0 || durationWeeks < 1;
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
        ...(player.isFreeAgent ? { to_team_id: null } : { to_team_id: player.teamId }),
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
      const raw =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : undefined;
      const msg = Array.isArray(raw) ? raw.join(' ') : raw;
      const hideForFreeAgent =
        player.isFreeAgent &&
        typeof msg === 'string' &&
        (msg.includes("n'appartient pas au club indiqué") ||
          msg.includes('club actuel du joueur'));
      if (hideForFreeAgent) {
        setError('');
      } else {
        setError(msg ?? "Erreur lors de l'envoi de l'offre.");
      }
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
                  min={player.isFreeAgent ? 0 : 1}
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg bg-black/20 border border-white/5 px-3 py-2.5">
                <span className="text-xs uppercase text-slate-500 block">Salaire /an</span>
                <div className="text-lg font-bold tabular-nums text-[#e8d48b] mt-1">
                  {formatCurrency(annualCost, 'OC')}
                </div>
                <p className="text-[10px] text-slate-600 mt-1 font-mono">
                  {numWeekly.toLocaleString('fr-FR')} OC × 52 sem.
                </p>
              </div>
              <div className="rounded-lg bg-black/20 border border-white/5 px-3 py-2.5">
                <span className="text-xs uppercase text-slate-500 block">Indemnité de transfert</span>
                <div className="text-lg font-bold tabular-nums text-white mt-1">{formatCurrency(numFee, 'OC')}</div>
              </div>
              <div className="rounded-lg bg-black/20 border border-[#c9a227]/25 px-3 py-2.5 sm:col-span-1">
                <span className="text-xs uppercase text-slate-500 block">Engagement année 1</span>
                <div className="text-lg font-bold tabular-nums text-[#e8d48b] mt-1">
                  {formatCurrency(totalCommitment, 'OC')}
                </div>
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
