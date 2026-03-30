import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Zap, LayoutDashboard, Users, Settings, LogOut, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

const sidebarLinks = [
  { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { to: '/dashboard/club', label: 'Mon Club', icon: Users },
  { to: '/dashboard/settings', label: 'Paramètres', icon: Settings },
];

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 min-h-screen flex flex-col border-r border-white/5 bg-[#0D1221]">
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D4FF] to-[#0099BB] flex items-center justify-center shadow-lg shadow-[#00D4FF]/20">
              <Zap className="w-4 h-4 text-[#0A0E1A]" fill="currentColor" />
            </div>
            <span className="font-display font-bold text-lg tracking-wider text-white group-hover:text-[#00D4FF] transition-colors">
              EAGLES
            </span>
          </Link>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-white/5">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00D4FF]/30 to-[#FF6B35]/30 flex items-center justify-center text-sm font-bold text-[#00D4FF] uppercase border border-[#00D4FF]/20">
              {user?.ea_persona_name?.charAt(0) ?? 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.ea_persona_name}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  active
                    ? 'text-[#00D4FF] bg-[#00D4FF]/10 border border-[#00D4FF]/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#00D4FF]' : 'text-slate-500 group-hover:text-slate-300'}`} />
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
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b border-white/5 bg-[#0A0E1A]/80 backdrop-blur-md flex items-center px-8">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Dashboard</span>
            {location.pathname !== '/dashboard' && (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-slate-300 capitalize">
                  {location.pathname.split('/').pop()}
                </span>
              </>
            )}
          </div>
        </header>

        <div className="flex-1 p-8 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
