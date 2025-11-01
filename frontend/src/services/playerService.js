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

export default {
  createPlayer,
  listPlayers,
  getPlayer,
  updatePlayer,
  checkDuplicates
};
