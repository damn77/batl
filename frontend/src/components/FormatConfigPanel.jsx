// T067: Format configuration panel wrapper - shows appropriate config panel based on format type
import { Card } from 'react-bootstrap';
import KnockoutConfigPanel from './KnockoutConfigPanel';
import GroupConfigPanel from './GroupConfigPanel';
import SwissConfigPanel from './SwissConfigPanel';
import CombinedConfigPanel from './CombinedConfigPanel';

/**
 * FormatConfigPanel - Wrapper component that renders the appropriate format configuration panel
 *
 * @param {string} formatType - Tournament format type (KNOCKOUT, GROUPS, SWISS, COMBINED)
 * @param {Object} formatConfig - Current format configuration
 * @param {Function} onChange - Callback when configuration changes
 * @param {boolean} disabled - Whether the form is disabled
 * @param {number} playerCount - Current number of registered players
 */
function FormatConfigPanel({ formatType, formatConfig = {}, onChange, disabled = false, playerCount = 0 }) {
  const renderConfigPanel = () => {
    switch (formatType) {
      case 'KNOCKOUT':
        return (
          <KnockoutConfigPanel
            value={formatConfig}
            onChange={onChange}
            disabled={disabled}
          />
        );

      case 'GROUPS':
        return (
          <GroupConfigPanel
            value={formatConfig}
            onChange={onChange}
            disabled={disabled}
            playerCount={playerCount}
          />
        );

      case 'SWISS':
        return (
          <SwissConfigPanel
            value={formatConfig}
            onChange={onChange}
            disabled={disabled}
          />
        );

      case 'COMBINED':
        return (
          <CombinedConfigPanel
            value={formatConfig}
            onChange={onChange}
            disabled={disabled}
            playerCount={playerCount}
          />
        );

      default:
        return (
          <div className="text-muted">
            <p>Select a format type to configure format-specific settings.</p>
          </div>
        );
    }
  };

  return (
    <Card>
      <Card.Header>
        <h5 className="mb-0">Format Configuration</h5>
      </Card.Header>
      <Card.Body>
        {renderConfigPanel()}
      </Card.Body>
    </Card>
  );
}

export default FormatConfigPanel;
