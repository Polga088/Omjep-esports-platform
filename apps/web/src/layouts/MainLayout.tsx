import { Link, Outlet, useLocation } from 'react-router-dom';
import { Zap, Trophy, LogIn, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

export default function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();

  const navLinks = [
    { to: '/', label: 'Accueil' },
    { to: '/leaderboard', label: 'Classement' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-slate-100 flex flex-col">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0A0E1A]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D4FF] to-[#0099BB] flex items-center justify-center shadow-lg shadow-[#00D4FF]/20 group-hover:shadow-[#00D4FF]/40 transition-shadow">
                <Zap className="w-4 h-4 text-[#0A0E1A]" fill="currentColor" />
              </div>
              <span className="font-display font-bold text-xl tracking-wider text-white group-hover:text-[#00D4FF] transition-colors">
                EAGLES
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.to)
                      ? 'text-[#00D4FF] bg-[#00D4FF]/10'
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
                    className="px-4 py-2 rounded-lg text-sm font-bold bg-[#00D4FF] text-[#0A0E1A] hover:bg-[#00BBDD] transition-colors shadow-lg shadow-[#00D4FF]/20"
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
                    ? 'text-[#00D4FF] bg-[#00D4FF]/10'
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
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="block px-4 py-3 rounded-lg text-sm font-bold bg-[#00D4FF] text-[#0A0E1A] hover:bg-[#00BBDD] transition-colors text-center">
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

      <footer className="border-t border-white/5 py-6 text-center text-slate-600 text-sm">
        <div className="flex items-center justify-center gap-2">
          <Trophy className="w-4 h-4 text-[#00D4FF]/40" />
          <span>OMJEP Eagles — Plateforme e-sport EA FC © 2026</span>
        </div>
      </footer>
    </div>
  );
}
