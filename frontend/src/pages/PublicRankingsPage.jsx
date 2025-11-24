import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Alert, Spinner, Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useModal } from '../utils/ModalContext';
import apiClient from '../services/apiClient';

const PublicRankingsPage = () => {
  const { t } = useTranslation();
  const { openLoginModal, openRegisterModal } = useModal();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasProcessedModal = useRef(false);

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Handle modal parameter from URL (for backward compatibility with /login and /register)
  useEffect(() => {
    const modalParam = searchParams.get('modal');

    // If there's a modal parameter, process it
    if (modalParam === 'login' || modalParam === 'register') {
      // Only process once per mount
      if (hasProcessedModal.current) {
        return;
      }

      hasProcessedModal.current = true;

      if (modalParam === 'login') {
        openLoginModal();
      } else {
        openRegisterModal();
      }

      // Clear the URL parameter immediately
      navigate('/rankings', { replace: true });
    } else {
      // Reset the flag when there's no modal param - allows reopening from /login or /register URLs later
      hasProcessedModal.current = false;
    }

    // Cleanup on unmount
    return () => {
      hasProcessedModal.current = false;
    };
  }, [searchParams, openLoginModal, openRegisterModal, navigate]);

  useEffect(() => {
    fetchPlayers();
  }, [pagination.page, search]);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        limit: pagination.limit
      };

      if (search) {
        params.search = search;
      }

      // Public endpoint - no authentication required
      const response = await apiClient.get('/players', { params });

      setPlayers(response.data.profiles);
      setPagination({
        ...pagination,
        ...response.data.pagination
      });
    } catch (err) {
      setError(err.message || t('errors.failedToLoad', { resource: t('common.players') }));
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPagination({ ...pagination, page: 1 }); // Reset to first page on search
  };

  const handlePageChange = (newPage) => {
    setPagination({ ...pagination, page: newPage });
  };

  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <Link to="/" className="navbar-brand">BATL</Link>
          <div className="navbar-nav ms-auto">
            <button
              className="btn btn-outline-light btn-sm"
              onClick={openLoginModal}
            >
              {t('nav.login')}
            </button>
            <button
              className="btn btn-light btn-sm ms-2"
              onClick={openRegisterModal}
            >
              {t('nav.register')}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mt-4">
        <div className="row">
          <div className="col-12">
            <div className="card shadow">
              <div className="card-header bg-primary text-white">
                <h2 className="mb-0">{t('pages.publicRankings.title')}</h2>
                <p className="mb-0 mt-2">{t('pages.publicRankings.subtitle')}</p>
              </div>

              <div className="card-body">
                {error && (
                  <Alert variant="danger" onClose={() => setError(null)} dismissible>
                    {error}
                  </Alert>
                )}

                {/* Search */}
                <div className="row mb-3">
                  <div className="col-md-6">
                    <Form.Group>
                      <Form.Label>{t('form.labels.searchPlayers')}</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder={t('placeholders.searchByName')}
                        value={search}
                        onChange={handleSearchChange}
                      />
                    </Form.Group>
                  </div>
                </div>

                {/* Loading State */}
                {loading && (
                  <div className="text-center py-5">
                    <Spinner animation="border" role="status">
                      <span className="visually-hidden">{t('common.loading')}</span>
                    </Spinner>
                    <p className="mt-2">{t('common.loadingResource', { resource: t('common.players') })}</p>
                  </div>
                )}

                {/* Player List */}
                {!loading && players.length > 0 && (
                  <>
                    <div className="table-responsive">
                      <table className="table table-striped table-hover">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>{t('table.headers.playerName')}</th>
                            <th>{t('table.headers.status')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {players.map((player, index) => (
                            <tr key={player.id}>
                              <td>{(pagination.page - 1) * pagination.limit + index + 1}</td>
                              <td>{player.name}</td>
                              <td>
                                {player.hasAccount ? (
                                  <span className="badge bg-success">{t('status.registered')}</span>
                                ) : (
                                  <span className="badge bg-secondary">{t('status.profileOnly')}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                      <nav aria-label="Player pagination">
                        <ul className="pagination justify-content-center">
                          <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => handlePageChange(pagination.page - 1)}
                              disabled={pagination.page === 1}
                            >
                              {t('pagination.previous')}
                            </button>
                          </li>
                          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                            <li key={page} className={`page-item ${page === pagination.page ? 'active' : ''}`}>
                              <button
                                className="page-link"
                                onClick={() => handlePageChange(page)}
                              >
                                {page}
                              </button>
                            </li>
                          ))}
                          <li className={`page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => handlePageChange(pagination.page + 1)}
                              disabled={pagination.page === pagination.totalPages}
                            >
                              {t('pagination.next')}
                            </button>
                          </li>
                        </ul>
                      </nav>
                    )}

                    <div className="text-center text-muted mt-3">
                      <small>{t('pagination.showingOf', { showing: players.length, total: pagination.total, resource: t('common.players') })}</small>
                    </div>
                  </>
                )}

                {/* Empty State */}
                {!loading && players.length === 0 && (
                  <div className="text-center py-5">
                    <p className="text-muted">
                      {search ? t('messages.noResultsFound') : t('messages.noPlayersYet')}
                    </p>
                  </div>
                )}

                {/* Privacy Notice */}
                <div className="alert alert-info mt-4">
                  <i className="bi bi-info-circle me-2"></i>
                  <strong>{t('privacy.notice')}:</strong> {t('privacy.contactHidden')}
                  <button
                    onClick={openRegisterModal}
                    className="btn btn-link alert-link p-0 ms-2"
                    style={{ verticalAlign: 'baseline' }}
                  >
                    {t('nav.register')}
                  </button> {t('privacy.toCreateAccount')}
                </div>
              </div>
            </div>

            {/* Tournament Notice */}
            <div className="card shadow mt-4">
              <div className="card-body text-center">
                <h5>{t('messages.tournamentFeaturesComingSoon')}</h5>
                <p className="text-muted">
                  {t('messages.tournamentFeaturesDescription')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicRankingsPage;
