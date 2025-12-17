// Ranking Service - Tournament Ranking System (008-tournament-rankings)
import { PrismaClient } from '@prisma/client';
import createHttpError from 'http-errors';
import { calculateRanks, getEntityNameFromEntry, calculateSeedingScore } from '../utils/rankingCalculator.js';
import { getRankingTypesForCategory } from '../utils/categoryHelpers.js';

const prisma = new PrismaClient();

// ============================================
// LEGACY FUNCTIONS REMOVED (Migration Complete)
// ============================================
// The following functions have been removed as part of the migration
// from CategoryRanking/PairRanking to the new Ranking/RankingEntry system:
// - getCategoryLeaderboard() -> Use getRankingsForCategory()
// - getPlayerRankingInCategory() -> Use getRankingEntryBreakdown()
// - getPlayerAllRankings() -> Query RankingEntry with player filter
// - updateCategoryRankings() -> Use pointCalculationService functions
//
// All ranking functionality now uses the new tournament-based ranking system
// with Ranking, RankingEntry, and TournamentResult models.
// ============================================

// ============================================
// TOURNAMENT RANKING SYSTEM (008-tournament-rankings)
// ============================================

/**
 * T014: Create a tournament result entry
 * @param {Object} data - Tournament result data
 * @returns {Promise<Object>} Created tournament result
 */
export async function createTournamentResult(data) {
  const {
    tournamentId,
    rankingEntryId,
    entityType,
    playerId,
    pairId,
    placement,
    finalRoundReached,
    pointsAwarded
  } = data;

  return await prisma.tournamentResult.create({
    data: {
      tournamentId,
      rankingEntryId,
      entityType,
      playerId,
      pairId,
      placement,
      finalRoundReached,
      pointsAwarded
    }
  });
}

/**
 * T015: Update ranking entry totals (points, tournament count, last date, seeding score)
 * @param {string} rankingEntryId - Ranking entry ID
 * @returns {Promise<Object>} Updated ranking entry
 */
export async function updateRankingEntry(rankingEntryId) {
  const entry = await prisma.rankingEntry.findUnique({
    where: { id: rankingEntryId },
    include: {
      tournamentResults: {
        orderBy: { awardDate: 'desc' }
      },
      ranking: {
        include: {
          category: true
        }
      }
    }
  });

  if (!entry) {
    throw createHttpError(404, `Ranking entry not found: ${rankingEntryId}`);
  }

  // Calculate total points
  const totalPoints = entry.tournamentResults.reduce(
    (sum, result) => sum + result.pointsAwarded,
    0
  );

  // Count tournaments
  const tournamentCount = entry.tournamentResults.length;

  // Get most recent tournament date
  const lastTournamentDate = entry.tournamentResults.length > 0
    ? entry.tournamentResults[0].awardDate
    : null;

  // Calculate seeding score (sum of best N tournaments)
  const countedLimit = entry.ranking.category.countedTournamentsLimit || 7;
  const seedingScore = calculateSeedingScore(entry.tournamentResults, countedLimit);

  return await prisma.rankingEntry.update({
    where: { id: rankingEntryId },
    data: {
      totalPoints,
      tournamentCount,
      lastTournamentDate,
      seedingScore
    }
  });
}

/**
 * Recalculate ranking entries and assign ranks based on tiebreaker logic
 * @param {string} rankingId - Ranking ID
 * @returns {Promise<Array>} Updated ranking entries with new ranks
 */
export async function recalculateRankingEntries(rankingId) {
  const entries = await prisma.rankingEntry.findMany({
    where: { rankingId },
    include: {
      player: true,
      pair: {
        include: {
          player1: true,
          player2: true
        }
      }
    }
  });

  if (entries.length === 0) {
    return [];
  }

  // Calculate ranks using tiebreaker logic
  const rankedEntries = calculateRanks(entries, getEntityNameFromEntry);

  // Update ranks in database
  const updatePromises = rankedEntries.map(entry =>
    prisma.rankingEntry.update({
      where: { id: entry.id },
      data: { rank: entry.rank }
    })
  );

  return await Promise.all(updatePromises);
}

/**
 * Create category rankings based on category type and gender
 * Auto-creates appropriate ranking types (SINGLES, PAIR, MEN, WOMEN)
 * @param {string} categoryId - Category ID
 * @param {number} year - Year for rankings (default: current year)
 * @returns {Promise<Array>} Created rankings
 */
export async function createCategoryRankings(categoryId, year = new Date().getFullYear()) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId }
  });

  if (!category) {
    throw createHttpError(404, `Category not found: ${categoryId}`);
  }

  const rankingTypes = getRankingTypesForCategory(category);

  // Create rankings
  const createdRankings = [];
  for (const type of rankingTypes) {
    const ranking = await prisma.ranking.upsert({
      where: {
        categoryId_year_type: {
          categoryId,
          year,
          type
        }
      },
      update: {},
      create: {
        categoryId,
        year,
        type
      }
    });
    createdRankings.push(ranking);
  }

  return createdRankings;
}

/**
 * Get all rankings for a specific year
 * @param {number} year - Year (default: current year)
 * @returns {Promise<Array>} All rankings
 */
export async function getAllRankings(year = new Date().getFullYear()) {
  return await prisma.ranking.findMany({
    where: {
      year
    },
    include: {
      category: true
    }
  });
}

