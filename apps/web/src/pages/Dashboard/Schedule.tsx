import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CalendarDays,
  Grid3X3,
  List,
  Loader2,
  MapPin,
  Swords,
  Trophy,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import DashboardPageHeading from '@/components/dashboard/DashboardPageHeading'

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
  home_score?: number | null;
  away_score?: number | null;
  homeScore?: number | null;
  awayScore?: number | null;
  home_team_id: string;
  away_team_id: string;
  homeTeam: TeamBrief;
  awayTeam: TeamBrief;
  competition: { id: string; name: string; type: string } | null;
  viewer_team_id: string | null;
}

type AgendaCompetitionType = 'LEAGUE' | 'COUPE' | 'UCL';
type AgendaViewMode = 'LIST' | 'CARDS';

const competitionTheme: Record<AgendaCompetitionType, { label: string; className: string; dot: string }> = {
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
};

const statusTheme: Record<string, { label: string; className: string }> = {
  LIVE: {
    label: 'Live',
    className: 'border-omjep-danger/35 bg-omjep-danger/10 text-omjep-danger',
  },
  PLAYED: {
    label: 'Joué',
    className: 'border-omjep-success/35 bg-omjep-success/10 text-omjep-success',
  },
  FINISHED: {
    label: 'Terminé',
    className: 'border-omjep-success/35 bg-omjep-success/10 text-omjep-success',
  },
  SCHEDULED: {
    label: 'Programmé',
    className: 'border-omjep-cobalt/35 bg-omjep-cobalt/10 text-omjep-text-primary',
  },
  PENDING: {
    label: 'En attente',
    className: 'border-omjep-mauve/35 bg-omjep-mauve/10 text-omjep-text-primary',
  },
}

function normalizeCompetitionType(m: ScheduleMatch): AgendaCompetitionType {
  const typeRaw = String(m.competition?.type ?? '').toUpperCase();
  const nameRaw = String(m.competition?.name ?? '').toUpperCase();
  const roundRaw = String(m.round ?? '').toUpperCase();
  if (
    typeRaw.includes('CHAMPIONS') ||
    typeRaw.includes('UCL') ||
    nameRaw.includes('CHAMPIONS') ||
    nameRaw.includes('UCL') ||
    roundRaw.includes('UCL')
  ) {
    return 'UCL';
  }
  if (typeRaw.includes('CUP') || typeRaw.includes('COUPE') || nameRaw.includes('COUPE')) {
    return 'COUPE';
  }
  return 'LEAGUE';
}

function kickoffLabel(m: ScheduleMatch): { date: string; time: string; tbd: boolean; dateKey: string } {
  const raw = m.startTime ?? m.played_at;
  if (!raw) {
    return { date: 'À planifier', time: '', tbd: true, dateKey: 'TBD' };
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    return { date: 'À planifier', time: '', tbd: true, dateKey: 'TBD' };
  }
  return {
    date: d.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    tbd: false,
    dateKey: d.toISOString().slice(0, 10),
  };
}

