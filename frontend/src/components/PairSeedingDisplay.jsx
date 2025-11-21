import { Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';

/**
 * T062 [P] [US3]: Display pair seeding score with breakdown
 * Shows the combined seeding score and individual player contributions
 */
const PairSeedingDisplay = ({
  seedingScore,
  player1Name,
  player1Points = 0,
  player2Name,
  player2Points = 0,
  size = 'normal', // 'small', 'normal', 'large'
  showBreakdown = true,
}) => {
  const score = seedingScore ?? (player1Points + player2Points);

  const getSeedingBadgeVariant = (points) => {
    if (points >= 2000) return 'danger';
    if (points >= 1000) return 'warning';
    if (points >= 500) return 'info';
    if (points >= 100) return 'primary';
    return 'secondary';
  };

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return '0.85em';
      case 'large':
        return '1.25em';
      default:
        return '1em';
    }
  };

  const tooltip = (
    <Tooltip id="seeding-breakdown">
      <div className="text-start">
        <strong>Seeding Score Breakdown</strong>
        <hr className="my-1" />
        <div>{player1Name}: {player1Points.toFixed(0)} pts</div>
        <div>{player2Name}: {player2Points.toFixed(0)} pts</div>
        <hr className="my-1" />
        <div><strong>Total: {score.toFixed(0)} pts</strong></div>
      </div>
    </Tooltip>
  );

  if (showBreakdown) {
    return (
      <OverlayTrigger placement="top" overlay={tooltip}>
        <span style={{ fontSize: getFontSize(), cursor: 'help' }}>
          <Badge bg={getSeedingBadgeVariant(score)} className="me-1">
            {score.toFixed(0)}
          </Badge>
          <span className="text-muted small">
            ({player1Points.toFixed(0)} + {player2Points.toFixed(0)})
          </span>
        </span>
      </OverlayTrigger>
    );
  }

  return (
    <span style={{ fontSize: getFontSize() }}>
      <Badge bg={getSeedingBadgeVariant(score)}>
        {score.toFixed(0)}
      </Badge>
    </span>
  );
};

export default PairSeedingDisplay;
