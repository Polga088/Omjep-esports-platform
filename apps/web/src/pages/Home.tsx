import { Bell, CalendarRange, ChevronRight, LayoutGrid } from 'lucide-react'
import { Link } from 'react-router-dom'
import Hero from '@/sections/Hero'
import Statistics from '@/sections/Statistics'
import Leaderboard from '@/sections/Leaderboard'
import LiveMatches from '@/sections/LiveMatches'
import PlayerProfile from '@/sections/PlayerProfile'
import RecentActivity from '@/sections/RecentActivity'
import { dashboardContent } from '@/data/dashboard'

const navAnchors = [
  { href: '#hero', label: 'Vision' },
  { href: '#statistics', label: 'Indicateurs' },
  { href: '#leaderboard', label: 'Classement' },
  { href: '#live-matches', label: 'Matchs' },
  { href: '#player-profile', label: 'Joueur & club' },
] as const

export default function Home() {
  return (
    <div className="relative min-w-0" data-omjep-public-home="1">
      <div className="pointer-events-none absolute inset-0 opacity-[0.55] dark:opacity-40">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(ellipse 70% 50% at 15% 0%, color-mix(in srgb, var(--omjep-mauve) 16%, transparent), transparent 55%),
              radial-gradient(ellipse 55% 45% at 92% 18%, color-mix(in srgb, var(--omjep-gold) 10%, transparent), transparent 52%),
              radial-gradient(ellipse 50% 40% at 50% 100%, color-mix(in srgb, var(--omjep-mauve) 8%, transparent), transparent 50%)
            `,
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid lg:grid-cols-[minmax(0,220px)_1fr] lg:gap-8 lg:px-8 lg:py-10">
        {/* Mobile: quick anchor strip */}
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 lg:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navAnchors.map((a) => (
            <a
              key={a.href}
              href={a.href}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-omjep-border/70 bg-omjep-bg-panel/90 px-3 py-1.5 text-[11px] font-semibold text-omjep-text-secondary ring-1 ring-[color-mix(in_srgb,var(--omjep-border)_65%,transparent)] backdrop-blur-sm transition hover:border-[color-mix(in_srgb,var(--omjep-mauve)_35%,var(--omjep-border))] hover:text-omjep-text-primary"
            >
              {a.label}
              <ChevronRight className="h-3 w-3 opacity-50" aria-hidden />
            </a>
          ))}
          <Link
            to="/register"
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--omjep-gold)_40%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_12%,var(--omjep-bg-panel-soft))] px-3 py-1.5 text-[11px] font-bold text-omjep-text-primary"
          >
            Créer un club
          </Link>
        </div>

        <aside className="mb-6 hidden rounded-2xl border border-omjep-border/80 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_94%,var(--omjep-bg-elevated))] p-4 shadow-[var(--omjep-shadow-lg)] ring-1 ring-[color-mix(in_srgb,var(--omjep-border)_55%,transparent)] backdrop-blur-md lg:sticky lg:top-24 lg:mb-0 lg:block lg:h-fit lg:self-start">
          <div className="flex items-center gap-2 text-[color-mix(in_srgb,var(--omjep-gold)_85%,var(--omjep-text-secondary))]">
            <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-omjep-text-muted">Hub Pro Clubs</p>
          </div>
          <h2 className="mt-2 font-heading text-lg font-bold tracking-tight text-omjep-text-primary">
            OMJEP · EA FC
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-omjep-text-secondary">
            Calendrier homologué, stats joueurs et parcours club — la couche officielle pour la scène Pro Clubs.
          </p>
          <nav className="mt-4 space-y-1 border-t border-omjep-border/50 pt-4 text-sm" aria-label="Sections page d’accueil">
            {navAnchors.map((a) => (
              <a
                key={a.href}
                href={a.href}
                className="flex items-center justify-between rounded-xl border border-transparent px-3 py-2 text-omjep-text-secondary transition hover:border-[color-mix(in_srgb,var(--omjep-mauve)_28%,var(--omjep-border))] hover:bg-[color-mix(in_srgb,var(--omjep-mauve)_8%,var(--omjep-bg-panel-soft))] hover:text-omjep-text-primary"
              >
                {a.label}
                <ChevronRight className="h-3.5 w-3.5 opacity-40" aria-hidden />
              </a>
            ))}
          </nav>

          <div className="mt-5 rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft/80 p-3">
            <div className="flex items-center gap-2 text-omjep-mauve">
              <CalendarRange className="h-4 w-4 shrink-0" aria-hidden />
              <p className="text-[10px] font-bold uppercase tracking-wider text-omjep-text-secondary">
                Compétitions
              </p>
            </div>
            <ul className="mt-2 space-y-2">
              {dashboardContent.tournaments.map((tournament) => (
                <li
                  key={tournament.id}
                  className="rounded-lg border border-omjep-border/60 bg-omjep-bg-panel/90 p-2.5"
                >
                  <p className="text-xs font-semibold text-omjep-text-primary">{tournament.name}</p>
                  <p className="text-[11px] text-omjep-text-muted">{tournament.season}</p>
                  <p className="text-[11px] font-medium text-[color-mix(in_srgb,var(--omjep-accent-gold)_90%,var(--omjep-text-secondary))]">
                    {tournament.status}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft/80 p-3">
            <div className="flex items-center gap-2 text-omjep-mauve">
              <Bell className="h-4 w-4 shrink-0" aria-hidden />
              <p className="text-[10px] font-bold uppercase tracking-wider text-omjep-text-secondary">
                Aperçu plateforme
              </p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-omjep-text-secondary">
              Portail unique : mercato, classements live, profils EA ID et espace communautaire rattaché à la compétition.
            </p>
            <Link
              to="/register"
              className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--omjep-mauve)_40%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-mauve)_10%,var(--omjep-bg-panel))] py-2 text-center text-xs font-semibold text-omjep-text-primary transition hover:border-[color-mix(in_srgb,var(--omjep-mauve)_55%,var(--omjep-border))] hover:bg-[color-mix(in_srgb,var(--omjep-mauve)_14%,var(--omjep-bg-panel))]"
            >
              Inscrire mon club
            </Link>
          </div>
        </aside>

        <div className="min-w-0 space-y-8 lg:space-y-10">
          <Hero hero={dashboardContent.hero} />
          <Statistics items={dashboardContent.kpis} />
          <div className="grid min-w-0 gap-6 lg:gap-8 xl:grid-cols-2">
            <Leaderboard entries={dashboardContent.leaderboard} />
            <LiveMatches matches={dashboardContent.matches} />
          </div>
          <div className="grid min-w-0 gap-6 lg:gap-8 xl:grid-cols-[1.12fr_0.88fr]">
            <PlayerProfile player={dashboardContent.playerProfile} />
            <RecentActivity activity={dashboardContent.activity} />
          </div>
        </div>
      </div>
    </div>
  )
}
