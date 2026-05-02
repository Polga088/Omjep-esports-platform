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
import { formatCurrency } from '@/utils/formatCurrency'
import { useModalOpenSound } from '@/hooks/useModalOpenSound'
import {
  mercatoTransferModeLabel,
  seasonsCountFromOffer,
} from '@/components/TransferOfferRow'

/** Mercato V2 : nombre de saisons → `duration_months` (legacy API). */
function seasonsToDurationMonths(seasons: number): number {
  if (!Number.isFinite(seasons) || seasons < 1) return 12
  return Math.min(60, Math.max(12, Math.round(seasons) * 12))
}

/** Offre déjà envoyée par le club acheteur pour ce joueur (formulaire remplacé par le récap). */
export type PendingOfferRecap = {
  id: string;
  transfer_fee: number;
  offered_salary: number;
  offered_clause: number;
  duration_months: number;
  seasons_count?: number | null;
  transfer_mode?: string | null;
  to_team_id?: string | null;
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
    /** Club vendeur (joueur sous contrat) — ignoré pour l’API si agent libre. */
    teamId: string;
    teamName: string;
    marketValue: number | null;
    /** Agent libre : `NEGOTIATED_FEE`, `to_team_id` null. */
    isFreeAgent?: boolean;
    /** Clause actuelle (OC) — min. recommandée pour `RELEASE_CLAUSE_BUYOUT`. */
    currentReleaseClause?: number | null;
  };
  myTeam: {
    id: string;
    name: string;
    budget: number;
  };
  /** Réserves OC des autres offres envoyées (PENDING / COUNTER) — hors brouillon courant. */
  clubMercatoReservedOtherOc?: number;
  onSuccess?: () => void;
  /** Si défini : pas de nouveau formulaire, affichage du récapitulatif en attente */
  pendingOfferFromMyClub?: PendingOfferRecap | null;
  /** Marché fermé : pas d’envoi d’offre */
  transferMarketClosed?: boolean;
  /** False si l’utilisateur n’est pas dirigeant club : garde-fou UI (POST doit aussi renvoyer 403). */
  canInitiateTransfers?: boolean;
}

const SEASON_PRESETS = [1, 2, 3] as const

