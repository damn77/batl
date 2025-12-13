// T050: RuleCascadeViewer - Display cascading rule overrides for matches
import { Card, Table, Badge, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

/**
 * Displays the cascade of scoring rules from tournament defaults to match-specific overrides
 * Shows which rules come from which level (tournament, group, bracket, round, match)
 *
 * @param {Object} props
 * @param {Object} props.effectiveRules - Effective rules result from getEffectiveRulesForMatch
 * @param {string} props.effectiveRules.source - "CASCADED" or "SNAPSHOT"
 * @param {Object} props.effectiveRules.rules - The final effective rules
 * @param {Array} props.effectiveRules.cascade - Array of cascade levels with overrides
 * @param {Date} props.effectiveRules.snapshotDate - Date when snapshot was taken (if SNAPSHOT)
 */
const RuleCascadeViewer = ({ effectiveRules }) => {
  const { t } = useTranslation();

  if (!effectiveRules) {
    return <Alert variant="info">{t('alerts.noRuleInfo')}</Alert>;
  }

  const { source, rules, cascade, snapshotDate } = effectiveRules;

  // Helper to format rule values for display
  const formatRuleValue = (key, value) => {
    if (typeof value === 'boolean') return value ? t('common.yes') : t('common.no');
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'string') return value.replace(/_/g, ' ');
    return JSON.stringify(value);
  };

  // Helper to get user-friendly rule name
  const getRuleName = (key) => {
    return t(`ruleCascade.ruleNames.${key}`, { defaultValue: key });
  };

  // Helper to get level badge variant
  const getLevelBadgeVariant = (level) => {
    const variants = {
      tournament: 'primary',
      group: 'success',
      bracket: 'info',
      round: 'warning',
      match: 'danger'
    };
    return variants[level] || 'secondary';
  };

  // Helper to get level display name
  const getLevelDisplayName = (cascadeItem) => {
    const { level, groupNumber, bracketType, roundNumber, matchNumber } = cascadeItem;

    if (level === 'tournament') return t('ruleCascade.levels.tournament');
    if (level === 'group') return t('ruleCascade.levels.group', { number: groupNumber });
    if (level === 'bracket') return t('ruleCascade.levels.bracket', { type: bracketType });
    if (level === 'round') return t('ruleCascade.levels.round', { number: roundNumber });
    if (level === 'match') return t('ruleCascade.levels.match', { number: matchNumber });
    return level;
  };

  return (
    <Card>
      <Card.Header>
        <h5 className="mb-0">{t('ruleCascade.scoringRules')} {source === 'SNAPSHOT' && <Badge bg="secondary" className="ms-2">{t('ruleCascade.historicalSnapshot')}</Badge>}</h5>
        {source === 'SNAPSHOT' && snapshotDate && (
          <small className="text-muted">{t('ruleCascade.rulesLockedAt')} {new Date(snapshotDate).toLocaleString()}</small>
        )}
      </Card.Header>
      <Card.Body>
        {/* Effective Rules Summary */}
        <h6 className="mb-3">{t('ruleCascade.effectiveRules')}</h6>
        <Table bordered size="sm" className="mb-4">
          <tbody>
            {Object.entries(rules).map(([key, value]) => (
              <tr key={key}>
                <td><strong>{getRuleName(key)}</strong></td>
                <td>{formatRuleValue(key, value)}</td>
              </tr>
            ))}
          </tbody>
        </Table>

        {/* Cascade Information (only for cascaded rules) */}
        {source === 'CASCADED' && cascade && cascade.length > 0 && (
          <>
            <h6 className="mb-3">{t('ruleCascade.ruleCascadeTitle')}</h6>
            <p className="text-muted small">
              {t('ruleCascade.cascadeDescription')}
            </p>
            <div className="d-flex flex-column gap-2">
              {cascade.map((item, index) => (
                <Card key={index} bg="light" border={getLevelBadgeVariant(item.level)}>
                  <Card.Body className="py-2 px-3">
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <Badge bg={getLevelBadgeVariant(item.level)} className="me-2">
                          {t(`ruleCascade.levelLabels.${item.level}`)}
                        </Badge>
                        <strong>{getLevelDisplayName(item)}</strong>
                      </div>
                      {item.overrides && (
                        <small className="text-muted">
                          {t('ruleCascade.overrides')}: {Object.keys(item.overrides).map(getRuleName).join(', ')}
                        </small>
                      )}
                      {item.source === 'default' && (
                        <small className="text-muted">{t('ruleCascade.baseRules')}</small>
                      )}
                    </div>
                    {item.overrides && (
                      <div className="mt-2 ms-4">
                        {Object.entries(item.overrides).map(([key, value]) => (
                          <div key={key} className="small">
                            <code>{getRuleName(key)}: {formatRuleValue(key, value)}</code>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              ))}
            </div>
          </>
        )}

        {source === 'SNAPSHOT' && (
          <Alert variant="info" className="mt-3 mb-0">
            <small>
              <strong>{t('common.note')}:</strong> {t('ruleCascade.snapshotNote')}
            </small>
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
};

export default RuleCascadeViewer;
