// T064: Group format configuration panel
import { useState, useEffect } from 'react';
import { Form, Alert } from 'react-bootstrap';
import { validateGroups } from '../services/tournamentRulesService';

/**
 * GroupConfigPanel - Configuration options for group/round-robin tournaments
 *
 * @param {Object} value - Current configuration { groupSize: number }
 * @param {Function} onChange - Callback when configuration changes
 * @param {boolean} disabled - Whether the form is disabled
 * @param {number} playerCount - Current number of registered players (for validation)
 */
function GroupConfigPanel({ value = { groupSize: 4 }, onChange, disabled = false, playerCount = 0 }) {
  const [validation, setValidation] = useState(null);
  const [validating, setValidating] = useState(false);

  // T070: Client-side group size validation
  useEffect(() => {
    const validateGroupSize = async () => {
      if (!value.groupSize || !playerCount || playerCount === 0) {
        setValidation(null);
        return;
      }

      try {
        setValidating(true);
        const response = await validateGroups(playerCount, value.groupSize);

        if (response.success) {
          setValidation(response.data);
        }
      } catch (err) {
        console.error('Group validation error:', err);
        setValidation({
          valid: false,
          message: 'Failed to validate group configuration'
        });
      } finally {
        setValidating(false);
      }
    };

    // Debounce validation
    const timer = setTimeout(validateGroupSize, 500);
    return () => clearTimeout(timer);
  }, [value.groupSize, playerCount]);

  const handleChange = (field, fieldValue) => {
    onChange({ ...value, [field]: parseInt(fieldValue) || '' });
  };

  return (
    <div>
      <Form.Group className="mb-3">
        <Form.Label>Group Size</Form.Label>
        <Form.Select
          value={value.groupSize || ''}
          onChange={(e) => handleChange('groupSize', e.target.value)}
          disabled={disabled}
        >
          <option value="">Select group size...</option>
          <option value="3">3 players per group</option>
          <option value="4">4 players per group</option>
          <option value="5">5 players per group</option>
          <option value="6">6 players per group</option>
          <option value="8">8 players per group</option>
        </Form.Select>
        <Form.Text className="text-muted">
          Each group will play a round-robin format where every player faces every other player in their group.
        </Form.Text>
      </Form.Group>

      {/* T070: Display validation results */}
      {validating && (
        <Alert variant="info">
          <small>Validating group configuration...</small>
        </Alert>
      )}

      {validation && !validating && (
        <Alert variant={validation.valid ? 'success' : 'warning'}>
          <small>
            <strong>{validation.valid ? '✓' : '⚠'}</strong> {validation.message}
          </small>
        </Alert>
      )}

      {playerCount === 0 && (
        <Alert variant="info">
          <small>
            <strong>Note:</strong> Group validation will be performed when players register for the tournament.
          </small>
        </Alert>
      )}
    </div>
  );
}

export default GroupConfigPanel;
