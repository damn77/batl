// T078-T084: Knockout Bracket Component - CSS Grid layout with horizontal scroll
import { useState, useEffect } from 'react';
import { Alert, Spinner, Badge } from 'react-bootstrap';
import { useMatches } from '../services/tournamentViewService';
import './KnockoutBracket.css';

/**
 * T080: BracketMatch - Individual match display in bracket
 */
const BracketMatch = ({ match }) => {
  if (!match) {
    return (
      <div className="bracket-match empty">
        <div className="bracket-player">TBD</div>
        <div className="bracket-player">TBD</div>
      </div>
    );
  }

  // T084: Match status colors
  const statusColors = {
    SCHEDULED: 'secondary',
    IN_PROGRESS: 'primary',
    COMPLETED: 'success',
    CANCELLED: 'danger'
  };

  const result = match.matchResult || {};
  const winner = result.winner;

  // Calculate score summary
  const getScoreSummary = () => {
    if (!result.sets || result.sets.length === 0) return null;
    return result.sets.map((set, i) => (
      <span key={i} className="set-score">
        {set.player1Score}-{set.player2Score}
      </span>
    ));
  };

  return (
    <div className={`bracket-match status-${match.status?.toLowerCase() || 'scheduled'}`}>
      <div className={`bracket-player ${winner === 'PLAYER1' ? 'winner' : ''}`}>
        <span className="player-name">{match.player1?.name || 'TBD'}</span>
        {winner === 'PLAYER1' && <span className="winner-icon">🏆</span>}
      </div>
      <div className={`bracket-player ${winner === 'PLAYER2' ? 'winner' : ''}`}>
        <span className="player-name">{match.player2?.name || 'TBD'}</span>
        {winner === 'PLAYER2' && <span className="winner-icon">🏆</span>}
      </div>
      {getScoreSummary() && (
        <div className="match-score">
          {getScoreSummary()}
        </div>
      )}
      <Badge
        bg={statusColors[match.status] || 'secondary'}
        className="match-status-badge"
      >
        {match.status === 'SCHEDULED' && '⏰'}
        {match.status === 'IN_PROGRESS' && '▶'}
        {match.status === 'COMPLETED' && '✓'}
        {match.status === 'CANCELLED' && '✕'}
      </Badge>
    </div>
  );
};

/**
 * T079: BracketRound - Displays all matches in a single round
 */
const BracketRound = ({ round, matches }) => {
  return (
    <div className="bracket-round">
      <div className="round-header">
        <h6>{round.name || `Round ${round.roundNumber}`}</h6>
        <small className="text-muted">{matches.length} matches</small>
      </div>
      <div className="round-matches">
        {matches.map((match, index) => (
          <div key={match?.id || index} className="match-wrapper">
            <BracketMatch match={match} />
            {/* T081: Match connector lines (via CSS) */}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * T078-T084: KnockoutBracket - Main bracket component with CSS Grid layout
 * Includes horizontal scroll, visual indicators, and status colors
 *
 * @param {string} tournamentId - Tournament UUID
 * @param {Object} bracket - Bracket object with id, name, and type
 * @param {Array} rounds - Array of round objects
 */
const KnockoutBracket = ({ tournamentId, bracket, rounds }) => {
  const [showBracket, setShowBracket] = useState(false);
  const [scrollIndicator, setScrollIndicator] = useState({ left: false, right: false });

  // T088-T089: Lazy load matches only when bracket is expanded
  const { matches, isLoading, isError } = useMatches(
    tournamentId,
    { bracketId: bracket.id },
    showBracket
  );

  // T082-T083: Horizontal scroll indicators
  useEffect(() => {
    if (!showBracket) return;

    const container = document.querySelector('.bracket-container');
    if (!container) return;

    const checkScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setScrollIndicator({
        left: scrollLeft > 0,
        right: scrollLeft + clientWidth < scrollWidth - 10
      });
    };

    checkScroll();
    container.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      container.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [showBracket, matches]);

  // Organize matches by round
  const matchesByRound = rounds.map(round => {
    const roundMatches = (matches || []).filter(m => m.roundId === round.id);
    return { round, matches: roundMatches };
  });

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>{bracket.name || bracket.bracketType || 'Main Bracket'}</h5>
        <button
          className="btn btn-outline-primary btn-sm"
          onClick={() => setShowBracket(!showBracket)}
        >
          {showBracket ? '▼ Collapse' : '▶ Expand'} Bracket
        </button>
      </div>

      {showBracket && (
        <>
          {isLoading && (
            <div className="text-center py-4">
              <Spinner animation="border" />
              <p className="text-muted mt-2">Loading bracket...</p>
            </div>
          )}

          {isError && (
            <Alert variant="danger">
              Failed to load bracket data. Please try again.
            </Alert>
          )}

          {matches && (
            <div className="bracket-wrapper">
              {/* T083: Scroll indicators */}
              {scrollIndicator.left && (
                <div className="scroll-indicator left">
                  <span>← Scroll</span>
                </div>
              )}
              {scrollIndicator.right && (
                <div className="scroll-indicator right">
                  <span>Scroll →</span>
                </div>
              )}

              {/* T082: Horizontal scrollable container */}
              <div className="bracket-container">
                <div className="bracket-grid">
                  {matchesByRound.map(({ round, matches: roundMatches }) => (
                    <BracketRound
                      key={round.id}
                      round={round}
                      matches={roundMatches}
                    />
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-3 d-flex gap-3 flex-wrap">
                <small className="text-muted">
                  <Badge bg="secondary" className="me-1">⏰</Badge> Scheduled
                </small>
                <small className="text-muted">
                  <Badge bg="primary" className="me-1">▶</Badge> In Progress
                </small>
                <small className="text-muted">
                  <Badge bg="success" className="me-1">✓</Badge> Completed
                </small>
                <small className="text-muted">
                  <Badge bg="danger" className="me-1">✕</Badge> Cancelled
                </small>
              </div>
            </div>
          )}

          {matches && matches.length === 0 && (
            <Alert variant="info">
              No matches scheduled yet for this bracket.
            </Alert>
          )}
        </>
      )}
    </div>
  );
};

export default KnockoutBracket;
