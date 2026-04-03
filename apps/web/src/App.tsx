import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import MainLayout from '@/layouts/MainLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import AdminLayout from '@/layouts/AdminLayout';
import ModeratorLayout from '@/layouts/ModeratorLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';
import ModeratorRoute from '@/components/ModeratorRoute';
import ManagerRoute from '@/components/ManagerRoute';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import DashboardIndex from '@/pages/Dashboard/Index';
import MyTeam from '@/pages/Dashboard/MyTeam';
import Profile from '@/pages/Dashboard/Profile';
import LadderPage from '@/pages/Dashboard/LadderPage';
import Matches from '@/pages/Dashboard/Matches';
import Schedule from '@/pages/Dashboard/Schedule';
import CompetitionDetail from '@/pages/Dashboard/CompetitionDetail';
import Stats from '@/pages/Dashboard/Stats';
import ProfileDetail from '@/pages/Dashboard/ProfileDetail';
import Settings from '@/pages/Dashboard/Settings';
import Store from '@/pages/Store/Store';
import Vault from '@/pages/Dashboard/Vault';
import TransferMarket from '@/pages/Dashboard/TransferMarket';
import Gamification from '@/pages/Dashboard/Gamification';
import Leaderboard from '@/pages/Dashboard/Leaderboard';
import Predictions from '@/pages/Predictions/Predictions';
import ManagerClub from '@/pages/Dashboard/ManagerClub';
import Support from '@/pages/Dashboard/Support';
import AdminDashboard from '@/pages/Admin/Dashboard';
import AdminCompetitions from '@/pages/Admin/Competitions';
import AdminMatches from '@/pages/Admin/Matches';
import AdminUsers from '@/pages/Admin/Users';
import AdminClubs from '@/pages/Admin/Clubs';
import AdminClubRequests from '@/pages/Admin/ClubRequests';
import AdminStoreManagement from '@/pages/Admin/StoreManagement';
import AdminSupportTickets from '@/pages/Admin/SupportTickets';
import DrawSystem from '@/pages/Admin/DrawSystem';
import LeagueHome from '@/pages/Admin/league/LeagueHome';
import LeagueCompetitions from '@/pages/Admin/league/LeagueCompetitions';
import LeagueMatches from '@/pages/Admin/league/LeagueMatches';
import LeagueStandings from '@/pages/Admin/league/LeagueStandings';
import HallOfFame from '@/pages/HallOfFame';
import Onboarding from '@/pages/Onboarding';

const Chat = lazy(() => import('@/pages/Dashboard/Chat'));

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: '#0D1221',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#f1f5f9',
          },
        }}
      />
      <Routes>
        {/* Public routes */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/hall-of-fame" element={<HallOfFame />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Onboarding — standalone page (no nav chrome) */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />

        {/* Protected routes */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardIndex />} />
          <Route path="/dashboard/team" element={<MyTeam />} />
          <Route path="/dashboard/ladder" element={<LadderPage />} />
          <Route path="/dashboard/matches" element={<Matches />} />
          <Route path="/dashboard/schedule" element={<Schedule />} />
          <Route path="/dashboard/competitions/:id" element={<CompetitionDetail />} />
          <Route path="/dashboard/stats/:id" element={<Stats />} />
          <Route path="/dashboard/profile" element={<Profile />} />
          <Route path="/dashboard/profile/:id" element={<ProfileDetail />} />
          <Route path="/dashboard/settings" element={<Settings />} />
          <Route path="/dashboard/store" element={<Store />} />
          <Route path="/dashboard/vault" element={<Vault />} />
          <Route path="/dashboard/transfers" element={<TransferMarket />} />
          <Route
            path="/dashboard/chat"
            element={
              <Suspense fallback={<div className="p-12 text-center text-slate-500 text-sm">Chargement…</div>}>
                <Chat />
              </Suspense>
            }
          />
          <Route path="/dashboard/gamification" element={<Gamification />} />
          <Route path="/dashboard/leaderboard" element={<Leaderboard />} />
          <Route path="/dashboard/predictions" element={<Predictions />} />
          <Route path="/dashboard/support" element={<Support />} />
          <Route
            path="/dashboard/manager/club"
            element={
              <ManagerRoute>
                <ManagerClub />
              </ManagerRoute>
            }
          />
        </Route>

        {/* Admin routes */}
        <Route
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/competitions" element={<AdminCompetitions />} />
          <Route path="/admin/matches" element={<AdminMatches />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/clubs" element={<AdminClubs />} />
          <Route path="/admin/club-requests" element={<AdminClubRequests />} />
          <Route path="/admin/store" element={<AdminStoreManagement />} />
          <Route path="/admin/support" element={<AdminSupportTickets />} />
          <Route path="/admin/competitions/:id/draw" element={<DrawSystem />} />
        </Route>

        <Route
          element={
            <ModeratorRoute>
              <ModeratorLayout />
            </ModeratorRoute>
          }
        >
          <Route path="/moderator" element={<LeagueHome />} />
          <Route path="/moderator/competitions" element={<LeagueCompetitions />} />
          <Route path="/moderator/matches" element={<LeagueMatches />} />
          <Route path="/moderator/competitions/:id/standings" element={<LeagueStandings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
