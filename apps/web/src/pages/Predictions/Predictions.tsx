import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dices,
  Loader2,
  Sparkles,
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  Minus,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency } from '@/utils/formatCurrency';

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
  competition: { id: string; name: string; type: string } | null;
  homeTeam: TeamMini;
  awayTeam: TeamMini;
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
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-3xl border border-white/[0.06] bg-[#0B0D13]/90 backdrop-blur-md">
        <div className="border-b border-white/[0.06] px-6 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                <Dices className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/80">
                  Predict &amp; Win
                </p>
                <h1 className="text-2xl font-black tracking-tight text-white">Pronostics Jepy</h1>
              </div>
            </div>
            <div className="inline-flex rounded-xl border border-white/10 bg-black/30 p-1">
              <button
                type="button"
                onClick={() => setTab('paris')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  tab === 'paris'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'text-slate-500 hover:text-white'
                }`}
              >
                Paris
              </button>
              <button
                type="button"
                onClick={() => setTab('history')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  tab === 'history'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'text-slate-500 hover:text-white'
                }`}
              >
                Mes Pronos
              </button>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Score exact = gain ×3 sur votre mise (Jepy). Une seule prédiction par match.
          </p>
        </div>
      </div>

      {tab === 'paris' && (
        <div className="space-y-6">
          {upcoming.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-[#0B0D13]/60 p-12 text-center backdrop-blur-sm">
              <p className="text-sm text-slate-500">Aucun match ouvert aux paris pour le moment.</p>
            </div>
          ) : (
            upcoming.map((match) => {
              const f = forms[match.id] ?? { home: '0', away: '0', bet: '10' };
              const already = predictedMatchIds.has(match.id);
              return (
                <div
                  key={match.id}
                  className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0B0D13]/80 shadow-lg backdrop-blur-xl"
                >
                  <div className="border-b border-white/[0.06] bg-white/[0.03] px-4 py-3 sm:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-500">
                        {match.competition?.name ?? 'Match amical'}
                      </span>
                      {match.played_at && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-600">
                          <Clock className="h-3 w-3" />
                          {new Date(match.played_at).toLocaleString('fr-FR')}
                        </span>
                      )}
                    </div>
                    <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
                      <div className="flex flex-col items-center gap-2 text-center">
                        {match.homeTeam.logo_url ? (
                          <img
                            src={match.homeTeam.logo_url}
                            alt=""
                            className="h-14 w-14 rounded-xl object-cover ring-1 ring-white/10"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/5 text-lg font-bold text-slate-400">
                            {(match.homeTeam.name ?? '??').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="max-w-[140px] text-sm font-semibold text-white">
                          {match.homeTeam.name ?? '—'}
                        </span>
                      </div>
                      <span className="text-2xl font-black text-slate-600">VS</span>
                      <div className="flex flex-col items-center gap-2 text-center">
                        {match.awayTeam.logo_url ? (
                          <img
                            src={match.awayTeam.logo_url}
                            alt=""
                            className="h-14 w-14 rounded-xl object-cover ring-1 ring-white/10"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/5 text-lg font-bold text-slate-400">
                            {(match.awayTeam.name ?? '??').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="max-w-[140px] text-sm font-semibold text-white">
                          {match.awayTeam.name ?? '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 sm:p-6">
                    {already ? (
                      <p className="text-center text-sm text-amber-400/90">
                        Vous avez déjà un pronostic en cours sur ce match.
                      </p>
                    ) : (
                      <div className="mx-auto flex max-w-md flex-col gap-4">
                        <div className="flex items-end justify-center gap-3">
                          <div className="flex-1">
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              Domicile
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={f.home}
                              onChange={(e) => updateForm(match.id, 'home', e.target.value)}
                              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-center text-lg font-bold text-white backdrop-blur-sm focus:border-emerald-500/40 focus:outline-none"
                            />
                          </div>
                          <Minus className="mb-2 h-5 w-5 text-slate-600" />
                          <div className="flex-1">
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              Extérieur
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={f.away}
                              onChange={(e) => updateForm(match.id, 'away', e.target.value)}
                              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-center text-lg font-bold text-white backdrop-blur-sm focus:border-emerald-500/40 focus:outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <Sparkles className="h-3 w-3 text-cyan-400" />
                            Mise (Jepy)
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={f.bet}
                            onChange={(e) => updateForm(match.id, 'bet', e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-white backdrop-blur-sm focus:border-emerald-500/40 focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={submitting === match.id}
                          onClick={() => void submit(match)}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-700 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:brightness-110 disabled:opacity-50"
                        >
                          {submitting === match.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trophy className="h-4 w-4" />
                          )}
                          Valider le prono
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {mine.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-[#0B0D13]/60 p-12 text-center backdrop-blur-sm">
              <p className="text-sm text-slate-500">Aucun pronostic pour l&apos;instant.</p>
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
                      <span className="truncate text-sm font-semibold text-white">
                        {m.homeTeam.name ?? '—'} vs {m.awayTeam.name ?? '—'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Votre prono : {p.homeScore} - {p.awayScore} · Mise {formatCurrency(p.betAmount, 'Jepy')}
                      {finalH != null && finalA != null && (
                        <span className="text-slate-400">
                          {' '}
                          · Résultat : {finalH} - {finalA}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-600">
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
