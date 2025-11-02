import apiClient from './apiClient';

/**
 * Category Service - API calls for tournament categories
 * Backend endpoints: /api/v1/categories
 */

/**
 * Get all categories with optional filters
 * @param {Object} filters - Optional filters (type, ageGroup, gender, page, limit)
 * @returns {Promise} List of categories with pagination
 */
export const listCategories = async (filters = {}) => {
  const params = new URLSearchParams();

  if (filters.type) params.append('type', filters.type);
  if (filters.ageGroup) params.append('ageGroup', filters.ageGroup);
  if (filters.gender) params.append('gender', filters.gender);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);

  const query = params.toString();
  const url = query ? `/v1/categories?${query}` : '/v1/categories';

  const response = await apiClient.get(url);
  return response.data.data; // { categories: [], pagination: {} }
};

/**
 * Get category by ID
 * @param {string} id - Category UUID
 * @returns {Promise} Category object
 */
export const getCategoryById = async (id) => {
  const response = await apiClient.get(`/v1/categories/${id}`);
  return response.data.data;
};

/**
 * Create a new category
 * @param {Object} categoryData - { type, ageGroup, gender, description }
 * @returns {Promise} Created category
 */
export const createCategory = async (categoryData) => {
  const response = await apiClient.post('/v1/categories', categoryData);
  return response.data.data;
};

/**
 * Update existing category
 * @param {string} id - Category UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise} Updated category
 */
export const updateCategory = async (id, updates) => {
  const response = await apiClient.patch(`/v1/categories/${id}`, updates);
  return response.data.data;
};

/**
 * Delete category
 * @param {string} id - Category UUID
 * @returns {Promise} Success message
 */
export const deleteCategory = async (id) => {
  const response = await apiClient.delete(`/v1/categories/${id}`);
  return response.data;
};

/**
 * Get category statistics (tournaments, registrations, rankings count)
 * @param {string} id - Category UUID
 * @returns {Promise} Category with stats
 */
export const getCategoryStats = async (id) => {
  const response = await apiClient.get(`/v1/categories/${id}/stats`);
  return response.data.data;
};

// Enum values for dropdowns
export const CATEGORY_TYPES = {
  SINGLES: 'SINGLES',
  DOUBLES: 'DOUBLES'
};

export const AGE_GROUPS = {
  ALL_AGES: 'ALL_AGES',
  AGE_20: 'AGE_20',
  AGE_25: 'AGE_25',
  AGE_30: 'AGE_30',
  AGE_35: 'AGE_35',
  AGE_40: 'AGE_40',
  AGE_45: 'AGE_45',
  AGE_50: 'AGE_50',
  AGE_55: 'AGE_55',
  AGE_60: 'AGE_60',
  AGE_65: 'AGE_65',
  AGE_70: 'AGE_70',
  AGE_75: 'AGE_75',
  AGE_80: 'AGE_80'
};

export const GENDERS = {
  MEN: 'MEN',
  WOMEN: 'WOMEN',
  MIXED: 'MIXED'
};

// Helper to format category display name
export const formatCategoryName = (type, ageGroup, gender) => {
  const genderLabel = gender === 'MEN' ? "Men's" : gender === 'WOMEN' ? "Women's" : 'Mixed';
  const typeLabel = type === 'SINGLES' ? 'Singles' : 'Doubles';
  const ageLabel = ageGroup === 'ALL_AGES' ? '(All ages)' : `${ageGroup.replace('AGE_', '')}+`;

  return `${genderLabel} ${typeLabel} ${ageLabel}`;
};
