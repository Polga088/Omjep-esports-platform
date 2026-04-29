import { Bell, CalendarRange } from 'lucide-react'
import Hero from '@/sections/Hero'
import Statistics from '@/sections/Statistics'
import Leaderboard from '@/sections/Leaderboard'
import LiveMatches from '@/sections/LiveMatches'
import PlayerProfile from '@/sections/PlayerProfile'
import RecentActivity from '@/sections/RecentActivity'
import { dashboardContent } from '@/data/dashboard'

export default function Home() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(30,64,175,0.25),transparent_45%),radial-gradient(circle_at_90%_80%,rgba(5,150,105,0.22),transparent_48%)]" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8">
        <aside className="rounded-3xl border border-white/10 bg-slate-950/75 p-4 lg:sticky lg:top-24 lg:h-fit">
          <p className="text-xs uppercase tracking-[0.22em] text-amber-300">Dashboard officiel</p>
          <h2 className="mt-2 text-lg font-bold text-white">OMJEP EA FC</h2>
          <nav className="mt-4 space-y-2 text-sm">
            <a href="#hero" className="block rounded-lg border border-transparent px-3 py-2 text-slate-300 transition hover:border-emerald-400/30 hover:bg-emerald-500/10 hover:text-white">
              Hero
            </a>
            <a href="#statistics" className="block rounded-lg border border-transparent px-3 py-2 text-slate-300 transition hover:border-emerald-400/30 hover:bg-emerald-500/10 hover:text-white">
              Statistics
            </a>
            <a href="#leaderboard" className="block rounded-lg border border-transparent px-3 py-2 text-slate-300 transition hover:border-emerald-400/30 hover:bg-emerald-500/10 hover:text-white">
              Leaderboard
            </a>
            <a href="#live-matches" className="block rounded-lg border border-transparent px-3 py-2 text-slate-300 transition hover:border-emerald-400/30 hover:bg-emerald-500/10 hover:text-white">
              Live Matches
            </a>
            <a href="#player-profile" className="block rounded-lg border border-transparent px-3 py-2 text-slate-300 transition hover:border-emerald-400/30 hover:bg-emerald-500/10 hover:text-white">
              Player Profile
            </a>
          </nav>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center gap-2 text-emerald-300">
              <CalendarRange className="h-4 w-4" aria-hidden />
              <p className="text-xs uppercase tracking-wider">Tournois officiels</p>
            </div>
            <ul className="mt-2 space-y-2">
              {dashboardContent.tournaments.map((tournament) => (
                <li key={tournament.id} className="rounded-xl border border-white/10 bg-slate-950/70 p-2.5">
                  <p className="text-xs font-semibold text-white">{tournament.name}</p>
                  <p className="text-[11px] text-slate-400">{tournament.season}</p>
                  <p className="text-[11px] text-amber-300">{tournament.status}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center gap-2 text-blue-300">
              <Bell className="h-4 w-4" aria-hidden />
              <p className="text-xs uppercase tracking-wider">Brief compétition</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Plateforme dédiée à la scène eSport marocaine EA FC avec suivi compétitif professionnel.
            </p>
          </div>
        </aside>

        <div className="space-y-6">
          <Hero hero={dashboardContent.hero} />
          <Statistics items={dashboardContent.kpis} />
          <div className="grid gap-6 xl:grid-cols-2">
            <Leaderboard entries={dashboardContent.leaderboard} />
            <LiveMatches matches={dashboardContent.matches} />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <PlayerProfile player={dashboardContent.playerProfile} />
            <RecentActivity activity={dashboardContent.activity} />
          </div>
        </div>
      </div>
    </div>
  )
}
