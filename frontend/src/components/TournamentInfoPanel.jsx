// T026-T033: Tournament Info Panel Component - Accordion items with compact layout
import { useState } from 'react';
import { Accordion, Badge, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getRuleComplexityInfo } from '../services/tournamentViewService';
import RuleComplexityIndicator from './RuleComplexityIndicator';
import TournamentRulesModal from './TournamentRulesModal';
import OrganizerRegistrationPanel from './OrganizerRegistrationPanel';

// Compact flex-based info row — hides null/undefined/not-specified values
const InfoRow = ({ label, value, link }) => {
  if (value === null || value === undefined || value === 'Not specified') return null;
  return (
    <div className="d-flex justify-content-between align-items-baseline py-1 border-bottom border-light">
      <span className="text-muted" style={{ fontSize: '0.8rem' }}>{label}</span>
      <span className="fw-semibold text-end ms-2" style={{ fontSize: '0.85rem' }}>
        {link ? <Link to={link} className="text-decoration-none">{value}</Link> : value}
      </span>
    </div>
  );
};

/**
 * TournamentInfoPanel - Renders two Accordion.Item elements for use inside a parent Accordion.
 * eventKey="location-schedule" — Location & Schedule section
 * eventKey="organizer-registration" — Organizer & Registration section
 *
 * FR-001: Display all general tournament information
 * FR-003: Display rule complexity indicator
 */
