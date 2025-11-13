// T085: Reusable component for editing rule overrides at any level
import { useState, useEffect } from 'react';
import { Form, Row, Col, Alert } from 'react-bootstrap';

/**
 * RuleOverrideForm - Reusable form component for setting partial rule overrides
 *
 * @param {Object} initialRules - Initial rule values (can be partial)
 * @param {Function} onChange - Callback when rules change (receives partial rules object)
 * @param {boolean} showFormatType - Whether to allow changing formatType (default: false)
 */
function RuleOverrideForm({ initialRules = {}, onChange, showFormatType = false }) {
  const [rules, setRules] = useState({
    formatType: initialRules.formatType || '',
    winningSets: initialRules.winningSets || '',
    winningTiebreaks: initialRules.winningTiebreaks || '',
    advantageRule: initialRules.advantageRule || '',
    tiebreakTrigger: initialRules.tiebreakTrigger || '',
    finalSetTiebreak: initialRules.finalSetTiebreak || ''
  });

  // Update parent component whenever rules change
  useEffect(() => {
    // Only send non-empty fields
    const partialRules = {};
    Object.keys(rules).forEach(key => {
      if (rules[key] !== '') {
        partialRules[key] = rules[key];
      }
    });
    onChange(partialRules);
  }, [rules, onChange]);

  const handleChange = (field, value) => {
    setRules(prev => ({ ...prev, [field]: value }));
  };

  const clearField = (field) => {
    setRules(prev => ({ ...prev, [field]: '' }));
  };

  return (
    <div>
      <Alert variant="info" className="mb-3">
        <small>
          <strong>Rule Overrides:</strong> Only set fields you want to override.
          Empty fields will inherit from the parent level (tournament defaults).
        </small>
      </Alert>

      {showFormatType && (
        <Form.Group className="mb-3">
          <Form.Label>
            Scoring Format Type
            {rules.formatType && (
              <small
                className="text-danger ms-2"
                style={{ cursor: 'pointer' }}
                onClick={() => clearField('formatType')}
              >
                (clear override)
              </small>
            )}
          </Form.Label>
          <Form.Select
            value={rules.formatType}
            onChange={(e) => handleChange('formatType', e.target.value)}
          >
            <option value="">-- Use Default --</option>
            <option value="SETS">Sets Format</option>
            <option value="STANDARD_TIEBREAK">Standard Tiebreak</option>
            <option value="BIG_TIEBREAK">Big Tiebreak (10 points)</option>
            <option value="MIXED">Mixed Format (Sets + Final Tiebreak)</option>
          </Form.Select>
        </Form.Group>
      )}

      <Row>
        {/* Winning Sets - for SETS and MIXED formats */}
        {(!rules.formatType || rules.formatType === 'SETS' || rules.formatType === 'MIXED') && (
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>
                Winning Sets
                {rules.winningSets && (
                  <small
                    className="text-danger ms-2"
                    style={{ cursor: 'pointer' }}
                    onClick={() => clearField('winningSets')}
                  >
                    (clear override)
                  </small>
                )}
              </Form.Label>
              <Form.Select
                value={rules.winningSets}
                onChange={(e) => handleChange('winningSets', e.target.value ? parseInt(e.target.value) : '')}
              >
                <option value="">-- Use Default --</option>
                <option value="1">Best of 1 Set</option>
                <option value="2">Best of 3 Sets</option>
              </Form.Select>
            </Form.Group>
          </Col>
        )}

        {/* Winning Tiebreaks - for STANDARD_TIEBREAK and BIG_TIEBREAK formats */}
        {(rules.formatType === 'STANDARD_TIEBREAK' || rules.formatType === 'BIG_TIEBREAK') && (
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>
                Winning Tiebreaks
                {rules.winningTiebreaks && (
                  <small
                    className="text-danger ms-2"
                    style={{ cursor: 'pointer' }}
                    onClick={() => clearField('winningTiebreaks')}
                  >
                    (clear override)
                  </small>
                )}
              </Form.Label>
              <Form.Select
                value={rules.winningTiebreaks}
                onChange={(e) => handleChange('winningTiebreaks', e.target.value ? parseInt(e.target.value) : '')}
              >
                <option value="">-- Use Default --</option>
                <option value="1">Best of 1 Tiebreak</option>
                <option value="2">Best of 3 Tiebreaks</option>
                {rules.formatType === 'STANDARD_TIEBREAK' && (
                  <option value="3">Best of 5 Tiebreaks</option>
                )}
              </Form.Select>
            </Form.Group>
          </Col>
        )}

        {/* Advantage Rule - for SETS and MIXED formats */}
        {(!rules.formatType || rules.formatType === 'SETS' || rules.formatType === 'MIXED') && (
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>
                Advantage Rule
                {rules.advantageRule && (
                  <small
                    className="text-danger ms-2"
                    style={{ cursor: 'pointer' }}
                    onClick={() => clearField('advantageRule')}
                  >
                    (clear override)
                  </small>
                )}
              </Form.Label>
              <Form.Select
                value={rules.advantageRule}
                onChange={(e) => handleChange('advantageRule', e.target.value)}
              >
                <option value="">-- Use Default --</option>
                <option value="ADVANTAGE">Advantage (Deuce)</option>
                <option value="NO_ADVANTAGE">No Advantage (Deciding Point at 40-40)</option>
              </Form.Select>
            </Form.Group>
          </Col>
        )}

        {/* Tiebreak Trigger - for SETS and MIXED formats */}
        {(!rules.formatType || rules.formatType === 'SETS' || rules.formatType === 'MIXED') && (
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>
                Tiebreak Trigger
                {rules.tiebreakTrigger && (
                  <small
                    className="text-danger ms-2"
                    style={{ cursor: 'pointer' }}
                    onClick={() => clearField('tiebreakTrigger')}
                  >
                    (clear override)
                  </small>
                )}
              </Form.Label>
              <Form.Select
                value={rules.tiebreakTrigger}
                onChange={(e) => handleChange('tiebreakTrigger', e.target.value)}
              >
                <option value="">-- Use Default --</option>
                <option value="6-6">At 6-6</option>
                <option value="5-5">At 5-5</option>
                <option value="4-4">At 4-4</option>
                <option value="3-3">At 3-3</option>
              </Form.Select>
            </Form.Group>
          </Col>
        )}

        {/* Final Set Tiebreak - for MIXED format only */}
        {rules.formatType === 'MIXED' && (
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>
                Final Set Tiebreak Type
                {rules.finalSetTiebreak && (
                  <small
                    className="text-danger ms-2"
                    style={{ cursor: 'pointer' }}
                    onClick={() => clearField('finalSetTiebreak')}
                  >
                    (clear override)
                  </small>
                )}
              </Form.Label>
              <Form.Select
                value={rules.finalSetTiebreak}
                onChange={(e) => handleChange('finalSetTiebreak', e.target.value)}
              >
                <option value="">-- Use Default --</option>
                <option value="STANDARD">Standard Tiebreak (7 points)</option>
                <option value="BIG">Big Tiebreak (10 points)</option>
              </Form.Select>
            </Form.Group>
          </Col>
        )}
      </Row>
    </div>
  );
}

export default RuleOverrideForm;
