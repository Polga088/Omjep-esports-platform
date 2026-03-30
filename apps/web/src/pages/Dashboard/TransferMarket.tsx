import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Repeat, Send, Inbox, Loader2, Check, X, Clock,
  ArrowRight, ShieldCheck, AlertTriangle, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import GoldConfetti from '@/components/GoldConfetti';

// ─── Types ─────────────────────────────────────────────

interface TeamInfo {
  id: string;
  name: string;
  logo_url: string | null;
}

interface PlayerInfo {
  id: string;
  ea_persona_name: string | null;
  preferred_position: string | null;
}

interface TransferOffer {
  id: string;
  player_id: string;
  from_team_id: string;
  to_team_id: string;
  amount: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  created_at: string;
  responded_at: string | null;
  player: PlayerInfo;
  fromTeam: TeamInfo;
  toTeam: TeamInfo;
}

interface MyTeamData {
  id: string;
  name: string;
  budget: number;
}

type OffersTab = 'sent' | 'received';

// ─── Helpers ────────────────────────────────────────────

function formatMoney(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M €`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K €`;
  return `${v.toLocaleString('fr-FR')} €`;
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
    label: 'Acceptée',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: Check,
  },
  REJECTED: {
    label: 'Refusée',
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
    icon: X,
  },
  CANCELLED: {
    label: 'Annulée',
    className: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    icon: X,
  },
} as const;

// ─── Page ───────────────────────────────────────────────

