/**
 * ManualDrawEditor
 * Phase 13 Plan 02 - Manual Draw Assignment Grid
 *
 * Provides the interactive assignment grid for manual bracket draws.
 * Organizers select players/pairs from dropdowns to fill empty bracket positions.
 * Immediate-save pattern: each selection calls assignPosition API directly.
 *
 * Features:
 *   - Progress bar showing filled/total positions
 *   - Per-slot dropdowns (only unplaced entities shown)
 *   - Clear buttons to return filled positions to empty
 *   - BYE matches displayed as disabled/greyed read-only cards
 *   - Loading state disables all controls during API calls
 *   - API errors shown as toast notifications
 */
import { useState } from 'react';
import { Card, Row, Col, Form, Badge, ProgressBar, Button } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { assignPosition } from '../services/bracketPersistenceService';
import { useToast } from '../utils/ToastContext';

const ManualDrawEditor = ({
  tournament,
  matches,
  rounds,
  registeredPlayers,
  isDoubles,
  onAssignmentChange,
}) => {
  const [assigning, setAssigning] = useState(false);
  const { showError } = useToast();

  // ----- Compute Round 1 matches from the MAIN bracket -----
  // Find the MAIN bracket's Round 1 round ID
  const round1 = rounds.find(r => r.roundNumber === 1);
  const round1Matches = round1
    ? matches
        .filter(m => m.roundId === round1.id)
        .sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0))
    : [];

  // ----- Compute placed entity IDs (for filtering dropdown options) -----
  const placedIds = new Set();
  let totalSlots = 0;
  let filledSlots = 0;

  for (const match of round1Matches) {
    if (match.isBye || match.status === 'BYE') continue;
    // Two slots per non-BYE match
    totalSlots += 2;
    if (isDoubles) {
      if (match.pair1Id) { placedIds.add(match.pair1Id); filledSlots++; }
      if (match.pair2Id) { placedIds.add(match.pair2Id); filledSlots++; }
    } else {
      if (match.player1Id) { placedIds.add(match.player1Id); filledSlots++; }
      if (match.player2Id) { placedIds.add(match.player2Id); filledSlots++; }
    }
  }

  // ----- Compute unplaced entities sorted for dropdown -----
  const unplacedEntities = registeredPlayers
    .filter(reg => {
      const entityId = isDoubles ? reg.pair?.id : reg.player?.id;
      return entityId && !placedIds.has(entityId);
    })
    .map(reg => {
      if (isDoubles) {
        const pair = reg.pair;
        const name1 = pair?.player1?.name || '?';
        const name2 = pair?.player2?.name || '?';
        const seedingScore = pair?.seedingScore;
        const displayName = seedingScore != null
          ? `${name1} & ${name2} (${seedingScore} pts)`
          : `${name1} & ${name2}`;
        return { id: pair.id, displayName, seedingScore: seedingScore ?? 0 };
      } else {
        const player = reg.player;
        return { id: player.id, displayName: player.name, sortName: player.name };
      }
    })
    .sort((a, b) => {
      if (isDoubles) {
        // Highest seeding score first
        return (b.seedingScore || 0) - (a.seedingScore || 0);
      } else {
        // Alphabetical by name
        return (a.sortName || '').localeCompare(b.sortName || '');
      }
    });

  // ----- Resolve entity display name from a placed match slot -----
  const getPlacedEntityName = (match, slot) => {
    if (isDoubles) {
      const pair = slot === 'player1' ? match.pair1 : match.pair2;
      if (!pair) return null;
      const name1 = pair.player1?.name || '?';
      const name2 = pair.player2?.name || '?';
      return `${name1} & ${name2}`;
    } else {
      const player = slot === 'player1' ? match.player1 : match.player2;
      return player?.name || null;
    }
  };

  const getSlotEntityId = (match, slot) => {
    if (isDoubles) {
      return slot === 'player1' ? match.pair1Id : match.pair2Id;
    } else {
      return slot === 'player1' ? match.player1Id : match.player2Id;
    }
  };

  // ----- Handlers -----
  const handleAssignSlot = async (matchId, slot, entityId) => {
    if (!entityId) return;
    setAssigning(true);
    try {
      const body = { matchId, slot };
      if (isDoubles) {
        body.pairId = entityId;
      } else {
        body.playerId = entityId;
      }
      await assignPosition(tournament.id, body);
      if (onAssignmentChange) await onAssignmentChange();
    } catch (err) {
      showError(err.message || 'Failed to assign position');
    } finally {
      setAssigning(false);
    }
  };

  const handleClearSlot = async (matchId, slot) => {
    setAssigning(true);
    try {
      const body = { matchId, slot, playerId: null, pairId: null };
      await assignPosition(tournament.id, body);
      if (onAssignmentChange) await onAssignmentChange();
    } catch (err) {
      showError(err.message || 'Failed to clear position');
    } finally {
      setAssigning(false);
    }
  };

  // ----- Render -----
  const progressPercent = totalSlots > 0 ? (filledSlots / totalSlots) * 100 : 0;
  const isComplete = filledSlots === totalSlots && totalSlots > 0;

  return (
    <div>
      <h6 className="fw-semibold mb-3">Assign Players to Bracket Positions</h6>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <span className="fw-semibold">Placement Progress</span>
          <span className={isComplete ? 'text-success fw-bold' : 'text-muted'}>
            {filledSlots}/{totalSlots} positions filled
          </span>
        </div>
        <ProgressBar
          now={progressPercent}
          variant={isComplete ? 'success' : 'primary'}
        />
      </div>

      {/* Assignment grid */}
      {round1Matches.length === 0 ? (
        <p className="text-muted fst-italic">No Round 1 matches found.</p>
      ) : (
        <Row xs={1} md={2} lg={3} className="g-2">
          {round1Matches.map(match => {
            const isBye = match.isBye || match.status === 'BYE';

            if (isBye) {
              // BYE match — disabled/greyed read-only card
              const byeName1 = getPlacedEntityName(match, 'player1');
              return (
                <Col key={match.id}>
                  <Card className="border h-100 bg-light opacity-75">
                    <Card.Body className="p-2">
                      <div className="text-muted small mb-2">
                        Match {match.matchNumber || '?'}{' '}
                        <Badge bg="warning" text="dark" style={{ fontSize: '0.7em' }}>
                          BYE
                        </Badge>
                      </div>
                      {/* Slot 1 */}
                      <div className="mb-2">
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>Top slot</div>
                        {byeName1 ? (
                          <div className="text-muted">{byeName1}</div>
                        ) : (
                          <div className="text-muted fst-italic" style={{ fontSize: '0.875rem' }}>Empty</div>
                        )}
                      </div>
                      {/* Slot 2 */}
                      <div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>Bottom slot</div>
                        <div className="text-muted fst-italic" style={{ fontSize: '0.875rem' }}>BYE (auto-advance)</div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            }

            // Non-BYE match — interactive assignment card
            return (
              <Col key={match.id}>
                <Card className="border h-100">
                  <Card.Body className="p-2">
                    <div className="text-muted small mb-2">
                      Match {match.matchNumber || '?'}
                    </div>

                    {/* Slot 1 (player1 / pair1) */}
                    <div className="mb-2">
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>Top slot</div>
                      {getSlotEntityId(match, 'player1') ? (
                        <div className="d-flex align-items-center justify-content-between">
                          <span className="fw-medium" style={{ fontSize: '0.875rem' }}>
                            {getPlacedEntityName(match, 'player1')}
                          </span>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="py-0 px-1 ms-1"
                            onClick={() => handleClearSlot(match.id, 'player1')}
                            disabled={assigning}
                            title="Clear position"
                          >
                            &times;
                          </Button>
                        </div>
                      ) : (
                        <Form.Select
                          size="sm"
                          value=""
                          onChange={e => handleAssignSlot(match.id, 'player1', e.target.value)}
                          disabled={assigning}
                        >
                          <option value="" disabled>Select player...</option>
                          {unplacedEntities.map(entity => (
                            <option key={entity.id} value={entity.id}>
                              {entity.displayName}
                            </option>
                          ))}
                        </Form.Select>
                      )}
                    </div>

                    {/* Slot 2 (player2 / pair2) */}
                    <div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>Bottom slot</div>
                      {getSlotEntityId(match, 'player2') ? (
                        <div className="d-flex align-items-center justify-content-between">
                          <span className="fw-medium" style={{ fontSize: '0.875rem' }}>
                            {getPlacedEntityName(match, 'player2')}
                          </span>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="py-0 px-1 ms-1"
                            onClick={() => handleClearSlot(match.id, 'player2')}
                            disabled={assigning}
                            title="Clear position"
                          >
                            &times;
                          </Button>
                        </div>
                      ) : (
                        <Form.Select
                          size="sm"
                          value=""
                          onChange={e => handleAssignSlot(match.id, 'player2', e.target.value)}
                          disabled={assigning}
                        >
                          <option value="" disabled>Select player...</option>
                          {unplacedEntities.map(entity => (
                            <option key={entity.id} value={entity.id}>
                              {entity.displayName}
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
      )}
    </div>
  );
};

ManualDrawEditor.propTypes = {
  tournament: PropTypes.object.isRequired,
  matches: PropTypes.array.isRequired,
  rounds: PropTypes.array.isRequired,
  registeredPlayers: PropTypes.array.isRequired,
  isDoubles: PropTypes.bool.isRequired,
  onAssignmentChange: PropTypes.func,
};

export default ManualDrawEditor;
