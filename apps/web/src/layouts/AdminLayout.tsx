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
      <div className="p-6 border-b border-amber-400/15">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-400/20">
            <Crown className="w-5 h-5 text-[#020617]" fill="currentColor" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-widest text-amber-400 uppercase block leading-tight">
              OMJEP
            </span>
            <span className="text-[10px] text-omjep-neutral tracking-wider uppercase leading-tight block">
              Org. Marocaine des Jeux Électroniques Pro
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1.5">
        {sidebarLinks.map(({ to, label, icon: Icon, exact }) => {
          const active = isActive(to, exact);
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
                active
                  ? 'omjep-premium-panel border-amber-400/35 text-amber-300'
                  : 'border-transparent text-omjep-neutral hover:border-amber-400/20 hover:bg-white/[0.02] hover:text-slate-100'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-amber-400' : 'text-slate-600 group-hover:text-amber-300'}`} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 text-amber-400/50" />}
            </Link>
          );
        })}
      </nav>

      {/* Exit admin */}
      <div className="border-t border-amber-400/15 p-4">
        <Link
          to="/dashboard"
          className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 transition-all hover:border-amber-400/20 hover:bg-amber-400/5 hover:text-amber-200"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Quitter l'Admin
        </Link>
      </div>
    </>
  );

  return (
    <div className="omjep-dashboard-theme tactical-brushed-bg kimi-admin-page min-h-screen bg-[#020202] text-slate-100 flex">
      <div className="omjep-bg-hex" aria-hidden />
      <div className="omjep-bg-glow" aria-hidden />
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
          tactical-floating-panel border-r border-white/5 bg-[#080808]/85 backdrop-blur-xl
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="tactical-floating-panel h-14 border-b border-white/5 bg-[#080808]/80 backdrop-blur-xl flex items-center px-4 lg:px-8 gap-4 sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden rounded-lg border border-transparent p-2 text-slate-500 transition-colors hover:border-amber-400/20 hover:text-amber-300 hover:bg-amber-400/5"
            aria-label="Ouvrir le menu"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="font-tech flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-slate-600">
            <span className="text-amber-400/70">Admin</span>
            {location.pathname !== '/admin' && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span className="text-slate-300">{currentPageTitle}</span>
              </>
            )}
          </div>
        </header>

        <div className="dashboard-layout-scroll m-4 flex-1 overflow-auto p-4 lg:m-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
