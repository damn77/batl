// T089: Panel for setting match-level rule overrides
import { useState } from 'react';
import { Card, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import RuleOverrideForm from './RuleOverrideForm';
import { setMatchRuleOverrides, removeRuleOverrides } from '../services/tournamentRulesService';

/**
 * MatchRulesPanel - UI for setting rule overrides at the match level
 *
 * @param {string} matchId - Match ID
 * @param {string} matchName - Match display name (e.g., "Player A vs Player B")
 * @param {string} matchStatus - Match status (PENDING, IN_PROGRESS, COMPLETED)
 * @param {Object} currentOverrides - Current rule overrides for this match
 * @param {Function} onUpdate - Callback when rules are updated
 */
function MatchRulesPanel({ matchId, matchName, matchStatus = 'PENDING', currentOverrides = {}, onUpdate }) {
  const { t } = useTranslation();
  const [ruleOverrides, setRuleOverrides] = useState(currentOverrides);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const isCompleted = matchStatus === 'COMPLETED';

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const response = await setMatchRuleOverrides(matchId, ruleOverrides);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      if (onUpdate) {
        onUpdate(response.data);
      }
    } catch (err) {
      if (err.response?.data?.error?.code === 'MATCH_ALREADY_COMPLETED') {
        setError(t('matchRules.errors.alreadyCompleted'));
      } else {
        setError(err.response?.data?.error?.message || t('matchRules.errors.updateFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm(t('matchRules.confirmRemove'))) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await removeRuleOverrides('match', matchId);

      setRuleOverrides({});
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      if (onUpdate) {
        onUpdate(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || t('matchRules.errors.removeFailed'));
    } finally {
      setLoading(false);
    }
  };

  const hasOverrides = Object.keys(ruleOverrides).length > 0;

  return (
    <Card className="mb-3">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0">{t('matchRules.title', { matchName })}</h5>
          <Badge bg={isCompleted ? 'secondary' : 'info'} className="mt-1">
            {matchStatus}
          </Badge>
        </div>
        {hasOverrides && !isCompleted && (
          <Button
            variant="outline-danger"
            size="sm"
            onClick={handleRemove}
            disabled={loading}
          >
            {t('matchRules.removeOverrides')}
          </Button>
        )}
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{t('matchRules.updateSuccess')}</Alert>}

        {isCompleted ? (
          <Alert variant="warning">
            <strong>{t('matchRules.completedTitle')}</strong> {t('matchRules.completedMessage')}
          </Alert>
        ) : (
          <>
            <RuleOverrideForm
              initialRules={currentOverrides}
              onChange={setRuleOverrides}
              showFormatType={false}
            />

            <div className="d-flex justify-content-end mt-3">
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={loading || !hasOverrides}
              >
                {loading ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" className="me-2" />
                    {t('matchRules.saving')}
                  </>
                ) : (
                  t('matchRules.save')
                )}
              </Button>
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  );
}

export default MatchRulesPanel;
