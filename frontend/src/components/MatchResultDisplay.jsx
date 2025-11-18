// T074: Match Result Display Component - Formats match result JSON
import { Badge } from 'react-bootstrap';

/**
 * MatchResultDisplay - Displays match result in user-friendly format
 * Parses matchResult JSON and displays score with proper formatting
 *
 * @param {Object} match - Match object with matchResult JSON
 * @param {boolean} compact - Whether to show compact view (default: false)
 */
const MatchResultDisplay = ({ match, compact = false }) => {
  if (!match) return null;

  // Get match status
  const status = match.status || 'SCHEDULED';

  // Status badge configuration
  const statusConfig = {
    SCHEDULED: { variant: 'secondary', label: 'Scheduled' },
    IN_PROGRESS: { variant: 'primary', label: 'In Progress' },
    COMPLETED: { variant: 'success', label: 'Completed' },
    CANCELLED: { variant: 'danger', label: 'Cancelled' }
  };

  const statusInfo = statusConfig[status] || statusConfig.SCHEDULED;

  // Parse match result
  const result = match.matchResult || {};
  const winner = result.winner; // 'PLAYER1' or 'PLAYER2'
  const sets = result.sets || [];

  // Get player names
  const player1Name = match.player1?.name || 'TBD';
  const player2Name = match.player2?.name || 'TBD';

  // Format score display
  const formatScore = () => {
    if (status === 'SCHEDULED' || status === 'CANCELLED') {
      return <span className="text-muted">vs</span>;
    }

    if (!sets || sets.length === 0) {
      return <span className="text-muted">-</span>;
    }

    return (
      <div className="d-flex gap-2 align-items-center">
        {sets.map((set, index) => (
          <div key={index} className="d-flex flex-column align-items-center">
            <small className="text-muted">Set {index + 1}</small>
            <strong>
              {set.player1Score}
              {set.tiebreak && <sup className="text-muted">{set.tiebreak.player1Points}</sup>}
              -
              {set.player2Score}
              {set.tiebreak && <sup className="text-muted">{set.tiebreak.player2Points}</sup>}
            </strong>
          </div>
        ))}
      </div>
    );
  };

  // Compact view for brackets
  if (compact) {
    return (
      <div className="small">
        <div className={`fw-bold ${winner === 'PLAYER1' ? 'text-success' : ''}`}>
          {player1Name}
        </div>
        <div className="text-muted">vs</div>
        <div className={`fw-bold ${winner === 'PLAYER2' ? 'text-success' : ''}`}>
          {player2Name}
        </div>
        {sets.length > 0 && (
          <div className="text-muted small mt-1">
            {sets.map((set, i) => `${set.player1Score}-${set.player2Score}`).join(', ')}
          </div>
        )}
      </div>
    );
  }

  // Full view for match cards
  return (
    <div className="p-3 border rounded bg-light">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <Badge bg={statusInfo.variant} className="px-2 py-1">
          {statusInfo.label}
        </Badge>
        {match.scheduledTime && (
          <small className="text-muted">
            {new Date(match.scheduledTime).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </small>
        )}
      </div>

      <div className="d-flex justify-content-between align-items-center">
        <div className="flex-grow-1">
          <div className={`mb-1 ${winner === 'PLAYER1' ? 'fw-bold text-success' : ''}`}>
            {player1Name}
            {winner === 'PLAYER1' && <span className="ms-2">🏆</span>}
          </div>
          <div className={winner === 'PLAYER2' ? 'fw-bold text-success' : ''}>
            {player2Name}
            {winner === 'PLAYER2' && <span className="ms-2">🏆</span>}
          </div>
        </div>

        <div className="ms-3">
          {formatScore()}
        </div>
      </div>

      {match.court && (
        <div className="mt-2 text-muted small">
          Court: {match.court}
        </div>
      )}
    </div>
  );
};

export default MatchResultDisplay;
