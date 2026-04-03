import { useCallback, useEffect, useState } from 'react';
import { Calendar, Loader2, MapPin, Swords } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';

interface TeamBrief {
  id: string;
  name: string;
  logo_url: string | null;
  manager?: { level: number } | null;
}

interface ScheduleMatch {
  id: string;
  status: string;
  round: string | null;
  startTime: string | null;
  played_at: string | null;
  home_team_id: string;
  away_team_id: string;
  homeTeam: TeamBrief;
  awayTeam: TeamBrief;
  competition: { id: string; name: string; type: string } | null;
  viewer_team_id: string | null;
}

function kickoffLabel(m: ScheduleMatch): { date: string; time: string; tbd: boolean } {
  const raw = m.startTime ?? m.played_at;
  if (!raw) {
    return { date: 'À planifier', time: '', tbd: true };
  }
  const d = new Date(raw);
  return {
    date: d.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    tbd: false,
  };
}

export default function Schedule() {
  const [matches, setMatches] = useState<ScheduleMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<ScheduleMatch[]>('/matches/my-schedule');
      setMatches(Array.isArray(data) ? data : []);
    } catch {
      setError('Impossible de charger votre calendrier.');
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent p-8">
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-cyan-500/5 blur-[80px]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-500/10">
              <Calendar className="h-6 w-6 text-cyan-300" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white">Mon calendrier</h1>
              <p className="text-sm text-slate-400">
                Prochains matchs de vos clubs, triés par date de coup d&apos;envoi.
              </p>
            </div>
          </div>
          <Link
            to="/dashboard/matches"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-cyan-500/30 hover:text-white"
          >
            <Swords className="h-4 w-4 text-cyan-400/80" />
            Vue Matchs complète
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-9 w-9 animate-spin text-cyan-500/50" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">{error}</div>
      ) : matches.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
          <Calendar className="mx-auto mb-4 h-12 w-12 text-slate-600" />
          <p className="text-slate-400">Aucun match à venir pour vos équipes.</p>
          <p className="mt-2 text-xs text-slate-600">
            Les rencontres programmées (SCHEDULED / LIVE) apparaissent ici.
          </p>
        </div>
      ) : (
        <ol className="relative space-y-0 border-l border-white/10 pl-6">
          {matches.map((m) => {
            const k = kickoffLabel(m);
            const isHome = m.viewer_team_id === m.home_team_id;
            const opponent = isHome ? m.awayTeam : m.homeTeam;
            const sideLabel = isHome ? 'Domicile' : 'Extérieur';
            return (
              <li key={m.id} className="relative pb-10 last:pb-0">
                <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border border-cyan-500/40 bg-[#0a0d14]" />
                <div className="rounded-xl border border-white/[0.06] bg-[#080a0c] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-500/70">
                        {m.competition?.name ?? 'Compétition'}
                        {m.round ? ` · ${m.round}` : ''}
                      </p>
                      <p className="mt-1 font-mono text-sm text-white">
                        {k.tbd ? (
                          <span className="text-amber-400/90">{k.date}</span>
                        ) : (
                          <>
                            <span className="text-slate-200">{k.date}</span>
                            {k.time ? (
                              <span className="ml-2 text-cyan-300/90 tabular-nums">{k.time}</span>
                            ) : null}
                          </>
                        )}
                      </p>
                    </div>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        m.status === 'LIVE'
                          ? 'border-emerald-500/40 text-emerald-300'
                          : 'border-white/15 text-slate-500'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-semibold text-white">vs {opponent.name}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5" />
                      {sideLabel}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
