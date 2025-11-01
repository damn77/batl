import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { useModal } from '../utils/ModalContext';
import { logout as logoutAPI } from '../services/authService';

const NavBar = () => {
  const { user, logout } = useAuth();
  const { openLoginModal, openRegisterModal } = useModal();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutAPI();
      logout();
    } catch (error) {
      console.error('Logout failed:', error);
      // Force logout on frontend even if API call fails
      logout();
    }
  };

  const handleHomeClick = () => {
    // Navigate to role-specific dashboard
    if (!user) {
      navigate('/login');
      return;
    }

    switch (user.role) {
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
        navigate('/login');
    }
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container-fluid">
        <span
          className="navbar-brand"
          onClick={handleHomeClick}
          style={{ cursor: 'pointer' }}
        >
          BATL
        </span>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <span
                className="nav-link"
                onClick={() => navigate('/rankings')}
                style={{ cursor: 'pointer' }}
              >
                Rankings
              </span>
            </li>
          </ul>
          <ul className="navbar-nav ms-auto">
            {user ? (
              <>
                <li className="navbar-text text-white me-3">
                  <span className="badge bg-light text-primary me-2">{user.role}</span>
                  {user.email}
                </li>
                <li className="nav-item">
                  <button
                    className="btn btn-outline-light btn-sm"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <button
                    className="btn btn-outline-light btn-sm me-2"
                    onClick={openLoginModal}
                  >
                    Login
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className="btn btn-light btn-sm"
                    onClick={openRegisterModal}
                  >
                    Register
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
