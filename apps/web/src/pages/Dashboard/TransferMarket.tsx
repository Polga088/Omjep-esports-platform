import { useState, useEffect, useCallback, useMemo, type ComponentProps } from 'react';
import { Link } from 'react-router-dom';
import {
  Repeat, Send, Inbox, Loader2, Check, X, Clock,
  MessageCircle, User, Gavel, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { refreshEconomyFromApi } from '@/lib/refreshEconomyFromApi';
import GoldConfetti from '@/components/GoldConfetti';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency } from '@/utils/formatCurrency';
import TransferOfferModal, { type PendingOfferRecap } from '@/components/TransferOfferModal';
import {
  OfferTermsGrid,
  PlayerOfferActions,
  mercatoOfferStatusLabel,
  type TransferOfferRow,
} from '@/components/TransferOfferRow';
import {
  mercatoCanInitiateTransferOffer,
  type MercatoMyTeamPayload,
} from '@/utils/mercatoInitiatorPermission';

type TransferOfferModalPlayer = ComponentProps<typeof TransferOfferModal>['player'];

interface FreeAgent {
  id: string;
  name: string;
  position: string;
  stats: {
    matches_played: number;
    goals: number;
    assists: number;
    average_rating: number;
  };
  isFreeAgent: true;
  transferFee: 0;
}

type MainTab = 'club' | 'player' | 'freeAgents';
type OffersTab = 'sent' | 'received';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
}

const statusConfig = {
  PENDING: {
    label: 'En attente',
    className:
      'border-[color-mix(in_srgb,var(--omjep-mauve)_40%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-mauve)_12%,var(--omjep-bg-panel-soft))] text-omjep-text-primary',
    icon: Clock,
  },
  ACCEPTED: {
    label: 'Signé',
    className:
      'border-[color-mix(in_srgb,var(--omjep-success)_45%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-success)_14%,var(--omjep-bg-panel-soft))] text-omjep-text-primary',
    icon: Check,
  },
  REJECTED: {
    label: 'Refusé',
    className:
      'border-[color-mix(in_srgb,var(--omjep-danger)_40%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-danger)_10%,var(--omjep-bg-panel-soft))] text-omjep-text-secondary',
    icon: X,
  },
  COUNTER_OFFER: {
    label: 'Contre-proposition',
    className:
      'border-[color-mix(in_srgb,var(--omjep-gold)_42%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_10%,var(--omjep-bg-panel-soft))] text-omjep-text-primary',
    icon: MessageCircle,
  },
  CANCELLED: {
    label: 'Annulée',
    className: 'border-omjep-border/80 bg-omjep-bg-panel-soft/90 text-omjep-text-muted',
    icon: X,
  },
  EXPIRED: {
    label: 'Expirée',
    className: 'border-omjep-border/60 bg-omjep-bg-panel/80 text-omjep-text-muted',
    icon: Clock,
  },
} as const;

