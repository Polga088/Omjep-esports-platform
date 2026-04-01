import { Link, Outlet, useLocation } from 'react-router-dom';
import { Crown, Trophy, LogIn, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

export default function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();

  const navLinks = [
    { to: '/', label: 'Accueil' },
    { to: '/leaderboard', label: 'Classement' },
    { to: '/hall-of-fame', label: 'Palmarès' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-slate-100 flex flex-col">
      <header className="sticky top-0 z-50 border-b border-amber-400/10 bg-[#0A0E1A]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-400/20 group-hover:shadow-amber-400/40 transition-shadow">
                <Crown className="w-5 h-5 text-[#0A0E1A]" fill="currentColor" />
              </div>
              <div>
                <span className="font-display font-bold text-lg tracking-widest text-amber-400 group-hover:text-amber-300 transition-colors uppercase block leading-tight">
                  OMJEP
                </span>
                <span className="text-[9px] text-slate-500 tracking-wider uppercase hidden sm:block">
                  Org. Marocaine des Jeux Électroniques Pro
                </span>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.to)
                      ? 'text-amber-400 bg-amber-400/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Auth area */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated() ? (
                <>
                  <Link
                    to="/dashboard"
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    {user?.ea_persona_name}
                  </Link>
                  <button
                    onClick={logout}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white border border-white/10 hover:border-white/20 transition-all"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    Connexion
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 rounded-lg text-sm font-bold bg-amber-400 text-[#0A0E1A] hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20"
                  >
                    S'inscrire
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/5 bg-[#0A0E1A] px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.to)
                    ? 'text-amber-400 bg-amber-400/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
              {isAuthenticated() ? (
                <button
                  onClick={() => { logout(); setMobileOpen(false); }}
                  className="w-full px-4 py-3 rounded-lg text-sm font-medium text-slate-400 hover:text-white border border-white/10 transition-all text-left"
                >
                  Déconnexion
                </button>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="block px-4 py-3 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors">
                    Connexion
                  </Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="block px-4 py-3 rounded-lg text-sm font-bold bg-amber-400 text-[#0A0E1A] hover:bg-amber-300 transition-colors text-center">
                    S'inscrire
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-amber-400/10 py-6 text-center text-slate-600 text-sm">
        <div className="flex items-center justify-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400/40" />
          <span>OMJEP — Fédération E-sport Maroc © 2026</span>
        </div>
      </footer>
    </div>
  );
}