export default function TransferMarket() {
  const [myTeam, setMyTeam] = useState<MyTeamData | null>(null);
  const [offers, setOffers] = useState<TransferOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OffersTab>('received');
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const teamRes = await api.get<MyTeamData>('/teams/my-team');
      setMyTeam(teamRes.data);
      const offersRes = await api.get<TransferOffer[]>('/transfers/offers', {
        params: { team_id: teamRes.data.id },
      });
      setOffers(offersRes.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sentOffers = offers.filter((o) => myTeam && o.from_team_id === myTeam.id);
  const receivedOffers = offers.filter((o) => myTeam && o.to_team_id === myTeam.id);
  const currentList = activeTab === 'sent' ? sentOffers : receivedOffers;

  const pendingSentCount = sentOffers.filter((o) => o.status === 'PENDING').length;
  const pendingReceivedCount = receivedOffers.filter((o) => o.status === 'PENDING').length;

  const handleRespond = async (offerId: string, status: 'ACCEPTED' | 'REJECTED') => {
    setRespondingId(offerId);
    try {
      await api.patch(`/transfers/offer/${offerId}/respond`, { status });
      if (status === 'ACCEPTED') {
        const offer = offers.find((o) => o.id === offerId);
        toast.success(
          `Félicitations ! ${offer?.player.ea_persona_name ?? 'Le joueur'} a rejoint ${offer?.fromTeam.name ?? 'son nouveau club'}.`,
          { duration: 5000 },
        );
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      } else {
        toast('Offre refusée.');
      }
      await fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Erreur lors de la réponse.';
      toast.error(msg);
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <GoldConfetti active={showConfetti} />

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/10 border border-[#FFD700]/20 flex items-center justify-center">
            <Repeat className="w-4 h-4 text-[#FFD700]" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest text-[#FFD700]/70">
            Mercato Live
          </span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Mes Offres</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gérez les offres de transfert envoyées et reçues
        </p>
      </div>

      {/* Budget card */}
      {myTeam && (
        <div className="flex items-center gap-4 px-5 py-4 rounded-xl bg-gradient-to-r from-[#FFD700]/5 to-transparent border border-[#FFD700]/15">
          <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-[#FFD700]" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Budget disponible — {myTeam.name}</p>
            <p className="text-lg font-black text-emerald-400 tabular-nums">{formatMoney(myTeam.budget)}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5 w-fit">
        {([
          { key: 'received' as const, label: 'Offres Reçues', icon: Inbox, count: pendingReceivedCount },
          { key: 'sent' as const, label: 'Offres Envoyées', icon: Send, count: pendingSentCount },
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
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === key
                  ? 'bg-[#FFD700]/20 text-[#FFD700]'
                  : 'bg-orange-500/15 text-orange-400'
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
        </div>
      )}

      {/* Offers list */}
      {!loading && (
        <div className="space-y-3">
          {currentList.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-[#0D1221] p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                {activeTab === 'sent' ? (
                  <Send className="w-6 h-6 text-slate-600" />
                ) : (
                  <Inbox className="w-6 h-6 text-slate-600" />
                )}
              </div>
              <p className="text-sm text-slate-500">
                {activeTab === 'sent'
                  ? "Vous n'avez envoyé aucune offre de transfert."
                  : "Aucune offre de transfert reçue."}
              </p>
              {activeTab === 'sent' && (
                <Link
                  to="/dashboard/store"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg text-xs font-semibold text-[#FFD700] bg-[#FFD700]/10 border border-[#FFD700]/20 hover:bg-[#FFD700]/15 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Explorer le Mercato
                </Link>
              )}
            </div>
          ) : (
            currentList.map((offer) => {
              const cfg = statusConfig[offer.status];
              const StatusIcon = cfg.icon;
              const isResponding = respondingId === offer.id;
              const isPending = offer.status === 'PENDING';
              const canRespond = activeTab === 'received' && isPending;

              const otherTeam = activeTab === 'sent' ? offer.toTeam : offer.fromTeam;

              return (
                <div
                  key={offer.id}
                  className={`rounded-xl border bg-[#0D1221] p-5 transition-all duration-200 hover:bg-white/[0.02] ${
                    offer.status === 'ACCEPTED'
                      ? 'border-emerald-500/20'
                      : offer.status === 'REJECTED'
                        ? 'border-red-500/10'
                        : isPending
                          ? 'border-[#FFD700]/15'
                          : 'border-white/5'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Team avatar */}
                    <div className="shrink-0">
                      {otherTeam.logo_url ? (
                        <img
                          src={otherTeam.logo_url}
                          alt={otherTeam.name}
                          className="w-12 h-12 rounded-xl object-cover border border-white/10"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/10 border border-[#FFD700]/15 flex items-center justify-center text-lg font-bold text-[#FFD700]">
                          {otherTeam.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${cfg.className}`}>
                          <StatusIcon className="w-2.5 h-2.5" />
                          {cfg.label}
                        </span>
                        <span className="text-[10px] text-slate-600">{timeAgo(offer.created_at)}</span>
                      </div>

                      <div className="mt-2">
                        <p className="text-sm text-white">
                          {activeTab === 'sent' ? (
                            <>
                              Offre envoyée à <span className="font-semibold text-[#FFD700]">{offer.toTeam.name}</span> pour{' '}
                            </>
                          ) : (
                            <>
                              <span className="font-semibold text-[#FFD700]">{offer.fromTeam.name}</span> souhaite recruter{' '}
                            </>
                          )}
                          <Link
                            to={`/dashboard/profile/${offer.player_id}`}
                            className="font-semibold text-white hover:text-[#FFD700] transition-colors"
                          >
                            {offer.player.ea_persona_name ?? 'Joueur inconnu'}
                          </Link>
                          {offer.player.preferred_position && (
                            <span className="text-xs text-slate-500 ml-1">({offer.player.preferred_position})</span>
                          )}
                        </p>
                      </div>

                      {/* Amount + direction */}
                      <div className="mt-3 flex items-center gap-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FFD700]/10 border border-[#FFD700]/15">
                          <span className="text-sm font-black text-[#FFD700] tabular-nums">
                            {formatMoney(offer.amount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{offer.fromTeam.name}</span>
                          <ArrowRight className="w-3 h-3 text-[#FFD700]/40" />
                          <span>{offer.toTeam.name}</span>
                        </div>
                      </div>

                      {/* Response buttons */}
                      {canRespond && (
                        <div className="mt-4 flex items-center gap-2">
                          <button
                            onClick={() => handleRespond(offer.id, 'ACCEPTED')}
                            disabled={isResponding}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 active:scale-95 transition-all disabled:opacity-50"
                          >
                            {isResponding ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            Accepter
                          </button>
                          <button
                            onClick={() => handleRespond(offer.id, 'REJECTED')}
                            disabled={isResponding}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-white/5 text-slate-400 border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 active:scale-95 transition-all disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            Refuser
                          </button>
                        </div>
                      )}

                      {/* Accepted confirmation */}
                      {offer.status === 'ACCEPTED' && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Transfert finalisé le {new Date(offer.responded_at!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
