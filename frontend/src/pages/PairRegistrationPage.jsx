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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      setError(t('errors.failedToLoad', { resource: t('common.data') }) + `: ${err.message}`);
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
      setError(t('validation.selectPlayersAndCategory'));
      return;
    }

    if (player1Id === player2Id) {
      setError(t('validation.playersCannotBeSame'));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const pair = await createOrGetPair(player1Id, player2Id, selectedCategoryId, allowIneligiblePair);

      if (pair.isNew) {
        setCreatedPair(pair);
        setSuccess(t('messages.pairCreatedSuccess'));
        // Reload player pairs
        await loadPlayerPairs();
      } else {
        // Duplicate pair - show error instead of loading it
        setError(
          t('errors.pairAlreadyExists', {
            player1: pair.player1.name,
            player2: pair.player2.name,
            category: pair.category.name
          })
        );
        // Reload player pairs to show the existing pair
        await loadPlayerPairs();
      }
    } catch (err) {
      setError(t('errors.failedToCreate', { resource: t('common.pair') }) + `: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckEligibility = async () => {
    const pairToCheck = getSelectedPair();
    if (!pairToCheck || !selectedTournamentId) {
      setError(t('validation.selectPairAndTournament'));
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
        t('errors.failedToCheck', { resource: t('common.eligibility') }) + `: ${err.message}`
      );
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handleRegisterPair = async () => {
    const pairToRegister = getSelectedPair();
    if (!pairToRegister || !selectedTournamentId) {
      setError(t('validation.selectPairAndTournament'));
      return;
    }

    // T073: Validate override reason if override is enabled
    if (eligibilityOverride && !overrideReason.trim()) {
      setError(t('validation.overrideReasonRequired'));
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
        t('messages.pairRegisteredSuccess', { status: PAIR_STATUS_LABELS[registration.status] })
      );

      // Reset eligibility result and override fields
      setEligibilityResult(null);
      setEligibilityOverride(false);
      setOverrideReason('');

      // Reload player pairs to show updated registrations
      await loadPlayerPairs();
    } catch (err) {
      console.error('Registration error:', err);

      // apiClient interceptor returns { status, code, message, details } directly
      const violations = err.details?.violations;

      if (violations) {
        setError(
          <div>
            <strong>{t('errors.eligibilityViolations')}:</strong>
            <ul>
              {violations.map((v, idx) => (
                <li key={idx}>{v}</li>
              ))}
            </ul>
          </div>
        );
      } else {
        setError(t('errors.failedToRegister', { resource: t('common.pair') }) + `: ${err.message || t('errors.unknown')}`);
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
            <h1>{t('pages.pairRegistration.title')}</h1>
            <p className="text-muted">
              {t('pages.pairRegistration.description')}
            </p>
          </Col>
        </Row>

        {loading && (
          <Row className="mt-3">
            <Col className="text-center">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">{t('common.loading')}</span>
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
                        {t('pages.pairRegistration.existingPairs', { count: playerPairs.length })}
                      </h5>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 text-decoration-none"
                        aria-controls="existing-pairs-collapse"
                        aria-expanded={showExistingPairs}
                      >
                        {showExistingPairs ? t('buttons.hide') : t('buttons.show')}
                      </Button>
                    </Card.Header>
                    <Collapse in={showExistingPairs}>
                      <div id="existing-pairs-collapse">
                        <Card.Body>
                          <Table striped bordered hover responsive size="sm">
                            <thead>
                              <tr>
                                <th>{t('table.headers.partner')}</th>
                                <th>{t('table.headers.category')}</th>
                                <th>{t('table.headers.seedingScore')}</th>
                                <th>{t('table.headers.activeRegistrations')}</th>
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
                                                <Badge bg="warning" text="dark" title={reg.overrideReason || t('help.eligibilityOverride')}>
                                                  {t('status.override')}
                                                </Badge>
                                              )}
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <span className="text-muted">{t('common.none')}</span>
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
                    <h5>{t('pages.pairRegistration.step1')}</h5>
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
                    <h5>{t('pages.pairRegistration.step2')}</h5>
                  </Card.Header>
                  <Card.Body>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('form.labels.doublesCategory')} *</Form.Label>
                      <Form.Select
                        value={selectedCategoryId}
                        onChange={(e) => {
                          setSelectedCategoryId(e.target.value);
                          setCreatedPair(null); // Reset pair when category changes
                        }}
                        disabled={!player1Id || !player2Id || loading}
                      >
                        <option value="">{t('form.placeholders.selectDoublesCategory')}</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name} ({cat.gender}, {cat.ageGroup})
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Text className="text-muted">
                        {t('help.onlyDoublesCategories')}
                      </Form.Text>
                    </Form.Group>

                    {/* Allow ineligible pair creation (organizer/admin only) */}
                    {(user?.role === 'ORGANIZER' || user?.role === 'ADMIN') && (
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="checkbox"
                          id="allowIneligiblePair"
                          label={t('form.labels.allowIneligiblePair')}
                          checked={allowIneligiblePair}
                          onChange={(e) => setAllowIneligiblePair(e.target.checked)}
                        />
                        <Form.Text className="text-muted">
                          {t('help.allowIneligiblePairHint')}
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
                      {t('buttons.createPair')}
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
                      <h5>{t('pages.pairRegistration.step3')}</h5>
                    </Card.Header>
                    <Card.Body>
                      {createdPair && (
                        <Alert variant="success" className="mb-3">
                          <strong>{t('messages.newPairCreated')}:</strong> {createdPair.player1.name} &amp;{' '}
                          {createdPair.player2.name}
                          <br />
                          <strong>{t('form.labels.category')}:</strong> {createdPair.category.name}
                          <br />
                          <strong>{t('table.headers.seedingScore')}:</strong> {createdPair.seedingScore.toFixed(0)}
                        </Alert>
                      )}

                      <Form.Group className="mb-3">
                        <Form.Label>{t('form.labels.tournament')} *</Form.Label>
                        <Form.Select
                          value={selectedTournamentId}
                          onChange={(e) => {
                            setSelectedTournamentId(e.target.value);
                            setEligibilityResult(null); // Reset eligibility when tournament changes
                            setSelectedExistingPairId(''); // Reset pair selection
                          }}
                          disabled={loading || tournaments.length === 0}
                        >
                          <option value="">{t('form.placeholders.selectTournament')}</option>
                          {tournaments.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} - {t.status}
                              {t.startDate && ` (${new Date(t.startDate).toLocaleDateString()})`}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Text className="text-muted">
                          {tournaments.length === 0
                            ? t('messages.noTournamentsAvailable')
                            : t('help.selectTournamentToRegister')}
                        </Form.Text>
                      </Form.Group>

                      {/* Pair picker - enabled after tournament selection */}
                      <Form.Group className="mb-3">
                        <Form.Label>{t('form.labels.selectPairToRegister')} *</Form.Label>
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
                              ? t('messages.selectTournamentFirst')
                              : categoryPairs.length === 0
                                ? t('messages.noPairsAvailable')
                                : t('form.placeholders.selectPair')}
                          </option>
                          {createdPair && !categoryPairs.find(p => p.id === createdPair.id) && (
                            <option key={createdPair.id} value={createdPair.id}>
                              {createdPair.player1.name} & {createdPair.player2.name} ({t('table.headers.seeding')}: {createdPair.seedingScore.toFixed(0)}) - {t('status.new')}
                            </option>
                          )}
                          {categoryPairs.map((pair) => (
                            <option key={pair.id} value={pair.id}>
                              {pair.player1.name} & {pair.player2.name} ({t('table.headers.seeding')}: {pair.seedingScore?.toFixed(0) || 0})
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Text className="text-muted">
                          {!selectedTournamentId
                            ? t('help.selectTournamentBeforePair')
                            : t('help.selectExistingOrCreatePair')}
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
                          {t('buttons.checkEligibility')}
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
                          {t('buttons.registerPair')}
                        </Button>

                        <Button variant="secondary" onClick={resetForm}>
                          {t('buttons.resetForm')}
                        </Button>
                      </div>

                      {eligibilityResult && (
                        <Alert
                          variant={eligibilityResult.eligible ? 'success' : 'danger'}
                          className="mt-3"
                        >
                          <strong>{t('pages.pairRegistration.eligibilityCheck')}:</strong>{' '}
                          {eligibilityResult.eligible ? (
                            <span className="text-success">✓ {t('status.pairEligible')}</span>
                          ) : (
                            <>
                              <span className="text-danger">✗ {t('status.pairNotEligible')}</span>
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
                              label={t('form.labels.overrideEligibility')}
                              checked={eligibilityOverride}
                              onChange={(e) => setEligibilityOverride(e.target.checked)}
                              disabled={registering}
                            />
                            <Form.Text className="text-muted">
                              {t('help.overrideEligibilityHint')}
                            </Form.Text>
                          </Form.Group>

                          {/* T073: Override reason validation */}
                          {eligibilityOverride && (
                            <>
                              <Form.Group>
                                <Form.Label>
                                  {t('form.labels.overrideReason')} <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Control
                                  as="textarea"
                                  rows={3}
                                  value={overrideReason}
                                  onChange={(e) => setOverrideReason(e.target.value)}
                                  placeholder={t('form.placeholders.overrideReason')}
                                  disabled={registering}
                                  isInvalid={eligibilityOverride && !overrideReason.trim()}
                                />
                                <Form.Control.Feedback type="invalid">
                                  {t('validation.overrideReasonRequired')}
                                </Form.Control.Feedback>
                              </Form.Group>

                              {/* T076: Warning dialog showing violations */}
                              {eligibilityResult && !eligibilityResult.eligible && (
                                <Alert variant="warning" className="mt-2 mb-0">
                                  <strong>⚠ {t('common.warning')}:</strong> {t('messages.aboutToRegisterViolatingPair')}
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
