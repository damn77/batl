// T022-T038: Tournament View Page - Comprehensive tournament information display
import { Container, Row, Col, Alert, Spinner, Breadcrumb } from 'react-bootstrap';
import { useParams, Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import TournamentHeader from '../components/TournamentHeader';
import TournamentInfoPanel from '../components/TournamentInfoPanel';
import PlayerListPanel from '../components/PlayerListPanel';
import FormatVisualization from '../components/FormatVisualization';
import { useTournament } from '../services/tournamentViewService';
import { useAuth } from '../utils/AuthContext';

/**
 * T022: TournamentViewPage - Main page component for tournament view
 * FR-001: Display all general tournament information
 * FR-002: Display tournament format
 * FR-006: Public access (no authentication required)
 * FR-007: Responsive design
 */
const TournamentViewPage = () => {
  const { id } = useParams();
  const { user } = useAuth();

  // T021: Use SWR hook for data fetching with automatic revalidation
  const { tournament, isLoading, isError } = useTournament(id);

  // Determine tournaments list link based on user role
  const getTournamentsLink = () => {
    if (!user) return '/rankings'; // Not logged in - go to public rankings
    if (user.role === 'PLAYER') return '/player/tournaments';
    if (user.role === 'ORGANIZER' || user.role === 'ADMIN') return '/organizer/tournaments';
    return '/rankings'; // Fallback
  };

  return (
    <>
      <NavBar />
      <Container className="py-4">
        {/* T032: Breadcrumb navigation */}
        <Breadcrumb className="mb-3">
          <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/' }}>
            Home
          </Breadcrumb.Item>
          <Breadcrumb.Item linkAs={Link} linkProps={{ to: getTournamentsLink() }}>
            Tournaments
          </Breadcrumb.Item>
          <Breadcrumb.Item active>
            {tournament?.name || 'Tournament Details'}
          </Breadcrumb.Item>
        </Breadcrumb>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-5">
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">Loading tournament...</span>
            </Spinner>
            <p className="mt-3 text-muted">Loading tournament details...</p>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <Alert variant="danger">
            <Alert.Heading>Tournament Not Found</Alert.Heading>
            <p>
              The tournament you're looking for could not be found. It may have been deleted or the URL is incorrect.
            </p>
            <hr />
            <div className="d-flex justify-content-end">
              <Link to="/tournaments" className="btn btn-outline-danger">
                Back to Tournaments
              </Link>
            </div>
          </Alert>
        )}

        {/* Tournament content */}
        {tournament && (
          <>
            {/* T024: Tournament Header - Name, status badge, category badge, format badge */}
            <TournamentHeader tournament={tournament} />

            {/* T026-T031: Tournament Info Panel - Two-column layout with all tournament details */}
            <Row className="mt-4">
              <Col>
                <TournamentInfoPanel tournament={tournament} />
              </Col>
            </Row>

            {/* T052: Player List Panel */}
            <Row className="mt-4">
              <Col>
                <PlayerListPanel tournament={tournament} />
              </Col>
            </Row>

            {/* T072: Format Visualization - Brackets, Groups, Swiss Rounds */}
            <Row className="mt-4">
              <Col>
                <FormatVisualization tournament={tournament} />
              </Col>
            </Row>
          </>
        )}
      </Container>
    </>
  );
};

export default TournamentViewPage;
