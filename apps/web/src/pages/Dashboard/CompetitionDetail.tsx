import { useState, useEffect, type ReactNode } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Trophy, ArrowLeft, BarChart3, Loader2, AlertCircle } from 'lucide-react';
import { getCompTypeConfig } from '@/lib/competition-icons';
import api from '@/lib/api';
import LeagueView from './LeagueView';
import CupView from './CupView';
import ChampionsView from './ChampionsView';
import type { StandingRow } from './LeagueTable';
import type { MatchBrief } from './TournamentBrackets';

interface CompetitionMeta {
  id: string;
  name: string;
  type: 'LEAGUE' | 'CUP' | 'CHAMPIONS';
  status: string;
}

interface LeagueResponse {
  type: 'LEAGUE';
  competition: CompetitionMeta;
  standings: StandingRow[];
  recentMatches: MatchBrief[];
}

interface CupResponse {
  type: 'CUP';
  competition: CompetitionMeta;
  rounds: { name: string; matches: MatchBrief[] }[];
}

interface ChampionsResponse {
  type: 'CHAMPIONS';
  competition: CompetitionMeta;
  groups: { name: string; standings: StandingRow[]; matches: MatchBrief[] }[];
  knockoutRounds: { name: string; matches: MatchBrief[] }[];
}

type StandingsResponse = LeagueResponse | CupResponse | ChampionsResponse;

function CompetitionShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative rounded-3xl border border-amber-500/12 overflow-hidden">
      <div
        className="absolute inset-0 bg-[#050810]"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 120% 80% at 50% -20%, rgba(245, 158, 11, 0.14), transparent 50%),
            radial-gradient(ellipse 80% 50% at 100% 50%, rgba(180, 130, 40, 0.06), transparent 45%),
            radial-gradient(ellipse 60% 40% at 0% 80%, rgba(245, 200, 100, 0.05), transparent 40%)
          `,
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.35] pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(1px 1px at 10% 20%, rgba(255, 220, 150, 0.5), transparent),
            radial-gradient(1px 1px at 30% 65%, rgba(255, 210, 120, 0.35), transparent),
            radial-gradient(1px 1px at 72% 40%, rgba(255, 230, 170, 0.45), transparent),
            radial-gradient(1px 1px at 88% 10%, rgba(255, 200, 100, 0.3), transparent),
            radial-gradient(1px 1px at 45% 88%, rgba(255, 215, 140, 0.4), transparent),
            radial-gradient(1px 1px at 15% 92%, rgba(255, 190, 90, 0.25), transparent)
          `,
          backgroundSize: '100% 100%',
        }}
      />
      <div className="relative z-10 p-4 md:p-6 lg:p-8">{children}</div>
    </div>
  );
}

export default function CompetitionDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<StandingsResponse | null>(null);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function fetchData() {
      try {
        const [standingsRes, teamRes] = await Promise.allSettled([
          api.get<StandingsResponse>(`/competitions/${id}/standings`),
          api.get<{ id: string }>('/teams/my-team'),
        ]);

        if (cancelled) return;

        if (standingsRes.status === 'fulfilled') {
          setData(standingsRes.value.data);
        } else {
          setError('Impossible de charger le classement de cette compétition.');
        }

        if (teamRes.status === 'fulfilled') {
          setMyTeamId(teamRes.value.data.id);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const competition = data?.competition ?? null;
  const typeCfg = competition ? getCompTypeConfig(competition.type) : null;
  const TypeIcon = typeCfg?.Icon ?? Trophy;

  const body = (() => {
    if (loading || error || !data) return null;
    switch (data.type) {
      case 'LEAGUE':
        return (
          <LeagueView
            standings={data.standings}
            recentMatches={data.recentMatches ?? []}
            myTeamId={myTeamId}
          />
        );
      case 'CUP':
        return <CupView rounds={data.rounds} myTeamId={myTeamId} />;
      case 'CHAMPIONS':
        return (
          <ChampionsView
            groups={data.groups}
            knockoutRounds={data.knockoutRounds}
            myTeamId={myTeamId}
          />
        );
      default:
        return null;
    }
  })();

  return (
    <div className="space-y-8">
      <CompetitionShell>
        <div className="space-y-8">
          <div>
            <Link
              to="/dashboard/matches"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-amber-400 transition-colors mb-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour aux matchs
            </Link>

            <div className="flex items-center gap-3 mb-1">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center border ${typeCfg?.bg ?? 'bg-amber-500/10'} ${typeCfg?.border ?? 'border-amber-500/20'}`}
              >
                <TypeIcon className={`w-4 h-4 ${typeCfg?.color ?? 'text-amber-400'}`} />
              </div>
              <span
                className={`text-xs font-semibold uppercase tracking-widest ${typeCfg?.color ?? 'text-amber-400/70'}`}
              >
                {typeCfg?.label ?? 'Compétition'}
              </span>
            </div>

            <h1 className="text-3xl font-black text-white tracking-tight">
              {loading ? (
                <span className="inline-block w-56 h-8 rounded-lg bg-white/5 animate-pulse" />
              ) : (
                competition?.name ?? 'Compétition'
              )}
            </h1>

            {id && !loading && (
              <Link
                to={`/dashboard/stats/${id}`}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm font-semibold hover:bg-amber-500/20 transition-all"
              >
                <BarChart3 className="w-4 h-4" />
                Buteurs & Passeurs
              </Link>
            )}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4 flex items-center gap-3 text-sm text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          {!loading && !error && body}
        </div>
      </CompetitionShell>
    </div>
  );
}
