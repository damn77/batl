// T025: Tournament Format Badge Component - Displays format type with icon
import { Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { getFormatTypeInfo } from '../services/tournamentViewService';

/**
 * TournamentFormatBadge - Displays tournament format type badge with icon and tooltip
 * FR-002: Display tournament format type and configuration
 */
const TournamentFormatBadge = ({ formatType, formatConfig }) => {
  const { t } = useTranslation(); // Hook triggers re-render on language change

  if (!formatType) return null;

  // Parse formatConfig if it's a JSON string
  let parsedConfig = formatConfig;
  if (typeof formatConfig === 'string' && formatConfig) {
    try {
      parsedConfig = JSON.parse(formatConfig);
    } catch (e) {
      console.warn('Failed to parse formatConfig:', e);
      parsedConfig = {};
    }
  }

  const formatInfo = getFormatTypeInfo(formatType, parsedConfig || {});

  const tooltip = (
    <Tooltip id={`format-tooltip-${formatType}`}>
      {formatInfo.description}
    </Tooltip>
  );

  return (
    <OverlayTrigger placement="top" overlay={tooltip}>
      <Badge bg="secondary" className="px-2 py-1" style={{ cursor: 'help' }}>
        {formatInfo.icon && <span className="me-1">{formatInfo.icon}</span>}
        {formatInfo.label}
      </Badge>
    </OverlayTrigger>
  );
};

export default TournamentFormatBadge;
