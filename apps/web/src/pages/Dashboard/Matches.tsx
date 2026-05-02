import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Swords, Calendar, Loader2, Sparkles, Repeat, Trophy, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
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
type MatchCompetitionType = 'LEAGUE' | 'COUPE' | 'UCL'

const matchStatusTheme: Record<Match['status'], { label: string; className: string }> = {
  SCHEDULED: {
    label: 'PROGRAMMÉ',
    className: 'border-omjep-cobalt/35 bg-omjep-cobalt/10 text-omjep-text-primary',
  },
  PENDING: {
    label: 'EN ATTENTE',
    className: 'border-omjep-mauve/35 bg-omjep-mauve/10 text-omjep-text-primary',
  },
  DISPUTE: {
    label: 'LITIGE',
    className: 'border-omjep-warning/35 bg-omjep-warning/10 text-omjep-warning',
  },
  PLAYED: {
    label: 'JOUÉ',
    className: 'border-omjep-success/35 bg-omjep-success/10 text-omjep-success',
  },
  VALIDATED: {
    label: 'VALIDÉ',
    className: 'border-omjep-success/35 bg-omjep-success/10 text-omjep-success',
  },
}

const competitionTheme: Record<MatchCompetitionType, { label: string; className: string; dot: string }> = {
  LEAGUE: {
    label: 'League',
    className: 'border-omjep-cobalt/35 bg-omjep-cobalt/12 text-omjep-text-primary',
    dot: 'bg-omjep-cobalt',
  },
  COUPE: {
    label: 'Coupe',
    className: 'border-omjep-mauve/40 bg-omjep-mauve/12 text-omjep-mauve',
    dot: 'bg-omjep-mauve',
  },
  UCL: {
    label: 'UCL',
    className: 'border-omjep-border-gold/45 bg-omjep-gold/12 text-omjep-gold',
    dot: 'bg-omjep-gold',
  },
}

function normalizeCompetitionType(match: Match): MatchCompetitionType {
  const typeRaw = String(match.competition?.type ?? '').toUpperCase();
  const nameRaw = String(match.competition?.name ?? '').toUpperCase();
  if (
    typeRaw.includes('CHAMPIONS') ||
    typeRaw.includes('UCL') ||
    nameRaw.includes('CHAMPIONS') ||
    nameRaw.includes('UCL')
  ) {
    return 'UCL'
  }
  if (typeRaw.includes('CUP') || typeRaw.includes('COUPE') || nameRaw.includes('COUPE')) {
    return 'COUPE'
  }
  return 'LEAGUE'
}

function extractMatchdayLabel(match: Match, index: number): string {
  const fromName = String(match.competition?.name ?? '').match(/(?:J(?:OURN[ÉE]E?)\s*|ROUND\s*)(\d+)/i)?.[1]
  if (fromName) return `J${fromName}`
  return `J${index + 1}`
}

