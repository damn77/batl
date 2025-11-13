// T087: Panel for setting bracket-level rule overrides
import { useState } from 'react';
import { Card, Button, Alert, Spinner } from 'react-bootstrap';
import RuleOverrideForm from './RuleOverrideForm';
import { setBracketRuleOverrides, removeRuleOverrides } from '../services/tournamentRulesService';

/**
 * BracketRulesPanel - UI for setting rule overrides at the bracket level
 *
 * @param {string} bracketId - Bracket ID
 * @param {string} bracketName - Bracket display name
 * @param {Object} currentOverrides - Current rule overrides for this bracket
 * @param {Function} onUpdate - Callback when rules are updated
 */
function BracketRulesPanel({ bracketId, bracketName, currentOverrides = {}, onUpdate }) {
  const [ruleOverrides, setRuleOverrides] = useState(currentOverrides);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const response = await setBracketRuleOverrides(bracketId, ruleOverrides);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      if (onUpdate) {
        onUpdate(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update bracket rules');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Remove all rule overrides for this bracket? It will inherit parent rules.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await removeRuleOverrides('bracket', bracketId);

      setRuleOverrides({});
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      if (onUpdate) {
        onUpdate(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to remove bracket rule overrides');
    } finally {
      setLoading(false);
    }
  };

  const hasOverrides = Object.keys(ruleOverrides).length > 0;

  return (
    <Card className="mb-3">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Bracket Rules: {bracketName}</h5>
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
        {success && <Alert variant="success">Bracket rules updated successfully!</Alert>}

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
              'Save Bracket Rules'
            )}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}

export default BracketRulesPanel;
