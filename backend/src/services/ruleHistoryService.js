// T093, T094: Rule History Service - Captures rule snapshots for completed matches
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * T094: Capture a snapshot of the effective rules when a match completes
 * This preserves the exact rules that were in effect when the match was played
 *
 * @param {string} matchId - ID of the match being completed
 * @param {Object} effectiveRules - The resolved rules from cascade (tournament → group/bracket → round → match)
 * @returns {Promise<Object>} Updated match with completedWithRules snapshot
 */
export async function captureRuleSnapshot(matchId, effectiveRules) {
  // Store the complete resolved rules as JSON in completedWithRules field
  const updated = await prisma.match.update({
    where: { id: matchId },
    data: {
      completedWithRules: JSON.stringify(effectiveRules),
      status: 'COMPLETED'
    }
  });

  return {
    ...updated,
    completedWithRules: effectiveRules
  };
}

/**
 * Get the historical rules for a completed match
 *
 * @param {string} matchId - ID of the match
 * @returns {Promise<Object|null>} Parsed completedWithRules or null if not completed
 */
export async function getHistoricalRules(matchId) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      status: true,
      completedWithRules: true
    }
  });

  if (!match || match.status !== 'COMPLETED' || !match.completedWithRules) {
    return null;
  }

  return JSON.parse(match.completedWithRules);
}

/**
 * Check if a match has historical rules snapshot
 *
 * @param {string} matchId - ID of the match
 * @returns {Promise<boolean>} True if match is completed with rules snapshot
 */
export async function hasHistoricalSnapshot(matchId) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      status: true,
      completedWithRules: true
    }
  });

  return match?.status === 'COMPLETED' && !!match?.completedWithRules;
}
