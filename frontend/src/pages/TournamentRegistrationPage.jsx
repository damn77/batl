import { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Card, Badge, Alert, Spinner, ListGroup, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import RegistrationStatusBadge from '../components/RegistrationStatusBadge';
import { listTournaments, STATUS_LABELS as TOURNAMENT_STATUS_LABELS } from '../services/tournamentService';
import {
  registerForTournament,
  unregisterFromTournament,
  getMyRegistration,
  TOURNAMENT_REGISTRATION_STATUS,
  STATUS_DESCRIPTIONS
} from '../services/tournamentRegistrationService';

/**
 * T022, T024: TournamentRegistrationPage
 * Player page for browsing and registering for tournaments
 */
const TournamentRegistrationPage = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [registrations, setRegistrations] = useState({}); // tournamentId -> registration object
  const [loading, setLoading] = useState(false);
  const [loadingRegistrations, setLoadingRegistrations] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [showUnregisterModal, setShowUnregisterModal] = useState(false);

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load only SCHEDULED tournaments
      const data = await listTournaments({ status: 'SCHEDULED', limit: 100 });
      const tournamentList = data.tournaments || [];
      setTournaments(tournamentList);

      // Load registration status for each tournament
      const regPromises = tournamentList.map(async (tournament) => {
        try {
          const reg = await getMyRegistration(tournament.id);
          return { tournamentId: tournament.id, registration: reg };
        } catch (err) {
          return { tournamentId: tournament.id, registration: null };
        }
      });

      const regResults = await Promise.all(regPromises);
      const regMap = {};
      regResults.forEach(({ tournamentId, registration }) => {
        regMap[tournamentId] = registration;
      });
      setRegistrations(regMap);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (tournamentId) => {
    setLoadingRegistrations({ ...loadingRegistrations, [tournamentId]: true });
    setError(null);
    setSuccess(null);

    try {
      const result = await registerForTournament(tournamentId);

      // Update registrations map
      setRegistrations({
        ...registrations,
        [tournamentId]: result.registration
      });

      // Show success message
      const statusMessage = result.registration.status === 'WAITLISTED'
        ? `Added to waitlist for ${result.tournament.name}. ${STATUS_DESCRIPTIONS.WAITLISTED}`
        : `Successfully registered for ${result.tournament.name}!`;

      setSuccess(statusMessage);

      // Auto-clear success after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      const errorData = err.response?.data?.error;
      setError(errorData?.message || 'Failed to register for tournament');
    } finally {
      setLoadingRegistrations({ ...loadingRegistrations, [tournamentId]: false });
    }
  };

  const handleUnregisterClick = (tournament) => {
    setSelectedTournament(tournament);
    setShowUnregisterModal(true);
  };

  const handleUnregisterConfirm = async () => {
    if (!selectedTournament) return;

    const tournamentId = selectedTournament.id;
    setLoadingRegistrations({ ...loadingRegistrations, [tournamentId]: true });
    setError(null);
    setSuccess(null);
    setShowUnregisterModal(false);

    try {
      const result = await unregisterFromTournament(tournamentId);

      // Update registrations map
      setRegistrations({
        ...registrations,
        [tournamentId]: result.registration
      });

      // Build success message
      let message = `Successfully unregistered from ${selectedTournament.name}`;

      if (result.promotedPlayer) {
        message += `. ${result.promotedPlayer.playerName} has been promoted from the waitlist.`;
      }

      if (result.categoryCleanup?.unregistered) {
        message += ` You have been removed from the category (no participation history).`;
      }

      setSuccess(message);

      // Auto-clear success after 7 seconds
      setTimeout(() => setSuccess(null), 7000);
    } catch (err) {
      const errorData = err.response?.data?.error;
      setError(errorData?.message || 'Failed to unregister from tournament');
    } finally {
      setLoadingRegistrations({ ...loadingRegistrations, [tournamentId]: false });
      setSelectedTournament(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRegistrationButton = (tournament) => {
    const registration = registrations[tournament.id];
    const isLoading = loadingRegistrations[tournament.id];

    if (!registration) {
      // Not registered - show register button
      return (
        <Button
          variant="primary"
          size="sm"
          onClick={() => handleRegister(tournament.id)}
          disabled={isLoading}
        >
          {isLoading ? <Spinner animation="border" size="sm" /> : 'Register'}
        </Button>
      );
    }

    // Already registered - show status and unregister button
    const status = registration.registration?.status;

    if (status === 'WITHDRAWN' || status === 'CANCELLED') {
      // Can re-register
      return (
        <>
          <RegistrationStatusBadge status={status} showDescription />
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => handleRegister(tournament.id)}
            disabled={isLoading}
          >
            {isLoading ? <Spinner animation="border" size="sm" /> : 'Re-register'}
          </Button>
        </>
      );
    }

    // Active registration - show unregister
    return (
      <>
        <RegistrationStatusBadge status={status} showDescription />
        <Button
          variant="outline-danger"
          size="sm"
          onClick={() => handleUnregisterClick(tournament)}
          disabled={isLoading}
        >
          {isLoading ? <Spinner animation="border" size="sm" /> : 'Unregister'}
        </Button>
      </>
    );
  };

  if (loading) {
    return (
      <>
        <NavBar />
        <Container className="mt-4 text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-2">Loading tournaments...</p>
        </Container>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <Container className="mt-4">
        <Row className="mb-4">
          <Col>
            <h2>Tournament Registration</h2>
            <p className="text-muted">
              Browse and register for upcoming tournaments
            </p>
          </Col>
        </Row>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {tournaments.length === 0 ? (
          <Alert variant="info">
            No upcoming tournaments available. Check back later!
          </Alert>
        ) : (
          <Row>
            {tournaments.map((tournament) => (
              <Col key={tournament.id} md={6} lg={4} className="mb-4">
                <Card>
                  <Card.Body>
                    <Card.Title>{tournament.name}</Card.Title>
                    <Card.Subtitle className="mb-2 text-muted">
                      {tournament.category?.name || 'Unknown Category'}
                    </Card.Subtitle>

                    <ListGroup variant="flush" className="mb-3">
                      <ListGroup.Item>
                        <strong>Dates:</strong>{' '}
                        {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
                      </ListGroup.Item>

                      {tournament.location && (
                        <ListGroup.Item>
                          <strong>Location:</strong> {tournament.location}
                        </ListGroup.Item>
                      )}

                      {tournament.capacity && (
                        <ListGroup.Item>
                          <strong>Capacity:</strong> {tournament.capacity} players
                        </ListGroup.Item>
                      )}

                      {tournament.entryFee && (
                        <ListGroup.Item>
                          <strong>Entry Fee:</strong> ${tournament.entryFee}
                        </ListGroup.Item>
                      )}

                      {tournament.prizeDescription && (
                        <ListGroup.Item>
                          <strong>Prizes:</strong> {tournament.prizeDescription}
                        </ListGroup.Item>
                      )}

                      <ListGroup.Item>
                        <strong>Status:</strong>{' '}
                        <Badge bg="info">{TOURNAMENT_STATUS_LABELS[tournament.status]}</Badge>
                      </ListGroup.Item>
                    </ListGroup>

                    <div className="d-flex gap-2 align-items-center">
                      {getRegistrationButton(tournament)}
                    </div>

                    {tournament.description && (
                      <Card.Text className="mt-3 text-muted small">
                        {tournament.description}
                      </Card.Text>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        {/* Unregister Confirmation Modal */}
        <Modal show={showUnregisterModal} onHide={() => setShowUnregisterModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Unregistration</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedTournament && (
              <>
                <p>
                  Are you sure you want to unregister from <strong>{selectedTournament.name}</strong>?
                </p>
                <Alert variant="warning" className="small">
                  <strong>Note:</strong> If you are currently registered (not waitlisted),
                  your spot will be given to the next player on the waitlist.
                </Alert>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowUnregisterModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleUnregisterConfirm}>
              Unregister
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </>
  );
};

export default TournamentRegistrationPage;
