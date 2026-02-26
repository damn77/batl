/**
 * BracketMyMatch Component
 * Feature: 011-knockout-bracket-view
 * T040, T044, T049: "My Match" navigation button for logged-in participants
 *
 * FR-013: My Match button for logged-in players to navigate to their match
 */

import PropTypes from 'prop-types';
import { Button, Badge } from 'react-bootstrap';
import { bracketColors as defaultColors } from '../config/bracketColors';

/**
 * Get status message based on tournament status
 */
function getStatusMessage(status) {
  switch (status) {
    case 'WINNER':
      return { text: 'Tournament Winner!', variant: 'success', icon: '\uD83C\uDFC6' };
    case 'ELIMINATED':
      return { text: 'Eliminated', variant: 'secondary', icon: '' };
    case 'UPCOMING':
      return { text: 'Upcoming Match', variant: 'primary', icon: '' };
    default:
      return null;
  }
}

/**
 * BracketMyMatch Component
 *
 * Shows a button for logged-in participants to navigate to their relevant matches.
 * Displays status information (upcoming, eliminated, winner).
 *
 * @param {Object} props - Component props
 * @param {Object} props.context - MyMatchContext from findMyMatch utility
 * @param {Function} props.onNavigate - Handler to navigate to match IDs
 * @param {Object} props.colors - Color configuration
 * @param {string} props.label - Custom button text (default "My Match")
 * @param {string} props.className - Additional CSS class
 */
const BracketMyMatch = ({
  context,
  onNavigate,
  colors: _colors = defaultColors,
  label = 'My Match',
  className = ''
}) => {
  // Don't render if not a participant
  if (!context || !context.isParticipant) {
    return null;
  }

  const { currentMatch, tournamentStatus } = context;
  const statusInfo = getStatusMessage(tournamentStatus);

  const handleClick = () => {
    if (currentMatch && onNavigate) {
      onNavigate([currentMatch.id]);
    }
  };

  // Determine button variant based on status
  const buttonVariant =
    tournamentStatus === 'WINNER' ? 'success' :
    tournamentStatus === 'ELIMINATED' ? 'outline-secondary' :
    'primary';

  // Check if navigation is possible
  const canNavigate = currentMatch !== null;

  return (
    <div className={`bracket-my-match d-flex align-items-center gap-2 ${className}`.trim()}>
      {/* Status badge (T049) */}
      {statusInfo && (
        <Badge bg={statusInfo.variant} className="d-flex align-items-center gap-1">
          {statusInfo.icon && <span>{statusInfo.icon}</span>}
          {statusInfo.text}
        </Badge>
      )}

      {/* My Match button (FR-013) */}
      <Button
        variant={buttonVariant}
        size="sm"
        onClick={handleClick}
        disabled={!canNavigate}
        title={
          canNavigate
            ? 'Navigate to your current or next match'
            : 'No upcoming matches'
        }
        aria-label={label}
      >
        {label}
      </Button>

      {/* Match info tooltip */}
      {currentMatch && (
        <small className="text-muted d-none d-md-inline">
          {currentMatch.status === 'IN_PROGRESS' ? 'Live now' :
           currentMatch.status === 'SCHEDULED' ? `Round ${currentMatch.roundNumber}` :
           'View match'}
        </small>
      )}
    </div>
  );
};

BracketMyMatch.propTypes = {
  context: PropTypes.shape({
    playerProfileId: PropTypes.string,
    currentMatch: PropTypes.object,
    previousMatch: PropTypes.object,
    opponentPreviousMatch: PropTypes.object,
    isParticipant: PropTypes.bool.isRequired,
    tournamentStatus: PropTypes.oneOf(['UPCOMING', 'ELIMINATED', 'WINNER', 'SPECTATOR']).isRequired
  }),
  onNavigate: PropTypes.func.isRequired,
  colors: PropTypes.object,
  label: PropTypes.string,
  className: PropTypes.string
};

export default BracketMyMatch;
