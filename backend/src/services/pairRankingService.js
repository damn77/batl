// Pair Ranking Service
// Feature: 006-doubles-pairs - User Story 2

import { PrismaClient } from '@prisma/client';
import * as sharedRankingService from './sharedRankingService.js';

const prisma = new PrismaClient();

/**
 * Get or create pair ranking for a category
 *
 * @param {string} pairId - Pair ID
 * @param {string} categoryId - Category ID
 * @returns {Promise<Object>} PairRanking object
 */
export async function getOrCreatePairRanking(pairId, categoryId) {
  // Check if ranking already exists
  let ranking = await prisma.pairRanking.findUnique({
    where: {
      pairId_categoryId: {
        pairId,
        categoryId,
      },
    },
  });

  // Create if doesn't exist
  if (!ranking) {
    ranking = await prisma.pairRanking.create({
      data: {
        pairId,
        categoryId,
        rank: 0, // Will be recalculated
        points: 0,
        wins: 0,
        losses: 0,
      },
    });
  }

  return ranking;
}

/**
 * Award points to a pair and update both pair ranking and individual player rankings
 *
 * @param {string} pairId - Pair ID
 * @param {number} pointsEarned - Points to award
 * @param {boolean} won - Whether the pair won (true) or lost (false)
 * @returns {Promise<Object>} Updated rankings { pairRanking, player1Ranking, player2Ranking }
 */
export async function awardPointsToPair(pairId, pointsEarned, won) {
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

  // Get or create pair ranking
  const pairRanking = await getOrCreatePairRanking(pairId, pair.categoryId);

  // Update pair ranking
  const updatedPairRanking = await prisma.pairRanking.update({
    where: { id: pairRanking.id },
    data: {
      points: { increment: pointsEarned },
      wins: won ? { increment: 1 } : undefined,
      losses: !won ? { increment: 1 } : undefined,
    },
  });

  // Update player 1 individual ranking
  let player1Ranking = await prisma.categoryRanking.findUnique({
    where: {
      playerId_categoryId: {
        playerId: pair.player1Id,
        categoryId: pair.categoryId,
      },
    },
  });

  if (!player1Ranking) {
    player1Ranking = await prisma.categoryRanking.create({
      data: {
        playerId: pair.player1Id,
        categoryId: pair.categoryId,
        rank: 0, // Will be recalculated
        points: pointsEarned,
        wins: won ? 1 : 0,
        losses: !won ? 1 : 0,
      },
    });
  } else {
    player1Ranking = await prisma.categoryRanking.update({
      where: { id: player1Ranking.id },
      data: {
        points: { increment: pointsEarned },
        wins: won ? { increment: 1 } : undefined,
        losses: !won ? { increment: 1 } : undefined,
      },
    });
  }

  // Update player 2 individual ranking
  let player2Ranking = await prisma.categoryRanking.findUnique({
    where: {
      playerId_categoryId: {
        playerId: pair.player2Id,
        categoryId: pair.categoryId,
      },
    },
  });

  if (!player2Ranking) {
    player2Ranking = await prisma.categoryRanking.create({
      data: {
        playerId: pair.player2Id,
        categoryId: pair.categoryId,
        rank: 0, // Will be recalculated
        points: pointsEarned,
        wins: won ? 1 : 0,
        losses: !won ? 1 : 0,
      },
    });
  } else {
    player2Ranking = await prisma.categoryRanking.update({
      where: { id: player2Ranking.id },
      data: {
        points: { increment: pointsEarned },
        wins: won ? { increment: 1 } : undefined,
        losses: !won ? { increment: 1 } : undefined,
      },
    });
  }

  return {
    pairRanking: updatedPairRanking,
    player1Ranking,
    player2Ranking,
  };
}

/**
 * Recalculate rank positions for all pairs in a category
 * Ranks are assigned based on points (descending), with ties broken by wins
 *
 * @param {string} categoryId - Category ID
 * @returns {Promise<number>} Number of rankings updated
 */
export async function recalculateRankings(categoryId) {
  // Get all pair rankings for this category, ordered by points DESC, wins DESC
  const rankings = await prisma.pairRanking.findMany({
    where: { categoryId },
    orderBy: [
      { points: 'desc' },
      { wins: 'desc' },
      { losses: 'asc' },
    ],
  });

  // Update ranks
  const updates = rankings.map((ranking, index) => {
    const rank = index + 1; // 1-indexed ranks
    return prisma.pairRanking.update({
      where: { id: ranking.id },
      data: { rank },
    });
  });

  await prisma.$transaction(updates);

  return rankings.length;
}

/**
 * Get pair rankings for a category (leaderboard)
 *
 * @param {string} categoryId - Category ID
 * @param {Object} options - Pagination options
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.limit=50] - Items per page
 * @returns {Promise<Object>} { rankings: Array, pagination: Object, category: Object }
 */
export async function getPairRankings(categoryId, options = {}) {
  const { page = 1, limit = 50 } = options;

  // Get category info
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      name: true,
      type: true,
      ageGroup: true,
      gender: true,
    },
  });

  if (!category) {
    throw new Error('Category not found');
  }

  if (category.type !== 'DOUBLES') {
    throw new Error('Category must be DOUBLES type for pair rankings');
  }

  // Count total rankings
  const total = await prisma.pairRanking.count({
    where: { categoryId },
  });

  // Calculate pagination
  const skip = (page - 1) * limit;
  const pages = Math.ceil(total / limit);

  // Fetch rankings with pair details
  const rankings = await prisma.pairRanking.findMany({
    where: { categoryId },
    skip,
    take: limit,
    orderBy: [
      { rank: 'asc' },
    ],
    include: {
      pair: {
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
        },
      },
    },
  });

  // Format rankings with computed fields using shared service
  const formattedRankings = rankings.map((ranking) => {
    return {
      rank: ranking.rank,
      pair: {
        id: ranking.pair.id,
        player1: ranking.pair.player1,
        player2: ranking.pair.player2,
        seedingScore: ranking.pair.seedingScore,
      },
      points: ranking.points,
      wins: ranking.wins,
      losses: ranking.losses,
      winRate: sharedRankingService.calculateWinRate(ranking.wins, ranking.losses),
      lastUpdated: ranking.lastUpdated,
    };
  });

  return {
    category,
    rankings: formattedRankings,
    pagination: {
      page,
      limit,
      total,
      pages,
    },
  };
}

export default {
  getOrCreatePairRanking,
  awardPointsToPair,
  recalculateRankings,
  getPairRankings,
};
