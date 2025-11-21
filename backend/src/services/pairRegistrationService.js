// Pair Registration Service
// Feature: 006-doubles-pairs

import { PrismaClient } from '@prisma/client';
import { PairErrorCodes, createPairError, createEligibilityError } from '../utils/pairErrors.js';
import { meetsAllCriteria, formatEligibilityViolation } from '../utils/eligibility.js';
import { canOverrideEligibility } from '../middleware/pairAuth.js';

const prisma = new PrismaClient();

/**
 * Register a pair for a tournament
 *
 * @param {string} tournamentId - Tournament ID
 * @param {string} pairId - Pair ID
 * @param {Object} user - User object (for authorization)
 * @param {Object} options - Registration options
 * @param {boolean} [options.eligibilityOverride=false] - Override eligibility (organizer/admin only)
 * @param {string} [options.overrideReason] - Required if eligibilityOverride is true
 * @returns {Promise<Object>} Created registration
 */
export async function registerPair(tournamentId, pairId, user, options = {}) {
  const { eligibilityOverride = false, overrideReason = null } = options;

  // Validate tournament exists
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      category: true,
    },
  });

  if (!tournament) {
    throw createPairError(PairErrorCodes.TOURNAMENT_NOT_FOUND);
  }

  // Validate category is DOUBLES type
  if (tournament.category.type !== 'DOUBLES') {
    throw createPairError(
      PairErrorCodes.WRONG_CATEGORY_TYPE,
      'Tournament category must be DOUBLES type for pair registration'
    );
  }

  // Fetch pair with players
  const pair = await prisma.doublesPair.findUnique({
    where: { id: pairId },
    include: {
      player1: true,
      player2: true,
      category: true,
    },
  });

  if (!pair || pair.deletedAt) {
    throw createPairError(PairErrorCodes.PAIR_NOT_FOUND);
  }

  // Validate pair belongs to tournament's category
  if (pair.categoryId !== tournament.categoryId) {
    throw createPairError(
      PairErrorCodes.INVALID_CATEGORY,
      'Pair category does not match tournament category'
    );
  }

  // Check for duplicate registration
  const existingRegistration = await prisma.pairRegistration.findUnique({
    where: {
      tournamentId_pairId: {
        tournamentId,
        pairId,
      },
    },
  });

  if (existingRegistration) {
    throw createPairError(PairErrorCodes.ALREADY_REGISTERED);
  }

  // Check if either player is already registered with a different partner
  const player1OtherRegistration = await prisma.pairRegistration.findFirst({
    where: {
      tournamentId,
      status: { in: ['REGISTERED', 'WAITLISTED'] },
      pair: {
        OR: [
          { player1Id: pair.player1Id },
          { player2Id: pair.player1Id },
        ],
      },
      pairId: { not: pairId },
    },
    include: {
      pair: {
        include: {
          player1: { select: { name: true } },
          player2: { select: { name: true } },
        },
      },
    },
  });

  const player2OtherRegistration = await prisma.pairRegistration.findFirst({
    where: {
      tournamentId,
      status: { in: ['REGISTERED', 'WAITLISTED'] },
      pair: {
        OR: [
          { player1Id: pair.player2Id },
          { player2Id: pair.player2Id },
        ],
      },
      pairId: { not: pairId },
    },
    include: {
      pair: {
        include: {
          player1: { select: { name: true } },
          player2: { select: { name: true } },
        },
      },
    },
  });

  const partnerConflicts = [];
  if (player1OtherRegistration) {
    partnerConflicts.push(
      `${pair.player1.name} is already registered with a different partner`
    );
  }
  if (player2OtherRegistration) {
    partnerConflicts.push(
      `${pair.player2.name} is already registered with a different partner`
    );
  }

  // Check eligibility (unless override is enabled)
  const violations = [];

  if (!eligibilityOverride) {
    // Check player 1 eligibility
    const player1Eligibility = meetsAllCriteria(pair.player1, tournament.category);
    if (!player1Eligibility.eligible) {
      player1Eligibility.violations.forEach((violation) => {
        violations.push(formatEligibilityViolation(pair.player1.name, violation));
      });
    }

    // Check player 2 eligibility
    const player2Eligibility = meetsAllCriteria(pair.player2, tournament.category);
    if (!player2Eligibility.eligible) {
      player2Eligibility.violations.forEach((violation) => {
        violations.push(formatEligibilityViolation(pair.player2.name, violation));
      });
    }

    // Add partner conflicts
    violations.push(...partnerConflicts);

    // If there are violations and no override, reject registration
    if (violations.length > 0) {
      throw createEligibilityError(violations);
    }
  } else {
    // Eligibility override requested
    // Check if user has permission to override
    const overrideAuth = canOverrideEligibility(user);
    if (!overrideAuth.authorized) {
      throw overrideAuth.error;
    }

    // Validate override reason is provided
    if (!overrideReason || overrideReason.trim().length === 0) {
      throw createPairError(
        PairErrorCodes.OVERRIDE_REASON_REQUIRED,
        'Override reason is required when eligibilityOverride is true'
      );
    }
  }

  // Determine registration status based on tournament capacity
  let status = 'REGISTERED';
  let promotedAt = null;

  if (tournament.capacity) {
    const registeredCount = await prisma.pairRegistration.count({
      where: {
        tournamentId,
        status: 'REGISTERED',
      },
    });

    if (registeredCount >= tournament.capacity) {
      status = 'WAITLISTED';
    }
  }

  // Create registration
  const registration = await prisma.pairRegistration.create({
    data: {
      tournamentId,
      pairId,
      status,
      eligibilityOverride,
      overrideReason,
      promotedAt,
    },
    include: {
      pair: {
        include: {
          player1: {
            select: { id: true, name: true },
          },
          player2: {
            select: { id: true, name: true },
          },
        },
      },
      tournament: {
        select: {
          id: true,
          name: true,
          categoryId: true,
          capacity: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      },
    },
  });

  // Get current registration count for response
  const registeredCount = await prisma.pairRegistration.count({
    where: {
      tournamentId,
      status: 'REGISTERED',
    },
  });

  return {
    ...registration,
    tournament: {
      ...registration.tournament,
      registeredCount,
    },
  };
}

