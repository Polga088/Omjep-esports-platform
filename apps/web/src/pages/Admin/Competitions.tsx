import { useEffect, useState } from 'react';
import {
  Trophy, Plus, Calendar, Loader2, X,
  CheckCircle2, AlertCircle, Sparkles, Search,
} from 'lucide-react';
import api from '@/lib/api';

interface Team {
  id: string;
  name: string;
}

interface Competition {
  id: string;
  name: string;
  type: 'LEAGUE' | 'CUP';
  startDate: string;
  endDate: string;
  status: string;
  _count?: { matches: number };
}

type CompetitionType = 'LEAGUE' | 'CUP';

export default function AdminCompetitions() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<CompetitionType>('LEAGUE');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [teamSearch, setTeamSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compsRes, teamsRes] = await Promise.all([
        api.get('/admin/competitions'),
        api.get('/teams'),
      ]);
      setCompetitions(compsRes.data.data ?? compsRes.data);
      setTeams(teamsRes.data.data ?? teamsRes.data);
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
    setTeamSearch('');
    setError('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/admin/competitions', {
        name,
        type,
        startDate,
        endDate,
        teamIds: selectedTeams,
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

  const handleGenerate = async (competitionId: string) => {
    setGenerating(competitionId);
    try {
      await api.post(`/admin/competitions/${competitionId}/generate-calendar`);
      setSuccess('Calendrier des matchs généré !');
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
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Gestion des Compétitions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Créez et gérez les ligues et coupes du circuit.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); resetForm(); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-400 text-[#020617] text-sm font-semibold hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Ligue
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}
      {error && !showForm && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Competitions list */}
      {competitions.length === 0 ? (
        <div className="text-center py-16 border border-amber-400/10 rounded-xl bg-[#020617]">
          <Trophy className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Aucune compétition pour le moment.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {competitions.map((comp) => (
            <div
              key={comp.id}
              className="flex items-center justify-between px-5 py-4 rounded-xl border border-amber-400/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors group"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  comp.type === 'LEAGUE'
                    ? 'bg-amber-400/10 text-amber-400'
                    : 'bg-purple-400/10 text-purple-400'
                }`}>
                  <Trophy className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{comp.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      comp.type === 'LEAGUE'
                        ? 'bg-amber-400/10 text-amber-400/80'
                        : 'bg-purple-400/10 text-purple-400/80'
                    }`}>
                      {comp.type === 'LEAGUE' ? 'Ligue' : 'Coupe'}
                    </span>
                    <span className="text-xs text-slate-600 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(comp.startDate).toLocaleDateString('fr-FR')}
                    </span>
                    {comp._count?.matches !== undefined && (
                      <span className="text-xs text-slate-600">
                        {comp._count.matches} match{comp._count.matches !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleGenerate(comp.id)}
                disabled={generating === comp.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-amber-400/20 text-amber-400 hover:bg-amber-400/10 disabled:opacity-50 transition-all opacity-0 group-hover:opacity-100"
              >
                {generating === comp.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Générer les Matchs
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          <div className="relative w-full max-w-lg bg-[#0a0f1e] border border-amber-400/15 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-400/10">
              <h2 className="text-lg font-bold text-white">Nouvelle Compétition</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
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
                  placeholder="Ex : Eagles Pro League S1"
                  className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-amber-400/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400/30 focus:ring-1 focus:ring-amber-400/20 transition-all"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['LEAGUE', 'CUP'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                        type === t
                          ? 'border-amber-400/30 bg-amber-400/10 text-amber-400'
                          : 'border-white/5 bg-white/[0.02] text-slate-500 hover:text-slate-300 hover:border-white/10'
                      }`}
                    >
                      {t === 'LEAGUE' ? '🏆 Ligue' : '⚔️ Coupe'}
                    </button>
                  ))}
                </div>
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
                    className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-amber-400/10 text-sm text-white focus:outline-none focus:border-amber-400/30 focus:ring-1 focus:ring-amber-400/20 transition-all [color-scheme:dark]"
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
                    className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-amber-400/10 text-sm text-white focus:outline-none focus:border-amber-400/30 focus:ring-1 focus:ring-amber-400/20 transition-all [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Team selector */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Équipes participantes
                  <span className="text-amber-400/60 ml-1.5">
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
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-amber-400/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400/30 transition-all"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto rounded-lg border border-amber-400/10 bg-white/[0.02] divide-y divide-white/[0.03]">
                  {filteredTeams.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-slate-600">
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
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs transition-colors ${
                            selected
                              ? 'bg-amber-400/5 text-amber-400'
                              : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                            selected
                              ? 'border-amber-400 bg-amber-400'
                              : 'border-slate-700 bg-transparent'
                          }`}>
                            {selected && (
                              <svg className="w-2.5 h-2.5 text-[#020617]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className="truncate">{team.name}</span>
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
                  className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-400 text-[#020617] text-sm font-semibold hover:bg-amber-300 disabled:opacity-50 transition-colors shadow-lg shadow-amber-400/20"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Créer la Compétition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
