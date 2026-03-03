// T005: BracketMatch Component - Individual match display in knockout bracket
// FR-003: Match display with player names, scores, court
// FR-004: Support for singles (2 names) and doubles (4 names)
// FR-005: Top player light grey, bottom player white
// FR-006: Winner highlighted with green background
// FR-014: Error state with red background for missing data

import PropTypes from 'prop-types';
import { Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { bracketColors as defaultColors } from '../config/bracketColors';

/**
 * Parse match result from either matchResult object or result JSON string
 * Backend returns `result` as JSON string, but we may also receive `matchResult` as object
 */
function getMatchResult(match) {
  if (!match) return null;

  // If matchResult is already an object, use it
  if (match.matchResult && typeof match.matchResult === 'object') {
    return match.matchResult;
  }

  // If result is a JSON string, parse it
  if (match.result) {
    if (typeof match.result === 'string') {
      try {
        return JSON.parse(match.result);
      } catch {
        return null;
      }
    }
    // result might already be parsed
    if (typeof match.result === 'object') {
      return match.result;
    }
  }

  return null;
}

/**
 * Get player state for styling (winner, loser, tbd)
 */
function getPlayerState(match, position, matchResult) {
  if (match.status !== 'COMPLETED') return 'tbd';

  const winnerPosition = matchResult?.winner;
  if (!winnerPosition) return 'tbd';

  const isWinner =
    (position === 'top' && winnerPosition === 'PLAYER1') ||
    (position === 'bottom' && winnerPosition === 'PLAYER2');

  return isWinner ? 'winner' : 'loser';
}

/**
 * Format score display for a match
 */
function formatScore(match, matchResult) {
  if (match.isBye || match.status === 'BYE') {
    return 'BYE';
  }

  // Special outcome: show compact label instead of a score (WALKOVER→W/O, FORFEIT→FF, NO_SHOW→N/S)
  if (matchResult?.outcome) {
    const labels = { WALKOVER: 'W/O', FORFEIT: 'FF', NO_SHOW: 'N/S' };
    return labels[matchResult.outcome] || matchResult.outcome;
  }

  if (!matchResult?.sets || matchResult.sets.length === 0) {
    return match.status === 'COMPLETED' ? '-' : null;
  }

  return matchResult.sets.map((set, i) => (
    <span key={i} className="set-score">
      {set.player1Score}-{set.player2Score}
      {set.tiebreakScore && <sup>({set.tiebreakScore})</sup>}
    </span>
  ));
}

/**
 * Get player name for display
 */
function getPlayerName(player, pair, isDoubles, fallback = 'TBD') {
  if (isDoubles && pair) {
    return pair.name || `${pair.player1?.name || '?'} / ${pair.player2?.name || '?'}`;
  }
  return player?.name || fallback;
}

/**
 * Get match status icon
 */
function getStatusIcon(status) {
  const icons = {
    SCHEDULED: '\u23F0',  // Alarm clock
    IN_PROGRESS: '\u25B6',  // Play
    COMPLETED: '\u2713',  // Check mark
    CANCELLED: '\u2715',  // X mark
    BYE: 'BYE'
  };
  return icons[status] || '';
}

/**
 * Get Bootstrap badge variant for status
 */
function getStatusVariant(status) {
  const variants = {
    SCHEDULED: 'secondary',
    IN_PROGRESS: 'primary',
    COMPLETED: 'success',
    CANCELLED: 'danger',
    BYE: 'warning'
  };
  return variants[status] || 'secondary';
}

/**
 * BracketMatch Component
 *
 * Displays a single match in the knockout bracket with:
 * - Player names (2 for singles, 4 for doubles)
 * - Score display (sets or BYE)
 * - Status badge
 * - Winner highlighting
 * - Court number
 *
 * @param {Object} props - Component props
 * @param {Object} props.match - Match data object
 * @param {Object} props.colors - Color configuration (optional, uses defaults)
 * @param {boolean} props.isHighlighted - Whether match is highlighted (My Match)
 * @param {boolean} props.isDoubles - Whether this is a doubles match
 * @param {boolean} props.compact - Compact view for zoomed out display
 * @param {Function} props.onClick - Click handler
 * @param {string} props.className - Additional CSS class
 */
const BracketMatch = ({
  match,
  colors: _colors = defaultColors,
  isHighlighted = false,
  isDoubles = false,
  compact = false,
  onClick,
  className = ''
}) => {
  // Handle null/undefined match (empty slot)
  if (!match) {
    return (
      <div className={`bracket-match empty ${className}`.trim()}>
        <div className="bracket-player">TBD</div>
        <div className="bracket-player">TBD</div>
      </div>
    );
  }

  // Parse match result (handles both matchResult object and result JSON string)
  const matchResult = getMatchResult(match);

  // Error state - missing required data
  const hasError = !match.id || (match.status === 'COMPLETED' && !matchResult);
  if (hasError) {
    return (
      <div
        className={`bracket-match error-state ${className}`.trim()}
        data-match-id={match.id}
      >
        <div className="bracket-player">Error: Invalid match data</div>
      </div>
    );
  }

  const status = match.status || 'SCHEDULED';
  const isBye = match.isBye || status === 'BYE';

  // For BYE matches, the real player can be in either slot (especially consolation BYEs
  // where the loser is placed in player1 or player2 depending on bracket pairing).
  // Detect which slot holds the real player so we always display their name.
  const byeActivePlayer = isBye ? (match.player1 || match.player2) : null;
  const byeActivePair = isBye ? (match.pair1 || match.pair2) : null;

  const bothFilled = isDoubles
    ? (match.pair1 != null && match.pair2 != null)
    : (match.player1 != null && match.player2 != null);
  const isBlocked = !isBye && !bothFilled;
  const topPlayerState = getPlayerState(match, 'top', matchResult);
  const bottomPlayerState = getPlayerState(match, 'bottom', matchResult);
  const score = formatScore(match, matchResult);

  // Special outcome detection — drives blue winner highlight vs standard green
  const isSpecialOutcome = !!matchResult?.outcome;
  const specialOutcomeColor = _colors?.specialOutcomeWinner || '#cfe2ff';

  // Build CSS classes
  const matchClasses = [
    'bracket-match',
    `status-${status.toLowerCase().replace('_', '-')}`,
    isHighlighted && 'highlighted',
    isBye && 'status-bye',
    isBlocked && 'tbd-pending',
    compact && 'compact',
    className
  ].filter(Boolean).join(' ');

  const handleClick = () => {
    if (onClick) onClick(match);
  };

  return (
    <div
      className={matchClasses}
      data-match-id={match.id}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && handleClick() : undefined}
      style={isBlocked ? { opacity: 0.65, backgroundColor: '#f8f9fa' } : undefined}
    >
      {/* Top player/pair (FR-005: light grey background) */}
      {/* For BYE matches, display whichever slot has the real player (consolation BYEs can have the player in either slot) */}
      <div
        className={`bracket-player top-player ${topPlayerState === 'winner' && !isSpecialOutcome ? 'winner' : ''}`}
        style={topPlayerState === 'winner' && isSpecialOutcome ? { backgroundColor: specialOutcomeColor } : {}}
      >
        <span className="player-name">
          {isBye ? (
            // BYE match: show whichever player/pair is present
            !isDoubles && byeActivePlayer?.id ? (
              <Link to={`/players/${byeActivePlayer.id}`} onClick={e => e.stopPropagation()}>
                {getPlayerName(byeActivePlayer, byeActivePair, isDoubles)}
              </Link>
            ) : (
              getPlayerName(byeActivePlayer, byeActivePair, isDoubles)
            )
          ) : (
            // Normal match: always show player1/pair1 in top slot
            !isDoubles && match.player1?.id ? (
              <Link to={`/players/${match.player1.id}`} onClick={e => e.stopPropagation()}>
                {getPlayerName(match.player1, match.pair1, isDoubles)}
              </Link>
            ) : (
              getPlayerName(match.player1, match.pair1, isDoubles)
            )
          )}
          {(isBye ? byeActivePlayer : match.player1)?.seed && <span className="seed-badge">[{(isBye ? byeActivePlayer : match.player1).seed}]</span>}
        </span>
        {topPlayerState === 'winner' && <span className="winner-icon" aria-label="Winner">&#127942;</span>}
      </div>

      {/* Bottom player/pair (FR-005: white background) */}
      {!isBye && (
        <div
          className={`bracket-player ${bottomPlayerState === 'winner' && !isSpecialOutcome ? 'winner' : ''}`}
          style={bottomPlayerState === 'winner' && isSpecialOutcome ? { backgroundColor: specialOutcomeColor } : {}}
        >
          <span className="player-name">
            {!isDoubles && match.player2?.id ? (
              <Link to={`/players/${match.player2.id}`} onClick={e => e.stopPropagation()}>
                {getPlayerName(match.player2, match.pair2, isDoubles)}
              </Link>
            ) : (
              getPlayerName(match.player2, match.pair2, isDoubles)
            )}
            {match.player2?.seed && <span className="seed-badge">[{match.player2.seed}]</span>}
          </span>
          {bottomPlayerState === 'winner' && <span className="winner-icon" aria-label="Winner">&#127942;</span>}
        </div>
      )}

      {/* BYE indicator */}
      {isBye && (
        <div className="bracket-player bye-slot">
          <span className="bye-text">BYE</span>
        </div>
      )}

      {/* Score display (FR-003) */}
      {!compact && !isBye && (
        <div className="match-score">
          {score || '-'}
        </div>
      )}

      {/* Court number (FR-003) */}
      {match.court && !compact && (
        <div className="match-court">
          Court {match.court}
        </div>
      )}

      {/* Status badge */}
      <Badge
        bg={getStatusVariant(status)}
        className="match-status-badge"
        aria-label={`Status: ${status.replace('_', ' ')}`}
      >
        {getStatusIcon(status)}
      </Badge>
    </div>
  );
};

BracketMatch.propTypes = {
  match: PropTypes.shape({
    id: PropTypes.string,
    roundId: PropTypes.string,
    roundNumber: PropTypes.number,
    matchNumber: PropTypes.number,
    player1: PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      seed: PropTypes.number
    }),
    player2: PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      seed: PropTypes.number
    }),
    pair1: PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      player1: PropTypes.object,
      player2: PropTypes.object
    }),
    pair2: PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      player1: PropTypes.object,
      player2: PropTypes.object
    }),
    matchResult: PropTypes.shape({
      winner: PropTypes.oneOf(['PLAYER1', 'PLAYER2']),
      sets: PropTypes.arrayOf(PropTypes.shape({
        setNumber: PropTypes.number,
        player1Score: PropTypes.number,
        player2Score: PropTypes.number,
        tiebreakScore: PropTypes.string
      })),
      finalScore: PropTypes.string
    }),
    status: PropTypes.oneOf(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'BYE']),
    court: PropTypes.string,
    isBye: PropTypes.bool
  }),
  colors: PropTypes.object,
  isHighlighted: PropTypes.bool,
  isDoubles: PropTypes.bool,
  compact: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string
};

export default BracketMatch;
