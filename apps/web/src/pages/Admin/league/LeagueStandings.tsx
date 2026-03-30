import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { BarChart3, Loader2, ChevronLeft } from 'lucide-react';
import api from '@/lib/api';

interface StandingRow {
  team: { id: string; name: string; logo_url: string | null };
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  diff: number;
}

const columnHelper = createColumnHelper<StandingRow & { rank: number }>();

export default function LeagueStandings() {
  const { id } = useParams<{ id: string }>();
  const [rows, setRows] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/competitions/${id}/standings`);
        const data = res.data.data ?? res.data;
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setError('Classement introuvable.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const data = useMemo(
    () => rows.map((r, i) => ({ ...r, rank: i + 1 })),
    [rows],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('rank', {
        header: '#',
        cell: (info) => (
          <span className="tabular-nums text-slate-500 w-6 inline-block">{info.getValue()}</span>
        ),
      }),
      columnHelper.display({
        id: 'club',
        header: 'Club',
        cell: ({ row }) => (
          <span className="font-medium text-white">{row.original.team.name}</span>
        ),
      }),
      columnHelper.accessor('played', {
        header: 'J',
        cell: (info) => <span className="tabular-nums text-slate-400">{info.getValue()}</span>,
      }),
      columnHelper.accessor('won', {
        header: 'V',
        cell: (info) => <span className="tabular-nums text-emerald-400/90">{info.getValue()}</span>,
      }),
      columnHelper.accessor('drawn', {
        header: 'N',
        cell: (info) => <span className="tabular-nums text-slate-400">{info.getValue()}</span>,
      }),
      columnHelper.accessor('lost', {
        header: 'D',
        cell: (info) => <span className="tabular-nums text-red-400/80">{info.getValue()}</span>,
      }),
      columnHelper.accessor('goalsFor', {
        header: 'BP',
        cell: (info) => <span className="tabular-nums text-slate-300">{info.getValue()}</span>,
      }),
      columnHelper.accessor('goalsAgainst', {
        header: 'BC',
        cell: (info) => <span className="tabular-nums text-slate-300">{info.getValue()}</span>,
      }),
      columnHelper.accessor('diff', {
        header: 'Diff',
        cell: (info) => {
          const v = info.getValue();
          return (
            <span
              className={`tabular-nums font-semibold ${
                v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400/80' : 'text-slate-500'
              }`}
            >
              {v > 0 ? `+${v}` : v}
            </span>
          );
        },
      }),
      columnHelper.accessor('points', {
        header: 'Pts',
        cell: (info) => (
          <span className="tabular-nums font-bold text-cyan-400">{info.getValue()}</span>
        ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!id) return null;

  return (
    <div className="space-y-6">
      <Link
        to="/moderator/competitions"
        className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-cyan-400 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Retour aux compétitions
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400/20 to-teal-600/10 flex items-center justify-center border border-cyan-400/20">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
          </div>
          Classement
        </h1>
        <p className="text-sm text-slate-500 mt-1 ml-[52px]">
          Classement calculé sur les matchs au statut « terminé » (PLAYED).
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      ) : error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : (
        <div className="rounded-xl border border-white/[0.06] overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-white/[0.06] bg-white/[0.02]">
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500"
                    >
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
