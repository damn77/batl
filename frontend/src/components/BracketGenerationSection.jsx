/**
 * BracketGenerationSection
 * Phase 01.1 - Bracket Generation and Seeding Persistence
 *
 * Orchestrates the full organizer draw workflow for KNOCKOUT tournaments:
 *   State A: Registration open  → Close Registration button
 *   State B: Registration closed, no bracket → registered player list + Generate Draw
 *   State C: Bracket generated  → KnockoutBracket view + per-slot swap editor + Save/Regenerate
 *
 * Embedded inside TournamentViewPage (Plan 05 wires this in).
 * Receives structure/matches/mutate* from the parent's SWR hooks.
 */
import { useState, useEffect, useCallback } from 'react';
import { Button, Alert, Spinner, Modal, Form, Badge, ListGroup, Card, Row, Col } from 'react-bootstrap';
import KnockoutBracket from './KnockoutBracket';
import { closeRegistration, generateBracket, swapSlots } from '../services/bracketPersistenceService';
import apiClient from '../services/apiClient';

/**
 * BracketGenerationSection
 *
 * Props:
 *   tournament            - full tournament object (id, status, registrationClosed, formatType, category)
 *   mutateTournament      - SWR mutate to re-fetch tournament data after close-registration
 *   mutateFormatStructure - SWR mutate from useFormatStructure — refresh after generate/save
 *   mutateMatches         - SWR mutate from useMatches — refresh bracket view after generate/save
 *   structure             - format structure from useFormatStructure (has .brackets, .rounds arrays)
 *   matches               - match array from useMatches
 */
