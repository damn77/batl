// T034: Match Scoring Rules Form Component
import { useState } from 'react';
import { Form, Card, Row, Col } from 'react-bootstrap';

const ScoringFormatOptions = {
  SETS: { label: 'Traditional Sets', description: 'Standard tennis scoring with sets' },
  STANDARD_TIEBREAK: { label: 'Standard Tiebreak', description: 'Tiebreak to 7 points' },
  BIG_TIEBREAK: { label: 'Big Tiebreak', description: 'Tiebreak to 10 points' },
  MIXED: { label: 'Mixed Format', description: 'Sets with final set tiebreak' }
};

const MatchScoringRulesForm = ({ value, onChange, disabled }) => {
  const [scoringRules, setScoringRules] = useState(value || {
    formatType: 'SETS',
    winningSets: 2,
    advantageRule: 'ADVANTAGE',
    tiebreakTrigger: '6-6'
  });

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
        <h5 className="mb-0">Match Scoring Rules</h5>
      </Card.Header>
      <Card.Body>
        <Form.Group className="mb-3">
          <Form.Label>Scoring Format</Form.Label>
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
                  <Form.Label>Winning Sets</Form.Label>
                  <Form.Select
                    value={scoringRules.winningSets}
                    onChange={(e) => handleFieldChange('winningSets', parseInt(e.target.value))}
                    disabled={disabled}
                  >
                    <option value={1}>1 Set</option>
                    <option value={2}>2 Sets (Best of 3)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Advantage Rule</Form.Label>
                  <Form.Select
                    value={scoringRules.advantageRule}
                    onChange={(e) => handleFieldChange('advantageRule', e.target.value)}
                    disabled={disabled}
                  >
                    <option value="ADVANTAGE">Advantage (40-40, Deuce)</option>
                    <option value="NO_ADVANTAGE">No Advantage (Deciding Point)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Tiebreak Trigger</Form.Label>
              <Form.Select
                value={scoringRules.tiebreakTrigger}
                onChange={(e) => handleFieldChange('tiebreakTrigger', e.target.value)}
                disabled={disabled}
              >
                <option value="6-6">6-6 (Standard)</option>
                <option value="5-5">5-5 (Early Tiebreak)</option>
                <option value="4-4">4-4 (Very Early Tiebreak)</option>
                <option value="3-3">3-3 (Short Sets)</option>
              </Form.Select>
              <Form.Text className="text-muted">
                When to play a tiebreak in each set
              </Form.Text>
            </Form.Group>
          </>
        )}

        {/* Tiebreak formats */}
        {(scoringRules.formatType === 'STANDARD_TIEBREAK' || scoringRules.formatType === 'BIG_TIEBREAK') && (
          <Form.Group className="mb-3">
            <Form.Label>Winning Tiebreaks</Form.Label>
            <Form.Select
              value={scoringRules.winningTiebreaks}
              onChange={(e) => handleFieldChange('winningTiebreaks', parseInt(e.target.value))}
              disabled={disabled}
            >
              <option value={1}>1 Tiebreak</option>
              <option value={2}>2 Tiebreaks (Best of 3)</option>
              {scoringRules.formatType === 'STANDARD_TIEBREAK' && (
                <option value={3}>3 Tiebreaks (Best of 5)</option>
              )}
            </Form.Select>
            <Form.Text className="text-muted">
              {scoringRules.formatType === 'BIG_TIEBREAK'
                ? 'Big tiebreak to 10 points (win by 2)'
                : 'Standard tiebreak to 7 points (win by 2)'}
            </Form.Text>
          </Form.Group>
        )}

        {/* Mixed format - final set tiebreak */}
        {scoringRules.formatType === 'MIXED' && (
          <Form.Group className="mb-3">
            <Form.Label>Final Set Tiebreak</Form.Label>
            <Form.Select
              value={scoringRules.finalSetTiebreak}
              onChange={(e) => handleFieldChange('finalSetTiebreak', e.target.value)}
              disabled={disabled}
            >
              <option value="STANDARD">Standard Tiebreak (to 7)</option>
              <option value="BIG">Big Tiebreak (to 10)</option>
            </Form.Select>
            <Form.Text className="text-muted">
              Type of tiebreak for the final set only
            </Form.Text>
          </Form.Group>
        )}
      </Card.Body>
    </Card>
  );
};

export default MatchScoringRulesForm;
