import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, GitBranch, Search, ShieldAlert, Trophy } from 'lucide-react'
import api from '@/lib/api'
import DashboardPageHeading from '@/components/dashboard/DashboardPageHeading'
import {
  getCompetitionVisual,
  normalizeCompetitionType,
  statusLabelFr,
  type CompetitionVisual,
} from '@/pages/Dashboard/ladder/competitionVisual'

type HubCompetition = {
  id: string
  name: string
  type: string
  status: string
  teamCount: number
  matchCount: number
}

const toNum = (v: unknown, fallback = 0) => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

/** Accepte tableau JSON direct ou enveloppe `{ data: [...] }` + champs camel/snake. */
const normalizeHubCompetitionsPayload = (body: unknown): HubCompetition[] => {
  const raw =
    Array.isArray(body) ? body : body && typeof body === 'object' && Array.isArray((body as { data?: unknown }).data)
      ? (body as { data: unknown[] }).data
      : null
  if (!raw) return []

  return raw.map((row) => {
    const r = row as Record<string, unknown>
    const id = String(r.id ?? r.competition_id ?? '')
    const name = String(r.name ?? '')
    const type = String(r.type ?? '')
    const status = String(r.status ?? '')
    const countObj =
      r._count && typeof r._count === 'object'
        ? (r._count as { teams?: unknown; matches?: unknown })
        : null
    const teamCount = toNum(r.teamCount ?? r.team_count ?? countObj?.teams)
    const matchCount = toNum(r.matchCount ?? r.match_count ?? countObj?.matches)
    return { id, name, type, status, teamCount, matchCount }
  }).filter((c) => c.id.length > 0 && c.name.length > 0)
}

type BracketMatch = {
  id: string
  round: string | null
  status: string
  home_score: number | null
  away_score: number | null
  homeTeam: { id: string; name: string; logo_url: string | null }
  awayTeam: { id: string; name: string; logo_url: string | null }
  played_at?: string | null
  scheduled_at?: string | null
}

type StandingsCupPayload = {
  type: 'CUP'
  competition: { id: string; name: string; type: string; status: string }
  rounds: { name: string; matches: BracketMatch[] }[]
}

type StandingsChampionsPayload = {
  type: 'CHAMPIONS'
  competition: { id: string; name: string; type: string; status: string }
  groups: { name: string; matches: BracketMatch[] }[]
  knockoutRounds: { name: string; matches: BracketMatch[] }[]
}

interface LadderTeam {
  rank: number
  teamId: string
  teamName: string
  logoUrl: string | null
  memberCount: number
  matchesPlayed: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

function SkeletonRow() {
  return (
    <li className="grid grid-cols-[4rem_minmax(12rem,1.5fr)_repeat(8,minmax(2.2rem,0.7fr))] items-center gap-2 rounded-xl border border-omjep-border/55 bg-omjep-bg-panel-soft/70 px-4 py-3 animate-pulse">
      <div className="h-11 w-11 rounded-lg bg-omjep-bg-panel" />
      <div className="h-5 w-52 rounded bg-omjep-bg-panel" />
      {Array.from({ length: 8 }).map((_, idx) => (
        <div key={idx} className="h-4 w-8 rounded bg-omjep-bg-panel" />
      ))}
    </li>
  )
}

function SkeletonBracket() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {[0, 1].map((col) => (
        <div key={col} className="min-w-[220px] space-y-3">
          <div className="h-6 w-32 rounded-lg bg-omjep-bg-panel animate-pulse" />
          <div className="h-24 rounded-xl border border-omjep-border/50 bg-omjep-bg-panel-soft/60 animate-pulse" />
          <div className="h-24 rounded-xl border border-omjep-border/50 bg-omjep-bg-panel-soft/60 animate-pulse" />
        </div>
      ))}
    </div>
  )
}

function RankBlock({ rank, visual }: { rank: number; visual: CompetitionVisual }) {
  const isTop = rank <= 3
  const rankTone =
    rank === 1
      ? visual.rankTopTone
      : rank === 2
        ? 'border-slate-400/45 bg-slate-400/12 text-slate-200'
        : rank === 3
          ? 'border-amber-700/45 bg-amber-700/12 text-amber-300'
          : 'border-omjep-border/70 bg-omjep-bg-panel-soft text-omjep-text-secondary'

  return (
    <div
      className={`relative flex h-11 w-11 items-center justify-center rounded-lg border font-heading font-black tabular-nums ${rankTone}`}
    >
      <span className={`${isTop ? 'text-xl' : 'text-lg'}`}>{rank}</span>
    </div>
  )
}

