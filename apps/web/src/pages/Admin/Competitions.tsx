import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy, Plus, Calendar, Loader2, X, Trash2,
  CheckCircle2, AlertCircle, Search, Shuffle, Shield, Sparkles, Network, GitBranch,
} from 'lucide-react';
import api from '@/lib/api';
import { COMPETITION_TYPE_CONFIG, getCompTypeConfig } from '@/lib/competition-icons';

interface Team {
  id: string;
  name: string;
  logo_url?: string;
}

interface CompetitionTeam {
  team_id: string;
  team: Team;
}

interface Competition {
  id: string;
  name: string;
  type: 'LEAGUE' | 'CUP' | 'CHAMPIONS';
  start_date: string | null;
  end_date: string | null;
  status: 'DRAFT' | 'ONGOING' | 'FINISHED';
  created_at: string;
  /** Absent sur anciennes réponses API = marché ouvert */
  isTransferMarketOpen?: boolean;
  cup_scenario?: 'SINGLE_ELIMINATION' | 'TWO_LEGGED_TIE' | 'GROUPS_AND_KNOCKOUT' | null;
  teams: CompetitionTeam[];
  _count?: { matches: number };
}

type CompetitionType = 'LEAGUE' | 'CUP' | 'CHAMPIONS';

/** 0 = dimanche … 6 = samedi (aligné API / Date.getDay()). */
const CALENDAR_WEEKDAYS: { value: number; label: string }[] = [
  { value: 0, label: 'Dim' },
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
];

function normalizeCompetition(c: Competition): Competition {
  return { ...c, isTransferMarketOpen: c.isTransferMarketOpen === true };
}

