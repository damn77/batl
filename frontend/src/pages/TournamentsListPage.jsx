// Phase 3 - navigation enabler: Completed tournaments list
// Route: /tournaments (public)
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Table, Spinner, Alert } from 'react-bootstrap';
import NavBar from '../components/NavBar';
import { listTournaments } from '../services/tournamentService';

const TournamentsListPage = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          <Table hover responsive>
            <thead>
              <tr>
                <th>Tournament</th>
                <th>Category</th>
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
                  <td>
                    {tournament.endDate
                      ? new Date(tournament.endDate).toLocaleDateString()
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Container>
    </>
  );
};

export default TournamentsListPage;
