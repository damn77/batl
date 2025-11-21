import { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Card, Badge, Alert, Spinner, ListGroup, Modal, Form } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import RegistrationStatusBadge from '../components/RegistrationStatusBadge';
import TournamentFormatBadge from '../components/TournamentFormatBadge';
import { listTournaments, STATUS_LABELS as TOURNAMENT_STATUS_LABELS } from '../services/tournamentService';
import {
  registerForTournament,
  unregisterFromTournament,
  getMyRegistration,
  TOURNAMENT_REGISTRATION_STATUS,
  STATUS_DESCRIPTIONS
} from '../services/tournamentRegistrationService';
import {
  listPairs,
  createOrGetPair,
  registerPairForTournament
} from '../services/pairService';
import { listPlayers } from '../services/playerService';
import { useAuth } from '../utils/AuthContext';

/**
 * T022, T024: TournamentRegistrationPage
 * Player page for browsing and registering for tournaments
 */
const TournamentRegistrationPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [registrations, setRegistrations] = useState({}); // tournamentId -> registration object
  const [loading, setLoading] = useState(false);
  const [loadingRegistrations, setLoadingRegistrations] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [showUnregisterModal, setShowUnregisterModal] = useState(false);

  // Pair registration modal state
  const [showPairModal, setShowPairModal] = useState(false);
  const [pairModalTournament, setPairModalTournament] = useState(null);
  const [availablePairs, setAvailablePairs] = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [selectedPairId, setSelectedPairId] = useState('');
  const [newPairPlayer2Id, setNewPairPlayer2Id] = useState('');
  const [pairModalMode, setPairModalMode] = useState('select'); // 'select' or 'create'
  const [pairModalLoading, setPairModalLoading] = useState(false);
  const [userProfileId, setUserProfileId] = useState(null);

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load only SCHEDULED tournaments
      // The API now includes myRegistration field for each tournament (optimization to avoid N+1 queries)
      const data = await listTournaments({ status: 'SCHEDULED', limit: 100 });
      const tournamentList = data.tournaments || [];
      setTournaments(tournamentList);

      // Build registration map from the tournaments (myRegistration field)
      const regMap = {};
      tournamentList.forEach((tournament) => {
        if (tournament.myRegistration) {
          regMap[tournament.id] = {
            registration: tournament.myRegistration
          };
        }
      });
      setRegistrations(regMap);

      // Load user's profile ID for pair filtering
      if (user) {
        const playersData = await listPlayers({ limit: 100 });
        const userProfile = playersData.profiles?.find(p => p.userId === user.id);
        if (userProfile) {
          setUserProfileId(userProfile.id);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  // Load pairs for the pair modal
  const loadPairsForModal = async (tournament) => {
    if (!userProfileId) return;

    try {
      // Load pairs where user is a member and category matches tournament
      const pairsData = await listPairs({
        playerId: userProfileId,
        categoryId: tournament.categoryId,
        limit: 100
      });

      // Filter to only pairs in the tournament's category
      const filteredPairs = (pairsData.pairs || []).filter(
        pair => pair.categoryId === tournament.categoryId
      );
      setAvailablePairs(filteredPairs);

      // Load all players for pair creation
      const playersData = await listPlayers({ limit: 100 });
      // Filter out the current user
      const otherPlayers = (playersData.profiles || []).filter(p => p.id !== userProfileId);
      setAvailablePlayers(otherPlayers);
    } catch (err) {
      console.error('Failed to load pairs:', err);
      setAvailablePairs([]);
      setAvailablePlayers([]);
    }
  };

  // Open pair modal for DOUBLES tournament
  const openPairModal = async (tournament) => {
    setPairModalTournament(tournament);
    setSelectedPairId('');
    setNewPairPlayer2Id('');
    setPairModalMode('select');
    setPairModalLoading(true);
    setShowPairModal(true);

    await loadPairsForModal(tournament);
    setPairModalLoading(false);
  };

  // Handle pair registration
  const handlePairRegister = async () => {
    if (!pairModalTournament) return;

    setPairModalLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let pairId = selectedPairId;

      // If creating a new pair
      if (pairModalMode === 'create') {
        if (!newPairPlayer2Id) {
          setError('Please select Player 2 for the new pair');
          setPairModalLoading(false);
          return;
        }

        // Create the pair
        const newPair = await createOrGetPair(
          userProfileId,
          newPairPlayer2Id,
          pairModalTournament.categoryId
        );

        if (!newPair.isNew) {
          // Pair already exists - use it
          pairId = newPair.id;
        } else {
          pairId = newPair.id;
        }
      }

      if (!pairId) {
        setError('Please select a pair or create a new one');
        setPairModalLoading(false);
        return;
      }

      // Register the pair for the tournament
      const result = await registerPairForTournament(pairModalTournament.id, pairId);

      // Close modal
      setShowPairModal(false);
      setPairModalTournament(null);

      // Reload tournaments to get updated registration status
      await loadTournaments();

      // Show success message
      const statusMessage = result.status === 'WAITLISTED'
        ? `Pair added to waitlist for ${pairModalTournament.name}. ${STATUS_DESCRIPTIONS.WAITLISTED}`
        : `Pair successfully registered for ${pairModalTournament.name}!`;

      setSuccess(statusMessage);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      const errorData = err.response?.data?.error;
      if (errorData?.details?.violations) {
        setError(
          <div>
            <strong>Registration failed:</strong>
            <ul className="mb-0 mt-1">
              {errorData.details.violations.map((v, idx) => (
                <li key={idx}>{v}</li>
              ))}
            </ul>
          </div>
        );
      } else {
        setError(errorData?.message || 'Failed to register pair');
      }
    } finally {
      setPairModalLoading(false);
    }
  };

  const handleRegister = async (tournamentId) => {
    // Find the tournament to check if it's DOUBLES
    const tournament = tournaments.find(t => t.id === tournamentId);

    // If it's a DOUBLES tournament, open the pair modal instead
    if (tournament?.category?.type === 'DOUBLES') {
      openPairModal(tournament);
      return;
    }

    setLoadingRegistrations({ ...loadingRegistrations, [tournamentId]: true });
    setError(null);
    setSuccess(null);

    try {
      const result = await registerForTournament(tournamentId);

      // Reload registration status to get the current state
      const updatedReg = await getMyRegistration(tournamentId);
      setRegistrations({
        ...registrations,
        [tournamentId]: updatedReg
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

      // Reload registration status to get the current state
      const updatedReg = await getMyRegistration(tournamentId);
      setRegistrations({
        ...registrations,
        [tournamentId]: updatedReg
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
                    <Card.Title>
                      <Link
                        to={`/tournaments/${tournament.id}`}
                        className="text-decoration-none text-dark"
                      >
                        {tournament.name}
                      </Link>
                    </Card.Title>
                    <Card.Subtitle className="mb-2 text-muted">
                      {tournament.category?.name || 'Unknown Category'}
                    </Card.Subtitle>

                    <ListGroup variant="flush" className="mb-3">
                      <ListGroup.Item>
                        <strong>Dates:</strong>{' '}
                        {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
                      </ListGroup.Item>

                      {tournament.clubName && (
                        <ListGroup.Item>
                          <strong>Location:</strong> {tournament.clubName}
                          {tournament.address && <><br /><small className="text-muted">{tournament.address}</small></>}
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

                      {/* Display tournament format with icon and tooltip */}
                      {tournament.formatType && (
                        <ListGroup.Item>
                          <strong>Format:</strong>{' '}
                          <TournamentFormatBadge
                            formatType={tournament.formatType}
                            formatConfig={tournament.formatConfig}
                          />
                        </ListGroup.Item>
                      )}
                    </ListGroup>

                    <div className="d-flex gap-2 align-items-center flex-wrap">
                      {getRegistrationButton(tournament)}
                      <Button
                        variant="outline-info"
                        size="sm"
                        onClick={() => navigate(`/tournament/${tournament.id}/rules`)}
                      >
                        View Rules
                      </Button>
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

        {/* Pair Registration Modal for DOUBLES tournaments */}
        <Modal show={showPairModal} onHide={() => setShowPairModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Register Pair for {pairModalTournament?.name}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {pairModalLoading ? (
              <div className="text-center py-4">
                <Spinner animation="border" />
                <p className="mt-2">Loading pairs...</p>
              </div>
            ) : (
              <>
                {/* Mode Selection */}
                <Form.Group className="mb-3">
                  <Form.Label>Registration Option</Form.Label>
                  <div>
                    <Form.Check
                      type="radio"
                      id="mode-select"
                      name="pairMode"
                      label="Select existing pair"
                      checked={pairModalMode === 'select'}
                      onChange={() => setPairModalMode('select')}
                      disabled={availablePairs.length === 0}
                    />
                    <Form.Check
                      type="radio"
                      id="mode-create"
                      name="pairMode"
                      label="Create new pair"
                      checked={pairModalMode === 'create'}
                      onChange={() => setPairModalMode('create')}
                    />
                  </div>
                </Form.Group>

                {pairModalMode === 'select' ? (
                  /* Select Existing Pair */
                  <Form.Group className="mb-3">
                    <Form.Label>Select Pair</Form.Label>
                    {availablePairs.length === 0 ? (
                      <Alert variant="info">
                        No existing pairs found for this category. Please create a new pair.
                      </Alert>
                    ) : (
                      <Form.Select
                        value={selectedPairId}
                        onChange={(e) => setSelectedPairId(e.target.value)}
                      >
                        <option value="">-- Select a pair --</option>
                        {availablePairs.map((pair) => (
                          <option key={pair.id} value={pair.id}>
                            {pair.player1?.name} & {pair.player2?.name}
                            {pair.seedingScore > 0 && ` (${pair.seedingScore} pts)`}
                          </option>
                        ))}
                      </Form.Select>
                    )}
                  </Form.Group>
                ) : (
                  /* Create New Pair */
                  <Form.Group className="mb-3">
                    <Form.Label>Select Player 2</Form.Label>
                    <Form.Text className="d-block mb-2 text-muted">
                      You will be Player 1. Select your partner below.
                    </Form.Text>
                    <Form.Select
                      value={newPairPlayer2Id}
                      onChange={(e) => setNewPairPlayer2Id(e.target.value)}
                    >
                      <option value="">-- Select partner --</option>
                      {availablePlayers.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.name}
                          {player.gender && ` (${player.gender})`}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">
                      Partner must meet category requirements (age, gender)
                    </Form.Text>
                  </Form.Group>
                )}
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPairModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handlePairRegister}
              disabled={pairModalLoading || (pairModalMode === 'select' && !selectedPairId) || (pairModalMode === 'create' && !newPairPlayer2Id)}
            >
              {pairModalLoading ? <Spinner animation="border" size="sm" /> : 'Register Pair'}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </>
  );
};

export default TournamentRegistrationPage;
