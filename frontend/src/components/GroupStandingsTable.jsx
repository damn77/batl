// T075-T077: Group Standings Table Component - Displays group standings and matches
import { useState, useMemo } from 'react';
import { Table, Alert, Spinner } from 'react-bootstrap';
import { useMatches } from '../services/tournamentViewService';
import MatchResultDisplay from './MatchResultDisplay';

/**
 * GroupStandingsTable - Displays group standings with wins/losses/points and matches
 * T076: Implements standings calculation (wins, losses, points, head-to-head sorting)
 * T077: Displays matches within group
 *
 * @param {string} tournamentId - Tournament UUID
 * @param {Object} group - Group object with id, name, and players
 */
const GroupStandingsTable = ({ tournamentId, group }) => {
  const [showMatches, setShowMatches] = useState(false);

  // T088-T089: Lazy load matches only when needed
  const { matches, isLoading, isError } = useMatches(
    tournamentId,
    { groupId: group.id },
    showMatches
  );

  // T076: Calculate standings from matches
  const standings = useMemo(() => {
    if (!matches || matches.length === 0) {
      // No matches yet - return players with zero stats
      return (group.players || []).map((player, index) => ({
        position: index + 1,
        player,
        played: 0,
        wins: 0,
        losses: 0,
        setsWon: 0,
        setsLost: 0,
        gamesWon: 0,
        gamesLost: 0,
        points: 0
      }));
    }

    // Initialize player stats
    const playerStats = new Map();
    (group.players || []).forEach(player => {
      playerStats.set(player.id, {
        player,
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

      const player1Id = match.player1?.id;
      const player2Id = match.player2?.id;
      const result = match.matchResult;

      if (!player1Id || !player2Id) return;

      const stats1 = playerStats.get(player1Id);
      const stats2 = playerStats.get(player2Id);

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

      // Determine winner and update wins/losses
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
    const standingsArray = Array.from(playerStats.values());

    // Sort by: 1) Points, 2) Wins, 3) Head-to-head (TODO), 4) Set difference, 5) Game difference
    standingsArray.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      const aSetDiff = a.setsWon - a.setsLost;
      const bSetDiff = b.setsWon - b.setsLost;
      if (bSetDiff !== aSetDiff) return bSetDiff - aSetDiff;
      const aGameDiff = a.gamesWon - a.gamesLost;
      const bGameDiff = b.gamesWon - b.gamesLost;
      return bGameDiff - aGameDiff;
    });

    // Add position
    standingsArray.forEach((stats, index) => {
      stats.position = index + 1;
    });

    return standingsArray;
  }, [matches, group.players]);

  return (
    <div>
      <h5 className="mb-3">{group.name || `Group ${group.groupNumber}`}</h5>

      {/* Standings Table */}
      <div className="table-responsive mb-4">
        <Table striped hover size="sm">
          <thead className="table-light">
            <tr>
              <th style={{ width: '50px' }}>#</th>
              <th>Player</th>
              <th className="text-center">P</th>
              <th className="text-center">W</th>
              <th className="text-center">L</th>
              <th className="text-center">Sets</th>
              <th className="text-center">Games</th>
              <th className="text-center">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((stats) => (
              <tr key={stats.player.id}>
                <td className="fw-bold">{stats.position}</td>
                <td>
                  <strong>{stats.player.name}</strong>
                  {stats.position === 1 && <span className="ms-2">🥇</span>}
                  {stats.position === 2 && <span className="ms-2">🥈</span>}
                  {stats.position === 3 && <span className="ms-2">🥉</span>}
                </td>
                <td className="text-center">{stats.played}</td>
                <td className="text-center">{stats.wins}</td>
                <td className="text-center">{stats.losses}</td>
                <td className="text-center">
                  {stats.setsWon}-{stats.setsLost}
                  <small className="text-muted ms-1">
                    ({stats.setsWon - stats.setsLost > 0 ? '+' : ''}
                    {stats.setsWon - stats.setsLost})
                  </small>
                </td>
                <td className="text-center">
                  {stats.gamesWon}-{stats.gamesLost}
                  <small className="text-muted ms-1">
                    ({stats.gamesWon - stats.gamesLost > 0 ? '+' : ''}
                    {stats.gamesWon - stats.gamesLost})
                  </small>
                </td>
                <td className="text-center fw-bold">{stats.points}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        <small className="text-muted">
          P = Played, W = Wins, L = Losses, Pts = Points (2 for win)
        </small>
      </div>

      {/* T077: Matches Section */}
      <div className="mt-4">
        <button
          className="btn btn-outline-secondary btn-sm mb-3"
          onClick={() => setShowMatches(!showMatches)}
        >
          {showMatches ? '▼' : '▶'} {showMatches ? 'Hide' : 'Show'} Matches
        </button>

        {showMatches && (
          <>
            {isLoading && (
              <div className="text-center py-3">
                <Spinner animation="border" size="sm" />
                <p className="text-muted small mt-2">Loading matches...</p>
              </div>
            )}

            {isError && (
              <Alert variant="danger">
                Failed to load matches. Please try again.
              </Alert>
            )}

            {matches && matches.length > 0 && (
              <div className="d-flex flex-column gap-2">
                {matches.map((match) => (
                  <MatchResultDisplay key={match.id} match={match} />
                ))}
              </div>
            )}

            {matches && matches.length === 0 && (
              <Alert variant="info">
                No matches scheduled yet for this group.
              </Alert>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GroupStandingsTable;
