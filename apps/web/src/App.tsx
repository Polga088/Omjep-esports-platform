import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import AdminCompetitions from '@/pages/Admin/Competitions';

export default function App() {
  return (
    <BrowserRouter>
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
