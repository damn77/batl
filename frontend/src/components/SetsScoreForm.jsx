import { useMemo } from 'react';
import { Form, Row, Col } from 'react-bootstrap';

/**
 * SetsScoreForm — controlled score entry form for SETS format matches.
 *
 * Renders maxSets = (winningSets * 2 - 1) set rows. Each row has player1Score
 * and player2Score inputs (0-7). When either score equals 6 a tiebreak score
 * input appears (loser's score, standard tennis notation: 7-6(4)).
 *
 * Automatically disables set rows once one player has accumulated winningSets
 * wins. Auto-derives the winner and calls onChange on every input change.
 *
 * Props:
 *   scoringRules  {Object}  — { winningSets: number } (defaults to 2 if absent)
 *   value         {Object}  — { sets: Array<{ setNumber, player1Score, player2Score, tiebreakScore }>, winner: 'PLAYER1'|'PLAYER2'|null }
 *   onChange      {Function} — (newValue) => void
 *   player1Name   {string}
 *   player2Name   {string}
 *   disabled      {boolean} — render all inputs as readOnly
 */
export default function SetsScoreForm({
  scoringRules,
  value,
  onChange,
  player1Name = 'Player 1',
  player2Name = 'Player 2',
  disabled = false,
}) {
  const winningSets = scoringRules?.winningSets ?? 2;
  const maxSets = winningSets * 2 - 1;

  // Ensure value.sets has the right length with default empty rows
  const sets = useMemo(() => {
    const existing = value?.sets ?? [];
    return Array.from({ length: maxSets }, (_, i) => ({
      setNumber: i + 1,
      player1Score: '',
      player2Score: '',
      tiebreakScore: '',
      ...existing[i],
    }));
  }, [value?.sets, maxSets]);

  /**
   * Derive winner from completed set rows.
   * A set is won by player1 when player1Score > player2Score and one of them
   * has reached a valid set-winning total. For simplicity, treat any row
   * where one score is strictly greater than the other as a completed set.
   */
  function deriveWinner(updatedSets) {
    let p1Wins = 0;
    let p2Wins = 0;

    for (const set of updatedSets) {
      const s1 = Number(set.player1Score);
      const s2 = Number(set.player2Score);
      if (set.player1Score === '' || set.player2Score === '') continue;
      if (s1 > s2) p1Wins++;
      else if (s2 > s1) p2Wins++;
    }

    if (p1Wins >= winningSets) return 'PLAYER1';
    if (p2Wins >= winningSets) return 'PLAYER2';
    return null;
  }

  /**
   * Determine which set rows are locked because the match is already decided
   * by a player reaching winningSets wins from the rows above.
   */
  function getLockedRows(updatedSets) {
    let p1Wins = 0;
    let p2Wins = 0;
    const locked = new Set();

    for (let i = 0; i < updatedSets.length; i++) {
      // Once a player has already reached winningSets, all subsequent rows are locked
      if (p1Wins >= winningSets || p2Wins >= winningSets) {
        locked.add(i);
        continue;
      }
      const set = updatedSets[i];
      const s1 = Number(set.player1Score);
      const s2 = Number(set.player2Score);
      if (set.player1Score !== '' && set.player2Score !== '') {
        if (s1 > s2) p1Wins++;
        else if (s2 > s1) p2Wins++;
      }
    }

    return locked;
  }

  const handleNumericKeyDown = (e) => {
    if (!/^\d$/.test(e.key) && !['Backspace','Tab','ArrowLeft','ArrowRight','Delete','Enter'].includes(e.key)) {
      e.preventDefault();
    }
  };

  function handleScoreChange(index, field, rawValue) {
    const updatedSets = sets.map((set, i) => {
      if (i !== index) return set;
      return { ...set, [field]: rawValue };
    });

    const winner = deriveWinner(updatedSets);
    onChange({ sets: updatedSets, winner });
  }

  const lockedRows = getLockedRows(sets);

  return (
    <div className="sets-score-form">
      {/* Header row */}
      <Row className="mb-1 text-muted small fw-bold">
        <Col xs={1} className="text-center">Set</Col>
        <Col xs={4}>{player1Name}</Col>
        <Col xs={4}>{player2Name}</Col>
        <Col xs={3}>Tiebreak</Col>
      </Row>

      {sets.map((set, index) => {
        const isLocked = lockedRows.has(index);
        const isReadOnly = disabled || isLocked;
        const s1 = Number(set.player1Score);
        const s2 = Number(set.player2Score);
        const showTiebreak =
          set.player1Score !== '' &&
          set.player2Score !== '' &&
          (s1 === 6 || s2 === 6);

        return (
          <Row key={set.setNumber} className="mb-2 align-items-center">
            <Col xs={1} className="text-center text-muted">
              {set.setNumber}
            </Col>

            {/* Player 1 score */}
            <Col xs={4}>
              <Form.Control
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={set.player1Score}
                readOnly={isReadOnly}
                disabled={isLocked && !disabled}
                placeholder="0"
                onChange={(e) => handleScoreChange(index, 'player1Score', e.target.value)}
                onKeyDown={handleNumericKeyDown}
                aria-label={`Set ${set.setNumber} ${player1Name} score`}
                size="sm"
              />
            </Col>

            {/* Player 2 score */}
            <Col xs={4}>
              <Form.Control
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={set.player2Score}
                readOnly={isReadOnly}
                disabled={isLocked && !disabled}
                placeholder="0"
                onChange={(e) => handleScoreChange(index, 'player2Score', e.target.value)}
                onKeyDown={handleNumericKeyDown}
                aria-label={`Set ${set.setNumber} ${player2Name} score`}
                size="sm"
              />
            </Col>

            {/* Tiebreak score (loser's score in parenthesis notation) */}
            <Col xs={3}>
              {showTiebreak ? (
                <Form.Control
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={set.tiebreakScore}
                  readOnly={isReadOnly}
                  disabled={isLocked && !disabled}
                  placeholder="e.g. 4"
                  onChange={(e) => handleScoreChange(index, 'tiebreakScore', e.target.value)}
                  onKeyDown={handleNumericKeyDown}
                  aria-label={`Set ${set.setNumber} tiebreak loser's score`}
                  size="sm"
                />
              ) : (
                <span className="text-muted small">—</span>
              )}
            </Col>
          </Row>
        );
      })}

      {/* Tiebreak legend */}
      <p className="text-muted small mt-1 mb-0">
        Tiebreak: enter the loser&apos;s score (e.g. 7-6(<strong>4</strong>))
      </p>
    </div>
  );
}
