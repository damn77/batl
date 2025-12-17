import { PrismaClient } from '@prisma/client';
import createHttpError from 'http-errors';
import * as pairService from './pairService.js';

const prisma = new PrismaClient();

/**
 * Get seeding score for an entity in a category
 * @param {string} entityType - PLAYER or PAIR
 * @param {string} entityId - Player or Pair ID
 * @param {string} categoryId - Category ID
 * @returns {Promise<number>} Seeding score
 */
export async function getSeedingScore(entityType, entityId, categoryId) {
    if (entityType === 'PAIR') {
        return await pairService.calculateSeedingScore(entityId);
    }

    // For players
    const currentYear = new Date().getFullYear();

    // Determine ranking type
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) throw createHttpError(404, 'Category not found');

    let rankingType = 'SINGLES';
    if (category.type === 'DOUBLES') {
        const player = await prisma.playerProfile.findUnique({ where: { id: entityId } });
        if (!player) throw createHttpError(404, 'Player not found');
        rankingType = player.gender;
    }

    const rankingEntry = await prisma.rankingEntry.findFirst({
        where: {
            ranking: {
                categoryId,
                year: currentYear,
                type: rankingType
            },
            playerId: entityId
        }
    });

    return rankingEntry ? rankingEntry.seedingScore : 0;
}

/**
 * Bulk calculate seeding scores
 * @param {string} categoryId
 * @param {Array} entities - [{ entityType, entityId }]
 * @returns {Promise<Array>} [{ entityId, seedingScore }]
 */
export async function bulkCalculateSeedingScores(categoryId, entities) {
    const results = [];
    for (const entity of entities) {
        try {
            const score = await getSeedingScore(entity.entityType, entity.entityId, categoryId);
            results.push({ entityId: entity.entityId, seedingScore: score });
        } catch {
            results.push({ entityId: entity.entityId, seedingScore: 0 });
        }
    }
    return results;
}
