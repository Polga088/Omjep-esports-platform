import { useEffect, useMemo, useState } from 'react'
import { Search, ShieldAlert, Swords, Trophy, Users } from 'lucide-react'
import api from '@/lib/api'
import MaintenancePrestige, { PRESTIGE_MSG } from '@/components/MaintenancePrestige'
import DashboardPageHeading from '@/components/dashboard/DashboardPageHeading'

interface LadderTeam {
  rank: number
  teamId: string
  teamName: string
  logoUrl: string | null
  memberCount: number
  averageRating: number
  totalGoals: number
  xp_prestige: number
  prestige_level: number
}

function SkeletonRow() {
  return (
    <li className="grid grid-cols-[4rem_minmax(14rem,1.6fr)_0.8fr_0.8fr_0.9fr_0.8fr] items-center gap-3 rounded-xl border border-omjep-border/55 bg-omjep-bg-panel-soft/70 px-4 py-3 animate-pulse">
      <div className="h-11 w-11 rounded-lg bg-omjep-bg-panel" />
      <div className="h-5 w-52 rounded bg-omjep-bg-panel" />
      <div className="h-4 w-10 rounded bg-omjep-bg-panel" />
      <div className="h-4 w-12 rounded bg-omjep-bg-panel" />
      <div className="h-4 w-16 rounded bg-omjep-bg-panel" />
      <div className="h-4 w-12 rounded bg-omjep-bg-panel" />
    </li>
  )
}

function RankBlock({ rank }: { rank: number }) {
  const isTop = rank <= 3
  const rankTone =
    rank === 1
      ? 'border-[color-mix(in_srgb,var(--omjep-gold)_58%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_18%,var(--omjep-bg-panel-soft))] text-[color-mix(in_srgb,var(--omjep-gold)_92%,#fff)]'
      : rank === 2
        ? 'border-slate-400/45 bg-slate-400/12 text-slate-200'
        : rank === 3
          ? 'border-amber-700/45 bg-amber-700/12 text-amber-300'
          : 'border-omjep-border/70 bg-omjep-bg-panel-soft text-omjep-text-secondary'

  return (
    <div className={`relative flex h-11 w-11 items-center justify-center rounded-lg border font-heading font-black tabular-nums ${rankTone}`}>
      <span className={`${isTop ? 'text-xl' : 'text-lg'}`}>{rank}</span>
    </div>
  )
}

function StatCell({
  value,
  accent = false,
}: {
  value: string
  accent?: boolean
}) {
  return (
    <span
      className={`inline-flex min-h-8 items-center justify-center rounded-lg border px-2.5 text-sm font-bold tabular-nums ${
        accent
          ? 'border-[color-mix(in_srgb,var(--omjep-gold)_38%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_11%,var(--omjep-bg-panel-soft))] text-[color-mix(in_srgb,var(--omjep-gold)_88%,var(--omjep-text-primary))]'
          : 'border-omjep-border/60 bg-omjep-bg-panel-soft/90 text-omjep-text-primary'
      }`}
    >
      {value}
    </span>
  )
}

