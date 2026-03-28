// T075-T077: Group Standings Table Component - Displays group standings and matches
// Plan 28-02: Extended with differential columns, clickable match rows, doubles support,
// status-based match visibility, and mobile responsive column hiding.
// Plan 29-03: Rewritten to consume backend-computed standings via SWR hook, removed
// client-side computation, added tiebreaker criterion badges, tied-position ranges,
// manual resolution UI, and stale override warning.
// Plan 30.1-02: Restructured with responsive tabbed layout, CrossTable integration,
// and bidirectional cross-highlighting between cross-table cells and match list rows.
import { useState } from 'react';
import { Tab, Nav, Table, Alert, Spinner, Badge, Button, Modal, Form, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useMatches, useGroupStandings, saveGroupTieOverride } from '../services/tournamentViewService';
import MatchResultModal from './MatchResultModal';
import MatchResultDisplay from './MatchResultDisplay';
import CrossTable from './CrossTable';

/**
 * GroupStandingsTable - Displays group standings with wins/losses/differentials and matches
 *
 * @param {string} tournamentId - Tournament UUID
 * @param {Object} group - Group object with id, name, groupNumber, players, pairs
 * @param {boolean} isOrganizer - Whether current user is organizer/admin
 * @param {string|null} currentUserPlayerId - Current user's player profile ID (for participant check)
 * @param {Object|null} scoringRules - { formatType, winningSets, winningTiebreaks }
 * @param {string} tournamentStatus - Tournament status string (IN_PROGRESS, COMPLETED, etc.)
 */
