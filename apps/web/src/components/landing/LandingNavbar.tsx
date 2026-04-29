import { Link, useLocation } from 'react-router-dom';
import { Crown, LogIn, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

const navLinks = [
  { to: '/', label: 'Dashboard' },
  { to: '/#statistics', label: 'KPIs' },
  { to: '/#leaderboard', label: 'Ranking national' },
  { to: '/#live-matches', label: 'Matchs officiels' },
  { to: '/community', label: 'Communauté' },
]

export default function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const authed = isAuthenticated();

  const isActive = (path: string) => {
    if (path.startsWith('/#')) return location.pathname === '/' && location.hash === path.slice(1)
    return location.pathname === path
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-emerald-500/15 bg-[#020202]/65 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="group flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/35 to-emerald-700/20 shadow-[0_0_24px_-4px_rgba(34,197,94,0.4)] ring-1 ring-emerald-400/25 transition group-hover:ring-emerald-400/45">
              <Crown className="h-5 w-5 text-emerald-200" fill="currentColor" />
            </div>
            <div>
              <span className="font-display text-lg font-bold uppercase tracking-tighter text-white">
                OMJEP
              </span>
              <span className="hidden font-sans text-[9px] uppercase tracking-widest text-slate-500 sm:block">
                Organisation Marocaine eSport · EA FC
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  isActive(link.to)
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {authed ? (
              <>
                <span className="max-w-[10rem] truncate text-sm text-slate-500">{user?.ea_persona_name}</span>
                <Link
                  to="/dashboard"
                  className="rounded-lg border-[0.5px] border-white/10 bg-[#08090c] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_-6px_rgba(34,197,94,0.3)] transition-all hover:border-emerald-400/35 hover:shadow-[0_0_28px_-4px_rgba(34,197,94,0.4)]"
                >
                  Accéder au portail compétition
                </Link>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-400 transition hover:border-white/20 hover:text-white"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <LogIn className="h-4 w-4" />
                  Connexion
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg border-[0.5px] border-white/10 bg-[#08090c] px-4 py-2 text-sm font-semibold text-white transition-all hover:border-emerald-400/35 hover:shadow-[0_0_24px_-6px_rgba(34,197,94,0.4)]"
                >
                  Rejoindre OMJEP
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white md:hidden"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-emerald-500/10 bg-[#020202]/95 px-4 py-4 backdrop-blur-xl md:hidden">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`block rounded-lg px-4 py-3 text-sm font-medium ${
                  isActive(link.to) ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 border-t border-white/5 pt-3">
            {authed ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg border border-white/10 bg-[#08090c] py-3 text-center text-sm font-semibold text-white"
                >
                  Accéder au portail compétition
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setMobileOpen(false);
                  }}
                  className="rounded-lg border border-white/10 py-3 text-left text-sm text-slate-400"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="block rounded-lg py-3 text-center text-sm text-slate-300">
                  Connexion
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg border border-white/10 bg-[#08090c] py-3 text-center text-sm font-semibold text-white"
                >
                  Rejoindre OMJEP
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
