// T063: Knockout format configuration panel
import { Form } from 'react-bootstrap';

/**
 * KnockoutConfigPanel - Configuration options for knockout/elimination tournaments
 *
 * @param {Object} value - Current configuration { matchGuarantee: 'MATCH_1' | 'MATCH_2' | 'MATCH_3' }
 * @param {Function} onChange - Callback when configuration changes
 * @param {boolean} disabled - Whether the form is disabled
 */
function KnockoutConfigPanel({ value = { matchGuarantee: 'MATCH_1' }, onChange, disabled = false }) {
  const handleChange = (field, fieldValue) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div>
      <Form.Group className="mb-3">
        <Form.Label>Match Guarantee</Form.Label>
        <Form.Select
          value={value.matchGuarantee || 'MATCH_1'}
          onChange={(e) => handleChange('matchGuarantee', e.target.value)}
          disabled={disabled}
        >
          <option value="MATCH_1">Single Elimination (1 match guarantee)</option>
          <option value="MATCH_2">Double Elimination (2 match guarantee)</option>
          <option value="MATCH_3">Triple Elimination (3 match guarantee)</option>
        </Form.Select>
        <Form.Text className="text-muted">
          {value.matchGuarantee === 'MATCH_1' && 'Players are eliminated after losing 1 match'}
          {value.matchGuarantee === 'MATCH_2' && 'Players are eliminated after losing 2 matches (winners + losers brackets)'}
          {value.matchGuarantee === 'MATCH_3' && 'Players are eliminated after losing 3 matches'}
        </Form.Text>
      </Form.Group>
    </div>
  );
}

export default KnockoutConfigPanel;
