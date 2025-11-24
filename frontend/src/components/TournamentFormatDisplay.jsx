// T051: TournamentFormatDisplay - Display tournament format and configuration
import { Card, Badge, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

/**
 * Displays tournament format type and format-specific configuration
 *
 * @param {Object} props
 * @param {Object} props.tournament - Tournament data from getTournamentFormat
 * @param {string} props.tournament.formatType - KNOCKOUT, GROUP, SWISS, or COMBINED
 * @param {Object} props.tournament.formatConfig - Format-specific configuration
 */
const TournamentFormatDisplay = ({ tournament }) => {
  const { t } = useTranslation();

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
    return t(`tournamentFormat.types.${type.toLowerCase()}`, { defaultValue: type });
  };

  // Helper to get format type description
  const getFormatDescription = (type) => {
    return t(`tournamentFormat.descriptions.${type.toLowerCase()}`, { defaultValue: '' });
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
                <td><strong>{t('tournamentFormat.labels.matchGuarantee')}</strong></td>
                <td>
                  {formatConfig.matchGuarantee === 'MATCH_1' && t('tournamentFormat.values.singleElimination')}
                  {formatConfig.matchGuarantee === 'MATCH_2' && t('tournamentFormat.values.doubleElimination')}
                  {formatConfig.matchGuarantee === 'UNTIL_PLACEMENT' && t('tournamentFormat.values.untilPlacement')}
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
                <td><strong>{t('tournamentFormat.labels.groupSize')}</strong></td>
                <td>{t('tournamentFormat.values.playersPerGroup', { count: formatConfig.groupSize })}</td>
              </tr>
              {formatConfig.singleGroup && (
                <tr>
                  <td><strong>{t('tournamentFormat.labels.format')}</strong></td>
                  <td><Badge bg="info">{t('tournamentFormat.values.singleGroup')}</Badge></td>
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
                <td><strong>{t('tournamentFormat.labels.numberOfRounds')}</strong></td>
                <td>{t('tournamentFormat.values.roundsCount', { count: formatConfig.rounds })}</td>
              </tr>
            </tbody>
          </Table>
        );

      case 'COMBINED':
        return (
          <Table size="sm" className="mb-0">
            <tbody>
              <tr>
                <td><strong>{t('tournamentFormat.labels.groupSize')}</strong></td>
                <td>{t('tournamentFormat.values.playersPerGroup', { count: formatConfig.groupSize })}</td>
              </tr>
              <tr>
                <td><strong>{t('tournamentFormat.labels.advancementRules')}</strong></td>
                <td>
                  <div className="d-flex flex-column gap-1">
                    {formatConfig.advancementRules && formatConfig.advancementRules.map((rule, index) => (
                      <div key={index}>
                        <Badge bg={rule.bracket === 'MAIN' ? 'success' : rule.bracket === 'CONSOLATION' ? 'warning' : 'info'} className="me-1">
                          {rule.bracket}
                        </Badge>
                        <span className="small">{t('tournamentFormat.labels.place', { position: rule.position })}</span>
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
        <h5 className="mb-0">{t('tournamentFormat.title')}</h5>
      </Card.Header>
      <Card.Body>
        <div className="mb-3">
          <Badge bg={getFormatBadgeVariant(formatType)} className="me-2 fs-6">
            {getFormatDisplayName(formatType)}
          </Badge>
        </div>
        <p className="text-muted mb-3">{getFormatDescription(formatType)}</p>

        <h6 className="mb-2">{t('tournamentFormat.configuration')}</h6>
        {renderFormatConfig()}
      </Card.Body>
    </Card>
  );
};

export default TournamentFormatDisplay;
