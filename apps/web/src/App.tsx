import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/context/ThemeContext'
import { useTheme } from '@/context/ThemeContext'
import MainLayout from '@/layouts/MainLayout'
import DashboardLayout from '@/layouts/DashboardLayout'
import AdminLayout from '@/layouts/AdminLayout'
import ModeratorLayout from '@/layouts/ModeratorLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import AdminRoute from '@/components/AdminRoute'
import ModeratorRoute from '@/components/ModeratorRoute'
import ManagerRoute from '@/components/ManagerRoute'
import JoinOmjep from '@/pages/JoinOmjep'
import Palmares from '@/pages/Palmares'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import AppLoader from '@/components/AppLoader'

const Onboarding = lazy(() => import('@/pages/Onboarding'))
const HallOfFame = lazy(() => import('@/pages/HallOfFame'))
const Community = lazy(() => import('@/pages/Community'))
const ArticleDetail = lazy(() => import('@/pages/Community/ArticleDetail'))

const DashboardIndex = lazy(() => import('@/pages/Dashboard/Index'))
const MyTeam = lazy(() => import('@/pages/Dashboard/MyTeam'))
const Profile = lazy(() => import('@/pages/Dashboard/Profile'))
const LadderPage = lazy(() => import('@/pages/Dashboard/LadderPage'))
const Matches = lazy(() => import('@/pages/Dashboard/Matches'))
const Schedule = lazy(() => import('@/pages/Dashboard/Schedule'))
const CompetitionDetail = lazy(() => import('@/pages/Dashboard/CompetitionDetail'))
const Stats = lazy(() => import('@/pages/Dashboard/Stats'))
const ProfileDetail = lazy(() => import('@/pages/Dashboard/ProfileDetail'))
const Settings = lazy(() => import('@/pages/Dashboard/Settings'))
const Store = lazy(() => import('@/pages/Store/Store'))
const Vault = lazy(() => import('@/pages/Dashboard/Vault'))
const TransferMarket = lazy(() => import('@/pages/Dashboard/TransferMarket'))
const Gamification = lazy(() => import('@/pages/Dashboard/Gamification'))
const Leaderboard = lazy(() => import('@/pages/Dashboard/Leaderboard'))
const Predictions = lazy(() => import('@/pages/Predictions/Predictions'))
const ManagerClub = lazy(() => import('@/pages/Dashboard/ManagerClub'))
const Support = lazy(() => import('@/pages/Dashboard/Support'))
const Chat = lazy(() => import('@/pages/Dashboard/Chat'))

const AdminDashboard = lazy(() => import('@/pages/Admin/Dashboard'))
const AdminCompetitions = lazy(() => import('@/pages/Admin/Competitions'))
const AdminMatches = lazy(() => import('@/pages/Admin/Matches'))
const AdminUsers = lazy(() => import('@/pages/Admin/Users'))
const AdminClubs = lazy(() => import('@/pages/Admin/Clubs'))
const AdminClubRequests = lazy(() => import('@/pages/Admin/ClubRequests'))
const AdminStoreManagement = lazy(() => import('@/pages/Admin/StoreManagement'))
const NewsCreate = lazy(() => import('@/pages/Admin/NewsCreate'))
const AdminLandingMedia = lazy(() => import('@/pages/Admin/AdminLandingMedia'))
const AdminSupportTickets = lazy(() => import('@/pages/Admin/SupportTickets'))
const AdminEmailTemplates = lazy(() => import('@/pages/Admin/EmailTemplates'))
const DrawSystem = lazy(() => import('@/pages/Admin/DrawSystem'))
const AdminEaMatchSyncQueue = lazy(() => import('@/pages/Admin/EaMatchSyncQueue'))

const LeagueHome = lazy(() => import('@/pages/Admin/league/LeagueHome'))
const LeagueCompetitions = lazy(() => import('@/pages/Admin/league/LeagueCompetitions'))
const LeagueMatches = lazy(() => import('@/pages/Admin/league/LeagueMatches'))
const LeagueStandings = lazy(() => import('@/pages/Admin/league/LeagueStandings'))
const isDevDashboardPreviewEnabled = import.meta.env.DEV

function ThemedToaster() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <Toaster
      theme={isDark ? 'dark' : 'light'}
      position="top-right"
      toastOptions={{
        style: {
          background: 'var(--omjep-bg-panel)',
          border: '1px solid color-mix(in srgb, var(--omjep-border) 85%, transparent)',
          color: 'var(--omjep-text-primary)',
        },
      }}
    />
  )
}

const pageEnterMs = 0.2

function AnimatedAppRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        className="min-h-dvh w-full"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: pageEnterMs, ease: [0.4, 0, 0.2, 1] }}
      >
        <Routes location={location}>
            {/* Public routes */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<JoinOmjep />} />
              <Route path="/join" element={<JoinOmjep />} />
              <Route path="/plateforme/*" element={<Navigate to="/" replace />} />
              <Route path="/palmares" element={<Palmares />} />
              <Route path="/community" element={<Community />} />
              <Route path="/community/news/:slugOrId" element={<ArticleDetail />} />
              <Route path="/hall-of-fame" element={<HallOfFame />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />

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
              <Route path="/dashboard/chat" element={<Chat />} />
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

            {isDevDashboardPreviewEnabled ? (
              <Route element={<DashboardLayout />}>
                {/* Dev-only preview route for local visual audits without real auth session */}
                <Route path="/dashboard-preview" element={<DashboardIndex />} />
              </Route>
            ) : null}

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
              <Route path="/admin/news/create" element={<NewsCreate />} />
              <Route path="/admin/landing-media" element={<AdminLandingMedia />} />
              <Route path="/admin/support" element={<AdminSupportTickets />} />
              <Route path="/admin/email-templates" element={<AdminEmailTemplates />} />
              <Route path="/admin/ea-match-sync" element={<AdminEaMatchSyncQueue />} />
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
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ThemedToaster />
        <Suspense fallback={<AppLoader active />}>
          <AnimatedAppRoutes />
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  )
}
