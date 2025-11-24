// T039: Rule Complexity Indicator Component - Displays 🟢🟡🔴 icons with tooltips
import { Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { getRuleComplexityInfo } from '../services/tournamentViewService';

/**
 * RuleComplexityIndicator - Displays rule complexity with colored icon and tooltip
 * FR-003: Display rule complexity indicator (DEFAULT, MODIFIED, SPECIFIC)
 *
 * @param {string} complexity - DEFAULT, MODIFIED, or SPECIFIC
 * @param {boolean} showLabel - Whether to show text label alongside icon (default: true)
 * @param {string} size - sm, md, or lg (default: md)
 */
const RuleComplexityIndicator = ({ complexity, showLabel = true, size = 'md' }) => {
  const { t } = useTranslation(); // Hook triggers re-render on language change

  if (!complexity) return null;

  const complexityInfo = getRuleComplexityInfo(complexity);

  const tooltip = (
    <Tooltip id={`complexity-tooltip-${complexity}`}>
      <strong>{complexityInfo.label}</strong>
      <br />
      {complexityInfo.description}
    </Tooltip>
  );

  const badgeSize = {
    sm: 'px-2 py-1',
    md: 'px-3 py-2',
    lg: 'px-4 py-2'
  }[size] || 'px-3 py-2';

  return (
    <OverlayTrigger placement="top" overlay={tooltip}>
      <Badge
        bg={complexityInfo.variant}
        className={`${badgeSize} d-inline-flex align-items-center gap-1`}
        style={{ cursor: 'help' }}
      >
        <span>{complexityInfo.icon}</span>
        {showLabel && <span>{complexityInfo.label}</span>}
      </Badge>
    </OverlayTrigger>
  );
};

export default RuleComplexityIndicator;
