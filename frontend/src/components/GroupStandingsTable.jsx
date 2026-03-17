// T075-T077: Group Standings Table Component - Displays group standings and matches
// Plan 28-02: Extended with differential columns, clickable match rows, doubles support,
// status-based match visibility, and mobile responsive column hiding.
import { useState, useMemo } from 'react';
import { Table, Alert, Spinner } from 'react-bootstrap';
import { useMatches } from '../services/tournamentViewService';
import MatchResultModal from './MatchResultModal';
import MatchResultDisplay from './MatchResultDisplay';

/**
 * GroupStandingsTable - Displays group standings with wins/losses/points/differentials and matches
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
  const { matches, isLoading, isError, mutate: mutateMatches } = useMatches(
    tournamentId,
    { groupId: group.id },
    true // always fetch
  );

  // MatchResultModal state
  const [selectedMatch, setSelectedMatch] = useState(null);

  // Match rows visibility: expanded for IN_PROGRESS, collapsed for COMPLETED
  // Per CONTEXT.md locked decision: "Matches section defaults to expanded when tournament is IN_PROGRESS;
  // collapsed for completed tournaments."
  const [showMatches, setShowMatches] = useState(tournamentStatus === 'IN_PROGRESS');

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

  // Doubles detection and entity list
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

  // Calculate standings from matches
  const standings = useMemo(() => {
    if (!matches || matches.length === 0) {
      // No matches yet - return entities with zero stats
      return entities.map((entity, index) => ({
        position: index + 1,
        entity,
        played: 0,
        wins: 0,
        losses: 0,
        setsWon: 0,
        setsLost: 0,
        gamesWon: 0,
        gamesLost: 0,
        setDiff: 0,
        gameDiff: 0,
        points: 0
      }));
    }

    // Initialize entity stats map
    const entityStats = new Map();
    entities.forEach(entity => {
      entityStats.set(entity.id, {
        entity,
        played: 0,
        wins: 0,
        losses: 0,
        setsWon: 0,
        setsLost: 0,
        gamesWon: 0,
        gamesLost: 0,
        points: 0
      });
    });

    // Calculate stats from completed matches
    matches.forEach(match => {
      if (match.status !== 'COMPLETED' || !match.matchResult) return;

      // Support both singles (player1/player2) and doubles (pair1/pair2)
      const id1 = isDoubles ? match.pair1?.id : match.player1?.id;
      const id2 = isDoubles ? match.pair2?.id : match.player2?.id;
      const result = match.matchResult;

      if (!id1 || !id2) return;

      const stats1 = entityStats.get(id1);
      const stats2 = entityStats.get(id2);

      if (!stats1 || !stats2) return;

      // Update played count
      stats1.played++;
      stats2.played++;

      // Calculate set scores
      const sets = result.sets || [];
      let sets1 = 0, sets2 = 0;
      let games1 = 0, games2 = 0;

      sets.forEach(set => {
        if (set.player1Score > set.player2Score) sets1++;
        else sets2++;
        games1 += set.player1Score;
        games2 += set.player2Score;
      });

      // Update stats
      stats1.setsWon += sets1;
      stats1.setsLost += sets2;
      stats1.gamesWon += games1;
      stats1.gamesLost += games2;

      stats2.setsWon += sets2;
      stats2.setsLost += sets1;
      stats2.gamesWon += games2;
      stats2.gamesLost += games1;

      // Determine winner and update wins/losses/points
      if (result.winner === 'PLAYER1') {
        stats1.wins++;
        stats1.points += 2; // 2 points for win
        stats2.losses++;
      } else if (result.winner === 'PLAYER2') {
        stats2.wins++;
        stats2.points += 2; // 2 points for win
        stats1.losses++;
      } else {
        // Draw (if supported)
        stats1.points += 1;
        stats2.points += 1;
      }
    });

    // Convert to array and sort
    const standingsArray = Array.from(entityStats.values());

    // Calculate differential columns
    standingsArray.forEach(stats => {
      stats.setDiff = stats.setsWon - stats.setsLost;
      stats.gameDiff = stats.gamesWon - stats.gamesLost;
    });

    // Sort by: 1) Points, 2) Wins, 3) Set difference, 4) Game difference
    standingsArray.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
      return b.gameDiff - a.gameDiff;
    });

    // Add position
    standingsArray.forEach((stats, index) => {
      stats.position = index + 1;
    });

    return standingsArray;
  }, [matches, entities, isDoubles]);

  return (
    <div>
      {/* Standings Table */}
      <div className="table-responsive mb-3">
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
              <th className="text-center">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((stats) => (
              <tr key={stats.entity.id}>
                <td className="fw-bold">{stats.position}</td>
                <td><strong>{stats.entity.name}</strong></td>
                <td className="text-center">{stats.played}</td>
                <td className="text-center">{stats.wins}</td>
                <td className="text-center">{stats.losses}</td>
                <td className="text-center d-none d-sm-table-cell">{stats.setsWon}-{stats.setsLost}</td>
                <td className="text-center">{stats.setDiff > 0 ? '+' : ''}{stats.setDiff}</td>
                <td className="text-center d-none d-sm-table-cell">{stats.gamesWon}-{stats.gamesLost}</td>
                <td className="text-center">{stats.gameDiff > 0 ? '+' : ''}{stats.gameDiff}</td>
                <td className="text-center fw-bold">{stats.points}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        <small className="text-muted">
          P = Played, W = Wins, L = Losses, Pts = Points (2 for win)
        </small>
      </div>

      {/* Matches Section */}
      <div className="mt-3">
        {matches && matches.length > 0 && (
          <div className="d-flex justify-content-between align-items-center mb-2">
            <small className="text-muted fw-bold">
              Matches ({matches.filter(m => m.status === 'COMPLETED').length}/{matches.length})
            </small>
            <button
              className="btn btn-link btn-sm p-0 text-decoration-none"
              onClick={() => setShowMatches(prev => !prev)}
            >
              <small>{showMatches ? 'Hide' : 'Show'}</small>
            </button>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-3">
            <Spinner animation="border" size="sm" />
            <p className="text-muted small mt-2">Loading matches...</p>
          </div>
        )}
        {isError && (
          <Alert variant="danger">Failed to load matches. Please try again.</Alert>
        )}
        {showMatches && matches && matches.length > 0 && (
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

      {/* MatchResultModal — opens when a match row is tapped */}
      {selectedMatch && (
        <MatchResultModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          isOrganizer={isOrganizer}
          isParticipant={isMatchParticipant(selectedMatch, currentUserPlayerId)}
          scoringRules={scoringRules}
          mutate={mutateMatches}
        />
      )}
    </div>
  );
};

export default GroupStandingsTable;
