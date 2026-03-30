import { useEffect, useState, useRef } from 'react';
import {
  Swords, Loader2, X, CheckCircle2, AlertCircle,
  Filter, ChevronDown, Trophy, Clock, Award,
} from 'lucide-react';
import api from '@/lib/api';

interface Team {
  id: string;
  name: string;
  logo_url?: string | null;
}

interface Competition {
  id: string;
  name: string;
  type: string;
}

interface Match {
  id: string;
  round: string | null;
  home_score: number | null;
  away_score: number | null;
  status: 'SCHEDULED' | 'LIVE' | 'PLAYED' | 'FINISHED' | 'CANCELLED' | 'DISPUTED';
  played_at: string | null;
  competition: Competition | null;
  homeTeam: Team;
  awayTeam: Team;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; border: string; text: string; dot: string }> = {
  SCHEDULED: {
    label: 'Programmé',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    text: 'text-sky-400',
    dot: 'bg-sky-400',
  },
  LIVE: {
    label: 'En direct',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    text: 'text-red-400',
    dot: 'bg-red-400',
  },
  PLAYED: {
    label: 'Terminé',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  FINISHED: {
    label: 'Validé',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
  },
  CANCELLED: {
    label: 'Annulé',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
    text: 'text-slate-400',
    dot: 'bg-slate-400',
  },
  DISPUTED: {
    label: 'Litige',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    text: 'text-orange-400',
    dot: 'bg-orange-400',
  },
};

export default function AdminMatches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCompetition, setFilterCompetition] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'SCHEDULED' | 'PLAYED'>('SCHEDULED');

  const [scoreModal, setScoreModal] = useState<Match | null>(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const modalRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [matchesRes, compsRes] = await Promise.all([
        api.get('/admin/matches'),
        api.get('/admin/competitions'),
      ]);
      const matchesData = matchesRes.data.data ?? matchesRes.data;
      const compsData = compsRes.data.data ?? compsRes.data;
      setMatches(Array.isArray(matchesData) ? matchesData : []);

      const compsList = Array.isArray(compsData) ? compsData : [];
      setCompetitions(
        compsList.map((c: any) => ({ id: c.id, name: c.name, type: c.type })),
      );
    } catch {
      setError('Impossible de charger les matchs.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = matches.filter((m) => {
    if (filterCompetition && m.competition?.id !== filterCompetition) return false;
    if (activeTab === 'SCHEDULED') return m.status === 'SCHEDULED' || m.status === 'LIVE';
    return m.status !== 'SCHEDULED' && m.status !== 'LIVE';
  });

  const openScoreModal = (match: Match) => {
    setScoreModal(match);
    setHomeScore('');
    setAwayScore('');
    setError('');
  };

  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scoreModal) return;

    const hs = parseInt(homeScore, 10);
    const as = parseInt(awayScore, 10);
    if (isNaN(hs) || isNaN(as) || hs < 0 || as < 0) {
      setError('Les scores doivent être des nombres positifs.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await api.patch(`/admin/matches/${scoreModal.id}/score`, {
        home_score: hs,
        away_score: as,
      });
      setSuccess('Résultat enregistré avec succès !');
      setScoreModal(null);
      await fetchData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erreur lors de la validation.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCompName = filterCompetition
    ? competitions.find((c) => c.id === filterCompetition)?.name ?? 'Compétition'
    : 'Toutes les compétitions';

  const scheduledCount = matches.filter((m) => m.status === 'SCHEDULED' || m.status === 'LIVE').length;
  const playedCount = matches.filter((m) => m.status !== 'SCHEDULED' && m.status !== 'LIVE').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 flex items-center justify-center border border-amber-400/20">
              <Swords className="w-5 h-5 text-amber-400" />
            </div>
            Gestion des Matchs
          </h1>
          <p className="text-sm text-slate-500 mt-1 ml-[52px]">
            Consultez et saisissez les résultats des matchs.
          </p>
        </div>

        {/* Competition filter */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen((o) => !o)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-400/15 bg-white/[0.03] text-sm text-slate-300 hover:border-amber-400/30 hover:bg-white/[0.05] transition-all duration-200"
          >
            <Filter className="w-4 h-4 text-amber-400/60" />
            <span className="max-w-[180px] truncate">{selectedCompName}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${filterOpen ? 'rotate-180' : ''}`} />
          </button>

          {filterOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-amber-400/15 bg-[#0a0f1e] shadow-2xl shadow-black/50 overflow-hidden z-20 animate-[fadeIn_0.15s_ease-out]">
              <button
                onClick={() => { setFilterCompetition(''); setFilterOpen(false); }}
                className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                  !filterCompetition ? 'text-amber-400 bg-amber-400/5' : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'
                }`}
              >
                Toutes les compétitions
              </button>
              {competitions.map((comp) => (
                <button
                  key={comp.id}
                  onClick={() => { setFilterCompetition(comp.id); setFilterOpen(false); }}
                  className={`w-full text-left px-4 py-3 text-sm border-t border-white/[0.03] transition-colors ${
                    filterCompetition === comp.id ? 'text-amber-400 bg-amber-400/5' : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'
                  }`}
                >
                  <span className="truncate block">{comp.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm animate-[fadeIn_0.3s_ease-out]">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}
      {error && !scoreModal && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-[fadeIn_0.3s_ease-out]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-amber-400/10 w-fit">
        <button
          onClick={() => setActiveTab('SCHEDULED')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'SCHEDULED'
              ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20 shadow-sm'
              : 'text-slate-500 hover:text-slate-300 border border-transparent'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          À jouer
          <span className={`ml-1 text-xs px-2 py-0.5 rounded-full ${
            activeTab === 'SCHEDULED' ? 'bg-amber-400/20 text-amber-400' : 'bg-white/[0.05] text-slate-600'
          }`}>
            {scheduledCount}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('PLAYED')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'PLAYED'
              ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20 shadow-sm'
              : 'text-slate-500 hover:text-slate-300 border border-transparent'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          Résultats
          <span className={`ml-1 text-xs px-2 py-0.5 rounded-full ${
            activeTab === 'PLAYED' ? 'bg-amber-400/20 text-amber-400' : 'bg-white/[0.05] text-slate-600'
          }`}>
            {playedCount}
          </span>
        </button>
      </div>

      {/* Match list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-amber-400/10 rounded-2xl bg-gradient-to-b from-white/[0.01] to-transparent">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
            <Swords className="w-8 h-8 text-slate-700" />
          </div>
          <p className="text-slate-500 text-sm font-medium">
            {activeTab === 'SCHEDULED' ? 'Aucun match programmé.' : 'Aucun résultat disponible.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((match) => {
            const statusCfg = STATUS_CONFIG[match.status] ?? STATUS_CONFIG.SCHEDULED;
            const isScheduled = match.status === 'SCHEDULED';

            return (
              <div
                key={match.id}
                onClick={isScheduled ? () => openScoreModal(match) : undefined}
                className={`group relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${
                  isScheduled
                    ? 'border-amber-400/[0.08] bg-gradient-to-r from-white/[0.02] to-transparent hover:border-amber-400/25 hover:bg-white/[0.04] cursor-pointer hover:shadow-lg hover:shadow-amber-400/[0.04]'
                    : 'border-white/[0.05] bg-white/[0.01]'
                }`}
              >
                {/* Competition badge */}
                {match.competition && (
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] shrink-0 min-w-[120px]">
                    <Trophy className="w-3 h-3 text-amber-400/50" />
                    <span className="text-[11px] text-slate-500 font-medium truncate">{match.competition.name}</span>
                  </div>
                )}

                {/* Round */}
                {match.round && (
                  <span className="hidden md:block text-[11px] text-slate-600 font-medium shrink-0 w-24 text-center">
                    {match.round}
                  </span>
                )}

                {/* Match card */}
                <div className="flex-1 flex items-center justify-center gap-3 sm:gap-5">
                  {/* Home team */}
                  <div className="flex items-center gap-2.5 flex-1 justify-end">
                    <span className="text-sm font-semibold text-white truncate text-right">{match.homeTeam.name}</span>
                    <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase shrink-0">
                      {match.homeTeam.logo_url ? (
                        <img src={match.homeTeam.logo_url} alt="" className="w-6 h-6 rounded object-cover" />
                      ) : (
                        match.homeTeam.name.slice(0, 2)
                      )}
                    </div>
                  </div>

                  {/* Score / VS */}
                  <div className="shrink-0 min-w-[70px] flex items-center justify-center">
                    {match.home_score != null && match.away_score != null ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.06]">
                        <span className="text-base font-black text-white tabular-nums">{match.home_score}</span>
                        <span className="text-xs text-slate-600 font-medium">-</span>
                        <span className="text-base font-black text-white tabular-nums">{match.away_score}</span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">VS</span>
                    )}
                  </div>

                  {/* Away team */}
                  <div className="flex items-center gap-2.5 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase shrink-0">
                      {match.awayTeam.logo_url ? (
                        <img src={match.awayTeam.logo_url} alt="" className="w-6 h-6 rounded object-cover" />
                      ) : (
                        match.awayTeam.name.slice(0, 2)
                      )}
                    </div>
                    <span className="text-sm font-semibold text-white truncate">{match.awayTeam.name}</span>
                  </div>
                </div>

                {/* Status badge */}
                <span className={`hidden sm:inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border shrink-0 ${statusCfg.bg} ${statusCfg.border} ${statusCfg.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} ${match.status === 'LIVE' ? 'animate-pulse' : ''}`} />
                  {statusCfg.label}
                </span>

                {/* Click hint for scheduled matches */}
                {isScheduled && (
                  <span className="hidden lg:block text-[10px] text-amber-400/40 font-medium group-hover:text-amber-400/80 transition-colors shrink-0">
                    Saisir le score →
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Score Modal */}
      {scoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setScoreModal(null)}
          />
          <div
            ref={modalRef}
            className="relative w-full max-w-md bg-[#0a0f1e] border border-amber-400/15 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-[slideUp_0.3s_ease-out]"
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-400/10 bg-gradient-to-r from-amber-400/[0.03] to-transparent">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Swords className="w-5 h-5 text-amber-400" />
                Saisir le Résultat
              </h2>
              <button
                onClick={() => setScoreModal(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all duration-200 hover:rotate-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitScore} className="p-6 space-y-6">
              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Match info */}
              {scoreModal.competition && (
                <div className="text-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.03] border border-white/[0.05] text-[11px] text-slate-500 font-medium">
                    <Trophy className="w-3 h-3 text-amber-400/50" />
                    {scoreModal.competition.name}
                    {scoreModal.round && <span className="text-slate-600">· {scoreModal.round}</span>}
                  </span>
                </div>
              )}

              {/* Score inputs */}
              <div className="flex items-center gap-4">
                {/* Home */}
                <div className="flex-1 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-sm font-bold text-slate-400 uppercase">
                    {scoreModal.homeTeam.logo_url ? (
                      <img src={scoreModal.homeTeam.logo_url} alt="" className="w-9 h-9 rounded-lg object-cover" />
                    ) : (
                      scoreModal.homeTeam.name.slice(0, 2)
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{scoreModal.homeTeam.name}</p>
                  <input
                    type="number"
                    min="0"
                    value={homeScore}
                    onChange={(e) => setHomeScore(e.target.value)}
                    required
                    placeholder="0"
                    className="w-full text-center text-3xl font-black py-4 rounded-xl bg-white/[0.04] border border-amber-400/10 text-white placeholder:text-slate-700 focus:outline-none focus:border-amber-400/30 focus:ring-1 focus:ring-amber-400/20 transition-all duration-200 tabular-nums"
                  />
                </div>

                <span className="text-lg font-bold text-slate-600 mt-8">–</span>

                {/* Away */}
                <div className="flex-1 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-sm font-bold text-slate-400 uppercase">
                    {scoreModal.awayTeam.logo_url ? (
                      <img src={scoreModal.awayTeam.logo_url} alt="" className="w-9 h-9 rounded-lg object-cover" />
                    ) : (
                      scoreModal.awayTeam.name.slice(0, 2)
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{scoreModal.awayTeam.name}</p>
                  <input
                    type="number"
                    min="0"
                    value={awayScore}
                    onChange={(e) => setAwayScore(e.target.value)}
                    required
                    placeholder="0"
                    className="w-full text-center text-3xl font-black py-4 rounded-xl bg-white/[0.04] border border-amber-400/10 text-white placeholder:text-slate-700 focus:outline-none focus:border-amber-400/30 focus:ring-1 focus:ring-amber-400/20 transition-all duration-200 tabular-nums"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setScoreModal(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all duration-200 active:scale-[0.97]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#020617] text-sm font-bold hover:from-amber-300 hover:to-amber-400 disabled:opacity-40 transition-all duration-300 shadow-lg shadow-amber-400/20 hover:shadow-amber-400/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Valider le Résultat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Keyframe animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
