import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../utils/AuthContext';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole = null, requiredRoles = [] }) => {
  const { t } = useTranslation();
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role requirements
  if (requiredRole && user?.role !== requiredRole) {
    // Redirect to appropriate dashboard based on user's actual role
    const redirectPath = getRoleBasedPath(user?.role);
    return <Navigate to={redirectPath} replace />;
  }

  // Check if user has any of the required roles
  if (requiredRoles.length > 0 && !requiredRoles.includes(user?.role)) {
    const redirectPath = getRoleBasedPath(user?.role);
    return <Navigate to={redirectPath} replace />;
  }

  // User is authenticated and authorized
  return children;
};

// Helper function to get role-based redirect path
const getRoleBasedPath = (role) => {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'ORGANIZER':
      return '/organizer/dashboard';
    case 'PLAYER':
      return '/player/profile';
    default:
      return '/';
  }
};

export default ProtectedRoute;
