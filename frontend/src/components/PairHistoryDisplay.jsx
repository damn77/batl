import { useState, useEffect } from 'react';
import { Card, Table, Badge, Spinner, Alert, Pagination, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { getPairHistory, PAIR_STATUS_LABELS, PAIR_STATUS_VARIANTS } from '../services/pairService';

/**
 * T079: PairHistoryDisplay - Shows tournament history for a doubles pair
 * Feature: 006-doubles-pairs - Phase 7
 */
const PairHistoryDisplay = ({ pairId, showPairInfo = true, limit = 10 }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (pairId) {
      loadHistory();
    }
  }, [pairId, page]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getPairHistory(pairId, { page, limit });
      setData(result);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load pair history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTournamentStatusBadge = (status) => {
    const variants = {
      SCHEDULED: 'primary',
      IN_PROGRESS: 'info',
      COMPLETED: 'success',
      CANCELLED: 'danger',
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  if (loading && !data) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" size="sm" />
        <span className="ms-2">Loading history...</span>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  if (!data) {
    return null;
  }

  const { pair, stats, history, pagination } = data;

  return (
    <Card>
      <Card.Header>
        <h5 className="mb-0">Tournament History</h5>
      </Card.Header>
      <Card.Body>
        {showPairInfo && (
          <Row className="mb-4">
            <Col md={6}>
              <h6>Pair Details</h6>
              <p className="mb-1">
                <strong>{pair.player1.name}</strong> & <strong>{pair.player2.name}</strong>
              </p>
              <p className="mb-1 text-muted">
                Category: {pair.category.name}
              </p>
              <p className="mb-0 text-muted">
                Seeding Score: {pair.seedingScore} pts
              </p>
            </Col>
            {stats && (
              <Col md={6}>
                <h6>Statistics</h6>
                <Row>
                  <Col xs={6}>
                    <p className="mb-1">
                      <small className="text-muted">Rank:</small>{' '}
                      <strong>#{stats.rank || '-'}</strong>
                    </p>
                    <p className="mb-1">
                      <small className="text-muted">Points:</small>{' '}
                      <strong>{stats.points}</strong>
                    </p>
                  </Col>
                  <Col xs={6}>
                    <p className="mb-1">
                      <small className="text-muted">Record:</small>{' '}
                      <strong>{stats.wins}W - {stats.losses}L</strong>
                    </p>
                    <p className="mb-1">
                      <small className="text-muted">Win Rate:</small>{' '}
                      <strong>{stats.winRate}%</strong>
                    </p>
                  </Col>
                </Row>
              </Col>
            )}
          </Row>
        )}

        {history.length === 0 ? (
          <Alert variant="info" className="mb-0">
            No tournament history found for this pair.
          </Alert>
        ) : (
          <>
            <Table striped hover responsive size="sm">
              <thead>
                <tr>
                  <th>Tournament</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Registration</th>
                  {history.some(h => h.registration.seedPosition) && <th>Seed</th>}
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.registrationId}>
                    <td>
                      <Link to={`/tournaments/${entry.tournament.id}`}>
                        {entry.tournament.name}
                      </Link>
                      {entry.tournament.clubName && (
                        <small className="d-block text-muted">
                          {entry.tournament.clubName}
                        </small>
                      )}
                    </td>
                    <td>
                      <small>
                        {formatDate(entry.tournament.startDate)}
                        {entry.tournament.endDate !== entry.tournament.startDate && (
                          <> - {formatDate(entry.tournament.endDate)}</>
                        )}
                      </small>
                    </td>
                    <td>{getTournamentStatusBadge(entry.tournament.status)}</td>
                    <td>
                      <Badge bg={PAIR_STATUS_VARIANTS[entry.registration.status]}>
                        {PAIR_STATUS_LABELS[entry.registration.status]}
                      </Badge>
                      {entry.registration.eligibilityOverride && (
                        <Badge bg="warning" className="ms-1" title={entry.registration.overrideReason}>
                          Override
                        </Badge>
                      )}
                    </td>
                    {history.some(h => h.registration.seedPosition) && (
                      <td>
                        {entry.registration.seedPosition ? `#${entry.registration.seedPosition}` : '-'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>

            {pagination.totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center">
                <small className="text-muted">
                  Showing {(pagination.page - 1) * pagination.limit + 1} -{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
                  {pagination.totalCount} tournaments
                </small>
                <Pagination size="sm" className="mb-0">
                  <Pagination.First
                    onClick={() => setPage(1)}
                    disabled={pagination.page === 1}
                  />
                  <Pagination.Prev
                    onClick={() => setPage(page - 1)}
                    disabled={pagination.page === 1}
                  />
                  {[...Array(pagination.totalPages)].map((_, idx) => (
                    <Pagination.Item
                      key={idx + 1}
                      active={idx + 1 === pagination.page}
                      onClick={() => setPage(idx + 1)}
                    >
                      {idx + 1}
                    </Pagination.Item>
                  ))}
                  <Pagination.Next
                    onClick={() => setPage(page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                  />
                  <Pagination.Last
                    onClick={() => setPage(pagination.totalPages)}
                    disabled={pagination.page === pagination.totalPages}
                  />
                </Pagination>
              </div>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default PairHistoryDisplay;
