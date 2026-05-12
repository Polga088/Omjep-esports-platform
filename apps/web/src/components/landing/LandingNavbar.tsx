import { Link, useLocation } from 'react-router-dom'
import { Bell, Crown, LogIn, LogOut, Menu, Moon, Sun, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/context/ThemeContext'

type NavKey = 'join' | 'leaderboard' | 'community' | 'palmares'

const navItems: { key: NavKey; to: string; label: string }[] = [
  { key: 'join', to: '/', label: 'Rejoindre OMJEP' },
  { key: 'leaderboard', to: '/dashboard/ladder', label: 'Classement' },
  { key: 'community', to: '/community', label: 'Community' },
  { key: 'palmares', to: '/palmares', label: 'Palmarès' },
]

const isNavActive = (key: NavKey, pathname: string) => {
  if (key === 'join') return pathname === '/' || pathname === '/join'
  if (key === 'community') return pathname === '/community' || pathname.startsWith('/community/')
  if (key === 'palmares') return pathname === '/palmares' || pathname.startsWith('/palmares/')
  if (key === 'leaderboard')
    return pathname === '/dashboard/ladder' || pathname.startsWith('/dashboard/ladder')
  return false
}

export default function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const authed = isAuthenticated()
  const { pathname } = location

  const navLinkClass = (key: NavKey) => {
    const active = isNavActive(key, pathname)
    const palmaresActive = key === 'palmares' && active
    if (active) {
      return [
        'rounded-lg px-2.5 py-1.5 text-xs font-semibold tracking-tight transition-colors xl:px-3 xl:text-sm',
        palmaresActive
          ? 'bg-[color-mix(in_srgb,var(--omjep-mauve)_18%,var(--omjep-bg-panel-soft))] text-omjep-text-primary ring-1 ring-[color-mix(in_srgb,var(--omjep-gold)_42%,var(--omjep-mauve))]'
          : 'bg-[color-mix(in_srgb,var(--omjep-mauve)_16%,var(--omjep-bg-panel-soft))] text-omjep-text-primary ring-1 ring-[color-mix(in_srgb,var(--omjep-mauve)_32%,var(--omjep-border))] shadow-[var(--omjep-glow-mauve-soft)]',
      ].join(' ')
    }
    return 'rounded-lg px-2.5 py-1.5 text-xs font-medium tracking-tight text-omjep-text-secondary transition-colors hover:text-omjep-text-primary xl:px-3 xl:text-sm'
  }

  const mobileRowClass = (key: NavKey) => {
    const active = isNavActive(key, pathname)
    if (active) {
      return 'block rounded-lg px-4 py-3 text-sm font-semibold text-omjep-text-primary bg-[color-mix(in_srgb,var(--omjep-mauve)_14%,var(--omjep-bg-panel-soft))] ring-1 ring-[color-mix(in_srgb,var(--omjep-mauve)_22%,var(--omjep-border))]'
    }
    return 'block rounded-lg px-4 py-3 text-sm font-medium text-omjep-text-secondary hover:bg-omjep-bg-panel-soft/80 hover:text-omjep-text-primary'
  }

  const ThemeToggle = ({ className = '' }: { className?: string }) => (
    <button
      type="button"
      onClick={() => toggleTheme()}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft/90 text-omjep-text-primary shadow-sm transition hover:border-[color-mix(in_srgb,var(--omjep-mauve)_40%,var(--omjep-border))] hover:bg-omjep-bg-panel ${className}`}
      aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 text-[color-mix(in_srgb,var(--omjep-gold)_85%,#fff)]" aria-hidden />
      ) : (
        <Moon className="h-4 w-4 text-omjep-mauve" aria-hidden />
      )}
    </button>
  )

  const NotificationsBtn = ({ className = '' }: { className?: string }) => (
    <button
      type="button"
      className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft/90 text-omjep-text-primary shadow-sm transition hover:border-[color-mix(in_srgb,var(--omjep-mauve)_40%,var(--omjep-border))] ${className}`}
      aria-label="Notifications, 3 non lues (démo)"
    >
      <Bell className="h-4 w-4" aria-hidden />
      <span className="landing-nav-notify-badge absolute right-1.5 top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-0.5 text-[9px] font-black tabular-nums text-[color-mix(in_srgb,var(--omjep-bg)_92%,#000)]">
        3
      </span>
    </button>
  )

  const RightCluster = ({ className = '' }: { className?: string }) => (
    <div className={`flex shrink-0 items-center gap-1.5 sm:gap-2 ${className}`}>
      <NotificationsBtn />
      <ThemeToggle />
      {authed ? (
        <>
          <Link
            to="/dashboard"
            className="inline-flex min-w-0 max-w-[10rem] items-center truncate rounded-xl border border-[color-mix(in_srgb,var(--omjep-gold)_38%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_8%,var(--omjep-bg-panel-soft))] px-3 py-2 text-xs font-semibold text-omjep-text-primary transition hover:border-[color-mix(in_srgb,var(--omjep-gold)_55%,var(--omjep-mauve))] xl:max-w-[14rem]"
          >
            <span className="truncate">Portail compétition</span>
          </Link>
          {user?.ea_persona_name ? (
            <span className="max-w-[6.5rem] truncate text-[11px] text-omjep-text-muted xl:max-w-[8rem]">{user.ea_persona_name}</span>
          ) : null}
          <button
            type="button"
            onClick={() => logout()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-omjep-border/75 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_90%,transparent)] px-3 py-2 text-xs font-semibold text-omjep-text-primary transition hover:border-[color-mix(in_srgb,var(--omjep-mauve)_38%,var(--omjep-border))]"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
            Déconnexion
          </button>
        </>
      ) : (
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 rounded-xl border border-omjep-border/75 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_90%,transparent)] px-3 py-2 text-xs font-semibold text-omjep-text-primary transition hover:border-[color-mix(in_srgb,var(--omjep-mauve)_38%,var(--omjep-border))]"
        >
          <LogIn className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
          Connexion
        </Link>
      )}
    </div>
  )

  return (
    <header className="landing-nav-premium fixed left-0 right-0 top-0 z-50 border-b border-[color-mix(in_srgb,var(--omjep-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--omjep-bg)_92%,#050814)]/92 backdrop-blur-xl backdrop-saturate-150 dark:border-[color-mix(in_srgb,var(--omjep-border-gold)_16%,var(--omjep-border))] dark:bg-[color-mix(in_srgb,var(--omjep-bg)_94%,#020308)]/94">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="grid h-[4.25rem] grid-cols-[minmax(0,auto)_minmax(0,1fr)_minmax(0,auto)] items-center gap-2 sm:gap-3 lg:gap-4">
          <Link to="/" className="group flex min-w-0 max-w-[11rem] items-center gap-2 sm:max-w-none sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--omjep-border-gold)_38%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_12%,var(--omjep-bg-panel-soft))] shadow-[var(--omjep-glow-gold-soft)] ring-1 ring-[color-mix(in_srgb,var(--omjep-mauve)_18%,transparent)] transition group-hover:border-[color-mix(in_srgb,var(--omjep-mauve)_42%,var(--omjep-border))] sm:h-10 sm:w-10">
              <Crown
                className="h-[1.15rem] w-[1.15rem] text-[color-mix(in_srgb,var(--omjep-gold)_78%,var(--omjep-mauve))] sm:h-5 sm:w-5"
                fill="currentColor"
                aria-hidden
              />
            </div>
            <div className="min-w-0">
              <span className="font-display text-base font-bold uppercase tracking-tighter text-omjep-text-primary sm:text-lg">
                OMJEP
              </span>
              <span className="hidden font-sans text-[9px] uppercase tracking-widest text-omjep-text-muted sm:block">
                Pro Clubs · EA FC · Maroc
              </span>
            </div>
          </Link>

          <nav
            className="hidden min-w-0 justify-center justify-self-center lg:flex"
            aria-label="Navigation principale"
          >
            <div className="flex max-w-full flex-nowrap items-center justify-center gap-0.5 xl:gap-1">
              {navItems.map((item) => (
                <Link key={item.key} to={item.to} className={`whitespace-nowrap ${navLinkClass(item.key)}`}>
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          <div className="flex min-w-0 items-center justify-end justify-self-end gap-1.5">
            <div className="hidden lg:flex">
              <RightCluster />
            </div>
            <div className="flex items-center gap-1.5 lg:hidden">
              <NotificationsBtn />
              <ThemeToggle />
              <button
                type="button"
                onClick={() => setMobileOpen(!mobileOpen)}
                className="rounded-lg p-2 text-omjep-text-secondary transition hover:bg-omjep-bg-panel-soft/80 hover:text-omjep-text-primary"
                aria-expanded={mobileOpen}
                aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              >
                {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-omjep-border/60 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_97%,var(--omjep-bg))]/96 px-4 py-4 backdrop-blur-xl lg:hidden">
          <div className="space-y-0.5">
            {navItems.map((item) => (
              <Link
                key={item.key}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={mobileRowClass(item.key)}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 border-t border-omjep-border/50 pt-3">
            {authed ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg border border-omjep-border/80 bg-omjep-bg-panel py-3 text-center text-sm font-semibold text-omjep-text-primary"
                >
                  Portail compétition
                </Link>
                {user?.ea_persona_name ? (
                  <p className="truncate px-1 text-center text-xs text-omjep-text-muted">{user.ea_persona_name}</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    setMobileOpen(false)
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-omjep-border/70 py-3 text-sm font-semibold text-omjep-text-primary"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg py-3 text-center text-sm text-omjep-text-secondary"
                >
                  Connexion
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="omjep-btn-primary block rounded-lg py-3 text-center text-sm font-semibold normal-case tracking-normal"
                >
                  Créer mon profil
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  )
}