const TournamentInfoPanel = ({ tournament, user, onRegistrationComplete }) => {
  const { t, i18n } = useTranslation();
  const [showRulesModal, setShowRulesModal] = useState(false);

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
    if (tournament.registrationClosed) {
      return { status: t('tournament.registrationStatus.closed'), variant: 'secondary' };
    }

    if (tournament.registrationOpenDate && tournament.registrationCloseDate) {
      const now = new Date();
      const openDate = new Date(tournament.registrationOpenDate);
      const closeDate = new Date(tournament.registrationCloseDate);

      if (now < openDate) {
        return { status: t('tournament.registrationStatus.notYetOpen'), variant: 'info' };
      } else if (now > closeDate) {
        return { status: t('tournament.registrationStatus.closed'), variant: 'secondary' };
      }
    }

    return { status: t('tournament.registrationStatus.open'), variant: 'success' };
  };

  const registrationStatus = getRegistrationStatus();
  const ruleComplexityInfo = getRuleComplexityInfo(tournament.ruleComplexity);

  return (
    <>
      {/* First Accordion.Item: Location & Schedule */}
      <Accordion.Item eventKey="location-schedule">
        <Accordion.Header>{t('tournament.sections.locationSchedule')}</Accordion.Header>
        <Accordion.Body className="px-3 py-2">
          {/* Primary Location */}
          {tournament.location && (
            <>
              <p className="small fw-bold text-muted mb-2 mt-1">{t('tournament.sections.primaryLocation')}</p>
              <InfoRow label={t('tournament.labels.club')} value={tournament.location.clubName} />
              <InfoRow label={t('tournament.labels.address')} value={tournament.location.address} />
            </>
          )}

          {/* Backup Location */}
          {tournament.backupLocation && (
            <>
              <p className="small fw-bold text-muted mb-2 mt-3">
                {t('tournament.sections.backupLocation')}{' '}
                <Badge bg="warning" className="ms-2">
                  {t('tournament.sections.weatherContingency')}
                </Badge>
              </p>
              <InfoRow label={t('tournament.labels.club')} value={tournament.backupLocation.clubName} />
              <InfoRow label={t('tournament.labels.address')} value={tournament.backupLocation.address} />
            </>
          )}

          {/* Courts */}
          <InfoRow
            label={t('tournament.labels.courtsAvailable')}
            value={tournament.courts ? t('tournament.values.courtsCount', { count: tournament.courts }) : null}
          />

          {/* Tournament Dates */}
          <p className="small fw-bold text-muted mb-2 mt-3">{t('tournament.sections.dates')}</p>
          <InfoRow label={t('tournament.labels.startDate')} value={formatDate(tournament.startDate)} />
          <InfoRow label={t('tournament.labels.endDate')} value={formatDate(tournament.endDate)} />

          {/* Registration Window */}
          <p className="small fw-bold text-muted mb-2 mt-3">{t('tournament.sections.registrationWindow')}</p>
          <InfoRow label={t('tournament.labels.opens')} value={formatDateTime(tournament.registrationOpenDate)} />
          <InfoRow label={t('tournament.labels.closes')} value={formatDateTime(tournament.registrationCloseDate)} />

          {/* Timestamps */}
          <p className="small fw-bold text-muted mb-2 mt-3">{t('tournament.sections.history')}</p>
          <InfoRow label={t('tournament.labels.created')} value={formatDate(tournament.createdAt)} />
          {tournament.lastStatusChange && (
            <InfoRow label={t('tournament.labels.lastStatusChange')} value={formatDateTime(tournament.lastStatusChange)} />
          )}
        </Accordion.Body>
      </Accordion.Item>

      {/* Second Accordion.Item: Organizer & Registration */}
      <Accordion.Item eventKey="organizer-registration">
        <Accordion.Header>{t('tournament.sections.organizerRegistration')}</Accordion.Header>
        <Accordion.Body className="px-3 py-2">
          {/* Primary Organizer */}
          {tournament.organizer && (
            <>
              <p className="small fw-bold text-muted mb-2 mt-1">{t('tournament.sections.primaryOrganizer')}</p>
              <InfoRow label={t('tournament.labels.name')} value={tournament.organizer.name} />
              <InfoRow label={t('tournament.labels.email')} value={tournament.organizer.email} />
              <InfoRow label={t('tournament.labels.phone')} value={tournament.organizer.phone} />
            </>
          )}

          {/* Deputy Organizer */}
          {tournament.deputyOrganizer && (
            <>
              <p className="small fw-bold text-muted mb-2 mt-3">{t('tournament.sections.deputyOrganizer')}</p>
              <InfoRow label={t('tournament.labels.name')} value={tournament.deputyOrganizer.name} />
              <InfoRow label={t('tournament.labels.email')} value={tournament.deputyOrganizer.email} />
              <InfoRow label={t('tournament.labels.phone')} value={tournament.deputyOrganizer.phone} />
            </>
          )}

          {/* Entry Fee & Prize */}
          <p className="small fw-bold text-muted mb-2 mt-3">{t('tournament.sections.feesPrizes')}</p>
          <div className="d-flex justify-content-between align-items-baseline py-1 border-bottom border-light">
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>{t('tournament.labels.entryFee')}</span>
            <span className={`fw-semibold text-end ms-2${tournament.entryFee > 0 ? ' text-success' : ''}`} style={{ fontSize: '0.85rem' }}>
              {formatCurrency(tournament.entryFee)}
            </span>
          </div>
          <InfoRow label={t('tournament.labels.prizes')} value={tournament.prizeDescription} />

          {/* T033: External Rules Link */}
          {tournament.rulesUrl && (
            <div className="d-flex justify-content-between align-items-baseline py-1 border-bottom border-light">
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>{t('tournament.labels.rules')}</span>
              <span className="fw-semibold text-end ms-2" style={{ fontSize: '0.85rem' }}>
                <a
                  href={tournament.rulesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-decoration-none"
                >
                  {t('tournament.actions.viewExternalRules')} →
                </a>
              </span>
            </div>
          )}

          {/* Registration Information */}
          <p className="small fw-bold text-muted mb-2 mt-3">{t('tournament.sections.registrationWindow')}</p>
          <div className="d-flex justify-content-between align-items-baseline py-1 border-bottom border-light">
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>{t('tournament.status')}</span>
            <span className="fw-semibold text-end ms-2" style={{ fontSize: '0.85rem' }}>
              <Badge bg={registrationStatus.variant} className="px-2 py-1">
                {registrationStatus.status}
              </Badge>
            </span>
          </div>
          <div className="d-flex justify-content-between align-items-baseline py-1 border-bottom border-light">
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>{t('tournament.labels.registered')}</span>
            <span className="fw-semibold text-end ms-2" style={{ fontSize: '0.85rem' }}>
              {tournament.registrationCount || 0}
              {tournament.capacity && ` / ${tournament.capacity}`}
            </span>
          </div>

          {tournament.waitlistCount > 0 && (
            <div className="d-flex justify-content-between align-items-baseline py-1 border-bottom border-light">
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>{t('tournament.labels.waitlist')}</span>
              <span className="fw-semibold text-end ms-2" style={{ fontSize: '0.85rem' }}>
                {tournament.waitlistCount}
                {tournament.waitlistDisplayOrder && (
                  <small className="text-muted ms-2">
                    ({tournament.waitlistDisplayOrder === 'REGISTRATION_TIME' ? t('tournament.values.firstCome') : t('tournament.values.alphabetical')})
                  </small>
                )}
              </span>
            </div>
          )}

          <InfoRow label={t('tournament.labels.minParticipants')} value={tournament.minParticipants} />

          {!tournament.capacity && (
            <div className="py-1">
              <Badge bg="info" className="px-2 py-1">
                {t('tournament.values.unlimitedCapacity')}
              </Badge>
            </div>
          )}

          {/* Rule Complexity Indicator */}
          <p className="small fw-bold text-muted mb-2 mt-3">{t('tournament.sections.rules')}</p>
          <div className="d-flex justify-content-between align-items-baseline py-1 border-bottom border-light">
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>{t('tournament.labels.complexity')}</span>
            <span className="fw-semibold text-end ms-2" style={{ fontSize: '0.85rem' }}>
              <RuleComplexityIndicator complexity={tournament.ruleComplexity} />
              <div>
                <small className="text-muted">{ruleComplexityInfo.description}</small>
              </div>
            </span>
          </div>

          {/* T045: View Rules Button */}
          <div className="py-2 mt-1">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => setShowRulesModal(true)}
              className="w-100 d-flex align-items-center justify-content-center gap-2"
            >
              <span>📋</span>
              <span>{t('tournament.actions.viewTournamentRules')}</span>
            </Button>
          </div>

          {/* Organizer Registration Panel — role-gated, renders for ORGANIZER/ADMIN */}
          {(user?.role === 'ORGANIZER' || user?.role === 'ADMIN') && (
            <div className="mt-3">
              <OrganizerRegistrationPanel
                tournament={tournament}
                onRegistrationComplete={onRegistrationComplete}
              />
            </div>
          )}
        </Accordion.Body>
      </Accordion.Item>

      {/* T040: Tournament Rules Modal */}
      <TournamentRulesModal
        show={showRulesModal}
        onHide={() => setShowRulesModal(false)}
        tournament={tournament}
      />
    </>
  );
};

export default TournamentInfoPanel;
