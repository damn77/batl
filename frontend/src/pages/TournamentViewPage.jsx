// T022-T038: Tournament View Page - Comprehensive tournament information display
import { useState } from 'react';
import { Container, Row, Col, Alert, Spinner, Breadcrumb, Button, Accordion } from 'react-bootstrap';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import NavBar from '../components/NavBar';
import TournamentHeader from '../components/TournamentHeader';
import TournamentInfoPanel from '../components/TournamentInfoPanel';
import PlayerListPanel from '../components/PlayerListPanel';
import FormatVisualization from '../components/FormatVisualization';
import PointPreviewPanel from '../components/PointPreviewPanel';
import ConsolationOptOutPanel from '../components/ConsolationOptOutPanel';
import { useTournament, useFormatStructure } from '../services/tournamentViewService';
import { startTournament } from '../services/tournamentService';
import { useAuth } from '../utils/AuthContext';
import { buildSectionOrder, getDefaultActiveKeys } from '../utils/tournamentSectionOrder';

/**
 * T022: TournamentViewPage - Main page component for tournament view
 * FR-001: Display all general tournament information
 * FR-002: Display tournament format
 * FR-006: Public access (no authentication required)
 * FR-007: Responsive design
 */
const TournamentViewPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user } = useAuth();

  // T021: Use SWR hook for data fetching with automatic revalidation
  const { tournament, isLoading, isError, mutate: mutateTournament } = useTournament(id);

  // Load format structure for manual draw detection (Start button needs this)
  const { structure: formatStructure } = useFormatStructure(id, tournament?.status === 'SCHEDULED');

  // Derive manual draw state for Start button UI
  const mainBracket = formatStructure?.brackets?.find(b => b.bracketType === 'MAIN');
  const isManualDraw = mainBracket?.drawMode === 'MANUAL';
  const hasBracket = !!(formatStructure?.brackets?.length > 0);

  const [startError, setStartError] = useState(null);
  const [registrationVersion, setRegistrationVersion] = useState(0);

  // formatConfig arrives as a JSON string from the API — parse it once here
  const parsedFormatConfig = (() => {
    const raw = tournament?.formatConfig;
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch { return {}; }
  })();

  const handleStartTournament = async () => {
    if (!window.confirm('Start this tournament? Registration will close immediately and players will no longer be able to register.')) return;
    try {
      setStartError(null);
      await startTournament(tournament.id);
      mutateTournament(); // SWR cache bust — reloads tournament with new status
    } catch (err) {
      setStartError(err.message || 'Failed to start tournament');
    }
  };

  // Determine tournaments list link based on tournament status and user role
  const getTournamentsLink = () => {
    if (tournament?.status === 'COMPLETED') return '/tournaments';
    if (!user) return '/tournaments';
    if (user.role === 'PLAYER') return '/player/tournaments';
    if (user.role === 'ORGANIZER' || user.role === 'ADMIN') return '/organizer/tournaments';
    return '/tournaments';
  };

  return (
    <>
      <NavBar />
      <Container className="py-4">
        {/* T032: Breadcrumb navigation */}
        <Breadcrumb className="mb-3">
          <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/' }}>
            {t('nav.home')}
          </Breadcrumb.Item>
          <Breadcrumb.Item linkAs={Link} linkProps={{ to: getTournamentsLink() }}>
            {t('nav.tournaments')}
          </Breadcrumb.Item>
          <Breadcrumb.Item active>
            {tournament?.name || t('pages.tournamentView.defaultTitle')}
          </Breadcrumb.Item>
        </Breadcrumb>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-5">
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">{t('common.loadingTournament')}</span>
            </Spinner>
            <p className="mt-3 text-muted">{t('messages.loadingTournamentDetails')}</p>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <Alert variant="danger">
            <Alert.Heading>{t('errors.tournamentNotFound')}</Alert.Heading>
            <p>
              {t('errors.tournamentNotFoundDescription')}
            </p>
            <hr />
            <div className="d-flex justify-content-end">
              <Link to="/tournaments" className="btn btn-outline-danger">
                {t('buttons.backToTournaments')}
              </Link>
            </div>
          </Alert>
        )}

        {/* Tournament content */}
        {tournament && (() => {
          const renderSection = (key) => {
            switch (key) {
              case 'location-schedule':
                // TournamentInfoPanel renders BOTH location-schedule and organizer-registration
                // Accordion.Items as a fragment — render once here for the first key
                return (
                  <TournamentInfoPanel
                    key="info-panel"
                    tournament={tournament}
                    user={user}
                    onRegistrationComplete={() => { mutateTournament(); setRegistrationVersion((v) => v + 1); }}
                  />
                );
              case 'organizer-registration':
                // Already rendered by TournamentInfoPanel fragment above
                return null;
              case 'format':
                // Skip format accordion when hero bracket is already visible (IN_PROGRESS/COMPLETED)
                if (tournament.status === 'IN_PROGRESS' || tournament.status === 'COMPLETED') {
                  return null;
                }
                return (
                  <Accordion.Item key={key} eventKey={key}>
                    <Accordion.Header>
                      {t('components.formatVisualization.formatTypes.' + (tournament.formatType?.toLowerCase() || 'unknown'))}
                    </Accordion.Header>
                    <Accordion.Body className="p-0">
                      <FormatVisualization tournament={tournament} mutateTournament={mutateTournament} registrationVersion={registrationVersion} />
                    </Accordion.Body>
                  </Accordion.Item>
                );
              case 'players':
                return (
                  <Accordion.Item key={key} eventKey={key}>
                    <Accordion.Header>{t('tournament.sections.players', 'Players')}</Accordion.Header>
                    <Accordion.Body className="p-0">
                      <PlayerListPanel tournament={tournament} refreshKey={registrationVersion} />
                    </Accordion.Body>
                  </Accordion.Item>
                );
              case 'points':
                return (
                  <Accordion.Item key={key} eventKey={key}>
                    <Accordion.Header>{t('tournament.sections.points', 'Points')}</Accordion.Header>
                    <Accordion.Body className="p-0">
                      <PointPreviewPanel tournamentId={tournament.id} />
                    </Accordion.Body>
                  </Accordion.Item>
                );
              default:
                return null;
            }
          };

          return (
            <>
              {/* T024: Tournament Header - Name, status badge, category badge, format badge */}
              <TournamentHeader tournament={tournament} />

              {/* Champion banner — COMPLETED tournaments, rendered above everything else (LAYOUT-05) */}
              {tournament.status === 'COMPLETED' && tournament.champion && (
                <Alert variant="warning" className="mt-3 text-center fs-5">
                  Champion: <strong>{tournament.champion.name}</strong>
                </Alert>
              )}

              {/* Start Tournament — ORGANIZER/ADMIN only, SCHEDULED tournaments only (LIFE-01, LIFE-02) */}
              {(user?.role === 'ORGANIZER' || user?.role === 'ADMIN') && tournament.status === 'SCHEDULED' && (
                <Row className="mt-3">
                  <Col className="d-flex justify-content-end align-items-center gap-2">
                    {startError && <Alert variant="danger" className="me-3 mb-0 py-2">{startError}</Alert>}
                    {isManualDraw && hasBracket && (
                      <span className="text-muted small">All positions must be filled before starting</span>
                    )}
                    <Button
                      variant={isManualDraw ? 'outline-success' : 'success'}
                      onClick={handleStartTournament}
                    >
                      Start Tournament
                    </Button>
                  </Col>
                </Row>
              )}

              {/* Hero bracket — always visible (not collapsible) for IN_PROGRESS and COMPLETED (LAYOUT-01) */}
              {(tournament.status === 'IN_PROGRESS' || tournament.status === 'COMPLETED') && (
                <div className="mt-3">
                  <FormatVisualization
                    tournament={tournament}
                    mutateTournament={mutateTournament}
                    registrationVersion={registrationVersion}
                  />
                </div>
              )}

              {/* Accordion for all secondary sections (LAYOUT-02, LAYOUT-03, LAYOUT-04) */}
              <Accordion
                alwaysOpen
                flush
                defaultActiveKey={getDefaultActiveKeys(tournament.status)}
                className="mt-3"
              >
                {buildSectionOrder(tournament.status).map(key => renderSection(key))}

                {/* ConsolationOptOut — appended for IN_PROGRESS KNOCKOUT MATCH_2 (LAYOUT-02) */}
                {user &&
                  tournament.formatType === 'KNOCKOUT' &&
                  parsedFormatConfig.matchGuarantee === 'MATCH_2' &&
                  tournament.status === 'IN_PROGRESS' && (
                  <Accordion.Item eventKey="consolation-optout">
                    <Accordion.Header>Consolation Opt-Out</Accordion.Header>
                    <Accordion.Body>
                      <ConsolationOptOutPanel tournament={tournament} user={user} />
                    </Accordion.Body>
                  </Accordion.Item>
                )}
              </Accordion>
            </>
          );
        })()}
      </Container>
    </>
  );
};

export default TournamentViewPage;
