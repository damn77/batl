import apiClient from './apiClient';

// Create new player profile
export const createPlayer = async (playerData) => {
  const response = await apiClient.post('/players', playerData);
  return response.data;
};

// List player profiles with pagination and search
export const listPlayers = async (params = {}) => {
  const response = await apiClient.get('/players', { params });
  return response.data;
};

// Get specific player profile by ID
export const getPlayer = async (playerId) => {
  const response = await apiClient.get(`/players/${playerId}`);
  return response.data;
};

// Update player profile
export const updatePlayer = async (playerId, updates) => {
  const response = await apiClient.patch(`/players/${playerId}`, updates);
  return response.data;
};

// Check for duplicate player profiles
export const checkDuplicates = async (name, email) => {
  const params = {};
  if (name) params.name = name;
  if (email) params.email = email;

  const response = await apiClient.get('/players/check-duplicates', { params });
  return response.data;
};

/**
 * Get a player's match history with pagination and optional category filter
 * Phase 3 - STATS-01
 * @param {string} playerId - Player profile ID
 * @param {Object} params - { page, limit, categoryId }
 * @returns {Promise<{ matches: Array, pagination: { total, page, limit, totalPages } }>}
 */
export const getPlayerMatchHistory = async (playerId, { page = 1, limit = 20, categoryId = null } = {}) => {
  const params = new URLSearchParams();
  params.append('page', page);
  params.append('limit', limit);
  if (categoryId) params.append('categoryId', categoryId);

  // Backend route is at /api/players (not /api/v1/players) — see 03-01-SUMMARY.md
  const response = await apiClient.get(`/players/${playerId}/match-history?${params.toString()}`);
  return response.data.data; // { matches: [...], pagination: { total, page, limit, totalPages } }
};

/**
 * Get a player's public profile (name, hasAccount, etc.)
 * Phase 3 - STATS-02
 * @param {string} playerId - Player profile ID
 * @returns {Promise<Object>} Player profile object
 */
export const getPublicPlayerProfile = async (playerId) => {
  // Backend route is at /api/players (not /api/v1/players)
  const response = await apiClient.get(`/players/${playerId}`);
  return response.data.profile;
};

export default {
  createPlayer,
  listPlayers,
  getPlayer,
  updatePlayer,
  checkDuplicates,
  getPlayerMatchHistory,
  getPublicPlayerProfile
};
