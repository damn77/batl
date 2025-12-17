import apiClient from './apiClient';

/**
 * Ranking Service - API calls for category rankings
 * Backend endpoints: /api/v1/rankings
 */

/**
 * Get all rankings summary
 * @param {number} year - Optional year
 * @returns {Promise} List of rankings
 */
export const getAllRankings = async (year) => {
  const params = year ? `?year=${year}` : '';
  const response = await apiClient.get(`/v1/rankings${params}`);
  return response.data.data;
};

/**
 * Get rankings for a category
 * @param {string} categoryId - Category UUID
 * @param {string} type - Optional ranking type (SINGLES, PAIR, MEN, WOMEN)
 * @param {number} year - Optional year
 * @param {Object} options - Optional pagination and search options
 * @param {number} options.page - Page number
 * @param {number} options.limit - Items per page
 * @param {string} options.search - Search term for player/pair names
 * @returns {Promise} List of rankings (filtered by type if provided)
 */
export const getRankingsForCategory = async (categoryId, type, year, options = {}) => {
  let url = `/v1/rankings/${categoryId}`;
  if (type) {
    url += `/type/${type}`;
  }

  const params = new URLSearchParams();
  if (year) params.append('year', year);
  if (options.page) params.append('page', options.page);
  if (options.limit) params.append('limit', options.limit);
  if (options.search) params.append('search', options.search);

  const queryString = params.toString() ? `?${params.toString()}` : '';
  const response = await apiClient.get(`${url}${queryString}`);
  return response.data.data;
};

/**
 * Get ranking entry breakdown
 * @param {string} categoryId - Category UUID
 * @param {string} entryId - Ranking entry UUID
 * @returns {Promise} Ranking entry details
 */
export const getRankingEntryBreakdown = async (categoryId, entryId) => {
  const response = await apiClient.get(`/v1/rankings/${categoryId}/entries/${entryId}/breakdown`);
  return response.data.data;
};

/**
 * Get pair rankings for a doubles category
 * @param {string} categoryId - Category UUID
 * @param {Object} options - Query options
 * @param {number} options.page - Page number for pagination
 * @param {number} options.limit - Items per page
 * @param {number} options.year - Optional year filter
 * @returns {Promise} Pair rankings with pagination
 */
export const getPairRankings = async (categoryId, options = {}) => {
  const { page = 1, limit = 50, year } = options;
  const params = new URLSearchParams();

  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);
  if (year) params.append('year', year);

  const queryString = params.toString() ? `?${params.toString()}` : '';
  const response = await apiClient.get(`/v1/rankings/${categoryId}/type/PAIR${queryString}`);
  return response.data.data;
};

// Helper to format win rate as percentage
export const formatWinRate = (winRate) => {
  return `${(winRate * 100).toFixed(1)}%`;
};

// Helper to format rank with suffix (1st, 2nd, 3rd, 4th, etc.)
export const formatRank = (rank) => {
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  return `${rank}th`;
};

// Helper to get rank badge variant
export const getRankBadgeVariant = (rank) => {
  if (rank === 1) return 'warning'; // Gold
  if (rank === 2) return 'secondary'; // Silver
  if (rank === 3) return 'danger'; // Bronze
  return 'info';
};
