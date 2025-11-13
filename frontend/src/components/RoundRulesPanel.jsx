// T088: Panel for setting round-level rule overrides
import { useState } from 'react';
import { Card, Button, Alert, Spinner, Form } from 'react-bootstrap';
import RuleOverrideForm from './RuleOverrideForm';
import { setRoundRuleOverrides, removeRuleOverrides } from '../services/tournamentRulesService';
import apiClient from '../services/apiClient';

/**
 * RoundRulesPanel - UI for setting rule overrides at the round level
 *
 * @param {string} roundId - Round ID
 * @param {string} roundName - Round display name (e.g., "Quarter Finals", "Semi Finals")
 * @param {Object} currentOverrides - Current rule overrides for this round
 * @param {string} bracketType - Type of bracket: MAIN, CONSOLATION, PLACEMENT (optional)
 * @param {Function} onUpdate - Callback when rules are updated
 */
function RoundRulesPanel({ roundId, roundName, currentOverrides = {}, bracketType, onUpdate }) {
  const [ruleOverrides, setRuleOverrides] = useState(currentOverrides);
  const [earlyTiebreak, setEarlyTiebreak] = useState(currentOverrides.earlyTiebreakEnabled || false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const response = await setRoundRuleOverrides(roundId, ruleOverrides);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      if (onUpdate) {
        onUpdate(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update round rules');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Remove all rule overrides for this round? It will inherit parent rules.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await removeRuleOverrides('round', roundId);

      setRuleOverrides({});
      setEarlyTiebreak(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      if (onUpdate) {
        onUpdate(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to remove round rule overrides');
    } finally {
      setLoading(false);
    }
  };

  // T104: Handle early tiebreak toggle for "until placement" rounds
  const handleEarlyTiebreakToggle = async (enabled) => {
    setEarlyTiebreak(enabled);

    try {
      const response = await apiClient.patch(`/v1/rounds/${roundId}/early-tiebreak`, {
        earlyTiebreakEnabled: enabled
      });

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);

        if (onUpdate) {
          onUpdate(response.data);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update early tiebreak setting');
      // Revert on error
      setEarlyTiebreak(!enabled);
    }
  };

  const hasOverrides = Object.keys(ruleOverrides).length > 0;

  return (
    <Card className="mb-3">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Round Rules: {roundName}</h5>
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
        {success && <Alert variant="success">Round rules updated successfully!</Alert>}

        <RuleOverrideForm
          initialRules={currentOverrides}
          onChange={setRuleOverrides}
          showFormatType={false}
        />

        {/* T104: Early Tiebreak toggle for consolation/placement rounds */}
        {(bracketType === 'CONSOLATION' || bracketType === 'PLACEMENT') && (
          <div className="mt-3 p-3 bg-light rounded">
            <Form.Check
              type="switch"
              id={`early-tiebreak-${roundId}`}
              label="Enable Early Tiebreak"
              checked={earlyTiebreak}
              onChange={(e) => handleEarlyTiebreakToggle(e.target.checked)}
              disabled={loading}
            />
            <Form.Text className="text-muted d-block mt-2">
              <small>
                <strong>Early Tiebreak:</strong> When enabled, losing teams in this round are immediately
                placed rather than continuing to play for exact position. This speeds up tournament completion
                when precise rankings beyond a certain level are not needed.
              </small>
            </Form.Text>
          </div>
        )}

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
              'Save Round Rules'
            )}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}

export default RoundRulesPanel;
