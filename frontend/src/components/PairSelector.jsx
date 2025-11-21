import { Form, Row, Col, Alert } from 'react-bootstrap';
import PropTypes from 'prop-types';
import PairSeedingDisplay from './PairSeedingDisplay';

/**
 * PairSelector Component
 * Feature: 006-doubles-pairs - User Story 1 (T028)
 *
 * Allows selection of two players to form a doubles pair.
 * Validates that:
 * - Two different players are selected
 * - Both selections are non-empty
 *
 * @param {Array} players - Array of player objects with id and name
 * @param {string} player1Id - Selected first player ID
 * @param {string} player2Id - Selected second player ID
 * @param {Function} onPlayer1Change - Callback when player 1 selection changes
 * @param {Function} onPlayer2Change - Callback when player 2 selection changes
 * @param {boolean} disabled - Disable selection
 * @param {boolean} player1Locked - Lock Player 1 selection (for PLAYER role users)
 * @param {string} error - Error message to display
 * @param {number} player1RankingPoints - Player 1's ranking points for seeding calculation
 * @param {number} player2RankingPoints - Player 2's ranking points for seeding calculation
 * @param {boolean} showSeeding - Whether to show seeding score breakdown
 */
const PairSelector = ({
  players,
  player1Id,
  player2Id,
  onPlayer1Change,
  onPlayer2Change,
  disabled = false,
  player1Locked = false,
  error = null,
  player1RankingPoints = 0,
  player2RankingPoints = 0,
  showSeeding = false,
}) => {
  // Filter out the selected player from the other dropdown
  const availablePlayer2Options = players.filter(p => p.id !== player1Id);
  const availablePlayer1Options = players.filter(p => p.id !== player2Id);

  return (
    <div className="pair-selector">
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Player 1 *</Form.Label>
            <Form.Select
              value={player1Id}
              onChange={(e) => onPlayer1Change(e.target.value)}
              disabled={disabled || player1Locked}
              isInvalid={error && !player1Id}
            >
              <option value="">Select Player 1...</option>
              {availablePlayer1Options.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                  {player.gender && ` (${player.gender})`}
                  {player.birthDate && ` - Age ${calculateAge(player.birthDate)}`}
                </option>
              ))}
            </Form.Select>
            <Form.Text className="text-muted">
              {player1Locked
                ? 'Your profile is automatically selected'
                : 'Select the first player in the doubles pair'}
            </Form.Text>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Player 2 *</Form.Label>
            <Form.Select
              value={player2Id}
              onChange={(e) => onPlayer2Change(e.target.value)}
              disabled={disabled || !player1Id}
              isInvalid={error && !player2Id}
            >
              <option value="">Select Player 2...</option>
              {availablePlayer2Options.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                  {player.gender && ` (${player.gender})`}
                  {player.birthDate && ` - Age ${calculateAge(player.birthDate)}`}
                </option>
              ))}
            </Form.Select>
            <Form.Text className="text-muted">
              {!player1Id
                ? 'Select Player 1 first'
                : 'Select the second player in the doubles pair'}
            </Form.Text>
          </Form.Group>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}

      {player1Id && player2Id && player1Id === player2Id && (
        <Alert variant="warning" className="mb-3">
          Both players cannot be the same person
        </Alert>
      )}

      {player1Id && player2Id && player1Id !== player2Id && (
        <Alert variant="info" className="mb-3">
          <strong>Selected Pair:</strong>{' '}
          {players.find((p) => p.id === player1Id)?.name} &amp;{' '}
          {players.find((p) => p.id === player2Id)?.name}
          {/* T061: Show seeding score when enabled */}
          {showSeeding && (
            <div className="mt-2">
              <strong>Seeding Score:</strong>{' '}
              <PairSeedingDisplay
                player1Name={players.find((p) => p.id === player1Id)?.name || 'Player 1'}
                player1Points={player1RankingPoints}
                player2Name={players.find((p) => p.id === player2Id)?.name || 'Player 2'}
                player2Points={player2RankingPoints}
                size="normal"
                showBreakdown={true}
              />
            </div>
          )}
        </Alert>
      )}
    </div>
  );
};

// Helper to calculate age from birthdate
const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  return today.getFullYear() - birth.getFullYear();
};

PairSelector.propTypes = {
  players: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      gender: PropTypes.string,
      birthDate: PropTypes.string,
    })
  ).isRequired,
  player1Id: PropTypes.string.isRequired,
  player2Id: PropTypes.string.isRequired,
  onPlayer1Change: PropTypes.func.isRequired,
  onPlayer2Change: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  player1Locked: PropTypes.bool,
  error: PropTypes.string,
  player1RankingPoints: PropTypes.number,
  player2RankingPoints: PropTypes.number,
  showSeeding: PropTypes.bool,
};

export default PairSelector;
