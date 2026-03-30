import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { Trophy, Loader2, CalendarPlus, BarChart3, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';

interface CompetitionRow {
  id: string;
  name: string;
  type: 'LEAGUE' | 'CUP';
  status: 'DRAFT' | 'ONGOING' | 'FINISHED';
  teams: { team: { id: string; name: string } }[];
  _count?: { matches: number };
}

const columnHelper = createColumnHelper<CompetitionRow>();

export default function LeagueCompetitions() {
  const [rows, setRows] = useState<CompetitionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generating, setGenerating] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/moderator/league/competitions');
      const data = res.data.data ?? res.data;
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setError('Impossible de charger les compétitions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const generateCalendar = async (id: string) => {
    setGenerating(id);
    setError('');
    try {
      const { data } = await api.post(`/moderator/league/competitions/${id}/generate-calendar`);
      setSuccess(data.message ?? 'Calendrier généré.');
      await load();
      setTimeout(() => setSuccess(''), 5000);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Échec de la génération.';
      setError(typeof msg === 'string' ? msg : 'Échec de la génération.');
    } finally {
      setGenerating(null);
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Compétition',
        cell: (info) => (
          <span className="font-medium text-white">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        cell: (info) => (
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {info.getValue() === 'LEAGUE' ? 'Ligue' : 'Coupe'}
          </span>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Statut',
        cell: (info) => {
          const s = info.getValue();
          const label =
            s === 'DRAFT' ? 'Brouillon' : s === 'ONGOING' ? 'En cours' : 'Terminée';
          return <span className="text-sm text-slate-300">{label}</span>;
        },
      }),
      columnHelper.display({
        id: 'teams',
        header: 'Équipes',
        cell: ({ row }) => (
          <span className="tabular-nums text-slate-400">{row.original.teams.length}</span>
        ),
      }),
      columnHelper.display({
        id: 'matches',
        header: 'Matchs',
        cell: ({ row }) => (
          <span className="tabular-nums text-slate-400">
            {row.original._count?.matches ?? '—'}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={generating === c.id || c.teams.length < 2}
                onClick={() => generateCalendar(c.id)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-cyan-400/20 text-cyan-400/90 hover:bg-cyan-400/10 disabled:opacity-40 disabled:pointer-events-none"
              >
                {generating === c.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CalendarPlus className="w-3.5 h-3.5" />
                )}
                Calendrier
              </button>
              <Link
                to={`/moderator/competitions/${c.id}/standings`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-white/10 text-slate-400 hover:text-white hover:border-white/20"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Classement
              </Link>
            </div>
          );
        },
      }),
    ],
    [generating],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400/20 to-teal-600/10 flex items-center justify-center border border-cyan-400/20">
            <Trophy className="w-5 h-5 text-cyan-400" />
          </div>
          Ligue & Coupe
        </h1>
        <p className="text-sm text-slate-500 mt-1 ml-[52px]">
          Compétitions, effectifs et génération de calendrier type championnat (aller simple).
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

      <div className="rounded-xl border border-white/[0.06] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-white/[0.06] bg-white/[0.02]">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500"
                  >
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500">
                  Aucune compétition.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
