// T030-T032: Tournament Rules Service - API client for tournament rules
import apiClient from './apiClient';

/**
 * T031: Set tournament format type and configuration
 * @param {string} tournamentId - Tournament ID
 * @param {string} formatType - KNOCKOUT, GROUP, SWISS, or COMBINED
 * @param {Object} formatConfig - Format-specific configuration
 * @returns {Promise<Object>} Updated tournament
 */
export async function setTournamentFormat(tournamentId, formatType, formatConfig) {
  const response = await apiClient.patch(`/v1/tournament-rules/${tournamentId}/format`, {
    formatType,
    formatConfig
  });
  return response.data;
}

/**
 * T032: Set default scoring rules for tournament
 * @param {string} tournamentId - Tournament ID
 * @param {Object} scoringRules - Scoring rules configuration
 * @returns {Promise<Object>} Updated tournament
 */
export async function setDefaultScoringRules(tournamentId, scoringRules) {
  const response = await apiClient.patch(`/v1/tournament-rules/${tournamentId}/default-rules`, scoringRules);
  return response.data;
}

/**
 * T048: Get tournament format and rules
 * @param {string} tournamentId - Tournament ID
 * @returns {Promise<Object>} Tournament format and rules
 */
export async function getTournamentFormat(tournamentId) {
  const response = await apiClient.get(`/v1/tournament-rules/${tournamentId}/format`);
  return response.data;
}

/**
 * T049: Get all rule overrides at all levels
 * @param {string} tournamentId - Tournament ID
 * @returns {Promise<Object>} All rule overrides
 */
export async function getAllRuleOverrides(tournamentId) {
  const response = await apiClient.get(`/v1/tournament-rules/${tournamentId}/all-rules`);
  return response.data;
}

/**
 * T047: Get effective rules for a specific match
 * @param {string} matchId - Match ID
 * @returns {Promise<Object>} Effective rules with cascade information
 */
export async function getEffectiveRulesForMatch(matchId) {
  const response = await apiClient.get(`/v1/match-rules/${matchId}/effective-rules`);
  return response.data;
}

/**
 * T081: Set group-level rule overrides
 * @param {string} groupId - Group ID
 * @param {Object} ruleOverrides - Partial scoring rules to override
 * @returns {Promise<Object>} Updated group
 */
export async function setGroupRuleOverrides(groupId, ruleOverrides) {
  const response = await apiClient.patch(`/v1/groups/${groupId}/rules`, ruleOverrides);
  return response.data;
}

/**
 * T082: Set bracket-level rule overrides
 * @param {string} bracketId - Bracket ID
 * @param {Object} ruleOverrides - Partial scoring rules to override
 * @returns {Promise<Object>} Updated bracket
 */
export async function setBracketRuleOverrides(bracketId, ruleOverrides) {
  const response = await apiClient.patch(`/v1/brackets/${bracketId}/rules`, ruleOverrides);
  return response.data;
}

/**
 * T083: Set round-level rule overrides
 * @param {string} roundId - Round ID
 * @param {Object} ruleOverrides - Partial scoring rules to override
 * @returns {Promise<Object>} Updated round
 */
export async function setRoundRuleOverrides(roundId, ruleOverrides) {
  const response = await apiClient.patch(`/v1/rounds/${roundId}/rules`, ruleOverrides);
  return response.data;
}

/**
 * T084: Set match-level rule overrides
 * @param {string} matchId - Match ID
 * @param {Object} ruleOverrides - Partial scoring rules to override
 * @returns {Promise<Object>} Updated match
 */
export async function setMatchRuleOverrides(matchId, ruleOverrides) {
  const response = await apiClient.patch(`/v1/matches/${matchId}/rules`, ruleOverrides);
  return response.data;
}

/**
 * T084: Remove rule overrides at any level
 * @param {string} entityType - Entity type (group, bracket, round, match)
 * @param {string} entityId - Entity ID
 * @returns {Promise<Object>} Updated entity
 */
export async function removeRuleOverrides(entityType, entityId) {
  const response = await apiClient.delete(`/v1/${entityType}s/${entityId}/rules`);
  return response.data;
}

/**
 * T069: Validate group division configuration
 * @param {number} playerCount - Total number of players
 * @param {number} groupSize - Desired group size
 * @returns {Promise<Object>} Validation result
 */
export async function validateGroups(playerCount, groupSize) {
  const response = await apiClient.post('/v1/tournament-rules/validate-groups', {
    playerCount,
    groupSize
  });
  return response.data;
}

/**
 * T108: Get available format types
 * @returns {Promise<Array>} List of available format types with labels and descriptions
 */
export async function getFormatTypes() {
  const response = await apiClient.get('/v1/tournament-rules/format-types');
  return response.data;
}

/**
 * T109: Get available scoring formats
 * @returns {Promise<Object>} Available scoring formats, advantage rules, and tiebreak triggers
 */
export async function getScoringFormats() {
  const response = await apiClient.get('/v1/tournament-rules/scoring-formats');
  return response.data;
}

export default {
  setTournamentFormat,
  setDefaultScoringRules,
  getTournamentFormat,
  getAllRuleOverrides,
  getEffectiveRulesForMatch,
  setGroupRuleOverrides,
  setBracketRuleOverrides,
  setRoundRuleOverrides,
  setMatchRuleOverrides,
  removeRuleOverrides,
  validateGroups,
  getFormatTypes,
  getScoringFormats
};
