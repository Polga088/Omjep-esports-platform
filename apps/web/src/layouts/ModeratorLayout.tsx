import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import {
  Scale, Trophy, Swords, LayoutDashboard, ChevronRight, Menu, X, ArrowLeft,
} from 'lucide-react';

const sidebarLinks = [
  { to: '/moderator', label: 'Accueil', icon: LayoutDashboard, exact: true },
  { to: '/moderator/competitions', label: 'Ligue & Coupe', icon: Trophy },
  { to: '/moderator/matches', label: 'Matchs & scores', icon: Swords },
];

const pageTitles: Record<string, string> = {
  '/moderator': 'Commissaire',
  '/moderator/competitions': 'Compétitions',
  '/moderator/matches': 'Validation des scores',
};

export default function ModeratorLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();
  const staffLabel = user?.role === 'ADMIN' ? 'Admin' : 'Moderator';

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  const currentPageTitle =
    pageTitles[location.pathname] ??
    (location.pathname.includes('/standings') ? 'Classement' : 'Commissaire');

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-cyan-400/15">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-400/20">
            <Scale className="w-5 h-5 text-[#020617]" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-widest text-cyan-400 uppercase block leading-tight">
              OMJEP
            </span>
            <span className="text-[10px] text-slate-500 tracking-wider uppercase leading-tight block">
              Commissaire de ligue
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1">
        {sidebarLinks.map(({ to, label, icon: Icon, exact }) => {
          const active = isActive(to, exact);
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                active
                  ? 'text-cyan-400 bg-cyan-400/10 border border-cyan-400/20'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-cyan-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 text-cyan-400/50" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-cyan-400/10">
        <Link
          to="/dashboard"
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-300 hover:bg-white/[0.03] transition-all group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Retour au dashboard
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-60 min-h-screen flex flex-col
          border-r border-cyan-400/10 bg-[#020617]
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <SidebarContent />
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-cyan-400/10 bg-[#020617]/90 backdrop-blur-md flex items-center px-4 lg:px-8 gap-4 sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-400/5 transition-colors"
            aria-label="Ouvrir le menu"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="text-cyan-400/70">{staffLabel}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-400">{currentPageTitle}</span>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
