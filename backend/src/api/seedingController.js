import * as seedingService from '../services/seedingService.js';

/**
 * GET /api/v1/seeding-score/:entityType/:entityId/category/:categoryId
 */
export async function getSeedingScore(req, res, next) {
    try {
        const { entityType, entityId, categoryId } = req.params;
        const score = await seedingService.getSeedingScore(entityType.toUpperCase(), entityId, categoryId);
        return res.status(200).json({ success: true, data: { seedingScore: score } });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/v1/seeding-score/bulk
 */
export async function bulkCalculateSeedingScores(req, res, next) {
    try {
        const { categoryId, entities } = req.body;
        const scores = await seedingService.bulkCalculateSeedingScores(categoryId, entities);
        return res.status(200).json({ success: true, data: scores });
    } catch (err) {
        next(err);
    }
}
