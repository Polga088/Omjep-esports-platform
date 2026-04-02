import { useState } from 'react';
import {
  Check,
  X,
  Loader2,
  Clock,
  User,
  MessageCircle,
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';

export interface TransferOfferRow {
  id: string;
  player_id: string;
  from_team_id: string;
  to_team_id: string | null;
  transfer_fee: number;
  offered_salary: number;
  offered_clause: number;
  duration_months: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTER_OFFER' | 'CANCELLED';
  negotiation_turn: 'PLAYER' | 'BUYING_CLUB';
  created_at: string;
  responded_at: string | null;
  player: {
    id: string;
    ea_persona_name: string | null;
    preferred_position: string | null;
  };
  fromTeam: {
    id: string;
    name: string;
    logo_url: string | null;
  };
  toTeam: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
}

/** Blocs titre + montant (liste offres, fiches joueur) — `offered_salary` est déjà annuel (OC). */
export function OfferTermsGrid({ offer }: { offer: TransferOfferRow }) {
  const cells = [
    {
      label: 'Indemnité de transfert',
      value: formatCurrency(offer.transfer_fee, 'OC'),
      valueClass: 'text-yellow-500',
    },
    {
      label: 'Salaire /an',
      value: formatCurrency(offer.offered_salary, 'OC'),
      valueClass: 'text-green-500',
    },
    {
      label: 'Clause Libératoire',
      value: formatCurrency(offer.offered_clause, 'OC'),
      valueClass: 'text-sky-400',
    },
    {
      label: 'Durée',
      value: `${offer.duration_months} mois`,
      valueClass: 'text-slate-200',
    },
  ] as const;

  return (
    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
      {cells.map((cell, i) => (
        <div
          key={cell.label}
          className={`flex flex-col min-w-0 rounded-lg bg-white/5 px-2 py-2 border border-white/5 ${i > 0 ? 'md:border-l md:border-slate-800 md:pl-3' : ''}`}
        >
          <span className="text-[10px] uppercase text-slate-500 font-bold tracking-tighter">
            {cell.label}
          </span>
          <span className={`font-bold text-lg tabular-nums mt-0.5 ${cell.valueClass}`}>
            {cell.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export type CounterOfferDraft = { fee: string; sal: string; clause: string };

interface PlayerOfferActionsProps {
  offer: TransferOfferRow;
  currentUserId: string | undefined;
  busy: boolean;
  draft: CounterOfferDraft;
  onDraftChange: (draft: CounterOfferDraft) => void;
  onAcceptOffer: (offerId: string) => void;
  onRejectOffer: (offerId: string) => void;
  onCounterOffer: (offerId: string, body: { transfer_fee?: number; offered_salary?: number; offered_clause?: number }) => void;
}

/**
 * Actions côté joueur : Accepter (vert) · Négocier (modal contre-proposition) · Refuser (rouge)
 */
export function PlayerOfferActions({
  offer,
  currentUserId,
  busy,
  draft,
  onDraftChange,
  onAcceptOffer,
  onRejectOffer,
  onCounterOffer,
}: PlayerOfferActionsProps) {
  const [negotiateOpen, setNegotiateOpen] = useState(false);

  const isPlayer = currentUserId === offer.player_id;
  if (!isPlayer || offer.status === 'ACCEPTED' || offer.status === 'REJECTED' || offer.status === 'CANCELLED') {
    return null;
  }

  if (offer.status === 'COUNTER_OFFER' && offer.negotiation_turn === 'BUYING_CLUB') {
    return (
      <p className="mt-3 text-xs text-amber-400/80 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        En attente de la réponse du club acheteur.
      </p>
    );
  }

  if (offer.negotiation_turn !== 'PLAYER') {
    return null;
  }

  const submitCounter = () => {
    onCounterOffer(offer.id, {
      transfer_fee: Number(draft.fee) || undefined,
      offered_salary: Number(draft.sal) || undefined,
      offered_clause: Number(draft.clause) || undefined,
    });
    setNegotiateOpen(false);
  };

  return (
    <>
      <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
        <p className="text-xs font-semibold text-slate-400 flex items-center gap-2">
          <User className="w-3.5 h-3.5" />
          Votre décision (joueur)
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => onAcceptOffer(offer.id)}
            className="inline-flex flex-1 min-w-[140px] justify-center items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-emerald-600/90 text-white border border-emerald-500/50 hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Accepter
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setNegotiateOpen(true)}
            className="inline-flex flex-1 min-w-[140px] justify-center items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-sky-600/90 to-amber-500/85 text-white border border-sky-400/40 hover:brightness-110 disabled:opacity-50"
          >
            <MessageCircle className="w-4 h-4" />
            Négocier
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onRejectOffer(offer.id)}
            className="inline-flex flex-1 min-w-[140px] justify-center items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-red-600/85 text-white border border-red-500/50 hover:bg-red-500 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
            Refuser
          </button>
        </div>
      </div>

      {negotiateOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !busy && setNegotiateOpen(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-amber-500/30 bg-[#0D1221] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90">Contre-proposition</p>
                <h3 className="text-lg font-bold text-white mt-1">Ajuster les montants</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Salaire et clause en OC (annuel pour le salaire, comme l&apos;offre actuelle).
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => setNegotiateOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid gap-3">
              <label className="block">
                <span className="text-xs uppercase text-slate-500">Frais de transfert (OC)</span>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  value={draft.fee}
                  onChange={(e) =>
                    onDraftChange({ ...draft, fee: e.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase text-slate-500">Salaire annuel (OC)</span>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  value={draft.sal}
                  onChange={(e) =>
                    onDraftChange({ ...draft, sal: e.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase text-slate-500">Clause libératoire (OC)</span>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  value={draft.clause}
                  onChange={(e) =>
                    onDraftChange({ ...draft, clause: e.target.value })
                  }
                />
              </label>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setNegotiateOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-white/10 text-slate-400 hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={submitCounter}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-amber-500/25 text-amber-200 border border-amber-500/40 hover:bg-amber-500/35 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Envoyer la contre-proposition'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
