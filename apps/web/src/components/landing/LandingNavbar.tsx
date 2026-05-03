import { Link, useLocation } from 'react-router-dom'
import { Bell, Crown, LogIn, LogOut, Menu, Moon, Sun, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/context/ThemeContext'

const navLinks = [
  { to: '/', label: 'Rejoindre OMJEP' },
  { to: '/plateforme', label: 'Vue data' },
  { to: '/community', label: 'Community' },
  { to: '/palmares', label: 'Palmarès' },
] as const

export default function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const authed = isAuthenticated()

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '/join'
    return location.pathname === path
  }

  const navLinkClass = (path: string) => {
    const active = isActive(path)
    const palmaresGlow = path === '/palmares' && active
    return [
      'relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
      active
        ? palmaresGlow
          ? 'bg-[color-mix(in_srgb,var(--omjep-mauve)_18%,var(--omjep-bg-panel-soft))] text-omjep-text-primary landing-nav-link--active-palmares ring-1 ring-[color-mix(in_srgb,var(--omjep-gold)_42%,var(--omjep-mauve))]'
          : 'bg-[color-mix(in_srgb,var(--omjep-mauve)_14%,var(--omjep-bg-panel-soft))] text-omjep-text-primary ring-1 ring-[color-mix(in_srgb,var(--omjep-mauve)_28%,var(--omjep-border))]'
        : 'text-omjep-text-secondary hover:bg-omjep-bg-panel-soft/80 hover:text-omjep-text-primary',
    ].join(' ')
  }

  const ThemeToggle = ({ className = '' }: { className?: string }) => (
    <button
      type="button"
      onClick={() => toggleTheme()}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft/80 text-omjep-text-primary shadow-sm transition hover:border-[color-mix(in_srgb,var(--omjep-mauve)_35%,var(--omjep-border))] hover:bg-omjep-bg-panel ${className}`}
      aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4 text-[color-mix(in_srgb,var(--omjep-gold)_85%,#fff)]" /> : <Moon className="h-4 w-4 text-omjep-mauve" />}
    </button>
  )

  const NotificationsBtn = ({ className = '' }: { className?: string }) => (
    <button
      type="button"
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft/80 text-omjep-text-primary shadow-sm transition hover:border-[color-mix(in_srgb,var(--omjep-mauve)_35%,var(--omjep-border))] ${className}`}
      aria-label="Notifications, 3 non lues (démo)"
    >
      <Bell className="h-4 w-4" aria-hidden />
      <span className="landing-nav-notify-badge absolute right-1.5 top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-0.5 text-[9px] font-black tabular-nums text-[color-mix(in_srgb,var(--omjep-bg)_92%,#000)]">
        3
      </span>
    </button>
  )

  return (
    <header className="landing-nav-premium fixed left-0 right-0 top-0 z-50 border-b border-[color-mix(in_srgb,var(--omjep-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--omjep-bg)_92%,#050814)]/92 backdrop-blur-xl backdrop-saturate-150 dark:border-[color-mix(in_srgb,var(--omjep-border-gold)_16%,var(--omjep-border))] dark:bg-[color-mix(in_srgb,var(--omjep-bg)_94%,#020308)]/94">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-[4.25rem] items-center justify-between gap-3">
          <Link to="/" className="group flex min-w-0 shrink-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--omjep-border-gold)_38%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_12%,var(--omjep-bg-panel-soft))] shadow-[var(--omjep-glow-gold-soft)] ring-1 ring-[color-mix(in_srgb,var(--omjep-mauve)_18%,transparent)] transition group-hover:border-[color-mix(in_srgb,var(--omjep-mauve)_42%,var(--omjep-border))]">
              <Crown
                className="h-5 w-5 text-[color-mix(in_srgb,var(--omjep-gold)_78%,var(--omjep-mauve))]"
                fill="currentColor"
              />
            </div>
            <div className="min-w-0">
              <span className="font-display text-lg font-bold uppercase tracking-tighter text-omjep-text-primary">
                OMJEP
              </span>
              <span className="hidden font-sans text-[9px] uppercase tracking-widest text-omjep-text-muted sm:block">
                Pro Clubs · EA FC · Maroc
              </span>
            </div>
          </Link>

          <nav className="hidden min-w-0 items-center gap-0.5 lg:flex" aria-label="Navigation principale">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} className={navLinkClass(link.to)}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            <NotificationsBtn />
            <ThemeToggle />
            {authed ? (
              <>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--omjep-gold)_42%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_10%,var(--omjep-bg-panel-soft))] px-4 py-2 text-sm font-semibold text-omjep-text-primary transition hover:border-[color-mix(in_srgb,var(--omjep-gold)_62%,var(--omjep-mauve))]"
                >
                  Portail compétition
                </Link>
                <span className="hidden max-w-[8rem] truncate text-xs text-omjep-text-muted xl:inline">{user?.ea_persona_name}</span>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="inline-flex items-center gap-2 rounded-xl border border-omjep-border/75 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_90%,transparent)] px-4 py-2 text-sm font-semibold text-omjep-text-primary transition hover:border-[color-mix(in_srgb,var(--omjep-mauve)_38%,var(--omjep-border))]"
                >
                  <LogOut className="h-4 w-4 opacity-80" aria-hidden />
                  Déconnexion
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-omjep-border/75 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_90%,transparent)] px-4 py-2 text-sm font-semibold text-omjep-text-primary transition hover:border-[color-mix(in_srgb,var(--omjep-mauve)_38%,var(--omjep-border))]"
              >
                <LogIn className="h-4 w-4 opacity-80" aria-hidden />
                Connexion
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <NotificationsBtn />
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-lg p-2 text-omjep-text-secondary transition hover:bg-omjep-bg-panel-soft/80 hover:text-omjep-text-primary"
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-omjep-border/60 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_97%,var(--omjep-bg))]/96 px-4 py-4 backdrop-blur-xl lg:hidden">
          <div className="space-y-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`block rounded-lg px-4 py-3 text-sm font-medium ${
                  isActive(link.to)
                    ? 'bg-[color-mix(in_srgb,var(--omjep-mauve)_14%,var(--omjep-bg-panel-soft))] text-omjep-text-primary ring-1 ring-[color-mix(in_srgb,var(--omjep-mauve)_22%,var(--omjep-border))]'
                    : 'text-omjep-text-secondary hover:bg-omjep-bg-panel-soft/80 hover:text-omjep-text-primary'
                }`}
              >
                {link.label}
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
