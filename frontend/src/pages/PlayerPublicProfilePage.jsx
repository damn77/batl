// Phase 3 - STATS-02: Public player profile page — no auth required
// Route: /players/:id
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Tab, Nav, Spinner, Alert } from 'react-bootstrap';
import NavBar from '../components/NavBar';
import MatchHistoryTab from '../components/MatchHistoryTab';
import { getPublicPlayerProfile } from '../services/playerService';

const PlayerPublicProfilePage = () => {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      setNotFound(false);
      try {
        const data = await getPublicPlayerProfile(id);
        if (!cancelled) {
          setProfile(data);
        }
      } catch (err) {
        if (!cancelled) {
          if (err.status === 404) {
            setNotFound(true);
          } else {
            setError(err.message || 'Failed to load player profile.');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      <NavBar />
      <Container className="mt-4">
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        )}

        {notFound && !loading && (
          <Alert variant="warning">Player not found.</Alert>
        )}

        {error && !loading && (
          <Alert variant="danger">{error}</Alert>
        )}

        {!loading && !notFound && !error && profile && (
          <>
            <h2 className="mb-4">{profile.name}</h2>

            <Tab.Container defaultActiveKey="profile">
              <Nav variant="tabs" className="mb-3">
                <Nav.Item>
                  <Nav.Link eventKey="profile">Profile</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="matches">Match History</Nav.Link>
                </Nav.Item>
              </Nav>

              <Tab.Content>
                <Tab.Pane eventKey="profile">
                  <div className="mt-3">
                    <p>
                      <strong>Name:</strong> {profile.name}
                    </p>
                    <p>
                      <strong>Linked account:</strong> {profile.hasAccount ? 'Yes' : 'No'}
                    </p>
                  </div>
                </Tab.Pane>

                <Tab.Pane eventKey="matches">
                  <div className="mt-3">
                    <MatchHistoryTab playerId={id} />
                  </div>
                </Tab.Pane>
              </Tab.Content>
            </Tab.Container>
          </>
        )}
      </Container>
    </>
  );
};

export default PlayerPublicProfilePage;
