// T024: Tournament Header Component - Displays name, status badge, category badge, format badge
import { Card, Badge, Row, Col } from 'react-bootstrap';
import TournamentFormatBadge from './TournamentFormatBadge';
import { getStatusBadgeVariant } from '../services/tournamentViewService';

/**
 * TournamentHeader - Displays tournament name and all status/category/format badges
 * FR-001: Display tournament identification
 * FR-002: Display format type badge
 */
const TournamentHeader = ({ tournament }) => {
  if (!tournament) return null;

  // Format status for display
  const formatStatus = (status) => {
    return status.replace(/_/g, ' ');
  };

  // Get category label
  const getCategoryLabel = (category) => {
    if (!category) return 'No Category';

    const typeLabels = {
      SINGLES: 'Singles',
      DOUBLES: 'Doubles',
      MIXED_DOUBLES: 'Mixed Doubles'
    };

    const genderLabels = {
      MEN: 'Men',
      WOMEN: 'Women',
      MIXED: 'Mixed',
      OPEN: 'Open'
    };

    const ageLabels = {
      OPEN: 'Open',
      AGE_35: '35+',
      AGE_40: '40+',
      AGE_45: '45+',
      AGE_50: '50+',
      AGE_55: '55+',
      AGE_60: '60+',
      AGE_65: '65+',
      AGE_70: '70+',
      U12: 'U12',
      U14: 'U14',
      U16: 'U16',
      U18: 'U18'
    };

    const type = typeLabels[category.type] || category.type;
    const gender = genderLabels[category.gender] || category.gender;
    const age = ageLabels[category.ageGroup] || category.ageGroup;

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
              <small className="text-muted">Status:</small>
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
              <small className="text-muted">Category:</small>
              <Badge bg="info" className="px-3 py-2">
                {getCategoryLabel(tournament.category)}
              </Badge>
            </div>
          </Col>

          <Col xs="auto">
            {/* T025: Format Badge */}
            <div className="d-flex align-items-center gap-2">
              <small className="text-muted">Format:</small>
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
