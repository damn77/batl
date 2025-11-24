// T024: Tournament Header Component - Displays name, status badge, category badge, format badge
import { Card, Badge, Row, Col } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import TournamentFormatBadge from './TournamentFormatBadge';
import { getStatusBadgeVariant } from '../services/tournamentViewService';

/**
 * TournamentHeader - Displays tournament name and all status/category/format badges
 * FR-001: Display tournament identification
 * FR-002: Display format type badge
 */
const TournamentHeader = ({ tournament }) => {
  const { t } = useTranslation();

  if (!tournament) return null;

  // Format status for display
  const formatStatus = (status) => {
    return status.replace(/_/g, ' ');
  };

  // Get category label
  const getCategoryLabel = (category) => {
    if (!category) return t('tournament.noCategory');

    const type = t(`tournament.categories.${category.type}`, { defaultValue: category.type });
    const gender = t(`tournament.genders.${category.gender}`, { defaultValue: category.gender });
    const age = t(`tournament.ageGroups.${category.ageGroup}`, { defaultValue: category.ageGroup });

    return `${type} | ${gender} ${age}`;
  };

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        {/* Tournament Name */}
        <h1 className="display-5 mb-3">{tournament.name}</h1>

        {/* Description (if exists) */}
        {tournament.description && (
          <p className="text-muted mb-4">{tournament.description}</p>
        )}

        {/* Badges Row */}
        <Row className="g-3">
          <Col xs="auto">
            {/* Status Badge */}
            <div className="d-flex align-items-center gap-2">
              <small className="text-muted">{t('tournament.status')}:</small>
              <Badge
                bg={getStatusBadgeVariant(tournament.status)}
                className="px-3 py-2"
              >
                {formatStatus(tournament.status)}
              </Badge>
            </div>
          </Col>

          <Col xs="auto">
            {/* Category Badge */}
            <div className="d-flex align-items-center gap-2">
              <small className="text-muted">{t('tournament.category')}:</small>
              <Badge bg="info" className="px-3 py-2">
                {getCategoryLabel(tournament.category)}
              </Badge>
            </div>
          </Col>

          <Col xs="auto">
            {/* T025: Format Badge */}
            <div className="d-flex align-items-center gap-2">
              <small className="text-muted">{t('tournament.format')}:</small>
              <TournamentFormatBadge
                formatType={tournament.formatType}
                formatConfig={tournament.formatConfig}
              />
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default TournamentHeader;
