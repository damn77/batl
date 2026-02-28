import { useMemo } from 'react';
import { Form, Row, Col } from 'react-bootstrap';

/**
 * BigTiebreakForm — controlled score entry form for BIG_TIEBREAK format matches.
 *
 * Renders (winningTiebreaks * 2 - 1) tiebreak rows:
 *   winningTiebreaks = 1 → 1 super tiebreak (first to 10, lead >= 2)
 *   winningTiebreaks = 2 → up to 3 super tiebreaks (best of 3)
 *
 * No max score constraint — super tiebreaks can go beyond 10 on deuce.
 * Client-side warning shown when entered scores violate the "10+ with 2-point
 * lead" rule, but the input is never blocked (backend Joi validates on submit).
 *
 * Props:
 *   scoringRules    {Object}  — { winningTiebreaks: number } (defaults to 1 if absent)
 *   value           {Object}  — { sets: Array<{ setNumber, player1Score, player2Score }>, winner: 'PLAYER1'|'PLAYER2'|null }
 *   onChange        {Function} — (newValue) => void
 *   player1Name     {string}
 *   player2Name     {string}
 *   disabled        {boolean} — render all inputs as readOnly
 */
export default function BigTiebreakForm({
  scoringRules,
  value,
  onChange,
  player1Name = 'Player 1',
  player2Name = 'Player 2',
  disabled = false,
}) {
  const winningTiebreaks = scoringRules?.winningTiebreaks ?? 1;
  const maxTiebreaks = winningTiebreaks * 2 - 1;

  // Ensure value.sets has the right length with default empty rows
  const tiebreaks = useMemo(() => {
    const existing = value?.sets ?? [];
    return Array.from({ length: maxTiebreaks }, (_, i) => ({
      setNumber: i + 1,
      player1Score: '',
      player2Score: '',
      ...existing[i],
    }));
  }, [value?.sets, maxTiebreaks]);

  /**
   * Determine which tiebreak rows are locked because the match is already
   * decided by a player reaching winningTiebreaks wins from rows above.
   */
  function getLockedRows(updatedTiebreaks) {
    let p1Wins = 0;
    let p2Wins = 0;
    const locked = new Set();

    for (let i = 0; i < updatedTiebreaks.length; i++) {
      if (p1Wins >= winningTiebreaks || p2Wins >= winningTiebreaks) {
        locked.add(i);
        continue;
      }
      const tb = updatedTiebreaks[i];
      const s1 = Number(tb.player1Score);
      const s2 = Number(tb.player2Score);
      if (tb.player1Score !== '' && tb.player2Score !== '') {
        if (s1 > s2) p1Wins++;
        else if (s2 > s1) p2Wins++;
      }
    }

    return locked;
  }

  /**
   * Derive the match winner from completed tiebreak rows.
   */
  function deriveWinner(updatedTiebreaks) {
    let p1Wins = 0;
    let p2Wins = 0;

    for (const tb of updatedTiebreaks) {
      const s1 = Number(tb.player1Score);
      const s2 = Number(tb.player2Score);
      if (tb.player1Score === '' || tb.player2Score === '') continue;
      if (s1 > s2) p1Wins++;
      else if (s2 > s1) p2Wins++;
    }

    if (p1Wins >= winningTiebreaks) return 'PLAYER1';
    if (p2Wins >= winningTiebreaks) return 'PLAYER2';
    return null;
  }

  /**
   * Validate a completed tiebreak row for the super tiebreak rule:
   * winner must have >= 10 points AND lead by >= 2.
   * Returns warning string or null if valid / incomplete.
   */
  function getTiebreakWarning(tb) {
    const s1 = Number(tb.player1Score);
    const s2 = Number(tb.player2Score);
    if (tb.player1Score === '' || tb.player2Score === '') return null;

    const high = Math.max(s1, s2);
    const diff = Math.abs(s1 - s2);

    if (s1 === s2) return null; // draw (incomplete, no winner yet)
    if (high < 10 || diff < 2) {
      return 'Super tiebreak: winner needs 10+ with 2-point lead';
    }
    return null;
  }

  function handleScoreChange(index, field, rawValue) {
    const updatedTiebreaks = tiebreaks.map((tb, i) => {
      if (i !== index) return tb;
      return { ...tb, [field]: rawValue };
    });

    const winner = deriveWinner(updatedTiebreaks);
    onChange({ sets: updatedTiebreaks, winner });
  }

  const lockedRows = getLockedRows(tiebreaks);

  const label = winningTiebreaks === 1 ? 'Super Tiebreak' : `Super Tiebreak (Best of ${maxTiebreaks})`;

  return (
    <div className="big-tiebreak-form">
      <p className="text-muted small mb-2">{label} — first to 10 with 2-point lead</p>

      {/* Header row */}
      <Row className="mb-1 text-muted small fw-bold">
        {maxTiebreaks > 1 && <Col xs={1} className="text-center">#</Col>}
        <Col xs={maxTiebreaks > 1 ? 5 : 6}>{player1Name}</Col>
        <Col xs={maxTiebreaks > 1 ? 5 : 6}>{player2Name}</Col>
      </Row>

      {tiebreaks.map((tb, index) => {
        const isLocked = lockedRows.has(index);
        const isReadOnly = disabled || isLocked;
        const warning = isReadOnly ? null : getTiebreakWarning(tb);

        return (
          <div key={tb.setNumber} className="mb-2">
            <Row className="align-items-center">
              {maxTiebreaks > 1 && (
                <Col xs={1} className="text-center text-muted">
                  {tb.setNumber}
                </Col>
              )}

              {/* Player 1 score */}
              <Col xs={maxTiebreaks > 1 ? 5 : 6}>
                <Form.Control
                  type="number"
                  min={0}
                  value={tb.player1Score}
                  readOnly={isReadOnly}
                  disabled={isLocked && !disabled}
                  placeholder="0"
                  onChange={(e) => handleScoreChange(index, 'player1Score', e.target.value)}
                  aria-label={`Tiebreak ${tb.setNumber} ${player1Name} score`}
                  size="sm"
                />
              </Col>

              {/* Player 2 score */}
              <Col xs={maxTiebreaks > 1 ? 5 : 6}>
                <Form.Control
                  type="number"
                  min={0}
                  value={tb.player2Score}
                  readOnly={isReadOnly}
                  disabled={isLocked && !disabled}
                  placeholder="0"
                  onChange={(e) => handleScoreChange(index, 'player2Score', e.target.value)}
                  aria-label={`Tiebreak ${tb.setNumber} ${player2Name} score`}
                  size="sm"
                />
              </Col>
            </Row>

            {/* Inline validation warning (display only, does not block submit) */}
            {warning && (
              <Form.Text className="text-warning d-block mt-1">
                {warning}
              </Form.Text>
            )}
          </div>
        );
      })}
    </div>
  );
}
