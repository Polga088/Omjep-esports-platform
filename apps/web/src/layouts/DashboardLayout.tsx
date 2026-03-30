import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Zap, LayoutDashboard, Users, Trophy, ShoppingBag,
  LogOut, ChevronRight, Menu, X,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

const sidebarLinks = [
  { to: '/dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard, exact: true },
  { to: '/dashboard/team', label: 'Mon Équipe', icon: Users },
  { to: '/dashboard/ladder', label: 'Classement', icon: Trophy },
  { to: '/dashboard/store', label: 'Boutique', icon: ShoppingBag },
];

const pageTitles: Record<string, string> = {
  '/dashboard': 'Vue d\'ensemble',
  '/dashboard/team': 'Mon Équipe',
  '/dashboard/ladder': 'Classement',
  '/dashboard/store': 'Boutique',
};

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  const currentPageTitle = pageTitles[location.pathname] ?? location.pathname.split('/').pop();

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <Link to="/" className="flex items-center gap-2 group" onClick={() => setSidebarOpen(false)}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D4FF] to-[#0099BB] flex items-center justify-center shadow-lg shadow-[#00D4FF]/20">
            <Zap className="w-4 h-4 text-[#0A0E1A]" fill="currentColor" />
          </div>
          <span className="font-bold text-lg tracking-wider text-white group-hover:text-[#00D4FF] transition-colors uppercase">
            Eagles
          </span>
        </Link>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-white/5">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00D4FF]/30 to-[#FF6B35]/30 flex items-center justify-center text-sm font-bold text-[#00D4FF] uppercase border border-[#00D4FF]/20 shrink-0">
            {user?.ea_persona_name?.charAt(0) ?? 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.ea_persona_name ?? 'Joueur'}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role ?? 'manager'}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {sidebarLinks.map(({ to, label, icon: Icon, exact }) => {
          const active = isActive(to, exact);
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                active
                  ? 'text-[#00D4FF] bg-[#00D4FF]/10 border border-[#00D4FF]/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#00D4FF]' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 text-[#00D4FF]/60" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/10 transition-all group"
        >
          <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          Déconnexion
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-slate-100 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — desktop always visible, mobile drawer */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-64 min-h-screen flex flex-col
          border-r border-white/5 bg-[#0D1221]
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b border-white/5 bg-[#0A0E1A]/80 backdrop-blur-md flex items-center px-4 lg:px-8 gap-4 sticky top-0 z-10">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Ouvrir le menu"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Dashboard</span>
            {location.pathname !== '/dashboard' && (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-slate-300 capitalize">{currentPageTitle}</span>
              </>
            )}
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
