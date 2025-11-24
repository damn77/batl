// T084-T088: Ranking Service - Category-specific ranking retrieval
import { PrismaClient } from '@prisma/client';
import createHttpError from 'http-errors';
import * as categoryService from './categoryService.js';
import * as sharedRankingService from './sharedRankingService.js';

const prisma = new PrismaClient();

/**
 * T089: Get category leaderboard
 * Retrieves ranked list of players in a category
 */
export async function getCategoryLeaderboard(categoryId, options = {}) {
  const { limit = 10, offset = 0 } = options;

  // Verify category exists
  const category = await categoryService.getCategoryById(categoryId);

  // Get rankings for this category, ordered by rank
  const [rankings, total] = await Promise.all([
    prisma.categoryRanking.findMany({
      where: { categoryId },
      skip: offset,
      take: Math.min(limit, 200), // Max 200 per page
      orderBy: { rank: 'asc' },
      include: {
        player: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }),
    prisma.categoryRanking.count({
      where: { categoryId }
    })
  ]);

  // Calculate win rate for each ranking using shared service
  const rankingsWithWinRate = rankings.map(ranking => ({
    rank: ranking.rank,
    playerId: ranking.playerId,
    playerName: ranking.player.name,
    points: ranking.points,
    wins: ranking.wins,
    losses: ranking.losses,
    winRate: sharedRankingService.calculateWinRate(ranking.wins, ranking.losses),
    lastUpdated: ranking.updatedAt
  }));

  return {
    categoryId: category.id,
    categoryName: category.name,
    rankings: rankingsWithWinRate,
    total,
    lastUpdated: rankings.length > 0
      ? rankings[0].updatedAt
      : new Date()
  };
}

/**
 * T090: Get player's ranking in specific category
 * Retrieves player's rank, points, and stats in a category
 */
export async function getPlayerRankingInCategory(categoryId, playerId) {
  // Verify category exists
  const category = await categoryService.getCategoryById(categoryId);

  // Get player's ranking in this category
  const ranking = await prisma.categoryRanking.findUnique({
    where: {
      playerId_categoryId: {
        playerId,
        categoryId
      }
    },
    include: {
      player: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  // If player is not ranked yet, throw NOT_RANKED error
  if (!ranking) {
    throw createHttpError(404, 'Player is not ranked in this category (no tournament participation yet)', {
      code: 'NOT_RANKED'
    });
  }

  // Get total number of ranked players in category
  const totalPlayers = await prisma.categoryRanking.count({
    where: { categoryId }
  });

  // Calculate win rate using shared service
  const winRate = sharedRankingService.calculateWinRate(ranking.wins, ranking.losses);

  return {
    categoryId: category.id,
    categoryName: category.name,
    playerId: ranking.playerId,
    playerName: ranking.player.name,
    rank: ranking.rank,
    points: ranking.points,
    wins: ranking.wins,
    losses: ranking.losses,
    winRate,
    lastUpdated: ranking.updatedAt,
    totalPlayers
  };
}

/**
 * T091: Get player's rankings across all categories
 * Retrieves all category rankings for a specific player
 */
export async function getPlayerAllRankings(playerId) {
  // Get player info
  const player = await prisma.playerProfile.findUnique({
    where: { id: playerId },
    select: { id: true, name: true }
  });

  if (!player) {
    throw createHttpError(404, 'Player not found', {
      code: 'PLAYER_NOT_FOUND'
    });
  }

  // Get all rankings for this player across all categories
  const rankings = await prisma.categoryRanking.findMany({
    where: { playerId },
    orderBy: [
      { points: 'desc' }, // Highest points first
      { rank: 'asc' }     // Best rank first for ties
    ],
    include: {
      category: {
        select: {
          id: true,
          name: true,
          type: true,
          ageGroup: true,
          gender: true
        }
      }
    }
  });

  // Format rankings with win rates using shared service
  const formattedRankings = rankings.map(ranking => ({
    categoryId: ranking.categoryId,
    categoryName: ranking.category.name,
    rank: ranking.rank,
    points: ranking.points,
    wins: ranking.wins,
    losses: ranking.losses,
    winRate: sharedRankingService.calculateWinRate(ranking.wins, ranking.losses)
  }));

  // Get the latest update time
  const lastUpdated = rankings.length > 0
    ? rankings.reduce((latest, r) =>
      r.updatedAt > latest ? r.updatedAt : latest,
      rankings[0].updatedAt
    )
    : new Date();

  return {
    playerId: player.id,
    playerName: player.name,
    rankings: formattedRankings,
    lastUpdated
  };
}

/**
 * T086-T088: Update category rankings (called after tournament completion)
 * This function will be triggered by tournament result entry
 * 
 * @param {string} categoryId - Category ID
 * @param {Array} tournamentResults - Array of {playerId, points, won, lost}
 * @returns {Promise<Object>} Updated rankings summary
 */
export async function updateCategoryRankings(categoryId, tournamentResults) {
  if (!tournamentResults || tournamentResults.length === 0) {
    throw createHttpError(400, 'Tournament results are required', {
      code: 'INVALID_INPUT'
    });
  }

  // Verify category exists
  await categoryService.getCategoryById(categoryId);

  // T086: Calculate points from tournament results and update rankings
  const updates = [];

  for (const result of tournamentResults) {
    const { playerId, points, wins = 0, losses = 0 } = result;

    // Get or create ranking
    let ranking = await prisma.categoryRanking.findUnique({
      where: {
        playerId_categoryId: {
          playerId,
          categoryId
        }
      }
    });

    if (ranking) {
      // T087: Update existing ranking
      ranking = await prisma.categoryRanking.update({
        where: { id: ranking.id },
        data: {
          points: { increment: points },
          wins: { increment: wins },
          losses: { increment: losses }
        }
      });
    } else {
      // T087: Create new ranking
      ranking = await prisma.categoryRanking.create({
        data: {
          playerId,
          categoryId,
          rank: 0, // Will be recalculated
          points,
          wins,
          losses
        }
      });
    }

    updates.push(ranking);
  }

  // T088: Recalculate ranks based on points (descending order)
  const allRankings = await prisma.categoryRanking.findMany({
    where: { categoryId },
    orderBy: [
      { points: 'desc' },
      { wins: 'desc' },
      { losses: 'asc' }
    ]
  });

  // Update ranks in a transaction
  const rankUpdates = allRankings.map((ranking, index) => {
    const rank = index + 1; // 1-indexed
    return prisma.categoryRanking.update({
      where: { id: ranking.id },
      data: { rank }
    });
  });

  await prisma.$transaction(rankUpdates);

  return {
    categoryId,
    updatedCount: updates.length,
    totalRankings: allRankings.length,
    message: 'Rankings updated successfully'
  };
}