/**
 * Get rankings for a specific category
 * @param {string} categoryId - Category ID
 * @param {number} year - Year (default: current year)
 * @param {Object} options - Pagination and search options
 * @param {number} options.page - Page number
 * @param {number} options.limit - Items per page
 * @param {string} options.search - Search term for player/pair names
 * @returns {Promise<Array>} Rankings with entries (and pagination if requested)
 */
export async function getRankingsForCategory(categoryId, year = new Date().getFullYear(), options = {}) {
  const { page, limit, search } = options;

  // Build search filter for entries
  const entrySearchFilter = search ? {
    OR: [
      { player: { name: { contains: search, mode: 'insensitive' } } },
      {
        pair: {
          OR: [
            { player1: { name: { contains: search, mode: 'insensitive' } } },
            { player2: { name: { contains: search, mode: 'insensitive' } } }
          ]
        }
      }
    ]
  } : {};

  // If no pagination requested, return all entries
  if (!page && !limit) {
    return await prisma.ranking.findMany({
      where: {
        categoryId,
        year
      },
      include: {
        entries: {
          where: Object.keys(entrySearchFilter).length > 0 ? entrySearchFilter : undefined,
          include: {
            player: true,
            pair: {
              include: {
                player1: true,
                player2: true
              }
            }
          },
          orderBy: {
            rank: 'asc'
          }
        },
        category: true
      }
    });
  }

  // Pagination logic
  const skip = (page - 1) * limit;
  const take = Math.min(limit, 100); // Max 100 per page

  const rankings = await prisma.ranking.findMany({
    where: {
      categoryId,
      year
    },
    include: {
      category: true
    }
  });

  // For each ranking, fetch paginated entries
  const result = await Promise.all(rankings.map(async (ranking) => {
    const [entries, total] = await Promise.all([
      prisma.rankingEntry.findMany({
        where: {
          rankingId: ranking.id,
          ...entrySearchFilter
        },
        include: {
          player: true,
          pair: {
            include: {
              player1: true,
              player2: true
            }
          }
        },
        orderBy: {
          rank: 'asc'
        },
        skip,
        take
      }),
      prisma.rankingEntry.count({
        where: {
          rankingId: ranking.id,
          ...entrySearchFilter
        }
      })
    ]);

    return {
      ...ranking,
      entries,
      pagination: {
        page,
        limit: take,
        total,
        pages: Math.ceil(total / take)
      }
    };
  }));

  return result;
}

/**
 * Get ranking entry details with tournament breakdown
 * @param {string} entryId - Ranking entry ID
 * @returns {Promise<Object>} Ranking entry with tournament results
 */
export async function getRankingEntryBreakdown(entryId) {
  return await prisma.rankingEntry.findUnique({
    where: { id: entryId },
    include: {
      player: true,
      pair: {
        include: {
          player1: true,
          player2: true
        }
      },
      tournamentResults: {
        include: {
          tournament: {
            include: {
              category: true
            }
          }
        },
        orderBy: {
          awardDate: 'desc'
        }
      },
      ranking: {
        include: {
          category: true
        }
      }
    }
  });
}

/**
 * Get or create ranking entry for a player/pair
 * @param {string} rankingId - Ranking ID
 * @param {Object} entityData - {entityType, playerId?, pairId?}
 * @returns {Promise<Object>} Ranking entry
 */
export async function getOrCreateRankingEntry(rankingId, entityData) {
  const { entityType, playerId, pairId } = entityData;

  if (entityType === 'PLAYER' && playerId) {
    return await prisma.rankingEntry.upsert({
      where: {
        rankingId_playerId: {
          rankingId,
          playerId
        }
      },
      update: {},
      create: {
        rankingId,
        entityType: 'PLAYER',
        playerId,
        rank: 999 // Temporary rank, will be recalculated
      }
    });
  } else if (entityType === 'PAIR' && pairId) {
    return await prisma.rankingEntry.upsert({
      where: {
        rankingId_pairId: {
          rankingId,
          pairId
        }
      },
      update: {},
      create: {
        rankingId,
        entityType: 'PAIR',
        pairId,
        rank: 999 // Temporary rank, will be recalculated
      }
    });
  }

  throw createHttpError(400, 'Invalid entity data: must provide playerId for PLAYER or pairId for PAIR');
}
/**
 * Recalculate all rankings for a category
 * @param {string} categoryId
 */
export async function recalculateRankings(categoryId) {
  // Find all rankings for category (current year)
  const currentYear = new Date().getFullYear();
  const rankings = await prisma.ranking.findMany({
    where: { categoryId, year: currentYear, isArchived: false }
  });

  for (const ranking of rankings) {
    // Find all entries
    const entries = await prisma.rankingEntry.findMany({
      where: { rankingId: ranking.id }
    });

    for (const entry of entries) {
      // Update totals
      await updateRankingEntry(entry.id);
    }

    // Recalculate ranks
    await recalculateRankingEntries(ranking.id);
  }
}

/**
 * Delete archived ranking for a category and year
 * @param {string} categoryId
 * @param {number} year
 */
export async function deleteArchivedRanking(categoryId, year) {
  return await prisma.ranking.deleteMany({
    where: {
      categoryId,
      year,
      isArchived: true
    }
  });
}
