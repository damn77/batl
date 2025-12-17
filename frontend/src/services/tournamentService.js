import apiClient from './apiClient';

/**
 * Tournament Service - API calls for tournaments
 * Backend endpoints: /api/v1/tournaments
 */

/**
 * Get all tournaments with optional filters
 * @param {Object} filters - Optional filters (categoryId, status, startDate, page, limit)
 * @returns {Promise} List of tournaments with pagination
 */
export const listTournaments = async (filters = {}) => {
  const params = new URLSearchParams();

  if (filters.categoryId) params.append('categoryId', filters.categoryId);
  if (filters.status) params.append('status', filters.status);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);

  const query = params.toString();
  const url = query ? `/v1/tournaments?${query}` : '/v1/tournaments';

  const response = await apiClient.get(url);
  return response.data.data; // { tournaments: [], pagination: {} }
};

/**
 * Get tournament by ID
 * @param {string} id - Tournament UUID
 * @returns {Promise} Tournament object with category details
 */
export const getTournamentById = async (id) => {
  const response = await apiClient.get(`/v1/tournaments/${id}`);
  return response.data.data;
};

/**
 * Create a new tournament
 * @param {Object} tournamentData - { name, categoryId, description, location, startDate, endDate }
 * @returns {Promise} Created tournament
 */
export const createTournament = async (tournamentData) => {
  const response = await apiClient.post('/v1/tournaments', tournamentData);
  return response.data.data;
};

/**
 * Update existing tournament
 * @param {string} id - Tournament UUID
 * @param {Object} updates - Fields to update (can include categoryId if players remain eligible)
 * @returns {Promise} Updated tournament
 */
export const updateTournament = async (id, updates) => {
  const response = await apiClient.patch(`/v1/tournaments/${id}`, updates);
  return response.data.data;
};

/**
 * Delete tournament (only if status is SCHEDULED)
 * @param {string} id - Tournament UUID
 * @returns {Promise} Success message
 */
export const deleteTournament = async (id) => {
  const response = await apiClient.delete(`/v1/tournaments/${id}`);
  return response.data;
};

// Tournament status enum
export const TOURNAMENT_STATUS = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

// Status labels for display
export const STATUS_LABELS = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

// Status badge variants
export const STATUS_VARIANTS = {
  SCHEDULED: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'secondary'
};

/**
 * Get tournament point configuration
 * @param {string} id - Tournament UUID
 * @returns {Promise} Point configuration object
 */
export const getTournamentPointConfig = async (id) => {
  const response = await apiClient.get(`/v1/tournaments/${id}/point-config`);
  return response.data.data;
};

/**
 * Update tournament point configuration
 * @param {string} id - Tournament UUID
 * @param {Object} config - { calculationMethod, multiplicativeValue, doublePointsEnabled }
 * @returns {Promise} Updated point configuration
 */
export const updateTournamentPointConfig = async (id, config) => {
  const response = await apiClient.put(`/v1/tournaments/${id}/point-config`, config);
  return response.data.data;
};

/**
 * Calculate and award points for a completed tournament
 * @param {string} id - Tournament UUID
 * @param {Object} results - { results: [{ playerId/pairId, placement, finalRoundReached }] }
 * @returns {Promise} Calculation result summary
 */
export const calculateTournamentPoints = async (id, results) => {
  const response = await apiClient.post(`/v1/tournaments/${id}/calculate-points`, results);
  return response.data.data;
};

// Point calculation methods
export const POINT_CALCULATION_METHODS = {
  PLACEMENT: 'PLACEMENT',
  FINAL_ROUND: 'FINAL_ROUND'
};

