import { Navigate } from 'react-router-dom';

/**
 * RegisterPage - Backward compatibility wrapper
 *
 * This component maintains backward compatibility for direct links to /register.
 * It redirects to the rankings page with a URL parameter to trigger the register modal.
 */
const RegisterPage = () => {
  // Redirect to rankings with modal parameter
  return <Navigate to="/rankings?modal=register" replace />;
};

export default RegisterPage;
