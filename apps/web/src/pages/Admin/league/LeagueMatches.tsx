import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  Swords, Loader2, Filter, ChevronDown, CheckCircle2, AlertCircle,
  X, Plus, ClipboardCheck, Search, ListChecks,
} from 'lucide-react';
import api from '@/lib/api';

interface ScoreReport {
  reporting_team_id: string;
  home_score: number;
  away_score: number;
  reportingTeam: { id: string; name: string };
  submittedBy: { id: string; email: string; ea_persona_name: string | null };
}

interface MatchRow {
  id: string;
  round: string | null;
  status: string;
  home_team_id: string;
  away_team_id: string;
  competition: { id: string; name: string; type: string } | null;
  homeTeam: { id: string; name: string; logo_url?: string | null };
  awayTeam: { id: string; name: string; logo_url?: string | null };
  scoreReports: ScoreReport[];
}

interface CompetitionOpt {
  id: string;
  name: string;
  teams: { team_id: string; team: { id: string; name: string } }[];
}

function consensus(m: MatchRow) {
  const home = m.scoreReports.find((r) => r.reporting_team_id === m.home_team_id);
  const away = m.scoreReports.find((r) => r.reporting_team_id === m.away_team_id);
  if (!home || !away) {
    return {
      short: '—',
      detail: 'Déclarations incomplètes',
      canValidate: false,
      variant: 'wait' as const,
    };
  }
  const ok =
    home.home_score === away.home_score && home.away_score === away.away_score;
  if (ok) {
    return {
      short: `${home.home_score}–${home.away_score}`,
      detail: 'Les deux clubs sont alignés',
      canValidate: true,
      variant: 'ok' as const,
    };
  }
  return {
    short: 'Conflit',
    detail: `Domicile: ${home.home_score}–${home.away_score} · Extérieur: ${away.home_score}–${away.away_score}`,
    canValidate: false,
    variant: 'bad' as const,
  };
}

function reportCell(
  m: MatchRow,
  side: 'home' | 'away',
): { text: string; sub: string } {
  const tid = side === 'home' ? m.home_team_id : m.away_team_id;
  const r = m.scoreReports.find((x) => x.reporting_team_id === tid);
  if (!r) return { text: '—', sub: 'Non déclaré' };
  return {
    text: `${r.home_score}–${r.away_score}`,
    sub: r.submittedBy.ea_persona_name ?? r.submittedBy.email,
  };
}

const columnHelper = createColumnHelper<MatchRow>();

