import { useState, useEffect } from 'react';
import { Container, Table, Button, Badge, Pagination, Spinner, Alert, Form, Row, Col, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import NavBar from '../components/NavBar';
import CreatePlayerModal from '../components/CreatePlayerModal';
import { listPlayers } from '../services/playerService';

const OrganizerPlayersPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPlayers, setTotalPlayers] = useState(0);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [accountFilter, setAccountFilter] = useState('');

  const loadPlayers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: 20
      };

      if (searchQuery) params.search = searchQuery;
      if (accountFilter) params.hasAccount = accountFilter;

      const data = await listPlayers(params);
      setPlayers(data.profiles);
      setTotalPages(data.pagination.totalPages);
      setTotalPlayers(data.pagination.total);
    } catch (err) {
      setError(err.response?.data?.error?.message || t('errors.failedToLoad', { resource: t('common.players') }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlayers();
  }, [currentPage, searchQuery, accountFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setCurrentPage(1); // Reset to first page on new search
  };

  const handleCreatePlayer = () => {
    setShowCreateModal(true);
  };

  const handlePlayerCreated = () => {
    setShowCreateModal(false);
    loadPlayers(); // Reload the list
  };

  const handleViewPlayer = (playerId) => {
    navigate(`/organizer/players/${playerId}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('common.never');
    return new Date(dateString).toLocaleString();
  };

  return (
    <>
      <NavBar />
      <Container className="mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>{t('pages.organizerPlayers.title')}</h2>
          <Button variant="primary" onClick={handleCreatePlayer}>
            {t('modals.createPlayer.title')}
          </Button>
        </div>

        {/* Search and Filters */}
        <Row className="mb-3">
          <Col md={8}>
            <Form onSubmit={handleSearch}>
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder={t('placeholders.searchByNameOrEmail')}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <Button variant="outline-secondary" type="submit">
                  {t('common.search')}
                </Button>
                {searchQuery && (
                  <Button
                    variant="outline-danger"
                    onClick={() => {
                      setSearchInput('');
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                  >
                    {t('common.clear')}
                  </Button>
                )}
              </InputGroup>
            </Form>
          </Col>
          <Col md={4}>
            <Form.Select
              value={accountFilter}
              onChange={(e) => {
                setAccountFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label={t('form.labels.filterByAccountStatus')}
            >
              <option value="">{t('form.options.allPlayers')}</option>
              <option value="true">{t('form.options.withAccount')}</option>
              <option value="false">{t('form.options.withoutAccount')}</option>
            </Form.Select>
          </Col>
        </Row>

        {error && <Alert variant="danger">{error}</Alert>}

        {loading ? (
          <div className="text-center my-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">{t('common.loading')}</span>
            </Spinner>
          </div>
        ) : (
          <>
            <p className="text-muted">
              {t('pagination.showingOf', { showing: players.length, total: totalPlayers, resource: t('pages.organizerPlayers.playerProfiles') })}
              {searchQuery && ` (${t('pagination.filteredBy')} "${searchQuery}")`}
            </p>

            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>{t('table.headers.name')}</th>
                  <th>{t('table.headers.email')}</th>
                  <th>{t('table.headers.phone')}</th>
                  <th>{t('table.headers.accountStatus')}</th>
                  <th>{t('table.headers.created')}</th>
                  <th>{t('table.headers.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {players.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-muted">
                      {searchQuery ? t('messages.noResultsFound') : t('messages.noPlayerProfilesYet')}
                    </td>
                  </tr>
                ) : (
                  players.map((player) => (
                    <tr key={player.id}>
                      <td>{player.name}</td>
                      <td>{player.email || <span className="text-muted">—</span>}</td>
                      <td>{player.phone || <span className="text-muted">—</span>}</td>
                      <td>
                        {player.userId ? (
                          <Badge bg="success">{t('status.hasAccount')}</Badge>
                        ) : (
                          <Badge bg="secondary">{t('status.noAccount')}</Badge>
                        )}
                      </td>
                      <td>{formatDate(player.createdAt)}</td>
                      <td>
                        <Button
                          variant="info"
                          size="sm"
                          onClick={() => handleViewPlayer(player.id)}
                        >
                          {t('common.view')}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="d-flex justify-content-center">
                <Pagination>
                  <Pagination.First
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  />
                  <Pagination.Prev
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  />

                  {[...Array(totalPages)].map((_, idx) => {
                    const page = idx + 1;
                    // Show first page, last page, current page, and 2 pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 2 && page <= currentPage + 2)
                    ) {
                      return (
                        <Pagination.Item
                          key={page}
                          active={page === currentPage}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Pagination.Item>
                      );
                    } else if (page === currentPage - 3 || page === currentPage + 3) {
                      return <Pagination.Ellipsis key={page} disabled />;
                    }
                    return null;
                  })}

                  <Pagination.Next
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  />
                  <Pagination.Last
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  />
                </Pagination>
              </div>
            )}
          </>
        )}

        <CreatePlayerModal
          show={showCreateModal}
          onHide={() => setShowCreateModal(false)}
          onPlayerCreated={handlePlayerCreated}
        />
      </Container>
    </>
  );
};

export default OrganizerPlayersPage;
