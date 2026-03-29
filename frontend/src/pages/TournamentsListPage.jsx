// Phase 3 - navigation enabler: Completed tournaments list
// Route: /tournaments (public)
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Table, Spinner, Alert, Card, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import NavBar from '../components/NavBar';
import { listTournaments } from '../services/tournamentService';

const TournamentsListPage = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const formatLabel = (formatType) => {
    const key = formatType?.toLowerCase();
    return key ? t(`tournament.formats.${key}`) : '-';
  };

  useEffect(() => {
    let cancelled = false;

    const fetchTournaments = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await listTournaments({ status: 'COMPLETED' });
        if (!cancelled) {
          setTournaments(result.tournaments || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load tournaments.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTournaments();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <NavBar />
      <Container className="mt-4">
        <h2 className="mb-4">Completed Tournaments</h2>

        {loading && (
          <div className="text-center py-4">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        )}

        {error && !loading && (
          <Alert variant="danger">{error}</Alert>
        )}

        {!loading && !error && tournaments.length === 0 && (
          <p className="text-muted text-center py-4">No completed tournaments yet.</p>
        )}

        {!loading && !error && tournaments.length > 0 && (
          <>
            {/* Desktop (sm+): table layout */}
            <div className="d-none d-sm-block">
              <Table hover responsive>
                <thead>
                  <tr>
                    <th>Tournament</th>
                    <th>Category</th>
                    <th>Format</th>
                    <th>End Date</th>
                  </tr>
                </thead>
                <tbody>
                  {tournaments.map((tournament) => (
                    <tr key={tournament.id}>
                      <td>
                        <Link to={`/tournaments/${tournament.id}`}>
                          {tournament.name}
                        </Link>
                      </td>
                      <td>{tournament.category?.name || '-'}</td>
                      <td>{formatLabel(tournament.formatType)}</td>
                      <td>
                        {tournament.endDate
                          ? new Date(tournament.endDate).toLocaleDateString()
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {/* Mobile (xs): card layout */}
            <div className="d-sm-none">
              {tournaments.map((tournament) => (
                <Card
                  key={tournament.id}
                  className="mb-2"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/tournaments/${tournament.id}`)}
                >
                  <Card.Body className="py-2 px-3">
                    <div className="d-flex justify-content-between align-items-start">
                      <strong>{tournament.name}</strong>
                      <div className="d-flex gap-1 ms-2">
                        <Badge bg="secondary">
                          {tournament.category?.name || '-'}
                        </Badge>
                        <Badge bg="info">
                          {formatLabel(tournament.formatType)}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-muted small mt-1">
                      {tournament.endDate
                        ? new Date(tournament.endDate).toLocaleDateString()
                        : '-'}
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          </>
        )}
      </Container>
    </>
  );
};

export default TournamentsListPage;