export default function LadderPage() {
  const [teams, setTeams] = useState<LadderTeam[]>([])
  const [myTeamId, setMyTeamId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const [ladderRes, myTeamRes] = await Promise.allSettled([
          api.get<LadderTeam[]>('/teams/ladder'),
          api.get<{ id: string }>('/teams/my-team'),
        ])

        if (cancelled) return

        if (ladderRes.status === 'fulfilled') {
          const raw = ladderRes.value.data ?? []
          setTeams(
            raw.map((t) => ({
              ...t,
              teamName: typeof t?.teamName === 'string' && t.teamName.length > 0 ? t.teamName : 'Sans nom',
            })),
          )
        } else {
          setError('Impossible de charger le classement.')
        }

        if (myTeamRes.status === 'fulfilled') {
          setMyTeamId(myTeamRes.value.data.id)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchData()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return teams
    const q = search.toLowerCase()
    return teams.filter((t) => (t.teamName ?? '').toLowerCase().includes(q))
  }, [teams, search])

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-omjep-border bg-omjep-bg-panel px-5 py-5 shadow-[var(--omjep-shadow-lg)] sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_0%,color-mix(in_srgb,var(--omjep-mauve)_28%,transparent),transparent_58%),radial-gradient(ellipse_at_92%_100%,color-mix(in_srgb,var(--omjep-gold)_14%,transparent),transparent_56%)]" />
        <div className="relative space-y-4">
          <DashboardPageHeading
            eyebrow="League Ranking"
            title="Classement clubs"
            subtitle={
              loading
                ? 'Tableau broadcast basé sur le prestige et la performance collective'
                : `${teams.length} club${teams.length > 1 ? 's' : ''} dans la ligue`
            }
            className="border-b-0 pb-0"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--omjep-gold)_35%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_10%,var(--omjep-bg-panel-soft))] px-3 py-1 text-[11px] font-semibold text-omjep-text-secondary">
              <Trophy className="h-3.5 w-3.5 text-[color-mix(in_srgb,var(--omjep-gold)_88%,var(--omjep-mauve))]" />
              Leaderboard officiel OMJEP
            </div>

            <label className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-omjep-text-muted" />
              <input
                type="text"
                placeholder="Rechercher un club..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft py-2.5 pl-10 pr-4 text-sm text-omjep-text-primary placeholder:text-omjep-text-muted focus:border-[color-mix(in_srgb,var(--omjep-gold)_35%,var(--omjep-mauve))] focus:outline-none"
              />
            </label>
          </div>
        </div>
      </section>

      {error && !loading ? (
        <MaintenancePrestige overlay title="Classement clubs" message={PRESTIGE_MSG} className="border-omjep-border" />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-omjep-border bg-omjep-bg-panel shadow-[var(--omjep-shadow-lg)]">
          <header className="grid grid-cols-[4rem_minmax(14rem,1.6fr)_0.8fr_0.8fr_0.9fr_0.8fr] items-center gap-3 border-b border-omjep-border/70 bg-omjep-bg-panel-soft/80 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-omjep-text-muted">
            <span>Rang</span>
            <span>Club</span>
            <span>Joueurs</span>
            <span>Note</span>
            <span>Prestige XP</span>
            <span>Buts</span>
          </header>

          <ul className="space-y-2 p-3 sm:p-4">
            {loading ? (
              Array.from({ length: 8 }).map((_, idx) => <SkeletonRow key={`ladder-skel-${idx}`} />)
            ) : filtered.length === 0 ? (
              <li className="rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-omjep-border/70 bg-omjep-bg-panel">
                  {search.trim() ? (
                    <Search className="h-6 w-6 text-omjep-text-muted" />
                  ) : (
                    <ShieldAlert className="h-6 w-6 text-omjep-text-muted" />
                  )}
                </div>
                <p className="mt-3 text-sm text-omjep-text-secondary">
                  {search.trim() ? `Aucun club trouvé pour "${search}"` : 'Aucun club dans le classement.'}
                </p>
              </li>
            ) : (
              filtered.map((team) => {
                const globalRank = team.rank || teams.indexOf(team) + 1
                const isMyTeam = team.teamId === myTeamId

                return (
                  <li
                    key={team.teamId}
                    className={`group grid grid-cols-[4rem_minmax(14rem,1.6fr)_0.8fr_0.8fr_0.9fr_0.8fr] items-center gap-3 rounded-xl border px-4 py-3 transition ${
                      isMyTeam
                        ? 'border-[color-mix(in_srgb,var(--omjep-gold)_46%,var(--omjep-mauve))] bg-[color-mix(in_srgb,var(--omjep-mauve)_14%,var(--omjep-bg-panel-soft))]'
                        : 'border-omjep-border/60 bg-omjep-bg-panel-soft/72 hover:border-[color-mix(in_srgb,var(--omjep-gold)_28%,var(--omjep-border))] hover:bg-omjep-bg-panel-soft'
                    }`}
                  >
                    <div className="flex justify-center">
                      <RankBlock rank={globalRank} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        {team.logoUrl ? (
                          <img
                            src={team.logoUrl}
                            alt={team.teamName ?? 'Club'}
                            className="h-10 w-10 shrink-0 rounded-xl border border-omjep-border/70 object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-omjep-border/70 bg-omjep-bg-panel text-sm font-bold uppercase text-[color-mix(in_srgb,var(--omjep-gold)_84%,var(--omjep-text-primary))]">
                            {(team.teamName ?? '?').charAt(0) || '?'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-omjep-text-primary">
                            {team.teamName ?? '—'}
                          </p>
                          <div className="mt-0.5 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-omjep-text-muted">
                            <span className="rounded-full border border-omjep-border/60 bg-omjep-bg-panel px-1.5 py-[1px] font-bold">
                              Lvl {team.prestige_level ?? 1}
                            </span>
                            {isMyTeam ? <span className="font-bold text-[color-mix(in_srgb,var(--omjep-gold)_88%,var(--omjep-mauve))]">Mon club</span> : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <div className="inline-flex items-center gap-1 text-omjep-text-primary">
                        <Users className="h-3.5 w-3.5 text-omjep-text-muted" />
                        <span className="text-sm font-bold tabular-nums">{team.memberCount ?? 0}</span>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <StatCell value={Number.isFinite(team.averageRating) && team.averageRating > 0 ? team.averageRating.toFixed(1) : 'N/A'} />
                    </div>

                    <div className="flex justify-center">
                      <StatCell value={(team.xp_prestige ?? 0).toLocaleString('fr-FR')} accent />
                    </div>

                    <div className="flex justify-center">
                      <div className="inline-flex items-center gap-1 text-omjep-text-primary">
                        <Swords className="h-3.5 w-3.5 text-omjep-text-muted" />
                        <span className="text-sm font-bold tabular-nums">{(team.totalGoals ?? 0).toLocaleString('fr-FR')}</span>
                      </div>
                    </div>
                  </li>
                )
              })
            )}
          </ul>

          <footer className="flex items-center justify-between border-t border-omjep-border/70 px-4 py-3 text-xs text-omjep-text-muted">
            <span>
              {loading
                ? '...'
                : search.trim()
                  ? `${filtered.length} résultat${filtered.length > 1 ? 's' : ''}`
                  : `${teams.length} club${teams.length > 1 ? 's' : ''} au total`}
            </span>
            <span>Données live</span>
          </footer>
        </section>
      )}
    </div>
  )
}
