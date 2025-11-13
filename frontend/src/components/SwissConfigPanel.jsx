// T065: Swiss format configuration panel
import { Form } from 'react-bootstrap';

/**
 * SwissConfigPanel - Configuration options for Swiss-system tournaments
 *
 * @param {Object} value - Current configuration { rounds: number }
 * @param {Function} onChange - Callback when configuration changes
 * @param {boolean} disabled - Whether the form is disabled
 */
function SwissConfigPanel({ value = { rounds: 5 }, onChange, disabled = false }) {
  const handleChange = (field, fieldValue) => {
    onChange({ ...value, [field]: parseInt(fieldValue) || '' });
  };

  return (
    <div>
      <Form.Group className="mb-3">
        <Form.Label>Number of Rounds</Form.Label>
        <Form.Select
          value={value.rounds || ''}
          onChange={(e) => handleChange('rounds', e.target.value)}
          disabled={disabled}
        >
          <option value="">Select number of rounds...</option>
          <option value="3">3 rounds</option>
          <option value="4">4 rounds</option>
          <option value="5">5 rounds</option>
          <option value="6">6 rounds</option>
          <option value="7">7 rounds</option>
          <option value="8">8 rounds</option>
          <option value="9">9 rounds</option>
          <option value="10">10 rounds</option>
        </Form.Select>
        <Form.Text className="text-muted">
          In Swiss format, players are paired each round based on similar records. More rounds provide better ranking accuracy.
        </Form.Text>
      </Form.Group>
    </div>
  );
}

export default SwissConfigPanel;
