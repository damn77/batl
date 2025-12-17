import apiClient from './apiClient';

/**
 * Get seeding score for an entity
 * @param {string} entityType - PLAYER or PAIR
 * @param {string} entityId - Player or Pair ID
 * @param {string} categoryId - Category ID
 * @returns {Promise<number>} Seeding score
 */
export const getSeedingScore = async (entityType, entityId, categoryId) => {
    const response = await apiClient.get(`/v1/seeding-score/${entityType}/${entityId}/category/${categoryId}`);
    return response.data.data.seedingScore;
};

/**
 * Bulk calculate seeding scores
 * @param {string} categoryId
 * @param {Array} entities - [{ entityType, entityId }]
 * @returns {Promise<Array>} [{ entityId, seedingScore }]
 */
export const bulkCalculateSeedingScores = async (categoryId, entities) => {
    const response = await apiClient.post('/v1/seeding-score/bulk', { categoryId, entities });
    return response.data.data;
};
