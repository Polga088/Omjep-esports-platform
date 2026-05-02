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
    className: 'bg-transparent text-black dark:text-white border-neutral-200 dark:border-neutral-800',
    icon: Clock,
  },
  ACCEPTED: {
    label: 'Signé',
    className: 'bg-transparent text-black dark:text-white border-neutral-200 dark:border-neutral-800',
    icon: Check,
  },
  REJECTED: {
    label: 'Refusé',
    className: 'bg-transparent text-black dark:text-white border-neutral-200 dark:border-neutral-800',
    icon: X,
  },
  COUNTER_OFFER: {
    label: 'Contre-proposition',
    className: 'bg-transparent text-black dark:text-white border-neutral-200 dark:border-neutral-800',
    icon: MessageCircle,
  },
  CANCELLED: {
    label: 'Annulée',
    className: 'bg-transparent text-black/70 dark:text-white/70 border-neutral-200 dark:border-neutral-800',
    icon: X,
  },
  EXPIRED: {
    label: 'Expirée',
    className: 'bg-transparent text-black/60 dark:text-white/60 border-neutral-200 dark:border-neutral-800',
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
      label: 'Mes offres (joueur)',
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
      <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
        <p className="text-xs font-semibold text-slate-400 flex items-center gap-2">
          <Gavel className="w-3.5 h-3.5" />
          Réponse club acheteur
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || signLocked}
            onClick={() => buyerRespond(offer.id, { action: 'ACCEPT_COUNTER' })}
            className="inline-flex items-center gap-1.5 rounded-none border border-neutral-200 bg-transparent px-3 py-2 text-xs font-bold text-black dark:border-neutral-800 dark:text-white"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            &gt; [ ACCEPTER ] &lt;
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => buyerRespond(offer.id, { action: 'REJECT' })}
            className="inline-flex items-center gap-1.5 rounded-none border border-neutral-200 bg-transparent px-3 py-2 text-xs font-bold text-black/70 dark:border-neutral-800 dark:text-white/70"
          >
            &gt; [ ABANDONNER ] &lt;
          </button>
        </div>
        <div className="rounded-none border border-neutral-200 p-3 space-y-2 dark:border-neutral-800">
          <p className="text-[10px] font-bold uppercase text-black/60 dark:text-white/60">Nouvelle proposition</p>
          <div className="grid grid-cols-3 gap-1 text-[9px] uppercase text-black/50 dark:text-white/50">
            <span>{offer.transfer_mode === 'RELEASE_CLAUSE_BUYOUT' ? 'Clause' : 'Frais'}</span>
            <span>Prime</span>
            <span>N. clause</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input
              className="w-full rounded-none border border-neutral-200 bg-transparent px-2 py-1.5 font-mono text-xs text-black dark:border-neutral-800 dark:text-white"
              value={draft.fee}
              onChange={(e) =>
                setCounterDraft((d) => ({
                  ...d,
                  [`b-${offer.id}`]: { ...draft, fee: e.target.value },
                }))
              }
            />
            <input
              className="w-full rounded-none border border-neutral-200 bg-transparent px-2 py-1.5 font-mono text-xs text-black dark:border-neutral-800 dark:text-white"
              value={draft.sal}
              onChange={(e) =>
                setCounterDraft((d) => ({
                  ...d,
                  [`b-${offer.id}`]: { ...draft, sal: e.target.value },
                }))
              }
            />
            <input
              className="w-full rounded-none border border-neutral-200 bg-transparent px-2 py-1.5 font-mono text-xs text-black dark:border-neutral-800 dark:text-white"
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
            className="w-full rounded-none border border-neutral-200 bg-transparent py-2 text-xs font-bold text-black dark:border-neutral-800 dark:text-white"
          >
            &gt; [ RÉVISER ] &lt;
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="omjep-product-page space-y-8">
      <GoldConfetti active={showConfetti} />

      <div className="omjep-premium-panel rounded-none border border-black/10 bg-transparent px-12 py-12 dark:border-white/20">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-none border border-neutral-200 bg-transparent dark:border-neutral-800">
            <Repeat className="w-4 h-4 text-black dark:text-white" />
          </div>
          <span className="omjep-kicker">
            Mercato Live
          </span>
        </div>
        <h1 className="omjep-title-condensed text-4xl font-bold tracking-tight text-black dark:text-white">MERCATO</h1>
        <p className="mt-1 text-sm omjep-muted-label">
          Offres, contre-propositions et signature — budget en OMJEP Coins (OC)
        </p>
      </div>

      {signaturesBlocked && (
        <div
          className="omjep-premium-panel rounded-none border-neutral-200 px-4 py-3 font-mono text-xs uppercase tracking-wider text-black dark:border-neutral-800 dark:text-white"
          role="status"
        >
          MARCHÉ CLOS — Les signatures et nouvelles offres sont suspendues pour votre club (compétition
          concernée).
        </div>
      )}

      {!loading && !canInitiateTransferOffers && user && (
        <div
          className="omjep-premium-panel rounded-none border border-amber-500/25 bg-amber-500/[0.06] px-5 py-4 text-sm text-amber-100 dark:border-amber-500/30"
          role="status"
        >
          Seuls les dirigeants du club peuvent initier des négociations. Vous pouvez consulter et répondre
          aux offres reçues dans l’onglet « Mes offres (joueur) ».
        </div>
      )}

      {myTeam && (
        <div className="omjep-premium-panel omjep-gold-accent flex flex-col gap-3 rounded-none border-neutral-200 px-5 py-4 dark:border-neutral-800 sm:flex-row sm:items-center">
          <div className="flex-1 space-y-1">
            <p className="text-[12px] uppercase tracking-widest opacity-50">Trésorerie club — {myTeam.name ?? '—'}</p>
            <p className="font-mono text-lg font-black text-black tabular-nums dark:text-white">
              {formatCurrency(myTeam.budget ?? 0, 'OC')}
            </p>
            {canInitiateTransferOffers && (
              <p className="text-xs text-black/70 dark:text-white/70">
                Réservé mercato (offres envoyées en cours) :{' '}
                <span className="font-mono font-semibold text-black dark:text-white">
                  {formatCurrency(clubMercatoReservedTotalOc, 'OC')}
                </span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => fetchData()}
            className="shrink-0 text-xs text-black hover:underline dark:text-white"
          >
            &gt; [ ACTUALISER ] &lt;
          </button>
        </div>
      )}

      <div className="omjep-premium-panel flex w-fit flex-wrap items-center gap-1 rounded-none border-neutral-200 p-1 dark:border-neutral-800">
        {mainTabsForUi.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setMainTab(key)}
            className={`flex items-center gap-2 rounded-none px-4 py-2.5 text-sm font-semibold transition-all ${
              mainTab === key
                ? 'border border-neutral-200 bg-white/[0.02] text-black dark:border-neutral-800 dark:text-white'
                : 'border border-transparent text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {count > 0 && (
              <span className="ml-1 rounded-none border border-neutral-200 px-1.5 py-0.5 text-[10px] font-bold text-black dark:border-neutral-800 dark:text-white">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-black dark:text-white" />
        </div>
      )}

      {!loading && mainTab === 'club' && (
        <>
          <div className="omjep-premium-panel flex w-fit items-center gap-1 rounded-none border-neutral-200 p-1 dark:border-neutral-800">
            {([
              { key: 'received' as const, label: 'Côté club vendeur', icon: Inbox, count: pendingReceivedCount },
              { key: 'sent' as const, label: 'Offres envoyées', icon: Send, count: pendingSentCount },
            ]).map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 rounded-none px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  activeTab === key
                    ? 'border border-neutral-200 bg-white/[0.02] text-black dark:border-neutral-800 dark:text-white'
                    : 'border border-transparent text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {count > 0 && (
                  <span className="ml-1 rounded-none border border-neutral-200 px-1.5 py-0.5 text-[10px] font-bold text-black dark:border-neutral-800 dark:text-white">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {currentClubList.length === 0 ? (
              <div className="omjep-premium-panel rounded-none border-neutral-200 p-12 text-center dark:border-neutral-800">
                <p className="text-sm text-slate-500">Aucune offre dans cette catégorie.</p>
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
                    className={`omjep-premium-panel rounded-none bg-black/[0.02] p-5 dark:bg-white/[0.05] ${
                      offer.status === 'ACCEPTED'
                        ? 'border-neutral-200 dark:border-neutral-800'
                        : offer.status === 'PENDING' || offer.status === 'COUNTER_OFFER'
                          ? 'border-neutral-200 dark:border-neutral-800'
                          : 'border-neutral-200 dark:border-neutral-800'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="shrink-0">
                        {otherTeam?.logo_url ? (
                          <img
                            src={otherTeam.logo_url}
                            alt=""
                            className="h-12 w-12 rounded-none border border-neutral-200 object-cover dark:border-neutral-800"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-none border border-neutral-200 bg-transparent text-lg font-bold text-black dark:border-neutral-800 dark:text-white">
                            {otherLabel.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 rounded-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${cfg.className}`}>
                            <StatusIcon className="w-2.5 h-2.5" />
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
        <div className="space-y-3">
          {playerOffers.length === 0 ? (
            <div className="omjep-premium-panel rounded-none border-neutral-200 p-12 text-center dark:border-neutral-800">
              <MessageCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Aucune négociation en cours pour vous.</p>
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
                    className="omjep-premium-panel rounded-none border-neutral-200 bg-black/[0.02] p-5 dark:border-neutral-800 dark:bg-white/[0.05]"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 rounded-none px-2 py-0.5 text-[10px] font-bold uppercase border ${cfg.className}`}>
                      <StatusIcon className="w-2.5 h-2.5" />
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
        <div className="space-y-4">
          <p className="text-sm text-black/75 dark:text-white/75 max-w-2xl">
            Joueurs sans contrat actif : proposition de contrat (prime de signature, pas de frais vendeur).
            Pour un joueur encore sous contrat dans un autre club, ouvrez sa fiche profil et utilisez « Activer la
            clause ».
          </p>
          <div className="flex items-center gap-4 flex-wrap border-b border-black/10 pb-4 dark:border-white/20">
            <label className="text-[12px] font-mono uppercase tracking-widest text-black/55 dark:text-white/55">Filtrer par position</label>
            <select
              value={freeAgentPosition}
              onChange={(e) => setFreeAgentPosition(e.target.value)}
              className="rounded-none border border-neutral-200 bg-transparent px-3 py-2 text-sm text-black focus:ring-0 dark:border-neutral-800 dark:text-white"
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
            <div className="omjep-premium-panel rounded-none border-neutral-200 p-12 text-center dark:border-neutral-800">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Aucun agent libre disponible pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {freeAgents
                .filter((agent) => !freeAgentPosition || agent.position === freeAgentPosition)
                .map((agent) => (
                  <div
                    key={agent.id}
                    className="omjep-premium-panel omjep-premium-hover rounded-none border-neutral-200 bg-white/[0.02] p-5 transition-all hover:border-neutral-200 dark:border-neutral-800 dark:hover:border-neutral-800"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-none border border-neutral-200 bg-transparent text-lg font-bold text-black dark:border-neutral-800 dark:text-white">
                        {(agent.name ?? '?').charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/dashboard/profile/${agent.id}`}
                          className="block truncate font-semibold text-black hover:text-black dark:text-white dark:hover:text-white"
                        >
                          {agent.name ?? '—'}
                        </Link>
                        <span className="font-mono text-xs text-black dark:text-white">Agent libre · 0 OC</span>
                      </div>
                      <span className="rounded-none border border-neutral-200 bg-transparent px-2 py-1 text-[10px] font-bold text-black/70 dark:border-neutral-800 dark:text-white/70">
                        {agent.position}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-4 gap-2 font-mono text-[11px]">
                      <div className="text-center">
                        <span className="block text-omjep-text-muted">Matchs</span>
                        <span className="font-semibold text-omjep-text-primary">{agent.stats?.matches_played ?? 0}</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-omjep-text-muted">Buts</span>
                        <span className="font-mono font-semibold text-omjep-text-primary">{agent.stats?.goals ?? 0}</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-omjep-text-muted">Passes</span>
                        <span className="font-semibold text-omjep-cobalt">{agent.stats?.assists ?? 0}</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-omjep-text-muted">Note</span>
                        <span className="font-mono font-semibold text-omjep-text-primary">
                          {(agent.stats?.average_rating ?? 0).toFixed(1)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-omjep-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <p className="text-[10px] text-omjep-text-muted">
                        Contrat joueur libre — réserve = prime de signature uniquement
                      </p>
                      <button
                        type="button"
                        disabled={!myTeam || signaturesBlocked || !canInitiateTransferOffers}
                        onClick={() => handleOpenOfferModal(agent)}
                        className="inline-flex items-center justify-center gap-2 rounded-none border border-neutral-200 bg-transparent px-4 py-2.5 text-xs font-bold text-black transition disabled:pointer-events-none disabled:opacity-40 dark:border-neutral-800 dark:text-white"
                      >
                        &gt; [ PROPOSER CONTRAT ] &lt;
                      </button>
                    </div>
                  </div>
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
