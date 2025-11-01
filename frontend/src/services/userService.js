import apiClient from './apiClient';

// Create new user (admin creates organizer)
export const createUser = async (userData) => {
  const response = await apiClient.post('/users', userData);
  return response.data;
};

// List users with pagination and filters
export const listUsers = async (params = {}) => {
  const response = await apiClient.get('/users', { params });
  return response.data;
};

// Get specific user by ID
export const getUser = async (userId) => {
  const response = await apiClient.get(`/users/${userId}`);
  return response.data;
};

// Update user
export const updateUser = async (userId, updates) => {
  const response = await apiClient.patch(`/users/${userId}`, updates);
  return response.data;
};

// Delete user (soft delete)
export const deleteUser = async (userId) => {
  const response = await apiClient.delete(`/users/${userId}`);
  return response.data;
};

export default {
  createUser,
  listUsers,
  getUser,
  updateUser,
  deleteUser
};
