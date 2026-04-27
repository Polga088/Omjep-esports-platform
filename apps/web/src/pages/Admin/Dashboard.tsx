import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import {
  Crown,
  Trophy,
  Swords,
  Users,
  Shield,
  Scale,
  Loader2,
  ArrowRight,
  AlertTriangle,
  ShoppingBag,
} from 'lucide-react'
import api from '@/lib/api'
import TacticalBentoStatLinkCard from '@/components/TacticalBentoStatLinkCard'

interface ScoreReport {
  reporting_team_id: string
  home_score: number
  away_score: number
}

interface ModMatch {
  id: string
  status: string
  home_team_id: string
  away_team_id: string
  scoreReports: ScoreReport[]
}

function modMatchReadyToValidate(m: ModMatch): boolean {
  if (m.status !== 'SCHEDULED') return false
  const home = m.scoreReports.find((r) => r.reporting_team_id === m.home_team_id)
  const away = m.scoreReports.find((r) => r.reporting_team_id === m.away_team_id)
  if (!home || !away) return false
  return home.home_score === away.home_score && home.away_score === away.away_score
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [competitionsCount, setCompetitionsCount] = useState(0)
  const [matchesScheduled, setMatchesScheduled] = useState(0)
  const [matchesDisputed, setMatchesDisputed] = useState(0)
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersByRole, setUsersByRole] = useState<Record<string, number>>({})
  const [clubsCount, setClubsCount] = useState(0)
  const [scoresReady, setScoresReady] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError('')
      try {
        const [compsRes, matchesRes, usersRes, teamsRes, modMatchesRes] = await Promise.allSettled([
          api.get('/admin/competitions'),
          api.get('/admin/matches'),
          api.get('/users'),
          api.get('/teams'),
          api.get('/moderator/league/matches'),
        ])

        if (cancelled) return

        if (compsRes.status === 'fulfilled') {
          const d = compsRes.value.data?.data ?? compsRes.value.data
          setCompetitionsCount(Array.isArray(d) ? d.length : 0)
        }

        if (matchesRes.status === 'fulfilled') {
          const d = matchesRes.value.data?.data ?? matchesRes.value.data
          const list = Array.isArray(d) ? d : []
          const withCompetition = list.filter(
            (x: { status: string; competition?: { id: string } | null }) =>
              x.competition != null && x.competition.id != null,
          )
          setMatchesScheduled(
            withCompetition.filter((x: { status: string }) => x.status === 'SCHEDULED' || x.status === 'LIVE')
              .length,
          )
          setMatchesDisputed(withCompetition.filter((x: { status: string }) => x.status === 'DISPUTED').length)
        }

        if (usersRes.status === 'fulfilled') {
          const d = usersRes.value.data?.data ?? usersRes.value.data
          const list = Array.isArray(d) ? d : []
          setUsersTotal(list.length)
          const by: Record<string, number> = {}
          for (const u of list as { role?: string }[]) {
            const r = u.role ?? 'PLAYER'
            by[r] = (by[r] ?? 0) + 1
          }
          setUsersByRole(by)
        }

        if (teamsRes.status === 'fulfilled') {
          const d = teamsRes.value.data?.data ?? teamsRes.value.data
          setClubsCount(Array.isArray(d) ? d.length : 0)
        }

        if (modMatchesRes.status === 'fulfilled') {
          const d = modMatchesRes.value.data?.data ?? modMatchesRes.value.data
          const list = Array.isArray(d) ? (d as ModMatch[]) : []
          setScoresReady(list.filter(modMatchReadyToValidate).length)
        } else {
          setScoresReady(0)
        }

        const failed = [compsRes, matchesRes, usersRes, teamsRes].filter((r) => r.status === 'rejected')
        if (failed.length > 0) {
          setError('Certaines métriques n’ont pas pu être chargées (droits ou réseau).')
        }
      } catch {
        if (!cancelled) setError('Chargement du tableau de bord impossible.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const roleSummary = useMemo(() => {
    const parts = ['ADMIN', 'MODERATOR', 'MANAGER', 'PLAYER'].map(
      (r) => `${r}: ${usersByRole[r] ?? 0}`,
    )
    return parts.join(' · ')
  }, [usersByRole])

  if (loading) {
    return (
      <div className="tactical-bento flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-omjep-gold" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="tactical-bento p-5">
        <h1 className="omjep-title-aaa flex items-center gap-3 text-2xl tracking-tight">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-omjep-gold/25 bg-omjep-gold/10">
            <Crown className="h-5 w-5 text-omjep-gold" strokeWidth={1.75} />
          </div>
          Tableau de bord — Super Admin
        </h1>
        <p className="ml-[52px] mt-2 max-w-2xl text-sm text-omjep-neutral">
          Vue d’ensemble OMJEP : compétitions, matchs, comptes et validation ligue. Les actions
          sensibles restent réservées au rôle ADMIN ; l’espace commissaire est partagé avec les
          MODERATOR.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="tactical-floating-panel flex items-start gap-3 border border-omjep-danger/40 px-4 py-3 text-sm text-omjep-neutral backdrop-blur-xl"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-omjep-danger" strokeWidth={1.75} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <TacticalBentoStatLinkCard
          to="/admin/competitions"
          label="Compétitions"
          value={competitionsCount}
          hint="Ligues & coupes"
          icon={Trophy}
          hudTopLeft="CMP"
          hudBottomRight="LIG"
          iconTone="gold"
        />
        <TacticalBentoStatLinkCard
          to="/admin/matches"
          label="Matchs à jouer"
          value={matchesScheduled}
          hint="Saisie résultats admin"
          icon={Swords}
          hudTopLeft="MCH"
          hudBottomRight="LIVE"
          iconTone="gold"
        />
        <TacticalBentoStatLinkCard
          to="/moderator/matches"
          label="Scores prêts (double déclaration)"
          value={scoresReady}
          hint="Validation commissaire"
          icon={Scale}
          hudTopLeft="VAL"
          hudBottomRight="DUAL"
          iconTone="neutral"
        />
        <TacticalBentoStatLinkCard
          to="/admin/matches"
          label="Matchs en litige"
          value={matchesDisputed}
          hint="À traiter côté matchs"
          icon={AlertTriangle}
          hudTopLeft="DSP"
          hudBottomRight="ALRT"
          iconTone="neutral"
          labelVariant="danger"
        />
        <TacticalBentoStatLinkCard
          to="/admin/users"
          label="Utilisateurs"
          value={usersTotal}
          hint={roleSummary}
          icon={Users}
          hudTopLeft="USR"
          hudBottomRight="Roster"
          iconTone="gold"
        />
        <TacticalBentoStatLinkCard
          to="/admin/clubs"
          label="Clubs"
          value={clubsCount}
          hint="Rosters & équipes"
          icon={Shield}
          hudTopLeft="CLB"
          hudBottomRight="TEAM"
          iconTone="gold"
        />
      </div>

      <div className="tactical-bento p-5">
        <h2 className="mb-3 text-sm font-semibold text-omjep-gold/90">Raccourcis</h2>
        <div className="flex flex-wrap gap-2">
          <QuickLink to="/admin/competitions" label="Gérer les compétitions" />
          <QuickLink to="/admin/matches" label="Gérer les matchs" />
          <QuickLink to="/admin/users" label="Comptes & rôles" />
          <QuickLink to="/admin/clubs" label="Clubs" />
          <QuickLink to="/admin/store" label="Gestion boutique (Jepy / VIP)" icon={ShoppingBag} />
          <QuickLink to="/moderator/matches" label="Espace commissaire — scores" />
        </div>
      </div>
    </div>
  )
}

function QuickLink({
  to,
  label,
  icon: Icon,
}: {
  to: string
  label: string
  icon?: ComponentType<{ className?: string }>
}) {
  return (
    <Link
      to={to}
      className="tactical-btn inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs"
    >
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-omjep-gold/80 opacity-90" /> : null}
      {label}
      <ArrowRight className="h-3 w-3 text-omjep-neutral/50" />
    </Link>
  )
}
