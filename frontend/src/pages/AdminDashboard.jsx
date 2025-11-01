import { useAuth } from '../utils/AuthContext';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <NavBar />
      <div className="container mt-4">
        <div className="row">
          <div className="col-12">
            <h1 className="mb-4">Admin Dashboard</h1>

            <div className="alert alert-success" role="alert">
              <h4 className="alert-heading">Welcome, {user?.email}!</h4>
              <p>You have successfully logged in to the BATL tennis tournament platform.</p>
              <hr />
              <p className="mb-0">
                This is the MVP (Minimum Viable Product) admin dashboard.
                User management, organizer features, and player profiles will be added in subsequent phases.
              </p>
            </div>

            <div className="row mt-4">
              <div className="col-md-4 mb-3">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title">User Management</h5>
                    <p className="card-text">Manage users, organizers, and players.</p>
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate('/admin/users')}
                    >
                      Manage Users
                    </button>
                  </div>
                </div>
              </div>

              <div className="col-md-4 mb-3">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title">Tournament Management</h5>
                    <p className="card-text">Create and manage tennis tournaments.</p>
                    <button className="btn btn-primary" disabled>
                      Coming Soon
                    </button>
                  </div>
                </div>
              </div>

              <div className="col-md-4 mb-3">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title">System Settings</h5>
                    <p className="card-text">Configure system-wide settings.</p>
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
                  <div className="card-header bg-info text-white">
                    <h5 className="mb-0">MVP Status</h5>
                  </div>
                  <div className="card-body">
                    <ul className="list-group list-group-flush">
                      <li className="list-group-item">
                        <i className="bi bi-check-circle-fill text-success me-2"></i>
                        Admin authentication and login
                      </li>
                      <li className="list-group-item">
                        <i className="bi bi-check-circle-fill text-success me-2"></i>
                        Session management (30-minute timeout)
                      </li>
                      <li className="list-group-item">
                        <i className="bi bi-check-circle-fill text-success me-2"></i>
                        Admin dashboard access
                      </li>
                      <li className="list-group-item">
                        <i className="bi bi-check-circle-fill text-success me-2"></i>
                        Logout functionality
                      </li>
                      <li className="list-group-item">
                        <i className="bi bi-check-circle-fill text-success me-2"></i>
                        User management (organizer account creation)
                      </li>
                      <li className="list-group-item text-muted">
                        <i className="bi bi-circle me-2"></i>
                        Player profiles (Phase 5)
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

export default AdminDashboard;
