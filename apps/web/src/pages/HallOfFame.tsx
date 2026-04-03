import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Loader2, Medal, Sparkles, Trophy } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

type HallOfFameEntry = {
  competition: {
    id: string;
    name: string;
    type: string;
    start_date: string;
    end_date: string;
  };
  seasonLabel: string;
  champion: { id: string; name: string; logo_url: string | null } | null;
  goldenBoot: {
    ea_persona_name: string;
    team_name: string;
    goals: number;
  } | null;
  topAssister: {
    ea_persona_name: string;
    team_name: string;
    assists: number;
  } | null;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || '?';
}

export default function HallOfFame() {
  const { isAuthenticated } = useAuthStore();
  const [entries, setEntries] = useState<HallOfFameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/competitions/hall-of-fame')
      .then((res) => {
        const data = res.data as HallOfFameEntry[] | { data?: HallOfFameEntry[] } | undefined;
        const winners = Array.isArray(data)
          ? data
          : data && typeof data === 'object' && Array.isArray(data.data)
            ? data.data
            : [];
        if (!cancelled) setEntries(winners);
      })
      .catch(() => {
        if (!cancelled) setError('Impossible de charger le palmarès.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-[420px] h-[420px] rounded-full bg-amber-500/10 blur-[100px]" />
        <div className="absolute bottom-20 right-1/4 w-[360px] h-[360px] rounded-full bg-amber-600/5 blur-[90px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-400/25 bg-gradient-to-r from-amber-500/15 to-transparent text-amber-400/90 text-sm font-medium mb-6">
            <Medal className="w-4 h-4" />
            Archives officielles
          </div>
          <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-6xl text-white mb-4">
            Palmarès
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Champions, Soulier d&apos;Or et meilleurs passeurs des compétitions terminées.
          </p>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-500">
            <Loader2 className="w-10 h-10 animate-spin text-amber-400/80" />
            <span className="text-sm">Chargement du palmarès…</span>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-6 py-8 text-center text-red-300/90">
            {error}
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-8 py-16 text-center">
            <Trophy className="w-12 h-12 mx-auto text-amber-400/40 mb-4" />
            <p className="text-slate-400">Aucune compétition terminée pour le moment.</p>
            <Link
              to="/"
              className="inline-block mt-6 text-amber-400 hover:text-amber-300 text-sm font-medium"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <ul className="grid gap-6 sm:gap-8">
            {entries.map((row) => (
              <li key={row.competition.id}>
                <article
                  className="relative overflow-hidden rounded-2xl border border-amber-400/15 bg-gradient-to-br from-amber-500/20 to-transparent shadow-lg shadow-black/20"
                >
                  <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                  <div className="relative p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
                      <div>
                        <p className="text-amber-400/90 font-semibold tracking-wide text-sm uppercase mb-1">
                          {row.seasonLabel}
                        </p>
                        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 flex-wrap">
                          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                          {row.competition.name}
                        </h2>
                        <p className="text-slate-500 text-xs mt-1 capitalize">
                          {row.competition.type.toLowerCase().replace('_', ' ')}
                        </p>
                      </div>
                      {isAuthenticated() && (
                        <Link
                          to={`/dashboard/competitions/${row.competition.id}`}
                          className="text-sm text-amber-400/80 hover:text-amber-300 transition-colors shrink-0"
                        >
                          Voir le classement →
                        </Link>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Champion */}
                      <div className="rounded-xl border border-white/10 bg-[#0A0E1A]/60 p-5">
                        <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-4">
                          <Crown className="w-4 h-4" />
                          Champion
                        </div>
                        {row.champion ? (
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl bg-white/5 border border-amber-400/20 flex items-center justify-center overflow-hidden shrink-0">
                              {row.champion.logo_url ? (
                                <img
                                  src={row.champion.logo_url}
                                  alt=""
                                  className="w-full h-full object-contain p-1"
                                />
                              ) : (
                                <Trophy className="w-8 h-8 text-amber-400/60" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-white truncate">{row.champion.name}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-500 text-sm">—</p>
                        )}
                      </div>

                      {/* Soulier d'Or */}
                      <div className="rounded-xl border border-white/10 bg-[#0A0E1A]/60 p-5">
                        <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-4">
                          <Trophy className="w-4 h-4" />
                          Soulier d&apos;Or
                        </div>
                        {row.goldenBoot ? (
                          <div className="flex items-center gap-4">
                            <div
                              className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400/30 to-amber-700/20 border border-amber-400/30 flex items-center justify-center text-amber-200 font-bold text-sm shrink-0"
                              aria-hidden
                            >
                              {initials(row.goldenBoot.ea_persona_name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-white truncate">
                                {row.goldenBoot.ea_persona_name}
                              </p>
                              <p className="text-slate-500 text-sm truncate">
                                {row.goldenBoot.team_name}
                              </p>
                              <p className="text-amber-400/90 text-sm mt-1 tabular-nums">
                                {row.goldenBoot.goals} buts
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-500 text-sm">—</p>
                        )}
                      </div>

                      {/* Meilleur passeur */}
                      <div className="rounded-xl border border-white/10 bg-[#0A0E1A]/60 p-5">
                        <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-4">
                          <Medal className="w-4 h-4" />
                          Meilleur passeur
                        </div>
                        {row.topAssister ? (
                          <div className="flex items-center gap-4">
                            <div
                              className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-500/40 to-slate-700/30 border border-white/10 flex items-center justify-center text-slate-200 font-bold text-sm shrink-0"
                              aria-hidden
                            >
                              {initials(row.topAssister.ea_persona_name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-white truncate">
                                {row.topAssister.ea_persona_name}
                              </p>
                              <p className="text-slate-500 text-sm truncate">
                                {row.topAssister.team_name}
                              </p>
                              <p className="text-amber-400/80 text-sm mt-1 tabular-nums">
                                {row.topAssister.assists} passes
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-500 text-sm">—</p>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