export default function Schedule() {
  const [matches, setMatches] = useState<ScheduleMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<AgendaViewMode>('LIST');
  const [typeFilter, setTypeFilter] = useState<AgendaCompetitionType | 'ALL'>('ALL');

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

  const filteredMatches = useMemo(
    () =>
      matches.filter((m) => {
        if (typeFilter === 'ALL') return true;
        return normalizeCompetitionType(m) === typeFilter;
      }),
    [matches, typeFilter],
  );

  const groupedByDate = useMemo(() => {
    const map = new Map<string, { label: string; items: ScheduleMatch[] }>();
    for (const m of filteredMatches) {
      const k = kickoffLabel(m);
      const existing = map.get(k.dateKey);
      if (existing) {
        existing.items.push(m);
      } else {
        map.set(k.dateKey, { label: k.date, items: [m] });
      }
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === 'TBD') return 1;
      if (b === 'TBD') return -1;
      return a.localeCompare(b);
    });
  }, [filteredMatches]);

  const allTypeCount = matches.length;
  const leagueCount = matches.filter((m) => normalizeCompetitionType(m) === 'LEAGUE').length;
  const coupeCount = matches.filter((m) => normalizeCompetitionType(m) === 'COUPE').length;
  const uclCount = matches.filter((m) => normalizeCompetitionType(m) === 'UCL').length;

  const renderMatchCard = (m: ScheduleMatch, compact = false) => {
    const k = kickoffLabel(m);
    const isHome = m.viewer_team_id === m.home_team_id;
    const competitionType = normalizeCompetitionType(m);
    const competitionChip = competitionTheme[competitionType];
    const homeScore = m.home_score ?? m.homeScore;
    const awayScore = m.away_score ?? m.awayScore;
    const hasScore =
      homeScore !== null &&
      homeScore !== undefined &&
      awayScore !== null &&
      awayScore !== undefined &&
      (m.status === 'PLAYED' || m.status === 'FINISHED');
    const statusChip = statusTheme[m.status] ?? {
      label: m.status,
      className: 'border-omjep-border bg-omjep-bg-elevated text-omjep-text-muted',
    }
    const glowClass =
      competitionType === 'UCL'
        ? 'shadow-[0_18px_40px_rgba(229,185,84,0.20)]'
        : competitionType === 'COUPE'
          ? 'shadow-[0_16px_34px_rgba(141,94,221,0.18)]'
          : 'shadow-[0_16px_34px_rgba(61,116,216,0.18)]'

    return (
      <article
        key={m.id}
        className={`rounded-2xl border border-omjep-border bg-omjep-bg-panel/92 p-4 backdrop-blur-sm transition hover:border-omjep-mauve/35 hover:bg-omjep-bg-panel ${glowClass}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="inline-flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${competitionChip.dot}`} />
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${competitionChip.className}`}
              >
                {competitionChip.label}
              </span>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-omjep-text-muted">
              {m.competition?.name ?? 'Compétition'}
              {m.round ? ` · ${m.round}` : ''}
            </p>
            <p className="font-mono text-xs text-omjep-text-secondary">
              {k.date}
              {k.time ? <span className="ml-2 tabular-nums text-omjep-text-primary">{k.time}</span> : null}
            </p>
          </div>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusChip.className}`}>
            {statusChip.label}
          </span>
        </div>

        <div className={`${compact ? 'mt-3' : 'mt-4'} rounded-xl border border-omjep-border/70 bg-omjep-bg-elevated/75 p-3`}>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-omjep-border bg-omjep-bg-panel-soft/70">
                  {m.homeTeam.logo_url ? (
                    <img src={m.homeTeam.logo_url} alt={m.homeTeam.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-black uppercase text-omjep-text-primary">{m.homeTeam.name.slice(0, 1)}</span>
                  )}
                </div>
                <p className="truncate text-sm font-semibold text-omjep-text-primary">{m.homeTeam.name}</p>
              </div>
              <p className="text-[11px] text-omjep-text-muted">Domicile</p>
            </div>
            <div className="text-center">
              {hasScore ? (
                <p className="font-mono text-lg font-black tabular-nums text-omjep-text-primary">
                  {homeScore} - {awayScore}
                </p>
              ) : (
                <p className="font-mono text-sm font-bold text-omjep-mauve">vs</p>
              )}
            </div>
            <div className="min-w-0 text-right">
              <div className="flex items-center justify-end gap-2">
                <p className="truncate text-sm font-semibold text-omjep-text-primary">{m.awayTeam.name}</p>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-omjep-border bg-omjep-bg-panel-soft/70">
                  {m.awayTeam.logo_url ? (
                    <img src={m.awayTeam.logo_url} alt={m.awayTeam.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-black uppercase text-omjep-text-primary">{m.awayTeam.name.slice(0, 1)}</span>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-omjep-text-muted">Extérieur</p>
            </div>
          </div>
          {m.viewer_team_id ? (
            <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-omjep-text-secondary">
              <MapPin className="h-3.5 w-3.5 text-omjep-mauve" />
              Votre club joue {isHome ? 'à domicile' : 'à l’extérieur'}
            </div>
          ) : null}
        </div>
      </article>
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 rounded-3xl border border-omjep-border/60 bg-gradient-to-b from-[#0c1424]/95 via-omjep-bg-panel/95 to-omjep-bg-panel/92 p-4 pb-16 sm:p-6">
      <DashboardPageHeading
        eyebrow="Agenda Matchs"
        title="Agenda compétition"
        subtitle="Consultez vos matchs League, Coupe et UCL par date, en liste ou en cartes"
        action={
          <div className="inline-flex items-center rounded-xl border border-omjep-border bg-omjep-bg-panel-soft/70 p-1">
            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                viewMode === 'LIST'
                  ? 'bg-omjep-mauve/18 text-omjep-text-primary'
                  : 'text-omjep-text-muted hover:text-omjep-text-primary'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Liste
            </button>
            <button
              type="button"
              onClick={() => setViewMode('CARDS')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                viewMode === 'CARDS'
                  ? 'bg-omjep-mauve/18 text-omjep-text-primary'
                  : 'text-omjep-text-muted hover:text-omjep-text-primary'
              }`}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              Cartes
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-2xl border border-omjep-border bg-omjep-bg-panel-soft/70"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-omjep-danger/30 bg-omjep-danger/10 px-4 py-3 text-sm text-omjep-danger">
          {error}
        </div>
      ) : (
        <section className="space-y-5">
          <div className="rounded-2xl border border-omjep-border bg-omjep-bg-panel/88 p-4">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: 'ALL' as const, label: 'Tous', count: allTypeCount, className: 'border-omjep-border text-omjep-text-primary' },
                { key: 'LEAGUE' as const, label: 'League', count: leagueCount, className: 'border-omjep-cobalt/35 text-omjep-text-primary' },
                { key: 'COUPE' as const, label: 'Coupe', count: coupeCount, className: 'border-omjep-mauve/40 text-omjep-mauve' },
                { key: 'UCL' as const, label: 'UCL', count: uclCount, className: 'border-omjep-border-gold/45 text-omjep-gold' },
              ].map((f) => {
                const active = typeFilter === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setTypeFilter(f.key)}
                    className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide transition ${
                      active ? `bg-omjep-bg-elevated ${f.className}` : 'border-omjep-border/80 text-omjep-text-muted hover:text-omjep-text-primary'
                    }`}
                  >
                    {f.label}
                    <span className="rounded-full bg-omjep-bg-panel-soft px-1.5 py-0.5 text-[10px] tabular-nums">
                      {f.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {groupedByDate.length === 0 ? (
            <div className="rounded-2xl border border-omjep-border bg-omjep-bg-panel/88 p-10 text-center">
              <Calendar className="mx-auto mb-3 h-11 w-11 text-omjep-text-muted" />
              <p className="text-sm font-semibold text-omjep-text-primary">Aucun match planifié</p>
              <p className="mt-2 text-xs text-omjep-text-secondary">
                Aucun rendez-vous trouvé pour ce filtre. Essayez un autre type de compétition.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <Link
                  to="/dashboard/ladder"
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-omjep-border bg-omjep-bg-panel-soft px-3 py-2 text-xs font-semibold text-omjep-text-primary transition hover:border-omjep-mauve/35 hover:bg-omjep-mauve/10"
                >
                  <Trophy className="h-3.5 w-3.5 text-omjep-mauve" />
                  Voir compétitions
                </Link>
                <Link
                  to="/dashboard/matches"
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-omjep-mauve/40 bg-omjep-mauve/14 px-3 py-2 text-xs font-semibold text-omjep-text-primary transition hover:bg-omjep-mauve/20"
                >
                  <Swords className="h-3.5 w-3.5 text-omjep-mauve" />
                  Ouvrir matchs
                </Link>
              </div>
            </div>
          ) : viewMode === 'LIST' ? (
            <div className="space-y-5">
              {groupedByDate.map(([dateKey, group]) => (
                <section key={dateKey} className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-lg border border-omjep-border bg-omjep-bg-panel-soft/75 px-3 py-1.5">
                    <CalendarDays className="h-4 w-4 text-omjep-mauve" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-omjep-text-primary">
                      {group.label}
                    </p>
                  </div>
                  <div className="relative space-y-3 pl-4 sm:pl-5">
                    <div className="absolute left-[7px] top-0 h-full w-px bg-gradient-to-b from-omjep-mauve/55 via-omjep-cobalt/45 to-transparent sm:left-2" />
                    {group.items.map((m) => (
                      <div key={m.id} className="relative">
                        <span className="absolute -left-4 top-6 h-2.5 w-2.5 rounded-full border border-omjep-border bg-omjep-bg-panel ring-2 ring-omjep-mauve/25 sm:-left-5" />
                        {renderMatchCard(m, true)}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              {groupedByDate.map(([dateKey, group]) => (
                <section key={dateKey} className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-lg border border-omjep-border bg-omjep-bg-panel-soft/75 px-3 py-1.5">
                    <CalendarDays className="h-4 w-4 text-omjep-mauve" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-omjep-text-primary">
                      {group.label}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {group.items.map((m) => renderMatchCard(m))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>
      )}

      {!loading ? (
        <div className="flex justify-center">
          <Link
            to="/dashboard/matches"
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-omjep-border bg-omjep-bg-panel-soft/80 px-4 py-2.5 text-sm font-semibold text-omjep-text-primary transition hover:border-omjep-mauve/35 hover:bg-omjep-mauve/10"
          >
            <Swords className="h-4 w-4 text-omjep-mauve" />
            Vue Matchs complète
          </Link>
        </div>
      ) : (
        <div className="flex justify-center py-4">
          <Loader2 className="h-8 w-8 animate-spin text-omjep-mauve/55" />
        </div>
      )}
    </div>
  );
}
