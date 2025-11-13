// T066: Combined format configuration panel
import { useState, useEffect } from 'react';
import { Form, Alert, Row, Col } from 'react-bootstrap';
import { validateGroups } from '../services/tournamentRulesService';

/**
 * CombinedConfigPanel - Configuration for combined group-stage + knockout tournaments
 *
 * @param {Object} value - Current configuration { groupSize: number, advancePerGroup: number }
 * @param {Function} onChange - Callback when configuration changes
 * @param {boolean} disabled - Whether the form is disabled
 * @param {number} playerCount - Current number of registered players
 */
function CombinedConfigPanel({ value = { groupSize: 4, advancePerGroup: 2 }, onChange, disabled = false, playerCount = 0 }) {
  const [validation, setValidation] = useState(null);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    const validateCombinedFormat = async () => {
      if (!value.groupSize || !value.advancePerGroup || !playerCount || playerCount === 0) {
        setValidation(null);
        return;
      }

      try {
        setValidating(true);

        // First validate group division
        const groupValidation = await validateGroups(playerCount, value.groupSize);

        if (!groupValidation.success || !groupValidation.data.valid) {
          setValidation({
            valid: false,
            message: groupValidation.data?.message || 'Invalid group configuration'
          });
          return;
        }

        // Calculate knockout stage players
        const totalGroups = groupValidation.data.groups;
        const knockoutPlayers = totalGroups * value.advancePerGroup;

        // Check if it's a power of 2 (required for single-elimination)
        const isPowerOfTwo = (n) => n > 0 && (n & (n - 1)) === 0;

        if (!isPowerOfTwo(knockoutPlayers)) {
          setValidation({
            valid: false,
            message: `Advancement rules result in ${knockoutPlayers} players for knockout stage, which is not a power of 2. Adjust group size or advance count.`
          });
          return;
        }

        setValidation({
          valid: true,
          message: `${playerCount} players → ${totalGroups} groups of ${value.groupSize} → ${knockoutPlayers} players advance to knockout`,
          knockoutPlayers
        });
      } catch (err) {
        console.error('Combined format validation error:', err);
        setValidation({
          valid: false,
          message: 'Failed to validate combined format configuration'
        });
      } finally {
        setValidating(false);
      }
    };

    // Debounce validation
    const timer = setTimeout(validateCombinedFormat, 500);
    return () => clearTimeout(timer);
  }, [value.groupSize, value.advancePerGroup, playerCount]);

  const handleChange = (field, fieldValue) => {
    onChange({ ...value, [field]: parseInt(fieldValue) || '' });
  };

  return (
    <div>
      <Row>
        <Col md={6}>
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
          </Form.Group>
        </Col>

        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Players Advancing per Group</Form.Label>
            <Form.Select
              value={value.advancePerGroup || ''}
              onChange={(e) => handleChange('advancePerGroup', e.target.value)}
              disabled={disabled || !value.groupSize}
            >
              <option value="">Select...</option>
              {value.groupSize >= 3 && <option value="1">Top 1 player</option>}
              {value.groupSize >= 4 && <option value="2">Top 2 players</option>}
              {value.groupSize >= 5 && <option value="3">Top 3 players</option>}
              {value.groupSize >= 6 && <option value="4">Top 4 players</option>}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      <Alert variant="info" className="mb-3">
        <small>
          <strong>Combined Format:</strong> Tournament starts with a group stage where players are divided into groups.
          Top players from each group advance to a single-elimination knockout stage.
        </small>
      </Alert>

      {validating && (
        <Alert variant="info">
          <small>Validating combined format configuration...</small>
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
            <strong>Note:</strong> Configuration validation will be performed when players register for the tournament.
          </small>
        </Alert>
      )}
    </div>
  );
}

export default CombinedConfigPanel;
