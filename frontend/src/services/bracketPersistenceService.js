/**
 * Bracket Persistence Service
 * Phase 01.1 - Bracket Generation and Seeding Persistence
 * API client for bracket generation, registration close, and slot swap endpoints.
 */
import apiClient from './apiClient';

/**
 * Close registration for a tournament
 * @param {string} tournamentId
 * @returns {Promise<{ registrationClosed: true }>}
 * @throws {ApiError} err.code: ALREADY_CLOSED | TOURNAMENT_NOT_FOUND
 */
export const closeRegistration = async (tournamentId) => {
  const response = await apiClient.patch(`/v1/tournaments/${tournamentId}/close-registration`);
  return response.data.data;
};

/**
 * Generate and persist a seeded bracket draw
 * @param {string} tournamentId
 * @param {Object} options
 * @param {string} [options.randomSeed] - Optional deterministic seed
 * @param {'PAIR_SCORE'|'AVERAGE_SCORE'} [options.doublesMethod='PAIR_SCORE']
 * @returns {Promise<{ bracketId, roundCount, matchCount }>}
 * @throws {ApiError} err.code: REGISTRATION_NOT_CLOSED | BRACKET_LOCKED | INSUFFICIENT_PLAYERS
 */
export const generateBracket = async (tournamentId, options = {}) => {
  const response = await apiClient.post(`/v1/tournaments/${tournamentId}/bracket`, options);
  return response.data.data;
};

/**
 * Batch swap player slots in the bracket
 * @param {string} tournamentId
 * @param {Array<{ matchId: string, field: 'player1Id'|'player2Id', newPlayerId: string }>} swaps
 * @returns {Promise<{ swapped: number }>}
 * @throws {ApiError} err.code: BYE_SLOT_NOT_SWAPPABLE | BRACKET_LOCKED
 */
export const swapSlots = async (tournamentId, swaps) => {
  const response = await apiClient.patch(`/v1/tournaments/${tournamentId}/bracket/slots`, { swaps });
  return response.data.data;
};
