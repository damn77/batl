import { Badge } from 'react-bootstrap';
import {
  STATUS_LABELS,
  STATUS_VARIANTS,
  STATUS_DESCRIPTIONS
} from '../services/tournamentRegistrationService';

/**
 * T023: RegistrationStatusBadge Component
 * Displays tournament registration status with appropriate styling
 *
 * @param {string} status - Tournament registration status (REGISTERED, WAITLISTED, WITHDRAWN, CANCELLED)
 * @param {boolean} showDescription - Whether to show status description tooltip (default: false)
 */
const RegistrationStatusBadge = ({ status, showDescription = false }) => {
  if (!status) return null;

  const variant = STATUS_VARIANTS[status] || 'secondary';
  const label = STATUS_LABELS[status] || status;
  const description = STATUS_DESCRIPTIONS[status];

  return (
    <Badge
      bg={variant}
      title={showDescription && description ? description : undefined}
      className="me-2"
    >
      {label}
    </Badge>
  );
};

export default RegistrationStatusBadge;
