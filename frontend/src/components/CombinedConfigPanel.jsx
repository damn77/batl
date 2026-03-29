// T066: Combined format configuration panel
import { useState, useEffect, useMemo } from 'react';
import { Form, Alert, Row, Col, ButtonGroup, ToggleButton } from 'react-bootstrap';
import { validateGroups } from '../services/tournamentRulesService';

/**
 * CombinedConfigPanel - Configuration for combined group-stage + knockout tournaments
 *
 * Two advancement modes:
 * - "perGroup": Organizer sets how many players advance per group (main + optional secondary)
 * - "perBracket": Organizer sets total players per bracket directly
 *
 * Both modes produce mainBracketSize/secondaryBracketSize in formatConfig for the backend waterfall algorithm.
 *
 * @param {Object} value - Current configuration
 * @param {Function} onChange - Callback when configuration changes
 * @param {boolean} disabled - Whether the form is disabled (e.g. tournament IN_PROGRESS)
 * @param {number} playerCount - Current number of registered players
 */
function CombinedConfigPanel({ value = { groupSize: 4, advancementMode: 'perGroup', advancePerGroup: 2 }, onChange, disabled = false, playerCount = 0 }) {
  const [validation, setValidation] = useState(null);
  const [validating, setValidating] = useState(false);
  const [numGroups, setNumGroups] = useState(0);

  const mode = value.advancementMode || 'perGroup';

  // Compute group count whenever groupSize or playerCount changes
  useEffect(() => {
    const fetchGroups = async () => {
      if (!value.groupSize || !playerCount || playerCount === 0) {
        setNumGroups(0);
        return;
      }
      try {
        const groupValidation = await validateGroups(playerCount, value.groupSize);
        if (groupValidation.success && groupValidation.data.valid) {
          setNumGroups(groupValidation.data.groups);
        } else {
          setNumGroups(0);
        }
      } catch {
        setNumGroups(0);
      }
    };
    fetchGroups();
  }, [value.groupSize, playerCount]);

  // In perGroup mode, derive mainBracketSize/secondaryBracketSize from per-group values
  useEffect(() => {
    if (mode !== 'perGroup' || !numGroups || !value.advancePerGroup) return;

    const derivedMain = value.advancePerGroup * numGroups;
    const derivedSecondary = (value.advancePerGroupSecondary || 0) * numGroups;

    const needsUpdate =
      value.mainBracketSize !== derivedMain ||
      value.secondaryBracketSize !== (derivedSecondary || '');

    if (needsUpdate) {
      onChange({
        ...value,
        mainBracketSize: derivedMain,
        secondaryBracketSize: derivedSecondary || ''
      });
    }
  }, [mode, numGroups, value.advancePerGroup, value.advancePerGroupSecondary]);

  // Validation effect
  useEffect(() => {
    const validateConfig = async () => {
      if (!value.groupSize || !playerCount || playerCount === 0) {
        setValidation(null);
        return;
      }

      try {
        setValidating(true);

        const groupValidation = await validateGroups(playerCount, value.groupSize);
        if (!groupValidation.success || !groupValidation.data.valid) {
          setValidation({
            valid: false,
            message: groupValidation.data?.message || 'Invalid group configuration'
          });
          return;
        }

        const totalGroups = groupValidation.data.groups;

        if (mode === 'perGroup') {
          if (!value.advancePerGroup) {
            setValidation(null);
            return;
          }

          const mainAdvancing = value.advancePerGroup * totalGroups;
          const secondaryAdvancing = (value.advancePerGroupSecondary || 0) * totalGroups;
          const totalAdvancing = mainAdvancing + secondaryAdvancing;

          if (totalAdvancing > playerCount) {
            setValidation({
              valid: false,
              message: `Cannot advance ${totalAdvancing} players — only ${playerCount} registered.`
            });
            return;
          }

          const eliminated = playerCount - totalAdvancing;

          if (mainAdvancing < 4) {
            setValidation({
              valid: false,
              message: `Main bracket needs at least 4 players. Currently: ${value.advancePerGroup} per group × ${totalGroups} groups = ${mainAdvancing}.`
            });
            return;
          }

          if (secondaryAdvancing > 0) {
            if (secondaryAdvancing < 4) {
              setValidation({
                valid: false,
                message: `Secondary bracket needs at least 4 players. Currently: ${value.advancePerGroupSecondary} per group × ${totalGroups} groups = ${secondaryAdvancing}.`
              });
              return;
            }
            setValidation({
              valid: true,
              message: `${playerCount} players → ${totalGroups} groups → ${mainAdvancing} to main, ${secondaryAdvancing} to secondary, ${eliminated} eliminated`
            });
          } else {
            setValidation({
              valid: true,
              message: `${playerCount} players → ${totalGroups} groups → ${mainAdvancing} advance to knockout, ${eliminated} eliminated`
            });
          }
        } else {
          // perBracket mode
          const mainSize = parseInt(value.mainBracketSize) || 0;
          const secondarySize = parseInt(value.secondaryBracketSize) || 0;

          if (!mainSize) {
            setValidation({
              valid: false,
              message: `${playerCount} players → ${totalGroups} groups of ${value.groupSize}. Enter advancement counts below.`
            });
            return;
          }

          if (mainSize < 4 || mainSize > 128) {
            setValidation({ valid: false, message: 'Main bracket size must be between 4 and 128 players.' });
            return;
          }

          if (secondarySize > 0 && (secondarySize < 4 || secondarySize > 128)) {
            setValidation({ valid: false, message: 'Secondary bracket size must be between 4 and 128 players.' });
            return;
          }

          const totalAdvancing = mainSize + secondarySize;
          if (totalAdvancing > playerCount) {
            setValidation({
              valid: false,
              message: `Cannot advance ${totalAdvancing} players — only ${playerCount} registered.`
            });
            return;
          }

          const eliminated = playerCount - totalAdvancing;

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
        }
      } catch (err) {
        console.error('Combined format validation error:', err);
        setValidation({ valid: false, message: 'Failed to validate combined format configuration' });
      } finally {
        setValidating(false);
      }
    };

    const timer = setTimeout(validateConfig, 500);
    return () => clearTimeout(timer);
  }, [value.groupSize, value.advancePerGroup, value.advancePerGroupSecondary, value.mainBracketSize, value.secondaryBracketSize, value.advancementMode, playerCount]);

  const handleChange = (field, fieldValue) => {
    onChange({ ...value, [field]: parseInt(fieldValue) || '' });
  };

  const handleModeChange = (newMode) => {
    // Clear mode-specific fields when switching
    const updated = { ...value, advancementMode: newMode };
    if (newMode === 'perGroup') {
      delete updated.mainBracketSize;
      delete updated.secondaryBracketSize;
    } else {
      delete updated.advancePerGroup;
      delete updated.advancePerGroupSecondary;
    }
    onChange(updated);
  };

  // Max advancePerGroup options: for secondary, can't exceed groupSize minus main advance count
  const maxSecondaryPerGroup = value.groupSize
    ? value.groupSize - (value.advancePerGroup || 0)
    : 0;

  return (
    <div>
      {/* Group Size — always shown */}
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
      </Row>

      {/* Advancement Mode Toggle */}
      <Form.Group className="mb-3">
        <Form.Label>Advancement Mode</Form.Label>
        <div>
          <ButtonGroup>
            <ToggleButton
              id="mode-perGroup"
              type="radio"
              variant={mode === 'perGroup' ? 'primary' : 'outline-primary'}
              value="perGroup"
              checked={mode === 'perGroup'}
              onChange={() => handleModeChange('perGroup')}
              disabled={disabled}
              size="sm"
            >
              Per Group
            </ToggleButton>
            <ToggleButton
              id="mode-perBracket"
              type="radio"
              variant={mode === 'perBracket' ? 'primary' : 'outline-primary'}
              value="perBracket"
              checked={mode === 'perBracket'}
              onChange={() => handleModeChange('perBracket')}
              disabled={disabled}
              size="sm"
            >
              Per Bracket
            </ToggleButton>
          </ButtonGroup>
          <Form.Text className="text-muted ms-2">
            {mode === 'perGroup'
              ? 'Set how many players advance from each group'
              : 'Set total number of players per bracket'}
          </Form.Text>
        </div>
      </Form.Group>

      {/* Per Group Mode */}
      {mode === 'perGroup' && (
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Advancing to main bracket (per group)</Form.Label>
              <Form.Select
                value={value.advancePerGroup || ''}
                onChange={(e) => handleChange('advancePerGroup', e.target.value)}
                disabled={disabled || !value.groupSize}
              >
                <option value="">Select...</option>
                {value.groupSize && Array.from({ length: value.groupSize }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>
                    {n === parseInt(value.groupSize) ? `All ${n} players (seeding only)` : `Top ${n} player${n > 1 ? 's' : ''}`}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Advancing to secondary bracket (per group)</Form.Label>
              <Form.Select
                value={value.advancePerGroupSecondary || ''}
                onChange={(e) => handleChange('advancePerGroupSecondary', e.target.value)}
                disabled={disabled || !value.groupSize || !value.advancePerGroup}
              >
                <option value="">None (no secondary bracket)</option>
                {maxSecondaryPerGroup > 0 && Array.from({ length: maxSecondaryPerGroup }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>
                    {`Next ${n} player${n > 1 ? 's' : ''}`}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Optional. Players ranked below main bracket cutoff.
              </Form.Text>
            </Form.Group>
          </Col>
        </Row>
      )}

      {/* Per Bracket Mode */}
      {mode === 'perBracket' && (
        <Row>
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
      )}

      <Alert variant="info" className="mb-3">
        <small>
          <strong>Combined Format:</strong> Tournament starts with a group stage where players are divided into groups.
          {mode === 'perGroup'
            ? ' Top players from each group advance to knockout brackets. The system calculates total bracket sizes automatically.'
            : ' The system distributes the specified number of players across brackets using cross-group ranking.'}
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
