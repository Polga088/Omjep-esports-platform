import { useEffect, useMemo, useState } from 'react';
import { Swords, Calendar, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import MaintenancePrestige, { PRESTIGE_MSG } from '@/components/MaintenancePrestige';
import MatchReportModal from '@/components/MatchReportModal';
import DashboardPageHeading from '@/components/dashboard/DashboardPageHeading'

interface Team {
  id: string;
  name: string;
  logoUrl: string | null;
  manager?: { level: number } | null;
}

interface Match {
  id: string;
  status: 'SCHEDULED' | 'PENDING' | 'VALIDATED' | 'DISPUTE' | 'PLAYED';
  scheduledAt: string;
  homeScore: number | null;
  awayScore: number | null;
  proofUrl?: string | null;
  homeTeam: Team;
  awayTeam: Team;
  competition: {
    id: string;
    name: string;
    type: string;
  } | null;
  myTeamId: string;
}

type Tab = 'upcoming' | 'results'

function SkeletonDuelCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-none border border-black/10 bg-black/[0.02] p-10 backdrop-blur-xl dark:border-white/20 dark:bg-black/40">
      <div className="mb-6 h-6 w-40 rounded-full bg-white/[0.06]" />
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
        <div className="flex flex-col items-center gap-3">
          <div className="h-28 w-28 rounded-2xl bg-white/[0.06] sm:h-32 sm:w-32" />
          <div className="h-4 w-28 rounded bg-white/[0.06]" />
          <div className="h-8 w-24 rounded-lg bg-white/[0.06]" />
        </div>
        <div className="h-12 w-12 rounded-full bg-white/[0.06]" />
        <div className="flex flex-col items-center gap-3">
          <div className="h-28 w-28 rounded-2xl bg-white/[0.06] sm:h-32 sm:w-32" />
          <div className="h-4 w-28 rounded bg-white/[0.06]" />
          <div className="h-8 w-24 rounded-lg bg-white/[0.06]" />
        </div>
      </div>
      <div className="mt-8 flex justify-center">
        <div className="h-12 w-48 rounded-xl bg-white/[0.06]" />
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <p className="rounded-xl border border-omjep-border bg-omjep-bg-panel/55 py-12 text-center text-sm font-medium text-omjep-text-secondary">
      {tab === 'upcoming' ? 'Pas de match prévu pour le moment.' : 'Pas encore de résultat enregistré.'}
    </p>
  );
}

export default function Matches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const [reportingMatch, setReportingMatch] = useState<Match | null>(null);
  const [isLongLoading, setIsLongLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<Match[]>('/matches/my-team');
        if (!cancelled) setMatches(res.data);
      } catch (err: unknown) {
        if (!cancelled) {
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 404) {
            setError('no-team');
          } else {
            setError('generic');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      setIsLongLoading(false);
      return;
    }
    const timer = window.setTimeout(() => setIsLongLoading(true), 4000);
    return () => window.clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    const onRefresh = () => {
      void api
        .get<Match[]>('/matches/my-team')
        .then((res) => setMatches(res.data))
        .catch(() => {});
    };
    window.addEventListener('omjep:matches-refresh', onRefresh);
    return () => window.removeEventListener('omjep:matches-refresh', onRefresh);
  }, []);

  const upcoming = useMemo(
    () =>
      matches
        .filter((m) => ['SCHEDULED', 'PENDING', 'DISPUTE'].includes(m.status))
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [matches],
  );

  const results = useMemo(
    () =>
      matches
        .filter((m) => m.status === 'PLAYED' || m.status === 'VALIDATED')
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()),
    [matches],
  );

  const currentList = activeTab === 'upcoming' ? upcoming : results;

  const tabs: { key: Tab; label: string; icon: typeof Calendar; count: number }[] = [
    { key: 'upcoming', label: 'Calendrier', icon: Calendar, count: upcoming.length },
    { key: 'results', label: 'Résultats', icon: Swords, count: results.length },
  ];

  return (
    <div className="cockpit-page dashboard-phase3-matches space-y-6">
      <DashboardPageHeading
        eyebrow="Match Center"
        title="Matchs"
        subtitle="Calendrier, résultats et actions de reporting"
      />

      {error === 'no-team' && (
        <p className="rounded-xl border border-omjep-border bg-omjep-bg-panel/55 py-12 text-center text-sm font-medium text-omjep-text-secondary">
          Aucun club trouvé. Rejoignez un club pour voir vos matchs.
        </p>
      )}

      {error === 'generic' && (
        <MaintenancePrestige overlay title="Matchs" message={PRESTIGE_MSG} className="border-white/10" />
      )}

      {!error && (
        <>
          <div className="flex w-fit gap-2 rounded-xl border border-omjep-border bg-omjep-bg-panel/55 p-1">
            {tabs.map(({ key, label, icon: Icon, count }) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-2 rounded-lg border border-omjep-border px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-omjep-bg-elevated/80 text-omjep-text-primary'
                      : 'text-omjep-text-secondary hover:text-omjep-text-primary'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {!loading && (
                    <span className="ml-1 px-1.5 py-0.5 font-mono text-[10px] font-bold text-black/70 dark:text-white/70">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-omjep-border bg-omjep-bg-panel/55 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-omjep-text-secondary">
                  <Loader2 className="h-4 w-4 animate-spin text-omjep-mauve" />
                  Chargement du calendrier des matchs…
                </div>
                {isLongLoading ? (
                  <p className="mt-2 text-xs text-omjep-text-muted">
                    Le chargement prend plus de temps que prévu. Le module reste actif.
                  </p>
                ) : null}
              </div>
              <SkeletonDuelCard />
              <SkeletonDuelCard />
            </div>
          ) : currentList.length === 0 ? (
            <EmptyState tab={activeTab} />
          ) : (
            <div className="space-y-0">
              {currentList.map((match) => {
                const isPlayed = match.status === 'PLAYED' || match.status === 'VALIDATED'
                const statusLabel = isPlayed ? 'TERMINÉ' : 'À VENIR'
                const scheduledDate = new Date(match.scheduledAt)
                return (
                <div key={match.id} className="rounded-xl border border-omjep-border bg-omjep-bg-panel/55 px-6 py-7 shadow-[0_10px_28px_rgba(0,0,0,0.25)] sm:px-8 sm:py-8">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                      <div>
                        <p className="text-[12px] uppercase tracking-widest opacity-50">{statusLabel}</p>
                        <p className="font-mono text-2xl font-bold text-black dark:text-white">
                          {match.homeTeam.name} — {match.awayTeam.name}
                        </p>
                        <p className="font-mono text-sm text-black/60 dark:text-white/60">
                          {scheduledDate.toLocaleDateString('fr-FR')} {scheduledDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <p className="font-mono text-6xl font-bold text-black dark:text-white">
                        {isPlayed ? `${match.homeScore ?? 0}:${match.awayScore ?? 0}` : '—'}
                      </p>
                      <div className="flex flex-wrap gap-3 md:justify-end">
                        <button
                          type="button"
                          onClick={() => setReportingMatch(match)}
                          className="rounded-none border border-black/10 bg-transparent px-3 py-2 text-xs uppercase tracking-[0.2em] dark:border-white/20"
                        >
                          [ ACTION ]
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
      <MatchReportModal
        open={reportingMatch !== null}
        match={reportingMatch}
        onClose={() => setReportingMatch(null)}
        onUpdated={() => {
          window.dispatchEvent(new CustomEvent('omjep:matches-refresh'))
        }}
      />
    </div>
  );
}
