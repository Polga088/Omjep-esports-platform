import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Link2, Check, Calendar } from 'lucide-react';
import PlayerCard from '@/components/PlayerCard';
import api from '@/lib/api';

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
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get<ProfileData>(`/users/${id}/card`);
        if (!cancelled) setData(res.data);
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
            />
          </div>

          {/* Copy link button */}
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
    </div>
  );
}