function StatCell({
  value,
  accent = false,
  accentClass,
}: {
  value: string
  accent?: boolean
  accentClass?: string
}) {
  const accentCls =
    accentClass ??
    'border-[color-mix(in_srgb,var(--omjep-gold)_38%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_11%,var(--omjep-bg-panel-soft))] text-[color-mix(in_srgb,var(--omjep-gold)_88%,var(--omjep-text-primary))]'

  return (
    <span
      className={`inline-flex min-h-8 items-center justify-center rounded-lg border px-2.5 text-sm font-bold tabular-nums ${
        accent ? accentCls : 'border-omjep-border/60 bg-omjep-bg-panel-soft/90 text-omjep-text-primary'
      }`}
    >
      {value}
    </span>
  )
}

function formatMatchWhen(m: BracketMatch) {
  const raw = m.played_at ?? m.scheduled_at
  if (!raw) return null
  try {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(raw))
  } catch {
    return null
  }
}

function formatDiff(n: number) {
  if (n > 0) return `+${n}`
  return `${n}`
}

function BracketMatchCard({
  match,
  visual,
  myTeamId,
}: {
  match: BracketMatch
  visual: CompetitionVisual
  myTeamId: string | null
}) {
  const hs = match.home_score
  const as = match.away_score
  const hasScore = hs != null && as != null
  const homeWins = hasScore && hs > as
  const awayWins = hasScore && as > hs
  const when = formatMatchWhen(match)
  const homeMine = match.homeTeam.id === myTeamId
  const awayMine = match.awayTeam.id === myTeamId

  return (
    <article
      className={`rounded-xl border bg-omjep-bg-panel-soft/80 px-3 py-3 ${visual.matchCardBorder}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-omjep-text-muted">
        <span className="truncate">{match.status}</span>
        {when ? <span className="shrink-0 tabular-nums text-omjep-text-secondary">{when}</span> : null}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div
          className={`min-w-0 rounded-lg border border-transparent px-2 py-2 ${
            homeWins ? `${visual.matchCardWinner} ${visual.matchCardBorder}` : ''
          } ${homeMine ? 'ring-1 ring-[color-mix(in_srgb,var(--omjep-mauve)_45%,transparent)]' : ''}`}
        >
          <p className="truncate text-sm font-bold text-omjep-text-primary">{match.homeTeam.name}</p>
        </div>
        <div className="flex flex-col items-center justify-center px-1">
          {hasScore ? (
            <span className="font-heading text-lg font-black tabular-nums text-omjep-text-primary">
              {hs} – {as}
            </span>
          ) : (
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-omjep-text-muted">VS</span>
          )}
        </div>
        <div
          className={`min-w-0 rounded-lg border border-transparent px-2 py-2 text-right ${
            awayWins ? `${visual.matchCardWinner} ${visual.matchCardBorder}` : ''
          } ${awayMine ? 'ring-1 ring-[color-mix(in_srgb,var(--omjep-mauve)_45%,transparent)]' : ''}`}
        >
          <p className="truncate text-sm font-bold text-omjep-text-primary">{match.awayTeam.name}</p>
        </div>
      </div>
    </article>
  )
}

function BracketRoundsSection({
  rounds,
  visual,
  myTeamId,
}: {
  rounds: { name: string; matches: BracketMatch[] }[]
  visual: CompetitionVisual
  myTeamId: string | null
}) {
  const nonEmpty = rounds.filter((r) => r.matches.length > 0)

  if (nonEmpty.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-6 lg:overflow-x-auto lg:pb-2">
      {nonEmpty.map((round) => (
        <section key={round.name} className="min-w-0 shrink-0 lg:min-w-[260px]">
          <h3
            className={`mb-3 pb-2 text-xs font-black uppercase tracking-[0.16em] ${visual.roundHeader}`}
          >
            {round.name}
          </h3>
          <ul className="space-y-3">
            {round.matches.map((m) => (
              <li key={m.id}>
                <BracketMatchCard match={m} visual={visual} myTeamId={myTeamId} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function PrepTreeState({
  visual,
  title,
  lines,
}: {
  visual: CompetitionVisual
  title: string
  lines: string[]
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-omjep-bg-panel-soft/50 px-6 py-14 text-center ${visual.matchCardBorder}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{ backgroundImage: visual.headerGlow }}
      />
      <div className="relative mx-auto flex max-w-md flex-col items-center gap-4">
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-2xl border bg-omjep-bg-panel/90 ${visual.matchCardBorder}`}
        >
          <GitBranch className="h-8 w-8 text-omjep-text-secondary" aria-hidden />
        </div>
        <div>
          <p className="font-heading text-lg font-black text-omjep-text-primary">{title}</p>
          <p className="mt-2 text-sm text-omjep-text-secondary">
            Les rencontres apparaîtront ici dès leur génération.
          </p>
        </div>
        <ul className="w-full space-y-2 rounded-xl border border-omjep-border/60 bg-omjep-bg-panel/80 px-4 py-3 text-left text-xs text-omjep-text-secondary">
          {lines.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-omjep-text-muted" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function LadderPage() {
  const [competitions, setCompetitions] = useState<HubCompetition[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hubLoading, setHubLoading] = useState(true)
  const [hubError, setHubError] = useState<string | null>(null)

  const [myTeamId, setMyTeamId] = useState<string | null>(null)

  const [leagueRows, setLeagueRows] = useState<LadderTeam[]>([])
  const [leagueLoading, setLeagueLoading] = useState(false)
  const [leagueError, setLeagueError] = useState<string | null>(null)

  const [cupPayload, setCupPayload] = useState<StandingsCupPayload | null>(null)
  const [championsPayload, setChampionsPayload] = useState<StandingsChampionsPayload | null>(null)
  const [bracketLoading, setBracketLoading] = useState(false)
  const [bracketError, setBracketError] = useState<string | null>(null)

  const [search, setSearch] = useState('')

  const selected = useMemo(
    () => competitions.find((c) => c.id === selectedId) ?? null,
    [competitions, selectedId],
  )

  const visual = useMemo(() => getCompetitionVisual(selected?.type), [selected?.type])
  const kind = useMemo(() => normalizeCompetitionType(selected?.type), [selected?.type])

  useEffect(() => {
    let cancelled = false

    const loadHub = async () => {
      setHubLoading(true)
      setHubError(null)
      try {
        let res
        try {
          res = await api.get<unknown>('/competitions/hub')
        } catch (firstErr: unknown) {
          const status = (firstErr as { response?: { status?: number } })?.response?.status
          if (status === 404) {
            res = await api.get<unknown>('/competitions')
          } else {
            throw firstErr
          }
        }

        if (cancelled) return

        const payload = res.data
        const payloadIsArray = Array.isArray(payload)
        const nestedArray =
          payload &&
          typeof payload === 'object' &&
          Array.isArray((payload as { data?: unknown }).data)
        const list = normalizeHubCompetitionsPayload(payload)
        if (!payloadIsArray && !nestedArray && payload != null && typeof payload === 'object' && list.length === 0) {
          setHubError('Réponse compétitions inattendue (format non reconnu).')
          setCompetitions([])
          return
        }

        setCompetitions(list)
        if (list.length > 0) {
          setSelectedId((prev) => {
            if (prev && list.some((c) => c.id === prev)) return prev
            return list[0]?.id ?? null
          })
        }
      } catch {
        if (!cancelled) {
          setHubError('Impossible de charger les compétitions.')
          setCompetitions([])
        }
      } finally {
        if (!cancelled) setHubLoading(false)
      }
    }

    void loadHub()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadMyTeam = async () => {
      try {
        const res = await api.get<{ id: string }>('/teams/my-team')
        if (!cancelled) setMyTeamId(res.data?.id ?? null)
      } catch {
        if (!cancelled) setMyTeamId(null)
      }
    }

    void loadMyTeam()
    return () => {
      cancelled = true
    }
  }, [])

  const fetchLeague = useCallback(async (competitionId: string) => {
    setLeagueLoading(true)
    setLeagueError(null)
    try {
      const res = await api.get<LadderTeam[]>('/teams/ladder', { params: { competitionId } })
      const raw = res.data ?? []
      setLeagueRows(
        raw.map((t) => ({
          ...t,
          teamName:
            typeof t?.teamName === 'string' && t.teamName.length > 0 ? t.teamName : 'Sans nom',
        })),
      )
    } catch {
      setLeagueError('Impossible de charger le classement de cette ligue.')
      setLeagueRows([])
    } finally {
      setLeagueLoading(false)
    }
  }, [])

  const fetchBracket = useCallback(async (competitionId: string) => {
    setBracketLoading(true)
    setBracketError(null)
    setCupPayload(null)
    setChampionsPayload(null)
    try {
      const res = await api.get<StandingsCupPayload | StandingsChampionsPayload>(
        `/competitions/${competitionId}/standings`,
      )
      const data = res.data
      if (data.type === 'CUP') {
        setCupPayload(data)
      } else if (data.type === 'CHAMPIONS') {
        setChampionsPayload(data)
      } else {
        setBracketError('Type de compétition inattendu pour l’arbre.')
      }
    } catch {
      setBracketError('Impossible de charger l’arbre de cette compétition.')
    } finally {
      setBracketLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedId || !selected) {
      setLeagueRows([])
      setCupPayload(null)
      setChampionsPayload(null)
      return
    }

    if (kind === 'LEAGUE') {
      setCupPayload(null)
      setChampionsPayload(null)
      void fetchLeague(selectedId)
      return
    }

    if (kind === 'CUP' || kind === 'CHAMPIONS') {
      setLeagueRows([])
      void fetchBracket(selectedId)
      return
    }

    setLeagueRows([])
    setCupPayload(null)
    setChampionsPayload(null)
  }, [selectedId, selected, kind, fetchLeague, fetchBracket])

  const filteredLeague = useMemo(() => {
    if (!search.trim()) return leagueRows
    const q = search.toLowerCase()
    return leagueRows.filter((t) => (t.teamName ?? '').toLowerCase().includes(q))
  }, [leagueRows, search])

  const cupRounds = cupPayload?.rounds ?? []
  const cupHasMatches = cupRounds.some((r) => r.matches.length > 0)

  const knockoutRounds = championsPayload?.knockoutRounds ?? []
  const championsKnockoutCount = knockoutRounds.reduce((acc, r) => acc + r.matches.length, 0)
  const groupCount = championsPayload?.groups?.length ?? 0

  const showLeagueTable = kind === 'LEAGUE' && selectedId
  const showBracketZone = (kind === 'CUP' || kind === 'CHAMPIONS') && selectedId

  const viewLoading = kind === 'LEAGUE' ? leagueLoading : showBracketZone ? bracketLoading : false
  const viewError = kind === 'LEAGUE' ? leagueError : bracketError

  const prepLinesCup = useMemo(() => {
    const lines: string[] = []
    if ((selected?.matchCount ?? 0) === 0) {
      lines.push('Aucun match n’est encore rattaché à cette compétition dans la base (competition_id + matchs).')
    } else {
      lines.push(
        `${selected?.matchCount} match(s) lié(s), mais aucune rencontre exploitable pour l’arbre (tours vides ou non groupés).`,
      )
    }
    lines.push('Les administrateurs doivent générer le calendrier / le bracket pour que les tours s’affichent.')
    return lines
  }, [selected?.matchCount])

  const prepLinesChampions = useMemo(() => {
    const lines: string[] = []
    if (groupCount > 0 && championsKnockoutCount === 0) {
      lines.push(
        `Phase de poules détectée (${groupCount} groupe(s)), mais aucun match d’élimination directe n’est encore exposé dans les données « knockout ».`,
      )
    } else if ((selected?.matchCount ?? 0) === 0) {
      lines.push('Aucun match n’est encore associé à cette compétition.')
    } else {
      lines.push(
        'Les matchs existent, mais aucune phase KO n’est renvoyée (filtrage des rounds de type « Groupe » côté API).',
      )
    }
    lines.push('Vérifiez que les matchs KO ont un libellé de tour cohérent (hors préfixe « Groupe »).')
    return lines
  }, [groupCount, championsKnockoutCount, selected?.matchCount])

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-omjep-border bg-omjep-bg-panel px-5 py-5 shadow-[var(--omjep-shadow-lg)] sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute inset-0 opacity-95" style={{ backgroundImage: visual.headerGlow }} />
        <div className="relative space-y-4">
          <DashboardPageHeading
            eyebrow="Competition hub"
            title="Classement compétition"
            subtitle={
              hubLoading
                ? 'Chargement des compétitions…'
                : selected
                  ? `${selected.name} · ${visual.label}`
                  : 'Sélectionnez une compétition pour afficher le classement ou l’arbre officiel'
            }
            className="border-b-0 pb-0"
          />

          {hubError ? (
            <div className="rounded-xl border border-omjep-border/80 bg-omjep-bg-panel-soft/90 px-4 py-3 text-sm text-omjep-text-secondary">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-omjep-text-muted" aria-hidden />
                <span>{hubError}</span>
              </div>
            </div>
          ) : null}

          {!hubLoading && !hubError && competitions.length === 0 ? (
            <div className="rounded-2xl border border-omjep-border/70 bg-omjep-bg-panel-soft/80 px-6 py-12 text-center">
              <Trophy className="mx-auto h-10 w-10 text-omjep-text-muted" aria-hidden />
              <p className="mt-3 font-heading text-base font-bold text-omjep-text-primary">Aucune compétition publiée</p>
              <p className="mt-2 text-sm text-omjep-text-secondary">
                Dès qu’une compétition est créée côté administration, elle apparaîtra ici pour le classement et l’arbre.
              </p>
            </div>
          ) : !hubLoading && hubError ? null : (
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {competitions.map((c) => {
                const v = getCompetitionVisual(c.type)
                const active = c.id === selectedId
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`min-w-[200px] shrink-0 rounded-2xl border px-4 py-3 text-left transition ${
                      active ? v.chipActive : v.chipIdle
                    }`}
                  >
                    <p className="truncate text-sm font-black text-omjep-text-primary">{c.name}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${v.typeBadge}`}>
                        {v.label}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${v.statusBadge}`}>
                        {statusLabelFr(c.status)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {selected ? (
            <div className="rounded-2xl border border-omjep-border/70 bg-omjep-bg-panel-soft/60 px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${visual.typeBadge}`}>
                      {visual.label}
                    </span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${visual.statusBadge}`}>
                      {statusLabelFr(selected.status)}
                    </span>
                  </div>
                  <p className="font-heading text-lg font-black text-omjep-text-primary">{selected.name}</p>
                  <p className="text-xs text-omjep-text-secondary">
                    {selected.teamCount} club{selected.teamCount > 1 ? 's' : ''}{' '}
                    inscrit{selected.teamCount > 1 ? 's' : ''} · {selected.matchCount} match
                    {selected.matchCount > 1 ? 's' : ''} enregistré{selected.matchCount > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {showLeagueTable ? (
            <label className="relative block w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-omjep-text-muted" />
              <input
                type="text"
                placeholder="Rechercher un club…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft py-2.5 pl-10 pr-4 text-sm text-omjep-text-primary placeholder:text-omjep-text-muted focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--omjep-mauve)_35%,transparent)]"
              />
            </label>
          ) : null}
        </div>
      </section>

      {viewError ? (
        <div className="rounded-2xl border border-omjep-border/80 bg-omjep-bg-panel-soft/90 px-5 py-4 text-sm text-omjep-text-secondary shadow-[var(--omjep-shadow-lg)]">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-omjep-text-muted" aria-hidden />
            <span>{viewError}</span>
          </div>
        </div>
      ) : null}

      {selected && kind === 'UNKNOWN' ? (
        <div className="rounded-2xl border border-omjep-border/70 bg-omjep-bg-panel px-5 py-8 text-center text-sm text-omjep-text-secondary">
          Type de compétition non reconnu ({String(selected.type)}). Impossible d’afficher un mode classement ou arbre.
        </div>
      ) : null}

      {showLeagueTable ? (
        <section className="overflow-hidden rounded-2xl border border-omjep-border bg-omjep-bg-panel shadow-[var(--omjep-shadow-lg)]">
          <header className="grid grid-cols-[4rem_minmax(12rem,1.5fr)_repeat(8,minmax(2.2rem,0.7fr))] items-center gap-2 border-b border-omjep-border/70 bg-omjep-bg-panel-soft/80 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-omjep-text-muted">
            <span>Rang</span>
            <span>Club</span>
            <span className="text-center">MJ</span>
            <span className="text-center">V</span>
            <span className="text-center">N</span>
            <span className="text-center">D</span>
            <span className="text-center">BP</span>
            <span className="text-center">BC</span>
            <span className="text-center">Diff</span>
            <span className="text-center">Pts</span>
          </header>

          <ul className="space-y-2 p-3 sm:p-4">
            {viewLoading ? (
              Array.from({ length: 8 }).map((_, idx) => <SkeletonRow key={`ladder-skel-${idx}`} />)
            ) : filteredLeague.length === 0 ? (
              <li className="rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-omjep-border/70 bg-omjep-bg-panel">
                  {search.trim() ? (
                    <Search className="h-6 w-6 text-omjep-text-muted" />
                  ) : (
                    <ShieldAlert className="h-6 w-6 text-omjep-text-muted" />
                  )}
                </div>
                <p className="mt-3 text-sm text-omjep-text-secondary">
                  {search.trim()
                    ? `Aucun club trouvé pour « ${search} »`
                    : 'Aucun club inscrit sur cette compétition.'}
                </p>
              </li>
            ) : (
              filteredLeague.map((team) => {
                const globalRank =
                  team.rank > 0
                    ? team.rank
                    : leagueRows.findIndex((t) => t.teamId === team.teamId) + 1
                const isMyTeam = team.teamId === myTeamId

                return (
                  <li
                    key={team.teamId}
                    className={`group grid grid-cols-[4rem_minmax(12rem,1.5fr)_repeat(8,minmax(2.2rem,0.7fr))] items-center gap-2 rounded-xl border px-4 py-3 transition ${
                      isMyTeam
                        ? 'border-[color-mix(in_srgb,var(--omjep-mauve)_46%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-mauve)_14%,var(--omjep-bg-panel-soft))]'
                        : 'border-omjep-border/60 bg-omjep-bg-panel-soft/72 hover:border-[color-mix(in_srgb,var(--omjep-mauve)_24%,var(--omjep-border))]'
                    }`}
                  >
                    <div className="flex justify-center">
                      <RankBlock rank={globalRank} visual={visual} />
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
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-bold uppercase ${visual.typeBadge}`}
                          >
                            {(team.teamName ?? '?').charAt(0) || '?'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-omjep-text-primary">{team.teamName ?? '—'}</p>
                          <div className="mt-0.5 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-omjep-text-muted">
                            <span className="rounded-full border border-omjep-border/60 bg-omjep-bg-panel px-1.5 py-[1px] font-bold">
                              {team.memberCount ?? 0} joueurs
                            </span>
                            {isMyTeam ? (
                              <span className="font-bold text-[color-mix(in_srgb,var(--omjep-mauve)_88%,var(--omjep-text-primary))]">
                                Mon club
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <StatCell value={`${team.matchesPlayed ?? 0}`} />
                    </div>
                    <div className="flex justify-center">
                      <StatCell value={`${team.wins ?? 0}`} />
                    </div>
                    <div className="flex justify-center">
                      <StatCell value={`${team.draws ?? 0}`} />
                    </div>
                    <div className="flex justify-center">
                      <StatCell value={`${team.losses ?? 0}`} />
                    </div>
                    <div className="flex justify-center">
                      <StatCell value={`${team.goalsFor ?? 0}`} />
                    </div>
                    <div className="flex justify-center">
                      <StatCell value={`${team.goalsAgainst ?? 0}`} />
                    </div>
                    <div className="flex justify-center">
                      <StatCell value={formatDiff(team.goalDifference ?? 0)} />
                    </div>
                    <div className="flex justify-center">
                      <StatCell value={`${team.points ?? 0}`} accent accentClass={visual.ptsStatAccent} />
                    </div>
                  </li>
                )
              })
            )}
          </ul>

          <footer className="flex items-center justify-between border-t border-omjep-border/70 px-4 py-3 text-xs text-omjep-text-muted">
            <span>
              {viewLoading
                ? '…'
                : search.trim()
                  ? `${filteredLeague.length} résultat${filteredLeague.length > 1 ? 's' : ''}`
                  : `${leagueRows.length} club${leagueRows.length > 1 ? 's' : ''} · stats sur matchs PLAYED / VALIDATED / FINISHED avec scores`}
            </span>
            <span className="text-omjep-text-muted">OMJEP</span>
          </footer>
        </section>
      ) : null}

      {showBracketZone ? (
        <section className="space-y-4">
          {viewLoading ? <SkeletonBracket /> : null}

          {!viewLoading && kind === 'CUP' ? (
            cupHasMatches ? (
              <BracketRoundsSection rounds={cupRounds} visual={visual} myTeamId={myTeamId} />
            ) : (
              <PrepTreeState visual={visual} title="Arbre en préparation" lines={prepLinesCup} />
            )
          ) : null}

          {!viewLoading && kind === 'CHAMPIONS' ? (
            championsKnockoutCount > 0 ? (
              <>
                {groupCount > 0 ? (
                  <p className="text-xs text-omjep-text-secondary">
                    Phase de poules : {groupCount} groupe(s) — affichage des éliminatoires uniquement.
                  </p>
                ) : null}
                <BracketRoundsSection rounds={knockoutRounds} visual={visual} myTeamId={myTeamId} />
              </>
            ) : (
              <PrepTreeState visual={visual} title="Arbre en préparation" lines={prepLinesChampions} />
            )
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
