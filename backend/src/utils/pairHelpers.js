// Helper utilities for doubles pair management
// Feature: 006-doubles-pairs

/**
 * Sorts two player IDs to ensure consistent ordering (player1Id < player2Id)
 * This ensures that pairs are stored uniquely regardless of input order
 *
 * @param {string} playerId1 - First player ID
 * @param {string} playerId2 - Second player ID
 * @returns {Object} Object with sorted player IDs { player1Id, player2Id }
 * @throws {Error} If both player IDs are the same
 *
 * @example
 * sortPlayerIds('uuid-b', 'uuid-a')
 * // Returns: { player1Id: 'uuid-a', player2Id: 'uuid-b' }
 */
export function sortPlayerIds(playerId1, playerId2) {
  if (playerId1 === playerId2) {
    throw new Error('Player IDs must be different');
  }

  if (playerId1 < playerId2) {
    return {
      player1Id: playerId1,
      player2Id: playerId2,
    };
  }

  return {
    player1Id: playerId2,
    player2Id: playerId1,
  };
}

/**
 * Checks if a player is part of a pair
 *
 * @param {Object} pair - DoublesPair object with player1Id and player2Id
 * @param {string} playerId - Player ID to check
 * @returns {boolean} True if player is in the pair
 *
 * @example
 * isPlayerInPair(pair, 'uuid-123')
 * // Returns: true if pair.player1Id or pair.player2Id === 'uuid-123'
 */
export function isPlayerInPair(pair, playerId) {
  return pair.player1Id === playerId || pair.player2Id === playerId;
}

/**
 * Gets the partner's ID given a player ID and a pair
 *
 * @param {Object} pair - DoublesPair object with player1Id and player2Id
 * @param {string} playerId - Player ID whose partner to find
 * @returns {string|null} Partner's player ID, or null if playerId is not in pair
 *
 * @example
 * getPartnerId(pair, pair.player1Id)
 * // Returns: pair.player2Id
 */
export function getPartnerId(pair, playerId) {
  if (pair.player1Id === playerId) {
    return pair.player2Id;
  }
  if (pair.player2Id === playerId) {
    return pair.player1Id;
  }
  return null;
}

/**
 * Validates that a pair object has valid player IDs
 *
 * @param {Object} pair - Pair object to validate
 * @param {string} pair.player1Id - First player ID
 * @param {string} pair.player2Id - Second player ID
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
export function validatePairPlayerIds(pair) {
  const errors = [];

  if (!pair.player1Id || typeof pair.player1Id !== 'string') {
    errors.push('player1Id is required and must be a string');
  }

  if (!pair.player2Id || typeof pair.player2Id !== 'string') {
    errors.push('player2Id is required and must be a string');
  }

  if (pair.player1Id === pair.player2Id) {
    errors.push('player1Id and player2Id must be different');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Formats a pair display name from player names
 *
 * @param {string} player1Name - First player's name
 * @param {string} player2Name - Second player's name
 * @returns {string} Formatted pair name (e.g., "John Doe & Jane Smith")
 */
export function formatPairName(player1Name, player2Name) {
  return `${player1Name} & ${player2Name}`;
}
