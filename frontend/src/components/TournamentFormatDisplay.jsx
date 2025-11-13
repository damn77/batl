// T051: TournamentFormatDisplay - Display tournament format and configuration
import { Card, Badge, Table } from 'react-bootstrap';

/**
 * Displays tournament format type and format-specific configuration
 *
 * @param {Object} props
 * @param {Object} props.tournament - Tournament data from getTournamentFormat
 * @param {string} props.tournament.formatType - KNOCKOUT, GROUP, SWISS, or COMBINED
 * @param {Object} props.tournament.formatConfig - Format-specific configuration
 */
const TournamentFormatDisplay = ({ tournament }) => {
  if (!tournament) {
    return null;
  }

  const { formatType, formatConfig } = tournament;

  // Helper to get format type badge variant
  const getFormatBadgeVariant = (type) => {
    const variants = {
      KNOCKOUT: 'danger',
      GROUP: 'success',
      SWISS: 'info',
      COMBINED: 'warning'
    };
    return variants[type] || 'secondary';
  };

  // Helper to get format type display name
  const getFormatDisplayName = (type) => {
    const names = {
      KNOCKOUT: 'Knockout',
      GROUP: 'Group Stage',
      SWISS: 'Swiss System',
      COMBINED: 'Combined (Group + Knockout)'
    };
    return names[type] || type;
  };

  // Helper to get format type description
  const getFormatDescription = (type) => {
    const descriptions = {
      KNOCKOUT: 'Single or double elimination bracket format',
      GROUP: 'Round-robin groups with all players facing each other',
      SWISS: 'Swiss system with players matched by performance',
      COMBINED: 'Group stage followed by knockout brackets'
    };
    return descriptions[type] || '';
  };

  // Render format-specific configuration
  const renderFormatConfig = () => {
    if (!formatConfig) return null;

    switch (formatType) {
      case 'KNOCKOUT':
        return (
          <Table size="sm" className="mb-0">
            <tbody>
              <tr>
                <td><strong>Match Guarantee</strong></td>
                <td>
                  {formatConfig.matchGuarantee === 'MATCH_1' && 'Single Elimination (1 match)'}
                  {formatConfig.matchGuarantee === 'MATCH_2' && 'Double Elimination (2 match guarantee)'}
                  {formatConfig.matchGuarantee === 'UNTIL_PLACEMENT' && 'Until Placement (full bracket)'}
                </td>
              </tr>
            </tbody>
          </Table>
        );

      case 'GROUP':
        return (
          <Table size="sm" className="mb-0">
            <tbody>
              <tr>
                <td><strong>Group Size</strong></td>
                <td>{formatConfig.groupSize} players per group</td>
              </tr>
              {formatConfig.singleGroup && (
                <tr>
                  <td><strong>Format</strong></td>
                  <td><Badge bg="info">Single Group</Badge></td>
                </tr>
              )}
            </tbody>
          </Table>
        );

      case 'SWISS':
        return (
          <Table size="sm" className="mb-0">
            <tbody>
              <tr>
                <td><strong>Number of Rounds</strong></td>
                <td>{formatConfig.rounds} rounds</td>
              </tr>
            </tbody>
          </Table>
        );

      case 'COMBINED':
        return (
          <Table size="sm" className="mb-0">
            <tbody>
              <tr>
                <td><strong>Group Size</strong></td>
                <td>{formatConfig.groupSize} players per group</td>
              </tr>
              <tr>
                <td><strong>Advancement Rules</strong></td>
                <td>
                  <div className="d-flex flex-column gap-1">
                    {formatConfig.advancementRules && formatConfig.advancementRules.map((rule, index) => (
                      <div key={index}>
                        <Badge bg={rule.bracket === 'MAIN' ? 'success' : rule.bracket === 'CONSOLATION' ? 'warning' : 'info'} className="me-1">
                          {rule.bracket}
                        </Badge>
                        <span className="small">Place {rule.position}</span>
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            </tbody>
          </Table>
        );

      default:
        return (
          <pre className="small mb-0">
            {JSON.stringify(formatConfig, null, 2)}
          </pre>
        );
    }
  };

  return (
    <Card>
      <Card.Header>
        <h5 className="mb-0">Tournament Format</h5>
      </Card.Header>
      <Card.Body>
        <div className="mb-3">
          <Badge bg={getFormatBadgeVariant(formatType)} className="me-2 fs-6">
            {getFormatDisplayName(formatType)}
          </Badge>
        </div>
        <p className="text-muted mb-3">{getFormatDescription(formatType)}</p>

        <h6 className="mb-2">Configuration</h6>
        {renderFormatConfig()}
      </Card.Body>
    </Card>
  );
};

export default TournamentFormatDisplay;