export default function TransferOfferModal({
  open: openProp,
  isOpen,
  onClose,
  player,
  myTeam,
  onSuccess,
  pendingOfferFromMyClub,
  transferMarketClosed,
  canInitiateTransfers = true,
  clubMercatoReservedOtherOc = 0,
}: Props) {
  const open = Boolean(isOpen ?? openProp);
  const isFreeAgentFlow = player.isFreeAgent === true
  const isClauseBuyoutFlow = !isFreeAgentFlow
  const [transferFee, setTransferFee] = useState('');
  const [seasonPrimeOc, setSeasonPrimeOc] = useState('');
  const [releaseClause, setReleaseClause] = useState('');
  const [seasonsCount, setSeasonsCount] = useState(2);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const minClauseAmount =
    player.currentReleaseClause != null && player.currentReleaseClause > 0
      ? player.currentReleaseClause
      : Math.max(1, Math.round((player.marketValue ?? 5_000_000) * 0.5))

  useEffect(() => {
    if (open) {
      const hint = player.marketValue ?? 5_000_000;
      if (isFreeAgentFlow) {
        setTransferFee('0')
      } else {
        setTransferFee(String(Math.max(minClauseAmount, Math.round(hint * 0.6))))
      }
      const defaultPrime = Math.max(1000, Math.round(hint * 0.08));
      setSeasonPrimeOc(String(defaultPrime));
      setReleaseClause(String(Math.round(hint * 1.2)));
      setSeasonsCount(2);
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, player.marketValue, player.isFreeAgent, isFreeAgentFlow, minClauseAmount]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose])

  useModalOpenSound(open)

  if (!open) return null

  if (pendingOfferFromMyClub) {
    const p = pendingOfferFromMyClub;
    const waitingMsg =
      p.status === 'COUNTER_OFFER' && p.negotiation_turn === 'BUYING_CLUB'
        ? 'Le joueur a fait une contre-proposition. Répondez depuis Mercato Live (Mon club → Offres envoyées).'
        : 'Offre envoyée. En attente de la réponse du joueur…';
    const recapSeasons = seasonsCountFromOffer(p)
    const recapMode = p.transfer_mode ?? (p.to_team_id == null ? 'NEGOTIATED_FEE' : 'RELEASE_CLAUSE_BUYOUT')
    const recapFree = recapMode === 'NEGOTIATED_FEE' || p.to_team_id == null

    return (
      <div className="tactical-modal-backdrop z-50">
        <div className="tactical-modal-dim" onClick={onClose} aria-hidden />

        <div className="omjep-mercato-modal-panel tactical-modal-panel relative max-h-[92vh] w-full max-w-xl overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
          <header className="relative border-b border-omjep-border-gold/25 px-6 pb-4 pt-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-omjep-border-gold/40 bg-omjep-gold/[0.08] shadow-inner">
                  <Clock className="h-6 w-6 text-omjep-gold" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-omjep-text-muted">
                    Mercato · suivi
                  </p>
                  <h2 className="mt-1 font-heading text-xl font-semibold tracking-tight text-omjep-text-primary md:text-2xl">
                    Offre en cours
                  </h2>
                  <p className="mt-2 text-sm text-omjep-text-secondary">{waitingMsg}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-omjep-text-muted transition hover:bg-omjep-bg-panel-soft hover:text-omjep-text-primary"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="relative border-b border-omjep-border/40 px-6 py-4">
            <p className="text-sm text-omjep-text-primary">
              <span className="font-semibold text-omjep-gold">{player.name}</span>
              <span className="text-omjep-text-muted"> · {player.position ?? '—'}</span>
            </p>
          </div>

          <div className="space-y-4 px-6 py-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-omjep-text-muted">
              Récapitulatif de votre proposition
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="omjep-surface-card rounded-lg px-3 py-2.5 sm:col-span-3">
                <span className="block text-xs uppercase text-omjep-text-muted">Mode</span>
                <div className="mt-1 text-sm font-bold text-omjep-text-primary">{mercatoTransferModeLabel(recapMode)}</div>
              </div>
              {!recapFree && (
                <div className="omjep-surface-card rounded-lg px-3 py-2.5">
                  <span className="block text-xs uppercase text-omjep-text-muted">Montant clause</span>
                  <div className="mt-1 text-lg font-bold tabular-nums text-omjep-gold">
                    {formatCurrency(p.transfer_fee, 'OC')}
                  </div>
                </div>
              )}
              <div className="omjep-surface-card rounded-lg px-3 py-2.5">
                <span className="block text-xs uppercase text-omjep-text-muted">Prime de signature</span>
                <div className="mt-1 text-lg font-bold tabular-nums text-omjep-success">
                  {formatCurrency(p.offered_salary, 'OC')}
                </div>
              </div>
              <div className="omjep-surface-card rounded-lg px-3 py-2.5">
                <span className="block text-xs uppercase text-omjep-text-muted">Nouvelle clause (contrat)</span>
                <div className="mt-1 text-lg font-bold tabular-nums text-omjep-mauve">
                  {formatCurrency(p.offered_clause, 'OC')}
                </div>
              </div>
              <div className="omjep-surface-card rounded-lg px-3 py-2.5">
                <span className="block text-xs uppercase text-omjep-text-muted">Durée</span>
                <div className="mt-1 text-lg font-bold text-omjep-text-primary">
                  {recapSeasons} {recapSeasons <= 1 ? 'saison' : 'saisons'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="omjep-btn-secondary mt-2 w-full px-5 py-3 text-sm normal-case"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  const numFee = Number(transferFee) || 0;
  const numOfferedSalary = Number(seasonPrimeOc) || 0;
  const numClause = Number(releaseClause) || 0;
  const requiredAmount = isFreeAgentFlow ? numOfferedSalary : numFee + numOfferedSalary;
  const reservedOther = Math.max(0, clubMercatoReservedOtherOc)
  const totalReservedIfSubmit = reservedOther + requiredAmount
  const remainingAfterReserve = myTeam.budget - totalReservedIfSubmit
  const overBudget = totalReservedIfSubmit > myTeam.budget;
  const feeValid = isFreeAgentFlow ? numFee >= 0 : numFee >= minClauseAmount;
  const invalid = !feeValid || numOfferedSalary <= 0 || numClause <= 0 || seasonsCount < 1;
  const durationMonths = seasonsToDurationMonths(seasonsCount);
  const canSubmit =
    !invalid && !overBudget && !sending && !transferMarketClosed;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (!canInitiateTransfers) {
      toast.error('Seuls les dirigeants du club peuvent initier des négociations.')
      return
    }

    setSending(true);
    setError('');
    try {
      await api.post('/transfers/offer', {
        player_id: player.id,
        from_team_id: myTeam.id,
        to_team_id: isFreeAgentFlow ? null : player.teamId,
        transfer_fee: isFreeAgentFlow ? 0 : numFee,
        transfer_mode: isFreeAgentFlow ? 'NEGOTIATED_FEE' : 'RELEASE_CLAUSE_BUYOUT',
        offered_salary: numOfferedSalary,
        offered_clause: numClause,
        duration_months: durationMonths,
        seasons_count: seasonsCount,
        releaseClausePropose: numClause,
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
      setError(msg ?? "Erreur lors de l'envoi de l'offre.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="tactical-modal-backdrop z-50">
      <div className="tactical-modal-dim" onClick={onClose} aria-hidden />

      <div className="omjep-mercato-modal-panel tactical-modal-panel relative max-h-[92vh] w-full max-w-xl overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Filigrane décoratif */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04] rounded-2xl"
          style={{
            backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 12px, rgba(201,162,39,0.5) 12px, rgba(201,162,39,0.5) 13px)`,
          }}
        />

        <header className="relative border-b border-omjep-border-gold/25 px-6 pb-4 pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-omjep-border-gold/40 bg-omjep-gold/[0.08] shadow-inner">
                <FileText className="h-6 w-6 text-omjep-gold" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-omjep-text-muted">
                  Négociation · OMJEP Coins
                </p>
                <h2 className="mt-1 font-heading text-xl font-semibold tracking-tight text-omjep-text-primary md:text-2xl">
                  {isFreeAgentFlow ? 'Proposition — joueur libre' : 'Activation clause libératoire'}
                </h2>
                <p className="mt-1 text-xs text-omjep-text-muted">
                  {isFreeAgentFlow
                    ? 'Prime de signature, clause du nouveau contrat et durée — sans frais vendeur.'
                    : 'Paiement de la clause au club actuel, prime joueur et nouveau contrat.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-omjep-text-muted transition hover:bg-omjep-bg-panel-soft hover:text-omjep-text-primary"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Parties */}
        <div className="relative border-b border-omjep-border px-6 py-5">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-omjep-gold/80">
            <Scale className="h-3.5 w-3.5" />
            Parties
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="rounded-xl border border-omjep-border bg-omjep-bg-panel-soft p-3">
              <p className="text-[10px] uppercase tracking-wide text-omjep-text-muted">Joueur ciblé</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-omjep-gold/25 bg-gradient-to-br from-omjep-gold/10 to-transparent text-base font-bold text-omjep-gold-light">
                  {(player.name ?? '?').charAt(0) || '?'}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-omjep-text-primary">{player.name}</p>
                  <p className="text-xs text-omjep-text-secondary">
                    {player.position ?? '—'} · {player.teamName}
                  </p>
                </div>
              </div>
            </div>
            <ArrowRight className="mx-auto hidden h-5 w-5 text-omjep-gold/40 sm:block" />
            <div className="rounded-xl border border-omjep-border-gold/25 bg-omjep-gold/[0.06] p-3">
              <p className="text-[10px] uppercase tracking-wide text-omjep-text-muted">Club employeur (vous)</p>
              <div className="mt-2 flex items-center gap-2">
                <Building2 className="h-4 w-4 shrink-0 text-omjep-gold/80" />
                <p className="font-semibold text-omjep-text-primary">{myTeam.name}</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="relative space-y-5 px-6 py-6">
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-omjep-text-muted">
              <Wallet className="h-3.5 w-3.5 text-omjep-gold/70" />
              Conditions financières
            </h3>
            <div className="space-y-4">
              {isClauseBuyoutFlow && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-omjep-text-secondary">
                    Montant clause libératoire (vers {player.teamName}) · OC
                    {player.currentReleaseClause != null && player.currentReleaseClause > 0 && (
                      <span className="mt-0.5 block text-[10px] text-omjep-warning">
                        Minimum contractuel : {formatCurrency(player.currentReleaseClause, 'OC')}
                      </span>
                    )}
                  </span>
                  <input
                    ref={inputRef}
                    type="number"
                    min={minClauseAmount}
                    step={1}
                    required
                    value={transferFee}
                    onChange={(e) => {
                      setTransferFee(e.target.value);
                      if (error) setError('');
                    }}
                    className="w-full rounded-xl border border-omjep-border bg-omjep-bg-panel-soft px-4 py-3 text-sm text-omjep-text-primary tabular-nums placeholder:text-omjep-text-muted focus:border-omjep-gold/45 focus:outline-none focus:ring-2 focus:ring-omjep-gold/15"
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-omjep-text-secondary">
                  Prime / salaire de saison (OC)
                </span>
                <input
                  ref={isFreeAgentFlow ? inputRef : undefined}
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={seasonPrimeOc}
                  onChange={(e) => setSeasonPrimeOc(e.target.value)}
                  className="w-full rounded-xl border border-omjep-border bg-omjep-bg-panel-soft px-4 py-3 text-sm text-omjep-text-primary tabular-nums placeholder:text-omjep-text-muted focus:border-omjep-gold/45 focus:outline-none focus:ring-2 focus:ring-omjep-gold/15"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-omjep-text-secondary">
                  Clause du nouveau contrat (OC)
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={releaseClause}
                  onChange={(e) => setReleaseClause(e.target.value)}
                  className="w-full rounded-xl border border-omjep-border bg-omjep-bg-panel-soft px-4 py-3 text-sm text-omjep-text-primary tabular-nums placeholder:text-omjep-text-muted focus:border-omjep-gold/45 focus:outline-none focus:ring-2 focus:ring-omjep-gold/15"
                />
              </label>

              <div>
                <span className="mb-1.5 block text-xs font-medium text-omjep-text-secondary">
                  Durée du contrat (en saisons)
                </span>
                <div className="flex flex-wrap gap-2">
                  {SEASON_PRESETS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSeasonsCount(s)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                        seasonsCount === s
                          ? 'border-omjep-gold/50 bg-omjep-gold/15 text-omjep-gold-light'
                          : 'border-omjep-border bg-omjep-bg-panel-soft text-omjep-text-muted hover:border-omjep-border-gold/35'
                      }`}
                    >
                      {s === 1 ? '1 saison' : `${s} saisons`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Calcul dynamique */}
          <div className="rounded-xl border border-omjep-border-gold/25 bg-gradient-to-br from-omjep-gold/[0.07] to-transparent p-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-omjep-text-muted">
              Coût engagé (réservation)
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-omjep-border bg-omjep-bg-panel-soft px-3 py-2.5">
                <span className="block text-xs uppercase text-omjep-text-muted">Prime de signature</span>
                <div className="mt-1 text-lg font-bold tabular-nums text-omjep-gold-light">
                  {formatCurrency(numOfferedSalary, 'OC')}
                </div>
              </div>
              {!isFreeAgentFlow && (
                <div className="rounded-lg border border-omjep-border bg-omjep-bg-panel-soft px-3 py-2.5">
                  <span className="block text-xs uppercase text-omjep-text-muted">Clause (vendeur)</span>
                  <div className="mt-1 text-lg font-bold tabular-nums text-omjep-text-primary">
                    {formatCurrency(numFee, 'OC')}
                  </div>
                </div>
              )}
              <div className="rounded-lg border border-omjep-border-gold/30 bg-omjep-bg-panel-soft px-3 py-2.5 sm:col-span-1">
                <span className="block text-xs uppercase text-omjep-text-muted">Total à réserver</span>
                <div className="mt-1 text-lg font-bold tabular-nums text-omjep-gold-light">
                  {formatCurrency(requiredAmount, 'OC')}
                </div>
              </div>
            </div>
          </div>

          {/* Solde club */}
          <div className="overflow-hidden rounded-xl border border-omjep-border bg-omjep-bg-panel-soft">
            <div className="grid divide-y divide-omjep-border/50 sm:grid-cols-1">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="flex items-center gap-2 text-xs text-omjep-text-muted">
                  <User className="h-3.5 w-3.5" />
                  Budget club (OC)
                </span>
                <span className="text-sm font-bold tabular-nums text-omjep-success">
                  {formatCurrency(myTeam.budget, 'OC')}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-omjep-text-muted">Déjà réservé (autres offres)</span>
                <span className="text-sm font-bold tabular-nums text-omjep-text-secondary">
                  {formatCurrency(reservedOther, 'OC')}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-omjep-text-muted">Après cette offre (budget − réserves)</span>
                <span
                  className={`text-sm font-black tabular-nums ${overBudget ? 'text-omjep-danger' : 'text-omjep-success'}`}
                >
                  {requiredAmount > 0 ? formatCurrency(remainingAfterReserve, 'OC') : '—'}
                </span>
              </div>
            </div>
            <p className="border-t border-omjep-border bg-omjep-bg-panel px-4 py-2 text-[10px] text-omjep-text-muted">
              Estimation : trésorerie club moins les réserves mercato en cours et cette proposition.
            </p>
          </div>

          {overBudget && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-xs leading-relaxed text-red-300/95">
                Budget insuffisant : la réservation dépasse la trésorerie du club. Réduisez la prime
                {isClauseBuyoutFlow ? ' ou le montant de clause.' : '.'}
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-xs text-red-300/95">{error}</p>
            </div>
          )}

          {transferMarketClosed && (
            <div className="rounded-lg border border-omjep-border bg-omjep-bg-panel-soft px-3 py-2 font-mono text-xs text-omjep-text-muted">
              MARCHÉ CLOS — aucune offre ne peut être envoyée pour le moment.
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold transition ${
              canSubmit
                ? 'bg-gradient-to-r from-[#c9a227] via-[#d4af37] to-[#b8860b] text-[#0a0a0a] shadow-lg shadow-[#c9a227]/20 hover:brightness-105 active:scale-[0.99]'
                : 'cursor-not-allowed bg-omjep-bg-panel text-omjep-text-muted shadow-inner'
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
