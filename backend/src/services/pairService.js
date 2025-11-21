// Doubles Pair Service
// Feature: 006-doubles-pairs

import { PrismaClient } from '@prisma/client';
import { sortPlayerIds } from '../utils/pairHelpers.js';
import { PairErrorCodes, createPairError } from '../utils/pairErrors.js';

const prisma = new PrismaClient();

/**
 * Calculate player's age from birthDate (calendar year only)
 * Same logic as registrationService for consistency
 */
function calculateAge(birthDate) {
  if (!birthDate) return null;
  const currentYear = new Date().getFullYear();
  const birthYear = new Date(birthDate).getFullYear();
  return currentYear - birthYear;
}

/**
 * Validate that a player meets category eligibility requirements
 * Checks: profile completeness, age, and gender
 *
 * @param {Object} player - Player profile with id, name, birthDate, gender
 * @param {Object} category - Category with ageGroup, gender, name
 * @returns {Object} { eligible: boolean, reasons?: string[] }
 */
function validatePlayerEligibility(player, category) {
  const reasons = [];

  // Check profile completeness
  if (!player.birthDate) {
    reasons.push(`${player.name} is missing birth date`);
  }
  if (!player.gender) {
    reasons.push(`${player.name} is missing gender`);
  }

  // Skip further validation if profile is incomplete
  if (reasons.length > 0) {
    return { eligible: false, reasons };
  }

  // Age validation (skip for ALL_AGES)
  if (category.ageGroup !== 'ALL_AGES') {
    const playerAge = calculateAge(player.birthDate);
    const minAge = parseInt(category.ageGroup.replace('AGE_', ''));

    if (playerAge < minAge) {
      reasons.push(`${player.name} (age ${playerAge}) does not meet minimum age requirement of ${minAge}+`);
    }
  }

  // Gender validation (skip for MIXED)
  if (category.gender !== 'MIXED') {
    if (player.gender !== category.gender) {
      reasons.push(`${player.name} (${player.gender}) does not match category gender (${category.gender})`);
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons: reasons.length > 0 ? reasons : undefined
  };
}

/**
 * Create a new doubles pair or get existing pair
 * Automatically sorts player IDs to ensure consistency
 *
 * @param {string} player1Id - First player ID
 * @param {string} player2Id - Second player ID
 * @param {string} categoryId - Category ID (must be DOUBLES type)
 * @returns {Promise<Object>} Created or existing pair with isNew flag
 * @throws {Error} If validation fails
 */
export async function createOrGetPair(player1Id, player2Id, categoryId) {
  // Sort player IDs to ensure consistent ordering
  let sortedIds;
  try {
    sortedIds = sortPlayerIds(player1Id, player2Id);
  } catch (error) {
    throw createPairError(PairErrorCodes.SAME_PLAYER);
  }

  const { player1Id: p1, player2Id: p2 } = sortedIds;

  // Validate that both players exist (include fields needed for eligibility check)
  const [player1, player2] = await Promise.all([
    prisma.playerProfile.findUnique({
      where: { id: p1 },
      select: { id: true, name: true, birthDate: true, gender: true }
    }),
    prisma.playerProfile.findUnique({
      where: { id: p2 },
      select: { id: true, name: true, birthDate: true, gender: true }
    }),
  ]);

  if (!player1 || !player2) {
    throw createPairError(
      PairErrorCodes.PLAYER_NOT_FOUND,
      !player1 && !player2
        ? 'Both players not found'
        : !player1
          ? 'Player 1 not found'
          : 'Player 2 not found'
    );
  }

  // Validate category exists and is DOUBLES type
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw createPairError(PairErrorCodes.INVALID_CATEGORY, 'Category not found');
  }

  if (category.type !== 'DOUBLES') {
    throw createPairError(
      PairErrorCodes.WRONG_CATEGORY_TYPE,
      'Category must be DOUBLES type for pair creation'
    );
  }

  // Validate both players meet category eligibility requirements
  const player1Eligibility = validatePlayerEligibility(player1, category);
  const player2Eligibility = validatePlayerEligibility(player2, category);

  const eligibilityViolations = [
    ...(player1Eligibility.reasons || []),
    ...(player2Eligibility.reasons || [])
  ];

  if (eligibilityViolations.length > 0) {
    throw createPairError(
      PairErrorCodes.INELIGIBLE_PAIR,
      'One or both players do not meet category eligibility requirements',
      { violations: eligibilityViolations }
    );
  }

  // Check if pair already exists (including soft-deleted)
  const existingPair = await prisma.doublesPair.findFirst({
    where: {
      player1Id: p1,
      player2Id: p2,
      categoryId,
    },
    include: {
      player1: {
        select: {
          id: true,
          name: true,
          gender: true,
          birthDate: true,
          categoryRankings: {
            where: { categoryId },
            select: {
              points: true,
              rank: true,
              wins: true,
              losses: true,
            },
          },
        },
      },
      player2: {
        select: {
          id: true,
          name: true,
          gender: true,
          birthDate: true,
          categoryRankings: {
            where: { categoryId },
            select: {
              points: true,
              rank: true,
              wins: true,
              losses: true,
            },
          },
        },
      },
      category: true,
      pairRankings: {
        where: { categoryId },
      },
      pairRegistrations: {
        where: {
          status: {
            in: ['REGISTERED', 'WAITLISTED'],
          },
        },
        select: {
          id: true,
          tournamentId: true,
          status: true,
        },
      },
    },
  });

  // If pair exists and is active, return it
  if (existingPair && !existingPair.deletedAt) {
    return {
      ...existingPair,
      isNew: false,
    };
  }

  // If pair exists but is soft-deleted, un-delete it
  if (existingPair && existingPair.deletedAt) {
    const restoredPair = await prisma.doublesPair.update({
      where: { id: existingPair.id },
      data: {
        deletedAt: null,
        updatedAt: new Date(),
      },
      include: {
        player1: {
          select: {
            id: true,
            name: true,
            gender: true,
            birthDate: true,
            categoryRankings: {
              where: { categoryId },
              select: {
                points: true,
                rank: true,
                wins: true,
                losses: true,
              },
            },
          },
        },
        player2: {
          select: {
            id: true,
            name: true,
            gender: true,
            birthDate: true,
            categoryRankings: {
              where: { categoryId },
              select: {
                points: true,
                rank: true,
                wins: true,
                losses: true,
              },
            },
          },
        },
        category: true,
        pairRankings: {
          where: { categoryId },
        },
        pairRegistrations: {
          where: {
            status: {
              in: ['REGISTERED', 'WAITLISTED'],
            },
          },
        },
      },
    });

    return {
      ...restoredPair,
      isNew: false,
    };
  }

  // Calculate initial seeding score (sum of both players' ranking points)
  const player1Ranking = await prisma.categoryRanking.findFirst({
    where: { playerId: p1, categoryId },
  });

  const player2Ranking = await prisma.categoryRanking.findFirst({
    where: { playerId: p2, categoryId },
  });

  const initialSeedingScore =
    (player1Ranking?.points || 0) + (player2Ranking?.points || 0);

  // Create new pair
  const newPair = await prisma.doublesPair.create({
    data: {
      player1Id: p1,
      player2Id: p2,
      categoryId,
      seedingScore: initialSeedingScore,
    },
    include: {
      player1: {
        select: {
          id: true,
          name: true,
          gender: true,
          birthDate: true,
          categoryRankings: {
            where: { categoryId },
            select: {
              points: true,
              rank: true,
              wins: true,
              losses: true,
            },
          },
        },
      },
      player2: {
        select: {
          id: true,
          name: true,
          gender: true,
          birthDate: true,
          categoryRankings: {
            where: { categoryId },
            select: {
              points: true,
              rank: true,
              wins: true,
              losses: true,
            },
          },
        },
      },
      category: true,
      pairRankings: {
        where: { categoryId },
      },
      pairRegistrations: {
        where: {
          status: {
            in: ['REGISTERED', 'WAITLISTED'],
          },
        },
      },
    },
  });

  return {
    ...newPair,
    isNew: true,
  };
}

