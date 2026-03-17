/**
 * GroupDrawGenerationSection
 * Phase 27 - Group Formation
 *
 * Orchestrates the full organizer draw workflow for GROUP and COMBINED tournaments:
 *   State A: Registration open  → Close Registration button
 *   State B: Registration closed, no groups → config form + Generate Group Draw
 *   State C: Groups generated   → GroupStandingsTable per group + swap UI + Regenerate/Revert
 *   State D: IN_PROGRESS        → Revert-only locked view
 *
 * Follows the exact same patterns as BracketGenerationSection.jsx.
 */
import { useState, useEffect, useCallback } from 'react';
import { Button, Alert, Spinner, Modal, Form, Badge, ListGroup, Card, Row, Col } from 'react-bootstrap';
import GroupStandingsTable from './GroupStandingsTable';
import ExpandableSection from './ExpandableSection';
import { generateGroupDraw, swapGroupParticipants } from '../services/groupDrawService';
import { closeRegistration } from '../services/bracketPersistenceService';
import { revertTournament } from '../services/tournamentViewService';
import { useToast } from '../utils/ToastContext';
import apiClient from '../services/apiClient';

/**
 * GroupDrawGenerationSection
 *
 * Props:
 *   tournament            - full tournament object (id, status, registrationClosed, formatType, category)
 *   mutateTournament      - SWR mutate to re-fetch tournament data after close-registration/revert
 *   mutateFormatStructure - SWR mutate from useFormatStructure — refresh after generate/swap
 *   mutateMatches         - SWR mutate from useMatches — refresh after generate/swap
 *   structure             - format structure from useFormatStructure (has .groups array)
 *   matches               - match array from useMatches
 *   registrationVersion   - number, triggers re-fetch of registrations
 */
