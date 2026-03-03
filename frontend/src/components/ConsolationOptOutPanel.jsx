import { useState, useEffect } from 'react';
import { Accordion, Card, Alert, Button, Spinner, Badge } from 'react-bootstrap';
import apiClient from '../services/apiClient';
import { getTournamentRegistrations } from '../services/tournamentRegistrationService';

/**
 * ConsolationOptOutPanel — MATCH_2 knockout tournaments only
 *
 * Player mode: A single "Opt Out" button for the logged-in player to remove
 *              themselves from the consolation bracket.
 *
 * Organizer/Admin mode: A list of all registered participants, each with an
 *                       individual "Opt Out" button.
 */
const ConsolationOptOutPanel = ({ tournament, user }) => {
  const isOrganizer = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';

  // --- Player mode state ---
  const [playerStatus, setPlayerStatus] = useState(null); // null | 'success' | 'already_opted_out' | 'match_played' | 'error'
  const [playerError, setPlayerError] = useState(null);
  const [playerSubmitting, setPlayerSubmitting] = useState(false);

  // --- Organizer mode state ---
  const [registrations, setRegistrations] = useState([]);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [regsError, setRegsError] = useState(null);
  // Per-row state: { [registrationId]: { submitting, done, error } }
  const [rowState, setRowState] = useState({});

  // Fetch registrations for organizer mode
  useEffect(() => {
    if (!isOrganizer) return;
    setLoadingRegs(true);
    getTournamentRegistrations(tournament.id, 'REGISTERED')
      .then((data) => {
        setRegistrations(data?.registrations || []);
        setLoadingRegs(false);
      })
      .catch((err) => {
        setRegsError(err.message || 'Failed to load registrations.');
        setLoadingRegs(false);
      });
  }, [isOrganizer, tournament.id]);

  // --- Player mode handler ---
  const handlePlayerOptOut = async () => {
    setPlayerSubmitting(true);
    setPlayerError(null);
    setPlayerStatus(null);
    try {
      await apiClient.post(`/v1/tournaments/${tournament.id}/consolation-opt-out`, {
        playerId: user.playerId,
      });
      setPlayerStatus('success');
    } catch (err) {
      if (err.code === 'ALREADY_OPTED_OUT') {
        setPlayerStatus('already_opted_out');
      } else if (err.code === 'NEXT_MATCH_ALREADY_PLAYED') {
        setPlayerStatus('match_played');
      } else {
        setPlayerStatus('error');
        setPlayerError(err.message || 'An error occurred. Please try again.');
      }
    } finally {
      setPlayerSubmitting(false);
    }
  };

  // --- Organizer mode handler ---
  const handleOrganizerOptOut = async (reg) => {
    const regId = reg.id;
    const body = reg.pair
      ? { pairId: reg.pair.id }
      : { playerId: reg.player.id };

    setRowState((prev) => ({
      ...prev,
      [regId]: { submitting: true, done: false, error: null },
    }));

    try {
      await apiClient.post(`/v1/tournaments/${tournament.id}/consolation-opt-out`, body);
      setRowState((prev) => ({
        ...prev,
        [regId]: { submitting: false, done: true, error: null },
      }));
    } catch (err) {
      setRowState((prev) => ({
        ...prev,
        [regId]: {
          submitting: false,
          done: false,
          error: err.message || 'Failed to opt out.',
        },
      }));
    }
  };

  // --- Helper: display name for a registration ---
  const getDisplayName = (reg) => {
    if (reg.pair) {
      const p1 = reg.pair.player1?.name || '?';
      const p2 = reg.pair.player2?.name || '?';
      return `${p1} / ${p2}`;
    }
    return reg.player?.name || 'Unknown Player';
  };

  // ============================================================
  // Player mode
  // ============================================================
  if (!isOrganizer) {
    const optedOut = playerStatus === 'success' || playerStatus === 'already_opted_out';

    return (
      <Card>
        <Card.Header>
          <strong>Consolation Opt-Out</strong>
        </Card.Header>
        <Card.Body>
          <p className="text-muted mb-3">
            You can opt out of the consolation bracket if you do not wish to continue after losing
            your first match.
          </p>

          {playerStatus === 'success' && (
            <Alert variant="success" className="mb-3">
              Opt-out recorded. You will not be placed in the consolation bracket.
            </Alert>
          )}

          {playerStatus === 'already_opted_out' && (
            <Alert variant="info" className="mb-3">
              You have already opted out of consolation.
            </Alert>
          )}

          {playerStatus === 'match_played' && (
            <Alert variant="warning" className="mb-3">
              Your consolation match has already been played.
            </Alert>
          )}

          {playerStatus === 'error' && playerError && (
            <Alert variant="danger" className="mb-3">
              {playerError}
            </Alert>
          )}

          <Button
            variant="outline-warning"
            onClick={handlePlayerOptOut}
            disabled={playerSubmitting || optedOut}
          >
            {playerSubmitting ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Submitting...
              </>
            ) : (
              'Opt Out of Consolation'
            )}
          </Button>
        </Card.Body>
      </Card>
    );
  }

  // ============================================================
  // Organizer / Admin mode
  // ============================================================
  return (
    <Card>
      <Card.Header>
        <strong>Consolation Opt-Outs (Organizer)</strong>
      </Card.Header>
      <Card.Body className="p-0">
        <Accordion defaultActiveKey={null} flush>
          <Accordion.Item eventKey="opt-out-list">
            <Accordion.Header>Consolation Opt-Out Management</Accordion.Header>
            <Accordion.Body>
              <p className="text-muted mb-3">
                Record consolation opt-out on behalf of a player or pair.
              </p>

              {loadingRegs && (
                <div className="text-center py-3">
                  <Spinner animation="border" size="sm" />
                  <span className="ms-2 text-muted">Loading registrations...</span>
                </div>
              )}

              {regsError && (
                <Alert variant="danger">{regsError}</Alert>
              )}

              {!loadingRegs && !regsError && registrations.length === 0 && (
                <p className="text-muted">No registered participants found.</p>
              )}

              {!loadingRegs && !regsError && registrations.length > 0 && (
                <ul className="list-group list-group-flush">
                  {registrations.map((reg) => {
                    const rs = rowState[reg.id] || {};
                    return (
                      <li key={reg.id} className="list-group-item px-0">
                        <div className="d-flex align-items-center justify-content-between">
                          <span>{getDisplayName(reg)}</span>
                          {rs.done ? (
                            <Badge bg="secondary">Opted Out</Badge>
                          ) : (
                            <Button
                              variant="outline-warning"
                              size="sm"
                              disabled={!!rs.submitting}
                              onClick={() => handleOrganizerOptOut(reg)}
                            >
                              {rs.submitting ? (
                                <>
                                  <Spinner as="span" animation="border" size="sm" className="me-1" />
                                  Saving...
                                </>
                              ) : (
                                'Opt Out'
                              )}
                            </Button>
                          )}
                        </div>
                        {rs.error && (
                          <small className="text-danger d-block mt-1">{rs.error}</small>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </Card.Body>
    </Card>
  );
};

export default ConsolationOptOutPanel;
