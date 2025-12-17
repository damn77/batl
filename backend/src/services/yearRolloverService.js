import { PrismaClient } from '@prisma/client';
import createHttpError from 'http-errors';
import { createCategoryRankings } from './rankingService.js';

const prisma = new PrismaClient();

/**
 * T067: Execute year rollover for a specific category or all categories
 * @param {string} [categoryId] - Optional category ID to rollover
 * @param {number} [year] - Year to archive (defaults to current year - 1)
 */
export async function executeYearRollover(categoryId, year) {
    const currentYear = new Date().getFullYear();
    const yearToArchive = year || (currentYear - 1);
    const newYear = yearToArchive + 1;

    // Find categories to process
    let categories = [];
    if (categoryId) {
        const category = await prisma.category.findUnique({ where: { id: categoryId } });
        if (!category) throw createHttpError(404, 'Category not found');
        categories = [category];
    } else {
        categories = await prisma.category.findMany();
    }

    const results = [];

    for (const category of categories) {
        // 1. Archive old rankings
        const updateResult = await prisma.ranking.updateMany({
            where: {
                categoryId: category.id,
                year: yearToArchive,
                isArchived: false
            },
            data: { isArchived: true }
        });

        // 2. Create new rankings for the new year
        // createCategoryRankings handles creation if not exists
        const newRankings = await createCategoryRankings(category.id, newYear);

        results.push({
            categoryId: category.id,
            categoryName: category.name,
            archivedCount: updateResult.count,
            newRankingsCreated: newRankings.length
        });
    }

    return results;
}

/**
 * T068: Get archived rankings for a category and year
 * @param {string} categoryId
 * @param {number} year
 */
export async function getArchivedRankings(categoryId, year) {
    const rankings = await prisma.ranking.findMany({
        where: {
            categoryId,
            year,
            isArchived: true
        },
        include: {
            entries: {
                orderBy: { rank: 'asc' },
                include: {
                    player: true,
                    pair: {
                        include: {
                            player1: true,
                            player2: true
                        }
                    }
                }
            }
        }
    });

    return rankings;
}

/**
 * T069: Purge archives older than retention period
 * @param {number} retentionYears - Number of years to keep
 */
export async function purgeOldArchives(retentionYears = 5) {
    const currentYear = new Date().getFullYear();
    const cutoffYear = currentYear - retentionYears;

    const deleteResult = await prisma.ranking.deleteMany({
        where: {
            year: { lt: cutoffYear },
            isArchived: true
        }
    });

    return {
        deletedCount: deleteResult.count,
        cutoffYear
    };
}