const GroupDrawGenerationSection = ({
  tournament,
  mutateTournament,
  mutateFormatStructure,
  mutateMatches,
  structure,
  matches,
  registrationVersion
}) => {
  // ----- Hooks -----
  const { showSuccess, showError } = useToast();

  // ----- State -----
  const [groupCount, setGroupCount] = useState('');
  const [seededRounds, setSeededRounds] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [closingRegistration, setClosingRegistration] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [registeredPlayers, setRegisteredPlayers] = useState([]);
  const [swapPlayerA, setSwapPlayerA] = useState('');
  const [swapPlayerB, setSwapPlayerB] = useState('');
  const [swapping, setSwapping] = useState(false);

  // ----- Derived values -----
  const isDoubles = tournament?.category?.type === 'DOUBLES';
  const hasGroups = !!(structure?.groups && structure.groups.length > 0);
  const playerCount = registeredPlayers.length;

  // ----- Load registered players -----
  useEffect(() => {
    if (!tournament?.id) return;
    apiClient
      .get(`/tournaments/${tournament.id}/registrations`)
      .then(r => {
        setRegisteredPlayers(r.data.data?.registrations || []);
      })
      .catch(() => {
        // non-critical — degrades gracefully if empty
      });
  }, [tournament?.id, registrationVersion]);

  // ----- Auto-clear success message after 5s -----
  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [successMessage]);

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

  const handleGenerateDraw = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await generateGroupDraw(tournament.id, {
        groupCount: parseInt(groupCount),
        seededRounds: parseInt(seededRounds) || 0
      });
      const groupsCreated = result?.groups?.length || parseInt(groupCount);
      setSuccessMessage(`Group draw completed. ${groupsCreated} groups created.`);
      if (mutateFormatStructure) await mutateFormatStructure();
      if (mutateMatches) await mutateMatches();
    } catch (err) {
      setError(err.message || 'Failed to generate draw. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [tournament?.id, groupCount, seededRounds, mutateFormatStructure, mutateMatches]);

  const handleConfirmRegenerate = useCallback(async () => {
    setShowRegenerateConfirm(false);
    setGenerating(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const currentGroupCount = structure?.groups?.length || 2;
      const result = await generateGroupDraw(tournament.id, {
        groupCount: currentGroupCount,
        seededRounds: 0
      });
      const groupsCreated = result?.groups?.length || currentGroupCount;
      setSuccessMessage(`Group draw completed. ${groupsCreated} groups created.`);
      if (mutateFormatStructure) await mutateFormatStructure();
      if (mutateMatches) await mutateMatches();
    } catch (err) {
      setError(err.message || 'Failed to regenerate draw. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [tournament?.id, structure?.groups?.length, mutateFormatStructure, mutateMatches]);

  const handleConfirmRevert = async () => {
    setReverting(true);
    setError(null);
    try {
      await revertTournament(tournament.id);
      showSuccess('Tournament reverted to SCHEDULED');
      setShowRevertConfirm(false);
      if (mutateTournament) await mutateTournament();
      if (mutateFormatStructure) await mutateFormatStructure();
      if (mutateMatches) await mutateMatches();
    } catch (err) {
      showError(err.message || 'Failed to revert tournament');
    } finally {
      setReverting(false);
    }
  };

  const handleSwap = useCallback(async () => {
    if (!swapPlayerA || !swapPlayerB) return;
    setSwapping(true);
    setError(null);
    try {
      await swapGroupParticipants(tournament.id, swapPlayerA, swapPlayerB);
      setSwapPlayerA('');
      setSwapPlayerB('');
      if (mutateFormatStructure) await mutateFormatStructure();
      if (mutateMatches) await mutateMatches();
    } catch (err) {
      setError(err.message || 'Failed to swap players. Please try again.');
    } finally {
      setSwapping(false);
    }
  }, [tournament?.id, swapPlayerA, swapPlayerB, mutateFormatStructure, mutateMatches]);

  // ----- Render guards -----
  if (!tournament) return null;
  if (tournament.status === 'COMPLETED' || tournament.status === 'CANCELLED') return null;

  // ----- Group size preview computation -----
  const parsedGroupCount = parseInt(groupCount);
  const showGroupPreview = parsedGroupCount >= 2 && playerCount >= 4 && !isNaN(parsedGroupCount);
  let groupPreviewText = '';
  if (showGroupPreview) {
    const baseSize = Math.floor(playerCount / parsedGroupCount);
    const extras = playerCount % parsedGroupCount;
    const unit = isDoubles ? 'pairs' : 'players';
    if (extras > 0) {
      groupPreviewText = `${parsedGroupCount} groups: ${extras} of ${baseSize + 1} ${unit}, ${parsedGroupCount - extras} of ${baseSize} ${unit}`;
    } else {
      groupPreviewText = `${parsedGroupCount} groups: ${parsedGroupCount} of ${baseSize} ${unit}`;
    }
  }

  // ----- Generate button disabled logic -----
  const generateDisabled =
    playerCount < 4 ||
    !parsedGroupCount ||
    parsedGroupCount < 2 ||
    parsedGroupCount > Math.floor(playerCount / 2) ||
    generating;

  // ----- Participant list for swap dropdowns (State C) -----
  const allParticipants = (structure?.groups || []).flatMap(group =>
    (group.participants || group.groupParticipants || []).map(p => ({
      id: p.id,
      groupId: group.id,
      groupNumber: group.groupNumber,
      groupName: group.name || `Group ${group.groupNumber}`,
      seedPosition: p.seedPosition,
      name: isDoubles
        ? `${p.pair?.player1?.firstName || '?'} ${p.pair?.player1?.lastName || ''} & ${p.pair?.player2?.firstName || '?'} ${p.pair?.player2?.lastName || ''}`.trim()
        : `${p.player?.firstName || '?'} ${p.player?.lastName || ''}`.trim()
    }))
  );

  // Player B list: exclude participants from same group as Player A
  const selectedParticipantA = allParticipants.find(p => p.id === swapPlayerA);
  const playerBOptions = selectedParticipantA
    ? allParticipants.filter(p => p.groupId !== selectedParticipantA.groupId)
    : allParticipants;

  // ----- STATE D: IN_PROGRESS (locked) -----
  if (tournament.status === 'IN_PROGRESS') {
    return (
      <>
        <Card className="border-0 shadow-sm mb-4">
          <Card.Header className="bg-light">
            <div className="d-flex align-items-center justify-content-between">
              <h5 className="mb-0">Draw</h5>
              <Button
                variant="outline-warning"
                size="sm"
                onClick={() => setShowRevertConfirm(true)}
                disabled={reverting}
              >
                Revert to Scheduled
              </Button>
            </div>
          </Card.Header>
          <Card.Body>
            <p className="text-muted mb-0">
              This tournament is in progress. To edit the draw or registration, revert it to SCHEDULED status.
            </p>
          </Card.Body>
        </Card>

        {/* Revert Confirmation Modal */}
        <Modal show={showRevertConfirm} onHide={() => setShowRevertConfirm(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Revert to Scheduled</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Are you sure you want to revert <strong>{tournament?.name}</strong> to SCHEDULED?</p>
            <p>This will:</p>
            <ul>
              <li>Delete all groups, matches, and player assignments.</li>
              <li>Reopen player registration.</li>
            </ul>
            <p className="text-muted">Registrations will be preserved.</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowRevertConfirm(false)} disabled={reverting}>
              Keep Groups
            </Button>
            <Button variant="warning" onClick={handleConfirmRevert} disabled={reverting}>
              {reverting ? 'Reverting...' : 'Revert to Scheduled'}
            </Button>
          </Modal.Footer>
        </Modal>
      </>
    );
  }

  // ----- STATE A: Registration open -----
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
            <strong>{playerCount}</strong> {isDoubles ? 'pair' : 'player'}{playerCount !== 1 ? 's' : ''} registered.
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

  // ----- STATE B: Registration closed, no groups yet -----
  if (!hasGroups) {
    return (
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-light">
          <div className="d-flex align-items-center gap-2">
            <h5 className="mb-0">Draw Generation</h5>
            <Badge bg="success">Registration closed</Badge>
          </div>
        </Card.Header>
        <Card.Body>
          {successMessage && (
            <Alert variant="success" dismissible onClose={() => setSuccessMessage(null)}>
              {successMessage}
            </Alert>
          )}
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Registered player/pair list */}
          <div className="mb-4">
            <h6 className="fw-semibold mb-2">
              {isDoubles ? 'Registered Pairs' : 'Registered Players'} ({playerCount})
            </h6>
            {playerCount === 0 ? (
              <p className="fst-italic text-muted">
                No players have registered yet. Players can be registered from the tournament registration page.
              </p>
            ) : (
              <ListGroup variant="flush" className="border rounded">
                {registeredPlayers.map((reg, idx) => {
                  const displayName = isDoubles
                    ? `${reg.pair?.player1?.firstName || '?'} ${reg.pair?.player1?.lastName || ''} & ${reg.pair?.player2?.firstName || '?'} ${reg.pair?.player2?.lastName || ''}`.trim()
                    : `${reg.player?.firstName || reg.player?.name || 'Unknown'}`;
                  return (
                    <ListGroup.Item key={reg?.id || idx} className="py-2 px-3">
                      <span className="text-muted me-2" style={{ minWidth: '2rem', display: 'inline-block' }}>
                        {idx + 1}.
                      </span>
                      {displayName}
                    </ListGroup.Item>
                  );
                })}
              </ListGroup>
            )}
          </div>

          {/* Group configuration form */}
          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold">Number of Groups</Form.Label>
            <Form.Control
              type="number"
              min="2"
              max={Math.floor(playerCount / 2) || 2}
              value={groupCount}
              onChange={e => setGroupCount(e.target.value)}
              style={{ maxWidth: '120px' }}
            />
            <Form.Text className="text-muted">
              Enter the number of groups. Group sizes are calculated automatically.
            </Form.Text>
          </Form.Group>

          {/* Group size preview */}
          {showGroupPreview && (
            <Alert variant="info" className="py-2">
              <small>{groupPreviewText}</small>
            </Alert>
          )}

          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold">Seeded Rounds</Form.Label>
            <Form.Control
              type="number"
              min="0"
              max={parsedGroupCount || 0}
              value={seededRounds}
              onChange={e => setSeededRounds(e.target.value)}
              style={{ maxWidth: '120px' }}
            />
            <Form.Text className="text-muted">
              Number of rounds to fill using snake draft placement by ranking. 0 = fully random draw.
            </Form.Text>
          </Form.Group>

          <Button
            variant="primary"
            size="lg"
            onClick={handleGenerateDraw}
            disabled={generateDisabled}
          >
            {generating ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Generating draw...
              </>
            ) : (
              'Generate Group Draw'
            )}
          </Button>

          {playerCount < 4 && (
            <p className="text-warning mt-2 mb-0">
              <small>At least 4 players are required to generate a draw.</small>
            </p>
          )}
        </Card.Body>
      </Card>
    );
  }

  // ----- STATE C: Groups generated -----
  return (
    <>
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-light">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <h5 className="mb-0">Draw</h5>
              <Badge bg="success">Generated</Badge>
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => setShowRegenerateConfirm(true)}
                disabled={generating}
              >
                Regenerate Draw
              </Button>
              <Button
                variant="outline-warning"
                size="sm"
                onClick={() => setShowRevertConfirm(true)}
                disabled={generating || reverting}
              >
                Revert to Scheduled
              </Button>
            </div>
          </div>
        </Card.Header>

        <Card.Body>
          {successMessage && (
            <Alert variant="success" dismissible onClose={() => setSuccessMessage(null)}>
              {successMessage}
            </Alert>
          )}
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {generating && (
            <div className="text-center py-4">
              <Spinner animation="border" />
              <p className="text-muted mt-2">Generating draw...</p>
            </div>
          )}

          {!generating && (
            <>
              {/* Group standings tables */}
              <div className="d-flex flex-column gap-3 mb-4">
                {structure.groups.map(group => (
                  <ExpandableSection
                    key={group.id}
                    title={group.name || `Group ${group.groupNumber}`}
                    badge={<span className="badge bg-secondary">{group.players?.length || group.groupSize || 0} players</span>}
                    defaultExpanded={true}
                  >
                    <GroupStandingsTable tournamentId={tournament.id} group={group} />
                  </ExpandableSection>
                ))}
              </div>

              {/* Swap UI */}
              <div className="border-top pt-4">
                <h6 className="fw-semibold mb-3">Swap Players Between Groups</h6>
                <p className="text-muted small mb-3">
                  Select one player from each group to swap. Group sizes remain balanced automatically.
                </p>

                <Row className="g-3 align-items-end">
                  <Col xs={12} md={5}>
                    <Form.Label className="fw-semibold">Player A</Form.Label>
                    <Form.Select
                      value={swapPlayerA}
                      onChange={e => {
                        setSwapPlayerA(e.target.value);
                        setSwapPlayerB('');
                      }}
                    >
                      <option value="">— Select player —</option>
                      {allParticipants.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.seedPosition ? `Seed ${p.seedPosition} · ` : '· '}{p.name} ({p.groupName})
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col xs={12} md={2} className="text-center">
                    <span style={{ fontSize: '1.5rem' }}>⇄</span>
                  </Col>
                  <Col xs={12} md={5}>
                    <Form.Label className="fw-semibold">Player B</Form.Label>
                    <Form.Select
                      value={swapPlayerB}
                      onChange={e => setSwapPlayerB(e.target.value)}
                      disabled={!swapPlayerA}
                    >
                      <option value="">— Select player —</option>
                      {playerBOptions.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.seedPosition ? `Seed ${p.seedPosition} · ` : '· '}{p.name} ({p.groupName})
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                </Row>

                <Button
                  variant="outline-primary"
                  className="mt-3"
                  onClick={handleSwap}
                  disabled={!swapPlayerA || !swapPlayerB || swapping}
                >
                  {swapping ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" className="me-2" />
                      Swapping...
                    </>
                  ) : (
                    'Swap Players'
                  )}
                </Button>
              </div>
            </>
          )}
        </Card.Body>
      </Card>

      {/* Regenerate confirmation modal */}
      <Modal show={showRegenerateConfirm} onHide={() => setShowRegenerateConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Regenerate Group Draw</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Regenerating the draw will permanently delete all groups, player assignments, and scheduled matches. Continue?
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRegenerateConfirm(false)}>
            Keep Current Draw
          </Button>
          <Button variant="danger" onClick={handleConfirmRegenerate}>
            Regenerate
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Revert to Scheduled confirmation modal */}
      <Modal show={showRevertConfirm} onHide={() => setShowRevertConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Revert to Scheduled</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to revert <strong>{tournament?.name}</strong> to SCHEDULED?</p>
          <p>This will:</p>
          <ul>
            <li>Delete all groups, matches, and player assignments.</li>
            <li>Reopen player registration.</li>
          </ul>
          <p className="text-muted">Registrations will be preserved.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRevertConfirm(false)} disabled={reverting}>
            Keep Groups
          </Button>
          <Button variant="warning" onClick={handleConfirmRevert} disabled={reverting}>
            {reverting ? 'Reverting...' : 'Revert to Scheduled'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default GroupDrawGenerationSection;