const GroupStandingsTable = ({
  tournamentId,
  group,
  isOrganizer = false,
  currentUserPlayerId = null,
  scoringRules = null,
  tournamentStatus = 'SCHEDULED'
}) => {
  // Always fetch matches (no toggle gate on fetch)
  const { matches, isLoading: matchesLoading, isError: matchesError, mutate: mutateMatches } = useMatches(
    tournamentId,
    { groupId: group.id },
    true // always fetch
  );

  // Fetch backend-computed standings with tiebreaker metadata
  const {
    standings, unresolvedTies, hasManualOverride, overrideIsStale,
    isLoading: standingsLoading, isError: standingsError, mutate: mutateStandings
  } = useGroupStandings(tournamentId, group.id, true);

  // MatchResultModal state
  const [selectedMatch, setSelectedMatch] = useState(null);

  // Cross-highlighting state — matchId being hovered
  const [highlightedMatchId, setHighlightedMatchId] = useState(null);

  // Manual resolution modal state
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolvePositions, setResolvePositions] = useState({});
  const [resolveSaving, setResolveSaving] = useState(false);
  const [resolveError, setResolveError] = useState(null);
  const [staleDismissed, setStaleDismissed] = useState(false);

  // Client-side participant check helper
  function isMatchParticipant(match, playerId) {
    if (!playerId) return false;
    if (match.player1?.id === playerId || match.player2?.id === playerId) return true;
    const members = [
      match.pair1?.player1?.id, match.pair1?.player2?.id,
      match.pair2?.player1?.id, match.pair2?.player2?.id
    ];
    return members.includes(playerId);
  }

  // Doubles detection and entity list (needed for modal position labels)
  const isDoubles = (group.pairs?.length > 0);
  const entities = isDoubles
    ? (group.pairs || []).map(pair => ({
        id: pair.id,
        name: `${pair.player1?.name || '?'} / ${pair.player2?.name || '?'}`
      }))
    : (group.players || []).map(player => ({
        id: player.id,
        name: player.name
      }));

  // Manual resolution modal helpers
  const openResolveModal = (tie) => {
    const initial = {};
    tie.entityIds.forEach(id => { initial[id] = ''; });
    setResolvePositions(initial);
    setResolveError(null);
    setShowResolveModal(true);
  };

  const handleSaveResolution = async () => {
    setResolveSaving(true);
    setResolveError(null);
    try {
      const positions = Object.entries(resolvePositions).map(([entityId, pos]) => ({
        entityId,
        position: parseInt(pos, 10)
      }));
      await saveGroupTieOverride(tournamentId, group.id, positions);
      await mutateStandings();
      setShowResolveModal(false);
      setStaleDismissed(false);
    } catch (err) {
      setResolveError(err.message || 'Could not save tie resolution. Please try again.');
    } finally {
      setResolveSaving(false);
    }
  };

  // Check if all positions assigned uniquely
  const allPositionsAssigned = Object.values(resolvePositions).every(v => v !== '') &&
    new Set(Object.values(resolvePositions)).size === Object.keys(resolvePositions).length;

  // Map tiebreaker criterion code to full label for tooltip
  const getCriterionLabel = (criterion) => {
    switch (criterion) {
      case 'H2H': return 'Head-to-head';
      case 'Set diff': return 'Set differential';
      case 'Game diff': return 'Game differential';
      case 'Fewest games': return 'Fewest total games';
      case 'Manual': return 'Manual (organizer)';
      default: return criterion;
    }
  };

  // Handle cross-table cell click — open MatchResultModal with the clicked match
  const handleCellClick = (match) => {
    if (match) {
      setSelectedMatch(match);
    }
  };

  // Standings content (rendered in both desktop and mobile Standings tab)
  const standingsContent = (
    <div className="table-responsive mb-3">
      {standingsLoading && (
        <div className="text-center py-3">
          <Spinner animation="border" size="sm" />
          <p className="text-muted small mt-2">Loading standings...</p>
        </div>
      )}
      {standingsError && (
        <Alert variant="danger">Failed to load standings. Please try again.</Alert>
      )}
      {!standingsLoading && !standingsError && (
        <>
          <Table striped hover size="sm">
            <thead className="table-light">
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>Player</th>
                <th className="text-center">P</th>
                <th className="text-center">W</th>
                <th className="text-center">L</th>
                <th className="text-center d-none d-sm-table-cell">Sets W-L</th>
                <th className="text-center">S +/-</th>
                <th className="text-center d-none d-sm-table-cell">Games W-L</th>
                <th className="text-center">G +/-</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((stats) => (
                <tr key={stats.entity.id}>
                  <td style={{ width: '40px' }}>
                    <div style={{ width: '40px' }}>
                      <span className={stats.tiedRange ? '' : 'fw-bold'}>
                        {stats.tiedRange || stats.position}
                      </span>
                      {stats.tiebreakerCriterion && (
                        <OverlayTrigger
                          placement="right"
                          trigger={['hover', 'focus', 'click']}
                          overlay={
                            <Tooltip>
                              Resolved by: {getCriterionLabel(stats.tiebreakerCriterion)}
                            </Tooltip>
                          }
                        >
                          <Badge
                            bg={stats.tiebreakerCriterion === 'Manual' ? 'warning' : 'secondary'}
                            text={stats.tiebreakerCriterion === 'Manual' ? 'dark' : undefined}
                            className="d-block"
                            style={{ fontSize: '10px', cursor: 'help' }}
                          >
                            {stats.tiebreakerCriterion}
                          </Badge>
                        </OverlayTrigger>
                      )}
                    </div>
                  </td>
                  <td><strong>{stats.entity.name}</strong></td>
                  <td className="text-center">{stats.played}</td>
                  <td className="text-center">{stats.wins}</td>
                  <td className="text-center">{stats.losses}</td>
                  <td className="text-center d-none d-sm-table-cell">{stats.setsWon}-{stats.setsLost}</td>
                  <td className="text-center">{stats.setDiff > 0 ? '+' : ''}{stats.setDiff}</td>
                  <td className="text-center d-none d-sm-table-cell">{stats.gamesWon}-{stats.gamesLost}</td>
                  <td className="text-center">{stats.gameDiff > 0 ? '+' : ''}{stats.gameDiff}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <small className="text-muted">
            P = Played, W = Wins, L = Losses, S +/- = Set differential, G +/- = Game differential
          </small>
        </>
      )}
    </div>
  );

  // Match list content (desktop: rendered below tabs, always visible; mobile: rendered in Matches tab)
  // Desktop version includes cross-highlighting handlers; mobile version does not (touch devices)
  const matchListContentDesktop = (
    <div className="mt-3">
      {matches && matches.length > 0 && (
        <div className="mb-2">
          <small className="text-muted fw-bold">
            Matches ({matches.filter(m => m.status === 'COMPLETED').length}/{matches.length})
          </small>
        </div>
      )}
      {matchesLoading && (
        <div className="text-center py-3">
          <Spinner animation="border" size="sm" />
          <p className="text-muted small mt-2">Loading matches...</p>
        </div>
      )}
      {matchesError && (
        <Alert variant="danger">Failed to load matches. Please try again.</Alert>
      )}
      {matches && matches.length > 0 && (
        <div className="d-flex flex-column gap-1">
          {matches.map(match => {
            const isDoublesMatch = !!(match.pair1 || match.pair2);
            const p1Name = isDoublesMatch
              ? `${match.pair1?.player1?.name || '?'} / ${match.pair1?.player2?.name || '?'}`
              : (match.player1?.name || 'TBD');
            const p2Name = isDoublesMatch
              ? `${match.pair2?.player1?.name || '?'} / ${match.pair2?.player2?.name || '?'}`
              : (match.player2?.name || 'TBD');
            const isHighlighted = highlightedMatchId === match.id;
            return (
              <div
                key={match.id}
                onClick={() => setSelectedMatch(match)}
                onMouseEnter={() => setHighlightedMatchId(match.id)}
                onMouseLeave={() => setHighlightedMatchId(null)}
                style={{ cursor: 'pointer', minHeight: '44px' }}
                className={`d-flex align-items-center gap-2 px-2 py-1 rounded border-bottom${isHighlighted ? ' cross-highlight' : ''}`}
              >
                <MatchResultDisplay match={match} compact />
                {match.status === 'SCHEDULED' && (
                  <span className="small">{p1Name} vs {p2Name}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
      {matches && matches.length === 0 && (
        <Alert variant="info">No matches scheduled yet for this group.</Alert>
      )}
    </div>
  );

  // Mobile match list — same content but without hover handlers (touch devices don't use hover)
  const matchListContentMobile = (
    <div className="mt-3">
      {matches && matches.length > 0 && (
        <div className="mb-2">
          <small className="text-muted fw-bold">
            Matches ({matches.filter(m => m.status === 'COMPLETED').length}/{matches.length})
          </small>
        </div>
      )}
      {matchesLoading && (
        <div className="text-center py-3">
          <Spinner animation="border" size="sm" />
          <p className="text-muted small mt-2">Loading matches...</p>
        </div>
      )}
      {matchesError && (
        <Alert variant="danger">Failed to load matches. Please try again.</Alert>
      )}
      {matches && matches.length > 0 && (
        <div className="d-flex flex-column gap-1">
          {matches.map(match => {
            const isDoublesMatch = !!(match.pair1 || match.pair2);
            const p1Name = isDoublesMatch
              ? `${match.pair1?.player1?.name || '?'} / ${match.pair1?.player2?.name || '?'}`
              : (match.player1?.name || 'TBD');
            const p2Name = isDoublesMatch
              ? `${match.pair2?.player1?.name || '?'} / ${match.pair2?.player2?.name || '?'}`
              : (match.player2?.name || 'TBD');
            return (
              <div
                key={match.id}
                onClick={() => setSelectedMatch(match)}
                style={{ cursor: 'pointer', minHeight: '44px' }}
                className="d-flex align-items-center gap-2 px-2 py-1 rounded border-bottom"
              >
                <MatchResultDisplay match={match} compact />
                {match.status === 'SCHEDULED' && (
                  <span className="small">{p1Name} vs {p2Name}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
      {matches && matches.length === 0 && (
        <Alert variant="info">No matches scheduled yet for this group.</Alert>
      )}
    </div>
  );

  return (
    <div>
      {/* Stale override warning (organizer only) */}
      {isOrganizer && hasManualOverride && overrideIsStale && !staleDismissed && (
        <Alert variant="warning" className="mb-2 d-flex align-items-center justify-content-between">
          <span>Match result changed. Manual tie resolution for this group may be outdated.</span>
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" size="sm" onClick={() => setStaleDismissed(true)}>Dismiss</Button>
            <Button variant="primary" size="sm" onClick={() => setShowResolveModal(true)}>Re-resolve</Button>
          </div>
        </Alert>
      )}

      {/* Unresolved tie alert banners (organizer only) */}
      {isOrganizer && unresolvedTies.length > 0 && unresolvedTies.map((tie, i) => (
        <Alert key={i} variant="warning" className="mb-2 d-flex align-items-center justify-content-between">
          <div>
            <strong>Tie at positions {tie.range}</strong> — All tiebreaker criteria exhausted.
          </div>
          <Button variant="primary" size="sm" onClick={() => openResolveModal(tie)}>
            Resolve tie
          </Button>
        </Alert>
      ))}

      {/* Desktop layout: 2 tabs (Results/Standings) + match list always below (visible at sm+) */}
      <div className="d-none d-sm-block">
        <Tab.Container defaultActiveKey="results" onSelect={() => setHighlightedMatchId(null)}>
          <Nav variant="tabs" className="mb-2">
            <Nav.Item>
              <Nav.Link eventKey="results">Results</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="standings">Standings</Nav.Link>
            </Nav.Item>
          </Nav>
          <Tab.Content>
            <Tab.Pane eventKey="results">
              <CrossTable
                entities={entities}
                matches={matches}
                isDoubles={isDoubles}
                scoringRules={scoringRules}
                highlightedMatchId={highlightedMatchId}
                onCellHover={(matchId) => setHighlightedMatchId(matchId)}
                onCellLeave={() => setHighlightedMatchId(null)}
                onCellClick={handleCellClick}
              />
            </Tab.Pane>
            <Tab.Pane eventKey="standings">
              {standingsContent}
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
        {/* Match list always visible below tabs on desktop */}
        {matchListContentDesktop}
      </div>

      {/* Mobile layout: 3 tabs (Results/Standings/Matches) (visible at xs only) */}
      <div className="d-sm-none">
        <Tab.Container defaultActiveKey="results" onSelect={() => setHighlightedMatchId(null)}>
          <Nav variant="tabs" className="mb-2">
            <Nav.Item>
              <Nav.Link eventKey="results">Results</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="standings">Standings</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="matches">Matches</Nav.Link>
            </Nav.Item>
          </Nav>
          <Tab.Content>
            <Tab.Pane eventKey="results">
              <CrossTable
                entities={entities}
                matches={matches}
                isDoubles={isDoubles}
                scoringRules={scoringRules}
                highlightedMatchId={null}
                onCellHover={() => {}}
                onCellLeave={() => {}}
                onCellClick={handleCellClick}
              />
            </Tab.Pane>
            <Tab.Pane eventKey="standings">
              {standingsContent}
            </Tab.Pane>
            <Tab.Pane eventKey="matches">
              {matchListContentMobile}
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </div>

      {/* MatchResultModal — opens when a match row or cross-table cell is tapped */}
      {selectedMatch && (
        <MatchResultModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          isOrganizer={isOrganizer}
          isParticipant={isMatchParticipant(selectedMatch, currentUserPlayerId)}
          scoringRules={scoringRules}
          mutate={() => { mutateMatches(); mutateStandings(); }}
        />
      )}

      {/* Manual Tie Resolution Modal */}
      <Modal show={showResolveModal} onHide={() => setShowResolveModal(false)} fullscreen="sm-down">
        <Modal.Header closeButton>
          <Modal.Title>Resolve Tie &mdash; Group {group.groupNumber}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {Object.keys(resolvePositions).map((entityId) => {
            const entry = standings.find(s => s.entity.id === entityId);
            const tieRange = entry?.tiedRange;
            const positions = tieRange ? (() => {
              const [start, end] = tieRange.split('-').map(Number);
              return Array.from({ length: end - start + 1 }, (_, i) => start + i);
            })() : [];
            const usedPositions = Object.entries(resolvePositions)
              .filter(([id, pos]) => id !== entityId && pos !== '')
              .map(([, pos]) => parseInt(pos, 10));
            const availablePositions = positions.filter(p => !usedPositions.includes(p));
            // Fallback: look up entity name from local entities list if not in standings
            const entityName = entry?.entity.name ||
              entities.find(e => e.id === entityId)?.name ||
              entityId;

            return (
              <Form.Group key={entityId} className="mb-3">
                <Form.Label>Position for {entityName}</Form.Label>
                <Form.Select
                  value={resolvePositions[entityId]}
                  onChange={(e) => setResolvePositions(prev => ({ ...prev, [entityId]: e.target.value }))}
                  style={{ minHeight: '44px' }}
                >
                  <option value="">Select position...</option>
                  {availablePositions.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            );
          })}
          {resolveError && (
            <Alert variant="danger" className="mt-2">{resolveError}</Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowResolveModal(false)}>
            Keep Standings
          </Button>
          <Button variant="primary" onClick={handleSaveResolution} disabled={!allPositionsAssigned || resolveSaving}>
            {resolveSaving ? 'Saving...' : 'Save Resolution'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default GroupStandingsTable;
