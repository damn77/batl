// T026-T033: Tournament Info Panel Component - Two-column layout with all tournament details
import { useState } from 'react';
import { Card, Row, Col, Badge, Button, Collapse } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true); // Collapsible state - open by default

  if (!tournament) return null;

  // T029: Date formatting utility
  const formatDate = (dateString) => {
    if (!dateString) return t('tournament.values.notSpecified');
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return t('tournament.values.notSpecified');
    const date = new Date(dateString);
    return date.toLocaleString(i18n.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // T030: Currency formatting
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return t('tournament.values.free');
    return new Intl.NumberFormat(i18n.language === 'sk' ? 'sk-SK' : 'en-US', {
      style: 'currency',
      currency: i18n.language === 'sk' ? 'EUR' : 'USD'
    }).format(amount);
  };

  // Registration status calculation
  const getRegistrationStatus = () => {
    if (!tournament.registrationOpenDate || !tournament.registrationCloseDate) {
      return { status: t('tournament.registrationStatus.notConfigured'), variant: 'secondary' };
    }

    const now = new Date();
    const openDate = new Date(tournament.registrationOpenDate);
    const closeDate = new Date(tournament.registrationCloseDate);

    if (now < openDate) {
      return { status: t('tournament.registrationStatus.notYetOpen'), variant: 'info' };
    } else if (now > closeDate) {
      return { status: t('tournament.registrationStatus.closed'), variant: 'secondary' };
    } else {
      return { status: t('tournament.registrationStatus.open'), variant: 'success' };
    }
  };

  const registrationStatus = getRegistrationStatus();
  const ruleComplexityInfo = getRuleComplexityInfo(tournament.ruleComplexity);

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="mb-0">{t('tournament.title')}</h4>
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
                    <h5 className="mb-0">{t('tournament.sections.locationSchedule')}</h5>
                  </Card.Header>
                  <Card.Body>
                    {/* Primary Location */}
                    {tournament.location && (
                      <>
                        <h6 className="text-muted mb-3">{t('tournament.sections.primaryLocation')}</h6>
                        <InfoRow label={t('tournament.labels.club')} value={tournament.location.clubName} />
                        <InfoRow label={t('tournament.labels.address')} value={tournament.location.address} />
                        <hr />
                      </>
                    )}

                    {/* Backup Location */}
                    {tournament.backupLocation && (
                      <>
                        <h6 className="text-muted mb-3">
                          {t('tournament.sections.backupLocation')}{' '}
                          <Badge bg="warning" className="ms-2">
                            {t('tournament.sections.weatherContingency')}
                          </Badge>
                        </h6>
                        <InfoRow label={t('tournament.labels.club')} value={tournament.backupLocation.clubName} />
                        <InfoRow label={t('tournament.labels.address')} value={tournament.backupLocation.address} />
                        <hr />
                      </>
                    )}

                    {/* Courts */}
                    <InfoRow
                      label={t('tournament.labels.courtsAvailable')}
                      value={tournament.courts ? t('tournament.values.courtsCount', { count: tournament.courts }) : null}
                    />

                    {/* Tournament Dates */}
                    <h6 className="text-muted mb-3 mt-4">{t('tournament.sections.dates')}</h6>
                    <InfoRow label={t('tournament.labels.startDate')} value={formatDate(tournament.startDate)} />
                    <InfoRow label={t('tournament.labels.endDate')} value={formatDate(tournament.endDate)} />

                    {/* Registration Window */}
                    <h6 className="text-muted mb-3 mt-4">{t('tournament.sections.registrationWindow')}</h6>
                    <InfoRow label={t('tournament.labels.opens')} value={formatDateTime(tournament.registrationOpenDate)} />
                    <InfoRow label={t('tournament.labels.closes')} value={formatDateTime(tournament.registrationCloseDate)} />

                    {/* Timestamps */}
                    <h6 className="text-muted mb-3 mt-4">{t('tournament.sections.history')}</h6>
                    <InfoRow label={t('tournament.labels.created')} value={formatDate(tournament.createdAt)} />
                    {tournament.lastStatusChange && (
                      <InfoRow label={t('tournament.labels.lastStatusChange')} value={formatDateTime(tournament.lastStatusChange)} />
                    )}
                  </Card.Body>
                </Card>
              </Col>

              {/* T028: Organizer & Registration Column */}
              <Col lg={6}>
                <Card className="h-100 border">
                  <Card.Header className="bg-light">
                    <h5 className="mb-0">{t('tournament.sections.organizerRegistration')}</h5>
                  </Card.Header>
                  <Card.Body>
                    {/* Primary Organizer */}
                    {tournament.organizer && (
                      <>
                        <h6 className="text-muted mb-3">{t('tournament.sections.primaryOrganizer')}</h6>
                        <InfoRow label={t('tournament.labels.name')} value={tournament.organizer.name} />
                        <InfoRow label={t('tournament.labels.email')} value={tournament.organizer.email} />
                        <InfoRow label={t('tournament.labels.phone')} value={tournament.organizer.phone} />
                        <hr />
                      </>
                    )}

                    {/* Deputy Organizer */}
                    {tournament.deputyOrganizer && (
                      <>
                        <h6 className="text-muted mb-3">{t('tournament.sections.deputyOrganizer')}</h6>
                        <InfoRow label={t('tournament.labels.name')} value={tournament.deputyOrganizer.name} />
                        <InfoRow label={t('tournament.labels.email')} value={tournament.deputyOrganizer.email} />
                        <InfoRow label={t('tournament.labels.phone')} value={tournament.deputyOrganizer.phone} />
                        <hr />
                      </>
                    )}

                    {/* Entry Fee & Prize */}
                    <h6 className="text-muted mb-3 mt-4">{t('tournament.sections.feesPrizes')}</h6>
                    <Row className="mb-3">
                      <Col xs={5} className="text-muted">
                        <small>{t('tournament.labels.entryFee')}:</small>
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
                          <small>{t('tournament.labels.prizes')}:</small>
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
                          <small>{t('tournament.labels.rules')}:</small>
                        </Col>
                        <Col xs={7}>
                          <a
                            href={tournament.rulesUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-decoration-none"
                          >
                            {t('tournament.actions.viewExternalRules')} →
                          </a>
                        </Col>
                      </Row>
                    )}

                    {/* Registration Information */}
                    <h6 className="text-muted mb-3 mt-4">{t('tournament.sections.registrationWindow')}</h6>
                    <Row className="mb-3">
                      <Col xs={5} className="text-muted">
                        <small>{t('tournament.status')}:</small>
                      </Col>
                      <Col xs={7}>
                        <Badge bg={registrationStatus.variant} className="px-2 py-1">
                          {registrationStatus.status}
                        </Badge>
                      </Col>
                    </Row>

                    <Row className="mb-3">
                      <Col xs={5} className="text-muted">
                        <small>{t('tournament.labels.registered')}:</small>
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
                          <small>{t('tournament.labels.waitlist')}:</small>
                        </Col>
                        <Col xs={7}>
                          <strong>{tournament.waitlistCount}</strong>
                          {tournament.waitlistDisplayOrder && (
                            <small className="text-muted ms-2">
                              ({tournament.waitlistDisplayOrder === 'REGISTRATION_TIME' ? t('tournament.values.firstCome') : t('tournament.values.alphabetical')})
                            </small>
                          )}
                        </Col>
                      </Row>
                    )}

                    {tournament.minParticipants && (
                      <InfoRow label={t('tournament.labels.minParticipants')} value={tournament.minParticipants} />
                    )}

                    {!tournament.capacity && (
                      <Row className="mb-3">
                        <Col xs={12}>
                          <Badge bg="info" className="px-2 py-1">
                            {t('tournament.values.unlimitedCapacity')}
                          </Badge>
                        </Col>
                      </Row>
                    )}

                    {/* Rule Complexity Indicator */}
                    <h6 className="text-muted mb-3 mt-4">{t('tournament.sections.rules')}</h6>
                    <Row className="mb-3">
                      <Col xs={5} className="text-muted">
                        <small>{t('tournament.labels.complexity')}:</small>
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
                          <span>{t('tournament.actions.viewTournamentRules')}</span>
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
