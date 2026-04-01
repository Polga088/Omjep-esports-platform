import { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, Wallet, AlertTriangle, User, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

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

function formatOmjep(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString('fr-FR');
}

export default function TransferOfferModal({ open, onClose, player, myTeam, onSuccess }: Props) {
  const [transferFee, setTransferFee] = useState('');
  const [offeredSalary, setOfferedSalary] = useState('');
  const [offeredClause, setOfferedClause] = useState('');
  const [durationMonths, setDurationMonths] = useState(12);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const hint = player.marketValue ?? 5_000_000;
      setTransferFee(String(hint));
      setOfferedSalary(String(Math.max(100_000, Math.round(hint * 0.08))));
      setOfferedClause(String(Math.round(hint * 1.2)));
      setDurationMonths(12);
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
  const numSalary = Number(offeredSalary) || 0;
  const numClause = Number(offeredClause) || 0;
  const totalCommitment = numFee + numSalary;
  const budgetAfter = myTeam.budget - totalCommitment;
  const overBudget = totalCommitment > myTeam.budget;
  const invalid = numFee <= 0 || numSalary <= 0 || numClause <= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invalid || overBudget) return;

    setSending(true);
    setError('');
    try {
      await api.post('/transfers/offer', {
        player_id: player.id,
        from_team_id: myTeam.id,
        to_team_id: player.teamId,
        transfer_fee: numFee,
        offered_salary: numSalary,
        offered_clause: numClause,
        duration_months: durationMonths,
      });
      toast.success(`Offre envoyée à ${player.name} — en attente de sa réponse.`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-2xl border border-[#FFD700]/20 bg-gradient-to-b from-[#0D1221] to-[#0A0E1A] shadow-2xl shadow-[#FFD700]/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="h-1 bg-gradient-to-r from-transparent via-[#FFD700] to-transparent" />

        <div className="px-6 py-4 border-b border-[#FFD700]/10 flex items-center justify-between sticky top-0 bg-[#0D1221]/95 z-10">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/10 border border-[#FFD700]/20 flex items-center justify-center">
                <Send className="w-3.5 h-3.5 text-[#FFD700]" />
              </div>
              Proposer un transfert
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Négociation — frais, salaire, clause (OMJEP Coins)</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/10 border border-[#FFD700]/15 flex items-center justify-center text-lg font-bold text-[#FFD700]">
              {player.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{player.name}</p>
              <p className="text-xs text-slate-500">
                {player.position ?? '??'} · {player.teamName}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-[#FFD700]/40 shrink-0" />
            <div className="text-right shrink-0">
              <p className="text-xs text-slate-500">Destination</p>
              <p className="text-sm font-bold text-[#FFD700]">{myTeam.name}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Indemnité transfert (club vendeur)</label>
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
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#FFD700]/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Salaire annuel proposé</label>
            <input
              type="number"
              min={1}
              step={1000}
              required
              value={offeredSalary}
              onChange={(e) => setOfferedSalary(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#FFD700]/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Clause libératoire (nouveau contrat)</label>
            <input
              type="number"
              min={1}
              step={1000}
              required
              value={offeredClause}
              onChange={(e) => setOfferedClause(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#FFD700]/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Durée (mois)</label>
            <select
              value={durationMonths}
              onChange={(e) => setDurationMonths(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#FFD700]/40"
            >
              {[6, 12, 18, 24, 36].map((m) => (
                <option key={m} value={m} className="bg-[#0D1221]">
                  {m} mois
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] divide-y divide-white/5">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-slate-500 flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                Budget club
              </span>
              <span className="text-sm font-bold text-emerald-400 tabular-nums">
                {formatOmjep(myTeam.budget)} OC
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-slate-500 flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5" />
                Engagement (frais + 1re année salaire)
              </span>
              <span className="text-sm font-bold text-[#FFD700] tabular-nums">
                {totalCommitment > 0 ? `${formatOmjep(totalCommitment)} OC` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs font-semibold text-slate-400">Budget après signature</span>
              <span className={`text-sm font-black tabular-nums ${overBudget ? 'text-red-400' : 'text-emerald-400'}`}>
                {totalCommitment > 0 ? `${formatOmjep(budgetAfter)} OC` : '—'}
              </span>
            </div>
          </div>

          {overBudget && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400 leading-relaxed">
                Budget insuffisant pour couvrir frais de transfert + première année de salaire.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400 leading-relaxed">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={sending || invalid || overBudget}
            className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#0A0E1A] shadow-lg shadow-[#FFD700]/20 hover:shadow-[#FFD700]/40 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Envoi…' : 'Envoyer la proposition'}
          </button>
        </form>
      </div>
    </div>
  );
}
