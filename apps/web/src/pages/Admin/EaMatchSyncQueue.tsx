import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'

type MatchSyncRow = {
  id: string
  matchId: string
  status: string
  attempts: number
  lastError: string | null
  updatedAt: string
  match: {
    id: string
    status: string
    home_score: number | null
    away_score: number | null
    homeTeam: { name: string }
    awayTeam: { name: string }
  }
}

export default function EaMatchSyncQueue() {
  const [rows, setRows] = useState<MatchSyncRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<MatchSyncRow[]>('/admin/sync/ea-match-syncs')
      setRows(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Impossible de charger la file EA.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleRetry = async (matchId: string) => {
    setBusyId(matchId)
    try {
      const { data } = await api.post<{ ok?: boolean; message?: string }>(
        `/admin/sync/ea-match-syncs/${matchId}/retry`,
      )
      if (data?.ok) {
        toast.success(data.message ?? 'Synchronisation réussie')
      } else {
        toast.message(data?.message ?? 'Tentative terminée')
      }
      await load()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Relance impossible'
      toast.error(typeof msg === 'string' ? msg : 'Relance impossible')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400/90">Admin · Sync EA</p>
          <h1 className="mt-1 font-heading text-2xl font-extrabold text-slate-100">File synchronisation EA FC 26</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Matchs en échec ou en revue manuelle côté import automatique EA Clubs. Relancez après correction des liaisons
            club / persona.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-amber-100 transition hover:bg-amber-400/15 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
          Actualiser
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]/80">
        {loading ? (
          <div className="flex items-center gap-2 px-6 py-16 text-sm text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-amber-400" aria-hidden />
            Chargement…
          </div>
        ) : rows.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-slate-500">Aucune entrée failed / manual_review.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.02] text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Match</th>
                  <th className="px-4 py-3">Statut sync</th>
                  <th className="px-4 py-3">Tentatives</th>
                  <th className="px-4 py-3">Dernière erreur</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((r) => {
                  const m = r.match
                  const label = `${m.homeTeam.name} vs ${m.awayTeam.name}`
                  return (
                    <tr key={r.id} className="text-slate-200">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-100">{label}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-slate-500">{m.id}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          Match {m.status} · score {m.home_score ?? '—'} — {m.away_score ?? '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md border border-amber-400/20 bg-amber-400/5 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-200/90">
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-400">{r.attempts}</td>
                      <td className="max-w-md px-4 py-3 text-xs text-rose-200/90">
                        {r.lastError ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void handleRetry(r.matchId)}
                          disabled={busyId === r.matchId}
                          className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-amber-100 transition hover:bg-amber-400/20 disabled:opacity-50"
                        >
                          {busyId === r.matchId ? '…' : 'Relancer'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
