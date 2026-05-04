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

/** Valeurs `transfer_mode` côté API Mercato V2. */
export type MercatoTransferMode = 'NEGOTIATED_FEE' | 'RELEASE_CLAUSE_BUYOUT'

export const mercatoTransferModeLabel = (mode: MercatoTransferMode | string | null | undefined): string => {
  if (mode === 'RELEASE_CLAUSE_BUYOUT') return 'Clause libératoire'
  return 'Contrat joueur libre'
}

export const mercatoOfferStatusLabel = (offer: {
  status: string
  negotiation_turn?: string
}): string => {
  if (offer.status === 'EXPIRED') return 'Expirée'
  if (offer.status === 'ACCEPTED') return 'Acceptée'
  if (offer.status === 'REJECTED') return 'Refusée'
  if (offer.status === 'CANCELLED') return 'Annulée'
  if (offer.status === 'COUNTER_OFFER' && offer.negotiation_turn === 'BUYING_CLUB') {
    return 'En attente club acheteur'
  }
  if (offer.status === 'PENDING' || offer.status === 'COUNTER_OFFER') {
    return 'En attente joueur'
  }
  return offer.status
}

export const seasonsCountFromOffer = (offer: {
  seasons_count?: number | null
  duration_months: number
}): number => {
  if (offer.seasons_count != null && offer.seasons_count > 0) return offer.seasons_count
  return Math.max(1, Math.round(offer.duration_months / 12))
}

