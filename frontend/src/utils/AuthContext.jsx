import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkSession as checkSessionAPI } from '../services/authService';

// Create Auth Context
const AuthContext = createContext(null);

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const hasCheckedAuth = useRef(false);

  // Check authentication status on mount
  useEffect(() => {
    // Prevent duplicate calls in React StrictMode
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;

    checkAuthStatus();

    // Listen for session expiration events
    const handleSessionExpired = () => {
      setUser(null);
      setIsAuthenticated(false);
      navigate('/rankings', {
        state: { message: 'Your session has expired. Please log in again.' }
      });
    };

    window.addEventListener('session-expired', handleSessionExpired);

    return () => {
      window.removeEventListener('session-expired', handleSessionExpired);
    };
  }, []);

  // Check if user is authenticated
  const checkAuthStatus = async () => {
    try {
      const data = await checkSessionAPI();
      setUser(data.user);
      setIsAuthenticated(true);
    } catch {
      // Session not valid or expired
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);

    // Redirect based on role
    switch (userData.role) {
      case 'ADMIN':
        navigate('/admin/dashboard');
        break;
      case 'ORGANIZER':
        navigate('/organizer/dashboard');
        break;
      case 'PLAYER':
        navigate('/player/profile');
        break;
      default:
        navigate('/');
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    // Use window.location to avoid race condition with ProtectedRoute redirect
    // This ensures a clean navigation without triggering /login redirect
    window.location.replace('/rankings');
  };

  // Check if user has specific role
  const hasRole = (role) => {
    return user?.role === role;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (...roles) => {
    return roles.includes(user?.role);
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    hasRole,
    hasAnyRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
