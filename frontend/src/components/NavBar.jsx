import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Navbar,
  Nav,
  Offcanvas,
  Accordion,
} from 'react-bootstrap';
import { useAuth } from '../utils/AuthContext';
import { useModal } from '../utils/ModalContext';
import { logout as logoutAPI } from '../services/authService';
import LanguageSwitcher from './LanguageSwitcher';

const NavBar = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { openLoginModal, openRegisterModal } = useModal();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleToggle = () => setShow(prev => !prev);

  const handleNav = (path) => {
    navigate(path);
    handleClose();
  };

  const handleLogout = async () => {
    handleClose();
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
    <Navbar
      expand="lg"
      variant="dark"
      bg="primary"
      expanded={show}
      onToggle={handleToggle}
    >
      <div className="container-fluid">
        <Navbar.Brand
          onClick={handleHomeClick}
          style={{ cursor: 'pointer' }}
        >
          BATL
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="batl-offcanvas" />

        <Navbar.Offcanvas
          id="batl-offcanvas"
          placement="end"
          show={show}
          onHide={handleClose}
          scroll={false}
          backdrop={true}
        >
          <Offcanvas.Header closeButton>
            <Offcanvas.Title>Menu</Offcanvas.Title>
          </Offcanvas.Header>

          <Offcanvas.Body className="d-flex flex-column">
            {/* Main navigation links */}
            <Nav className="flex-column flex-lg-row me-auto">
              {/* Public links — visible to all */}
              <Nav.Link
                eventKey="rankings"
                onClick={() => handleNav('/rankings')}
              >
                {t('nav.rankings')}
              </Nav.Link>

              {/* Tournaments link — visitors and PLAYER only */}
              {(!user || user.role === 'PLAYER') && (
                <Nav.Link
                  eventKey="tournaments-public"
                  onClick={() => handleNav('/tournaments')}
                >
                  Tournaments
                </Nav.Link>
              )}

              {/* ORGANIZER section (not ADMIN) */}
              {user && user.role === 'ORGANIZER' && (
                <>
                  <div className="text-muted small text-uppercase fw-semibold px-3 pt-3 pb-1 d-lg-none">
                    Organizer
                  </div>
                  <hr className="d-lg-none my-1" />
                  <Nav.Link
                    eventKey="org-categories"
                    onClick={() => handleNav('/organizer/categories')}
                  >
                    {t('nav.categories')}
                  </Nav.Link>
                  <Nav.Link
                    eventKey="org-tournaments"
                    onClick={() => handleNav('/organizer/tournaments')}
                  >
                    {t('nav.tournaments')}
                  </Nav.Link>
                  <Nav.Link
                    eventKey="org-players"
                    onClick={() => handleNav('/organizer/players')}
                  >
                    {t('nav.players')}
                  </Nav.Link>
                  <Nav.Link
                    eventKey="org-pairs"
                    onClick={() => handleNav('/player/pairs')}
                  >
                    {t('nav.doublesPairs')}
                  </Nav.Link>
                </>
              )}

              {/* PLAYER section */}
              {user && user.role === 'PLAYER' && (
                <>
                  <div className="text-muted small text-uppercase fw-semibold px-3 pt-3 pb-1 d-lg-none">
                    Player
                  </div>
                  <hr className="d-lg-none my-1" />
                  <Nav.Link
                    eventKey="player-registrations"
                    onClick={() => handleNav('/player/tournaments')}
                  >
                    Registrations
                  </Nav.Link>
                  <Nav.Link
                    eventKey="player-categories"
                    onClick={() => handleNav('/player/register')}
                  >
                    {t('nav.categories')}
                  </Nav.Link>
                  <Nav.Link
                    eventKey="player-pairs"
                    onClick={() => handleNav('/player/pairs')}
                  >
                    {t('nav.doublesPairs')}
                  </Nav.Link>
                </>
              )}
            </Nav>

            {/* ADMIN section — Accordion outside Nav to prevent collapseOnSelect interference */}
            {user && user.role === 'ADMIN' && (
              <Accordion flush className="d-lg-none mt-2">
                <Accordion.Item eventKey="admin-org">
                  <Accordion.Header>Organizer</Accordion.Header>
                  <Accordion.Body className="p-0">
                    <Nav className="flex-column">
                      <Nav.Link
                        eventKey="adm-categories"
                        onClick={() => handleNav('/organizer/categories')}
                      >
                        {t('nav.categories')}
                      </Nav.Link>
                      <Nav.Link
                        eventKey="adm-tournaments"
                        onClick={() => handleNav('/organizer/tournaments')}
                      >
                        {t('nav.tournaments')}
                      </Nav.Link>
                      <Nav.Link
                        eventKey="adm-players"
                        onClick={() => handleNav('/organizer/players')}
                      >
                        {t('nav.players')}
                      </Nav.Link>
                      <Nav.Link
                        eventKey="adm-pairs"
                        onClick={() => handleNav('/player/pairs')}
                      >
                        {t('nav.doublesPairs')}
                      </Nav.Link>
                    </Nav>
                  </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="admin-admin">
                  <Accordion.Header>Admin</Accordion.Header>
                  <Accordion.Body className="p-0">
                    <Nav className="flex-column">
                      <Nav.Link
                        eventKey="adm-users"
                        onClick={() => handleNav('/admin/users')}
                      >
                        Users
                      </Nav.Link>
                      <Nav.Link
                        eventKey="adm-point-tables"
                        onClick={() => handleNav('/admin/point-tables')}
                      >
                        Point Tables
                      </Nav.Link>
                    </Nav>
                  </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="admin-player">
                  <Accordion.Header>Player Access</Accordion.Header>
                  <Accordion.Body className="p-0">
                    <Nav className="flex-column">
                      <Nav.Link
                        eventKey="adm-registrations"
                        onClick={() => handleNav('/player/tournaments')}
                      >
                        Registrations
                      </Nav.Link>
                      <Nav.Link
                        eventKey="adm-player-categories"
                        onClick={() => handleNav('/player/register')}
                      >
                        {t('nav.categories')}
                      </Nav.Link>
                    </Nav>
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            )}

            {/* Desktop ADMIN links (lg+) — inline in navbar */}
            {user && user.role === 'ADMIN' && (
              <Nav className="flex-row d-none d-lg-flex me-auto">
                <Nav.Link
                  eventKey="desk-categories"
                  onClick={() => handleNav('/organizer/categories')}
                >
                  {t('nav.categories')}
                </Nav.Link>
                <Nav.Link
                  eventKey="desk-tournaments"
                  onClick={() => handleNav('/organizer/tournaments')}
                >
                  {t('nav.tournaments')}
                </Nav.Link>
                <Nav.Link
                  eventKey="desk-players"
                  onClick={() => handleNav('/organizer/players')}
                >
                  {t('nav.players')}
                </Nav.Link>
                <Nav.Link
                  eventKey="desk-pairs"
                  onClick={() => handleNav('/player/pairs')}
                >
                  {t('nav.doublesPairs')}
                </Nav.Link>
                <span className="navbar-text text-white-50 small px-2" style={{ opacity: 0.6 }}>|</span>
                <Nav.Link
                  eventKey="desk-users"
                  onClick={() => handleNav('/admin/users')}
                >
                  Users
                </Nav.Link>
                <Nav.Link
                  eventKey="desk-point-tables"
                  onClick={() => handleNav('/admin/point-tables')}
                >
                  Point Tables
                </Nav.Link>
                <span className="navbar-text text-white-50 small px-2" style={{ opacity: 0.6 }}>|</span>
                <Nav.Link
                  eventKey="desk-registrations"
                  onClick={() => handleNav('/player/tournaments')}
                >
                  Registrations
                </Nav.Link>
                <Nav.Link
                  eventKey="desk-player-reg"
                  onClick={() => handleNav('/player/register')}
                >
                  {t('nav.categories')}
                </Nav.Link>
              </Nav>
            )}

            {/* Drawer footer — user info / auth buttons + language switcher */}
            <div className="mt-auto border-top pt-3 pb-2">
              <div className="mb-2">
                <LanguageSwitcher />
              </div>

              {user ? (
                <div className="d-flex flex-column gap-2">
                  <div>
                    <span className="badge bg-primary me-2">{user.role}</span>
                    <span className="text-truncate small">{user.email}</span>
                  </div>
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={handleLogout}
                  >
                    {t('nav.logout')}
                  </button>
                </div>
              ) : (
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => { handleClose(); openLoginModal(); }}
                  >
                    {t('nav.login')}
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => { handleClose(); openRegisterModal(); }}
                  >
                    {t('nav.register')}
                  </button>
                </div>
              )}
            </div>
          </Offcanvas.Body>
        </Navbar.Offcanvas>
      </div>
    </Navbar>
  );
};

export default NavBar;
