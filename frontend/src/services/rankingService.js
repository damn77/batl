import apiClient from './apiClient';

/**
 * Ranking Service - API calls for category rankings
 * Backend endpoints: /api/v1/rankings
 * Note: Rankings are read-only (updated by backend after tournament completion)
 */

/**
 * Get category leaderboard (top rankings)
 * @param {string} categoryId - Category UUID
 * @param {Object} options - Optional pagination (limit, offset)
 * @returns {Promise} Category rankings with metadata
 */
export const getCategoryLeaderboard = async (categoryId, options = {}) => {
  const params = new URLSearchParams();

  if (options.limit) params.append('limit', options.limit);
  if (options.offset) params.append('offset', options.offset);

  const query = params.toString();
  const url = query
    ? `/v1/rankings/category/${categoryId}?${query}`
    : `/v1/rankings/category/${categoryId}`;

  const response = await apiClient.get(url);
  return response.data.data; // { categoryId, categoryName, rankings: [], total, lastUpdated }
};

/**
 * Get player's ranking in a specific category
 * @param {string} categoryId - Category UUID
 * @param {string} playerId - Player UUID
 * @returns {Promise} Player's ranking in category
 */
export const getPlayerRankingInCategory = async (categoryId, playerId) => {
  const response = await apiClient.get(`/v1/rankings/category/${categoryId}/player/${playerId}`);
  return response.data.data; // { rank, playerId, playerName, points, wins, losses, winRate }
};

/**
 * Get all rankings for a player across all categories
 * @param {string} playerId - Player UUID
 * @returns {Promise} Player's rankings in all categories
 */
export const getPlayerAllRankings = async (playerId) => {
  const response = await apiClient.get(`/v1/rankings/player/${playerId}`);
  return response.data.data; // { playerId, playerName, rankings: [] }
};

/**
 * Get pair rankings for a doubles category
 * Feature: 006-doubles-pairs - User Story 2 (T047)
 * @param {string} categoryId - Category UUID (must be DOUBLES type)
 * @param {Object} options - Optional pagination (page, limit)
 * @returns {Promise} Pair rankings with metadata
 */
export const getPairRankings = async (categoryId, options = {}) => {
  const params = new URLSearchParams();

  if (options.page) params.append('page', options.page);
  if (options.limit) params.append('limit', options.limit);

  const query = params.toString();
  const url = query
    ? `/v1/rankings/pairs/${categoryId}?${query}`
    : `/v1/rankings/pairs/${categoryId}`;

  const response = await apiClient.get(url);
  return response.data.data; // { category, rankings: [], pagination: {} }
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
