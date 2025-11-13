// T105: Display historical rules for completed matches
import { Alert, Badge } from 'react-bootstrap';
import PropTypes from 'prop-types';

/**
 * T105: Component to display the rules that were in effect when a match was completed
 * This preserves the exact rules used for historical accuracy
 *
 * @param {Object} completedWithRules - The rule snapshot from when the match was completed
 * @param {string} matchStatus - Current status of the match
 */
function MatchHistoricalRulesDisplay({ completedWithRules, matchStatus }) {
  // Only show for completed matches with rule snapshot
  if (matchStatus !== 'COMPLETED' || !completedWithRules) {
    return null;
  }

  const formatRuleValue = (key, value) => {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (key === 'formatType') {
      return value.replace(/_/g, ' ');
    }
    if (key === 'advantageRule') {
      return value === 'ADVANTAGE' ? 'Advantage' : value === 'NO_ADVANTAGE' ? 'No Advantage' : value;
    }
    return value;
  };

  const getRuleLabel = (key) => {
    const labels = {
      formatType: 'Scoring Format',
      winningSets: 'Winning Sets',
      winningGames: 'Winning Games',
      advantageRule: 'Advantage',
      tiebreakTrigger: 'Tiebreak Trigger',
      matchTiebreakPoints: 'Match Tiebreak Points',
      bigTiebreakWinBy: 'Big Tiebreak Win By'
    };
    return labels[key] || key;
  };

  return (
    <div className="mt-3">
      <div className="d-flex align-items-center mb-2">
        <h6 className="mb-0 me-2">Match Rules Used</h6>
        <Badge bg="secondary">Historical Snapshot</Badge>
      </div>
      <Alert variant="info" className="mb-0">
        <small className="text-muted d-block mb-2">
          These are the exact rules that were in effect when this match was played.
          Even if tournament rules were changed later, this match's official record
          uses these rules.
        </small>
        <div className="row">
          {Object.entries(completedWithRules)
            .filter(([key]) => !key.startsWith('_')) // Filter out internal fields
            .map(([key, value]) => (
              <div key={key} className="col-md-6 mb-2">
                <strong>{getRuleLabel(key)}:</strong>{' '}
                <span className="text-dark">{formatRuleValue(key, value)}</span>
              </div>
            ))}
        </div>
      </Alert>
    </div>
  );
}

MatchHistoricalRulesDisplay.propTypes = {
  completedWithRules: PropTypes.object,
  matchStatus: PropTypes.string.isRequired
};

export default MatchHistoricalRulesDisplay;
