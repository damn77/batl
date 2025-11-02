import apiClient from './apiClient';

/**
 * Registration Service - API calls for category registrations
 * Backend endpoints: /api/v1/registrations
 */

/**
 * Register player for a category
 * @param {string} playerId - Player UUID
 * @param {string} categoryId - Category UUID
 * @returns {Promise} Registration object
 */
export const registerPlayer = async (playerId, categoryId) => {
  const response = await apiClient.post('/v1/registrations', {
    playerId,
    categoryId
  });
  return response.data.data;
};

/**
 * Bulk register player for multiple categories
 * @param {string} playerId - Player UUID
 * @param {Array<string>} categoryIds - Array of category UUIDs
 * @returns {Promise} Results object with successful and failed registrations
 */
export const bulkRegisterPlayer = async (playerId, categoryIds) => {
  const response = await apiClient.post('/v1/registrations/bulk', {
    playerId,
    categoryIds
  });
  return response.data.data;
};

/**
 * Check player eligibility for a category
 * @param {string} playerId - Player UUID
 * @param {string} categoryId - Category UUID
 * @returns {Promise} Eligibility result { eligible: boolean, validations: [] }
 */
export const checkEligibility = async (playerId, categoryId) => {
  const response = await apiClient.post('/v1/registrations/check-eligibility', {
    playerId,
    categoryId
  });
  return response.data.data;
};

/**
 * Get all registrations for a player
 * @param {string} playerId - Player UUID
 * @param {Object} options - Optional filters (status, include)
 * @returns {Promise} Player's registrations with counts
 */
export const getPlayerRegistrations = async (playerId, options = {}) => {
  const params = new URLSearchParams();

  if (options.status) params.append('status', options.status);
  if (options.include) params.append('include', options.include);

  const query = params.toString();
  const url = query
    ? `/v1/registrations/player/${playerId}?${query}`
    : `/v1/registrations/player/${playerId}`;

  const response = await apiClient.get(url);
  return response.data.data; // { playerId, playerName, registrations: [], counts: {} }
};

/**
 * Get all registrations for a category
 * @param {string} categoryId - Category UUID
 * @param {Object} options - Optional filters (status, include, page, limit)
 * @returns {Promise} Category's registrations with pagination
 */
export const getCategoryRegistrations = async (categoryId, options = {}) => {
  const params = new URLSearchParams();

  if (options.status) params.append('status', options.status);
  if (options.include) params.append('include', options.include);
  if (options.page) params.append('page', options.page);
  if (options.limit) params.append('limit', options.limit);

  const query = params.toString();
  const url = query
    ? `/v1/registrations/category/${categoryId}?${query}`
    : `/v1/registrations/category/${categoryId}`;

  const response = await apiClient.get(url);
  return response.data.data; // { categoryId, categoryName, registrations: [], counts: {}, pagination: {} }
};

/**
 * Withdraw player registration
 * @param {string} registrationId - Registration UUID
 * @returns {Promise} Updated registration
 */
export const withdrawRegistration = async (registrationId) => {
  const response = await apiClient.patch(`/v1/registrations/${registrationId}/withdraw`);
  return response.data.data;
};

/**
 * Reactivate withdrawn registration (ADMIN/ORGANIZER only)
 * @param {string} registrationId - Registration UUID
 * @returns {Promise} Updated registration
 */
export const reactivateRegistration = async (registrationId) => {
  const response = await apiClient.patch(`/v1/registrations/${registrationId}/reactivate`);
  return response.data.data;
};

// Registration status enum
export const REGISTRATION_STATUS = {
  ACTIVE: 'ACTIVE',
  WITHDRAWN: 'WITHDRAWN',
  SUSPENDED: 'SUSPENDED'
};

// Status labels for display
export const STATUS_LABELS = {
  ACTIVE: 'Active',
  WITHDRAWN: 'Withdrawn',
  SUSPENDED: 'Suspended'
};

// Status badge variants
export const STATUS_VARIANTS = {
  ACTIVE: 'success',
  WITHDRAWN: 'secondary',
  SUSPENDED: 'warning'
};
