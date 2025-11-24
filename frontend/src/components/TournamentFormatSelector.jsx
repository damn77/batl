// T033: Tournament Format Selector Component
// T110: Use format metadata from API instead of hardcoded values
import { useState, useEffect } from 'react';
import { Form, Card, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { getFormatTypes } from '../services/tournamentRulesService';

const TournamentFormatSelector = ({ value, onChange, disabled }) => {
  const { t } = useTranslation();
  const [formatType, setFormatType] = useState(value?.formatType || 'KNOCKOUT');
  const [formatConfig, setFormatConfig] = useState(value?.formatConfig || {
    formatType: 'KNOCKOUT',
    matchGuarantee: 'MATCH_1'
  });
  const [formatTypes, setFormatTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Static match guarantee options
  const MatchGuarantees = [
    { value: 'MATCH_1', label: t('tournamentFormat.matchGuarantees.MATCH_1.label'), description: t('tournamentFormat.matchGuarantees.MATCH_1.description') },
    { value: 'MATCH_2', label: t('tournamentFormat.matchGuarantees.MATCH_2.label'), description: t('tournamentFormat.matchGuarantees.MATCH_2.description') },
    { value: 'UNTIL_PLACEMENT', label: t('tournamentFormat.matchGuarantees.UNTIL_PLACEMENT.label'), description: t('tournamentFormat.matchGuarantees.UNTIL_PLACEMENT.description') }
  ];

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
        <h5 className="mb-0">{t('tournamentFormat.title')}</h5>
      </Card.Header>
      <Card.Body>
        <Form.Group className="mb-3">
          <Form.Label>{t('tournamentFormat.selector.formatType')}</Form.Label>
          <Form.Select
            value={formatType}
            onChange={(e) => handleFormatTypeChange(e.target.value)}
            disabled={disabled || loading}
          >
            {formatTypes.map((format) => (
              <option key={format.value} value={format.value}>
                {t(`tournamentFormat.types.${format.value.toLowerCase()}`, { defaultValue: format.label })}
              </option>
            ))}
          </Form.Select>
          <Form.Text className="text-muted">
            {t(`tournamentFormat.descriptions.${formatType.toLowerCase()}`, {
              defaultValue: formatTypes.find(f => f.value === formatType)?.description
            })}
          </Form.Text>
        </Form.Group>

        {/* Knockout-specific config */}
        {formatType === 'KNOCKOUT' && (
          <Form.Group className="mb-3">
            <Form.Label>{t('tournamentFormat.labels.matchGuarantee')}</Form.Label>
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
            <Form.Label>{t('tournamentFormat.labels.groupSize')}</Form.Label>
            <Form.Select
              value={formatConfig.groupSize}
              onChange={(e) => handleConfigChange('groupSize', parseInt(e.target.value))}
              disabled={disabled}
            >
              {[2, 3, 4, 5, 6, 7, 8].map((size) => (
                <option key={size} value={size}>
                  {t('tournamentFormat.values.playersPerGroup', { count: size })}
                </option>
              ))}
            </Form.Select>
            <Form.Text className="text-muted">
              {t('tournamentFormat.selector.groupsSizeHelp', { size: formatConfig.groupSize, sizeMinusOne: formatConfig.groupSize - 1 })}
            </Form.Text>
          </Form.Group>
        )}

        {/* Swiss-specific config */}
        {formatType === 'SWISS' && (
          <Form.Group className="mb-3">
            <Form.Label>{t('tournamentFormat.labels.numberOfRounds')}</Form.Label>
            <Form.Control
              type="number"
              min="3"
              max="20"
              value={formatConfig.rounds}
              onChange={(e) => handleConfigChange('rounds', parseInt(e.target.value))}
              disabled={disabled}
            />
            <Form.Text className="text-muted">
              {t('tournamentFormat.selector.minRoundsHelp')}
            </Form.Text>
          </Form.Group>
        )}

        {disabled && (
          <Alert variant="warning" className="mb-0 mt-3">
            {t('tournamentFormat.selector.disabledWarning')}
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
};

export default TournamentFormatSelector;
