import { useState, useEffect, useCallback, useMemo, type ComponentProps } from 'react';
import { Link } from 'react-router-dom';
import {
  Repeat, Send, Inbox, Loader2, Check, X, Clock,
  ShieldCheck, MessageCircle, User, Gavel, Users,
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
  type TransferOfferRow,
} from '@/components/TransferOfferRow';

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
    className: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    icon: Clock,
  },
  ACCEPTED: {
    label: 'Signé',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: Check,
  },
  REJECTED: {
    label: 'Refusé',
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
    icon: X,
  },
  COUNTER_OFFER: {
    label: 'Contre-proposition',
    className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    icon: MessageCircle,
  },
  CANCELLED: {
    label: 'Annulée',
    className: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    icon: X,
  },
} as const;

export default function TransferMarket() {
  const { user, patchUser } = useAuthStore();
  const [myTeam, setMyTeam] = useState<{ id: string; name: string; budget: number } | null>(null);
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
      const teamRes = await api.get<{ id: string; name: string; budget: number }>('/teams/my-team');
      setMyTeam(teamRes.data);
      const [offersRes, asPlayerRes, freeAgentsRes] = await Promise.all([
        api.get<TransferOfferRow[]>('/transfers/offers', {
          params: { team_id: teamRes.data.id },
        }),
        api.get<TransferOfferRow[]>('/transfers/offers/as-player'),
        api.get<FreeAgent[]>('/transfers/free-agents', {
          params: { team_id: teamRes.data.id },
        }),
      ]);
      setOffers(offersRes.data);
      setPlayerOffers(asPlayerRes.data);
      setFreeAgents(freeAgentsRes.data);
    } catch {
      /* silent */
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
      status: pending.status as PendingOfferRecap['status'],
      negotiation_turn: pending.negotiation_turn,
    };
  }, [selectedPlayer, sentOffers]);

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
    const isBuyer = myTeam && offer.from_team_id === myTeam.id;
    const busy = respondingId === offer.id;
    if (!isBuyer || offer.status !== 'COUNTER_OFFER' || offer.negotiation_turn !== 'BUYING_CLUB') {
      return null;
    }

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
            disabled={busy}
            onClick={() => buyerRespond(offer.id, { action: 'ACCEPT_COUNTER' })}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Accepter les termes du joueur
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => buyerRespond(offer.id, { action: 'REJECT' })}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-white/5 text-slate-400 border border-white/10"
          >
            Abandonner
          </button>
        </div>
        <div className="rounded-xl border border-[#FFD700]/15 p-3 space-y-2">
          <p className="text-[10px] uppercase text-slate-500 font-bold">Nouvelle proposition</p>
          <div className="grid grid-cols-3 gap-2">
            <input
              className="w-full px-2 py-1.5 rounded-lg bg-[#0D1221] border border-white/10 text-xs text-white"
              value={draft.fee}
              onChange={(e) =>
                setCounterDraft((d) => ({
                  ...d,
                  [`b-${offer.id}`]: { ...draft, fee: e.target.value },
                }))
              }
            />
            <input
              className="w-full px-2 py-1.5 rounded-lg bg-[#0D1221] border border-white/10 text-xs text-white"
              value={draft.sal}
              onChange={(e) =>
                setCounterDraft((d) => ({
                  ...d,
                  [`b-${offer.id}`]: { ...draft, sal: e.target.value },
                }))
              }
            />
            <input
              className="w-full px-2 py-1.5 rounded-lg bg-[#0D1221] border border-white/10 text-xs text-white"
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
            disabled={busy}
            onClick={() =>
              buyerRespond(offer.id, {
                action: 'REVISE',
                transfer_fee: Number(draft.fee) || undefined,
                offered_salary: Number(draft.sal) || undefined,
                offered_clause: Number(draft.clause) || undefined,
              })
            }
            className="w-full py-2 rounded-lg text-xs font-bold bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/25"
          >
            Renvoyer une offre au joueur
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <GoldConfetti active={showConfetti} />

      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/10 border border-[#FFD700]/20 flex items-center justify-center">
            <Repeat className="w-4 h-4 text-[#FFD700]" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest text-[#FFD700]/70">
            Mercato Live
          </span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Négociations</h1>
        <p className="mt-1 text-sm text-slate-500">
          Offres, contre-propositions et signature — budget en OMJEP Coins (OC)
        </p>
      </div>

      {myTeam && (
        <div className="flex items-center gap-4 px-5 py-4 rounded-xl bg-gradient-to-r from-[#FFD700]/5 to-transparent border border-[#FFD700]/15">
          <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-[#FFD700]" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-500">Budget club — {myTeam.name ?? '—'}</p>
            <p className="text-lg font-black text-emerald-400 tabular-nums">
              {formatCurrency(myTeam.budget ?? 0, 'OC')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchData()}
            className="text-xs text-[#FFD700] hover:underline"
          >
            Actualiser
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5 w-fit">
        {([
          { key: 'club' as const, label: 'Mon club', icon: Inbox, count: pendingSentCount + pendingReceivedCount },
          { key: 'player' as const, label: 'Mes offres (joueur)', icon: User, count: pendingPlayerCount },
          { key: 'freeAgents' as const, label: 'Agents libres', icon: Users, count: freeAgents.length },
        ]).map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setMainTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              mainTab === key
                ? 'bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/25'
                : 'text-slate-500 hover:text-slate-300 border border-transparent'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/15 text-orange-400">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
        </div>
      )}

      {!loading && mainTab === 'club' && (
        <>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5 w-fit">
            {([
              { key: 'received' as const, label: 'Côté club vendeur', icon: Inbox, count: pendingReceivedCount },
              { key: 'sent' as const, label: 'Offres envoyées', icon: Send, count: pendingSentCount },
            ]).map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === key
                    ? 'bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/25 shadow-sm'
                    : 'text-slate-500 hover:text-slate-300 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {count > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/15 text-orange-400">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {currentClubList.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-[#0D1221] p-12 text-center">
                <p className="text-sm text-slate-500">Aucune offre dans cette catégorie.</p>
              </div>
            ) : (
              currentClubList.map((offer) => {
                const cfg = statusConfig[offer.status];
                const StatusIcon = cfg.icon;
                const otherTeam = activeTab === 'sent' ? offer.toTeam : offer.fromTeam;
                const otherLabel =
                  otherTeam?.name ??
                  (activeTab === 'sent' && offer.to_team_id == null ? 'Agent libre' : '—');
                return (
                  <div
                    key={offer.id}
                    className={`rounded-xl border bg-[#0D1221] p-5 ${
                      offer.status === 'ACCEPTED'
                        ? 'border-emerald-500/20'
                        : offer.status === 'PENDING' || offer.status === 'COUNTER_OFFER'
                          ? 'border-[#FFD700]/15'
                          : 'border-white/5'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="shrink-0">
                        {otherTeam?.logo_url ? (
                          <img
                            src={otherTeam.logo_url}
                            alt=""
                            className="w-12 h-12 rounded-xl object-cover border border-white/10"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/10 border border-[#FFD700]/15 flex items-center justify-center text-lg font-bold text-[#FFD700]">
                            {otherLabel.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${cfg.className}`}>
                            <StatusIcon className="w-2.5 h-2.5" />
                            {cfg.label}
                          </span>
                          <span className="text-[10px] text-slate-600">{timeAgo(offer.created_at)}</span>
                          {offer.negotiation_turn === 'PLAYER' && offer.status === 'PENDING' && (
                            <span className="text-[10px] text-sky-400">Tour : joueur</span>
                          )}
                          {offer.negotiation_turn === 'BUYING_CLUB' && (
                            <span className="text-[10px] text-amber-400">Tour : club acheteur</span>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-white">
                          <span className="font-semibold text-[#FFD700]">{offer.fromTeam.name ?? '—'}</span>
                          {' → '}
                          <span className="text-slate-400">
                            {offer.toTeam?.name ?? (offer.to_team_id == null ? 'Agent libre' : '—')}
                          </span>
                          {' · '}
                          <Link
                            to={`/dashboard/profile/${offer.player_id}`}
                            className="font-semibold hover:text-[#FFD700]"
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
            <div className="rounded-2xl border border-white/5 bg-[#0D1221] p-12 text-center">
              <MessageCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Aucune négociation en cours pour vous.</p>
            </div>
          ) : (
            playerOffers.map((offer) => {
              const cfg = statusConfig[offer.status];
              const StatusIcon = cfg.icon;
              return (
                <div
                  key={offer.id}
                  className="rounded-xl border border-[#FFD700]/15 bg-[#0D1221] p-5"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${cfg.className}`}>
                      <StatusIcon className="w-2.5 h-2.5" />
                      {cfg.label}
                    </span>
                    <span className="text-[10px] text-slate-600">{timeAgo(offer.created_at)}</span>
                  </div>
                  <p className="mt-2 text-sm text-white">
                    Proposition de <span className="font-bold text-[#FFD700]">{offer.fromTeam.name ?? '—'}</span>
                  </p>
                  <OfferTermsGrid offer={offer} />
                  <PlayerOfferActions
                    offer={offer}
                    currentUserId={user?.id}
                    busy={respondingId === offer.id}
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
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-sm text-slate-400">Filtrer par position :</label>
            <select
              value={freeAgentPosition}
              onChange={(e) => setFreeAgentPosition(e.target.value)}
              className="bg-[#0D1221] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-[#FFD700]/50 focus:border-transparent"
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
            <div className="rounded-2xl border border-white/5 bg-[#0D1221] p-12 text-center">
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
                    className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-[#0D1221] p-5 hover:border-emerald-500/40 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-lg font-bold text-emerald-400">
                        {(agent.name ?? '?').charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/dashboard/profile/${agent.id}`}
                          className="font-semibold text-white hover:text-[#FFD700] truncate block"
                        >
                          {agent.name ?? '—'}
                        </Link>
                        <span className="text-xs text-emerald-400">Agent libre · 0 OC</span>
                      </div>
                      <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-white/5 text-slate-400 border border-white/5">
                        {agent.position}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-4 gap-2 text-[11px]">
                      <div className="text-center">
                        <span className="text-slate-500 block">Matchs</span>
                        <span className="font-semibold text-white">{agent.stats?.matches_played ?? 0}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-slate-500 block">Buts</span>
                        <span className="font-semibold text-emerald-400">{agent.stats?.goals ?? 0}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-slate-500 block">Passes</span>
                        <span className="font-semibold text-sky-400">{agent.stats?.assists ?? 0}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-slate-500 block">Note</span>
                        <span className="font-semibold text-[#FFD700]">
                          {(agent.stats?.average_rating ?? 0).toFixed(1)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <p className="text-[10px] text-slate-500">
                        Recrutement gratuit · Aucun frais de transfert
                      </p>
                      <button
                        type="button"
                        disabled={!myTeam}
                        onClick={() => handleOpenOfferModal(agent)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 hover:border-emerald-400/60 disabled:opacity-40 disabled:pointer-events-none transition"
                      >
                        Recruter
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
