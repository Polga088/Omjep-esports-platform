import { Outlet } from 'react-router-dom';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';

export default function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[#050505] text-slate-100">
      <LandingNavbar />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
      <LandingFooter />
    </div>
  );
}
