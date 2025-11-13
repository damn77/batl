import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './utils/AuthContext';
import { ModalProvider, useModal } from './utils/ModalContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PublicRankingsPage from './pages/PublicRankingsPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsersPage from './pages/AdminUsersPage';
import UserDetailPage from './pages/UserDetailPage';
import OrganizerDashboard from './pages/OrganizerDashboard';
import OrganizerPlayersPage from './pages/OrganizerPlayersPage';
import PlayerDetailPage from './pages/PlayerDetailPage';
import PlayerProfilePage from './pages/PlayerProfilePage';
import CategoryManagementPage from './pages/CategoryManagementPage';
import TournamentSetupPage from './pages/TournamentSetupPage';
import TournamentRulesSetupPage from './pages/TournamentRulesSetupPage';
import TournamentRulesViewPage from './pages/TournamentRulesViewPage';
import PlayerRegistrationPage from './pages/PlayerRegistrationPage';
import CategoryRankingsPage from './pages/CategoryRankingsPage';
import TournamentRegistrationPage from './pages/TournamentRegistrationPage';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';

// Separate component to use modal context
function AppContent() {
  const { activeModal, closeModal, openLoginModal, openRegisterModal } = useModal();
  const { user } = useAuth();

  // Close any open modals when user authentication state changes (login or logout)
  useEffect(() => {
    // Always close modals when user state changes to prevent stale modal state
    // This runs on: initial load (user becomes null or user object), login (null -> user), logout (user -> null)
    closeModal();
  }, [user, closeModal]);

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/rankings" element={<CategoryRankingsPage />} />

          {/* Protected routes - Admin */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users/:id"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <UserDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/dashboard"
            element={
              <ProtectedRoute requiredRole="ORGANIZER">
                <OrganizerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/players"
            element={
              <ProtectedRoute requiredRoles={['ORGANIZER', 'ADMIN']}>
                <OrganizerPlayersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/players/:id"
            element={
              <ProtectedRoute requiredRoles={['ORGANIZER', 'ADMIN']}>
                <PlayerDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/categories"
            element={
              <ProtectedRoute requiredRoles={['ORGANIZER', 'ADMIN']}>
                <CategoryManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/tournaments"
            element={
              <ProtectedRoute requiredRoles={['ORGANIZER', 'ADMIN']}>
                <TournamentSetupPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/tournament/:id/rules"
            element={
              <ProtectedRoute requiredRoles={['ORGANIZER', 'ADMIN']}>
                <TournamentRulesSetupPage />
              </ProtectedRoute>
            }
          />

          {/* Protected routes - Player */}
          <Route
            path="/player/register"
            element={
              <ProtectedRoute>
                <PlayerRegistrationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/player/tournaments"
            element={
              <ProtectedRoute requiredRole="PLAYER">
                <TournamentRegistrationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/player/profile"
            element={
              <ProtectedRoute requiredRole="PLAYER">
                <PlayerProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Protected routes - All authenticated users */}
          <Route
            path="/tournament/:id/rules"
            element={
              <ProtectedRoute>
                <TournamentRulesViewPage />
              </ProtectedRoute>
            }
          />

        {/* Default route */}
        <Route path="/" element={<Navigate to="/rankings" replace />} />

        {/* 404 - redirect to rankings */}
        <Route path="*" element={<Navigate to="/rankings" replace />} />
      </Routes>

      {/* Global modals */}
      <LoginModal
        show={activeModal === 'login'}
        onHide={closeModal}
        onSwitchToRegister={openRegisterModal}
      />
      <RegisterModal
        show={activeModal === 'register'}
        onHide={closeModal}
        onSwitchToLogin={openLoginModal}
      />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ModalProvider>
          <AppContent />
        </ModalProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
