import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Clock, CheckCircle2, XCircle, Dices, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency } from '@/utils/formatCurrency';
import PredictStats from './PredictStats';
import PredictMatch from './PredictMatch';
import type { TeamFormLetter } from './predictionTypes';
import DashboardPageHeading from '@/components/dashboard/DashboardPageHeading'

type PredictionStatus = 'PENDING' | 'WON' | 'LOST';

interface TeamMini {
  id: string;
  name: string;
  logo_url: string | null;
}

interface MatchRow {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  played_at: string | null;
  round: string | null;
  competition: { id: string; name: string; type: string } | null;
  homeTeam: TeamMini;
  awayTeam: TeamMini;
  homeTeamForm?: TeamFormLetter[];
  awayTeamForm?: TeamFormLetter[];
  homeTeamRank?: number | null;
  awayTeamRank?: number | null;
}

interface MyPredictionRow {
  id: string;
  homeScore: number;
  awayScore: number;
  betAmount: number;
  status: PredictionStatus;
  created_at: string;
  match: MatchRow & {
    home_score: number | null;
    away_score: number | null;
  };
}

const STATUS_LABEL: Record<PredictionStatus, string> = {
  PENDING: 'En cours',
  WON: 'Gagné',
  LOST: 'Perdu',
};

export default function Predictions() {
  const { patchUser } = useAuthStore();
  const [tab, setTab] = useState<'paris' | 'history'>('paris');
  const [upcoming, setUpcoming] = useState<MatchRow[]>([]);
  const [mine, setMine] = useState<MyPredictionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const [isLongLoading, setIsLongLoading] = useState(false);
  const [forms, setForms] = useState<
    Record<string, { home: string; away: string; bet: string }>
  >({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, m] = await Promise.all([
        api.get<MatchRow[]>('/predictions/upcoming'),
        api.get<MyPredictionRow[]>('/predictions/me'),
      ]);
      setUpcoming(Array.isArray(u.data) ? u.data : []);
      setMine(Array.isArray(m.data) ? m.data : []);
      setForms((prev) => {
        const next = { ...prev };
        for (const match of u.data ?? []) {
          if (!next[match.id]) {
            next[match.id] = { home: '0', away: '0', bet: '10' };
          }
        }
        return next;
      });
    } catch {
      toast.error('Impossible de charger les pronostics.');
      setUpcoming([]);
      setMine([]);
    } finally {
      setLoading(false);
      setStatsRefreshKey((k) => k + 1);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!loading) {
      setIsLongLoading(false);
      return;
    }
    const timer = window.setTimeout(() => setIsLongLoading(true), 4000);
    return () => window.clearTimeout(timer);
  }, [loading]);

  const predictedMatchIds = useMemo(
    () => new Set(mine.map((p) => p.match.id)),
    [mine],
  );

  const submit = async (match: MatchRow) => {
    const f = forms[match.id];
    if (!f) return;
    const home = Number.parseInt(f.home, 10);
    const away = Number.parseInt(f.away, 10);
    const bet = Number.parseInt(f.bet, 10);
    if (Number.isNaN(home) || Number.isNaN(away) || home < 0 || away < 0) {
      toast.error('Scores invalides.');
      return;
    }
    if (Number.isNaN(bet) || bet < 1) {
      toast.error('Mise Jepy minimale : 1.');
      return;
    }

    setSubmitting(match.id);
    try {
      const { data } = await api.post<{
        user: { jepyCoins: number; omjepCoins: number };
      }>('/predictions', {
        match_id: match.id,
        home_score: home,
        away_score: away,
        bet_amount: bet,
      });
      toast.success('Pronostic enregistré ! Bonne chance.');
      if (data?.user) {
        patchUser({
          jepyCoins: data.user.jepyCoins,
          omjepCoins: data.user.omjepCoins,
        });
      }
      await load();
      setTab('history');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : msg;
      toast.error(typeof text === 'string' ? text : 'Enregistrement impossible.');
    } finally {
      setSubmitting(null);
    }
  };

  const updateForm = (
    matchId: string,
    field: 'home' | 'away' | 'bet',
    value: string,
  ) => {
    setForms((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [field]: value },
    }));
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="omjep-dash-card p-5">
          <div className="flex items-center gap-2 text-sm text-omjep-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin text-omjep-mauve" />
            Chargement des pronostics…
          </div>
          {isLongLoading ? (
            <p className="mt-2 text-xs text-omjep-text-muted">
              Les données arrivent, l&apos;interface reste synchronisée avec votre session.
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={`predictions-stat-loading-${idx}`}
              className="h-24 animate-pulse rounded-2xl border border-omjep-border bg-omjep-bg-panel-soft/80"
            />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div
              key={`predictions-card-loading-${idx}`}
              className="h-44 animate-pulse rounded-2xl border border-omjep-border bg-omjep-bg-panel-soft/70"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="omjep-dash-card overflow-hidden">
        <div className="border-b border-omjep-border px-6 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <DashboardPageHeading
              eyebrow="Predict & Win"
              title="Pronostics Jepy"
              subtitle="Pariez sur les scores et suivez vos performances"
              className="border-b-0 pb-0"
            />
            <div className="inline-flex rounded-xl border border-omjep-border bg-omjep-bg-panel-soft/80 p-1">
              <button
                type="button"
                onClick={() => setTab('paris')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  tab === 'paris'
                    ? 'bg-omjep-mauve/20 text-omjep-text-primary'
                    : 'text-omjep-text-muted hover:text-omjep-text-primary'
                }`}
              >
                Paris
              </button>
              <button
                type="button"
                onClick={() => setTab('history')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  tab === 'history'
                    ? 'bg-omjep-mauve/20 text-omjep-text-primary'
                    : 'text-omjep-text-muted hover:text-omjep-text-primary'
                }`}
              >
                Mes Pronos
              </button>
            </div>
          </div>
          <p className="mt-3 text-sm text-omjep-text-secondary">
            Score exact = gain ×3 sur votre mise (Jepy). Une seule prédiction par match.
          </p>
        </div>
      </div>

      <PredictStats refreshKey={statsRefreshKey} />

      {tab === 'paris' && (
        <div className="space-y-6">
          {upcoming.length === 0 ? (
            <div className="omjep-dash-card p-10 text-center md:p-12">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-omjep-mauve/35 bg-omjep-mauve/10 text-omjep-mauve">
                <Dices className="h-6 w-6" aria-hidden />
              </div>
              <p className="text-sm font-semibold text-omjep-text-primary">Aucun match ouvert aux paris</p>
              <p className="mx-auto mt-2 max-w-md text-xs text-omjep-text-secondary">
                Revenez quand le calendrier publiera de nouvelles rencontres. En attendant, consultez le classement ou votre profil.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Link
                  to="/dashboard/schedule"
                  className="inline-flex items-center gap-2 rounded-xl border border-omjep-border bg-omjep-bg-elevated/80 px-4 py-2 text-xs font-semibold text-omjep-text-primary transition-colors hover:border-omjep-mauve/40"
                >
                  Calendrier
                </Link>
                <Link
                  to="/dashboard/leaderboard"
                  className="inline-flex items-center gap-2 rounded-xl border border-omjep-border-gold/40 bg-omjep-gold/10 px-4 py-2 text-xs font-semibold text-omjep-gold transition-colors hover:bg-omjep-gold/15"
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Classement
                </Link>
              </div>
            </div>
          ) : (
            upcoming.map((match) => {
              const f = forms[match.id] ?? { home: '0', away: '0', bet: '10' };
              const already = predictedMatchIds.has(match.id);
              const cardMatch = {
                id: match.id,
                round: match.round ?? null,
                played_at: match.played_at,
                competition: match.competition,
                homeTeam: match.homeTeam,
                awayTeam: match.awayTeam,
                homeTeamForm: match.homeTeamForm ?? [],
                awayTeamForm: match.awayTeamForm ?? [],
                homeTeamRank: match.homeTeamRank ?? null,
                awayTeamRank: match.awayTeamRank ?? null,
              };
              return (
                <PredictMatch
                  key={match.id}
                  match={cardMatch}
                  formHome={f.home}
                  formAway={f.away}
                  formBet={f.bet}
                  already={already}
                  submitting={submitting === match.id}
                  onChange={(field, value) => updateForm(match.id, field, value)}
                  onSubmit={() => void submit(match)}
                />
              );
            })
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {mine.length === 0 ? (
            <div className="omjep-dash-card p-10 text-center md:p-12">
              <p className="text-sm font-semibold text-omjep-text-primary">Aucun pronostic pour l&apos;instant</p>
              <p className="mx-auto mt-2 max-w-md text-xs text-omjep-text-secondary">
                Vos mises apparaîtront ici après votre premier pari sur un match ouvert.
              </p>
              <button
                type="button"
                onClick={() => setTab('paris')}
                className="mt-6 inline-flex items-center justify-center rounded-xl border border-omjep-mauve/45 bg-omjep-mauve/12 px-5 py-2.5 text-xs font-semibold text-omjep-text-primary transition-colors hover:bg-omjep-mauve/18"
              >
                Voir les paris
              </button>
            </div>
          ) : (
            mine.map((p) => {
              const m = p.match;
              const finalH = m.home_score;
              const finalA = m.away_score;
              const statusStyle =
                p.status === 'WON'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : p.status === 'LOST'
                    ? 'border-red-500/40 bg-red-500/10 text-red-300'
                    : 'border-amber-500/30 bg-amber-500/5 text-amber-200/90';

              return (
                <div
                  key={p.id}
                  className={`flex flex-col gap-3 rounded-2xl border px-4 py-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between ${statusStyle}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {p.status === 'WON' && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
                      {p.status === 'LOST' && <XCircle className="h-4 w-4 shrink-0 text-red-400" />}
                      {p.status === 'PENDING' && <Clock className="h-4 w-4 shrink-0 text-amber-400" />}
                      <span className="truncate text-sm font-semibold text-omjep-text-primary">
                        {m.homeTeam.name ?? '—'} vs {m.awayTeam.name ?? '—'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-omjep-text-muted">
                      Votre prono : {p.homeScore} - {p.awayScore} · Mise {formatCurrency(p.betAmount, 'Jepy')}
                      {finalH != null && finalA != null && (
                        <span className="text-slate-400">
                          {' '}
                          · Résultat : {finalH} - {finalA}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[10px] text-omjep-text-muted">
                      {new Date(p.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                        p.status === 'WON'
                          ? 'bg-emerald-500/20 text-emerald-200'
                          : p.status === 'LOST'
                            ? 'bg-red-500/20 text-red-200'
                            : 'bg-amber-500/15 text-amber-100'
                      }`}
                    >
                      {STATUS_LABEL[p.status]}
                    </span>
                    {p.status === 'WON' && (
                      <span className="text-xs font-bold text-emerald-400">
                        +{formatCurrency(p.betAmount * 3, 'Jepy')}
                      </span>
                    )}
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
