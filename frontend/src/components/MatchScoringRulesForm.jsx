// T034: Match Scoring Rules Form Component
import { useState } from 'react';
import { Form, Card, Row, Col } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const MatchScoringRulesForm = ({ value, onChange, disabled }) => {
  const { t } = useTranslation();
  const [scoringRules, setScoringRules] = useState(value || {
    formatType: 'SETS',
    winningSets: 2,
    advantageRule: 'ADVANTAGE',
    tiebreakTrigger: '6-6'
  });

  const ScoringFormatOptions = {
    SETS: { label: t('scoring.formats.sets'), description: t('scoring.formats.setsDesc') },
    STANDARD_TIEBREAK: { label: t('scoring.formats.standardTiebreak'), description: t('scoring.formats.standardTiebreakDesc') },
    BIG_TIEBREAK: { label: t('scoring.formats.bigTiebreak'), description: t('scoring.formats.bigTiebreakDesc') },
    MIXED: { label: t('scoring.formats.mixed'), description: t('scoring.formats.mixedDesc') }
  };

  const handleFormatTypeChange = (newType) => {
    let defaultRules = { formatType: newType };

    switch (newType) {
      case 'SETS':
        defaultRules = {
          formatType: 'SETS',
          winningSets: 2,
          advantageRule: 'ADVANTAGE',
          tiebreakTrigger: '6-6'
        };
        break;
      case 'STANDARD_TIEBREAK':
        defaultRules = {
          formatType: 'STANDARD_TIEBREAK',
          winningTiebreaks: 2
        };
        break;
      case 'BIG_TIEBREAK':
        defaultRules = {
          formatType: 'BIG_TIEBREAK',
          winningTiebreaks: 1
        };
        break;
      case 'MIXED':
        defaultRules = {
          formatType: 'MIXED',
          winningSets: 2,
          advantageRule: 'ADVANTAGE',
          tiebreakTrigger: '6-6',
          finalSetTiebreak: 'BIG'
        };
        break;
    }

    setScoringRules(defaultRules);
    onChange(defaultRules);
  };

  const handleFieldChange = (field, value) => {
    const newRules = { ...scoringRules, [field]: value };
    setScoringRules(newRules);
    onChange(newRules);
  };

  return (
    <Card>
      <Card.Header>
        <h5 className="mb-0">{t('scoring.title')}</h5>
      </Card.Header>
      <Card.Body>
        <Form.Group className="mb-3">
          <Form.Label>{t('scoring.format')}</Form.Label>
          <Form.Select
            value={scoringRules.formatType}
            onChange={(e) => handleFormatTypeChange(e.target.value)}
            disabled={disabled}
          >
            {Object.entries(ScoringFormatOptions).map(([key, option]) => (
              <option key={key} value={key}>
                {option.label}
              </option>
            ))}
          </Form.Select>
          <Form.Text className="text-muted">
            {ScoringFormatOptions[scoringRules.formatType]?.description}
          </Form.Text>
        </Form.Group>

        {/* Sets format options */}
        {(scoringRules.formatType === 'SETS' || scoringRules.formatType === 'MIXED') && (
          <>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('scoring.winningSets')}</Form.Label>
                  <Form.Select
                    value={scoringRules.winningSets}
                    onChange={(e) => handleFieldChange('winningSets', parseInt(e.target.value))}
                    disabled={disabled}
                  >
                    <option value={1}>{t('scoring.winningSetsOptions.1')}</option>
                    <option value={2}>{t('scoring.winningSetsOptions.2')}</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('scoring.advantageRule')}</Form.Label>
                  <Form.Select
                    value={scoringRules.advantageRule}
                    onChange={(e) => handleFieldChange('advantageRule', e.target.value)}
                    disabled={disabled}
                  >
                    <option value="ADVANTAGE">{t('scoring.advantageOptions.advantage')}</option>
                    <option value="NO_ADVANTAGE">{t('scoring.advantageOptions.noAdvantage')}</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>{t('scoring.tiebreakTrigger')}</Form.Label>
              <Form.Select
                value={scoringRules.tiebreakTrigger}
                onChange={(e) => handleFieldChange('tiebreakTrigger', e.target.value)}
                disabled={disabled}
              >
                <option value="6-6">{t('scoring.tiebreakTriggerOptions.6-6')}</option>
                <option value="5-5">{t('scoring.tiebreakTriggerOptions.5-5')}</option>
                <option value="4-4">{t('scoring.tiebreakTriggerOptions.4-4')}</option>
                <option value="3-3">{t('scoring.tiebreakTriggerOptions.3-3')}</option>
              </Form.Select>
              <Form.Text className="text-muted">
                {t('scoring.tiebreakTriggerHelp')}
              </Form.Text>
            </Form.Group>
          </>
        )}

        {/* Tiebreak formats */}
        {(scoringRules.formatType === 'STANDARD_TIEBREAK' || scoringRules.formatType === 'BIG_TIEBREAK') && (
          <Form.Group className="mb-3">
            <Form.Label>{t('scoring.winningTiebreaks')}</Form.Label>
            <Form.Select
              value={scoringRules.winningTiebreaks}
              onChange={(e) => handleFieldChange('winningTiebreaks', parseInt(e.target.value))}
              disabled={disabled}
            >
              <option value={1}>{t('scoring.winningTiebreaksOptions.1')}</option>
              <option value={2}>{t('scoring.winningTiebreaksOptions.2')}</option>
              {scoringRules.formatType === 'STANDARD_TIEBREAK' && (
                <option value={3}>{t('scoring.winningTiebreaksOptions.3')}</option>
              )}
            </Form.Select>
            <Form.Text className="text-muted">
              {scoringRules.formatType === 'BIG_TIEBREAK'
                ? t('scoring.bigTiebreakHelp')
                : t('scoring.standardTiebreakHelp')}
            </Form.Text>
          </Form.Group>
        )}

        {/* Mixed format - final set tiebreak */}
        {scoringRules.formatType === 'MIXED' && (
          <Form.Group className="mb-3">
            <Form.Label>{t('scoring.finalSetTiebreak')}</Form.Label>
            <Form.Select
              value={scoringRules.finalSetTiebreak}
              onChange={(e) => handleFieldChange('finalSetTiebreak', e.target.value)}
              disabled={disabled}
            >
              <option value="STANDARD">{t('scoring.finalSetTiebreakOptions.standard')}</option>
              <option value="BIG">{t('scoring.finalSetTiebreakOptions.big')}</option>
            </Form.Select>
            <Form.Text className="text-muted">
              {t('scoring.finalSetTiebreakHelp')}
            </Form.Text>
          </Form.Group>
        )}
      </Card.Body>
    </Card>
  );
};

export default MatchScoringRulesForm;
