import { useEffect, useMemo, useState } from 'react';
import { Shield, Loader2, Search, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

interface TeamRow {
  id: string;
  name: string;
  logo_url?: string | null;
  platform?: string;
  created_at: string;
  _count?: { members: number };
}

export default function AdminClubs() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter((t) => t.name.toLowerCase().includes(q));
  }, [teams, search]);

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
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          Clubs
        </h1>
        <p className="text-sm text-slate-500 mt-1 ml-[52px]">
          Liste des équipes inscrites, effectifs (lecture). La gestion détaillée des membres se fait
          depuis les fiches équipe.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un club…"
          className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400/30"
        />
      </div>

      <div className="rounded-xl border border-white/[0.06] overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
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
                Créé le
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-16 text-center text-slate-500">
                  Aucun club trouvé.
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
                  <td className="px-3 py-3 text-slate-500 text-xs tabular-nums">
                    {t.created_at ? new Date(t.created_at).toLocaleDateString('fr-FR') : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
