import { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Button,
  Card,
  Badge,
  Alert,
  Spinner,
  Form,
  Table,
  Collapse,
} from 'react-bootstrap';
import NavBar from '../components/NavBar';
import PairSelector from '../components/PairSelector';
import { useAuth } from '../utils/AuthContext';
import { listPlayers } from '../services/playerService';
import { listCategories } from '../services/categoryService';
import { listTournaments } from '../services/tournamentService';
import {
  createOrGetPair,
  registerPairForTournament,
  checkPairEligibility,
  listPairs,
  PAIR_STATUS_LABELS,
  PAIR_STATUS_VARIANTS,
} from '../services/pairService';

/**
 * PairRegistrationPage
 * Feature: 006-doubles-pairs - User Story 1 (T029-T032)
 *
 * Allows players to register doubles pairs for tournaments:
 * - Select two players to form a pair
 * - Select a doubles category
 * - Select a tournament in that category
 * - Check eligibility before registration
 * - View existing pair registrations
 */
const PairRegistrationPage = () => {
  const { user } = useAuth();

  // Data lists
  const [players, setPlayers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [playerPairs, setPlayerPairs] = useState([]);

  // Form selections
  const [player1Id, setPlayer1Id] = useState('');
  const [player2Id, setPlayer2Id] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedTournamentId, setSelectedTournamentId] = useState('');

  // State
  const [createdPair, setCreatedPair] = useState(null);
  const [eligibilityResult, setEligibilityResult] = useState(null);

  // T072: Override state (organizer/admin only)
  const [eligibilityOverride, setEligibilityOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [allowIneligiblePair, setAllowIneligiblePair] = useState(false);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [registering, setRegistering] = useState(false);

  // Messages
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // UI state
  const [showExistingPairs, setShowExistingPairs] = useState(false);

  // Category pairs for picker in Step 3
  const [categoryPairs, setCategoryPairs] = useState([]);
  const [selectedExistingPairId, setSelectedExistingPairId] = useState('');

  // Auto-select user's profile as player 1 if they are a PLAYER role
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCategoryId) {
      loadTournamentsForCategory();
    } else {
      setTournaments([]);
      setSelectedTournamentId('');
    }
  }, [selectedCategoryId]);

  useEffect(() => {
    if (player1Id) {
      loadPlayerPairs();
    } else {
      setPlayerPairs([]);
    }
  }, [player1Id]);

  // Load pairs for category when tournament is selected
  useEffect(() => {
    if (selectedTournamentId && selectedCategoryId) {
      loadCategoryPairs();
    } else {
      setCategoryPairs([]);
      setSelectedExistingPairId('');
    }
  }, [selectedTournamentId, selectedCategoryId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all players
      const playersData = await listPlayers({ limit: 100 });
      setPlayers(playersData.profiles || []);

      // Load only DOUBLES categories
      const categoriesData = await listCategories({});
      const doublesCategories =
        categoriesData.categories?.filter((cat) => cat.type === 'DOUBLES') || [];
      setCategories(doublesCategories);

      // If user is a PLAYER, auto-select their profile as player 1
      if (user?.role === 'PLAYER') {
        const userProfile = playersData.profiles?.find((p) => p.userId === user.id);
        if (userProfile) {
          setPlayer1Id(userProfile.id);
        }
      }
    } catch (err) {
      setError(`Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadTournamentsForCategory = async () => {
    try {
      const tournamentsData = await listTournaments({ categoryId: selectedCategoryId });
      setTournaments(tournamentsData.tournaments || []);
    } catch (err) {
      console.error('Failed to load tournaments:', err);
      setTournaments([]);
    }
  };

  const loadPlayerPairs = async () => {
    try {
      const pairsData = await listPairs({ playerId: player1Id, limit: 50 });
      setPlayerPairs(pairsData.pairs || []);
    } catch (err) {
      console.error('Failed to load player pairs:', err);
      setPlayerPairs([]);
    }
  };

  const loadCategoryPairs = async () => {
    try {
      const pairsData = await listPairs({ categoryId: selectedCategoryId, limit: 100 });
      setCategoryPairs(pairsData.pairs || []);
    } catch (err) {
      console.error('Failed to load category pairs:', err);
      setCategoryPairs([]);
    }
  };

  const handleCreateOrGetPair = async () => {
    if (!player1Id || !player2Id || !selectedCategoryId) {
      setError('Please select both players and a category');
      return;
    }

    if (player1Id === player2Id) {
      setError('Both players cannot be the same person');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const pair = await createOrGetPair(player1Id, player2Id, selectedCategoryId, allowIneligiblePair);

      if (pair.isNew) {
        setCreatedPair(pair);
        setSuccess('New doubles pair created successfully!');
        // Reload player pairs
        await loadPlayerPairs();
      } else {
        // Duplicate pair - show error instead of loading it
        setError(
          `A pair with ${pair.player1.name} & ${pair.player2.name} already exists in ${pair.category.name}. ` +
          `You can select it from "Existing Pairs" or the pair picker in Step 3.`
        );
        // Reload player pairs to show the existing pair
        await loadPlayerPairs();
      }
    } catch (err) {
      setError(`Failed to create pair: ${err.response?.data?.error?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckEligibility = async () => {
    const pairToCheck = getSelectedPair();
    if (!pairToCheck || !selectedTournamentId) {
      setError('Please select a pair and tournament first');
      return;
    }

    try {
      setCheckingEligibility(true);
      setError(null);
      setEligibilityResult(null);

      const result = await checkPairEligibility(selectedTournamentId, pairToCheck.id);
      setEligibilityResult(result);
    } catch (err) {
      setError(
        `Failed to check eligibility: ${err.response?.data?.error?.message || err.message}`
      );
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handleRegisterPair = async () => {
    const pairToRegister = getSelectedPair();
    if (!pairToRegister || !selectedTournamentId) {
      setError('Please select a pair and tournament first');
      return;
    }

    // T073: Validate override reason if override is enabled
    if (eligibilityOverride && !overrideReason.trim()) {
      setError('Override reason is required when eligibility override is enabled');
      return;
    }

    try {
      setRegistering(true);
      setError(null);
      setSuccess(null);

      // T074: Include override fields in submission
      const registration = await registerPairForTournament(
        selectedTournamentId,
        pairToRegister.id,
        eligibilityOverride,
        overrideReason.trim() || null
      );

      setSuccess(
        `Pair successfully registered for tournament! Status: ${PAIR_STATUS_LABELS[registration.status]}`
      );

      // Reset eligibility result and override fields
      setEligibilityResult(null);
      setEligibilityOverride(false);
      setOverrideReason('');

      // Reload player pairs to show updated registrations
      await loadPlayerPairs();
    } catch (err) {
      console.error('Registration error:', err);

      // Handle both apiClient custom error object and raw axios error
      // apiClient interceptor returns { status, code, message, details } directly
      const errorData = err.response?.data?.error || err;
      const violations = errorData?.details?.violations || errorData?.violations;

      if (violations) {
        setError(
          <div>
            <strong>Eligibility violations:</strong>
            <ul>
              {violations.map((v, idx) => (
                <li key={idx}>{v}</li>
              ))}
            </ul>
          </div>
        );
      } else {
        setError(`Failed to register pair: ${errorData?.message || err.message || 'Unknown error'}`);
      }
    } finally {
      setRegistering(false);
    }
  };

  const resetForm = () => {
    setPlayer1Id('');
    setPlayer2Id('');
    setSelectedCategoryId('');
    setSelectedTournamentId('');
    setCreatedPair(null);
    setEligibilityResult(null);
    setEligibilityOverride(false);
    setOverrideReason('');
    setError(null);
    setSuccess(null);
    setCategoryPairs([]);
    setSelectedExistingPairId('');
  };

  // Get the pair to register (either created or selected from existing)
  const getSelectedPair = () => {
    if (selectedExistingPairId) {
      return categoryPairs.find(p => p.id === selectedExistingPairId);
    }
    return createdPair;
  };

  return (
    <>
      <NavBar />
      <Container className="mt-4">
        <Row>
          <Col>
            <h1>Register Doubles Pair</h1>
            <p className="text-muted">
              Create or select a doubles pair and register for a tournament in a doubles category.
            </p>
          </Col>
        </Row>

        {loading && (
          <Row className="mt-3">
            <Col className="text-center">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </Col>
          </Row>
        )}

        {error && (
          <Row className="mt-3">
            <Col>
              <Alert variant="danger" onClose={() => setError(null)} dismissible>
                {error}
              </Alert>
            </Col>
          </Row>
        )}

        {success && (
          <Row className="mt-3">
            <Col>
              <Alert variant="success" onClose={() => setSuccess(null)} dismissible>
                {success}
              </Alert>
            </Col>
          </Row>
        )}

        {!loading && (
          <>
            {/* Existing Pairs - Collapsible at top */}
            {player1Id && playerPairs.length > 0 && (
              <Row className="mt-3">
                <Col>
                  <Card>
                    <Card.Header
                      onClick={() => setShowExistingPairs(!showExistingPairs)}
                      style={{ cursor: 'pointer' }}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <h5 className="mb-0">
                        Existing Pairs ({playerPairs.length})
                      </h5>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 text-decoration-none"
                        aria-controls="existing-pairs-collapse"
                        aria-expanded={showExistingPairs}
                      >
                        {showExistingPairs ? '▲ Hide' : '▼ Show'}
                      </Button>
                    </Card.Header>
                    <Collapse in={showExistingPairs}>
                      <div id="existing-pairs-collapse">
                        <Card.Body>
                          <Table striped bordered hover responsive size="sm">
                            <thead>
                              <tr>
                                <th>Partner</th>
                                <th>Category</th>
                                <th>Seeding Score</th>
                                <th>Active Registrations</th>
                              </tr>
                            </thead>
                            <tbody>
                              {playerPairs.map((pair) => {
                                const partner =
                                  pair.player1.id === player1Id ? pair.player2 : pair.player1;
                                const activeRegs = pair.pairRegistrations?.filter(
                                  (r) => r.status === 'REGISTERED' || r.status === 'WAITLISTED'
                                );

                                return (
                                  <tr key={pair.id}>
                                    <td>{partner.name}</td>
                                    <td>{pair.category.name}</td>
                                    <td>{pair.seedingScore.toFixed(0)}</td>
                                    <td>
                                      {activeRegs?.length > 0 ? (
                                        <ul className="mb-0 small">
                                          {activeRegs.map((reg) => (
                                            <li key={reg.id}>
                                              {reg.tournamentId.slice(0, 8)}... -{' '}
                                              <Badge bg={PAIR_STATUS_VARIANTS[reg.status]} className="me-1">
                                                {PAIR_STATUS_LABELS[reg.status]}
                                              </Badge>
                                              {reg.eligibilityOverride && (
                                                <Badge bg="warning" text="dark" title={reg.overrideReason || 'Eligibility override'}>
                                                  Override
                                                </Badge>
                                              )}
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <span className="text-muted">None</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </Table>
                        </Card.Body>
                      </div>
                    </Collapse>
                  </Card>
                </Col>
              </Row>
            )}

            {/* Step 1: Select Players */}
            <Row className="mt-4">
              <Col>
                <Card>
                  <Card.Header>
                    <h5>Step 1: Select Players</h5>
                  </Card.Header>
                  <Card.Body>
                    <PairSelector
                      players={players}
                      player1Id={player1Id}
                      player2Id={player2Id}
                      onPlayer1Change={setPlayer1Id}
                      onPlayer2Change={setPlayer2Id}
                      disabled={loading || registering}
                      player1Locked={user?.role === 'PLAYER'}
                    />
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Step 2: Select Category and Create Pair */}
            <Row className="mt-3">
              <Col>
                <Card>
                  <Card.Header>
                    <h5>Step 2: Select Category and Create Pair</h5>
                  </Card.Header>
                  <Card.Body>
                    <Form.Group className="mb-3">
                      <Form.Label>Doubles Category *</Form.Label>
                      <Form.Select
                        value={selectedCategoryId}
                        onChange={(e) => {
                          setSelectedCategoryId(e.target.value);
                          setCreatedPair(null); // Reset pair when category changes
                        }}
                        disabled={!player1Id || !player2Id || loading}
                      >
                        <option value="">Select a doubles category...</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name} ({cat.gender}, {cat.ageGroup})
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Text className="text-muted">
                        Only DOUBLES type categories are shown
                      </Form.Text>
                    </Form.Group>

                    {/* Allow ineligible pair creation (organizer/admin only) */}
                    {(user?.role === 'ORGANIZER' || user?.role === 'ADMIN') && (
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="checkbox"
                          id="allowIneligiblePair"
                          label="Allow creating ineligible pair (Override eligibility requirements)"
                          checked={allowIneligiblePair}
                          onChange={(e) => setAllowIneligiblePair(e.target.checked)}
                        />
                        <Form.Text className="text-muted">
                          Check this to create a pair that doesn't meet category eligibility requirements
                        </Form.Text>
                      </Form.Group>
                    )}

                    <Button
                      variant="primary"
                      onClick={handleCreateOrGetPair}
                      disabled={
                        !player1Id ||
                        !player2Id ||
                        !selectedCategoryId ||
                        player1Id === player2Id ||
                        loading
                      }
                    >
                      Create Pair
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Step 3: Select Tournament and Register */}
            {selectedCategoryId && (
              <Row className="mt-3">
                <Col>
                  <Card>
                    <Card.Header>
                      <h5>Step 3: Select Tournament and Register</h5>
                    </Card.Header>
                    <Card.Body>
                      {createdPair && (
                        <Alert variant="success" className="mb-3">
                          <strong>New Pair Created:</strong> {createdPair.player1.name} &amp;{' '}
                          {createdPair.player2.name}
                          <br />
                          <strong>Category:</strong> {createdPair.category.name}
                          <br />
                          <strong>Seeding Score:</strong> {createdPair.seedingScore.toFixed(0)}
                        </Alert>
                      )}

                      <Form.Group className="mb-3">
                        <Form.Label>Tournament *</Form.Label>
                        <Form.Select
                          value={selectedTournamentId}
                          onChange={(e) => {
                            setSelectedTournamentId(e.target.value);
                            setEligibilityResult(null); // Reset eligibility when tournament changes
                            setSelectedExistingPairId(''); // Reset pair selection
                          }}
                          disabled={loading || tournaments.length === 0}
                        >
                          <option value="">Select a tournament...</option>
                          {tournaments.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} - {t.status}
                              {t.startDate && ` (${new Date(t.startDate).toLocaleDateString()})`}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Text className="text-muted">
                          {tournaments.length === 0
                            ? 'No tournaments available for this category'
                            : 'Select the tournament to register for'}
                        </Form.Text>
                      </Form.Group>

                      {/* Pair picker - enabled after tournament selection */}
                      <Form.Group className="mb-3">
                        <Form.Label>Select Pair to Register *</Form.Label>
                        <Form.Select
                          value={selectedExistingPairId || (createdPair?.id || '')}
                          onChange={(e) => {
                            setSelectedExistingPairId(e.target.value);
                            setEligibilityResult(null);
                          }}
                          disabled={!selectedTournamentId || categoryPairs.length === 0}
                        >
                          <option value="">
                            {!selectedTournamentId
                              ? 'Select tournament first...'
                              : categoryPairs.length === 0
                                ? 'No pairs available in this category'
                                : 'Select a pair...'}
                          </option>
                          {createdPair && !categoryPairs.find(p => p.id === createdPair.id) && (
                            <option key={createdPair.id} value={createdPair.id}>
                              {createdPair.player1.name} & {createdPair.player2.name} (Seeding: {createdPair.seedingScore.toFixed(0)}) - NEW
                            </option>
                          )}
                          {categoryPairs.map((pair) => (
                            <option key={pair.id} value={pair.id}>
                              {pair.player1.name} & {pair.player2.name} (Seeding: {pair.seedingScore?.toFixed(0) || 0})
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Text className="text-muted">
                          {!selectedTournamentId
                            ? 'Tournament must be selected before choosing a pair'
                            : 'Select an existing pair from this category or create a new one in Step 2'}
                        </Form.Text>
                      </Form.Group>

                      <div className="d-flex gap-2">
                        <Button
                          variant="info"
                          onClick={handleCheckEligibility}
                          disabled={!selectedTournamentId || (!selectedExistingPairId && !createdPair) || checkingEligibility}
                        >
                          {checkingEligibility && (
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              role="status"
                              aria-hidden="true"
                              className="me-2"
                            />
                          )}
                          Check Eligibility
                        </Button>

                        <Button
                          variant="success"
                          onClick={handleRegisterPair}
                          disabled={!selectedTournamentId || (!selectedExistingPairId && !createdPair) || registering}
                        >
                          {registering && (
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              role="status"
                              aria-hidden="true"
                              className="me-2"
                            />
                          )}
                          Register Pair
                        </Button>

                        <Button variant="secondary" onClick={resetForm}>
                          Reset Form
                        </Button>
                      </div>

                      {eligibilityResult && (
                        <Alert
                          variant={eligibilityResult.eligible ? 'success' : 'danger'}
                          className="mt-3"
                        >
                          <strong>Eligibility Check:</strong>{' '}
                          {eligibilityResult.eligible ? (
                            <span className="text-success">✓ Pair is eligible</span>
                          ) : (
                            <>
                              <span className="text-danger">✗ Pair is not eligible</span>
                              {eligibilityResult.violations && (
                                <ul className="mt-2 mb-0">
                                  {eligibilityResult.violations.map((v, idx) => (
                                    <li key={idx}>{v}</li>
                                  ))}
                                </ul>
                              )}
                            </>
                          )}
                        </Alert>
                      )}

                      {/* T072: Override checkbox and reason (organizer/admin only) */}
                      {user && (user.role === 'ORGANIZER' || user.role === 'ADMIN') && (
                        <div className="mt-3 p-3 border rounded bg-light">
                          <Form.Group className="mb-2">
                            <Form.Check
                              type="checkbox"
                              id="eligibilityOverride"
                              label="Override eligibility requirements (Admin/Organizer)"
                              checked={eligibilityOverride}
                              onChange={(e) => setEligibilityOverride(e.target.checked)}
                              disabled={registering}
                            />
                            <Form.Text className="text-muted">
                              Use this to register pairs that don't meet normal eligibility
                              requirements
                            </Form.Text>
                          </Form.Group>

                          {/* T073: Override reason validation */}
                          {eligibilityOverride && (
                            <>
                              <Form.Group>
                                <Form.Label>
                                  Override Reason <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Control
                                  as="textarea"
                                  rows={3}
                                  value={overrideReason}
                                  onChange={(e) => setOverrideReason(e.target.value)}
                                  placeholder="Explain why this pair should be allowed despite eligibility violations..."
                                  disabled={registering}
                                  isInvalid={eligibilityOverride && !overrideReason.trim()}
                                />
                                <Form.Control.Feedback type="invalid">
                                  Override reason is required when eligibility override is enabled
                                </Form.Control.Feedback>
                              </Form.Group>

                              {/* T076: Warning dialog showing violations */}
                              {eligibilityResult && !eligibilityResult.eligible && (
                                <Alert variant="warning" className="mt-2 mb-0">
                                  <strong>⚠ Warning:</strong> You are about to register a pair
                                  with the following violations:
                                  <ul className="mt-2 mb-0 small">
                                    {eligibilityResult.violations.map((v, idx) => (
                                      <li key={idx}>{v}</li>
                                    ))}
                                  </ul>
                                </Alert>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}

          </>
        )}
      </Container>
    </>
  );
};

export default PairRegistrationPage;