/**
 * Get pair by ID with full details
 *
 * @param {string} pairId - Pair ID
 * @param {boolean} includeDeleted - Include soft-deleted pairs (default: false)
 * @returns {Promise<Object|null>} Pair details or null if not found
 */
export async function getPairById(pairId, includeDeleted = false) {
  const pair = await prisma.doublesPair.findUnique({
    where: { id: pairId },
    include: {
      player1: {
        select: {
          id: true,
          name: true,
          gender: true,
          birthDate: true,
          categoryRankings: true,
        },
      },
      player2: {
        select: {
          id: true,
          name: true,
          gender: true,
          birthDate: true,
          categoryRankings: true,
        },
      },
      category: true,
      pairRankings: true,
      pairRegistrations: {
        where: {
          status: {
            in: ['REGISTERED', 'WAITLISTED'],
          },
        },
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
              status: true,
              startDate: true,
            },
          },
        },
      },
    },
  });

  // If pair not found or soft-deleted (and not including deleted), return null
  if (!pair || (pair.deletedAt && !includeDeleted)) {
    return null;
  }

  return pair;
}

/**
 * List pairs with filtering and pagination
 *
 * @param {Object} filters - Filter options
 * @param {string} [filters.categoryId] - Filter by category
 * @param {string} [filters.playerId] - Filter pairs containing this player
 * @param {boolean} [filters.includeDeleted=false] - Include soft-deleted pairs
 * @param {number} [filters.page=1] - Page number
 * @param {number} [filters.limit=20] - Items per page
 * @returns {Promise<Object>} { pairs: Array, pagination: Object }
 */
