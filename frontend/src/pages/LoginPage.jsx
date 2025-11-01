import { Navigate } from 'react-router-dom';

/**
 * LoginPage - Backward compatibility wrapper
 *
 * This component maintains backward compatibility for direct links to /login.
 * It redirects to the rankings page with a URL parameter to trigger the login modal.
 */
const LoginPage = () => {
  // Redirect to rankings with modal parameter
  return <Navigate to="/rankings?modal=login" replace />;
};

export default LoginPage;
