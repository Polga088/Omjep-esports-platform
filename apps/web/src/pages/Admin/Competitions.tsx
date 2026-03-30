import { useEffect, useState, useRef } from 'react';
import {
  Trophy, Plus, Calendar, Loader2, X, Trash2,
  CheckCircle2, AlertCircle, Sparkles, Search, Shield, Swords,
} from 'lucide-react';
import api from '@/lib/api';

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
  type: 'LEAGUE' | 'CUP';
  start_date: string | null;
  end_date: string | null;
  status: 'DRAFT' | 'ONGOING' | 'FINISHED';
  created_at: string;
  teams: CompetitionTeam[];
  _count?: { matches: number };
}

type CompetitionType = 'LEAGUE' | 'CUP';

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
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<CompetitionType>('LEAGUE');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
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
      setCompetitions(Array.isArray(compsData) ? compsData : []);
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
    setSelectedTeams([]);
    setTeamSearch('');
    setError('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTeams.length < 2) {
      setError('Sélectionnez au moins 2 équipes.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await api.post('/admin/competitions', {
        name,
        type,
        team_ids: selectedTeams,
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

  const handleGenerate = async (competitionId: string) => {
    setGenerating(competitionId);
    try {
      const res = await api.post(`/admin/competitions/${competitionId}/generate-calendar`);
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
                <div className={`h-1 w-full ${comp.type === 'LEAGUE' ? 'bg-gradient-to-r from-amber-400/60 to-amber-600/20' : 'bg-gradient-to-r from-purple-400/60 to-purple-600/20'}`} />

                <div className="p-5 flex flex-col flex-1">
                  {/* Top row: badge + status */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                      comp.type === 'LEAGUE'
                        ? 'bg-amber-400/10 text-amber-400 border border-amber-400/15'
                        : 'bg-purple-400/10 text-purple-400 border border-purple-400/15'
                    }`}>
                      {comp.type === 'LEAGUE' ? <Shield className="w-3 h-3" /> : <Swords className="w-3 h-3" />}
                      {comp.type === 'LEAGUE' ? 'Ligue' : 'Coupe'}
                    </span>
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

                  <div className="mt-auto pt-3 border-t border-white/[0.04] flex items-center gap-2">
                    {/* Generate Calendar — only for DRAFT */}
                    {isDraft && (
                      <button
                        onClick={() => handleGenerate(comp.id)}
                        disabled={isGenerating}
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
                  Type de compétition
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['LEAGUE', 'CUP'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`relative px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-300 overflow-hidden ${
                        type === t
                          ? t === 'LEAGUE'
                            ? 'border-amber-400/40 bg-amber-400/10 text-amber-400 shadow-lg shadow-amber-400/10'
                            : 'border-purple-400/40 bg-purple-400/10 text-purple-400 shadow-lg shadow-purple-400/10'
                          : 'border-white/[0.06] bg-white/[0.02] text-slate-500 hover:text-slate-300 hover:border-white/10 hover:bg-white/[0.04]'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        {t === 'LEAGUE' ? <Shield className="w-4 h-4" /> : <Swords className="w-4 h-4" />}
                        {t === 'LEAGUE' ? 'Ligue' : 'Coupe'}
                      </span>
                      {type === t && (
                        <span className={`absolute bottom-0 left-0 right-0 h-0.5 ${t === 'LEAGUE' ? 'bg-amber-400' : 'bg-purple-400'}`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Team selector */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Équipes participantes
                  <span className={`ml-1.5 transition-colors duration-200 ${selectedTeams.length >= 2 ? 'text-emerald-400' : 'text-amber-400/60'}`}>
                    ({selectedTeams.length} sélectionnée{selectedTeams.length !== 1 ? 's' : ''})
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
                  disabled={submitting || selectedTeams.length < 2}
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
