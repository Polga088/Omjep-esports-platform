import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Shield, Loader2, Search, AlertCircle, Trash2, Pencil, X, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface TeamRow {
  id: string;
  name: string
  description?: string | null
  logo_url?: string | null;
  platform?: string
  primaryColor?: string | null
  secondaryColor?: string | null
  proclubs_url?: string | null
  budget?: number
  prestige_level?: number
  validation_status?: 'PENDING' | 'APPROVED' | 'REJECTED'
  created_at: string
  _count?: { members: number }
}

type EditClubForm = {
  name: string
  description: string
  platform: 'CROSSPLAY' | 'PS5' | 'XBOX' | 'PC'
  primaryColor: string
  secondaryColor: string
  proclubs_url: string
  budget: string
  prestige_level: string
  validation_status: 'PENDING' | 'APPROVED' | 'REJECTED'
}

const PLATFORM_OPTIONS: EditClubForm['platform'][] = ['CROSSPLAY', 'PS5', 'XBOX', 'PC']
const VALIDATION_OPTIONS: EditClubForm['validation_status'][] = ['PENDING', 'APPROVED', 'REJECTED']
const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024

export default function AdminClubs() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<EditClubForm['platform'] | ''>('')
  const [validationFilter, setValidationFilter] = useState<EditClubForm['validation_status'] | ''>('')
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingClub, setEditingClub] = useState<TeamRow | null>(null)
  const [editForm, setEditForm] = useState<EditClubForm | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const loadTeams = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/teams');
      const list = data?.data ?? data;
      setTeams(Array.isArray(list) ? list : []);
    } catch {
      setError('Impossible de charger les clubs.');
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm('Êtes-vous sûr ?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/clubs/${id}`);
      toast.success(`Club « ${name} » supprimé.`);
      await loadTeams();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : msg;
      toast.error(typeof text === 'string' ? text : 'Suppression impossible.');
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (club: TeamRow) => {
    setEditingClub(club)
    setEditForm({
      name: club.name ?? '',
      description: club.description ?? '',
      platform: (club.platform as EditClubForm['platform']) ?? 'CROSSPLAY',
      primaryColor: club.primaryColor ?? '#5B21B6',
      secondaryColor: club.secondaryColor ?? '#F59E0B',
      proclubs_url: club.proclubs_url ?? '',
      budget: String(club.budget ?? 0),
      prestige_level: String(club.prestige_level ?? 1),
      validation_status: club.validation_status ?? 'PENDING',
    })
    setLogoPreview(club.logo_url ?? null)
    setLogoFile(null)
  }

  const closeEditModal = () => {
    if (savingEdit) return
    setEditingClub(null)
    setEditForm(null)
    setLogoPreview(null)
    setLogoFile(null)
  }

  const handleLogoSelection = (file: File | null) => {
    if (!file) return
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      toast.error('Format invalide. Utilisez PNG, JPG, JPEG ou WebP.')
      return
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      toast.error('Logo trop volumineux. Maximum autorisé: 2MB.')
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleUploadLogo = async () => {
    if (!editingClub || !logoFile) return
    setUploadingLogo(true)
    try {
      const form = new FormData()
      form.append('file', logoFile)
      await api.post(`/admin/clubs/${editingClub.id}/logo`, form)
      toast.success('Logo du club mis à jour.')
      await loadTeams()
      setLogoFile(null)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message
      const text = Array.isArray(msg) ? msg.join(', ') : msg
      toast.error(typeof text === 'string' ? text : 'Mise à jour du logo impossible.')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingClub || !editForm) return
    setSavingEdit(true)
    try {
      await api.patch(`/admin/clubs/${editingClub.id}`, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || '',
        platform: editForm.platform,
        primaryColor: editForm.primaryColor,
        secondaryColor: editForm.secondaryColor,
        proclubs_url: editForm.proclubs_url.trim() || '',
        budget: Number(editForm.budget),
        prestige_level: Number(editForm.prestige_level),
        validation_status: editForm.validation_status,
      })
      toast.success(`Club « ${editForm.name} » mis à jour.`)
      closeEditModal()
      await loadTeams()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message
      const text = Array.isArray(msg) ? msg.join(', ') : msg
      toast.error(typeof text === 'string' ? text : 'Mise à jour impossible.')
    } finally {
      setSavingEdit(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teams.filter((t) => {
      if (platformFilter && t.platform !== platformFilter) return false
      if (validationFilter && t.validation_status !== validationFilter) return false
      if (!q) return true
      return t.name.toLowerCase().includes(q)
    })
  }, [teams, search, platformFilter, validationFilter]);

  const getValidationBadge = (status?: TeamRow['validation_status']) => {
    if (status === 'APPROVED') return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
    if (status === 'REJECTED') return 'bg-red-500/10 border-red-500/20 text-red-400'
    return 'bg-amber-500/10 border-amber-500/20 text-amber-400'
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        <p className="text-sm text-slate-500">Chargement des clubs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 flex items-center justify-center border border-amber-400/20">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          Clubs
        </h1>
        <p className="text-sm text-slate-500 mt-1 ml-[52px]">
          Gérez les clubs, leur validation et leurs informations principales.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un club…"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400/30"
          />
        </div>
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter((e.target.value as EditClubForm['platform']) || '')}
          className="rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white min-w-[160px]"
        >
          <option value="">Toutes plateformes</option>
          {PLATFORM_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          value={validationFilter}
          onChange={(e) =>
            setValidationFilter((e.target.value as EditClubForm['validation_status']) || '')
          }
          className="rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white min-w-[170px]"
        >
          <option value="">Tous statuts</option>
          {VALIDATION_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-white/[0.06] overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Club
              </th>
              <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Plateforme
              </th>
              <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Membres
              </th>
              <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Validation
              </th>
              <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Créé le
              </th>
              <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <p className="text-sm text-slate-400 font-medium">Aucun club trouvé</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Ajustez la recherche ou les filtres pour afficher des résultats.
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                        {t.logo_url ? (
                          <img src={t.logo_url} alt="" className="w-7 h-7 rounded object-cover" />
                        ) : (
                          t.name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <span className="font-medium text-white truncate">{t.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-400 text-xs">{t.platform ?? '—'}</td>
                  <td className="px-3 py-3 text-right text-slate-300 tabular-nums">
                    {t._count?.members ?? '—'}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center rounded-lg border px-2 py-1 text-[10px] font-semibold ${getValidationBadge(
                        t.validation_status,
                      )}`}
                    >
                      {t.validation_status ?? 'PENDING'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-500 text-xs tabular-nums">
                    {t.created_at ? new Date(t.created_at).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(t)}
                        disabled={deletingId === t.id}
                        className="inline-flex items-center justify-center p-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:border-amber-400/40 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                        title="Modifier le club"
                        aria-label={`Modifier ${t.name}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id, t.name)}
                        disabled={deletingId === t.id}
                        className="inline-flex items-center justify-center p-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-400/40 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                        title="Supprimer le club"
                        aria-label={`Supprimer ${t.name}`}
                      >
                        {deletingId === t.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingClub && editForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-2xl rounded-2xl border border-white/[0.08] bg-[#0f141c]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
              <h2 className="text-base font-semibold text-white">Modifier le club</h2>
              <button
                type="button"
                onClick={closeEditModal}
                className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.06]"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Logo actuel</label>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center overflow-hidden">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Club logo preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-slate-500">No logo</span>
                    )}
                  </div>
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-slate-300 hover:bg-white/[0.05] cursor-pointer">
                    <ImagePlus className="w-4 h-4" />
                    Choisir une image
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(e) => handleLogoSelection(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleUploadLogo}
                    disabled={!logoFile || uploadingLogo}
                    className="px-3 py-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-40 inline-flex items-center gap-2"
                  >
                    {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Mettre à jour le logo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Nom</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                    required
                    className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Plateforme</label>
                  <select
                    value={editForm.platform}
                    onChange={(e) =>
                      setEditForm((prev) =>
                        prev ? { ...prev, platform: e.target.value as EditClubForm['platform'] } : prev,
                      )
                    }
                    className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/40"
                  >
                    {PLATFORM_OPTIONS.map((option) => (
                      <option key={option} value={option} className="bg-slate-900">
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((prev) => (prev ? { ...prev, description: e.target.value } : prev))
                  }
                  rows={4}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/40"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Couleur principale</label>
                  <input
                    type="color"
                    value={editForm.primaryColor}
                    onChange={(e) =>
                      setEditForm((prev) => (prev ? { ...prev, primaryColor: e.target.value } : prev))
                    }
                    className="w-full h-11 rounded-xl bg-white/[0.04] border border-white/10 px-2 py-2"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Couleur secondaire</label>
                  <input
                    type="color"
                    value={editForm.secondaryColor}
                    onChange={(e) =>
                      setEditForm((prev) => (prev ? { ...prev, secondaryColor: e.target.value } : prev))
                    }
                    className="w-full h-11 rounded-xl bg-white/[0.04] border border-white/10 px-2 py-2"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Lien Pro Clubs</label>
                <input
                  type="url"
                  value={editForm.proclubs_url}
                  onChange={(e) =>
                    setEditForm((prev) => (prev ? { ...prev, proclubs_url: e.target.value } : prev))
                  }
                  className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/40"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Budget</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.budget}
                    onChange={(e) =>
                      setEditForm((prev) => (prev ? { ...prev, budget: e.target.value } : prev))
                    }
                    className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Prestige</label>
                  <input
                    type="number"
                    min={1}
                    value={editForm.prestige_level}
                    onChange={(e) =>
                      setEditForm((prev) => (prev ? { ...prev, prestige_level: e.target.value } : prev))
                    }
                    className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Validation</label>
                  <select
                    value={editForm.validation_status}
                    onChange={(e) =>
                      setEditForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              validation_status: e.target.value as EditClubForm['validation_status'],
                            }
                          : prev,
                      )
                    }
                    className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/40"
                  >
                    {VALIDATION_OPTIONS.map((status) => (
                      <option key={status} value={status} className="bg-slate-900">
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-lg border border-white/10 text-slate-300 hover:bg-white/[0.05] disabled:opacity-40"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-lg border border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/20 disabled:opacity-40 inline-flex items-center gap-2"
                >
                  {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
