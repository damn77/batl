// T101: Rule Change Warning Modal - Warns organizers about rule changes during active tournaments
import { Modal, Button, Alert, Table } from 'react-bootstrap';
import PropTypes from 'prop-types';

/**
 * T101: Modal component to warn organizers about rule changes during active tournaments
 * Shows impact of the change (how many matches will be affected)
 * @param {boolean} show - Control modal visibility
 * @param {function} onConfirm - Callback when user confirms the change
 * @param {function} onCancel - Callback when user cancels
 * @param {Object} changeImpact - Impact statistics {completedMatches, inProgressMatches, scheduledMatches, affectedMatches}
 * @param {string} changeType - Type of change: 'format', 'default-rules', 'override'
 */
function RuleChangeWarningModal({ show, onConfirm, onCancel, changeImpact, changeType }) {
  if (!changeImpact) {
    return null;
  }

  const {
    completedMatches = 0,
    inProgressMatches = 0,
    scheduledMatches = 0,
    affectedMatches = 0,
    totalMatches = 0
  } = changeImpact;

  const hasActiveMatches = completedMatches > 0 || inProgressMatches > 0;

  const getChangeTypeLabel = () => {
    switch (changeType) {
      case 'format':
        return 'tournament format';
      case 'default-rules':
        return 'default scoring rules';
      case 'override':
        return 'rule overrides';
      default:
        return 'rules';
    }
  };

  const getWarningMessage = () => {
    if (changeType === 'format') {
      return (
        <Alert variant="danger">
          <Alert.Heading>Format Change Not Allowed</Alert.Heading>
          <p>
            Tournament format cannot be changed after matches have started or been completed.
            This tournament has {completedMatches} completed match(es) and {inProgressMatches} in-progress match(es).
          </p>
        </Alert>
      );
    }

    if (!hasActiveMatches) {
      return (
        <Alert variant="info">
          <Alert.Heading>Rule Change</Alert.Heading>
          <p>
            You are about to change the {getChangeTypeLabel()} for this tournament.
            Since no matches have been played yet, this change will affect all matches.
          </p>
        </Alert>
      );
    }

    return (
      <Alert variant="warning">
        <Alert.Heading>Active Tournament Rule Change</Alert.Heading>
        <p>
          This tournament has already started. Changing {getChangeTypeLabel()} will:
        </p>
        <ul>
          <li>
            <strong>NOT affect</strong> completed matches ({completedMatches} match{completedMatches !== 1 ? 'es' : ''})
            - they retain their original rules
          </li>
          <li>
            <strong>NOT affect</strong> in-progress matches ({inProgressMatches} match{inProgressMatches !== 1 ? 'es' : ''})
            - they keep their current rules
          </li>
          <li>
            <strong>Apply to</strong> future matches ({affectedMatches || scheduledMatches} match{(affectedMatches || scheduledMatches) !== 1 ? 'es' : ''})
            - they will use the new rules
          </li>
        </ul>
      </Alert>
    );
  };

  return (
    <Modal show={show} onHide={onCancel} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Confirm Rule Change</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {getWarningMessage()}

        <h6 className="mt-3 mb-2">Match Status Summary:</h6>
        <Table size="sm" bordered>
          <thead>
            <tr>
              <th>Status</th>
              <th className="text-end">Count</th>
              <th>Impact</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Completed</td>
              <td className="text-end">{completedMatches}</td>
              <td><span className="text-muted">Rules preserved</span></td>
            </tr>
            <tr>
              <td>In Progress</td>
              <td className="text-end">{inProgressMatches}</td>
              <td><span className="text-muted">No change</span></td>
            </tr>
            <tr>
              <td>Scheduled</td>
              <td className="text-end">{scheduledMatches}</td>
              <td><strong className="text-primary">Will use new rules</strong></td>
            </tr>
            <tr className="table-secondary">
              <td><strong>Total</strong></td>
              <td className="text-end"><strong>{totalMatches}</strong></td>
              <td>
                {affectedMatches !== undefined ? (
                  <strong>{affectedMatches} match{affectedMatches !== 1 ? 'es' : ''} affected</strong>
                ) : (
                  <strong>{scheduledMatches} match{scheduledMatches !== 1 ? 'es' : ''} affected</strong>
                )}
              </td>
            </tr>
          </tbody>
        </Table>

        {changeType === 'format' && hasActiveMatches && (
          <Alert variant="danger" className="mt-3">
            <strong>Cannot proceed:</strong> Format changes are not allowed after matches have started.
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        {changeType !== 'format' || !hasActiveMatches ? (
          <Button variant="warning" onClick={onConfirm}>
            Confirm Change
          </Button>
        ) : (
          <Button variant="danger" disabled>
            Change Not Allowed
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}

RuleChangeWarningModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  changeImpact: PropTypes.shape({
    completedMatches: PropTypes.number,
    inProgressMatches: PropTypes.number,
    scheduledMatches: PropTypes.number,
    affectedMatches: PropTypes.number,
    totalMatches: PropTypes.number
  }),
  changeType: PropTypes.oneOf(['format', 'default-rules', 'override']).isRequired
};

export default RuleChangeWarningModal;
