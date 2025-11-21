// T099: Match Service - Match management with rule snapshot on completion
import { PrismaClient } from '@prisma/client';
import createHttpError from 'http-errors';
import * as ruleHistoryService from './ruleHistoryService.js';
import * as matchRulesService from './matchRulesService.js';
import * as pairRankingService from './pairRankingService.js'; // 006-doubles-pairs

const prisma = new PrismaClient();

/**
 * T099: Complete a match and capture rule snapshot
 * T046: Award points to pairs for doubles matches
 * This ensures the exact rules used for the match are preserved in history
 *
 * @param {string} matchId - ID of the match to complete
 * @param {Object} result - Match result data (winner, score, etc.)
 * @param {Object} result.winnerId - Winner player ID (for singles) or pair ID (for doubles)
 * @param {Object} result.score - Match score
 * @param {number} result.pointsAwarded - Points awarded to winner (default: 100)
 * @returns {Promise<Object>} Completed match with rule snapshot
 */
export async function completeMatch(matchId, result) {
  // Verify match exists and is in progress
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      tournament: {
        include: {
          category: true,
        },
      },
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
      pair1: true,
      pair2: true,
    },
  });

  if (!match) {
    throw createHttpError(404, 'Match not found', {
      code: 'MATCH_NOT_FOUND',
    });
  }

  if (match.status === 'COMPLETED') {
    throw createHttpError(409, 'Match is already completed', {
      code: 'MATCH_ALREADY_COMPLETED',
    });
  }

  if (match.status !== 'IN_PROGRESS') {
    throw createHttpError(400, 'Match must be IN_PROGRESS to be completed', {
      code: 'INVALID_MATCH_STATUS',
      currentStatus: match.status,
    });
  }

  // Get the effective rules for this match (with full cascade resolution)
  const effectiveRules = await matchRulesService.getEffectiveRulesForMatch(matchId);

  // Capture rule snapshot and mark match as completed
  await ruleHistoryService.captureRuleSnapshot(matchId, effectiveRules.effectiveRules);

  // Update match with result data
  const updated = await prisma.match.update({
    where: { id: matchId },
    data: {
      result: result.score ? JSON.stringify(result.score) : null,
      // Status already set to COMPLETED by captureRuleSnapshot
    },
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
      pair1: true,
      pair2: true,
    },
  });

  // T046: Award points to pairs for doubles matches
  // Check if this is a doubles match by checking if pair1Id and pair2Id exist
  const isDoublesMatch = match.pair1Id && match.pair2Id;

  if (isDoublesMatch && result.winnerId) {
    // Determine which pair won
    const winnerPairId = result.winnerId;
    const loserPairId = winnerPairId === match.pair1Id ? match.pair2Id : match.pair1Id;

    // Award points (default 100 points if not specified)
    const pointsAwarded = result.pointsAwarded || 100;

    // Award points to winner pair (both pair ranking and individual player rankings)
    await pairRankingService.awardPointsToPair(winnerPairId, pointsAwarded, true);

    // Award 0 points to loser pair but record the loss
    await pairRankingService.awardPointsToPair(loserPairId, 0, false);

    // Recalculate pair rankings for the category
    await pairRankingService.recalculateRankings(match.tournament.categoryId);
  }

  return {
    ...updated,
    completedWithRules: JSON.parse(updated.completedWithRules),
    score: updated.result ? JSON.parse(updated.result) : null,
  };
}

/**
 * Get match details including historical rules if completed
 *
 * @param {string} matchId - Match ID
 * @returns {Promise<Object>} Match with details
 */
export async function getMatchDetails(matchId) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      player1: {
        select: {
          id: true,
          name: true
        }
      },
      player2: {
        select: {
          id: true,
          name: true
        }
      },
      tournament: {
        select: {
          id: true,
          name: true
        }
      },
      group: {
        select: {
          id: true,
          groupNumber: true
        }
      },
      round: {
        select: {
          id: true,
          roundNumber: true
        }
      }
    }
  });

  if (!match) {
    throw createHttpError(404, 'Match not found', {
      code: 'MATCH_NOT_FOUND'
    });
  }

  return {
    ...match,
    completedWithRules: match.completedWithRules ? JSON.parse(match.completedWithRules) : null,
    ruleOverrides: match.ruleOverrides ? JSON.parse(match.ruleOverrides) : null,
    score: match.score ? JSON.parse(match.score) : null
  };
}

export default {
  completeMatch,
  getMatchDetails
};
