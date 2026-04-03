import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Swords, Shield, Users, ClipboardList,
  ChevronRight, Menu, X, ArrowLeft, Crown, ShoppingBag, ListOrdered, Headphones,
} from 'lucide-react';

const sidebarLinks = [
  { to: '/admin', label: 'Tableau de Bord', icon: LayoutDashboard, exact: true },
  { to: '/admin/competitions', label: 'Compétitions', icon: ListOrdered },
  { to: '/admin/matches', label: 'Matchs', icon: Swords },
  { to: '/admin/users', label: 'Utilisateurs', icon: Users },
  { to: '/admin/clubs', label: 'Clubs', icon: Shield },
  { to: '/admin/club-requests', label: 'Demandes clubs', icon: ClipboardList },
  { to: '/admin/store', label: 'Gestion Boutique', icon: ShoppingBag, exact: true },
  { to: '/admin/support', label: 'Support', icon: Headphones },
];

const pageTitles: Record<string, string> = {
  '/admin': 'Tableau de Bord',
  '/admin/competitions': 'Compétitions',
  '/admin/matches': 'Matchs',
  '/admin/users': 'Utilisateurs',
  '/admin/clubs': 'Clubs',
  '/admin/club-requests': 'Demandes clubs',
  '/admin/store': 'Gestion Boutique',
  '/admin/support': 'Support',
};

export default function AdminLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  const currentPageTitle = pageTitles[location.pathname] ?? location.pathname.split('/').pop();

  const SidebarContent = () => (
    <>
      {/* Admin branding */}
      <div className="p-6 border-b border-amber-400/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-400/20">
            <Crown className="w-5 h-5 text-[#020617]" fill="currentColor" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-widest text-amber-400 uppercase block leading-tight">
              OMJEP
            </span>
            <span className="text-[10px] text-slate-500 tracking-wider uppercase leading-tight block">
              Org. Marocaine des Jeux Électroniques Pro
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
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
                  ? 'text-amber-400 bg-amber-400/10 border border-amber-400/20'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-amber-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 text-amber-400/50" />}
            </Link>
          );
        })}
      </nav>

      {/* Exit admin */}
      <div className="p-4 border-t border-amber-400/10">
        <Link
          to="/dashboard"
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-300 hover:bg-white/[0.03] transition-all group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Quitter l'Admin
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-60 min-h-screen flex flex-col
          border-r border-amber-400/10 bg-[#020617]
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-amber-400/10 bg-[#020617]/90 backdrop-blur-md flex items-center px-4 lg:px-8 gap-4 sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-400/5 transition-colors"
            aria-label="Ouvrir le menu"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="text-amber-400/60">Admin</span>
            {location.pathname !== '/admin' && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span className="text-slate-400">{currentPageTitle}</span>
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
