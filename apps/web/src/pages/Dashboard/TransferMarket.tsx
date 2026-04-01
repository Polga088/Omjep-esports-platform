import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Repeat, Send, Inbox, Loader2, Check, X, Clock,
  ShieldCheck, MessageCircle, User, Gavel, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import GoldConfetti from '@/components/GoldConfetti';
import { useAuthStore } from '@/store/useAuthStore';

interface TeamInfo {
  id: string;
  name: string;
  logo_url: string | null;
  budget?: number;
}

interface PlayerInfo {
  id: string;
  ea_persona_name: string | null;
  preferred_position: string | null;
}

interface TransferOfferRow {
  id: string;
  player_id: string;
  from_team_id: string;
  to_team_id: string;
  transfer_fee: number;
  offered_salary: number;
  offered_clause: number;
  duration_months: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTER_OFFER' | 'CANCELLED';
  negotiation_turn: 'PLAYER' | 'BUYING_CLUB';
  created_at: string;
  responded_at: string | null;
  player: PlayerInfo;
  fromTeam: TeamInfo;
  toTeam: TeamInfo;
}

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

function formatOmjep(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString('fr-FR');
}

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
  const { user } = useAuthStore();
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

  const fetchData = useCallback(async () => {
    try {
      const teamRes = await api.get<{ id: string; name: string; budget: number }>('/teams/my-team');
      setMyTeam(teamRes.data);
      const [offersRes, asPlayerRes, freeAgentsRes] = await Promise.all([
        api.get<TransferOfferRow[]>('/transfers/offers', {
          params: { team_id: teamRes.data.id },
        }),
        api.get<TransferOfferRow[]>('/transfers/offers/as-player'),
        api.get<FreeAgent[]>('/transfers/free-agents'),
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

  const sentOffers = offers.filter((o) => myTeam && o.from_team_id === myTeam.id);
  const receivedOffers = offers.filter((o) => myTeam && o.to_team_id === myTeam.id);
  const currentClubList = activeTab === 'sent' ? sentOffers : receivedOffers;

  const pendingSentCount = sentOffers.filter((o) => o.status === 'PENDING' || o.status === 'COUNTER_OFFER').length;
  const pendingReceivedCount = receivedOffers.filter((o) => o.status === 'PENDING' || o.status === 'COUNTER_OFFER').length;
  const pendingPlayerCount = playerOffers.length;

  const playerRespond = async (offerId: string, body: Record<string, unknown>) => {
    setRespondingId(offerId);
    try {
      await api.patch(`/transfers/offer/${offerId}/player-respond`, body);
      toast.success('Réponse envoyée.');
      await fetchData();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Erreur.';
      toast.error(msg ?? 'Erreur');
    } finally {
      setRespondingId(null);
    }
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
      await fetchData();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Erreur.';
      toast.error(msg ?? 'Erreur');
    } finally {
      setRespondingId(null);
    }
  };

  const renderOfferTerms = (offer: TransferOfferRow) => (
    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
      <div className="rounded-lg bg-white/5 px-2 py-1.5 border border-white/5">
        <span className="text-slate-500 block">Frais transfert</span>
        <span className="font-bold text-[#FFD700] tabular-nums">{formatOmjep(offer.transfer_fee)} OC</span>
      </div>
      <div className="rounded-lg bg-white/5 px-2 py-1.5 border border-white/5">
        <span className="text-slate-500 block">Salaire / an</span>
        <span className="font-bold text-emerald-400/90 tabular-nums">{formatOmjep(offer.offered_salary)} OC</span>
      </div>
      <div className="rounded-lg bg-white/5 px-2 py-1.5 border border-white/5">
        <span className="text-slate-500 block">Clause lib.</span>
        <span className="font-bold text-sky-400/90 tabular-nums">{formatOmjep(offer.offered_clause)} OC</span>
      </div>
      <div className="rounded-lg bg-white/5 px-2 py-1.5 border border-white/5">
        <span className="text-slate-500 block">Durée</span>
        <span className="font-bold text-slate-300">{offer.duration_months} mois</span>
      </div>
    </div>
  );

  const renderPlayerActions = (offer: TransferOfferRow) => {
    const isPlayer = user?.id === offer.player_id;
    const busy = respondingId === offer.id;
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

    const draft = counterDraft[offer.id] ?? {
      fee: String(offer.transfer_fee),
      sal: String(offer.offered_salary),
      clause: String(offer.offered_clause),
    };

    return (
      <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
        <p className="text-xs font-semibold text-slate-400 flex items-center gap-2">
          <User className="w-3.5 h-3.5" />
          Votre décision (joueur)
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => playerRespond(offer.id, { action: 'ACCEPT' })}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Accepter & signer
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => playerRespond(offer.id, { action: 'REJECT' })}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-white/5 text-slate-400 border border-white/10 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
            Refuser
          </button>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-amber-400/80 font-bold">Contre-proposer</p>
          <div className="grid grid-cols-3 gap-2">
            <input
              placeholder="Frais"
              className="w-full px-2 py-1.5 rounded-lg bg-[#0D1221] border border-white/10 text-xs text-white placeholder:text-slate-600"
              value={draft.fee}
              onChange={(e) =>
                setCounterDraft((d) => ({
                  ...d,
                  [offer.id]: { ...draft, fee: e.target.value },
                }))
              }
            />
            <input
              placeholder="Salaire"
              className="w-full px-2 py-1.5 rounded-lg bg-[#0D1221] border border-white/10 text-xs text-white placeholder:text-slate-600"
              value={draft.sal}
              onChange={(e) =>
                setCounterDraft((d) => ({
                  ...d,
                  [offer.id]: { ...draft, sal: e.target.value },
                }))
              }
            />
            <input
              placeholder="Clause"
              className="w-full px-2 py-1.5 rounded-lg bg-[#0D1221] border border-white/10 text-xs text-white placeholder:text-slate-600"
              value={draft.clause}
              onChange={(e) =>
                setCounterDraft((d) => ({
                  ...d,
                  [offer.id]: { ...draft, clause: e.target.value },
                }))
              }
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              playerRespond(offer.id, {
                action: 'COUNTER',
                transfer_fee: Number(draft.fee) || undefined,
                offered_salary: Number(draft.sal) || undefined,
                offered_clause: Number(draft.clause) || undefined,
              })
            }
            className="w-full py-2 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-50"
          >
            Envoyer la contre-proposition
          </button>
        </div>
      </div>
    );
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
            <p className="text-xs text-slate-500">Budget club — {myTeam.name}</p>
            <p className="text-lg font-black text-emerald-400 tabular-nums">
              {formatOmjep(myTeam.budget)} OC
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
                        {otherTeam.logo_url ? (
                          <img
                            src={otherTeam.logo_url}
                            alt=""
                            className="w-12 h-12 rounded-xl object-cover border border-white/10"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/10 border border-[#FFD700]/15 flex items-center justify-center text-lg font-bold text-[#FFD700]">
                            {otherTeam.name.charAt(0)}
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
                          <span className="font-semibold text-[#FFD700]">{offer.fromTeam.name}</span>
                          {' → '}
                          <span className="text-slate-400">{offer.toTeam.name}</span>
                          {' · '}
                          <Link
                            to={`/dashboard/profile/${offer.player_id}`}
                            className="font-semibold hover:text-[#FFD700]"
                          >
                            {offer.player.ea_persona_name ?? 'Joueur'}
                          </Link>
                        </p>
                        {renderOfferTerms(offer)}
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
                    Proposition de <span className="font-bold text-[#FFD700]">{offer.fromTeam.name}</span>
                  </p>
                  {renderOfferTerms(offer)}
                  {renderPlayerActions(offer)}
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
                        {agent.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/dashboard/profile/${agent.id}`}
                          className="font-semibold text-white hover:text-[#FFD700] truncate block"
                        >
                          {agent.name}
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
                        <span className="font-semibold text-white">{agent.stats.matches_played}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-slate-500 block">Buts</span>
                        <span className="font-semibold text-emerald-400">{agent.stats.goals}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-slate-500 block">Passes</span>
                        <span className="font-semibold text-sky-400">{agent.stats.assists}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-slate-500 block">Note</span>
                        <span className="font-semibold text-[#FFD700]">{agent.stats.average_rating.toFixed(1)}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5">
                      <p className="text-[10px] text-slate-500">
                        Recrutement gratuit · Aucun frais de transfert
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
