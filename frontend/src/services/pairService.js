import apiClient from './apiClient';

/**
 * Pair Service - API calls for doubles pairs
 * Feature: 006-doubles-pairs
 * Backend endpoints: /api/v1/pairs, /api/v1/registrations/pair
 */

/**
 * Create or get existing doubles pair
 * @param {string} player1Id - First player UUID
 * @param {string} player2Id - Second player UUID
 * @param {string} categoryId - Category UUID (must be DOUBLES type)
 * @returns {Promise} Pair object with isNew flag
 */
export const createOrGetPair = async (player1Id, player2Id, categoryId) => {
  const response = await apiClient.post('/v1/pairs', {
    player1Id,
    player2Id,
    categoryId,
  });
  return response.data.data;
};

/**
 * Get pair details by ID
 * @param {string} pairId - Pair UUID
 * @param {boolean} includeDeleted - Include soft-deleted pairs
 * @returns {Promise} Pair object with full details
 */
export const getPairById = async (pairId, includeDeleted = false) => {
  const params = includeDeleted ? '?includeDeleted=true' : '';
  const response = await apiClient.get(`/v1/pairs/${pairId}${params}`);
  return response.data.data;
};

/**
 * List pairs with filtering and pagination
 * @param {Object} options - Filter options
 * @param {string} options.categoryId - Filter by category
 * @param {string} options.playerId - Filter pairs containing this player
 * @param {boolean} options.includeDeleted - Include soft-deleted pairs
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @returns {Promise} { pairs: [], pagination: {} }
 */
export const listPairs = async (options = {}) => {
  const params = new URLSearchParams();

  if (options.categoryId) params.append('categoryId', options.categoryId);
  if (options.playerId) params.append('playerId', options.playerId);
  if (options.includeDeleted) params.append('includeDeleted', 'true');
  if (options.page) params.append('page', options.page);
  if (options.limit) params.append('limit', options.limit);

  const query = params.toString();
  const url = query ? `/v1/pairs?${query}` : '/v1/pairs';

  const response = await apiClient.get(url);
  return response.data.data;
};

/**
 * Register a doubles pair for a tournament
 * @param {string} tournamentId - Tournament UUID
 * @param {string} pairId - Pair UUID
 * @param {boolean} eligibilityOverride - Bypass eligibility checks (ORGANIZER/ADMIN only)
 * @param {string} overrideReason - Required if eligibilityOverride is true
 * @returns {Promise} Registration object
 */
export const registerPairForTournament = async (
  tournamentId,
  pairId,
  eligibilityOverride = false,
  overrideReason = null
) => {
  const response = await apiClient.post('/v1/registrations/pair', {
    tournamentId,
    pairId,
    eligibilityOverride,
    overrideReason,
  });
  return response.data.data;
};

/**
 * Check pair eligibility for tournament
 * @param {string} tournamentId - Tournament UUID
 * @param {string} pairId - Pair UUID
 * @returns {Promise} { eligible: boolean, violations: [] }
 */
export const checkPairEligibility = async (tournamentId, pairId) => {
  const response = await apiClient.post('/v1/registrations/pair/check', {
    tournamentId,
    pairId,
  });
  return response.data.data;
};

/**
 * Withdraw pair registration
 * @param {string} registrationId - Registration UUID
 * @returns {Promise} { ...registration, pairDeleted: boolean, message: string }
 */
export const withdrawPairRegistration = async (registrationId) => {
  const response = await apiClient.delete(`/v1/registrations/pair/${registrationId}`);
  return response.data.data;
};

/**
 * Get player's pairs across all categories
 * @param {string} playerId - Player UUID
 * @param {Object} options - Filter options
 * @returns {Promise} { pairs: [], pagination: {} }
 */
export const getPlayerPairs = async (playerId, options = {}) => {
  return listPairs({ ...options, playerId });
};

/**
 * T064: Recalculate seeding scores for all pairs in a category
 * @param {string} categoryId - Category UUID
 * @returns {Promise} { categoryId, categoryName, pairsUpdated, message }
 */
export const recalculateCategorySeeding = async (categoryId) => {
  const response = await apiClient.post(`/v1/pairs/recalculate-seeding/${categoryId}`);
  return response.data.data;
};

// Pair registration status enum (reuses TournamentRegistrationStatus)
export const PAIR_REGISTRATION_STATUS = {
  REGISTERED: 'REGISTERED',
  WAITLISTED: 'WAITLISTED',
  WITHDRAWN: 'WITHDRAWN',
  CANCELLED: 'CANCELLED',
};

// Status labels for display
export const PAIR_STATUS_LABELS = {
  REGISTERED: 'Registered',
  WAITLISTED: 'Waitlisted',
  WITHDRAWN: 'Withdrawn',
  CANCELLED: 'Cancelled',
};

// Status badge variants
export const PAIR_STATUS_VARIANTS = {
  REGISTERED: 'success',
  WAITLISTED: 'warning',
  WITHDRAWN: 'secondary',
  CANCELLED: 'danger',
};
