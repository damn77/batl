import { useAuth } from '../utils/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import NavBar from '../components/NavBar';

const OrganizerDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <NavBar />
      <div className="container mt-4">
        <div className="row">
          <div className="col-12">
            <h1 className="mb-4">{t('pages.organizer.title')}</h1>

            <div className="alert alert-success" role="alert">
              <h4 className="alert-heading">Welcome, {user?.email}!</h4>
              <p>You have successfully logged in as a tournament organizer.</p>
              <hr />
              <p className="mb-0">
                As an organizer, you can create and manage tennis tournaments, manage player profiles,
                and view tournament rankings.
              </p>
            </div>

            <div className="row mt-4">
              <div className="col-md-4 mb-3">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title">{t('pages.organizer.myTournaments')}</h5>
                    <p className="card-text">Create and manage your tournaments.</p>
                    <button className="btn btn-primary" disabled>
                      Coming Soon
                    </button>
                  </div>
                </div>
              </div>

              <div className="col-md-4 mb-3">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title">{t('pages.organizer.playerProfiles')}</h5>
                    <p className="card-text">Manage player information and profiles.</p>
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate('/organizer/players')}
                    >
                      {t('nav.players')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="col-md-4 mb-3">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title">{t('pages.organizer.rankings')}</h5>
                    <p className="card-text">View tournament rankings and statistics.</p>
                    <button className="btn btn-primary" disabled>
                      Coming Soon
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="row mt-4">
              <div className="col-12">
                <div className="card">
                  <div className="card-header bg-primary text-white">
                    <h5 className="mb-0">{t('pages.organizer.features')}</h5>
                  </div>
                  <div className="card-body">
                    <ul className="list-group list-group-flush">
                      <li className="list-group-item">
                        <i className="bi bi-check-circle-fill text-success me-2"></i>
                        Organizer authentication and login
                      </li>
                      <li className="list-group-item">
                        <i className="bi bi-check-circle-fill text-success me-2"></i>
                        Organizer dashboard access
                      </li>
                      <li className="list-group-item">
                        <i className="bi bi-check-circle-fill text-success me-2"></i>
                        Player profile management
                      </li>
                      <li className="list-group-item text-muted">
                        <i className="bi bi-circle me-2"></i>
                        Tournament creation and management (Coming Soon)
                      </li>
                      <li className="list-group-item text-muted">
                        <i className="bi bi-circle me-2"></i>
                        Rankings and statistics (Coming Soon)
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OrganizerDashboard;