export async function listPairs(filters = {}) {
  const {
    categoryId,
    playerId,
    includeDeleted = false,
    page = 1,
    limit = 20,
  } = filters;

  // Build where clause
  const where = {};

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (playerId) {
    where.OR = [{ player1Id: playerId }, { player2Id: playerId }];
  }

  if (!includeDeleted) {
    where.deletedAt = null;
  }

  // Count total matching pairs
  const total = await prisma.doublesPair.count({ where });

  // Calculate pagination
  const skip = (page - 1) * limit;
  const pages = Math.ceil(total / limit);

  // Fetch pairs
  const pairs = await prisma.doublesPair.findMany({
    where,
    skip,
    take: limit,
    include: {
      player1: {
        select: {
          id: true,
          name: true,
        },
      },
      player2: {
        select: {
          id: true,
          name: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
      pairRankings: {
        where: categoryId ? { categoryId } : {},
        select: {
          points: true,
          rank: true,
        },
      },
    },
    orderBy: [{ seedingScore: 'desc' }, { createdAt: 'desc' }],
  });

  return {
    pairs,
    pagination: {
      page,
      limit,
      total,
      pages,
    },
  };
}

/**
 * Check if pair should be soft-deleted based on lifecycle rules
 * Deletes pair if: no active registrations AND no current season participation
 *
 * @param {string} pairId - Pair ID to check
 * @returns {Promise<boolean>} True if pair was deleted, false otherwise
 */
export async function checkAndDeleteInactivePair(pairId) {
  const pair = await prisma.doublesPair.findUnique({
    where: { id: pairId },
  });

  if (!pair || pair.deletedAt) {
    return false; // Already deleted or not found
  }

  // Count active registrations (REGISTERED or WAITLISTED)
  const activeRegistrations = await prisma.pairRegistration.count({
    where: {
      pairId,
      status: {
        in: ['REGISTERED', 'WAITLISTED'],
      },
    },
  });

  if (activeRegistrations > 0) {
    return false; // Has active registrations, don't delete
  }

  // Check for current season participation
  const currentYear = new Date().getFullYear();
  const seasonParticipation = await prisma.pairRegistration.count({
    where: {
      pairId,
      tournament: {
        status: 'COMPLETED',
        endDate: {
          gte: new Date(`${currentYear}-01-01`),
          lte: new Date(`${currentYear}-12-31`),
        },
      },
    },
  });

  if (seasonParticipation > 0) {
    return false; // Has current season participation, don't delete
  }

  // No active registrations and no current season participation - soft delete
  await prisma.doublesPair.update({
    where: { id: pairId },
    data: {
      deletedAt: new Date(),
    },
  });

  return true;
}

/**
 * Calculate seeding score for a pair
 * Feature: 006-doubles-pairs - User Story 3 (T054)
 * Seeding score = sum of both players' individual ranking points in the pair's category
 *
 * @param {string} pairId - Pair ID
 * @returns {Promise<number>} Seeding score (sum of player points, or 0 if no rankings)
 */
export async function calculateSeedingScore(pairId) {
  // Get pair with player IDs and category
  const pair = await prisma.doublesPair.findUnique({
    where: { id: pairId },
    select: {
      id: true,
      player1Id: true,
      player2Id: true,
      categoryId: true,
    },
  });

  if (!pair) {
    throw new Error('Pair not found');
  }

  // Get both players' individual rankings in this category
  const [player1Ranking, player2Ranking] = await Promise.all([
    prisma.categoryRanking.findUnique({
      where: {
        playerId_categoryId: {
          playerId: pair.player1Id,
          categoryId: pair.categoryId,
        },
      },
      select: {
        points: true,
      },
    }),
    prisma.categoryRanking.findUnique({
      where: {
        playerId_categoryId: {
          playerId: pair.player2Id,
          categoryId: pair.categoryId,
        },
      },
      select: {
        points: true,
      },
    }),
  ]);

  // Sum the points (default to 0 if no ranking exists)
  const seedingScore = (player1Ranking?.points || 0) + (player2Ranking?.points || 0);

  return seedingScore;
}

/**
 * Recalculate seeding scores for all active pairs in a category
 * Feature: 006-doubles-pairs - User Story 3 (T055)
 * Called after tournaments complete to update seeding scores
 *
 * @param {string} categoryId - Category ID
 * @returns {Promise<number>} Number of pairs updated
 */
export async function recalculateCategorySeedingScores(categoryId) {
  // Get all active (non-deleted) pairs in this category
  const pairs = await prisma.doublesPair.findMany({
    where: {
      categoryId,
      deletedAt: null, // Only active pairs
    },
    select: {
      id: true,
    },
  });

  // Calculate new seeding score for each pair and update
  const updates = pairs.map(async (pair) => {
    const newSeedingScore = await calculateSeedingScore(pair.id);

    return prisma.doublesPair.update({
      where: { id: pair.id },
      data: {
        seedingScore: newSeedingScore,
        updatedAt: new Date(),
      },
    });
  });

  await Promise.all(updates);

  return pairs.length;
}

export default {
  createOrGetPair,
  getPairById,
  listPairs,
  checkAndDeleteInactivePair,
  calculateSeedingScore,
  recalculateCategorySeedingScores,
};
