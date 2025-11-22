// T052-T064: Player List Panel Component - Display registered players with status and rankings
import { useState, useEffect, useMemo } from 'react';
import { Card, Table, Badge, Button, Form, InputGroup, Collapse, Alert, Spinner, Modal } from 'react-bootstrap';
import { getTournamentRegistrations, STATUS_LABELS, STATUS_VARIANTS } from '../services/tournamentRegistrationService';
import { withdrawPairRegistration } from '../services/pairService';
import apiClient from '../services/apiClient';
import { useAuth } from '../utils/AuthContext';

/**
 * PlayerListPanel - Displays all registered players with status, rankings, and waitlist support
 * FR-004: Display player list with format-specific information
 *
 * @param {Object} tournament - Tournament object with formatType and waitlistDisplayOrder
 */
const PlayerListPanel = ({ tournament }) => {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [registrationType, setRegistrationType] = useState('SINGLES'); // 'SINGLES' or 'DOUBLES'
  const [unregisteringId, setUnregisteringId] = useState(null);
  const [showUnregisterModal, setShowUnregisterModal] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState(null);

  const isOrganizer = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';

  useEffect(() => {
    if (tournament?.id) {
      loadRegistrations();
    }
  }, [tournament?.id]);

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTournamentRegistrations(tournament.id);
      setRegistrations(data.registrations || []);
      setRegistrationType(data.type || 'SINGLES');
    } catch (err) {
      setError(err.message || 'Failed to load player list');
    } finally {
      setLoading(false);
    }
  };

  const handleUnregisterClick = (registration) => {
    setSelectedRegistration(registration);
    setShowUnregisterModal(true);
  };

  const handleUnregisterConfirm = async () => {
    if (!selectedRegistration) return;

    try {
      setUnregisteringId(selectedRegistration.id);
      setShowUnregisterModal(false);

      if (registrationType === 'DOUBLES') {
        await withdrawPairRegistration(selectedRegistration.id);
      } else {
        // For SINGLES, call the tournament registration withdrawal endpoint
        await apiClient.delete(`/tournaments/registrations/${selectedRegistration.id}`);
      }

      // Reload registrations
      await loadRegistrations();
    } catch (err) {
      setError(`Failed to unregister: ${err.message}`);
    } finally {
      setUnregisteringId(null);
      setSelectedRegistration(null);
    }
  };

  // T053: Separate registered and waitlisted players
  const { registeredPlayers, waitlistedPlayers } = useMemo(() => {
    const registered = registrations.filter(r => r.status === 'REGISTERED');
    const waitlisted = registrations.filter(r => r.status === 'WAITLISTED');

    // T057: Sort waitlist based on tournament setting
    if (tournament?.waitlistDisplayOrder === 'ALPHABETICAL') {
      waitlisted.sort((a, b) => (a.player?.name || '').localeCompare(b.player?.name || ''));
    } else {
      // REGISTRATION_TIME (default) - already sorted by registration timestamp from API
      waitlisted.sort((a, b) => new Date(a.registrationTimestamp) - new Date(b.registrationTimestamp));
    }

    return { registeredPlayers: registered, waitlistedPlayers: waitlisted };
  }, [registrations, tournament?.waitlistDisplayOrder]);

  // T058: Filter players by search term
  const filteredRegisteredPlayers = useMemo(() => {
    if (!searchTerm) return registeredPlayers;
    const term = searchTerm.toLowerCase();
    return registeredPlayers.filter(r => {
      if (registrationType === 'DOUBLES') {
        // Search by either player name in the pair
        return r.pair?.player1?.name?.toLowerCase().includes(term) ||
          r.pair?.player2?.name?.toLowerCase().includes(term);
      }
      return r.player?.name?.toLowerCase().includes(term);
    });
  }, [registeredPlayers, searchTerm, registrationType]);

  const filteredWaitlistedPlayers = useMemo(() => {
    if (!searchTerm) return waitlistedPlayers;
    const term = searchTerm.toLowerCase();
    return waitlistedPlayers.filter(r => {
      if (registrationType === 'DOUBLES') {
        return r.pair?.player1?.name?.toLowerCase().includes(term) ||
          r.pair?.player2?.name?.toLowerCase().includes(term);
      }
      return r.player?.name?.toLowerCase().includes(term);
    });
  }, [waitlistedPlayers, searchTerm, registrationType]);

  // T060: Determine format-specific columns
  const getFormatSpecificColumns = () => {
    switch (tournament?.formatType) {
      case 'GROUP':
        return ['Group', 'Position'];
      case 'KNOCKOUT':
        return ['Bracket', 'Round'];
      case 'COMBINED':
        return ['Group', 'Bracket'];
      case 'SWISS':
        return ['Placement'];
      default:
        return [];
    }
  };

  const formatSpecificColumns = getFormatSpecificColumns();

  // T055: Render status badge
  const renderStatusBadge = (status) => (
    <Badge bg={STATUS_VARIANTS[status] || 'secondary'} className="px-2 py-1">
      {STATUS_LABELS[status] || status}
    </Badge>
  );

  // T061-T064: Render format-specific data
  const renderFormatSpecificData = (registration, column) => {
    // Placeholder - will be populated when format data is available from backend
    const formatData = registration.formatData || {};

    switch (column) {
      case 'Group':
        return formatData.groupNumber ? `Group ${formatData.groupNumber}` : '-';
      case 'Position':
        return formatData.seedPosition || '-';
      case 'Bracket':
        return formatData.bracketType || '-';
      case 'Round':
        return formatData.currentRound ? `Round ${formatData.currentRound}` : '-';
      case 'Placement':
        return formatData.placement || '-';
      default:
        return '-';
    }
  };

  // Render player/pair row
  const renderPlayerRow = (registration, index) => {
    const isUnregistering = unregisteringId === registration.id;

    if (registrationType === 'DOUBLES') {
      // Render pair row
      return (
        <tr key={registration.id || index}>
          <td>{index + 1}</td>
          <td>
            <strong>{registration.pair?.player1?.name || 'Unknown'}</strong>
            <span className="text-muted"> & </span>
            <strong>{registration.pair?.player2?.name || 'Unknown'}</strong>
          </td>
          <td className="text-center">
            {registration.pair?.seedingScore || '-'}
          </td>
          <td className="text-center">
            {registration.seedPosition || '-'}
          </td>
          {formatSpecificColumns.map(column => (
            <td key={column} className="text-center">
              {renderFormatSpecificData(registration, column)}
            </td>
          ))}
          <td className="text-center">
            {renderStatusBadge(registration.status)}
          </td>
          {isOrganizer && (
            <td className="text-center">
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => handleUnregisterClick(registration)}
                disabled={isUnregistering}
              >
                {isUnregistering ? 'Removing...' : 'Unregister'}
              </Button>
            </td>
          )}
        </tr>
      );
    }

    // Render individual player row
    return (
      <tr key={registration.id || index}>
        <td>{index + 1}</td>
        <td>
          <strong>{registration.player?.name || 'Unknown'}</strong>
        </td>
        <td className="text-center">
          {registration.player?.ranking || '-'}
        </td>
        <td className="text-center">
          {registration.seedPosition || '-'}
        </td>
        {formatSpecificColumns.map(column => (
          <td key={column} className="text-center">
            {renderFormatSpecificData(registration, column)}
          </td>
        ))}
        <td className="text-center">
          {renderStatusBadge(registration.status)}
        </td>
        {isOrganizer && (
          <td className="text-center">
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => handleUnregisterClick(registration)}
              disabled={isUnregistering}
            >
              {isUnregistering ? 'Removing...' : 'Unregister'}
            </Button>
          </td>
        )}
      </tr>
    );
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading player list...</p>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body>
          <Alert variant="danger">
            <Alert.Heading>Error Loading Players</Alert.Heading>
            <p>{error}</p>
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  // T058: Handle empty state
  if (registeredPlayers.length === 0 && waitlistedPlayers.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center py-5">
          <div className="text-muted">
            <h5>No Players Registered Yet</h5>
            <p>This tournament has no registered players at the moment.</p>
            <small>Be the first to register when registration opens!</small>
          </div>
        </Card.Body>
      </Card>
    );
  }

  const showSearchBox = registeredPlayers.length + waitlistedPlayers.length > 50;

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="mb-0">
            {registrationType === 'DOUBLES' ? 'Registered Pairs' : 'Registered Players'}
          </h4>
          <Badge bg="primary" className="px-3 py-2">
            {registeredPlayers.length} / {tournament.capacity || '∞'}
          </Badge>
        </div>

        {/* T059: Conditional search box (show only if > 50 players) */}
        {showSearchBox && (
          <InputGroup className="mb-3">
            <InputGroup.Text>
              <span>🔍</span>
            </InputGroup.Text>
            <Form.Control
              placeholder="Search players by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <Button variant="outline-secondary" onClick={() => setSearchTerm('')}>
                Clear
              </Button>
            )}
          </InputGroup>
        )}

        {/* Registered Players Table */}
        {filteredRegisteredPlayers.length > 0 ? (
          <div className="table-responsive">
            <Table striped hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>{registrationType === 'DOUBLES' ? 'Pair' : 'Player Name'}</th>
                  <th className="text-center">{registrationType === 'DOUBLES' ? 'Score' : 'Ranking'}</th>
                  <th className="text-center">Seed</th>
                  {formatSpecificColumns.map(column => (
                    <th key={column} className="text-center">{column}</th>
                  ))}
                  <th className="text-center">Status</th>
                  {isOrganizer && <th className="text-center">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRegisteredPlayers.map((registration, index) =>
                  renderPlayerRow(registration, index)
                )}
              </tbody>
            </Table>
          </div>
        ) : (
          <Alert variant="info" className="mb-0">
            {searchTerm ? `No registered players match "${searchTerm}"` : 'No registered players yet.'}
          </Alert>
        )}

        {/* T056: Waitlist Toggle Button */}
        {waitlistedPlayers.length > 0 && (
          <>
            <div className="mt-4 mb-3">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setShowWaitlist(!showWaitlist)}
                className="d-flex align-items-center gap-2"
              >
                <span>{showWaitlist ? '▼' : '▶'}</span>
                <span>Waitlist ({waitlistedPlayers.length} {waitlistedPlayers.length === 1 ? 'player' : 'players'})</span>
              </Button>
              {tournament?.waitlistDisplayOrder && (
                <small className="text-muted ms-2">
                  Sorted by: {tournament.waitlistDisplayOrder === 'REGISTRATION_TIME' ? 'Registration Time' : 'Alphabetical'}
                </small>
              )}
            </div>

            <Collapse in={showWaitlist}>
              <div>
                {filteredWaitlistedPlayers.length > 0 ? (
                  <div className="table-responsive">
                    <Table striped hover className="mb-0">
                      <thead className="table-warning">
                        <tr>
                          <th style={{ width: '50px' }}>#</th>
                          <th>{registrationType === 'DOUBLES' ? 'Pair' : 'Player Name'}</th>
                          <th className="text-center">{registrationType === 'DOUBLES' ? 'Score' : 'Ranking'}</th>
                          <th className="text-center">Seed</th>
                          {formatSpecificColumns.map(column => (
                            <th key={column} className="text-center">{column}</th>
                          ))}
                          <th className="text-center">Status</th>
                          {isOrganizer && <th className="text-center">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredWaitlistedPlayers.map((registration, index) =>
                          renderPlayerRow(registration, index)
                        )}
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  <Alert variant="info" className="mb-0">
                    {searchTerm ? `No waitlisted players match "${searchTerm}"` : 'No waitlisted players.'}
                  </Alert>
                )}
              </div>
            </Collapse>
          </>
        )}

        {/* Unregister Confirmation Modal */}
        <Modal show={showUnregisterModal} onHide={() => setShowUnregisterModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Unregistration</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedRegistration && (
              <p>
                Are you sure you want to unregister{' '}
                {registrationType === 'DOUBLES' ? (
                  <strong>
                    {selectedRegistration.pair?.player1?.name} & {selectedRegistration.pair?.player2?.name}
                  </strong>
                ) : (
                  <strong>{selectedRegistration.player?.name}</strong>
                )}
                {' '}from this tournament?
              </p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowUnregisterModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleUnregisterConfirm}>
              Unregister
            </Button>
          </Modal.Footer>
        </Modal>
      </Card.Body>
    </Card>
  );
};

export default PlayerListPanel;