function TeamCrest({ team, isMyTeam }: { team: Team; isMyTeam: boolean }) {
  return (
    <div
      className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border ${
        isMyTeam
          ? 'border-omjep-mauve/45 bg-omjep-mauve/12 ring-1 ring-omjep-mauve/25'
          : 'border-omjep-border bg-omjep-bg-panel-soft/70'
      }`}
    >
      {team.logoUrl ? (
        <img src={team.logoUrl} alt={team.name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-black uppercase tracking-wide text-omjep-text-primary">
          {team.name.slice(0, 1)}
        </span>
      )}
      {isMyTeam ? (
        <span className="absolute -bottom-1 -right-1 rounded-full border border-omjep-mauve/55 bg-omjep-bg-panel px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-omjep-mauve">
          Moi
        </span>
      ) : null}
    </div>
  )
}

function SkeletonDuelCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-omjep-border bg-omjep-bg-panel-soft/60 p-10 backdrop-blur-xl">
      <div className="mb-6 h-6 w-40 rounded-full bg-omjep-bg-elevated" />
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
        <div className="flex flex-col items-center gap-3">
          <div className="h-28 w-28 rounded-2xl bg-omjep-bg-elevated sm:h-32 sm:w-32" />
          <div className="h-4 w-28 rounded bg-omjep-bg-elevated" />
          <div className="h-8 w-24 rounded-lg bg-omjep-bg-elevated" />
        </div>
        <div className="h-12 w-12 rounded-full bg-omjep-bg-elevated" />
        <div className="flex flex-col items-center gap-3">
          <div className="h-28 w-28 rounded-2xl bg-omjep-bg-elevated sm:h-32 sm:w-32" />
          <div className="h-4 w-28 rounded bg-omjep-bg-elevated" />
          <div className="h-8 w-24 rounded-lg bg-omjep-bg-elevated" />
        </div>
      </div>
      <div className="mt-8 flex justify-center">
        <div className="h-12 w-48 rounded-xl bg-omjep-bg-elevated" />
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const isUpcoming = tab === 'upcoming';
  return (
    <div className="rounded-2xl border border-omjep-border bg-omjep-bg-panel/70 p-8 text-center shadow-sm transition-shadow duration-300 hover:border-omjep-mauve/25 hover:shadow-md md:p-10">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-omjep-mauve/30 bg-omjep-mauve/10 text-omjep-mauve">
        <Sparkles className="h-7 w-7" aria-hidden />
      </div>
      <h3 className="text-lg font-bold text-omjep-text-primary">
        {isUpcoming ? 'Aucun match à l&apos;horizon' : 'Pas encore de résultat'}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-omjep-text-secondary">
        {isUpcoming
          ? 'Votre calendrier se remplira dès que la compétition planifiera vos prochains duels. En attendant, suivez le mercato et le planning global.'
          : 'Les scores validés apparaîtront ici après vos rencontres officielles. Vous pouvez consulter le calendrier général ou votre espace équipe.'}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/dashboard/schedule"
          className="inline-flex items-center gap-2 rounded-xl border border-omjep-mauve/45 bg-omjep-mauve/12 px-4 py-2.5 text-sm font-semibold text-omjep-text-primary transition-all hover:bg-omjep-mauve/20"
        >
          <Calendar className="h-4 w-4 text-omjep-mauve" aria-hidden />
          Calendrier global
        </Link>
        <Link
          to="/dashboard/team"
          className="inline-flex items-center gap-2 rounded-xl border border-omjep-border bg-omjep-bg-panel-soft/60 px-4 py-2.5 text-sm font-semibold text-omjep-text-primary transition-colors hover:border-omjep-mauve/35"
        >
          <Swords className="h-4 w-4 text-omjep-text-secondary" aria-hidden />
          Mon équipe
        </Link>
        <Link
          to="/dashboard/transfers"
          className="inline-flex items-center gap-2 rounded-xl border border-omjep-border-gold/40 bg-omjep-gold/8 px-4 py-2.5 text-sm font-semibold text-omjep-gold transition-colors hover:bg-omjep-gold/12"
        >
          <Repeat className="h-4 w-4" aria-hidden />
          Mercato
        </Link>
      </div>
    </div>
  );
}

export default function Matches() {
  const { user } = useAuthStore();
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
        <div className="rounded-2xl border border-omjep-border bg-omjep-bg-panel/75 p-8 shadow-sm md:p-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-omjep-mauve/35 bg-omjep-mauve/12 text-omjep-mauve">
            <Swords className="h-7 w-7" aria-hidden />
          </div>
          <h3 className="text-center text-lg font-bold text-omjep-text-primary">Rejoignez un club pour voir vos matchs</h3>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-omjep-text-secondary">
            Les confrontations de votre équipe s&apos;affichent ici une fois votre roster actif. Passez par le mercato ou créez votre structure si vous êtes manager.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/dashboard/transfers"
              className="inline-flex items-center gap-2 rounded-xl border border-omjep-mauve/50 bg-omjep-mauve/15 px-5 py-2.5 text-sm font-semibold text-omjep-text-primary transition-all hover:bg-omjep-mauve/22"
            >
              <Repeat className="h-4 w-4" aria-hidden />
              Parcourir le mercato
            </Link>
            <Link
              to="/dashboard/team"
              className="inline-flex items-center gap-2 rounded-xl border border-omjep-border bg-omjep-bg-panel-soft/70 px-5 py-2.5 text-sm font-semibold text-omjep-text-primary transition-colors hover:border-omjep-mauve/35"
            >
              Page mon équipe
            </Link>
            {user?.role === 'MANAGER' ? (
              <Link
                to="/dashboard/manager/club"
                className="inline-flex items-center gap-2 rounded-xl border border-omjep-border-gold/45 bg-omjep-gold/10 px-5 py-2.5 text-sm font-semibold text-omjep-gold transition-colors hover:bg-omjep-gold/15"
              >
                <Trophy className="h-4 w-4" aria-hidden />
                Créer mon club
              </Link>
            ) : null}
          </div>
        </div>
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
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    active
                      ? 'border-omjep-mauve/35 bg-omjep-mauve/14 text-omjep-text-primary shadow-[0_8px_20px_rgba(118,75,162,0.22)]'
                      : 'border-omjep-border text-omjep-text-secondary hover:border-omjep-mauve/30 hover:text-omjep-text-primary'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {!loading && (
                    <span className="ml-1 rounded-full border border-omjep-border bg-omjep-bg-panel-soft/70 px-1.5 py-0.5 font-mono text-[10px] font-bold text-omjep-text-secondary">
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
              {currentList.map((match, index) => {
                const isPlayed = match.status === 'PLAYED' || match.status === 'VALIDATED'
                const scheduledDate = new Date(match.scheduledAt)
                const isMyHome = match.homeTeam.id === match.myTeamId
                const isMyAway = match.awayTeam.id === match.myTeamId
                const competitionType = normalizeCompetitionType(match)
                const competitionChip = competitionTheme[competitionType]
                const statusChip = matchStatusTheme[match.status]
                const matchdayLabel = extractMatchdayLabel(match, index)
                return (
                  <div
                    key={match.id}
                    className="relative overflow-hidden rounded-2xl border border-omjep-border bg-omjep-bg-panel/92 px-5 py-6 shadow-[0_20px_45px_rgba(3,7,20,0.45)] backdrop-blur-sm transition-all hover:border-omjep-mauve/35 sm:px-6"
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/[0.03] to-transparent" />
                    <div className="relative grid gap-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${competitionChip.className}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${competitionChip.dot}`} />
                            {competitionChip.label}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-omjep-border bg-omjep-bg-elevated px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-omjep-text-secondary">
                            Journée {matchdayLabel}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-omjep-border bg-omjep-bg-elevated px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-omjep-text-muted">
                            {match.competition?.name ?? 'Compétition'}
                          </span>
                        </div>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusChip.className}`}>
                          {statusChip.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-omjep-border/80 bg-omjep-bg-elevated/75 p-3 sm:p-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <TeamCrest team={match.homeTeam} isMyTeam={isMyHome} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black uppercase tracking-wide text-omjep-text-primary sm:text-base">
                                {match.homeTeam.name}
                              </p>
                              <p className="text-[11px] text-omjep-text-muted">
                                {isMyHome ? 'Mon équipe · Domicile' : 'Domicile'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="text-center">
                          <p className="font-mono text-[26px] font-black tabular-nums leading-none text-omjep-text-primary sm:text-[30px]">
                            {isPlayed ? `${match.homeScore ?? 0} - ${match.awayScore ?? 0}` : 'VS'}
                          </p>
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-omjep-text-muted">
                            {scheduledDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })} ·{' '}
                            {scheduledDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center justify-end gap-2">
                            <div className="min-w-0 text-right">
                              <p className="truncate text-sm font-black uppercase tracking-wide text-omjep-text-primary sm:text-base">
                                {match.awayTeam.name}
                              </p>
                              <p className="text-[11px] text-omjep-text-muted">
                                {isMyAway ? 'Mon équipe · Extérieur' : 'Extérieur'}
                              </p>
                            </div>
                            <TeamCrest team={match.awayTeam} isMyTeam={isMyAway} />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-1.5 text-xs text-omjep-text-secondary">
                          <Shield className="h-3.5 w-3.5 text-omjep-mauve" />
                          Centre de rapport officiel
                        </div>
                        <button
                          type="button"
                          onClick={() => setReportingMatch(match)}
                          className="rounded-lg border border-omjep-border bg-omjep-bg-panel-soft/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-omjep-text-secondary transition-all hover:border-omjep-mauve/40 hover:bg-omjep-mauve/10 hover:text-omjep-text-primary"
                        >
                          Signaler / Rapport
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
