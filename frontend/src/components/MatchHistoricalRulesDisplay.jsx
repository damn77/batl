// T105: Display historical rules for completed matches
import { Alert, Badge } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

/**
 * T105: Component to display the rules that were in effect when a match was completed
 * This preserves the exact rules used for historical accuracy
 *
 * @param {Object} completedWithRules - The rule snapshot from when the match was completed
 * @param {string} matchStatus - Current status of the match
 */
function MatchHistoricalRulesDisplay({ completedWithRules, matchStatus }) {
  const { t } = useTranslation();

  // Only show for completed matches with rule snapshot
  if (matchStatus !== 'COMPLETED' || !completedWithRules) {
    return null;
  }

  const formatRuleValue = (key, value) => {
    if (typeof value === 'boolean') {
      return value ? t('historicalRules.values.yes') : t('historicalRules.values.no');
    }
    if (key === 'formatType') {
      return value.replace(/_/g, ' ');
    }
    if (key === 'advantageRule') {
      return value === 'ADVANTAGE' ? t('historicalRules.values.advantage') :
        value === 'NO_ADVANTAGE' ? t('historicalRules.values.noAdvantage') : value;
    }
    return value;
  };

  const getRuleLabel = (key) => {
    return t(`historicalRules.labels.${key}`, { defaultValue: key });
  };

  return (
    <div className="mt-3">
      <div className="d-flex align-items-center mb-2">
        <h6 className="mb-0 me-2">{t('historicalRules.title')}</h6>
        <Badge bg="secondary">{t('historicalRules.snapshot')}</Badge>
      </div>
      <Alert variant="info" className="mb-0">
        <small className="text-muted d-block mb-2">
          {t('historicalRules.description')}
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
