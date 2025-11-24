// T026-T033: Tournament Info Panel Component - Two-column layout with all tournament details
import { useState } from 'react';
import { Card, Row, Col, Badge, Button, Collapse } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { getRuleComplexityInfo } from '../services/tournamentViewService';
import RuleComplexityIndicator from './RuleComplexityIndicator';
import TournamentRulesModal from './TournamentRulesModal';

// Info row component for consistent formatting - defined outside to prevent recreation on each render
const InfoRow = ({ label, value, link }) => {
  if (value === null || value === undefined || value === 'Not specified') {
    return null; // T031: Hide null/optional fields
  }

  return (
    <Row className="mb-3">
      <Col xs={5} className="text-muted">
        <small>{label}:</small>
      </Col>
      <Col xs={7}>
        {link ? (
          <Link to={link} className="text-decoration-none">
            {value}
          </Link>
        ) : (
          <strong>{value}</strong>
        )}
      </Col>
    </Row>
  );
};

/**
 * TournamentInfoPanel - Displays all tournament information in organized sections
 * FR-001: Display all general tournament information
 * FR-003: Display rule complexity indicator
 */
const TournamentInfoPanel = ({ tournament }) => {
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true); // Collapsible state - open by default

  if (!tournament) return null;

  // T029: Date formatting utility
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // T030: Currency formatting
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'Free';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Registration status calculation
  const getRegistrationStatus = () => {
    if (!tournament.registrationOpenDate || !tournament.registrationCloseDate) {
      return { status: 'Not configured', variant: 'secondary' };
    }

    const now = new Date();
    const openDate = new Date(tournament.registrationOpenDate);
    const closeDate = new Date(tournament.registrationCloseDate);

    if (now < openDate) {
      return { status: 'Not Yet Open', variant: 'info' };
    } else if (now > closeDate) {
      return { status: 'Registration Closed', variant: 'secondary' };
    } else {
      return { status: 'Registration Open', variant: 'success' };
    }
  };

  const registrationStatus = getRegistrationStatus();
  const ruleComplexityInfo = getRuleComplexityInfo(tournament.ruleComplexity);

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="mb-0">Tournament Information</h4>
          <Button
            variant="link"
            onClick={() => setDetailsOpen(!detailsOpen)}
            aria-controls="tournament-details-collapse"
            aria-expanded={detailsOpen}
            className="text-decoration-none p-0"
          >
            <span className="fs-5">{detailsOpen ? '▼' : '▶'}</span>
          </Button>
        </div>

        {/* T034: Responsive two-column layout - Collapsible */}
        <Collapse in={detailsOpen}>
          <div id="tournament-details-collapse">
            <Row>
          {/* T027: Location & Schedule Column */}
          <Col lg={6} className="mb-4 mb-lg-0">
            <Card className="h-100 border">
              <Card.Header className="bg-light">
                <h5 className="mb-0">Location & Schedule</h5>
              </Card.Header>
              <Card.Body>
                {/* Primary Location */}
                {tournament.location && (
                  <>
                    <h6 className="text-muted mb-3">Primary Location</h6>
                    <InfoRow label="Club" value={tournament.location.clubName} />
                    <InfoRow label="Address" value={tournament.location.address} />
                    <hr />
                  </>
                )}

                {/* Backup Location */}
                {tournament.backupLocation && (
                  <>
                    <h6 className="text-muted mb-3">
                      Backup Location{' '}
                      <Badge bg="warning" className="ms-2">
                        Weather Contingency
                      </Badge>
                    </h6>
                    <InfoRow label="Club" value={tournament.backupLocation.clubName} />
                    <InfoRow label="Address" value={tournament.backupLocation.address} />
                    <hr />
                  </>
                )}

                {/* Courts */}
                <InfoRow
                  label="Courts Available"
                  value={tournament.courts ? `${tournament.courts} courts` : null}
                />

                {/* Tournament Dates */}
                <h6 className="text-muted mb-3 mt-4">Tournament Dates</h6>
                <InfoRow label="Start Date" value={formatDate(tournament.startDate)} />
                <InfoRow label="End Date" value={formatDate(tournament.endDate)} />

                {/* Registration Window */}
                <h6 className="text-muted mb-3 mt-4">Registration Window</h6>
                <InfoRow label="Opens" value={formatDateTime(tournament.registrationOpenDate)} />
                <InfoRow label="Closes" value={formatDateTime(tournament.registrationCloseDate)} />

                {/* Timestamps */}
                <h6 className="text-muted mb-3 mt-4">Tournament History</h6>
                <InfoRow label="Created" value={formatDate(tournament.createdAt)} />
                {tournament.lastStatusChange && (
                  <InfoRow label="Last Status Change" value={formatDateTime(tournament.lastStatusChange)} />
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* T028: Organizer & Registration Column */}
          <Col lg={6}>
            <Card className="h-100 border">
              <Card.Header className="bg-light">
                <h5 className="mb-0">Organizer & Registration</h5>
              </Card.Header>
              <Card.Body>
                {/* Primary Organizer */}
                {tournament.organizer && (
                  <>
                    <h6 className="text-muted mb-3">Primary Organizer</h6>
                    <InfoRow label="Name" value={tournament.organizer.name} />
                    <InfoRow label="Email" value={tournament.organizer.email} />
                    <InfoRow label="Phone" value={tournament.organizer.phone} />
                    <hr />
                  </>
                )}

                {/* Deputy Organizer */}
                {tournament.deputyOrganizer && (
                  <>
                    <h6 className="text-muted mb-3">Deputy Organizer</h6>
                    <InfoRow label="Name" value={tournament.deputyOrganizer.name} />
                    <InfoRow label="Email" value={tournament.deputyOrganizer.email} />
                    <InfoRow label="Phone" value={tournament.deputyOrganizer.phone} />
                    <hr />
                  </>
                )}

                {/* Entry Fee & Prize */}
                <h6 className="text-muted mb-3 mt-4">Fees & Prizes</h6>
                <Row className="mb-3">
                  <Col xs={5} className="text-muted">
                    <small>Entry Fee:</small>
                  </Col>
                  <Col xs={7}>
                    <strong className={tournament.entryFee > 0 ? 'text-success' : ''}>
                      {formatCurrency(tournament.entryFee)}
                    </strong>
                  </Col>
                </Row>

                {tournament.prizeDescription && (
                  <Row className="mb-3">
                    <Col xs={5} className="text-muted">
                      <small>Prizes:</small>
                    </Col>
                    <Col xs={7}>
                      <strong>{tournament.prizeDescription}</strong>
                    </Col>
                  </Row>
                )}

                {/* T033: External Rules Link */}
                {tournament.rulesUrl && (
                  <Row className="mb-3">
                    <Col xs={5} className="text-muted">
                      <small>Rules:</small>
                    </Col>
                    <Col xs={7}>
                      <a
                        href={tournament.rulesUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-decoration-none"
                      >
                        View External Rules →
                      </a>
                    </Col>
                  </Row>
                )}

                {/* Registration Information */}
                <h6 className="text-muted mb-3 mt-4">Registration</h6>
                <Row className="mb-3">
                  <Col xs={5} className="text-muted">
                    <small>Status:</small>
                  </Col>
                  <Col xs={7}>
                    <Badge bg={registrationStatus.variant} className="px-2 py-1">
                      {registrationStatus.status}
                    </Badge>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col xs={5} className="text-muted">
                    <small>Registered:</small>
                  </Col>
                  <Col xs={7}>
                    <strong>
                      {tournament.registrationCount || 0}
                      {tournament.capacity && ` / ${tournament.capacity}`}
                    </strong>
                  </Col>
                </Row>

                {tournament.waitlistCount > 0 && (
                  <Row className="mb-3">
                    <Col xs={5} className="text-muted">
                      <small>Waitlist:</small>
                    </Col>
                    <Col xs={7}>
                      <strong>{tournament.waitlistCount}</strong>
                      {tournament.waitlistDisplayOrder && (
                        <small className="text-muted ms-2">
                          ({tournament.waitlistDisplayOrder === 'REGISTRATION_TIME' ? 'First-come' : 'Alphabetical'})
                        </small>
                      )}
                    </Col>
                  </Row>
                )}

                {tournament.minParticipants && (
                  <InfoRow label="Min. Participants" value={tournament.minParticipants} />
                )}

                {!tournament.capacity && (
                  <Row className="mb-3">
                    <Col xs={12}>
                      <Badge bg="info" className="px-2 py-1">
                        Unlimited Capacity
                      </Badge>
                    </Col>
                  </Row>
                )}

                {/* Rule Complexity Indicator */}
                <h6 className="text-muted mb-3 mt-4">Tournament Rules</h6>
                <Row className="mb-3">
                  <Col xs={5} className="text-muted">
                    <small>Complexity:</small>
                  </Col>
                  <Col xs={7}>
                    <RuleComplexityIndicator complexity={tournament.ruleComplexity} />
                    <div>
                      <small className="text-muted">{ruleComplexityInfo.description}</small>
                    </div>
                  </Col>
                </Row>

                {/* T045: View Rules Button */}
                <Row className="mb-3">
                  <Col xs={12}>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => setShowRulesModal(true)}
                      className="w-100 d-flex align-items-center justify-content-center gap-2"
                    >
                      <span>📋</span>
                      <span>View Tournament Rules</span>
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
          </div>
        </Collapse>
      </Card.Body>

      {/* T040: Tournament Rules Modal */}
      <TournamentRulesModal
        show={showRulesModal}
        onHide={() => setShowRulesModal(false)}
        tournament={tournament}
      />
    </Card>
  );
};

export default TournamentInfoPanel;