const BracketGenerationSection = ({
  tournament,
  mutateTournament,
  mutateFormatStructure,
  mutateMatches,
  structure,
  matches
}) => {
  // ----- State -----
  const [pendingSwaps, setPendingSwaps] = useState([]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [closingRegistration, setClosingRegistration] = useState(false);
  const [error, setError] = useState(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [doublesMethod, setDoublesMethod] = useState('PAIR_SCORE');
  const [registeredPlayers, setRegisteredPlayers] = useState([]);

  const isDoubles = tournament?.category?.type === 'DOUBLES';
  const hasBracket = structure?.brackets && structure.brackets.length > 0;

  // ----- Load registered players once on mount -----
  useEffect(() => {
    if (!tournament?.id) return;
    apiClient
      .get(`/tournaments/${tournament.id}/registrations`)
      .then(r => {
        const regs = r.data.data?.registrations || [];
        const players = regs.map(reg => reg.player || reg.pair).filter(Boolean);
        setRegisteredPlayers(players);
      })
      .catch(() => {
        // non-critical — dropdowns degrade gracefully if empty
      });
  }, [tournament?.id]);

  // ----- Handlers -----

  const handleCloseRegistration = useCallback(async () => {
    setClosingRegistration(true);
    setError(null);
    try {
      await closeRegistration(tournament.id);
      await mutateTournament();
    } catch (err) {
      setError(err.message || 'Failed to close registration. Please try again.');
    } finally {
      setClosingRegistration(false);
    }
  }, [tournament?.id, mutateTournament]);

  const handleGenerateBracket = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setPendingSwaps([]);
    try {
      const options = {};
      if (isDoubles) options.doublesMethod = doublesMethod;
      await generateBracket(tournament.id, options);
      // Refresh bracket view
      if (mutateFormatStructure) await mutateFormatStructure();
      if (mutateMatches) await mutateMatches();
    } catch (err) {
      setError(err.message || 'Failed to generate draw. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [tournament?.id, isDoubles, doublesMethod, mutateFormatStructure, mutateMatches]);

  const handleConfirmRegenerate = useCallback(async () => {
    setShowRegenerateConfirm(false);
    setGenerating(true);
    setError(null);
    setPendingSwaps([]);
    try {
      const options = {};
      if (isDoubles) options.doublesMethod = doublesMethod;
      await generateBracket(tournament.id, options);
      if (mutateFormatStructure) await mutateFormatStructure();
      if (mutateMatches) await mutateMatches();
    } catch (err) {
      setError(err.message || 'Failed to regenerate draw. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [tournament?.id, isDoubles, doublesMethod, mutateFormatStructure, mutateMatches]);

  const handleSaveDraw = useCallback(async () => {
    if (pendingSwaps.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await swapSlots(tournament.id, pendingSwaps);
      setPendingSwaps([]);
      if (mutateMatches) await mutateMatches();
    } catch (err) {
      setError(err.message || 'Failed to save draw. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [tournament?.id, pendingSwaps, mutateMatches]);

  const handleSlotChange = useCallback((matchId, field, newPlayerId) => {
    setPendingSwaps(prev => {
      // Replace existing swap for same matchId+field, or add new
      const idx = prev.findIndex(s => s.matchId === matchId && s.field === field);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { matchId, field, newPlayerId };
        return updated;
      }
      return [...prev, { matchId, field, newPlayerId }];
    });
  }, []);

  // ----- Render guards -----
  if (!tournament) return null;
  if (tournament.formatType !== 'KNOCKOUT') return null;
  // Only show for SCHEDULED status (before IN_PROGRESS)
  if (tournament.status === 'IN_PROGRESS' || tournament.status === 'COMPLETED' || tournament.status === 'CANCELLED') {
    return null;
  }

  // ----- STATE A: Registration still open -----
  if (!tournament.registrationClosed) {
    return (
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-light">
          <h5 className="mb-0">Draw Generation</h5>
        </Card.Header>
        <Card.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <p className="text-muted mb-3">
            Registration is currently open. Close registration to lock the player list before generating the draw.
          </p>
          <p className="mb-3">
            <strong>{registeredPlayers.length}</strong> player{registeredPlayers.length !== 1 ? 's' : ''} registered.
          </p>
          <Button
            variant="primary"
            size="lg"
            onClick={handleCloseRegistration}
            disabled={closingRegistration}
          >
            {closingRegistration ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Closing Registration...
              </>
            ) : (
              'Close Registration'
            )}
          </Button>
        </Card.Body>
      </Card>
    );
  }

  // ----- STATE B: Registration closed, no bracket yet -----
  if (!hasBracket) {
    return (
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-light">
          <div className="d-flex align-items-center gap-2">
            <h5 className="mb-0">Draw Generation</h5>
            <Badge bg="success">Registration closed</Badge>
          </div>
        </Card.Header>
        <Card.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Finalized registered player list */}
          <div className="mb-4">
            <h6 className="fw-semibold mb-2">
              Registered Players ({registeredPlayers.length})
            </h6>
            {registeredPlayers.length === 0 ? (
              <p className="text-muted fst-italic">No players registered yet.</p>
            ) : (
              <ListGroup variant="flush" className="border rounded">
                {registeredPlayers.map((player, idx) => (
                  <ListGroup.Item key={player?.id || idx} className="py-2 px-3">
                    <span className="text-muted me-2" style={{ minWidth: '2rem', display: 'inline-block' }}>
                      {idx + 1}.
                    </span>
                    {player?.name || 'Unknown player'}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </div>

          {/* Doubles seeding method selector */}
          {isDoubles && (
            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold">Seeding Method</Form.Label>
              <div>
                <Form.Check
                  type="radio"
                  id="doublesMethod-pair"
                  name="doublesMethod"
                  label="Pair score (combined seeding score for the pair)"
                  value="PAIR_SCORE"
                  checked={doublesMethod === 'PAIR_SCORE'}
                  onChange={() => setDoublesMethod('PAIR_SCORE')}
                  className="mb-1"
                />
                <Form.Check
                  type="radio"
                  id="doublesMethod-average"
                  name="doublesMethod"
                  label="Average player scores (average of both individual player seeding scores)"
                  value="AVERAGE_SCORE"
                  checked={doublesMethod === 'AVERAGE_SCORE'}
                  onChange={() => setDoublesMethod('AVERAGE_SCORE')}
                />
              </div>
            </Form.Group>
          )}

          <Button
            variant="primary"
            size="lg"
            onClick={handleGenerateBracket}
            disabled={generating || registeredPlayers.length < 2}
          >
            {generating ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Generating Draw...
              </>
            ) : (
              'Generate Draw'
            )}
          </Button>
          {registeredPlayers.length < 2 && (
            <p className="text-warning mt-2 mb-0">
              <small>At least 2 players are required to generate a draw.</small>
            </p>
          )}
        </Card.Body>
      </Card>
    );
  }

  // ----- STATE C: Bracket generated -----

  // Build a flat list of all matches across all rounds for the slot editor
  const allMatches = matches || [];
  const brackets = structure?.brackets || [];
  const rounds = structure?.rounds || [];

  // Group matches by round for the slot editor display
  const matchesByRound = rounds
    .slice()
    .sort((a, b) => (a.roundNumber || 0) - (b.roundNumber || 0))
    .map(round => ({
      round,
      matches: allMatches
        .filter(m => m.roundId === round.id)
        .sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0))
    }))
    .filter(({ matches: ms }) => ms.length > 0);

  return (
    <Card className="border-0 shadow-sm mb-4">
      <Card.Header className="bg-light">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <h5 className="mb-0">Draw</h5>
            <Badge bg="success">Generated</Badge>
          </div>
          <div className="d-flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveDraw}
              disabled={saving || pendingSwaps.length === 0}
            >
              {saving ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-1" />
                  Saving...
                </>
              ) : (
                `Save Draw${pendingSwaps.length > 0 ? ` (${pendingSwaps.length} change${pendingSwaps.length !== 1 ? 's' : ''})` : ''}`
              )}
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => setShowRegenerateConfirm(true)}
              disabled={generating || saving}
            >
              Regenerate Draw
            </Button>
          </div>
        </div>
      </Card.Header>

      <Card.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {pendingSwaps.length > 0 && (
          <Alert variant="info" className="mb-3">
            You have {pendingSwaps.length} unsaved slot change{pendingSwaps.length !== 1 ? 's' : ''}. Click "Save Draw" to persist them.
          </Alert>
        )}

        {generating && (
          <div className="text-center py-4">
            <Spinner animation="border" />
            <p className="text-muted mt-2">Regenerating draw...</p>
          </div>
        )}

        {!generating && (
          <>
            {/* KnockoutBracket visualization */}
            {brackets.map(bracket => {
              const bracketRounds = rounds.filter(r => r.bracketId === bracket.id);
              return (
                <KnockoutBracket
                  key={bracket.id}
                  tournamentId={tournament.id}
                  bracket={bracket}
                  rounds={bracketRounds}
                  isDoubles={isDoubles}
                  className="mb-4"
                />
              );
            })}

            {/* Slot editor — per-slot dropdowns for swapping players */}
            {allMatches.length > 0 && (
              <div className="mt-3">
                <h6 className="fw-semibold mb-3">Edit Slot Assignments</h6>
                <p className="text-muted small mb-3">
                  Use the dropdowns below to reassign players to bracket slots.
                  BYE slots cannot be reassigned. Click "Save Draw" above when finished.
                </p>
                {matchesByRound.map(({ round, matches: roundMatches }) => (
                  <div key={round.id} className="mb-4">
                    <h6 className="text-secondary mb-2">
                      {round.name || `Round ${round.roundNumber}`}
                    </h6>
                    <Row xs={1} md={2} lg={3} className="g-2">
                      {roundMatches.map(match => {
                        const isBye = match.isBye || match.status === 'BYE';

                        // Find any pending swaps for this match
                        const pendingP1 = pendingSwaps.find(
                          s => s.matchId === match.id && s.field === 'player1Id'
                        );
                        const pendingP2 = pendingSwaps.find(
                          s => s.matchId === match.id && s.field === 'player2Id'
                        );

                        const p1Value = pendingP1 ? pendingP1.newPlayerId : (match.player1?.id || '');
                        const p2Value = pendingP2 ? pendingP2.newPlayerId : (match.player2?.id || '');

                        return (
                          <Col key={match.id}>
                            <Card className="border h-100">
                              <Card.Body className="p-2">
                                <div className="text-muted small mb-2">
                                  Match {match.matchNumber || '?'}
                                  {isBye && (
                                    <Badge bg="warning" text="dark" className="ms-1" style={{ fontSize: '0.7em' }}>
                                      BYE
                                    </Badge>
                                  )}
                                </div>

                                {/* Player 1 slot */}
                                <div className="mb-2">
                                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>Top slot</div>
                                  {isBye && match.player1 ? (
                                    <div className="fw-medium">{match.player1.name}</div>
                                  ) : (
                                    <Form.Select
                                      size="sm"
                                      value={p1Value}
                                      onChange={e => handleSlotChange(match.id, 'player1Id', e.target.value)}
                                      disabled={isBye}
                                    >
                                      <option value="">— Empty slot —</option>
                                      {registeredPlayers.map(player => (
                                        <option key={player.id} value={player.id}>
                                          {player.name}
                                        </option>
                                      ))}
                                    </Form.Select>
                                  )}
                                </div>

                                {/* Player 2 slot */}
                                <div>
                                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>Bottom slot</div>
                                  {isBye ? (
                                    <div className="text-muted fst-italic">BYE (auto-advance)</div>
                                  ) : (
                                    <Form.Select
                                      size="sm"
                                      value={p2Value}
                                      onChange={e => handleSlotChange(match.id, 'player2Id', e.target.value)}
                                    >
                                      <option value="">— Empty slot —</option>
                                      {registeredPlayers.map(player => (
                                        <option key={player.id} value={player.id}>
                                          {player.name}
                                        </option>
                                      ))}
                                    </Form.Select>
                                  )}
                                </div>
                              </Card.Body>
                            </Card>
                          </Col>
                        );
                      })}
                    </Row>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Card.Body>

      {/* Regenerate confirmation modal */}
      <Modal show={showRegenerateConfirm} onHide={() => setShowRegenerateConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Regenerate Draw</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Regenerating the draw will <strong>permanently delete</strong> the current bracket
            arrangement and create a new one from scratch. Any unsaved manual slot edits will also
            be lost.
          </p>
          <p className="mb-0">Continue?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRegenerateConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmRegenerate}>
            Regenerate
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

export default BracketGenerationSection;