const STATUS_CONFIG = {
  DRAFT: {
    label: 'Brouillon',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
    text: 'text-slate-400',
    dot: 'bg-slate-400',
  },
  ONGOING: {
    label: 'En cours',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  FINISHED: {
    label: 'Terminée',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
  },
} as const;

export default function AdminCompetitions() {
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatingBracketId, setGeneratingBracketId] = useState<string | null>(null);
  const [knockoutModal, setKnockoutModal] = useState<Competition | null>(null);
  const [knockoutPreview, setKnockoutPreview] = useState<{
    canPromote: boolean;
    reason?: string;
    firstRoundName?: string;
    pairings: { label: string; home: { id: string; name: string }; away: { id: string; name: string } }[];
    groupsSummary?: { letter: string; first: string; second: string }[];
  } | null>(null);
  const [knockoutLoading, setKnockoutLoading] = useState(false);
  const [knockoutPromoting, setKnockoutPromoting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [patchingMarketId, setPatchingMarketId] = useState<string | null>(null);
  const [schedEnabled, setSchedEnabled] = useState(true);
  const [schedWeekdays, setSchedWeekdays] = useState<number[]>([1, 4]);

  const [name, setName] = useState('');
  const [type, setType] = useState<CompetitionType>('LEAGUE');
  const minTeams = type === 'CHAMPIONS' ? 8 : 2;
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [cupScenario, setCupScenario] = useState<
    'SINGLE_ELIMINATION' | 'TWO_LEGGED_TIE' | 'GROUPS_AND_KNOCKOUT'
  >('SINGLE_ELIMINATION');
  const [teamSearch, setTeamSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (confirmDelete) {
      const timer = setTimeout(() => setConfirmDelete(null), 4000);
      return () => clearTimeout(timer);
    }
    return;
  }, [confirmDelete]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compsRes, teamsRes] = await Promise.all([
        api.get('/admin/competitions'),
        api.get('/teams'),
      ]);
      const compsData = compsRes.data.data ?? compsRes.data;
      const teamsData = teamsRes.data.data ?? teamsRes.data;
      setCompetitions(
        Array.isArray(compsData) ? compsData.map((c: Competition) => normalizeCompetition(c)) : [],
      );
      setTeams(Array.isArray(teamsData) ? teamsData : []);
    } catch {
      setError('Impossible de charger les données.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setType('LEAGUE');
    setStartDate('');
    setEndDate('');
    setSelectedTeams([]);
    setCupScenario('SINGLE_ELIMINATION');
    setTeamSearch('');
    setError('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTeams.length < minTeams) {
      setError(
        type === 'CHAMPIONS'
          ? 'Le format Champions requiert au minimum 8 équipes (groupes de 4).'
          : 'Sélectionnez au moins 2 équipes.',
      );
      return;
    }
    if (type === 'CHAMPIONS' && selectedTeams.length % 4 !== 0) {
      setError('Le format Champions requiert un nombre d\'équipes multiple de 4 (8, 12, 16…).');
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setError('La date de fin doit être postérieure à la date de début.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await api.post('/admin/competitions', {
        name,
        type,
        start_date: startDate,
        end_date: endDate,
        team_ids: selectedTeams,
        ...(type === 'CUP' ? { cup_scenario: cupScenario } : {}),
      });
      setSuccess('Compétition créée avec succès !');
      setShowForm(false);
      resetForm();
      await fetchData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erreur lors de la création.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    setDeleting(id);
    try {
      await api.delete(`/admin/competitions/${id}`);
      setSuccess('Compétition supprimée.');
      setConfirmDelete(null);
      await fetchData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erreur lors de la suppression.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setDeleting(null);
    }
  };

  const toggleTransferMarket = async (comp: Competition) => {
    const currentlyOpen = comp.isTransferMarketOpen === true;
    const nextOpen = !currentlyOpen;
    setPatchingMarketId(comp.id);
    setError('');
    try {
      await api.patch(`/admin/competitions/${comp.id}/transfer-market`, {
        isTransferMarketOpen: nextOpen,
      });
      setCompetitions((prev) =>
        prev.map((c) => (c.id === comp.id ? { ...c, isTransferMarketOpen: nextOpen } : c)),
      );
      setSuccess(
        nextOpen
          ? 'Marché des transferts rouvert pour cette compétition.'
          : 'Marché des transferts fermé pour cette compétition.',
      );
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Mise à jour impossible.';
      setError(typeof msg === 'string' ? msg : 'Mise à jour impossible.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setPatchingMarketId(null);
    }
  };

  const toggleSchedWeekday = (d: number) => {
    setSchedWeekdays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b),
    );
  };

  const openKnockoutModal = async (comp: Competition) => {
    setKnockoutModal(comp);
    setKnockoutPreview(null);
    setKnockoutLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/matches/groups-knockout-preview', {
        params: { competition_id: comp.id },
      });
      const data = res.data.data ?? res.data;
      setKnockoutPreview(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Impossible de charger la prévisualisation.';
      setKnockoutPreview({
        canPromote: false,
        pairings: [],
        reason: typeof msg === 'string' ? msg : 'Erreur.',
      });
    } finally {
      setKnockoutLoading(false);
    }
  };

  const confirmKnockoutPhase = async () => {
    if (!knockoutModal) return;
    const compId = knockoutModal.id;
    setKnockoutPromoting(true);
    setError('');
    try {
      const res = await api.post('/admin/matches/promote-from-groups', {
        competition_id: compId,
      });
      setSuccess(res.data.message ?? 'Phase finale générée.');
      setKnockoutModal(null);
      setKnockoutPreview(null);
      await fetchData();
      navigate(`/admin/matches?competition=${encodeURIComponent(compId)}&view=bracket`);
      setTimeout(() => setSuccess(''), 6000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erreur lors de la génération de la phase finale.';
      setError(typeof msg === 'string' ? msg : 'Erreur lors de la génération.');
      setTimeout(() => setError(''), 8000);
    } finally {
      setKnockoutPromoting(false);
    }
  };

  const handleGenerateBracket = async (comp: Competition) => {
    if (comp.teams.length < 2) {
      setError('Au moins 2 équipes inscrites sont nécessaires pour générer un bracket.');
      setTimeout(() => setError(''), 5000);
      return;
    }
    if (comp.cup_scenario && comp.cup_scenario !== 'SINGLE_ELIMINATION') {
      setError('La génération automatique d’arbre n’est disponible que pour le scénario « Élimination directe ».');
      setTimeout(() => setError(''), 5000);
      return;
    }
    setGeneratingBracketId(comp.id);
    setError('');
    try {
      const res = await api.post('/admin/matches/generate-bracket', {
        competition_id: comp.id,
        team_ids: comp.teams.map((ct) => ct.team_id),
      });
      setSuccess(res.data.message ?? 'Arbre généré.');
      await fetchData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erreur lors de la génération du bracket.';
      setError(typeof msg === 'string' ? msg : 'Erreur lors de la génération du bracket.');
      setTimeout(() => setError(''), 6000);
    } finally {
      setGeneratingBracketId(null);
    }
  };

  const handleGenerate = async (competitionId: string, compType: CompetitionType) => {
    setGenerating(competitionId);
    try {
      const body =
        compType === 'LEAGUE' && schedEnabled && schedWeekdays.length > 0
          ? {
              league_schedule: {
                match_weekdays: schedWeekdays,
                matches_per_day: 2,
                slot_gap_minutes: 120,
                first_kickoff_time: '20:00',
              },
            }
          : {};
      const res = await api.post(`/admin/competitions/${competitionId}/generate-calendar`, body);
      setSuccess(res.data.message ?? 'Calendrier des matchs généré !');
      await fetchData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erreur lors de la génération.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setGenerating(null);
    }
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeams((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId],
    );
  };

  const filteredTeams = teams.filter((t) =>
    t.name.toLowerCase().includes(teamSearch.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 flex items-center justify-center border border-amber-400/20">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            Compétitions
          </h1>
          <p className="text-sm text-slate-500 mt-1 ml-[52px]">
            Créez et gérez les ligues et coupes du circuit.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); resetForm(); }}
          className="group flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#020617] text-sm font-bold hover:from-amber-300 hover:to-amber-400 transition-all duration-300 shadow-lg shadow-amber-400/25 hover:shadow-amber-400/40 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
          Nouvelle Compétition
        </button>
      </div>

      {/* ── Alerts ── */}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm animate-[fadeIn_0.3s_ease-out]">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}
      {error && !showForm && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-[fadeIn_0.3s_ease-out]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {competitions.some((c) => c.status === 'DRAFT' && c.type === 'LEAGUE') && (
        <div className="rounded-xl border border-amber-400/15 bg-amber-950/15 p-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400/90">
            Championnat — planification des matchs
          </p>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={schedEnabled}
              onChange={(e) => setSchedEnabled(e.target.checked)}
              className="mt-1 rounded border-amber-400/40 bg-white/[0.04] text-amber-500"
            />
            <span className="text-sm text-slate-300 leading-snug">
              Répartir les rencontres sur des jours fixes (ex. 2 jours / semaine, 2 matchs / jour, premier
              coup d&apos;envoi 20:00, écart 2 h entre créneaux).
            </span>
          </label>
          {schedEnabled && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Jours de match
              </p>
              <div className="flex flex-wrap gap-2">
                {CALENDAR_WEEKDAYS.map(({ value, label }) => {
                  const on = schedWeekdays.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleSchedWeekday(value)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                        on
                          ? 'border-amber-400/50 bg-amber-400/15 text-amber-200'
                          : 'border-white/10 bg-white/[0.03] text-slate-500 hover:border-white/20'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {schedWeekdays.length === 0 ? (
                <p className="mt-2 text-xs text-amber-400/80">Sélectionnez au moins un jour.</p>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* ── Competition cards ── */}
      {competitions.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-amber-400/10 rounded-2xl bg-gradient-to-b from-white/[0.01] to-transparent">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-slate-700" />
          </div>
          <p className="text-slate-500 text-sm font-medium">Aucune compétition pour le moment.</p>
          <p className="text-slate-600 text-xs mt-1">Cliquez sur "Nouvelle Compétition" pour commencer.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {competitions.map((comp) => {
            const statusCfg = STATUS_CONFIG[comp.status] ?? STATUS_CONFIG.DRAFT;
            const isDraft = comp.status === 'DRAFT';
            const isGenerating = generating === comp.id;
            const isConfirmingDelete = confirmDelete === comp.id;
            const isDeleting = deleting === comp.id;

            return (
              <div
                key={comp.id}
                className="group relative flex flex-col rounded-2xl border border-amber-400/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent hover:border-amber-400/20 transition-all duration-300 hover:shadow-lg hover:shadow-amber-400/[0.04] overflow-hidden"
              >
                {/* Type stripe */}
                <div className={`h-1 w-full bg-gradient-to-r ${getCompTypeConfig(comp.type).stripe}`} />

                <div className="p-5 flex flex-col flex-1">
                  {/* Top row: badge + status */}
                  <div className="flex items-center justify-between mb-3">
                    {(() => {
                      const tcfg = getCompTypeConfig(comp.type);
                      const TIcon = tcfg.Icon;
                      return (
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg ${tcfg.bg} ${tcfg.color} border ${tcfg.border}`}>
                          <TIcon className="w-3 h-3" />
                          {tcfg.label}
                        </span>
                      );
                    })()}
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-lg border ${statusCfg.bg} ${statusCfg.border} ${statusCfg.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} animate-pulse`} />
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Name */}
                  <h3 className="text-base font-bold text-white mb-2 truncate">{comp.name}</h3>

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
                    {comp._count?.matches !== undefined && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {comp._count.matches} match{comp._count.matches !== 1 ? 's' : ''}
                      </span>
                    )}
                    {comp.teams && (
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        {comp.teams.length} équipe{comp.teams.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Team avatars */}
                  {comp.teams && comp.teams.length > 0 && (
                    <div className="flex items-center gap-1 mb-4">
                      {comp.teams.slice(0, 5).map((ct) => (
                        <div key={ct.team_id} className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[9px] font-bold text-slate-400 uppercase" title={ct.team.name}>
                          {ct.team.name.slice(0, 2)}
                        </div>
                      ))}
                      {comp.teams.length > 5 && (
                        <div className="w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/15 flex items-center justify-center text-[9px] font-bold text-amber-400">
                          +{comp.teams.length - 5}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                    <span className="text-[11px] font-medium text-slate-500">État du Marché</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={comp.isTransferMarketOpen === true}
                      aria-label="Marché des transferts ouvert ou fermé"
                      disabled={patchingMarketId === comp.id}
                      onClick={() => void toggleTransferMarket(comp)}
                      className={`relative h-6 w-10 shrink-0 rounded-full border transition-colors duration-200 ${
                        comp.isTransferMarketOpen === true
                          ? 'border-white/15 bg-white/[0.08]'
                          : 'border-white/10 bg-white/[0.03]'
                      } disabled:opacity-50`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white/90 shadow-sm transition-transform duration-200 ${
                          comp.isTransferMarketOpen === true ? 'translate-x-[18px]' : 'translate-x-0'
                        }`}
                        aria-hidden
                      />
                    </button>
                  </div>

                  <div className="mt-auto pt-3 border-t border-white/[0.04] flex items-center gap-2 flex-wrap">
                    {/* LEAGUE: Generate calendar */}
                    {isDraft && comp.type === 'LEAGUE' && (
                      <button
                        onClick={() => void handleGenerate(comp.id, comp.type)}
                        disabled={
                          isGenerating || (schedEnabled && schedWeekdays.length === 0)
                        }
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-400 to-amber-500 text-[#020617] hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 transition-all duration-300 shadow-md shadow-amber-400/20 hover:shadow-amber-400/40 hover:scale-[1.02] active:scale-[0.97]"
                      >
                        {isGenerating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        Générer le Calendrier
                      </button>
                    )}

                    {/* CUP / CHAMPIONS: Draw system */}
                    {isDraft && (comp.type === 'CUP' || comp.type === 'CHAMPIONS') && (
                      <button
                        onClick={() => navigate(`/admin/competitions/${comp.id}/draw`)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-400 hover:to-blue-400 transition-all duration-300 shadow-md shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.97]"
                      >
                        <Shuffle className="w-3.5 h-3.5" />
                        Tirage au Sort
                      </button>
                    )}

                    {isDraft &&
                      comp.type === 'CUP' &&
                      (comp._count?.matches ?? 0) === 0 &&
                      comp.teams.length >= 2 &&
                      (!comp.cup_scenario || comp.cup_scenario === 'SINGLE_ELIMINATION') && (
                        <button
                          type="button"
                          onClick={() => void handleGenerateBracket(comp)}
                          disabled={generatingBracketId === comp.id}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 transition-all duration-300 shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.97]"
                        >
                          {generatingBracketId === comp.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Network className="w-3.5 h-3.5" />
                          )}
                          Générer l&apos;arbre KO
                        </button>
                      )}

                    {comp.status === 'ONGOING' &&
                      (comp.type === 'CHAMPIONS' ||
                        (comp.type === 'CUP' && comp.cup_scenario === 'GROUPS_AND_KNOCKOUT')) && (
                        <button
                          type="button"
                          onClick={() => void openKnockoutModal(comp)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-500 to-orange-600 text-white hover:from-rose-400 hover:to-orange-500 transition-all duration-300 shadow-md shadow-rose-500/20 hover:shadow-rose-500/40 hover:scale-[1.02] active:scale-[0.97]"
                        >
                          <GitBranch className="w-3.5 h-3.5" />
                          Générer la Phase Finale
                        </button>
                      )}

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(comp.id)}
                      disabled={isDeleting}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-300 active:scale-[0.95] ${
                        isConfirmingDelete
                          ? 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 flex-1'
                          : 'border border-white/[0.06] text-slate-500 hover:text-red-400 hover:border-red-400/20 hover:bg-red-400/5'
                      }`}
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      {isConfirmingDelete ? 'Confirmer la suppression' : !isDraft ? 'Supprimer' : ''}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Creation Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          <div
            ref={modalRef}
            className="relative w-full max-w-lg bg-[#0a0f1e] border border-amber-400/15 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-[slideUp_0.3s_ease-out]"
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-400/10 bg-gradient-to-r from-amber-400/[0.03] to-transparent">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                Nouvelle Compétition
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all duration-200 hover:rotate-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5">
              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Nom de la compétition
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ex : OMJEP Pro League S1"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-amber-400/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400/30 focus:ring-1 focus:ring-amber-400/20 transition-all duration-200"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Format de compétition
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['LEAGUE', 'CUP', 'CHAMPIONS'] as const).map((t) => {
                    const cfg = COMPETITION_TYPE_CONFIG[t];
                    const TypeIcon = cfg.Icon;
                    const isActive = type === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => { setType(t); setSelectedTeams([]); }}
                        className={`relative px-3 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-300 overflow-hidden ${
                          isActive
                            ? `${cfg.border} ${cfg.bg} ${cfg.color} shadow-lg`
                            : 'border-white/[0.06] bg-white/[0.02] text-slate-500 hover:text-slate-300 hover:border-white/10 hover:bg-white/[0.04]'
                        }`}
                      >
                        <span className="flex flex-col items-center gap-1">
                          <TypeIcon className="w-4 h-4" />
                          <span className="text-[11px]">{cfg.label}</span>
                        </span>
                        {isActive && (
                          <span className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${cfg.stripe}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
                {type === 'CHAMPIONS' && (
                  <p className={`mt-1.5 text-[10px] ${COMPETITION_TYPE_CONFIG.CHAMPIONS.color}/70`}>
                    Groupes de 4 → élimination directe · Minimum 8 équipes (multiple de 4)
                  </p>
                )}
                {type === 'CUP' && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Scénario de coupe
                    </p>
                    <div className="grid gap-2">
                      {(
                        [
                          ['SINGLE_ELIMINATION', 'Élimination directe', 'Arbre à élimination simple (byes automatiques si besoin).'],
                          ['TWO_LEGGED_TIE', 'Aller-retour', 'Deux matchs par confrontation (calendrier manuel ou à venir).'],
                          ['GROUPS_AND_KNOCKOUT', 'Groupes + élimination', 'Phase de poules puis phase finale.'],
                        ] as const
                      ).map(([value, title, desc]) => (
                        <label
                          key={value}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                            cupScenario === value
                              ? 'border-amber-400/35 bg-amber-400/[0.06]'
                              : 'border-white/[0.06] bg-white/[0.02] hover:border-white/10'
                          }`}
                        >
                          <input
                            type="radio"
                            name="cupScenario"
                            checked={cupScenario === value}
                            onChange={() => setCupScenario(value)}
                            className="mt-1 border-amber-400/40 bg-white/[0.04] text-amber-500"
                          />
                          <span>
                            <span className="block text-xs font-semibold text-slate-200">{title}</span>
                            <span className="block text-[10px] text-slate-500 mt-0.5 leading-snug">{desc}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-amber-400/10 text-sm text-white focus:outline-none focus:border-amber-400/30 focus:ring-1 focus:ring-amber-400/20 transition-all duration-200 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    min={startDate || undefined}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-amber-400/10 text-sm text-white focus:outline-none focus:border-amber-400/30 focus:ring-1 focus:ring-amber-400/20 transition-all duration-200 [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Team selector */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Équipes participantes
                  <span className={`ml-1.5 transition-colors duration-200 ${selectedTeams.length >= minTeams ? 'text-emerald-400' : 'text-amber-400/60'}`}>
                    ({selectedTeams.length} sélectionnée{selectedTeams.length !== 1 ? 's' : ''}{type === 'CHAMPIONS' ? ` · min ${minTeams}` : ''})
                  </span>
                </label>

                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                  <input
                    type="text"
                    value={teamSearch}
                    onChange={(e) => setTeamSearch(e.target.value)}
                    placeholder="Rechercher une équipe..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.04] border border-amber-400/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400/30 transition-all duration-200"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto rounded-xl border border-amber-400/10 bg-white/[0.02] divide-y divide-white/[0.03] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-amber-400/20">
                  {filteredTeams.length === 0 ? (
                    <p className="px-3 py-6 text-center text-xs text-slate-600">
                      Aucune équipe trouvée.
                    </p>
                  ) : (
                    filteredTeams.map((team) => {
                      const selected = selectedTeams.includes(team.id);
                      return (
                        <button
                          key={team.id}
                          type="button"
                          onClick={() => toggleTeam(team.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left text-xs transition-all duration-200 ${
                            selected
                              ? 'bg-amber-400/[0.06] text-amber-400'
                              : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                            selected
                              ? 'border-amber-400 bg-amber-400 scale-110'
                              : 'border-slate-700 bg-transparent hover:border-slate-600'
                          }`}>
                            {selected && (
                              <svg className="w-3 h-3 text-[#020617]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className="truncate font-medium">{team.name}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all duration-200 active:scale-[0.97]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting || selectedTeams.length < minTeams}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#020617] text-sm font-bold hover:from-amber-300 hover:to-amber-400 disabled:opacity-40 disabled:hover:from-amber-400 disabled:hover:to-amber-500 transition-all duration-300 shadow-lg shadow-amber-400/20 hover:shadow-amber-400/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Créer la Compétition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal phase finale (groupes → KO) ── */}
      {knockoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              if (!knockoutPromoting) {
                setKnockoutModal(null);
                setKnockoutPreview(null);
              }
            }}
          />
          <div className="relative w-full max-w-lg bg-[#0a0f1e] border border-rose-400/20 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-rose-400/10 bg-gradient-to-r from-rose-400/[0.05] to-transparent shrink-0">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 pr-4">
                <GitBranch className="w-5 h-5 text-rose-400 shrink-0" />
                <span className="truncate">Phase finale — {knockoutModal.name}</span>
              </h2>
              <button
                type="button"
                disabled={knockoutPromoting}
                onClick={() => {
                  setKnockoutModal(null);
                  setKnockoutPreview(null);
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 flex-1 min-h-0">
              {knockoutLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
                </div>
              ) : knockoutPreview ? (
                <>
                  {knockoutPreview.firstRoundName && (
                    <p className="text-xs text-slate-500">
                      Premier tour d&apos;élimination :{' '}
                      <span className="text-rose-400/90 font-semibold">{knockoutPreview.firstRoundName}</span>
                    </p>
                  )}
                  {!knockoutPreview.canPromote && knockoutPreview.reason && (
                    <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-sm text-amber-200/90">
                      {knockoutPreview.reason}
                    </div>
                  )}
                  {knockoutPreview.groupsSummary && knockoutPreview.groupsSummary.length > 0 && (
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] text-slate-500 space-y-1">
                      <p className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Qualifiés par groupe</p>
                      {knockoutPreview.groupsSummary.map((g) => (
                        <div key={g.letter}>
                          Grp. {g.letter} : 1er {g.first} · 2e {g.second}
                        </div>
                      ))}
                    </div>
                  )}
                  {knockoutPreview.pairings.length > 0 && (
                    <ul className="space-y-2">
                      {knockoutPreview.pairings.map((p, i) => (
                        <li
                          key={`${p.label}-${i}`}
                          className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm"
                        >
                          <div className="text-slate-200">
                            <span className="font-semibold text-white">{p.home.name}</span>
                            <span className="text-slate-500 mx-2">vs</span>
                            <span className="font-semibold text-white">{p.away.name}</span>
                          </div>
                          <span className="block text-[10px] text-slate-500 mt-1 font-mono">{p.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : null}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/[0.06] shrink-0">
              <button
                type="button"
                disabled={knockoutPromoting}
                onClick={() => {
                  setKnockoutModal(null);
                  setKnockoutPreview(null);
                }}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!knockoutPreview?.canPromote || knockoutPromoting}
                onClick={() => void confirmKnockoutPhase()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-rose-500 to-orange-600 text-white hover:from-rose-400 hover:to-orange-500 disabled:opacity-40 disabled:pointer-events-none"
              >
                {knockoutPromoting && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmer et créer les matchs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Keyframe animations (injected once) ── */}
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
