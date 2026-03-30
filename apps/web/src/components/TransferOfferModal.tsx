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

function formatMoney(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M €`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K €`;
  return `${v.toLocaleString('fr-FR')} €`;
}

export default function TransferOfferModal({ open, onClose, player, myTeam, onSuccess }: Props) {
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setAmount(player.marketValue ? String(player.marketValue) : '');
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

  const numAmount = Number(amount) || 0;
  const budgetAfter = myTeam.budget - numAmount;
  const overBudget = numAmount > myTeam.budget;
  const invalidAmount = numAmount <= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invalidAmount || overBudget) return;

    setSending(true);
    setError('');
    try {
      await api.post('/transfers/offer', {
        player_id: player.id,
        from_team_id: myTeam.id,
        to_team_id: player.teamId,
        amount: numAmount,
      });
      toast.success(`Offre de ${formatMoney(numAmount)} envoyée pour ${player.name} !`);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Erreur lors de l'envoi de l'offre.";
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg mx-4 rounded-2xl border border-[#FFD700]/20 bg-gradient-to-b from-[#0D1221] to-[#0A0E1A] shadow-2xl shadow-[#FFD700]/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Gold top accent */}
        <div className="h-1 bg-gradient-to-r from-transparent via-[#FFD700] to-transparent" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-[#FFD700]/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/10 border border-[#FFD700]/20 flex items-center justify-center">
                <Send className="w-3.5 h-3.5 text-[#FFD700]" />
              </div>
              Proposer un Transfert
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Mercato Live — Offre officielle</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Player recap */}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Amount input */}
          <div>
            <label htmlFor="offer-amount" className="block text-sm font-medium text-slate-400 mb-2">
              Montant de l'offre (€)
            </label>
            <div className="relative">
              <Wallet className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
              <input
                ref={inputRef}
                id="offer-amount"
                type="number"
                min="1"
                step="1000"
                required
                placeholder="ex: 5000000"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (error) setError('');
                }}
                className={`w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border text-white text-sm placeholder:text-slate-700 focus:outline-none transition-colors ${
                  overBudget
                    ? 'border-red-500/60 focus:border-red-500/80 focus:ring-1 focus:ring-red-500/30'
                    : 'border-white/10 focus:border-[#FFD700]/40 focus:ring-1 focus:ring-[#FFD700]/20'
                }`}
              />
            </div>
            {numAmount > 0 && (
              <p className="mt-1.5 text-xs text-slate-500">
                = {formatMoney(numAmount)}
              </p>
            )}
          </div>

          {/* Budget recap */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] divide-y divide-white/5">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-slate-500 flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                Budget actuel
              </span>
              <span className="text-sm font-bold text-emerald-400 tabular-nums">
                {formatMoney(myTeam.budget)}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-slate-500 flex items-center gap-2">
                <Send className="w-3.5 h-3.5" />
                Coût de l'offre
              </span>
              <span className="text-sm font-bold text-[#FFD700] tabular-nums">
                {numAmount > 0 ? `- ${formatMoney(numAmount)}` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs font-semibold text-slate-400">Budget restant</span>
              <span className={`text-sm font-black tabular-nums ${overBudget ? 'text-red-400' : 'text-emerald-400'}`}>
                {numAmount > 0 ? formatMoney(budgetAfter) : '—'}
              </span>
            </div>
          </div>

          {/* Warning */}
          {overBudget && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400 leading-relaxed">
                Budget insuffisant ! Votre offre dépasse votre budget disponible de <strong>{formatMoney(Math.abs(budgetAfter))}</strong>.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400 leading-relaxed">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={sending || invalidAmount || overBudget}
            className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#0A0E1A] shadow-lg shadow-[#FFD700]/20 hover:shadow-[#FFD700]/40 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {sending ? 'Envoi en cours…' : 'Envoyer l\'offre de transfert'}
          </button>
        </form>
      </div>
    </div>
  );
}
