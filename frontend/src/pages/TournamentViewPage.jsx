// T022-T038: Tournament View Page - Comprehensive tournament information display
import { useState } from 'react';
import { Container, Row, Col, Alert, Spinner, Breadcrumb, Button } from 'react-bootstrap';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import NavBar from '../components/NavBar';
import TournamentHeader from '../components/TournamentHeader';
import TournamentInfoPanel from '../components/TournamentInfoPanel';
import PlayerListPanel from '../components/PlayerListPanel';
import OrganizerRegistrationPanel from '../components/OrganizerRegistrationPanel';
import FormatVisualization from '../components/FormatVisualization';
import PointPreviewPanel from '../components/PointPreviewPanel';
import ConsolationOptOutPanel from '../components/ConsolationOptOutPanel';
import { useTournament, useFormatStructure } from '../services/tournamentViewService';
import { startTournament } from '../services/tournamentService';
import { useAuth } from '../utils/AuthContext';

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
        {tournament && (
          <>
            {/* T024: Tournament Header - Name, status badge, category badge, format badge */}
            <TournamentHeader tournament={tournament} />

            {/* Champion banner — shown when tournament is COMPLETED (LIFE-03) */}
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

            {/* T026-T031: Tournament Info Panel - Two-column layout with all tournament details */}
            <Row className="mt-4">
              <Col>
                <TournamentInfoPanel tournament={tournament} />
              </Col>
            </Row>

            {/* T072: Format Visualization - Brackets, Groups, Swiss Rounds */}
            <Row className="mt-4">
              <Col>
                <FormatVisualization tournament={tournament} mutateTournament={mutateTournament} />
              </Col>
            </Row>

            {/* Consolation Opt-Out Panel — directly below bracket section, MATCH_2 IN_PROGRESS only */}
            {user &&
              tournament.formatType === 'KNOCKOUT' &&
              parsedFormatConfig.matchGuarantee === 'MATCH_2' &&
              tournament.status === 'IN_PROGRESS' && (
              <>
                <hr className="mt-4 mb-0" />
                <Row className="mt-3">
                  <Col>
                    <ConsolationOptOutPanel tournament={tournament} user={user} />
                  </Col>
                </Row>
              </>
            )}

            {/* Organizer Registration Panel */}
            {(user?.role === 'ORGANIZER' || user?.role === 'ADMIN') && (
              <Row className="mt-4">
                <Col>
                  <OrganizerRegistrationPanel
                    tournament={tournament}
                    onRegistrationComplete={() => window.location.reload()}
                  />
                </Col>
              </Row>
            )}

            {/* T052: Player List Panel */}
            <Row className="mt-4">
              <Col>
                <PlayerListPanel tournament={tournament} />
              </Col>
            </Row>

            {/* T066: Point Preview */}
            <Row className="mt-4">
              <Col>
                <PointPreviewPanel tournamentId={tournament.id} />
              </Col>
            </Row>
          </>
        )}
      </Container>
    </>
  );
};

export default TournamentViewPage;
