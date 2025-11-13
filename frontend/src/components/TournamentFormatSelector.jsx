// T033: Tournament Format Selector Component
// T110: Use format metadata from API instead of hardcoded values
import { useState, useEffect } from 'react';
import { Form, Card, Row, Col, Alert } from 'react-bootstrap';
import { getFormatTypes } from '../services/tournamentRulesService';

// Static match guarantee options (not provided by API)
const MatchGuarantees = [
  { value: 'MATCH_1', label: '1 Match Guarantee', description: 'Single elimination' },
  { value: 'MATCH_2', label: '2 Match Guarantee', description: 'Double elimination' },
  { value: 'UNTIL_PLACEMENT', label: 'Until Placement', description: 'Continue until final placement' }
];

const TournamentFormatSelector = ({ value, onChange, disabled }) => {
  const [formatType, setFormatType] = useState(value?.formatType || 'KNOCKOUT');
  const [formatConfig, setFormatConfig] = useState(value?.formatConfig || {
    formatType: 'KNOCKOUT',
    matchGuarantee: 'MATCH_1'
  });
  const [formatTypes, setFormatTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // T110: Load format types from API on mount
  useEffect(() => {
    const loadFormatTypes = async () => {
      try {
        const response = await getFormatTypes();
        const types = response.data.formatTypes || [];
        setFormatTypes(types);
      } catch (error) {
        console.error('Failed to load format types:', error);
        // Fall back to empty array, component will still work
      } finally {
        setLoading(false);
      }
    };

    loadFormatTypes();
  }, []);

  const handleFormatTypeChange = (newType) => {
    setFormatType(newType);

    // Set default config for the selected format
    const defaultConfig = { formatType: newType };

    switch (newType) {
      case 'KNOCKOUT':
        defaultConfig.matchGuarantee = 'MATCH_1';
        break;
      case 'GROUP':
        defaultConfig.groupSize = 4;
        defaultConfig.singleGroup = false;
        break;
      case 'SWISS':
        defaultConfig.rounds = 5;
        break;
      case 'COMBINED':
        defaultConfig.groupSize = 4;
        defaultConfig.advancePerGroup = 2;
        break;
    }

    setFormatConfig(defaultConfig);
    onChange(newType, defaultConfig);
  };

  const handleConfigChange = (field, value) => {
    const newConfig = { ...formatConfig, [field]: value };
    setFormatConfig(newConfig);
    onChange(formatType, newConfig);
  };

  return (
    <Card>
      <Card.Header>
        <h5 className="mb-0">Tournament Format</h5>
      </Card.Header>
      <Card.Body>
        <Form.Group className="mb-3">
          <Form.Label>Format Type</Form.Label>
          <Form.Select
            value={formatType}
            onChange={(e) => handleFormatTypeChange(e.target.value)}
            disabled={disabled || loading}
          >
            {formatTypes.map((format) => (
              <option key={format.value} value={format.value}>
                {format.label}
              </option>
            ))}
          </Form.Select>
          <Form.Text className="text-muted">
            {formatTypes.find(f => f.value === formatType)?.description}
          </Form.Text>
        </Form.Group>

        {/* Knockout-specific config */}
        {formatType === 'KNOCKOUT' && (
          <Form.Group className="mb-3">
            <Form.Label>Match Guarantee</Form.Label>
            <Form.Select
              value={formatConfig.matchGuarantee}
              onChange={(e) => handleConfigChange('matchGuarantee', e.target.value)}
              disabled={disabled}
            >
              {MatchGuarantees.map((mg) => (
                <option key={mg.value} value={mg.value}>
                  {mg.label}
                </option>
              ))}
            </Form.Select>
            <Form.Text className="text-muted">
              {MatchGuarantees.find(mg => mg.value === formatConfig.matchGuarantee)?.description}
            </Form.Text>
          </Form.Group>
        )}

        {/* Group/Combined-specific config */}
        {(formatType === 'GROUP' || formatType === 'COMBINED') && (
          <Form.Group className="mb-3">
            <Form.Label>Group Size</Form.Label>
            <Form.Select
              value={formatConfig.groupSize}
              onChange={(e) => handleConfigChange('groupSize', parseInt(e.target.value))}
              disabled={disabled}
            >
              {[2, 3, 4, 5, 6, 7, 8].map((size) => (
                <option key={size} value={size}>
                  {size} players per group
                </option>
              ))}
            </Form.Select>
            <Form.Text className="text-muted">
              Groups may be size {formatConfig.groupSize} or {formatConfig.groupSize - 1}
            </Form.Text>
          </Form.Group>
        )}

        {/* Swiss-specific config */}
        {formatType === 'SWISS' && (
          <Form.Group className="mb-3">
            <Form.Label>Number of Rounds</Form.Label>
            <Form.Control
              type="number"
              min="3"
              max="20"
              value={formatConfig.rounds}
              onChange={(e) => handleConfigChange('rounds', parseInt(e.target.value))}
              disabled={disabled}
            />
            <Form.Text className="text-muted">
              Minimum 3 rounds required
            </Form.Text>
          </Form.Group>
        )}

        {disabled && (
          <Alert variant="warning" className="mb-0 mt-3">
            Format cannot be changed after matches have started
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
};

export default TournamentFormatSelector;
