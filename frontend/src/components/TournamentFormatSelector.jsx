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
        defaultConfig.matchGuarantee = 'MATCH_2';
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
