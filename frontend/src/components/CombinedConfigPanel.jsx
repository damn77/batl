// T066: Combined format configuration panel
import { useState, useEffect } from 'react';
import { Form, Alert, Row, Col } from 'react-bootstrap';
import { validateGroups } from '../services/tournamentRulesService';

/**
 * CombinedConfigPanel - Configuration for combined group-stage + knockout tournaments
 *
 * @param {Object} value - Current configuration { groupSize, advancePerGroup, mainBracketSize, secondaryBracketSize }
 * @param {Function} onChange - Callback when configuration changes
 * @param {boolean} disabled - Whether the form is disabled (e.g. tournament IN_PROGRESS)
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

        // Calculate total groups from group validation
        const totalGroups = groupValidation.data.groups;

        // Validate mainBracketSize if provided
        const mainSize = parseInt(value.mainBracketSize) || 0;
        const secondarySize = parseInt(value.secondaryBracketSize) || 0;

        if (mainSize > 0) {
          if (mainSize < 4 || mainSize > 128) {
            setValidation({
              valid: false,
              message: `Main bracket size must be between 4 and 128 players.`
            });
            return;
          }

          if (secondarySize > 0 && (secondarySize < 4 || secondarySize > 128)) {
            setValidation({
              valid: false,
              message: `Secondary bracket size must be between 4 and 128 players.`
            });
            return;
          }

          const totalAdvancing = mainSize + secondarySize;
          if (totalAdvancing > playerCount) {
            setValidation({
              valid: false,
              message: `Cannot advance ${totalAdvancing} players — only ${playerCount} players registered.`
            });
            return;
          }

          const eliminated = playerCount - mainSize - secondarySize;

          if (secondarySize > 0) {
            setValidation({
              valid: true,
              message: `${playerCount} players → ${totalGroups} groups → ${mainSize} to main, ${secondarySize} to secondary, ${eliminated} eliminated`
            });
          } else {
            setValidation({
              valid: true,
              message: `${playerCount} players → ${totalGroups} groups → ${mainSize} advance to knockout, ${eliminated} eliminated`
            });
          }
        } else {
          // mainBracketSize not yet entered — just show group info
          setValidation({
            valid: false,
            message: `${playerCount} players → ${totalGroups} groups of ${value.groupSize}. Enter advancement counts above.`
          });
        }
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
  }, [value.groupSize, value.advancePerGroup, value.mainBracketSize, value.secondaryBracketSize, playerCount]);

  const handleChange = (field, fieldValue) => {
    if (field === 'mainBracketSize' || field === 'secondaryBracketSize') {
      onChange({ ...value, [field]: parseInt(fieldValue) || '' });
    } else {
      onChange({ ...value, [field]: parseInt(fieldValue) || '' });
    }
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

      <Row className="mt-3">
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Players advancing to main bracket (Top N)</Form.Label>
            <Form.Control
              type="number"
              min={4}
              max={128}
              value={value.mainBracketSize || ''}
              onChange={(e) => handleChange('mainBracketSize', e.target.value)}
              disabled={disabled}
              placeholder="e.g. 8"
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Players advancing to secondary bracket (Next M)</Form.Label>
            <Form.Control
              type="number"
              min={0}
              max={128}
              value={value.secondaryBracketSize || ''}
              onChange={(e) => handleChange('secondaryBracketSize', e.target.value)}
              disabled={disabled}
              placeholder="Optional"
            />
            <Form.Text className="text-muted">
              Optional. Leave blank to skip secondary bracket.
            </Form.Text>
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
