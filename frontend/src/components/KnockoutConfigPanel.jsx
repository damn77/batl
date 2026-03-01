// T063: Knockout format configuration panel
import { Form } from 'react-bootstrap';

/**
 * KnockoutConfigPanel - Configuration options for knockout/elimination tournaments
 *
 * @param {Object} value - Current configuration { matchGuarantee: 'MATCH_1' | 'MATCH_2' }
 * @param {Function} onChange - Callback when configuration changes
 * @param {boolean} disabled - Whether the form is disabled
 */
function KnockoutConfigPanel({ value = { matchGuarantee: 'MATCH_2' }, onChange, disabled = false }) {
  const handleChange = (field, fieldValue) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div>
      <Form.Group className="mb-3">
        <Form.Label>Match Guarantee</Form.Label>
        <Form.Select
          value={value.matchGuarantee || 'MATCH_2'}
          onChange={(e) => handleChange('matchGuarantee', e.target.value)}
          disabled={disabled}
        >
          <option value="MATCH_1">Single Elimination</option>
          <option value="MATCH_2">Double Elimination (2 matches)</option>
          <option value="UNTIL_PLACEMENT" disabled className="text-muted">Until Placement (coming soon)</option>
        </Form.Select>
      </Form.Group>
    </div>
  );
}

export default KnockoutConfigPanel;
