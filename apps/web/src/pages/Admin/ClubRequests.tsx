import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { ClipboardList, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card } from '@omjep/ui';
import api from '@/lib/api';

type PendingClubRow = {
  id: string;
  name: string;
  logo_url: string | null;
  platform: string;
  proclubs_url: string | null;
  created_at: string;
  validation_status: string;
  manager: {
    id: string;
    email: string;
    ea_persona_name: string | null;
  } | null;
  _count?: { members: number };
};

const columnHelper = createColumnHelper<PendingClubRow>();

export default function ClubRequests() {
  const [rows, setRows] = useState<PendingClubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingKey, setActingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<PendingClubRow[]>('/admin/clubs/pending-validation');
      const data = res.data;
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setError('Impossible de charger les demandes de clubs.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const validateClub = useCallback(
    async (clubId: string, status: 'APPROVED' | 'REJECTED', key: string) => {
      setActingKey(key);
      try {
        await api.patch(`/admin/clubs/${clubId}/validation`, {
          validation_status: status,
        });
        toast.success(status === 'APPROVED' ? 'Club approuvé.' : 'Club refusé.');
        await load();
      } catch (e: unknown) {
        const msg =
          (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
        const text = Array.isArray(msg) ? msg.join(', ') : msg;
        toast.error(typeof text === 'string' ? text : 'Action impossible.');
      } finally {
        setActingKey(null);
      }
    },
    [load],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Club',
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                {row.logo_url ? (
                  <img src={row.logo_url} alt="" className="w-7 h-7 rounded object-cover" />
                ) : (
                  row.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <span className="font-medium text-white truncate">{info.getValue()}</span>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'manager',
        header: 'Gérant',
        cell: ({ row }) => {
          const m = row.original.manager;
          if (!m) return <span className="text-slate-500">—</span>;
          return (
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-slate-200 truncate text-sm">{m.ea_persona_name ?? '—'}</span>
              <span className="text-slate-500 text-xs truncate">{m.email}</span>
            </div>
          );
        },
      }),
      columnHelper.accessor('platform', {
        header: 'Plateforme',
        cell: (info) => (
          <span className="text-slate-400 text-xs">{info.getValue() ?? '—'}</span>
        ),
      }),
      columnHelper.display({
        id: 'members',
        header: 'Membres',
        cell: ({ row }) => (
          <span className="tabular-nums text-slate-300 text-sm">
            {row.original._count?.members ?? '—'}
          </span>
        ),
      }),
      columnHelper.accessor('created_at', {
        header: 'Demandé le',
        cell: (info) => {
          const v = info.getValue();
          return (
            <span className="text-slate-500 text-xs tabular-nums">
              {v ? new Date(v).toLocaleDateString('fr-FR') : '—'}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const c = row.original;
          const approveKey = `${c.id}-approve`;
          const rejectKey = `${c.id}-reject`;
          return (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="gold"
                size="sm"
                loading={actingKey === approveKey}
                disabled={actingKey !== null || loading}
                onClick={() => validateClub(c.id, 'APPROVED', approveKey)}
              >
                Approuver
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                loading={actingKey === rejectKey}
                disabled={actingKey !== null || loading}
                onClick={() => validateClub(c.id, 'REJECTED', rejectKey)}
              >
                Refuser
              </Button>
            </div>
          );
        },
      }),
    ],
    [actingKey, loading, validateClub],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading && rows.length === 0) {
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
            <ClipboardList className="w-5 h-5 text-amber-400" />
          </div>
          Demandes de clubs
        </h1>
        <p className="text-sm text-slate-500 mt-1 ml-[52px]">
          Clubs en attente de validation (statut PENDING). Approuvez ou refusez chaque demande.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <Card variant="flat" className="p-0 overflow-hidden border-white/[0.06]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
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
                  <td colSpan={columns.length} className="px-4 py-16 text-center text-slate-500">
                    Aucune demande en attente.
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
      </Card>
    </div>
  );
}
