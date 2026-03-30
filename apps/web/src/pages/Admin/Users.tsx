import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, Loader2, Search, CheckCircle2, AlertCircle, ListChecks } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

type Role = 'ADMIN' | 'MODERATOR' | 'MANAGER' | 'PLAYER';

interface AdminUserRow {
  id: string;
  email: string;
  role: Role;
  ea_persona_name: string | null;
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
              {ROLES.map((r) => (
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
        <table className="w-full text-sm min-w-[720px]">
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
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center text-slate-500">
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
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-slate-500 tabular-nums text-xs">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'}
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
