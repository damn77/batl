import apiClient from './apiClient.js';

/**
 * Submit or update a match result.
 *
 * For regular results: { formatType, winner, sets }
 * For special outcomes (organizer only): { outcome, winner }
 *
 * Errors are normalized by apiClient interceptor:
 *   err.message  → human-readable error
 *   err.status   → HTTP status code
 *   err.code     → error code string
 *   err.details  → additional details (e.g., violations)
 *
 * @param {string} matchId - Match UUID
 * @param {Object} resultData - Result payload
 * @returns {Promise<Object>} Updated match from backend
 */
export async function submitMatchResult(matchId, resultData) {
  const response = await apiClient.patch(`/v1/matches/${matchId}/result`, resultData);
  return response.data.data;
}

/**
 * Dry-run a match result submission to detect downstream impact.
 * Returns impact data without modifying any match records.
 *
 * @param {string} matchId - Match UUID
 * @param {Object} resultData - Result payload (same as submitMatchResult)
 * @returns {Promise<Object>} Impact summary: { dryRun, impactedMainMatches, impactedConsolationMatches, totalImpactedMatches, affectedPlayers, requiresConfirmation }
 */
export async function submitMatchResultDryRun(matchId, resultData) {
  const response = await apiClient.patch(`/v1/matches/${matchId}/result?dryRun=true`, resultData);
  return response.data.data;
}
