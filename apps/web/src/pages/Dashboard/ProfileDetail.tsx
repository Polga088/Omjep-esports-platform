import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Link2, Check, Calendar, Send, Zap, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PlayerCard from '@/components/PlayerCard';
import TransferOfferModal from '@/components/TransferOfferModal';
import LevelUpOverlay from '@/components/LevelUpOverlay';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { xpProgress } from '@/lib/leveling';

interface ProfileCardResponse {
  user: {
    id: string;
    ea_persona_name: string | null;
    preferred_position: string | null;
    nationality: string | null;
    created_at: string;
    xp: number;
    level: number;
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
  xp: number;
  level: number;
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

function CareerProgressionSection({ xp, level }: { xp: number; level: number }) {
  const progress = xpProgress(xp, level);
  const prevXpRef = useRef(xp);
  const [justGainedXp, setJustGainedXp] = useState(false);

  useEffect(() => {
    if (xp > prevXpRef.current) {
      setJustGainedXp(true);
      const t = setTimeout(() => setJustGainedXp(false), 3000);
      prevXpRef.current = xp;
      return () => clearTimeout(t);
    }
    prevXpRef.current = xp;
    return;
  }, [xp]);

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-amber-500/15 bg-gradient-to-br from-[#0D1221] to-[#111827] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-amber-500/10 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">Progression de Carrière</h3>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Level badge with pulse */}
          <div className="flex items-center gap-4">
            <motion.div
              animate={justGainedXp ? {
                scale: [1, 1.15, 1, 1.1, 1],
                boxShadow: [
                  '0 0 0px rgba(255,215,0,0)',
                  '0 0 20px rgba(255,215,0,0.6)',
                  '0 0 5px rgba(255,215,0,0.2)',
                  '0 0 15px rgba(255,215,0,0.4)',
                  '0 0 0px rgba(255,215,0,0)',
                ],
              } : {}}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
              className="relative shrink-0"
            >
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex flex-col items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-400/30">
                <span className="text-[9px] font-bold uppercase tracking-widest text-amber-900/70">Niv.</span>
                <span className="text-2xl font-black text-white leading-none tabular-nums" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
                  {level}
                </span>
              </div>
              <AnimatePresence>
                {justGainedXp && (
                  <motion.div
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: 1, y: -20 }}
                    exit={{ opacity: 0 }}
                    className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-emerald-500 text-[9px] font-bold text-white"
                  >
                    +XP
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-400">
                  {progress.current.toLocaleString('fr-FR')} / {progress.needed.toLocaleString('fr-FR')} XP
                </span>
                <span className="text-xs font-bold text-amber-400">
                  Niv. {progress.nextLevel}
                </span>
              </div>

              {/* Progress bar */}
              <div className="relative h-2.5 rounded-full bg-white/5 overflow-hidden border border-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.percentage}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #B8860B 0%, #FFD700 50%, #FFF8DC 100%)',
                    boxShadow: '0 0 12px rgba(255,215,0,0.4)',
                  }}
                />
              </div>

              <p className="text-[10px] text-slate-600 mt-1.5">
                Encore <span className="text-amber-400/80 font-semibold">{(progress.needed - progress.current).toLocaleString('fr-FR')} XP</span> pour le niveau suivant
              </p>
            </div>
          </div>

          {/* XP total */}
          <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/5">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="text-xs text-slate-500">XP Totale</span>
              <p className="text-lg font-black text-white tabular-nums leading-tight">
                {xp.toLocaleString('fr-FR')}
                <span className="text-xs font-semibold text-amber-500/60 ml-1">XP</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfileDetail() {
  const { id } = useParams<{ id: string }>();
  const { user: authUser } = useAuthStore();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);

  const [myTeam, setMyTeam] = useState<MyTeamData | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  const prevLevelRef = useRef<number | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get<ProfileCardResponse>(`/users/${id}/profile-card`);
        if (!cancelled) {
          const r = res.data;

          if (prevLevelRef.current !== null && r.user.level > prevLevelRef.current) {
            setShowLevelUp(true);
            setTimeout(() => setShowLevelUp(false), 4000);
          }
          prevLevelRef.current = r.user.level;

          setData({
            id: r.user.id,
            ea_persona_name: r.user.ea_persona_name,
            preferred_position: r.user.preferred_position,
            nationality: r.user.nationality,
            created_at: r.user.created_at,
            xp: r.user.xp,
            level: r.user.level,
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
      <LevelUpOverlay
        active={showLevelUp}
        newLevel={data?.level ?? 1}
        onDone={() => setShowLevelUp(false)}
      />

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
              level={data.level}
              xp={data.xp}
            />
          </div>

          {/* Career Progression */}
          <CareerProgressionSection xp={data.xp} level={data.level} />

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
