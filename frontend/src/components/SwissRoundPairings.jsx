// T085-T086: Swiss Round Pairings Component - Displays pairings and standings with Buchholz
import { useState, useMemo } from 'react';
import { Table, Alert, Spinner, Badge } from 'react-bootstrap';
import { useMatches } from '../services/tournamentViewService';
import MatchResultDisplay from './MatchResultDisplay';

/**
 * SwissRoundPairings - Displays Swiss system round pairings and current standings
 * T086: Implements standings calculation with wins and Buchholz tiebreaker
 *
 * @param {string} tournamentId - Tournament UUID
 * @param {Array} rounds - Array of round objects
 * @param {Array} players - Array of player objects in the tournament
 */
const SwissRoundPairings = ({ tournamentId, rounds, players }) => {
  const [selectedRound, setSelectedRound] = useState(null);

  // Fetch all matches for the tournament (Swiss format doesn't have brackets/groups)
  const { matches, isLoading, isError } = useMatches(tournamentId, {}, true);

  // T086: Calculate current standings with Buchholz tiebreaker
  const standings = useMemo(() => {
    if (!matches || matches.length === 0 || !players) {
      return (players || []).map((player, index) => ({
        position: index + 1,
        player,
        played: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        buchholz: 0
      }));
    }

    // Initialize player stats
    const playerStats = new Map();
    players.forEach(player => {
      playerStats.set(player.id, {
        player,
        played: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        opponentIds: [] // For Buchholz calculation
      });
    });

    // Calculate stats from completed matches
    const completedMatches = matches.filter(m => m.status === 'COMPLETED' && m.matchResult);

    completedMatches.forEach(match => {
      const player1Id = match.player1?.id;
      const player2Id = match.player2?.id;
      const result = match.matchResult;

      if (!player1Id || !player2Id) return;

      const stats1 = playerStats.get(player1Id);
      const stats2 = playerStats.get(player2Id);

      if (!stats1 || !stats2) return;

      // Update played count and opponent tracking
      stats1.played++;
      stats2.played++;
      stats1.opponentIds.push(player2Id);
      stats2.opponentIds.push(player1Id);

      // Update wins/losses/draws and points
      if (result.winner === 'PLAYER1') {
        stats1.wins++;
        stats1.points += 1;
        stats2.losses++;
      } else if (result.winner === 'PLAYER2') {
        stats2.wins++;
        stats2.points += 1;
        stats1.losses++;
      } else {
        // Draw
        stats1.draws++;
        stats2.draws++;
        stats1.points += 0.5;
        stats2.points += 0.5;
      }
    });

    // Calculate Buchholz score (sum of opponents' points)
    playerStats.forEach(stats => {
      stats.buchholz = stats.opponentIds.reduce((sum, oppId) => {
        const oppStats = playerStats.get(oppId);
        return sum + (oppStats ? oppStats.points : 0);
      }, 0);
    });

    // Convert to array and sort
    const standingsArray = Array.from(playerStats.values());

    // Sort by: 1) Points, 2) Buchholz, 3) Wins
    standingsArray.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
      return b.wins - a.wins;
    });

    // Add position
    standingsArray.forEach((stats, index) => {
      stats.position = index + 1;
    });

    return standingsArray;
  }, [matches, players]);

  // Get matches for selected round
  const roundMatches = useMemo(() => {
    if (!selectedRound || !matches) return [];
    return matches.filter(m => m.roundId === selectedRound.id);
  }, [selectedRound, matches]);

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" />
        <p className="text-muted mt-2">Loading Swiss pairings...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="danger">
        Failed to load Swiss pairings. Please try again.
      </Alert>
    );
  }

  return (
    <div>
      <h5 className="mb-3">Swiss System Tournament</h5>

      {/* Current Standings */}
      <div className="mb-4">
        <h6 className="mb-3">Current Standings</h6>
        <div className="table-responsive">
          <Table striped hover size="sm">
            <thead className="table-light">
              <tr>
                <th style={{ width: '50px' }}>#</th>
                <th>Player</th>
                <th className="text-center">P</th>
                <th className="text-center">W</th>
                <th className="text-center">D</th>
                <th className="text-center">L</th>
                <th className="text-center">Pts</th>
                <th className="text-center">Buchholz</th>
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
                  <td className="text-center">{stats.draws}</td>
                  <td className="text-center">{stats.losses}</td>
                  <td className="text-center fw-bold">{stats.points}</td>
                  <td className="text-center text-muted">{stats.buchholz.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <small className="text-muted">
            P = Played, W = Wins, D = Draws, L = Losses, Pts = Points (1 for win, 0.5 for draw)
            <br />
            Buchholz = Sum of opponents&apos; points (tiebreaker)
          </small>
        </div>
      </div>

      {/* Round Selection */}
      {rounds && rounds.length > 0 && (
        <div className="mb-4">
          <h6 className="mb-3">Round Pairings</h6>
          <div className="d-flex gap-2 flex-wrap mb-3">
            {rounds.map(round => (
              <button
                key={round.id}
                className={`btn btn-sm ${
                  selectedRound?.id === round.id
                    ? 'btn-primary'
                    : 'btn-outline-primary'
                }`}
                onClick={() => setSelectedRound(round)}
              >
                Round {round.roundNumber}
              </button>
            ))}
          </div>

          {/* Round Matches */}
          {selectedRound && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0">
                  Round {selectedRound.roundNumber}
                  {selectedRound.name && ` - ${selectedRound.name}`}
                </h6>
                <Badge bg="primary">{roundMatches.length} matches</Badge>
              </div>

              {roundMatches.length > 0 ? (
                <div className="d-flex flex-column gap-2">
                  {roundMatches.map(match => (
                    <MatchResultDisplay key={match.id} match={match} />
                  ))}
                </div>
              ) : (
                <Alert variant="info">
                  No matches scheduled yet for this round.
                </Alert>
              )}
            </div>
          )}

          {!selectedRound && (
            <Alert variant="info">
              Select a round to view pairings and results.
            </Alert>
          )}
        </div>
      )}

      {(!matches || matches.length === 0) && (
        <Alert variant="info">
          No matches scheduled yet for this tournament.
        </Alert>
      )}
    </div>
  );
};

export default SwissRoundPairings;