export interface TransferOfferRow {
  id: string;
  player_id: string;
  from_team_id: string;
  to_team_id: string | null;
  transfer_fee: number;
  offered_salary: number;
  offered_clause: number;
  duration_months: number;
  seasons_count?: number | null;
  reserved_amount?: number | null;
  transfer_mode?: MercatoTransferMode | string | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTER_OFFER' | 'CANCELLED' | 'EXPIRED';
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

/** Blocs titre + montant — `offered_salary` = prime saison (OC annuel). */
export function OfferTermsGrid({ offer }: { offer: TransferOfferRow }) {
  const mode = offer.transfer_mode ?? (offer.to_team_id == null ? 'NEGOTIATED_FEE' : 'RELEASE_CLAUSE_BUYOUT')
  const isFreeContract = mode === 'NEGOTIATED_FEE' || offer.to_team_id == null
  const seasons = seasonsCountFromOffer(offer)
  const durationLabel = seasons <= 1 ? '1 saison' : `${seasons} saisons`

  const modeCell = {
    label: 'Mode',
    value: mercatoTransferModeLabel(mode),
    valueClass: 'text-omjep-text-primary',
  }
  const feeCell = {
    label: isFreeContract ? 'Frais vendeur' : 'Montant clause',
    value: isFreeContract ? '—' : formatCurrency(offer.transfer_fee, 'OC'),
    valueClass: isFreeContract ? 'text-omjep-text-muted' : 'text-[color-mix(in_srgb,var(--omjep-gold)_92%,var(--omjep-text-primary))]',
  }
  const primeCell = {
    label: 'Prime de signature',
    value: formatCurrency(offer.offered_salary, 'OC'),
    valueClass: 'text-[color-mix(in_srgb,var(--omjep-success)_95%,var(--omjep-text-primary))]',
  }
  const clauseCell = {
    label: 'Nouvelle clause (contrat)',
    value: formatCurrency(offer.offered_clause, 'OC'),
    valueClass: 'text-omjep-mauve',
  }
  const durationCell = {
    label: 'Durée',
    value: durationLabel,
    valueClass: 'text-omjep-text-primary',
  }

  const cells = [modeCell, feeCell, primeCell, clauseCell, durationCell] as const

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
      {cells.map((cell) => (
        <div
          key={cell.label}
          className="flex min-w-0 flex-col rounded-lg border border-omjep-border/60 bg-omjep-bg-panel-soft/50 px-2.5 py-2"
        >
          <span className="text-[10px] font-bold uppercase tracking-tight text-omjep-text-muted">
            {cell.label}
          </span>
          <span className={`mt-0.5 text-base font-bold tabular-nums sm:text-lg ${cell.valueClass}`}>
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
  /** Marché fermé : désactive signature et contre-proposition (refus reste possible). */
  signaturesDisabled?: boolean;
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
  signaturesDisabled,
}: PlayerOfferActionsProps) {
  const [negotiateOpen, setNegotiateOpen] = useState(false);

  const isPlayer = currentUserId === offer.player_id;
  if (
    !isPlayer ||
    offer.status === 'ACCEPTED' ||
    offer.status === 'REJECTED' ||
    offer.status === 'CANCELLED' ||
    offer.status === 'EXPIRED'
  ) {
    return null;
  }

  if (offer.status === 'COUNTER_OFFER' && offer.negotiation_turn === 'BUYING_CLUB') {
    return (
      <p className="mt-3 flex items-center gap-1.5 text-xs text-omjep-text-secondary">
        <Clock className="h-3.5 w-3.5 shrink-0 text-omjep-mauve" aria-hidden />
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
      <div className="mt-4 space-y-3 border-t border-omjep-border/50 pt-4">
        <p className="flex items-center gap-2 text-xs font-semibold text-omjep-text-secondary">
          <User className="h-3.5 w-3.5 shrink-0 text-omjep-mauve" aria-hidden />
          Votre décision (joueur)
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy || signaturesDisabled}
            onClick={() => onAcceptOffer(offer.id)}
            className="inline-flex min-w-[140px] flex-1 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--omjep-success)_48%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-success)_14%,var(--omjep-bg-panel-soft))] px-4 py-3 text-sm font-bold text-omjep-text-primary shadow-[0_8px_28px_color-mix(in_srgb,var(--omjep-success)_12%,transparent)] transition hover:brightness-[1.03] disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
            Accepter
          </button>
          <button
            type="button"
            disabled={busy || signaturesDisabled}
            onClick={() => setNegotiateOpen(true)}
            className="omjep-btn-secondary inline-flex min-w-[140px] flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-bold normal-case tracking-normal"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            Négocier
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onRejectOffer(offer.id)}
            className="inline-flex min-w-[140px] flex-1 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--omjep-danger)_45%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-danger)_10%,var(--omjep-bg-panel-soft))] px-4 py-3 text-sm font-bold text-omjep-danger transition hover:bg-[color-mix(in_srgb,var(--omjep-danger)_16%,var(--omjep-bg-panel-soft))] disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden />
            Refuser
          </button>
        </div>
      </div>

      {negotiateOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[color-mix(in_srgb,var(--omjep-bg)_72%,#000)] backdrop-blur-sm"
            onClick={() => !busy && setNegotiateOpen(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-omjep-border/90 bg-omjep-bg-panel p-6 shadow-[var(--omjep-shadow-lg)]">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-omjep-text-muted">Contre-proposition</p>
                <h3 className="mt-1 text-lg font-bold text-omjep-text-primary">Ajuster les montants</h3>
                <p className="mt-1 text-xs text-omjep-text-secondary">
                  Salaire et clause en OC (annuel pour le salaire, comme l&apos;offre actuelle).
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => setNegotiateOpen(false)}
                className="rounded-lg p-2 text-omjep-text-muted transition hover:bg-omjep-bg-panel-soft hover:text-omjep-text-primary"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="grid gap-3">
              <label className="block">
                <span className="text-xs uppercase text-omjep-text-muted">Frais de transfert (OC)</span>
                <input
                  type="number"
                  className="omjep-field mt-1 w-full rounded-xl px-3 py-2 text-sm text-omjep-text-primary"
                  value={draft.fee}
                  onChange={(e) =>
                    onDraftChange({ ...draft, fee: e.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase text-omjep-text-muted">Salaire annuel (OC)</span>
                <input
                  type="number"
                  className="omjep-field mt-1 w-full rounded-xl px-3 py-2 text-sm text-omjep-text-primary"
                  value={draft.sal}
                  onChange={(e) =>
                    onDraftChange({ ...draft, sal: e.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase text-omjep-text-muted">Clause libératoire (OC)</span>
                <input
                  type="number"
                  className="omjep-field mt-1 w-full rounded-xl px-3 py-2 text-sm text-omjep-text-primary"
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
                className="flex-1 rounded-xl border border-omjep-border/80 py-2.5 text-sm font-semibold text-omjep-text-secondary transition hover:bg-omjep-bg-panel-soft"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={busy || signaturesDisabled}
                onClick={submitCounter}
                className="flex-1 rounded-xl border border-[color-mix(in_srgb,var(--omjep-gold)_45%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_12%,var(--omjep-bg-panel-soft))] py-2.5 text-sm font-bold text-omjep-text-primary transition hover:border-[color-mix(in_srgb,var(--omjep-gold)_60%,var(--omjep-mauve))] disabled:opacity-50"
              >
                {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" aria-hidden /> : 'Envoyer la contre-proposition'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
