import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { submitMatchResult } from '../services/matchService';
import SetsScoreForm from './SetsScoreForm';
import BigTiebreakForm from './BigTiebreakForm';

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

const MatchResultModal = ({ match, onClose, isOrganizer, isParticipant, scoringRules, mutate }) => {
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
  }, [match?.id, match?.result]);

  // Special outcome state (organizer-only)
  const [specialOutcome, setSpecialOutcome] = useState('WALKOVER');
  const [specialWinner, setSpecialWinner] = useState('PLAYER1');

  // 'score' | 'special' — organizer mode toggle
  const [mode, setMode] = useState('score');

  // Error and submission state
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // When organizer submits invalid scores, holds { resultData, errors } awaiting confirmation
  const [pendingInvalidSubmit, setPendingInvalidSubmit] = useState(null);

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

  const handleSubmit = async () => {
    setError(null);
    setPendingInvalidSubmit(null);
    setSubmitting(true);
    try {
      let resultData;

      if (isOrganizer && mode === 'special') {
        resultData = { outcome: specialOutcome, winner: specialWinner };
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
      }

      await submitMatchResult(match.id, resultData);
      mutate(); // re-fetch bracket matches via SWR
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
      onClose();
    } catch (err) {
      setError(err.message || t('errors.genericFallback', 'An error occurred'));
    } finally {
      setSubmitting(false);
    }
  };

  // Guard: don't render if no match selected
  if (!match) return null;

  const player1Name = match.player1?.name || match.pair1?.name || 'Player 1';
  const player2Name = match.player2?.name || match.pair2?.name || 'Player 2';

  return (
    <Modal show={!!match} onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          {player1Name} vs {player2Name}
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
            <div className="mb-3">
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
              </Form>
            )}
          </>
        ) : (
          /* Mode 2: Player editable */
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
        )}
      </Modal.Body>

      {!isReadOnly && (
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          {pendingInvalidSubmit ? (
            <>
              <Button variant="outline-secondary" onClick={() => setPendingInvalidSubmit(null)} disabled={submitting}>
                Fix Scores
              </Button>
              <Button variant="danger" onClick={handleConfirmInvalidSubmit} disabled={submitting}>
                {submitting ? 'Saving...' : 'Submit Anyway'}
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : (isOrganizer ? 'Save Result' : 'Submit Result')}
            </Button>
          )}
        </Modal.Footer>
      )}
    </Modal>
  );
};

export default MatchResultModal;
