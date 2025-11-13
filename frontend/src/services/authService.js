import apiClient from './apiClient';

// Login with email and password
export const login = async (email, password) => {
  const response = await apiClient.post('/auth/login', {
    email,
    password
  });
  return response.data;
};

// Logout
export const logout = async () => {
  const response = await apiClient.post('/auth/logout');
  return response.data;
};

// Check session status
export const checkSession = async () => {
  const response = await apiClient.get('/auth/session');
  return response.data;
};

// Player registration
export const register = async ({ email, password, name, phone }) => {
  const response = await apiClient.post('/auth/register', {
    email,
    password,
    name,
    phone
  });
  return response.data;
};

export default {
  login,
  logout,
  checkSession,
  register
};