export default function TransferMarket() {
  const { user, patchUser } = useAuthStore();
  const [transferMarketOpen, setTransferMarketOpen] = useState(true);
  const [myTeam, setMyTeam] = useState<MercatoMyTeamPayload | null>(null);
  const [offers, setOffers] = useState<TransferOfferRow[]>([]);
  const [playerOffers, setPlayerOffers] = useState<TransferOfferRow[]>([]);
  const [freeAgents, setFreeAgents] = useState<FreeAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<MainTab>('club');
  const [activeTab, setActiveTab] = useState<OffersTab>('received');
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [freeAgentPosition, setFreeAgentPosition] = useState<string>('');
  const [counterDraft, setCounterDraft] = useState<Record<string, { fee: string; sal: string; clause: string }>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<TransferOfferModalPlayer | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: st } = await api.get<{ transferMarketOpen?: boolean }>(
        '/transfers/market-status',
      );
      setTransferMarketOpen(st?.transferMarketOpen !== false);
    } catch {
      setTransferMarketOpen(true);
    }
    const authUser = useAuthStore.getState().user
    try {
      const teamRes = await api.get<MercatoMyTeamPayload>('/teams/my-team');
      setMyTeam(teamRes.data);
      const canInitiate = mercatoCanInitiateTransferOffer(authUser, teamRes.data);

      const asPlayerRes = await api.get<TransferOfferRow[]>('/transfers/offers/as-player');
      setPlayerOffers(asPlayerRes.data);

      if (canInitiate) {
        const [offersRes, freeAgentsRes] = await Promise.all([
          api.get<TransferOfferRow[]>('/transfers/offers', {
            params: { team_id: teamRes.data.id },
          }),
          api.get<FreeAgent[]>('/transfers/free-agents', {
            params: { team_id: teamRes.data.id },
          }),
        ]);
        setOffers(offersRes.data);
        setFreeAgents(freeAgentsRes.data);
      } else {
        setOffers([]);
        setFreeAgents([]);
      }
    } catch {
      setMyTeam(null);
      setOffers([]);
      try {
        const asPlayerRes = await api.get<TransferOfferRow[]>('/transfers/offers/as-player');
        setPlayerOffers(asPlayerRes.data);
      } catch {
        setPlayerOffers([]);
      }
      setFreeAgents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const onRefresh = () => {
      void fetchData();
    };
    window.addEventListener('omjep:transfers-refresh', onRefresh);
    return () => window.removeEventListener('omjep:transfers-refresh', onRefresh);
  }, [fetchData]);

  const sentOffers = offers.filter((o) => myTeam && o.from_team_id === myTeam.id);
  const receivedOffers = offers.filter((o) => myTeam && o.to_team_id === myTeam.id);
  const currentClubList = activeTab === 'sent' ? sentOffers : receivedOffers;

  const pendingSentCount = sentOffers.filter((o) => o.status === 'PENDING' || o.status === 'COUNTER_OFFER').length;
  const pendingReceivedCount = receivedOffers.filter((o) => o.status === 'PENDING' || o.status === 'COUNTER_OFFER').length;
  const pendingPlayerCount = playerOffers.length;

  const canInitiateTransferOffers = useMemo(
    () => mercatoCanInitiateTransferOffer(user, myTeam),
    [user, myTeam],
  );

  useEffect(() => {
    if (!loading && !canInitiateTransferOffers && (mainTab === 'club' || mainTab === 'freeAgents')) {
      setMainTab('player');
    }
  }, [loading, canInitiateTransferOffers, mainTab]);

  const mainTabsForUi = useMemo(() => {
    const playerTab = {
      key: 'player' as const,
      label: 'Mes offres joueur',
      icon: User,
      count: pendingPlayerCount,
    };
    if (!canInitiateTransferOffers) {
      return [playerTab];
    }
    return [
      {
        key: 'club' as const,
        label: 'Mon club',
        icon: Inbox,
        count: pendingSentCount + pendingReceivedCount,
      },
      playerTab,
      {
        key: 'freeAgents' as const,
        label: 'Agents libres',
        icon: Users,
        count: freeAgents.length,
      },
    ];
  }, [
    canInitiateTransferOffers,
    pendingPlayerCount,
    pendingSentCount,
    pendingReceivedCount,
    freeAgents.length,
  ]);

  const signaturesBlocked = !transferMarketOpen;

  const pendingRecapForModal = useMemo((): PendingOfferRecap | null => {
    if (!selectedPlayer) return null;
    const pending = sentOffers.find(
      (o) =>
        o.player_id === selectedPlayer.id &&
        (o.status === 'PENDING' || o.status === 'COUNTER_OFFER'),
    );
    if (!pending) return null;
    return {
      id: pending.id,
      transfer_fee: pending.transfer_fee,
      offered_salary: pending.offered_salary,
      offered_clause: pending.offered_clause,
      duration_months: pending.duration_months,
      seasons_count: pending.seasons_count,
      transfer_mode: pending.transfer_mode,
      to_team_id: pending.to_team_id,
      status: pending.status as PendingOfferRecap['status'],
      negotiation_turn: pending.negotiation_turn,
    };
  }, [selectedPlayer, sentOffers]);

  const clubMercatoReservedOtherOc = useMemo(() => {
    if (!myTeam) return 0
    return sentOffers
      .filter(
        (o) =>
          (o.status === 'PENDING' || o.status === 'COUNTER_OFFER') &&
          o.player_id !== selectedPlayer?.id,
      )
      .reduce((s, o) => s + Number(o.reserved_amount ?? 0), 0)
  }, [myTeam, sentOffers, selectedPlayer?.id])

  const clubMercatoReservedTotalOc = useMemo(() => {
    if (!myTeam) return 0
    return sentOffers
      .filter((o) => o.status === 'PENDING' || o.status === 'COUNTER_OFFER')
      .reduce((s, o) => s + Number(o.reserved_amount ?? 0), 0)
  }, [myTeam, sentOffers])

  const clubBudgetAvailableOc = useMemo(() => {
    if (!myTeam) return 0
    return Math.max(0, (myTeam.budget ?? 0) - clubMercatoReservedTotalOc)
  }, [myTeam, clubMercatoReservedTotalOc])

  const playerRespond = async (offerId: string, body: Record<string, unknown>) => {
    setRespondingId(offerId);
    try {
      if (body.action === 'ACCEPT') {
        await api.patch(`/transfers/accept/${offerId}`);
      } else if (body.action === 'REJECT') {
        await api.patch(`/transfers/reject/${offerId}`);
      } else {
        await api.patch(`/transfers/offer/${offerId}/player-respond`, body);
      }
      toast.success('Réponse envoyée.');
      await refreshEconomyFromApi(patchUser, user?.xp);
      await fetchData();
    } catch (err: unknown) {
      const raw =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string; code?: string } } }).response?.data
          : undefined;
      const msg =
        typeof raw === 'string'
          ? raw
          : typeof raw?.message === 'string'
            ? raw.message
            : 'Erreur.';
      toast.error(msg ?? 'Erreur');
    } finally {
      setRespondingId(null);
    }
  };

  const handleAcceptOffer = (offerId: string) => {
    void playerRespond(offerId, { action: 'ACCEPT' });
  };

  const handleRejectOffer = (offerId: string) => {
    void playerRespond(offerId, { action: 'REJECT' });
  };

  const handlePlayerCounterOffer = (
    offerId: string,
    body: { transfer_fee?: number; offered_salary?: number; offered_clause?: number },
  ) => {
    void playerRespond(offerId, { action: 'COUNTER', ...body });
  };

  const buyerRespond = async (offerId: string, body: Record<string, unknown>) => {
    setRespondingId(offerId);
    try {
      await api.patch(`/transfers/offer/${offerId}/buyer-respond`, body);
      toast.success('Réponse envoyée.');
      if (body.action === 'ACCEPT_COUNTER') {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }
      await refreshEconomyFromApi(patchUser, user?.xp);
      await fetchData();
    } catch (err: unknown) {
      const raw =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string; code?: string } } }).response?.data
          : undefined;
      const msg =
        typeof raw === 'string'
          ? raw
          : typeof raw?.message === 'string'
            ? raw.message
            : 'Erreur.';
      toast.error(msg ?? 'Erreur');
    } finally {
      setRespondingId(null);
    }
  };

  const handleOpenOfferModal = (agent: FreeAgent) => {
    if (!canInitiateTransferOffers) {
      toast.error('Seuls les dirigeants du club peuvent initier des négociations.');
      return;
    }
    if (signaturesBlocked) {
      toast.error('Marché des transferts clos.');
      return;
    }
    if (!myTeam) {
      toast.error('Vous devez être membre d’un club pour recruter.');
      return;
    }
    setSelectedPlayer({
      id: agent.id,
      name: agent.name,
      position: agent.position === 'Non spécifié' ? null : agent.position,
      teamId: myTeam.id,
      teamName: 'Sans club (agent libre)',
      marketValue: null,
      isFreeAgent: true,
    });
    setIsModalOpen(true);
  };

  const handleCloseOfferModal = () => {
    setIsModalOpen(false);
    setSelectedPlayer(null);
  };

  const renderBuyerActions = (offer: TransferOfferRow) => {
    if (!canInitiateTransferOffers) return null;
    const isBuyer = myTeam && offer.from_team_id === myTeam.id;
    const busy = respondingId === offer.id;
    if (!isBuyer || offer.status !== 'COUNTER_OFFER' || offer.negotiation_turn !== 'BUYING_CLUB') {
      return null;
    }
    const signLocked = signaturesBlocked;

    const draft = counterDraft[`b-${offer.id}`] ?? {
      fee: String(offer.transfer_fee),
      sal: String(offer.offered_salary),
      clause: String(offer.offered_clause),
    };

    return (
      <div className="mt-4 space-y-3 border-t border-omjep-border/50 pt-4">
        <p className="flex items-center gap-2 text-xs font-semibold text-omjep-text-secondary">
          <Gavel className="h-3.5 w-3.5 shrink-0 text-omjep-mauve" aria-hidden />
          Réponse club acheteur
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || signLocked}
            onClick={() => buyerRespond(offer.id, { action: 'ACCEPT_COUNTER' })}
            className="omjep-btn-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold normal-case tracking-normal disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <Check className="h-3.5 w-3.5" aria-hidden />}
            Accepter
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => buyerRespond(offer.id, { action: 'REJECT' })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-omjep-border/80 bg-omjep-bg-panel-soft/80 px-3 py-2 text-xs font-semibold text-omjep-text-secondary transition hover:border-omjep-border hover:text-omjep-text-primary"
          >
            Abandonner
          </button>
        </div>
        <div className="space-y-2 rounded-xl border border-omjep-border/80 bg-omjep-bg-panel/60 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-omjep-text-muted">Nouvelle proposition</p>
          <div className="grid grid-cols-3 gap-1 text-[9px] font-semibold uppercase tracking-wide text-omjep-text-muted">
            <span>{offer.transfer_mode === 'RELEASE_CLAUSE_BUYOUT' ? 'Clause' : 'Frais'}</span>
            <span>Prime</span>
            <span>N. clause</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input
              className="omjep-field w-full rounded-lg px-2 py-1.5 font-mono text-xs text-omjep-text-primary"
              value={draft.fee}
              onChange={(e) =>
                setCounterDraft((d) => ({
                  ...d,
                  [`b-${offer.id}`]: { ...draft, fee: e.target.value },
                }))
              }
            />
            <input
              className="omjep-field w-full rounded-lg px-2 py-1.5 font-mono text-xs text-omjep-text-primary"
              value={draft.sal}
              onChange={(e) =>
                setCounterDraft((d) => ({
                  ...d,
                  [`b-${offer.id}`]: { ...draft, sal: e.target.value },
                }))
              }
            />
            <input
              className="omjep-field w-full rounded-lg px-2 py-1.5 font-mono text-xs text-omjep-text-primary"
              value={draft.clause}
              onChange={(e) =>
                setCounterDraft((d) => ({
                  ...d,
                  [`b-${offer.id}`]: { ...draft, clause: e.target.value },
                }))
              }
            />
          </div>
          <button
            type="button"
            disabled={busy || signLocked}
            onClick={() =>
              buyerRespond(offer.id, {
                action: 'REVISE',
                transfer_fee: Number(draft.fee) || undefined,
                offered_salary: Number(draft.sal) || undefined,
                offered_clause: Number(draft.clause) || undefined,
              })
            }
            className="w-full rounded-lg border border-[color-mix(in_srgb,var(--omjep-gold)_38%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_8%,var(--omjep-bg-panel-soft))] py-2 text-xs font-semibold text-omjep-text-primary transition hover:border-[color-mix(in_srgb,var(--omjep-gold)_55%,var(--omjep-mauve))] disabled:opacity-50"
          >
            Réviser l&apos;offre
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="mercato-cockpit mx-auto max-w-[1600px] space-y-5 sm:space-y-7">
      <GoldConfetti active={showConfetti} />

      <section className="relative overflow-hidden rounded-2xl border border-omjep-border/85 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_94%,#070b14)] px-5 py-5 shadow-[var(--omjep-shadow-lg)] sm:px-6 sm:py-6">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_15%_0%,color-mix(in_srgb,var(--omjep-mauve)_18%,transparent),transparent_55%),radial-gradient(ellipse_50%_60%_at_100%_100%,color-mix(in_srgb,var(--omjep-gold)_12%,transparent),transparent_50%)]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--omjep-gold)_35%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_8%,var(--omjep-bg-panel-soft))]">
                <Repeat className="h-5 w-5 text-[color-mix(in_srgb,var(--omjep-gold)_82%,var(--omjep-mauve))]" aria-hidden />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-omjep-text-muted">MERCATO LIVE</p>
            </div>
            <h1 className="font-heading text-2xl font-extrabold tracking-tight text-omjep-text-primary sm:text-3xl">
              Mercato
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-omjep-text-secondary">
              Offres, contrats, clauses libératoires et trésorerie club — tout piloter depuis ce cockpit.
            </p>
          </div>
          <span
            className={`inline-flex w-fit shrink-0 items-center rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] ${
              signaturesBlocked
                ? 'border-[color-mix(in_srgb,var(--omjep-danger)_40%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-danger)_10%,var(--omjep-bg-panel-soft))] text-omjep-text-secondary'
                : 'border-[color-mix(in_srgb,var(--omjep-success)_45%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-success)_12%,var(--omjep-bg-panel-soft))] text-omjep-text-primary'
            }`}
            role="status"
          >
            {signaturesBlocked ? 'Marché clos' : 'Marché ouvert'}
          </span>
        </div>
      </section>

      {signaturesBlocked && (
        <div
          className="rounded-xl border border-[color-mix(in_srgb,var(--omjep-danger)_35%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-danger)_08%,var(--omjep-bg-panel-soft))] px-4 py-3 text-xs font-medium leading-relaxed text-omjep-text-primary sm:text-sm"
          role="status"
        >
          Signatures et nouvelles offres sont suspendues pour votre club (compétition concernée).
        </div>
      )}

      {!loading && !canInitiateTransferOffers && user && (
        <div
          className="rounded-xl border border-amber-500/35 bg-[color-mix(in_srgb,var(--omjep-gold)_08%,var(--omjep-bg-panel-soft))] px-4 py-4 text-sm leading-relaxed text-omjep-text-primary"
          role="status"
        >
          Seuls les dirigeants du club peuvent initier des négociations. Consultez et répondez aux offres dans
          l’onglet « Mes offres joueur ».
        </div>
      )}

      {myTeam && (
        <section className="rounded-2xl border border-omjep-border/80 bg-omjep-bg-panel-soft/45 p-4 shadow-[var(--omjep-shadow-lg)] sm:p-5">
          <div className="mb-4 flex flex-col gap-3 border-b border-omjep-border/50 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-omjep-text-muted">Trésorerie club</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-omjep-text-primary">{myTeam.name ?? '—'}</p>
            </div>
            <button
              type="button"
              onClick={() => fetchData()}
              className="omjep-btn-secondary shrink-0 px-4 py-2 text-xs font-semibold normal-case tracking-normal"
            >
              Actualiser
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-omjep-border/70 bg-omjep-bg-panel/85 px-3 py-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-omjep-text-muted">Solde OC</p>
              <p className="mt-1 font-heading text-xl font-black tabular-nums text-[color-mix(in_srgb,var(--omjep-gold)_90%,var(--omjep-text-primary))]">
                {formatCurrency(myTeam.budget ?? 0, 'OC')}
              </p>
            </div>
            <div className="rounded-xl border border-omjep-border/70 bg-omjep-bg-panel/85 px-3 py-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-omjep-text-muted">Réservé mercato</p>
              <p className="mt-1 font-heading text-xl font-black tabular-nums text-omjep-text-primary">
                {canInitiateTransferOffers ? formatCurrency(clubMercatoReservedTotalOc, 'OC') : '—'}
              </p>
            </div>
            <div className="rounded-xl border border-[color-mix(in_srgb,var(--omjep-gold)_28%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_06%,var(--omjep-bg-panel))] px-3 py-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-omjep-text-muted">Disponible</p>
              <p className="mt-1 font-heading text-xl font-black tabular-nums text-[color-mix(in_srgb,var(--omjep-gold)_88%,var(--omjep-text-primary))]">
                {formatCurrency(clubBudgetAvailableOc, 'OC')}
              </p>
            </div>
          </div>
        </section>
      )}

      <div className="omjep-tabrail flex w-full max-w-full flex-wrap gap-1 p-1">
        {mainTabsForUi.map(({ key, label, icon: Icon, count }) => {
          const active = mainTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setMainTab(key)}
              className={`omjep-tabrail__btn ${active ? 'omjep-tabrail__btn--active' : ''}`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">{label}</span>
              {count > 0 ? (
                <span className="omjep-badge ml-0.5 py-0 font-mono tabular-nums">{count}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-omjep-mauve" aria-hidden />
        </div>
      )}

      {!loading && mainTab === 'club' && (
        <>
          <div className="omjep-tabrail flex w-full max-w-full flex-wrap gap-1 p-1">
            {([
              { key: 'received' as const, label: 'Côté club vendeur', icon: Inbox, count: pendingReceivedCount },
              { key: 'sent' as const, label: 'Offres envoyées', icon: Send, count: pendingSentCount },
            ]).map(({ key, label, icon: Icon, count }) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`omjep-tabrail__btn ${active ? 'omjep-tabrail__btn--active' : ''}`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{label}</span>
                  {count > 0 ? (
                    <span className="omjep-badge ml-0.5 py-0 font-mono tabular-nums">{count}</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            {currentClubList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-omjep-border/80 bg-omjep-bg-panel-soft/40 px-6 py-14 text-center">
                <p className="text-sm text-omjep-text-secondary">Aucune offre dans cette catégorie.</p>
              </div>
            ) : (
              currentClubList.map((offer) => {
                const cfg =
                  statusConfig[offer.status as keyof typeof statusConfig] ?? statusConfig.PENDING;
                const StatusIcon = cfg.icon;
                const statusLabel = mercatoOfferStatusLabel(offer);
                const otherTeam = activeTab === 'sent' ? offer.toTeam : offer.fromTeam;
                const otherLabel =
                  otherTeam?.name ??
                  (activeTab === 'sent' && offer.to_team_id == null ? 'Agent libre' : '—');
                return (
                  <div
                    key={offer.id}
                    className="rounded-xl border border-omjep-border/75 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_92%,#060910)] p-4 shadow-sm transition hover:border-[color-mix(in_srgb,var(--omjep-mauve)_30%,var(--omjep-border))] sm:p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="shrink-0">
                        {otherTeam?.logo_url ? (
                          <img
                            src={otherTeam.logo_url}
                            alt=""
                            className="h-12 w-12 rounded-xl border border-omjep-border/70 object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-omjep-border/80 bg-omjep-bg-panel-soft text-lg font-bold text-omjep-text-primary">
                            {otherLabel.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.className}`}>
                            <StatusIcon className="h-2.5 w-2.5 shrink-0" aria-hidden />
                            {statusLabel}
                          </span>
                          <span className="text-[10px] text-omjep-text-muted">{timeAgo(offer.created_at)}</span>
                        </div>
                        <p className="mt-2 text-sm text-omjep-text-primary">
                          <span className="font-semibold text-omjep-text-primary">{offer.fromTeam.name ?? '—'}</span>
                          {' → '}
                          <span className="text-omjep-text-secondary">
                            {offer.toTeam?.name ?? (offer.to_team_id == null ? 'Agent libre' : '—')}
                          </span>
                          {' · '}
                          <Link
                            to={`/dashboard/profile/${offer.player_id}`}
                            className="font-semibold text-omjep-text-primary hover:opacity-80"
                          >
                            {offer.player.ea_persona_name ?? 'Joueur'}
                          </Link>
                        </p>
                        <OfferTermsGrid offer={offer} />
                        {renderBuyerActions(offer)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {!loading && mainTab === 'player' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-omjep-border/60 bg-omjep-bg-panel-soft/50 px-4 py-3 text-sm leading-relaxed text-omjep-text-secondary">
            <span className="font-semibold text-omjep-text-primary">Joueur sous contrat ailleurs :</span> ouvrez sa fiche
            profil et utilisez <span className="text-omjep-text-primary">« Activer la clause »</span> pour négocier un
            transfert avec clause libératoire.
          </div>
          {playerOffers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-omjep-border/80 bg-omjep-bg-panel-soft/40 px-6 py-14 text-center">
              <MessageCircle className="mx-auto mb-3 h-10 w-10 text-omjep-text-muted" aria-hidden />
              <p className="text-sm text-omjep-text-secondary">Aucune négociation en cours pour vous.</p>
            </div>
          ) : (
            playerOffers.map((offer) => {
              const cfg =
                statusConfig[offer.status as keyof typeof statusConfig] ?? statusConfig.PENDING;
              const StatusIcon = cfg.icon;
              const statusLabel = mercatoOfferStatusLabel(offer);
              return (
                <div
                  key={offer.id}
                  className="rounded-xl border border-omjep-border/75 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_92%,#060910)] p-4 shadow-sm sm:p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase ${cfg.className}`}>
                      <StatusIcon className="h-2.5 w-2.5 shrink-0" aria-hidden />
                      {statusLabel}
                    </span>
                    <span className="text-[10px] text-omjep-text-muted">{timeAgo(offer.created_at)}</span>
                  </div>
                  <p className="mt-2 text-sm text-omjep-text-primary">
                    Proposition de{' '}
                    <span className="font-bold text-omjep-text-primary">{offer.fromTeam.name ?? '—'}</span>
                  </p>
                  <OfferTermsGrid offer={offer} />
                  <PlayerOfferActions
                    offer={offer}
                    currentUserId={user?.id}
                    busy={respondingId === offer.id}
                    signaturesDisabled={signaturesBlocked}
                    draft={
                      counterDraft[offer.id] ?? {
                        fee: String(offer.transfer_fee),
                        sal: String(offer.offered_salary),
                        clause: String(offer.offered_clause),
                      }
                    }
                    onDraftChange={(d) =>
                      setCounterDraft((prev) => ({ ...prev, [offer.id]: d }))
                    }
                    onAcceptOffer={handleAcceptOffer}
                    onRejectOffer={handleRejectOffer}
                    onCounterOffer={handlePlayerCounterOffer}
                  />
                </div>
              );
            })
          )}
        </div>
      )}

      {!loading && mainTab === 'freeAgents' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-omjep-border/60 bg-omjep-bg-panel-soft/50 px-4 py-3 text-sm leading-relaxed text-omjep-text-secondary">
            <span className="font-semibold text-omjep-text-primary">Agent libre :</span> contrat sans frais vendeur —{' '}
            <span className="text-omjep-text-primary">prime de signature uniquement</span> est réservée sur votre
            trésorerie. Pour un joueur encore sous contrat, ouvrez sa fiche et utilisez la clause libératoire.
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <label htmlFor="mercato-position-filter" className="text-xs font-semibold uppercase tracking-wide text-omjep-text-muted">
              Position
            </label>
            <select
              id="mercato-position-filter"
              value={freeAgentPosition}
              onChange={(e) => setFreeAgentPosition(e.target.value)}
              className="omjep-field max-w-full rounded-xl py-2.5 text-sm text-omjep-text-primary sm:max-w-xs"
            >
              <option value="">Toutes les positions</option>
              <option value="GK">Gardien (GK)</option>
              <option value="DC">Défenseur central (DC)</option>
              <option value="LAT">Latéral gauche (LAT)</option>
              <option value="RAT">Latéral droit (RAT)</option>
              <option value="MDC">Milieu défensif (MDC)</option>
              <option value="MOC">Milieu offensif (MOC)</option>
              <option value="MG">Milieu gauche (MG)</option>
              <option value="MD">Milieu droit (MD)</option>
              <option value="BU">Attaquant (BU)</option>
              <option value="ATT">Attaquant (ATT)</option>
            </select>
          </div>

          {freeAgents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-omjep-border/80 bg-omjep-bg-panel-soft/40 px-6 py-14 text-center">
              <Users className="mx-auto mb-3 h-10 w-10 text-omjep-text-muted" aria-hidden />
              <p className="text-sm text-omjep-text-secondary">Aucun agent libre disponible pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {freeAgents
                .filter((agent) => !freeAgentPosition || agent.position === freeAgentPosition)
                .map((agent) => (
                  <article
                    key={agent.id}
                    className="group flex flex-col rounded-2xl border border-omjep-border/75 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_94%,#070c14)] p-4 shadow-[var(--omjep-shadow-lg)] transition hover:border-[color-mix(in_srgb,var(--omjep-mauve)_35%,var(--omjep-border))] sm:p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-omjep-border/80 bg-omjep-bg-panel-soft font-heading text-lg font-bold text-[color-mix(in_srgb,var(--omjep-gold)_85%,var(--omjep-text-primary))]">
                        {(agent.name ?? '?').charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/dashboard/profile/${agent.id}`}
                          className="block truncate font-heading text-base font-bold text-omjep-text-primary transition hover:text-omjep-mauve"
                        >
                          {agent.name ?? '—'}
                        </Link>
                        <p className="mt-0.5 text-xs text-omjep-text-muted">
                          Marché : <span className="font-mono tabular-nums text-[color-mix(in_srgb,var(--omjep-gold)_88%,var(--omjep-text-primary))]">0 OC</span>
                        </p>
                      </div>
                      <span className="shrink-0 rounded-lg border border-omjep-border/70 bg-omjep-bg-panel-soft px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-omjep-text-secondary">
                        {agent.position}
                      </span>
                    </div>
                    <span className="mt-3 inline-flex w-fit rounded-full border border-[color-mix(in_srgb,var(--omjep-mauve)_35%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-mauve)_10%,transparent)] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-omjep-text-primary">
                      Agent libre
                    </span>

                    <div className="mt-4 grid grid-cols-4 gap-1 rounded-xl border border-omjep-border/50 bg-omjep-bg-panel/60 py-2 text-[11px]">
                      <div className="text-center">
                        <span className="block text-[9px] font-semibold uppercase tracking-wide text-omjep-text-muted">M</span>
                        <span className="font-semibold tabular-nums text-omjep-text-primary">{agent.stats?.matches_played ?? 0}</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-[9px] font-semibold uppercase tracking-wide text-omjep-text-muted">B</span>
                        <span className="font-semibold tabular-nums text-omjep-text-primary">{agent.stats?.goals ?? 0}</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-[9px] font-semibold uppercase tracking-wide text-omjep-text-muted">A</span>
                        <span className="font-semibold tabular-nums text-omjep-text-primary">{agent.stats?.assists ?? 0}</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-[9px] font-semibold uppercase tracking-wide text-omjep-text-muted">N</span>
                        <span className="font-mono font-semibold tabular-nums text-omjep-text-primary">
                          {(agent.stats?.average_rating ?? 0).toFixed(1)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 border-t border-omjep-border/55 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[10px] leading-relaxed text-omjep-text-muted">
                        Réserve mercato = prime de signature uniquement.
                      </p>
                      <button
                        type="button"
                        disabled={!myTeam || signaturesBlocked || !canInitiateTransferOffers}
                        onClick={() => handleOpenOfferModal(agent)}
                        className="omjep-btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold normal-case tracking-normal disabled:pointer-events-none disabled:opacity-40"
                      >
                        Proposer un contrat
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          )}
        </div>
      )}

      {myTeam && selectedPlayer && (
        <TransferOfferModal
          isOpen={isModalOpen}
          onClose={handleCloseOfferModal}
          player={selectedPlayer}
          myTeam={myTeam}
          transferMarketClosed={signaturesBlocked}
          canInitiateTransfers={canInitiateTransferOffers}
          clubMercatoReservedOtherOc={clubMercatoReservedOtherOc}
          onSuccess={() => {
            void refreshEconomyFromApi(patchUser, user?.xp);
            void fetchData();
          }}
          pendingOfferFromMyClub={pendingRecapForModal}
        />
      )}
    </div>
  );
}
