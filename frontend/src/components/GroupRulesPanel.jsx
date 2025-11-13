// T086: Panel for setting group-level rule overrides
import { useState } from 'react';
import { Card, Button, Alert, Spinner } from 'react-bootstrap';
import RuleOverrideForm from './RuleOverrideForm';
import { setGroupRuleOverrides, removeRuleOverrides } from '../services/tournamentRulesService';

/**
 * GroupRulesPanel - UI for setting rule overrides at the group level
 *
 * @param {string} groupId - Group ID
 * @param {string} groupName - Group display name
 * @param {Object} currentOverrides - Current rule overrides for this group
 * @param {Function} onUpdate - Callback when rules are updated
 */
function GroupRulesPanel({ groupId, groupName, currentOverrides = {}, onUpdate }) {
  const [ruleOverrides, setRuleOverrides] = useState(currentOverrides);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const response = await setGroupRuleOverrides(groupId, ruleOverrides);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      if (onUpdate) {
        onUpdate(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update group rules');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Remove all rule overrides for this group? It will inherit tournament default rules.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await removeRuleOverrides('group', groupId);

      setRuleOverrides({});
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      if (onUpdate) {
        onUpdate(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to remove group rule overrides');
    } finally {
      setLoading(false);
    }
  };

  const hasOverrides = Object.keys(ruleOverrides).length > 0;

  return (
    <Card className="mb-3">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Group Rules: {groupName}</h5>
        {hasOverrides && (
          <Button
            variant="outline-danger"
            size="sm"
            onClick={handleRemove}
            disabled={loading}
          >
            Remove Overrides
          </Button>
        )}
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">Group rules updated successfully!</Alert>}

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
                Saving...
              </>
            ) : (
              'Save Group Rules'
            )}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}

export default GroupRulesPanel;
