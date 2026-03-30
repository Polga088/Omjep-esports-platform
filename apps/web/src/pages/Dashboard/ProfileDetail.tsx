import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Link2, Check, Calendar, Send } from 'lucide-react';
import PlayerCard from '@/components/PlayerCard';
import TransferOfferModal from '@/components/TransferOfferModal';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

interface ProfileCardResponse {
  user: {
    id: string;
    ea_persona_name: string | null;
    preferred_position: string | null;
    nationality: string | null;
    created_at: string;
  };
  team: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
  stats: {
    goals: number;
    assists: number;
    matches: number;
  } | null;
  contract: {
    salary: number;
    release_clause: number;
    expires_at: string;
  } | null;
}

interface ProfileData {
  id: string;
  ea_persona_name: string | null;
  preferred_position: string | null;
  nationality: string | null;
  created_at: string;
  team: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
  stats: {
    matches_played: number;
    goals: number;
    assists: number;
    average_rating: number;
  } | null;
  marketValue: number | null;
}

interface MyTeamData {
  id: string;
  name: string;
  budget: number;
}

function computeOverall(stats: ProfileData['stats']): number {
  if (!stats || stats.matches_played === 0) return 50;
  const amr = stats.average_rating;
  const goalsPerGame = stats.goals / Math.max(stats.matches_played, 1);
  const assistsPerGame = stats.assists / Math.max(stats.matches_played, 1);
  const base = amr * 8;
  const bonus = Math.min((goalsPerGame + assistsPerGame * 0.6) * 3, 20);
  return Math.min(99, Math.max(40, Math.round(base + bonus)));
}

export default function ProfileDetail() {
  const { id } = useParams<{ id: string }>();
  const { user: authUser } = useAuthStore();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [myTeam, setMyTeam] = useState<MyTeamData | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get<ProfileCardResponse>(`/users/${id}/profile-card`);
        if (!cancelled) {
          const r = res.data;
          setData({
            id: r.user.id,
            ea_persona_name: r.user.ea_persona_name,
            preferred_position: r.user.preferred_position,
            nationality: r.user.nationality,
            created_at: r.user.created_at,
            team: r.team,
            stats: r.stats
              ? { matches_played: r.stats.matches, goals: r.stats.goals, assists: r.stats.assists, average_rating: 0 }
              : null,
            marketValue: r.contract?.release_clause ?? null,
          });
        }
      } catch {
        if (!cancelled) setError('Impossible de charger ce profil.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<MyTeamData>('/teams/my-team')
      .then(({ data }) => {
        if (!cancelled) setMyTeam(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/dashboard/profile/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard not available */
    }
  };

  const memberSince = data?.created_at
    ? new Date(data.created_at).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const isOwnProfile = authUser?.id === id;
  const isInMyTeam = myTeam && data?.team && data.team.id === myTeam.id;
  const canOffer =
    !isOwnProfile &&
    !isInMyTeam &&
    myTeam &&
    data?.team &&
    (authUser?.role === 'manager' || authUser?.role === 'admin');

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-amber-400 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Retour au dashboard
      </Link>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-[480px]">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Profile content */}
      {!loading && !error && data && (
        <div className="flex flex-col items-center gap-8">
          {/* Card with 3D hover */}
          <div
            className="transition-transform duration-300 ease-out hover:rotate-3 hover:scale-105"
            style={{ perspective: '800px' }}
          >
            <PlayerCard
              rating={computeOverall(data.stats)}
              position={data.preferred_position ?? '??'}
              name={data.ea_persona_name ?? 'Anonyme'}
              goals={data.stats?.goals ?? 0}
              assists={data.stats?.assists ?? 0}
              appearances={data.stats?.matches_played ?? 0}
              nationality={data.nationality ?? undefined}
              clubName={data.team?.name}
              clubLogoUrl={data.team?.logo_url}
              marketValue={data.marketValue}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 flex-wrap justify-center">
            {/* Copy link */}
            <button
              onClick={handleCopyLink}
              className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                copied
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-white/[0.03] border-white/10 text-slate-300 hover:border-amber-500/30 hover:text-amber-300 hover:bg-amber-500/5'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Lien copié !
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  Copier le lien de ma carte
                </>
              )}
            </button>

            {/* Transfer offer button */}
            {canOffer && (
              <button
                onClick={() => setTransferModalOpen(true)}
                className="group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold border border-[#FFD700]/30 bg-gradient-to-r from-[#FFD700]/10 to-[#FFA500]/5 text-[#FFD700] hover:border-[#FFD700]/50 hover:bg-[#FFD700]/15 hover:shadow-lg hover:shadow-[#FFD700]/10 active:scale-[0.97] transition-all duration-200"
              >
                <Send className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                Proposer un transfert
              </button>
            )}
          </div>

          {/* Member since */}
          {memberSince && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="w-4 h-4 text-slate-600" />
              <span>
                Membre depuis le <span className="text-slate-300 font-medium">{memberSince}</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Transfer offer modal */}
      {data && data.team && myTeam && (
        <TransferOfferModal
          open={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          player={{
            id: data.id,
            name: data.ea_persona_name ?? 'Anonyme',
            position: data.preferred_position,
            teamId: data.team.id,
            teamName: data.team.name,
            marketValue: data.marketValue,
          }}
          myTeam={myTeam}
        />
      )}
    </div>
  );
}
