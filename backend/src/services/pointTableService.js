/**
 * Point Table Service
 * Manages point tables for round-based point calculation with in-memory caching
 * Feature: 008-tournament-rankings
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// In-memory cache for point tables
let pointTableCache = null;
let cacheInitialized = false;

/**
 * Initialize the point table cache
 * Should be called on server startup
 */
export async function initializePointTableCache() {
    try {
        const tables = await prisma.pointTable.findMany();

        // Organize by participant range for fast lookup
        pointTableCache = {};
        for (const table of tables) {
            if (!pointTableCache[table.participantRange]) {
                pointTableCache[table.participantRange] = {
                    main: {},
                    consolation: {}
                };
            }

            const bracket = table.isConsolation ? 'consolation' : 'main';
            pointTableCache[table.participantRange][bracket][table.roundName] = table.points;
        }

        cacheInitialized = true;
        console.log('✅ Point table cache initialized');
        return pointTableCache;
    } catch (error) {
        console.error('❌ Failed to initialize point table cache:', error);
        throw error;
    }
}

/**
 * Get point value for a specific round
 * @param {string} participantRange - Participant range (e.g., "9-16")
 * @param {string} roundName - Round name (e.g., "SEMIFINAL")
 * @param {boolean} isConsolation - Whether this is a consolation bracket
 * @returns {number} Points for this round, or 0 if not found
 */
export function getPointsForRound(participantRange, roundName, isConsolation = false) {
    if (!cacheInitialized) {
        throw new Error('Point table cache not initialized. Call initializePointTableCache() on server startup.');
    }

    const rangeTable = pointTableCache[participantRange];
    if (!rangeTable) {
        console.warn(`No point table found for range: ${participantRange}`);
        return 0;
    }

    const bracket = isConsolation ? 'consolation' : 'main';
    const points = rangeTable[bracket][roundName];

    if (points === undefined) {
        console.warn(`No points defined for ${roundName} in ${participantRange} ${bracket} bracket`);
        return 0;
    }

    return points;
}

/**
 * Get all point tables for a specific participant range
 * @param {string} participantRange - Participant range (e.g., "9-16")
 * @returns {Object} Object with main and consolation bracket points
 */
export function getPointTableForRange(participantRange) {
    if (!cacheInitialized) {
        throw new Error('Point table cache not initialized');
    }

    return pointTableCache[participantRange] || { main: {}, consolation: {} };
}

/**
 * Get all point tables (for admin configuration)
 * @returns {Promise<Array>} All point table entries from database
 */
export async function getAllPointTables() {
    return await prisma.pointTable.findMany({
        orderBy: [
            { participantRange: 'asc' },
            { isConsolation: 'asc' },
            { points: 'desc' }
        ]
    });
}

/**
 * Update a point table value
 * @param {string} id - Point table ID
 * @param {number} points - New point value
 * @returns {Promise<Object>} Updated point table entry
 */
export async function updatePointTableValue(id, points) {
    const updated = await prisma.pointTable.update({
        where: { id },
        data: { points }
    });

    // Invalidate cache to force reload
    await initializePointTableCache();

    return updated;
}

/**
 * Get the cache status (for debugging)
 * @returns {Object} Cache status information
 */
export function getCacheStatus() {
    return {
        initialized: cacheInitialized,
        ranges: pointTableCache ? Object.keys(pointTableCache) : [],
        entryCount: pointTableCache ?
            Object.values(pointTableCache).reduce((sum, range) => {
                return sum +
                    Object.keys(range.main).length +
                    Object.keys(range.consolation).length;
            }, 0) : 0
    };
}

/**
 * Clear and reinitialize the cache
 * @returns {Promise<Object>} New cache
 */
export async function refreshCache() {
    pointTableCache = null;
    cacheInitialized = false;
    return await initializePointTableCache();
}
