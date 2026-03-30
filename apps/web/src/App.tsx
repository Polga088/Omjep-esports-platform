import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import MainLayout from '@/layouts/MainLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import AdminLayout from '@/layouts/AdminLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import DashboardIndex from '@/pages/Dashboard/Index';
import MyTeam from '@/pages/Dashboard/MyTeam';
import Profile from '@/pages/Dashboard/Profile';
import Ladder from '@/pages/Dashboard/Ladder';
import Matches from '@/pages/Dashboard/Matches';
import Standings from '@/pages/Dashboard/Standings';
import AdminCompetitions from '@/pages/Admin/Competitions';
import AdminMatches from '@/pages/Admin/Matches';

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
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

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
          <Route path="/dashboard/ladder" element={<Ladder />} />
          <Route path="/dashboard/matches" element={<Matches />} />
          <Route path="/dashboard/competitions/:id" element={<Standings />} />
          <Route path="/dashboard/profile" element={<Profile />} />
        </Route>

        {/* Admin routes */}
        <Route
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route path="/admin" element={<AdminCompetitions />} />
          <Route path="/admin/competitions" element={<AdminCompetitions />} />
          <Route path="/admin/matches" element={<AdminMatches />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
