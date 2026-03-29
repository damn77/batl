/**
 * Advancement Service
 * Phase 30 - Combined Format Advancement
 * API client for tournament advancement (group-stage to knockout bracket) endpoints.
 */
import apiClient from './apiClient';

/**
 * Get advancement preview -- waterfall player assignments
 * @param {string} tournamentId
 * @returns {Promise<Object>} { mainSlots, secondarySlots, eliminated, mainBracketInfo, secondaryBracketInfo }
 */
export async function getAdvancementPreview(tournamentId) {
  const response = await apiClient.get(`/v1/tournaments/${tournamentId}/advancement/preview`);
  return response.data.data;
}

/**
 * Confirm advancement -- generate knockout brackets from group results
 * @param {string} tournamentId
 * @returns {Promise<Object>} { success, mainBracket, secondaryBracket }
 */
export async function confirmAdvancement(tournamentId) {
  const response = await apiClient.post(`/v1/tournaments/${tournamentId}/advancement`);
  return response.data.data;
}

/**
 * Revert advancement -- delete brackets, unlock group results
 * @param {string} tournamentId
 * @returns {Promise<Object>} { success }
 */
export async function revertAdvancement(tournamentId) {
  const response = await apiClient.delete(`/v1/tournaments/${tournamentId}/advancement`);
  return response.data.data;
}
