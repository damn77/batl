import apiClient from './apiClient';

// Login with email and password
export const login = async (email, password) => {
  try {
    const response = await apiClient.post('/auth/login', {
      email,
      password
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Logout
export const logout = async () => {
  try {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Check session status
export const checkSession = async () => {
  try {
    const response = await apiClient.get('/auth/session');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Player registration
export const register = async ({ email, password, name, phone }) => {
  try {
    const response = await apiClient.post('/auth/register', {
      email,
      password,
      name,
      phone
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default {
  login,
  logout,
  checkSession,
  register
};
