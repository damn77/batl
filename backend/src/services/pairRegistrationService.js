// Pair Registration Service
// Feature: 006-doubles-pairs

import { PrismaClient } from '@prisma/client';
import { PairErrorCodes, createPairError, createEligibilityError } from '../utils/pairErrors.js';
import { canOverrideEligibility } from '../middleware/pairAuth.js';
import { pairRegistrationLogger } from '../utils/logger.js';

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
  let pair = await prisma.doublesPair.findUnique({
    where: { id: pairId },
    include: {
      player1: true,
      player2: true,
      category: true,
    },
  });

  if (!pair) {
    throw createPairError(PairErrorCodes.PAIR_NOT_FOUND);
  }

  // If pair is soft-deleted, restore it
  if (pair.deletedAt) {
    pairRegistrationLogger.info('Restoring soft-deleted pair during registration', {
      pairId,
      tournamentId
    });

    pair = await prisma.doublesPair.update({
      where: { id: pairId },
      data: { deletedAt: null },
      include: {
        player1: true,
        player2: true,
        category: true,
      },
    });
  }

  // Validate pair belongs to tournament's category
  if (pair.categoryId !== tournament.categoryId) {
    throw createPairError(
      PairErrorCodes.INVALID_CATEGORY,
      'Pair category does not match tournament category'
    );
  }

  // Check for duplicate registration of the exact same pair
  const existingRegistration = await prisma.pairRegistration.findUnique({
    where: {
      tournamentId_pairId: {
        tournamentId,
        pairId,
      },
    },
  });

  if (existingRegistration) {
    // Allow re-registration only if previously WITHDRAWN or CANCELLED
    if (existingRegistration.status === 'WITHDRAWN' || existingRegistration.status === 'CANCELLED') {
      pairRegistrationLogger.info('Re-registering same pair for tournament', {
        registrationId: existingRegistration.id,
        tournamentId,
        pairId,
        previousStatus: existingRegistration.status,
        eligibilityOverride,
        demoteRegistrationId: options.demoteRegistrationId,
      });

      // Check if tournament is full and demotion is needed
      if (tournament.capacity) {
        const registeredCount = await prisma.pairRegistration.count({
          where: {
            tournamentId,
            status: 'REGISTERED',
          },
        });

        pairRegistrationLogger.info('Re-registration: checking capacity', {
          registeredCount,
          capacity: tournament.capacity,
          isFull: registeredCount >= tournament.capacity,
          hasDemoteId: !!options.demoteRegistrationId,
        });

        // If full and demotion requested, handle it in transaction
        if (registeredCount >= tournament.capacity && options.demoteRegistrationId) {
          // Verify the registration to demote
          const registrationToDemote = await prisma.pairRegistration.findUnique({
            where: { id: options.demoteRegistrationId },
            include: {
              pair: {
                include: {
                  player1: { select: { name: true } },
                  player2: { select: { name: true } },
                },
              },
            },
          });

          if (!registrationToDemote) {
            throw createPairError(
              PairErrorCodes.PAIR_NOT_FOUND,
              'Registration to demote not found'
            );
          }

          if (registrationToDemote.status !== 'REGISTERED') {
            throw createPairError(
              PairErrorCodes.INVALID_CATEGORY,
              `Cannot demote registration with status ${registrationToDemote.status}`
            );
          }

          pairRegistrationLogger.info('Re-registration: demoting existing registration', {
            demoteRegistrationId: options.demoteRegistrationId,
            demotedPair: `${registrationToDemote.pair.player1.name} & ${registrationToDemote.pair.player2.name}`,
          });

          // Use transaction to atomically demote and re-register
          const result = await prisma.$transaction(async (tx) => {
            // 1. Demote the specified registration
            await tx.pairRegistration.update({
              where: { id: options.demoteRegistrationId },
              data: { status: 'WAITLISTED' },
            });

            // 2. Update the withdrawn registration to REGISTERED
            const updatedRegistration = await tx.pairRegistration.update({
              where: { id: existingRegistration.id },
              data: {
                status: 'REGISTERED',
                registrationTimestamp: new Date(),
                eligibilityOverride,
                overrideReason: eligibilityOverride ? overrideReason : null,
              },
              include: {
                pair: {
                  include: {
                    player1: { select: { id: true, name: true } },
                    player2: { select: { id: true, name: true } },
                  },
                },
                tournament: {
                  select: { id: true, name: true },
                },
              },
            });

            return updatedRegistration;
          });

          pairRegistrationLogger.info('Re-registration with demotion completed', {
            registrationId: result.id,
            pairId: result.pairId,
          });

          return result;
        }
      }

      // Normal re-registration (tournament not full or no demotion needed)
      // Determine status based on capacity
      let reRegStatus = 'REGISTERED';
      if (tournament.capacity) {
        const registeredCount = await prisma.pairRegistration.count({
          where: {
            tournamentId,
            status: 'REGISTERED',
          },
        });

        // If full and no demotion, add to waitlist
        if (registeredCount >= tournament.capacity) {
          reRegStatus = 'WAITLISTED';
          pairRegistrationLogger.info('Re-registration: tournament full, adding to waitlist', {
            registeredCount,
            capacity: tournament.capacity,
          });
        }
      }

      const updatedRegistration = await prisma.pairRegistration.update({
        where: { id: existingRegistration.id },
        data: {
          status: reRegStatus,
          registrationTimestamp: new Date(),
          eligibilityOverride,
          overrideReason: eligibilityOverride ? overrideReason : null,
        },
        include: {
          pair: {
            include: {
              player1: { select: { id: true, name: true } },
              player2: { select: { id: true, name: true } },
            },
          },
          tournament: {
            select: { id: true, name: true },
          },
        },
      });
      return updatedRegistration;
    }
    // Already actively registered
    throw createPairError(PairErrorCodes.ALREADY_REGISTERED);
  }

  // Check if either player has a WITHDRAWN/CANCELLED registration with a different partner
  // If so, delete those old registrations to allow new pair registration
  const withdrawnRegistrationsToDelete = await prisma.pairRegistration.findMany({
    where: {
      tournamentId,
      status: { in: ['WITHDRAWN', 'CANCELLED'] },
      pair: {
        OR: [
          { player1Id: pair.player1Id },
          { player2Id: pair.player1Id },
          { player1Id: pair.player2Id },
          { player2Id: pair.player2Id },
        ],
      },
      pairId: { not: pairId }, // Different pair
    },
    select: { id: true },
  });

  if (withdrawnRegistrationsToDelete.length > 0) {
    pairRegistrationLogger.info('Deleting withdrawn registrations for players registering with new partner', {
      tournamentId,
      newPairId: pairId,
      withdrawnRegistrationIds: withdrawnRegistrationsToDelete.map(r => r.id),
    });

    await prisma.pairRegistration.deleteMany({
      where: {
        id: { in: withdrawnRegistrationsToDelete.map(r => r.id) },
      },
    });
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

  // Check for partner conflicts and eligibility override
  // Note: Player eligibility was already validated when the pair was created.
  // Once a pair exists in a category, it's valid for all tournaments in that category.
  // We only need to check for partner conflicts (same player registered with different partner).

  const violations = [...partnerConflicts];

  if (!eligibilityOverride) {
    // If there are partner conflicts and no override, reject registration
    if (violations.length > 0) {
      throw createEligibilityError(violations);
    }
  } else {
    // Eligibility override requested (for partner conflicts)
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

    pairRegistrationLogger.info('Registering pair with eligibility override', {
      tournamentId,
      pairId,
      violations,
      overrideReason,
    });
  }

  // Determine registration status based on tournament capacity
  let status = 'REGISTERED';
  let promotedAt = null;

  pairRegistrationLogger.info('Starting registration process', {
    tournamentId,
    pairId,
    tournamentCapacity: tournament.capacity,
    demoteRegistrationId: options.demoteRegistrationId,
    eligibilityOverride,
  });

  if (tournament.capacity) {
    const registeredCount = await prisma.pairRegistration.count({
      where: {
        tournamentId,
        status: 'REGISTERED',
      },
    });

    pairRegistrationLogger.info('Checked current registrations', {
      tournamentId,
      registeredCount,
      capacity: tournament.capacity,
      isFull: registeredCount >= tournament.capacity,
    });

    // If tournament is full
    if (registeredCount >= tournament.capacity) {
      pairRegistrationLogger.info('Tournament is full, checking for demotion', {
        tournamentId,
        demoteRegistrationId: options.demoteRegistrationId,
        hasDemoteId: !!options.demoteRegistrationId,
      });

      // Check if organizer provided a registration to demote
      if (options.demoteRegistrationId) {
        pairRegistrationLogger.info('Demotion requested, fetching registration to demote', {
          demoteRegistrationId: options.demoteRegistrationId,
        });

        // Verify the registration exists and is REGISTERED
        const registrationToDemote = await prisma.pairRegistration.findUnique({
          where: { id: options.demoteRegistrationId },
          include: {
            pair: {
              include: {
                player1: { select: { name: true } },
                player2: { select: { name: true } },
              },
            },
          },
        });

        pairRegistrationLogger.info('Registration to demote fetched', {
          found: !!registrationToDemote,
          registrationId: registrationToDemote?.id,
          status: registrationToDemote?.status,
          tournamentId: registrationToDemote?.tournamentId,
        });

        if (!registrationToDemote) {
          throw createPairError(
            PairErrorCodes.PAIR_NOT_FOUND,
            'Registration to demote not found'
          );
        }

        if (registrationToDemote.tournamentId !== tournamentId) {
          throw createPairError(
            PairErrorCodes.INVALID_CATEGORY,
            'Registration to demote is not for this tournament'
          );
        }

        if (registrationToDemote.status !== 'REGISTERED') {
          throw createPairError(
            PairErrorCodes.INVALID_CATEGORY,
            `Cannot demote registration with status ${registrationToDemote.status}`
          );
        }

        pairRegistrationLogger.info('Starting atomic transaction: demote + register', {
          tournamentId,
          demotedRegistrationId: options.demoteRegistrationId,
          demotedPair: `${registrationToDemote.pair.player1.name} & ${registrationToDemote.pair.player2.name}`,
          newPairId: pairId,
        });

        // Use transaction to atomically demote and create new registration
        const result = await prisma.$transaction(async (tx) => {
          pairRegistrationLogger.info('Transaction started: updating registration to WAITLISTED', {
            registrationId: options.demoteRegistrationId,
          });

          // 1. Demote the specified registration to WAITLISTED
          await tx.pairRegistration.update({
            where: { id: options.demoteRegistrationId },
            data: { status: 'WAITLISTED' },
          });

          pairRegistrationLogger.info('Transaction: registration demoted, creating new registration', {
            demotedId: options.demoteRegistrationId,
            newPairId: pairId,
          });

          // 2. Create new registration with REGISTERED status
          const registration = await tx.pairRegistration.create({
            data: {
              tournamentId,
              pairId,
              status: 'REGISTERED',
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

          pairRegistrationLogger.info('Transaction: new registration created', {
            registrationId: registration.id,
            pairId: registration.pairId,
            status: registration.status,
          });

          return registration;
        });

        pairRegistrationLogger.info('Transaction completed successfully', {
          newRegistrationId: result.id,
          newPairId: result.pairId,
        });

        // Get current registration count for response
        const finalRegisteredCount = await prisma.pairRegistration.count({
          where: {
            tournamentId,
            status: 'REGISTERED',
          },
        });

        pairRegistrationLogger.info('Final registration count after transaction', {
          tournamentId,
          registeredCount: finalRegisteredCount,
          capacity: tournament.capacity,
        });

        return {
          ...result,
          tournament: {
            ...result.tournament,
            registeredCount: finalRegisteredCount,
          },
        };
      } else {
        pairRegistrationLogger.info('No demotion ID provided, new pair going to waitlist', {
          tournamentId,
          pairId,
        });
        // No demote specified, new pair goes to waitlist
        status = 'WAITLISTED';
      }
    }
  }

  // Create registration (non-transaction path - when not full or going to waitlist)
  pairRegistrationLogger.info('Registering pair for tournament', {
    tournamentId,
    pairId,
    status,
    eligibilityOverride,
  });

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

  const wasRegistered = registration.status === 'REGISTERED';
  const tournamentId = registration.tournamentId;

  // Use transaction for atomic withdrawal + auto-promotion
  const result = await prisma.$transaction(async (tx) => {
    // Update status to WITHDRAWN
    const updatedRegistration = await tx.pairRegistration.update({
      where: { id: registrationId },
      data: {
        status: 'WITHDRAWN',
      },
    });

    let promotedRegistration = null;

    // Auto-promote from waitlist if pair was REGISTERED (freeing up a spot)
    if (wasRegistered) {
      pairRegistrationLogger.info('Checking for waitlisted pairs to promote', {
        tournamentId,
        withdrawnPairId: registration.pairId,
      });

      // Find oldest waitlisted pair (FIFO by registrationTimestamp)
      const nextWaitlisted = await tx.pairRegistration.findFirst({
        where: {
          tournamentId,
          status: 'WAITLISTED',
        },
        orderBy: {
          registrationTimestamp: 'asc', // Oldest first
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
        },
      });

      pairRegistrationLogger.info('Waitlisted pair search result', {
        found: !!nextWaitlisted,
        pairId: nextWaitlisted?.pairId,
      });

      // Promote if found
      if (nextWaitlisted) {
        promotedRegistration = await tx.pairRegistration.update({
          where: { id: nextWaitlisted.id },
          data: {
            status: 'REGISTERED',
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
          },
        });

        pairRegistrationLogger.info('Auto-promoted waitlisted pair', {
          tournamentId,
          promotedPairId: nextWaitlisted.pairId,
          promotedRegistrationId: nextWaitlisted.id,
          withdrawnPairId: registration.pairId,
        });
      }
    } else {
      pairRegistrationLogger.info('Pair was not REGISTERED, no promotion needed', {
        status: registration.status,
      });
    }

    return {
      updatedRegistration,
      promotedRegistration,
    };
  });

  // Check if pair should be soft-deleted (US2 - Lifecycle management)
  const { checkAndDeleteInactivePair } = await import('./pairService.js');
  const pairDeleted = await checkAndDeleteInactivePair(registration.pairId);

  return {
    ...result.updatedRegistration,
    pairDeleted,
    promotedPair: result.promotedRegistration
      ? {
        id: result.promotedRegistration.id,
        pairId: result.promotedRegistration.pairId,
        player1Name: result.promotedRegistration.pair.player1.name,
        player2Name: result.promotedRegistration.pair.player2.name,
        status: result.promotedRegistration.status,
      }
      : null,
    message: pairDeleted
      ? 'Pair withdrawn and deleted (no active registrations or season history)'
      : wasRegistered && result.promotedRegistration
        ? `Pair withdrawn successfully. ${result.promotedRegistration.pair.player1.name} & ${result.promotedRegistration.pair.player2.name} promoted from waitlist.`
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

  // Note: Player eligibility was already validated when the pair was created.
  // Once a pair exists in a category, it's valid for all tournaments in that category.
  // We only check for partner conflicts here.
  const violations = [];

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
