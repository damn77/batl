import { useState, useEffect } from 'react';
import { Modal, Button, ButtonGroup, Form, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { mutate as globalMutate } from 'swr';
import { submitMatchResult, submitMatchResultDryRun } from '../services/matchService';
import SetsScoreForm from './SetsScoreForm';
import BigTiebreakForm from './BigTiebreakForm';
import './MatchResultModal.css';

/**
 * MatchResultModal — role-aware match result dialog.
 *
 * Three rendering modes (derived from props, not a mode prop):
 *
 * 1. Read-only (organizer-locked, non-organizer viewer):
 *    matchResult?.submittedBy === 'ORGANIZER' && !isOrganizer
 *    Shows score read-only with "Result confirmed by organizer" alert.
 *
 * 2. Player editable:
 *    isParticipant && !isOrganizer and match is NOT organizer-locked.
 *    Shows format-aware score entry form. No special outcome toggle.
 *
 * 3. Organizer editable:
 *    isOrganizer (regardless of lock state).
 *    Shows format-aware score entry plus a special outcome radio toggle.
 *
 * Props:
 *   match         {Object|null}   — match object (null = modal is closed)
 *   onClose       {Function}      — () => void
 *   isOrganizer   {boolean}       — user.role === 'ADMIN' || 'ORGANIZER'
 *   isParticipant {boolean}       — from isMatchParticipant(match, currentUserPlayerId)
 *   scoringRules  {Object}        — { formatType, winningSets, winningTiebreaks }
 *   mutate        {Function}      — SWR mutate() to re-fetch bracket matches
 */
/**
 * Validate each set score against standard tennis rules (SETS format only).
 * Valid scores: 6-0..6-4, 7-5, 7-6. Returns array of human-readable error strings.
 */
function validateSetScores(sets) {
  const errors = [];
  for (const set of sets) {
    const s1 = set.player1Score;
    const s2 = set.player2Score;
    if (s1 === s2) {
      errors.push(`Set ${set.setNumber}: scores cannot be equal (${s1}–${s2})`);
      continue;
    }
    const [hi, lo] = s1 > s2 ? [s1, s2] : [s2, s1];
    const valid = (hi === 6 && lo <= 4) || (hi === 7 && (lo === 5 || lo === 6));
    if (!valid) errors.push(`Set ${set.setNumber}: ${s1}–${s2} is not a valid tennis score`);
  }
  return errors;
}

const MatchResultModal = ({ match, onClose, isOrganizer, isParticipant: _isParticipant, scoringRules, mutate }) => {
  const { t } = useTranslation();

  // Parse existing result for pre-population and lock detection
  const matchResult = match?.result
    ? (typeof match.result === 'string'
        ? (() => { try { return JSON.parse(match.result); } catch { return null; } })()
        : match.result)
    : null;

  // Merge match-level rule overrides over tournament-level scoring rules
  const effectiveScoringRules = {
    ...scoringRules,
    ...(match?.ruleOverrides
      ? (() => { try { return JSON.parse(match.ruleOverrides); } catch { return {}; } })()
      : {})
  };

  const isOrganizerLocked = matchResult?.submittedBy === 'ORGANIZER';
  const isReadOnly = isOrganizerLocked && !isOrganizer;

  // Track existing winner for change detection (null = first-time submission)
  const existingWinner = matchResult?.winner || null;

  // Form state — pre-populate with existing result if available
  const [formValue, setFormValue] = useState(
    matchResult ? { sets: matchResult.sets || [], winner: matchResult.winner || null } : { sets: [], winner: null }
  );

  // Re-sync form when a different match is selected (useState initializer only runs on mount)
  useEffect(() => {
    const result = match?.result
      ? (typeof match.result === 'string'
          ? (() => { try { return JSON.parse(match.result); } catch { return null; } })()
          : match.result)
      : null;
    setFormValue(result ? { sets: result.sets || [], winner: result.winner || null } : { sets: [], winner: null });
    setPendingInvalidSubmit(null);
    setPendingWinnerChange(null);
    setPartialScore({ player1Games: '', player2Games: '' });
  }, [match?.id, match?.result]);

  // Special outcome state (organizer-only)
  const [specialOutcome, setSpecialOutcome] = useState('WALKOVER');
  const [specialWinner, setSpecialWinner] = useState('PLAYER1');
  const [partialScore, setPartialScore] = useState({ player1Games: '', player2Games: '' });

  // 'score' | 'special' — organizer mode toggle
  const [mode, setMode] = useState('score');

  // Error and submission state
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // When organizer submits invalid scores, holds { resultData, errors } awaiting confirmation
  const [pendingInvalidSubmit, setPendingInvalidSubmit] = useState(null);

  // When organizer changes winner on a match with downstream results, holds { resultData, impact } awaiting confirmation
  const [pendingWinnerChange, setPendingWinnerChange] = useState(null);

  // Computed: is the current form winner different from the existing (stored) winner?
  const isWinnerChanging = !!(existingWinner && formValue.winner && formValue.winner !== existingWinner);

  const buildSanitizedSets = () =>
    formValue.sets
      .filter(s => s.player1Score !== '' && s.player2Score !== '')
      .map(s => ({
        setNumber: parseInt(s.setNumber, 10),
        player1Score: parseInt(s.player1Score, 10),
        player2Score: parseInt(s.player2Score, 10),
        tiebreakScore: (s.tiebreakScore !== '' && s.tiebreakScore != null)
          ? parseInt(s.tiebreakScore, 10)
          : null,
      }));

  /**
   * Shared helper: run dry-run if winner is changing, show confirmation if needed.
   * Returns true if execution should be halted (pending confirmation), false to proceed.
   */
  const runDryRunIfNeeded = async (matchId, resultData, winnerChanging) => {
    if (!winnerChanging) return false;

    const dryRunResult = await submitMatchResultDryRun(matchId, resultData);
    if (dryRunResult.requiresConfirmation) {
      setPendingWinnerChange({ resultData, impact: dryRunResult });
      return true; // halt — awaiting confirmation
    }
    return false; // proceed directly (0 impacted matches)
  };

  const handleSubmit = async () => {
    setError(null);
    setPendingInvalidSubmit(null);
    setSubmitting(true);
    try {
      let resultData;

      if (isOrganizer && mode === 'special') {
        resultData = { outcome: specialOutcome, winner: specialWinner };
        // Include partialScore for RETIRED if both fields are filled
        if (
          specialOutcome === 'RETIRED' &&
          partialScore.player1Games !== '' &&
          partialScore.player2Games !== ''
        ) {
          resultData.partialScore = {
            player1Games: parseInt(partialScore.player1Games, 10),
            player2Games: parseInt(partialScore.player2Games, 10)
          };
        }

        // Special outcome: check if winner is changing (uses specialWinner, not formValue.winner)
        const isSpecialWinnerChanging = !!(existingWinner && specialWinner !== existingWinner);
        const halted = await runDryRunIfNeeded(match.id, resultData, isSpecialWinnerChanging);
        if (halted) {
          setSubmitting(false);
          return;
        }
      } else {
        if (!formValue.winner) {
          setError(t('match.errors.noWinner', 'Please complete all scores so a winner can be determined'));
          setSubmitting(false);
          return;
        }
        const sanitizedSets = buildSanitizedSets();

        // Score validation — only applies to SETS format
        if (effectiveScoringRules?.formatType !== 'BIG_TIEBREAK') {
          const scoreErrors = validateSetScores(sanitizedSets);
          if (scoreErrors.length > 0) {
            if (!isOrganizer) {
              // Players: hard block
              setError(scoreErrors.join('\n'));
              setSubmitting(false);
              return;
            }
            // Organizers: surface warning and await "Submit Anyway" confirmation
            setPendingInvalidSubmit({
              resultData: {
                formatType: effectiveScoringRules?.formatType || 'SETS',
                winner: formValue.winner,
                sets: sanitizedSets,
              },
              errors: scoreErrors,
            });
            setSubmitting(false);
            return;
          }
        }

        resultData = {
          formatType: effectiveScoringRules?.formatType || 'SETS',
          winner: formValue.winner,
          sets: sanitizedSets,
        };

        // Score-only correction: same winner — skip dry-run entirely
        if (existingWinner && resultData.winner === existingWinner) {
          // Fall through to submitMatchResult below — no dry-run needed
        } else {
          // Organizer winner change: run dry-run
          if (isOrganizer) {
            const halted = await runDryRunIfNeeded(match.id, resultData, isWinnerChanging);
            if (halted) {
              setSubmitting(false);
              return;
            }
          }
        }
      }

      await submitMatchResult(match.id, resultData);
      mutate(); // re-fetch this bracket's matches via SWR
      // Also revalidate all other bracket match caches for this tournament
      // so consolation bracket refreshes when a main bracket result is submitted
      if (match?.tournamentId) {
        globalMutate(key => typeof key === 'string' && key.includes(`/tournaments/${match.tournamentId}/matches`));
      }
      onClose();
    } catch (err) {
      setError(err.message || t('errors.genericFallback', 'An error occurred'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmInvalidSubmit = async () => {
    if (!pendingInvalidSubmit) return;
    setSubmitting(true);
    try {
      await submitMatchResult(match.id, pendingInvalidSubmit.resultData);
      setPendingInvalidSubmit(null);
      mutate();
      if (match?.tournamentId) {
        globalMutate(key => typeof key === 'string' && key.includes(`/tournaments/${match.tournamentId}/matches`));
      }
      onClose();
    } catch (err) {
      setError(err.message || t('errors.genericFallback', 'An error occurred'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmWinnerChange = async () => {
    if (!pendingWinnerChange) return;
    setSubmitting(true);
    try {
      await submitMatchResult(match.id, pendingWinnerChange.resultData);
      setPendingWinnerChange(null);
      mutate();
      if (match?.tournamentId) {
        globalMutate(key => typeof key === 'string' && key.includes(`/tournaments/${match.tournamentId}/matches`));
      }
      onClose();
    } catch (err) {
      setError(err.message || t('errors.genericFallback', 'An error occurred'));
    } finally {
      setSubmitting(false);
    }
  };

  // Guard: don't render if no match selected
  if (!match) return null;

  const isDoublesMatch = !!(match.pair1 || match.pair2);
  const player1Name = isDoublesMatch
    ? (match.pair1 ? `${match.pair1.player1?.name || '?'} / ${match.pair1.player2?.name || '?'}` : 'Pair 1')
    : (match.player1?.name || 'Player 1');
  const player2Name = isDoublesMatch
    ? (match.pair2 ? `${match.pair2.player1?.name || '?'} / ${match.pair2.player2?.name || '?'}` : 'Pair 2')
    : (match.player2?.name || 'Player 2');

  // Non-organizer winner lock: submit is blocked when winner would change
  const isSubmitBlockedByWinnerLock = !isOrganizer && isWinnerChanging;

  return (
    <Modal show={!!match} onHide={onClose} centered size="lg" fullscreen="sm-down" className="match-result-modal">
      <Modal.Header closeButton>
        <Modal.Title>
          {isDoublesMatch ? (
            <div style={{ lineHeight: '1.6' }}>
              <div>{player1Name}</div>
              <div className="text-muted" style={{ fontSize: '0.85em' }}>vs</div>
              <div>{player2Name}</div>
            </div>
          ) : (
            <>{player1Name} vs {player2Name}</>
          )}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && <Alert variant="danger" style={{ whiteSpace: 'pre-line' }}>{error}</Alert>}

        {/* Organizer invalid-score confirmation warning */}
        {pendingInvalidSubmit && (
          <Alert variant="warning">
            <Alert.Heading>Invalid score detected</Alert.Heading>
            <ul className="mb-0">
              {pendingInvalidSubmit.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </Alert>
        )}

        {/* Organizer winner-change confirmation warning */}
        {pendingWinnerChange && (
          <Alert variant="warning">
            <Alert.Heading>Changing the winner will affect later matches</Alert.Heading>
            <p>
              This will clear {pendingWinnerChange.impact.impactedMainMatches} main bracket match(es)
              {pendingWinnerChange.impact.impactedConsolationMatches > 0
                ? ` and ${pendingWinnerChange.impact.impactedConsolationMatches} consolation match(es)`
                : ''}.
            </p>
            {pendingWinnerChange.impact.affectedPlayers.length > 0 && (
              <p>Affected players: {pendingWinnerChange.impact.affectedPlayers.join(', ')}</p>
            )}
            <p className="mb-0">Do you want to proceed?</p>
          </Alert>
        )}

        {isReadOnly ? (
          /* Mode 1: Read-only (organizer-locked, non-organizer viewer) */
          <>
            <Alert variant="info">
              {t('match.lockedMessage', 'Result confirmed by organizer')}
            </Alert>

            {matchResult?.outcome ? (
              <p>
                <strong>{matchResult.outcome}</strong>{' '}
                &mdash;{' '}
                {matchResult.winner === 'PLAYER1' ? player1Name : player2Name} wins
              </p>
            ) : effectiveScoringRules?.formatType === 'BIG_TIEBREAK' ? (
              <BigTiebreakForm
                scoringRules={effectiveScoringRules}
                value={formValue}
                onChange={() => {}}
                player1Name={player1Name}
                player2Name={player2Name}
                disabled
              />
            ) : (
              <SetsScoreForm
                scoringRules={effectiveScoringRules}
                value={formValue}
                onChange={() => {}}
                player1Name={player1Name}
                player2Name={player2Name}
                disabled
              />
            )}
          </>
        ) : isOrganizer ? (
          /* Mode 3: Organizer editable — score or special outcome */
          <>
            {/* Desktop: inline radios (>=576px) */}
            <div className="mode-toggle-desktop d-none d-sm-block mb-3">
              <Form.Check
                type="radio"
                inline
                id="mode-score"
                label="Enter score"
                name="resultMode"
                checked={mode === 'score'}
                onChange={() => setMode('score')}
              />
              <Form.Check
                type="radio"
                inline
                id="mode-special"
                label="Special outcome"
                name="resultMode"
                checked={mode === 'special'}
                onChange={() => setMode('special')}
              />
            </div>
            {/* Mobile: segmented ButtonGroup (<576px) */}
            <div className="mode-toggle-mobile d-sm-none mb-3">
              <ButtonGroup className="w-100">
                <Button
                  className="flex-fill"
                  variant={mode === 'score' ? 'primary' : 'outline-primary'}
                  onClick={() => setMode('score')}
                >
                  Enter score
                </Button>
                <Button
                  className="flex-fill"
                  variant={mode === 'special' ? 'primary' : 'outline-primary'}
                  onClick={() => setMode('special')}
                >
                  Special outcome
                </Button>
              </ButtonGroup>
            </div>

            {mode === 'score' ? (
              effectiveScoringRules?.formatType === 'BIG_TIEBREAK' ? (
                <BigTiebreakForm
                  scoringRules={effectiveScoringRules}
                  value={formValue}
                  onChange={setFormValue}
                  player1Name={player1Name}
                  player2Name={player2Name}
                />
              ) : (
                <SetsScoreForm
                  scoringRules={effectiveScoringRules}
                  value={formValue}
                  onChange={setFormValue}
                  player1Name={player1Name}
                  player2Name={player2Name}
                />
              )
            ) : (
              /* Special outcome form */
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Outcome type</Form.Label>
                  <Form.Select
                    value={specialOutcome}
                    onChange={(e) => setSpecialOutcome(e.target.value)}
                  >
                    <option value="WALKOVER">Walkover (W/O)</option>
                    <option value="FORFEIT">Forfeit (FF)</option>
                    <option value="NO_SHOW">No-show (N/S)</option>
                    <option value="RETIRED">Retired (RET)</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Winner</Form.Label>
                  <Form.Select
                    value={specialWinner}
                    onChange={(e) => setSpecialWinner(e.target.value)}
                  >
                    <option value="PLAYER1">{player1Name}</option>
                    <option value="PLAYER2">{player2Name}</option>
                  </Form.Select>
                </Form.Group>

                {specialOutcome === 'RETIRED' && (
                  <Form.Group className="mb-3">
                    <Form.Label>Partial score (games played before retirement — optional)</Form.Label>
                    <div className="d-flex gap-2 align-items-center">
                      <Form.Control
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder={player1Name + ' games'}
                        value={partialScore.player1Games}
                        onChange={(e) => setPartialScore(prev => ({ ...prev, player1Games: e.target.value }))}
                        onKeyDown={(e) => {
                          if (!/^\d$/.test(e.key) && !['Backspace','Tab','ArrowLeft','ArrowRight','Delete','Enter'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        style={{ maxWidth: '160px' }}
                      />
                      <span className="text-muted">-</span>
                      <Form.Control
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder={player2Name + ' games'}
                        value={partialScore.player2Games}
                        onChange={(e) => setPartialScore(prev => ({ ...prev, player2Games: e.target.value }))}
                        onKeyDown={(e) => {
                          if (!/^\d$/.test(e.key) && !['Backspace','Tab','ArrowLeft','ArrowRight','Delete','Enter'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        style={{ maxWidth: '160px' }}
                      />
                    </div>
                    <Form.Text className="text-muted">
                      The retiring player is automatically opted out of consolation.
                    </Form.Text>
                  </Form.Group>
                )}
              </Form>
            )}
          </>
        ) : (
          /* Mode 2: Player editable */
          <>
            {effectiveScoringRules?.formatType === 'BIG_TIEBREAK' ? (
              <BigTiebreakForm
                scoringRules={effectiveScoringRules}
                value={formValue}
                onChange={setFormValue}
                player1Name={player1Name}
                player2Name={player2Name}
              />
            ) : (
              <SetsScoreForm
                scoringRules={effectiveScoringRules}
                value={formValue}
                onChange={setFormValue}
                player1Name={player1Name}
                player2Name={player2Name}
              />
            )}
            {/* Non-organizer winner-lock warning */}
            {isSubmitBlockedByWinnerLock && (
              <Alert variant="info" className="mt-3">
                Only a tournament organizer can change the winner of a completed match. You can update the score without changing the winner.
              </Alert>
            )}
          </>
        )}
      </Modal.Body>

      {!isReadOnly && (
        <Modal.Footer>
          {pendingWinnerChange ? (
            <div className="confirmation-buttons d-flex flex-wrap gap-2 w-100">
              <Button className="confirm-primary" variant="danger" onClick={handleConfirmWinnerChange} disabled={submitting}>
                {submitting ? 'Saving...' : 'Confirm Change'}
              </Button>
              <Button className="confirm-secondary" variant="outline-secondary" onClick={() => setPendingWinnerChange(null)} disabled={submitting}>
                Go Back
              </Button>
              <Button className="confirm-secondary" variant="secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
            </div>
          ) : pendingInvalidSubmit ? (
            <div className="confirmation-buttons d-flex flex-wrap gap-2 w-100">
              <Button className="confirm-primary" variant="danger" onClick={handleConfirmInvalidSubmit} disabled={submitting}>
                {submitting ? 'Saving...' : 'Submit Anyway'}
              </Button>
              <Button className="confirm-secondary" variant="outline-secondary" onClick={() => setPendingInvalidSubmit(null)} disabled={submitting}>
                Fix Scores
              </Button>
              <Button className="confirm-secondary" variant="secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={submitting || isSubmitBlockedByWinnerLock}
              >
                {submitting ? 'Saving...' : (isOrganizer ? 'Save Result' : 'Submit Result')}
              </Button>
            </>
          )}
        </Modal.Footer>
      )}
    </Modal>
  );
};

export default MatchResultModal;
