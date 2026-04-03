import { Link, useLocation } from 'react-router-dom';
import { Crown, LogIn, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

const navLinks = [
  { to: '/', label: 'Accueil' },
  { to: '/leaderboard', label: 'Classement' },
  { to: '/hall-of-fame', label: 'Palmarès' },
];

export default function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const authed = isAuthenticated();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-indigo-500/10 bg-[#050505]/55 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="group flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/30 to-indigo-600/20 shadow-[0_0_24px_-4px_rgba(99,102,241,0.45)] ring-1 ring-indigo-400/20 transition group-hover:ring-indigo-400/40">
              <Crown className="h-5 w-5 text-indigo-200" fill="currentColor" />
            </div>
            <div>
              <span className="font-display text-lg font-bold uppercase tracking-tighter text-white">
                OMJEP
              </span>
              <span className="hidden font-mono text-[9px] uppercase tracking-widest text-slate-500 sm:block">
                EA FC · Maroc
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
                    ? 'bg-indigo-500/10 text-indigo-300'
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
                  className="rounded-lg border-[0.5px] border-white/10 bg-[#08090c] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_-6px_rgba(99,102,241,0.35)] transition-all hover:border-indigo-400/35 hover:shadow-[0_0_28px_-4px_rgba(99,102,241,0.45)]"
                >
                  Accéder au Dashboard
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
                  className="rounded-lg border-[0.5px] border-white/10 bg-[#08090c] px-4 py-2 text-sm font-semibold text-white transition-all hover:border-indigo-400/35 hover:shadow-[0_0_24px_-6px_rgba(99,102,241,0.4)]"
                >
                  S&apos;inscrire
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
        <div className="border-t border-indigo-500/10 bg-[#050505]/95 px-4 py-4 backdrop-blur-xl md:hidden">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`block rounded-lg px-4 py-3 text-sm font-medium ${
                  isActive(link.to) ? 'bg-indigo-500/10 text-indigo-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'
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
                  Accéder au Dashboard
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
                  S&apos;inscrire
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
