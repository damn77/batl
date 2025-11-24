// T101: Rule Change Warning Modal - Warns organizers about rule changes during active tournaments
import { Modal, Button, Alert, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

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
        return t('modals.ruleChangeWarning.formatType');
      case 'default-rules':
        return t('modals.ruleChangeWarning.defaultRules');
      case 'override':
        return t('modals.ruleChangeWarning.override');
      default:
        return t('modals.ruleChangeWarning.rules');
    }
  };

  const getWarningMessage = () => {
    if (changeType === 'format') {
      return (
        <Alert variant="danger">
          <Alert.Heading>{t('modals.ruleChangeWarning.formatNotAllowed')}</Alert.Heading>
          <p>
            {t('modals.ruleChangeWarning.formatNotAllowedMsg', {
              completed: completedMatches,
              inProgress: inProgressMatches
            })}
          </p>
        </Alert>
      );
    }

    if (!hasActiveMatches) {
      return (
        <Alert variant="info">
          <Alert.Heading>{t('modals.ruleChangeWarning.ruleChange')}</Alert.Heading>
          <p>
            {t('modals.ruleChangeWarning.ruleChangeMsg', { changeType: getChangeTypeLabel() })}
          </p>
        </Alert>
      );
    }

    return (
      <Alert variant="warning">
        <Alert.Heading>{t('modals.ruleChangeWarning.activeTournamentChange')}</Alert.Heading>
        <p>
          {t('modals.ruleChangeWarning.activeTournamentMsg', { changeType: getChangeTypeLabel() })}
        </p>
        <ul>
          <li>
            <strong>NOT affect</strong> {t('modals.ruleChangeWarning.notAffectCompleted', {
              count: completedMatches,
              plural: completedMatches !== 1 ? 'es' : ''
            })}
          </li>
          <li>
            <strong>NOT affect</strong> {t('modals.ruleChangeWarning.notAffectInProgress', {
              count: inProgressMatches,
              plural: inProgressMatches !== 1 ? 'es' : ''
            })}
          </li>
          <li>
            <strong>Apply to</strong> {t('modals.ruleChangeWarning.applyToFuture', {
              count: affectedMatches || scheduledMatches,
              plural: (affectedMatches || scheduledMatches) !== 1 ? 'es' : ''
            })}
          </li>
        </ul>
      </Alert>
    );
  };

  return (
    <Modal show={show} onHide={onCancel} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{t('modals.ruleChangeWarning.title')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {getWarningMessage()}

        <h6 className="mt-3 mb-2">{t('modals.ruleChangeWarning.matchStatusSummary')}</h6>
        <Table size="sm" bordered>
          <thead>
            <tr>
              <th>{t('table.headers.status')}</th>
              <th className="text-end">{t('table.headers.count')}</th>
              <th>{t('table.headers.impact')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{t('modals.ruleChangeWarning.statusCompleted')}</td>
              <td className="text-end">{completedMatches}</td>
              <td><span className="text-muted">{t('modals.ruleChangeWarning.impactPreserved')}</span></td>
            </tr>
            <tr>
              <td>{t('modals.ruleChangeWarning.statusInProgress')}</td>
              <td className="text-end">{inProgressMatches}</td>
              <td><span className="text-muted">{t('modals.ruleChangeWarning.impactNoChange')}</span></td>
            </tr>
            <tr>
              <td>{t('modals.ruleChangeWarning.statusScheduled')}</td>
              <td className="text-end">{scheduledMatches}</td>
              <td><strong className="text-primary">{t('modals.ruleChangeWarning.impactNewRules')}</strong></td>
            </tr>
            <tr className="table-secondary">
              <td><strong>{t('common.total')}</strong></td>
              <td className="text-end"><strong>{totalMatches}</strong></td>
              <td>
                <strong>{t('modals.ruleChangeWarning.matchesAffected', {
                  count: affectedMatches !== undefined ? affectedMatches : scheduledMatches,
                  plural: (affectedMatches !== undefined ? affectedMatches : scheduledMatches) !== 1 ? 'es' : ''
                })}</strong>
              </td>
            </tr>
          </tbody>
        </Table>

        {changeType === 'format' && hasActiveMatches && (
          <Alert variant="danger" className="mt-3">
            <strong>{t('modals.ruleChangeWarning.cannotProceed')}</strong>
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        {changeType !== 'format' || !hasActiveMatches ? (
          <Button variant="warning" onClick={onConfirm}>
            {t('modals.ruleChangeWarning.confirmChange')}
          </Button>
        ) : (
          <Button variant="danger" disabled>
            {t('modals.ruleChangeWarning.changeNotAllowed')}
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