export default function LeagueMatches() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCompetition, setFilterCompetition] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [bulkValidating, setBulkValidating] = useState(false);
  /** Prêts à valider par défaut : objectif moins de 3 clics (navigation + Valider). */
  const [viewFilter, setViewFilter] = useState<'ready' | 'all' | 'pending' | 'conflict'>('ready');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [createComp, setCreateComp] = useState('');
  const [createHome, setCreateHome] = useState('');
  const [createAway, setCreateAway] = useState('');
  const [createRound, setCreateRound] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = filterCompetition ? { competition_id: filterCompetition } : {};
      const [mRes, cRes] = await Promise.all([
        api.get('/moderator/league/matches', { params }),
        api.get('/moderator/league/competitions'),
      ]);
      const mData = mRes.data.data ?? mRes.data;
      const cData = cRes.data.data ?? cRes.data;
      setMatches(Array.isArray(mData) ? mData : []);
      const clist = Array.isArray(cData) ? cData : [];
      setCompetitions(
        clist.map((c: CompetitionOpt) => ({
          id: c.id,
          name: c.name,
          teams: c.teams ?? [],
        })),
      );
    } catch {
      setError('Impossible de charger les matchs.');
    } finally {
      setLoading(false);
    }
  }, [filterCompetition]);

  useEffect(() => {
    load();
  }, [load]);

  const scheduled = useMemo(
    () => matches.filter((m) => m.status === 'SCHEDULED'),
    [matches],
  );

  const countReady = useMemo(
    () => scheduled.filter((m) => consensus(m).canValidate).length,
    [scheduled],
  );
  const countConflict = useMemo(
    () => scheduled.filter((m) => consensus(m).variant === 'bad').length,
    [scheduled],
  );
  const countPending = useMemo(
    () => scheduled.filter((m) => consensus(m).variant === 'wait').length,
    [scheduled],
  );

  const byView = useMemo(() => {
    return scheduled.filter((m) => {
      const c = consensus(m);
      if (viewFilter === 'ready') return c.canValidate;
      if (viewFilter === 'conflict') return c.variant === 'bad';
      if (viewFilter === 'pending') return c.variant === 'wait';
      return true;
    });
  }, [scheduled, viewFilter]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return byView;
    return byView.filter(
      (m) =>
        m.homeTeam.name.toLowerCase().includes(q) ||
        m.awayTeam.name.toLowerCase().includes(q) ||
        (m.competition?.name ?? '').toLowerCase().includes(q),
    );
  }, [byView, searchQuery]);

  const visibleValidateIds = useMemo(
    () => filteredRows.filter((m) => consensus(m).canValidate).map((m) => m.id),
    [filteredRows],
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const allOn =
        visibleValidateIds.length > 0 &&
        visibleValidateIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allOn) {
        visibleValidateIds.forEach((id) => next.delete(id));
      } else {
        visibleValidateIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const validate = async (id: string) => {
    setValidatingId(id);
    setError('');
    try {
      const { data } = await api.post(`/moderator/league/matches/${id}/validate-score`, {});
      setSuccess(data.message ?? 'Score validé.');
      await load();
      setTimeout(() => setSuccess(''), 5000);
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data;
      let msg = res?.message;
      if (Array.isArray(msg)) msg = msg[0];
      if (typeof msg !== 'string') msg = 'Validation impossible.';
      setError(msg);
    } finally {
      setValidatingId(null);
    }
  };

  const bulkValidate = async () => {
    const ids = [...selectedIds].filter((id) => {
      const m = matches.find((x) => x.id === id);
      return m && m.status === 'SCHEDULED' && consensus(m).canValidate;
    });
    if (ids.length === 0) return;
    setBulkValidating(true);
    setError('');
    try {
      for (const id of ids) {
        await api.post(`/moderator/league/matches/${id}/validate-score`, {});
      }
      setSuccess(`${ids.length} score(s) validé(s).`);
      setSelectedIds(new Set());
      await load();
      setTimeout(() => setSuccess(''), 5000);
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data;
      let msg = res?.message;
      if (Array.isArray(msg)) msg = msg[0];
      if (typeof msg !== 'string') msg = 'Validation groupée impossible.';
      setError(msg);
    } finally {
      setBulkValidating(false);
    }
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createComp || !createHome || !createAway) return;
    setCreating(true);
    setError('');
    try {
      await api.post(`/moderator/league/competitions/${createComp}/matches`, {
        home_team_id: createHome,
        away_team_id: createAway,
        round: createRound.trim() || undefined,
      });
      setSuccess('Match créé.');
      setCreateOpen(false);
      setCreateHome('');
      setCreateAway('');
      setCreateRound('');
      await load();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Création échouée.';
      setError(typeof msg === 'string' ? msg : 'Création échouée.');
    } finally {
      setCreating(false);
    }
  };

  const createTeams =
    competitions.find((c) => c.id === createComp)?.teams.map((t) => t.team) ?? [];

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        header: () => {
          const allOn =
            visibleValidateIds.length > 0 &&
            visibleValidateIds.every((id) => selectedIds.has(id));
          const someOn = visibleValidateIds.some((id) => selectedIds.has(id));
          return (
            <input
              type="checkbox"
              title="Tout sélectionner (lignes validables)"
              checked={allOn}
              ref={(el) => {
                if (el) el.indeterminate = !allOn && someOn;
              }}
              onChange={toggleSelectAllVisible}
              disabled={visibleValidateIds.length === 0 || bulkValidating}
              className="rounded border-cyan-400/40 bg-white/[0.04] text-cyan-500 focus:ring-cyan-400/30"
            />
          );
        },
        cell: ({ row }) => {
          const m = row.original;
          const c = consensus(m);
          if (!c.canValidate) {
            return <span className="inline-block w-4" />;
          }
          return (
            <input
              type="checkbox"
              checked={selectedIds.has(m.id)}
              onChange={() => toggleSelect(m.id)}
              disabled={bulkValidating}
              className="rounded border-cyan-400/40 bg-white/[0.04] text-cyan-500 focus:ring-cyan-400/30"
            />
          );
        },
      }),
      columnHelper.display({
        id: 'comp',
        header: 'Compétition',
        cell: ({ row }) => (
          <span className="text-xs text-slate-500 max-w-[140px] truncate block">
            {row.original.competition?.name ?? '—'}
          </span>
        ),
      }),
      columnHelper.accessor('round', {
        header: 'Journée',
        cell: (info) => (
          <span className="text-slate-300 tabular-nums">{info.getValue() ?? '—'}</span>
        ),
      }),
      columnHelper.display({
        id: 'home',
        header: 'Domicile',
        cell: ({ row }) => (
          <span className="font-medium text-white truncate max-w-[120px] block">
            {row.original.homeTeam.name}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'away',
        header: 'Extérieur',
        cell: ({ row }) => (
          <span className="font-medium text-white truncate max-w-[120px] block">
            {row.original.awayTeam.name}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'repHome',
        header: 'Décl. domicile',
        cell: ({ row }) => {
          const { text, sub } = reportCell(row.original, 'home');
          return (
            <div>
              <div className="font-mono text-cyan-300/90 tabular-nums">{text}</div>
              <div className="text-[10px] text-slate-600 truncate max-w-[100px]">{sub}</div>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'repAway',
        header: 'Décl. extérieur',
        cell: ({ row }) => {
          const { text, sub } = reportCell(row.original, 'away');
          return (
            <div>
              <div className="font-mono text-teal-300/90 tabular-nums">{text}</div>
              <div className="text-[10px] text-slate-600 truncate max-w-[100px]">{sub}</div>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'consensus',
        header: 'Accord',
        cell: ({ row }) => {
          const c = consensus(row.original);
          const cls =
            c.variant === 'ok'
              ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5'
              : c.variant === 'bad'
                ? 'text-orange-400 border-orange-400/20 bg-orange-400/5'
                : 'text-slate-500 border-white/10 bg-white/[0.02]';
          return (
            <div className={`inline-flex flex-col gap-0.5 px-2 py-1 rounded-lg border text-[11px] ${cls}`}>
              <span className="font-semibold tabular-nums">{c.short}</span>
              <span className="text-[9px] opacity-80 max-w-[140px] leading-tight">{c.detail}</span>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'go',
        header: '',
        cell: ({ row }) => {
          const m = row.original;
          if (m.status !== 'SCHEDULED') {
            return <span className="text-slate-600 text-xs">Terminé</span>;
          }
          const c = consensus(m);
          return (
            <button
              type="button"
              disabled={!c.canValidate || validatingId === m.id}
              onClick={() => validate(m.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-gradient-to-r from-cyan-500 to-teal-600 text-[#020617] disabled:opacity-35 disabled:grayscale"
            >
              {validatingId === m.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ClipboardCheck className="w-3.5 h-3.5" />
              )}
              Valider
            </button>
          );
        },
      }),
    ],
    [validatingId, bulkValidating, selectedIds, visibleValidateIds],
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const selectedCompName = filterCompetition
    ? competitions.find((c) => c.id === filterCompetition)?.name ?? 'Compétition'
    : 'Toutes les compétitions';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400/20 to-teal-600/10 flex items-center justify-center border border-cyan-400/20">
              <Swords className="w-5 h-5 text-cyan-400" />
            </div>
            Matchs à valider
          </h1>
          <p className="text-sm text-slate-500 mt-1 ml-[52px]">
            Saisie rapide : validez uniquement lorsque les deux déclarations concordent. Vue par défaut :
            matchs prêts à valider (1 clic sur Valider une fois sur la page).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((o) => !o)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cyan-400/15 bg-white/[0.03] text-sm text-slate-300"
            >
              <Filter className="w-4 h-4 text-cyan-400/60" />
              <span className="max-w-[160px] truncate">{selectedCompName}</span>
              <ChevronDown className={`w-3.5 h-3.5 ${filterOpen ? 'rotate-180' : ''}`} />
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-cyan-400/15 bg-[#0a0f1e] shadow-xl z-20 py-1">
                <button
                  type="button"
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-400 hover:bg-white/[0.04]"
                  onClick={() => {
                    setFilterCompetition('');
                    setFilterOpen(false);
                  }}
                >
                  Toutes
                </button>
                {competitions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="w-full text-left px-4 py-2.5 text-sm border-t border-white/[0.04] hover:bg-white/[0.04]"
                    onClick={() => {
                      setFilterCompetition(c.id);
                      setFilterOpen(false);
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setCreateOpen(true);
              if (!createComp && competitions[0]) setCreateComp(competitions[0].id);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-teal-400/25 text-teal-400 text-sm font-semibold hover:bg-teal-400/10"
          >
            <Plus className="w-4 h-4" />
            Nouveau match
          </button>

          {selectedIds.size > 0 && (
            <button
              type="button"
              disabled={bulkValidating}
              onClick={() => void bulkValidate()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-400/35 bg-emerald-500/10 text-emerald-300 text-sm font-bold hover:bg-emerald-500/15 disabled:opacity-40"
            >
              {bulkValidating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ListChecks className="w-4 h-4" />
              )}
              Valider la sélection ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 flex-wrap">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 shrink-0">
            Filtre
          </span>
          {(
            [
              { key: 'ready' as const, label: 'Prêts à valider', count: countReady },
              { key: 'pending' as const, label: 'En attente déclar.', count: countPending },
              { key: 'conflict' as const, label: 'Conflits', count: countConflict },
              { key: 'all' as const, label: 'Tous programmés', count: scheduled.length },
            ] as const
          ).map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setViewFilter(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                viewFilter === key
                  ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300'
                  : 'border-white/[0.08] text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
              }`}
            >
              {label}
              <span
                className={`tabular-nums px-1.5 py-0.5 rounded-md text-[10px] ${
                  viewFilter === key ? 'bg-cyan-400/20 text-cyan-200' : 'bg-white/[0.05] text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Recherche club, compétition…"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/30"
          />
        </div>
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

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.06] overflow-x-auto">
          <table className="w-full text-sm min-w-[940px]">
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
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-16 text-center text-slate-500">
                    Aucun match
                    {viewFilter === 'ready'
                      ? ' prêt à valider'
                      : viewFilter === 'conflict'
                        ? ' en conflit'
                        : viewFilter === 'pending'
                          ? ' en attente de déclarations'
                          : ''}
                    {filterCompetition ? ' pour cette compétition' : ''}
                    {searchQuery.trim() ? ' (recherche)' : ''}.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-3 align-top">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Fermer"
            onClick={() => setCreateOpen(false)}
          />
          <form
            onSubmit={submitCreate}
            className="relative w-full max-w-md rounded-2xl border border-cyan-400/15 bg-[#0a0f1e] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Créer un match</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Compétition
                <select
                  value={createComp}
                  onChange={(e) => {
                    setCreateComp(e.target.value);
                    setCreateHome('');
                    setCreateAway('');
                  }}
                  className="mt-1 w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white"
                  required
                >
                  <option value="">—</option>
                  {competitions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Domicile
                  <select
                    value={createHome}
                    onChange={(e) => setCreateHome(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white"
                    required
                  >
                    <option value="">—</option>
                    {createTeams.map((t) => (
                      <option key={t.id} value={t.id} disabled={t.id === createAway}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Extérieur
                  <select
                    value={createAway}
                    onChange={(e) => setCreateAway(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white"
                    required
                  >
                    <option value="">—</option>
                    {createTeams.map((t) => (
                      <option key={t.id} value={t.id} disabled={t.id === createHome}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Journée (optionnel)
                <input
                  value={createRound}
                  onChange={(e) => setCreateRound(e.target.value)}
                  placeholder="ex. Journée 5"
                  className="mt-1 w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-600"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-cyan-500 text-[#020617] disabled:opacity-40"
              >
                {creating ? '…' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