/**
 * Withdraw a pair registration
 *
 * @param {string} registrationId - Registration ID
 * @returns {Promise<Object>} Updated registration with lifecycle info
 */
export async function withdrawPairRegistration(registrationId) {
  const registration = await prisma.pairRegistration.findUnique({
    where: { id: registrationId },
    include: {
      pair: true,
    },
  });

  if (!registration) {
    throw createPairError(
      PairErrorCodes.PAIR_NOT_FOUND,
      'Registration not found'
    );
  }

  // Update status to WITHDRAWN
  const updatedRegistration = await prisma.pairRegistration.update({
    where: { id: registrationId },
    data: {
      status: 'WITHDRAWN',
    },
  });

  // Check if pair should be soft-deleted (US2 - Lifecycle management)
  const { checkAndDeleteInactivePair } = await import('./pairService.js');
  const pairDeleted = await checkAndDeleteInactivePair(registration.pairId);

  return {
    ...updatedRegistration,
    pairDeleted,
    message: pairDeleted
      ? 'Pair withdrawn and deleted (no active registrations or season history)'
      : 'Pair withdrawn from tournament successfully',
  };
}

/**
 * Check pair eligibility for a tournament without creating registration
 *
 * @param {string} tournamentId - Tournament ID
 * @param {string} pairId - Pair ID
 * @returns {Promise<Object>} { eligible: boolean, violations: string[] }
 */
export async function checkPairEligibility(tournamentId, pairId) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      category: true,
    },
  });

  if (!tournament) {
    throw createPairError(PairErrorCodes.TOURNAMENT_NOT_FOUND);
  }

  const pair = await prisma.doublesPair.findUnique({
    where: { id: pairId },
    include: {
      player1: true,
      player2: true,
    },
  });

  if (!pair || pair.deletedAt) {
    throw createPairError(PairErrorCodes.PAIR_NOT_FOUND);
  }

  const violations = [];

  // Check player 1 eligibility
  const player1Eligibility = meetsAllCriteria(pair.player1, tournament.category);
  if (!player1Eligibility.eligible) {
    player1Eligibility.violations.forEach((violation) => {
      violations.push(formatEligibilityViolation(pair.player1.name, violation));
    });
  }

  // Check player 2 eligibility
  const player2Eligibility = meetsAllCriteria(pair.player2, tournament.category);
  if (!player2Eligibility.eligible) {
    player2Eligibility.violations.forEach((violation) => {
      violations.push(formatEligibilityViolation(pair.player2.name, violation));
    });
  }

  // Check for partner conflicts
  const player1OtherRegistration = await prisma.pairRegistration.findFirst({
    where: {
      tournamentId,
      status: { in: ['REGISTERED', 'WAITLISTED'] },
      pair: {
        OR: [
          { player1Id: pair.player1Id },
          { player2Id: pair.player1Id },
        ],
      },
      pairId: { not: pairId },
    },
  });

  const player2OtherRegistration = await prisma.pairRegistration.findFirst({
    where: {
      tournamentId,
      status: { in: ['REGISTERED', 'WAITLISTED'] },
      pair: {
        OR: [
          { player1Id: pair.player2Id },
          { player2Id: pair.player2Id },
        ],
      },
      pairId: { not: pairId },
    },
  });

  if (player1OtherRegistration) {
    violations.push(
      `${pair.player1.name} is already registered with a different partner`
    );
  }
  if (player2OtherRegistration) {
    violations.push(
      `${pair.player2.name} is already registered with a different partner`
    );
  }

  return {
    eligible: violations.length === 0,
    violations,
    canOverride: violations.length > 0, // Organizers can override eligibility issues
  };
}

export default {
  registerPair,
  withdrawPairRegistration,
  checkPairEligibility,
};
