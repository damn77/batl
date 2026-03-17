/**
 * Group Draw Service
 * Phase 27 - Group Formation
 * API client for group draw generation and player swap endpoints.
 */
import apiClient from './apiClient';

/**
 * Generate group draw for a tournament
 * @param {string} tournamentId
 * @param {Object} options
 * @param {number} options.groupCount - Number of groups (>= 2)
 * @param {number} [options.seededRounds=0] - Number of seeded rounds for snake draft
 * @param {string} [options.randomSeed] - Optional deterministic seed
 * @returns {Promise<{ groups, participantCount, matchCount, randomSeed }>}
 * @throws {ApiError} err.code: REGISTRATION_NOT_CLOSED | INSUFFICIENT_PLAYERS | INVALID_GROUP_COUNT | UNBALANCED_GROUPS
 */
export const generateGroupDraw = async (tournamentId, options = {}) => {
  const response = await apiClient.post(`/v1/tournaments/${tournamentId}/group-draw`, options);
  return response.data.data;
};

/**
 * Swap two participants between groups
 * @param {string} tournamentId
 * @param {string} participantAId - GroupParticipant ID
 * @param {string} participantBId - GroupParticipant ID
 * @returns {Promise<{ swapped: true, affectedGroups: string[] }>}
 * @throws {ApiError} err.code: PARTICIPANT_NOT_FOUND | SAME_GROUP_SWAP | TOURNAMENT_LOCKED
 */
export const swapGroupParticipants = async (tournamentId, participantAId, participantBId) => {
  const response = await apiClient.post(`/v1/tournaments/${tournamentId}/group-draw/swap`, {
    participantAId,
    participantBId
  });
  return response.data.data;
};
