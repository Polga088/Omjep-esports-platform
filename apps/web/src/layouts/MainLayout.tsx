import { Outlet } from 'react-router-dom';
import LandingNavbar from '@/components/landing/LandingNavbar';
import CinematicFooter from '@/components/landing/CinematicFooter';

export default function MainLayout() {
  return (
    <div className="tactical-brushed-bg flex min-h-screen flex-col bg-[#020202] font-sans text-slate-100">
      <LandingNavbar />
      <main className="dashboard-main-scroll tactical-floating-panel m-4 flex-1 border-none pt-16 outline-none lg:m-6">
        <Outlet />
      </main>
      <CinematicFooter />
    </div>
  );
}
