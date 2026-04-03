import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  Loader2,
  Search,
  CheckCircle2,
  AlertCircle,
  ListChecks,
  Trash2,
  X,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { calculateLevel } from '@/lib/leveling';
import { useAuthStore } from '@/store/useAuthStore';

type Role = 'ADMIN' | 'MODERATOR' | 'MANAGER' | 'PLAYER';

interface AdminUserRow {
  id: string;
  email: string;
  role: Role;
  ea_persona_name: string | null;
  xp?: number;
  level?: number;
  created_at: string;
}

const ROLES: Role[] = ['ADMIN', 'MODERATOR', 'MANAGER', 'PLAYER'];

export default function AdminUsers() {
  const { user: me } = useAuthStore();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState<Role>('PLAYER');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [rowSaving, setRowSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userToDelete, setUserToDelete] = useState<AdminUserRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<AdminUserRow | null>(null);
  const [editForm, setEditForm] = useState({
    email: '',
    ea_persona_name: '',
    xp: '0',
    role: 'PLAYER' as Role,
    newPassword: '',
    confirmPassword: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/users');
      const list = data?.data ?? data;
      setUsers(Array.isArray(list) ? list : []);
    } catch {
      setError('Impossible de charger les utilisateurs.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const assignableRoles = useMemo(
    () => (me?.role === 'ADMIN' ? ROLES : ROLES.filter((r) => r !== 'MANAGER')),
    [me?.role],
  );

  const roleOptionsForRow = useCallback(
    (current: Role) =>
      assignableRoles.includes(current) ? assignableRoles : [...assignableRoles, current],
    [assignableRoles],
  );

  useEffect(() => {
    setBulkRole((prev) => (assignableRoles.includes(prev) ? prev : 'PLAYER'));
  }, [assignableRoles]);

  useEffect(() => {
    if (!userToDelete) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserToDelete(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [userToDelete]);

  useEffect(() => {
    if (!editTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditTarget(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editTarget]);

  const openEditModal = (u: AdminUserRow) => {
    setEditTarget(u);
    setEditForm({
      email: u.email,
      ea_persona_name: u.ea_persona_name ?? '',
      xp: String(u.xp ?? 0),
      role: u.role,
      newPassword: '',
      confirmPassword: '',
    });
  };

  const saveEditModal = async () => {
    if (!editTarget) return;
    const email = editForm.email.trim();
    if (!email) {
      toast.error('L’email est requis.');
      return;
    }
    const xpNum = Number.parseInt(editForm.xp, 10);
    if (!Number.isFinite(xpNum) || xpNum < 0) {
      toast.error('Points XP invalides (entier ≥ 0).');
      return;
    }
    if (editTarget.id === me?.id && editForm.role !== 'ADMIN') {
      toast.error('Vous ne pouvez pas retirer votre propre rôle ADMIN.');
      return;
    }
    const pw = editForm.newPassword.trim();
    const pw2 = editForm.confirmPassword.trim();
    if (pw || pw2) {
      if (pw.length < 8) {
        toast.error('Le mot de passe doit contenir au moins 8 caractères.');
        return;
      }
      if (pw !== pw2) {
        toast.error('Les mots de passe ne correspondent pas.');
        return;
      }
    }
    setSavingEdit(true);
    try {
      const payload: Record<string, unknown> = {
        email,
        ea_persona_name: editForm.ea_persona_name.trim(),
        xp: xpNum,
        role: editForm.role,
      };
      if (pw) payload.password = pw;
      const { data } = await api.patch(`/users/${editTarget.id}`, payload);
      const updated = (data?.data ?? data) as AdminUserRow & { level?: number };
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editTarget.id
            ? {
                ...u,
                email: updated.email,
                ea_persona_name: updated.ea_persona_name ?? null,
                role: updated.role as Role,
                xp: updated.xp,
                level: updated.level,
              }
            : u,
        ),
      );
      toast.success('Profil mis à jour.');
      setEditTarget(null);
    } catch (e: unknown) {
      const raw = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message;
      const text = Array.isArray(raw) ? raw.join(', ') : raw;
      toast.error(typeof text === 'string' ? text : 'Mise à jour impossible.');
    } finally {
      setSavingEdit(false);
    }
  };

  const xpPreview = Number.parseInt(editForm.xp, 10);
  const previewLevel =
    Number.isFinite(xpPreview) && xpPreview >= 0 ? calculateLevel(xpPreview) : null;

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setDeletingId(userToDelete.id);
    try {
      await api.delete(`/users/${userToDelete.id}`);
      toast.success('Utilisateur supprimé.');
      const removedId = userToDelete.id;
      setUsers((prev) => prev.filter((u) => u.id !== removedId));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(removedId);
        return next;
      });
      setUserToDelete(null);
    } catch (e: unknown) {
      const raw = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message;
      const text = Array.isArray(raw) ? raw.join(', ') : raw;
      toast.error(typeof text === 'string' ? text : 'Suppression impossible.');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        (u.ea_persona_name ?? '').toLowerCase().includes(q)
      );
    });
  }, [users, search, roleFilter]);

  const toggleSelect = (id: string) => {
    if (id === me?.id) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const selectable = filtered.filter((u) => u.id !== me?.id).map((u) => u.id);
    const allOn = selectable.length > 0 && selectable.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOn) selectable.forEach((id) => next.delete(id));
      else selectable.forEach((id) => next.add(id));
      return next;
    });
  };

  const patchRole = async (id: string, role: Role) => {
    if (id === me?.id && role !== 'ADMIN') {
      setError('Vous ne pouvez pas retirer votre propre rôle ADMIN.');
      return;
    }
    setRowSaving(id);
    setError('');
    try {
      await api.patch(`/users/${id}`, { role });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
      setSuccess('Rôle mis à jour.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Mise à jour impossible.');
    } finally {
      setRowSaving(null);
    }
  };

  const applyBulkRole = async () => {
    const ids = [...selectedIds].filter((id) => id !== me?.id);
    if (ids.length === 0) return;
    setBulkSaving(true);
    setError('');
    try {
      for (const id of ids) {
        await api.patch(`/users/${id}`, { role: bulkRole });
      }
      setUsers((prev) => prev.map((u) => (ids.includes(u.id) ? { ...u, role: bulkRole } : u)));
      setSelectedIds(new Set());
      setSuccess(`Rôle « ${bulkRole} » appliqué à ${ids.length} compte(s).`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Action groupée échouée.');
    } finally {
      setBulkSaving(false);
    }
  };

  const selectableFiltered = filtered.filter((u) => u.id !== me?.id);
  const allSelected =
    selectableFiltered.length > 0 && selectableFiltered.every((u) => selectedIds.has(u.id));
  const someSelected = selectableFiltered.some((u) => selectedIds.has(u.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Fermer"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setUserToDelete(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0B0D13]/90 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="px-6 py-4 border-b border-white/5 flex items-start justify-between gap-3">
              <div>
                <h2 id="delete-user-title" className="text-lg font-bold text-white">
                  Supprimer l&apos;utilisateur ?
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Cette action est définitive. Les données liées (équipes, stats…) seront supprimées ou
                  détachées selon les règles du système.
                </p>
                <p className="text-sm text-amber-400/90 mt-3 font-medium truncate" title={userToDelete.email}>
                  {userToDelete.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-4 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                disabled={!!deletingId}
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 border border-white/10 hover:bg-white/5 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!!deletingId}
                onClick={() => void confirmDeleteUser()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-500/90 text-white hover:bg-red-500 disabled:opacity-50"
              >
                {deletingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Fermer"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !savingEdit && setEditTarget(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-title"
            className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a0d14]/95 backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="px-6 py-4 border-b border-white/5 flex items-start justify-between gap-3">
              <div>
                <h2 id="edit-user-title" className="text-lg font-bold text-white">
                  Édition admin
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Corrigez le profil, l’XP (le niveau est recalculé côté serveur) et le rôle.
                </p>
                <p
                  className="text-xs text-slate-600 mt-2 font-mono truncate max-w-[280px] sm:max-w-md"
                  title={editTarget.email}
                >
                  ID : {editTarget.id}
                </p>
              </div>
              <button
                type="button"
                disabled={savingEdit}
                onClick={() => setEditTarget(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 shrink-0 disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Pseudo EA (Persona)
                </span>
                <input
                  type="text"
                  value={editForm.ea_persona_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, ea_persona_name: e.target.value }))}
                  placeholder="Persona EA"
                  className="mt-1.5 w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400/30"
                />
                <span className="text-[11px] text-slate-600 mt-1 block">
                  Laisser vide pour retirer le persona.
                </span>
              </label>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Email
                </span>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/30"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Points XP
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={editForm.xp}
                  onChange={(e) => setEditForm((f) => ({ ...f, xp: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white tabular-nums focus:outline-none focus:border-amber-400/30"
                />
                {previewLevel !== null && (
                  <span className="text-[11px] text-amber-500/90 mt-1.5 block">
                    Niveau correspondant (formule) : {previewLevel}
                    {editTarget.level !== undefined && editTarget.xp !== undefined
                      ? ` — actuellement niveau ${editTarget.level} (${editTarget.xp} XP)`
                      : ''}
                  </span>
                )}
              </label>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Rôle
                </span>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as Role }))}
                  className="mt-1.5 w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/30"
                >
                  {roleOptionsForRow(editForm.role).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Mot de passe (optionnel)
                </p>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={editForm.newPassword}
                  onChange={(e) => setEditForm((f) => ({ ...f, newPassword: e.target.value }))}
                  placeholder="Nouveau mot de passe (min. 8 caractères)"
                  className="w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400/30"
                />
                <input
                  type="password"
                  autoComplete="new-password"
                  value={editForm.confirmPassword}
                  onChange={(e) => setEditForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="Confirmer le mot de passe"
                  className="w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400/30"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-white/5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                disabled={savingEdit}
                onClick={() => setEditTarget(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 border border-white/10 hover:bg-white/5 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={savingEdit}
                onClick={() => void saveEditModal()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-400 to-amber-600 text-[#020617] hover:opacity-95 disabled:opacity-40"
              >
                {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 flex items-center justify-center border border-amber-400/20">
            <Users className="w-5 h-5 text-amber-400" />
          </div>
          Utilisateurs
        </h1>
        <p className="text-sm text-slate-500 mt-1 ml-[52px]">
          Recherche, filtre par rôle, modification unitaire ou en masse (ADMIN uniquement côté API).
        </p>
      </div>

      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-stretch sm:items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Email, pseudo EA…"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400/30"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter((e.target.value as Role | '') || '')}
          className="rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white min-w-[160px]"
        >
          <option value="">Tous les rôles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={bulkRole}
              onChange={(e) => setBulkRole(e.target.value as Role)}
              className="rounded-xl bg-white/[0.04] border border-amber-400/20 px-3 py-2.5 text-sm text-white"
            >
              {assignableRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={bulkSaving}
              onClick={() => void applyBulkRole()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-[#020617] text-sm font-bold disabled:opacity-40"
            >
              {bulkSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListChecks className="w-4 h-4" />}
              Appliquer à {selectedIds.size}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/[0.06] overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="text-left px-3 py-3 w-10">
                <input
                  type="checkbox"
                  title="Tout sélectionner"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = !allSelected && someSelected;
                  }}
                  onChange={toggleSelectAll}
                  disabled={selectableFiltered.length === 0}
                  className="rounded border-amber-400/40 bg-white/[0.04] text-amber-500"
                />
              </th>
              <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Email
              </th>
              <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Persona
              </th>
              <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Rôle
              </th>
              <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Inscription
              </th>
              <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 w-[128px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-slate-500">
                  Aucun utilisateur ne correspond aux critères.
                </td>
              </tr>
            ) : (
              filtered.map((u) => {
                const isSelf = u.id === me?.id;
                return (
                  <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-3 py-3 align-middle">
                      <input
                        type="checkbox"
                        disabled={isSelf}
                        checked={selectedIds.has(u.id)}
                        onChange={() => toggleSelect(u.id)}
                        className="rounded border-amber-400/40 bg-white/[0.04] text-amber-500 disabled:opacity-30"
                      />
                    </td>
                    <td className="px-3 py-3 text-slate-200 font-medium truncate max-w-[200px]">
                      {u.email}
                      {isSelf && (
                        <span className="ml-2 text-[10px] text-amber-500/80 font-normal">(vous)</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-400 truncate max-w-[140px]">
                      {u.ea_persona_name ?? '—'}
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={u.role}
                        disabled={rowSaving === u.id || isSelf}
                        onChange={(e) => void patchRole(u.id, e.target.value as Role)}
                        className="rounded-lg bg-white/[0.04] border border-white/10 px-2 py-1.5 text-xs text-white disabled:opacity-50"
                        title={isSelf ? 'Modifiez votre rôle via un autre compte admin' : undefined}
                      >
                        {roleOptionsForRow(u.role).map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-slate-500 tabular-nums text-xs">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-3 py-3 text-right align-middle">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title="Éditer le profil"
                          disabled={savingEdit && editTarget?.id === u.id}
                          onClick={() => openEditModal(u)}
                          className="inline-flex items-center justify-center p-2 rounded-lg border border-amber-400/25 text-amber-400/90 hover:bg-amber-400/10 hover:border-amber-400/45 disabled:opacity-40 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {isSelf ? (
                          <span
                            className="inline-flex items-center justify-center p-2 w-9 h-9 text-[10px] text-slate-600"
                            title="Vous ne pouvez pas supprimer votre propre compte ici"
                          >
                            —
                          </span>
                        ) : (
                          <button
                            type="button"
                            title={"Supprimer l'utilisateur"}
                            disabled={deletingId === u.id}
                            onClick={() => setUserToDelete(u)}
                            className="inline-flex items-center justify-center p-2 rounded-lg border border-red-500/20 text-red-400/90 hover:bg-red-500/10 hover:border-red-500/40 disabled:opacity-40 transition-colors"
                          >
                            {deletingId === u.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
