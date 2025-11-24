// 003-tournament-registration: Tournament Registration Service
// Handles tournament registration with auto-category enrollment, waitlist management, and smart cleanup
import { PrismaClient } from '@prisma/client';
import createHttpError from 'http-errors';
import * as registrationService from './registrationService.js';
import * as categoryService from './categoryService.js';
import * as sharedTournamentService from './sharedTournamentService.js';

const prisma = new PrismaClient();

/**
 * T013: Check tournament capacity and determine registration status
 * FR-018, FR-031: Returns REGISTERED or WAITLISTED based on capacity
 */
async function checkCapacity(tournamentId) {
  return await sharedTournamentService.checkCapacity(tournamentId, 'tournamentRegistration');
}

/**
 * T014: Anti-spam protection - Waitlist requires category membership
 * FR-029, FR-030: Players must be in category before joining waitlist
 */
async function validateCategoryMembership(playerId, categoryId, registrationStatus) {
  // Only enforce for WAITLISTED status (FR-030: auto-category only for REGISTERED)
  if (registrationStatus !== 'WAITLISTED') {
    return { hasCategory: true }; // Not applicable for REGISTERED
  }

  // Check if player already has ACTIVE category registration
  const categoryRegistration = await prisma.categoryRegistration.findUnique({
    where: {
      playerId_categoryId: {
        playerId,
        categoryId
      }
    }
  });

  if (!categoryRegistration || categoryRegistration.status !== 'ACTIVE') {
    throw createHttpError(400, 'Must be registered in category before joining waitlist', {
      code: 'CATEGORY_REGISTRATION_REQUIRED',
      categoryId,
      playerId,
      message: 'Players must be registered in the tournament category before joining the waitlist'
    });
  }

  return { hasCategory: true };
}

/**
 * T015: Auto-category registration for REGISTERED players
 * FR-004: Automatically register player in category if status is REGISTERED
 */
async function ensureCategoryRegistration(playerId, categoryId, registrationStatus) {
  // FR-030: Only auto-register for REGISTERED status (not WAITLISTED)
  if (registrationStatus !== 'REGISTERED') {
    return { categoryRegistration: null, isNew: false };
  }

  // Check if already registered in category
  const existing = await prisma.categoryRegistration.findUnique({
    where: {
      playerId_categoryId: {
        playerId,
        categoryId
      }
    }
  });

  if (existing) {
    return { categoryRegistration: existing, isNew: false };
  }

  // T025: Validate eligibility before creating category registration
  // This will throw if player is not eligible (age, gender, profile completeness)
  await registrationService.checkEligibility(playerId, categoryId);

  // Create new category registration
  const categoryRegistration = await prisma.categoryRegistration.create({
    data: {
      playerId,
      categoryId,
      status: 'ACTIVE',
      hasParticipated: false
    }
  });

  return { categoryRegistration, isNew: true };
}

/**
 * T016: Registration window validation
 * FR-038, FR-039: Check registration open/close dates
 */
function validateRegistrationWindow(tournament) {
  const now = new Date();

  // Check if registration has opened
  if (tournament.registrationOpenDate && now < new Date(tournament.registrationOpenDate)) {
    throw createHttpError(400, 'Registration has not opened yet', {
      code: 'REGISTRATION_NOT_OPEN',
      opensAt: tournament.registrationOpenDate,
      currentTime: now
    });
  }

  // Check if registration has closed
  if (tournament.registrationCloseDate && now > new Date(tournament.registrationCloseDate)) {
    throw createHttpError(400, 'Registration has closed', {
      code: 'REGISTRATION_CLOSED',
      closedAt: tournament.registrationCloseDate,
      currentTime: now
    });
  }

  return { valid: true };
}

/**
 * T017: Duplicate registration prevention
 * FR-009: Players can only register once per tournament
 */
async function checkDuplicateTournamentRegistration(playerId, tournamentId) {
  const existing = await prisma.tournamentRegistration.findUnique({
    where: {
      playerId_tournamentId: {
        playerId,
        tournamentId
      }
    }
  });

  if (existing) {
    // FR-010, FR-011: Allow re-registration only if previously WITHDRAWN
    if (existing.status === 'WITHDRAWN') {
      return { canReregister: true, previous: existing };
    }

    throw createHttpError(409, 'Already registered for this tournament', {
      code: 'ALREADY_REGISTERED',
      existingRegistrationId: existing.id,
      status: existing.status,
      registeredAt: existing.registrationTimestamp
    });
  }

  return { canReregister: false, previous: null };
}

/**
 * Validate tournament status
 * FR-010, FR-011: Can only register for SCHEDULED tournaments
 */
function validateTournamentStatus(tournament) {
  if (tournament.status !== 'SCHEDULED') {
    throw createHttpError(400, 'Can only register for scheduled tournaments', {
      code: 'INVALID_TOURNAMENT_STATUS',
      currentStatus: tournament.status,
      allowedStatus: 'SCHEDULED'
    });
  }

  return { valid: true };
}

/**
 * T012: Register player for tournament with auto-category enrollment
 * Main registration method combining all validations and business logic
 */
export async function registerPlayer(playerId, tournamentId, options = {}) {
  const { demoteRegistrationId } = options;

  console.log('[registerPlayer] Starting registration', {
    playerId,
    tournamentId,
    demoteRegistrationId,
    hasDemoteId: !!demoteRegistrationId,
  });

  // Fetch tournament with category details
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      category: true
    }
  });

  if (!tournament) {
    throw createHttpError(404, 'Tournament not found', {
      code: 'TOURNAMENT_NOT_FOUND'
    });
  }

  // Validate tournament status (FR-010, FR-011)
  validateTournamentStatus(tournament);

  // T016: Validate registration window (FR-038, FR-039)
  validateRegistrationWindow(tournament);

  // T017: Check for duplicate registration (FR-009)
  const duplicateCheck = await checkDuplicateTournamentRegistration(playerId, tournamentId);

  // If re-registering after withdrawal
  if (duplicateCheck.canReregister) {
    console.log('[registerPlayer] Re-registering withdrawn player', {
      playerId,
      previousRegistrationId: duplicateCheck.previous.id,
    });

    // Check if tournament is full and handle demotion for re-registration
    if (tournament.capacity) {
      const registeredCount = await prisma.tournamentRegistration.count({
        where: {
          tournamentId,
          status: 'REGISTERED',
        },
      });

      console.log('[registerPlayer] Re-registration capacity check', {
        registeredCount,
        capacity: tournament.capacity,
        isFull: registeredCount >= tournament.capacity,
      });

      // If full and demotion requested
      if (registeredCount >= tournament.capacity && demoteRegistrationId) {
        // Verify the registration to demote
        const registrationToDemote = await prisma.tournamentRegistration.findUnique({
          where: { id: demoteRegistrationId },
          include: {
            player: { select: { name: true } },
          },
        });

        if (!registrationToDemote) {
          throw createHttpError(404, 'Registration to demote not found', {
            code: 'REGISTRATION_NOT_FOUND',
          });
        }

        if (registrationToDemote.status !== 'REGISTERED') {
          throw createHttpError(400, `Cannot demote registration with status ${registrationToDemote.status}`, {
            code: 'INVALID_STATUS',
          });
        }

        console.log('[registerPlayer] Re-registration: demoting existing registration', {
          demoteRegistrationId,
          demotedPlayer: registrationToDemote.player.name,
        });

        // Use transaction to atomically demote and re-register
        const result = await prisma.$transaction(async (tx) => {
          // 1. Demote the specified registration
          await tx.tournamentRegistration.update({
            where: { id: demoteRegistrationId },
            data: { status: 'WAITLISTED' },
          });

          // 2. Delete old withdrawn registration
          await tx.tournamentRegistration.delete({
            where: { id: duplicateCheck.previous.id },
          });

          // 3. Create new registration with REGISTERED status
          const registration = await tx.tournamentRegistration.create({
            data: {
              playerId,
              tournamentId,
              status: 'REGISTERED',
              registrationTimestamp: new Date(),
            },
            include: {
              player: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  gender: true,
                  birthDate: true,
                },
              },
              tournament: {
                include: {
                  category: true,
                },
              },
            },
          });

          return registration;
        });

        // Ensure category registration for REGISTERED players
        const categoryResult = await ensureCategoryRegistration(
          playerId,
          tournament.categoryId,
          'REGISTERED'
        );

        console.log('[registerPlayer] Re-registration with demotion completed', {
          registrationId: result.id,
          playerId,
        });

        return {
          registration: result,
          categoryRegistration: categoryResult.categoryRegistration
            ? {
              ...categoryResult.categoryRegistration,
              isNew: categoryResult.isNew,
            }
            : null,
          capacityInfo: { status: 'REGISTERED', capacity: tournament.capacity, currentCount: registeredCount },
          message: 'Successfully registered for tournament',
        };
      }

      // If full and no demotion, add to waitlist
      if (registeredCount >= tournament.capacity) {
        console.log('[registerPlayer] Re-registration: tournament full, adding to waitlist', {
          registeredCount,
          capacity: tournament.capacity,
        });

        // Delete old withdrawn registration
        await prisma.tournamentRegistration.delete({
          where: { id: duplicateCheck.previous.id },
        });

        // Create new registration with WAITLISTED status
        const registration = await prisma.tournamentRegistration.create({
          data: {
            playerId,
            tournamentId,
            status: 'WAITLISTED',
            registrationTimestamp: new Date(),
          },
          include: {
            player: {
              select: {
                id: true,
                name: true,
                email: true,
                gender: true,
                birthDate: true,
              },
            },
            tournament: {
              include: {
                category: true,
              },
            },
          },
        });

        return {
          registration,
          categoryRegistration: null,
          capacityInfo: { status: 'WAITLISTED', capacity: tournament.capacity, currentCount: registeredCount },
          message: 'Added to waitlist - tournament is at capacity',
        };
      }
    }

    // Normal re-registration (not full)
    await prisma.tournamentRegistration.delete({
      where: { id: duplicateCheck.previous.id },
    });
  }

  // T013: Check capacity and determine status (FR-018, FR-031)
  const capacityCheck = await checkCapacity(tournamentId);
  let registrationStatus = capacityCheck.status;

  // If tournament is full, check for demotion
  if (tournament.capacity && capacityCheck.currentCount >= tournament.capacity) {
    console.log('[registerPlayer] Tournament is full', {
      currentCount: capacityCheck.currentCount,
      capacity: tournament.capacity,
      demoteRegistrationId,
    });

    if (demoteRegistrationId) {
      // Verify the registration to demote
      const registrationToDemote = await prisma.tournamentRegistration.findUnique({
        where: { id: demoteRegistrationId },
        include: {
          player: { select: { name: true } },
        },
      });

      if (!registrationToDemote) {
        throw createHttpError(404, 'Registration to demote not found', {
          code: 'REGISTRATION_NOT_FOUND',
        });
      }

      if (registrationToDemote.status !== 'REGISTERED') {
        throw createHttpError(400, `Cannot demote registration with status ${registrationToDemote.status}`, {
          code: 'INVALID_STATUS',
        });
      }

      console.log('[registerPlayer] Demoting existing registration', {
        demoteRegistrationId,
        demotedPlayer: registrationToDemote.player.name,
      });

      // Use transaction to atomically demote and register
      const result = await prisma.$transaction(async (tx) => {
        // 1. Demote the specified registration
        await tx.tournamentRegistration.update({
          where: { id: demoteRegistrationId },
          data: { status: 'WAITLISTED' },
        });

        // 2. Create new registration with REGISTERED status
        const registration = await tx.tournamentRegistration.create({
          data: {
            playerId,
            tournamentId,
            status: 'REGISTERED',
            registrationTimestamp: new Date(),
          },
          include: {
            player: {
              select: {
                id: true,
                name: true,
                email: true,
                gender: true,
                birthDate: true,
              },
            },
            tournament: {
              include: {
                category: true,
              },
            },
          },
        });

        return registration;
      });

      // Ensure category registration for REGISTERED players
      const categoryResult = await ensureCategoryRegistration(
        playerId,
        tournament.categoryId,
        'REGISTERED'
      );

      console.log('[registerPlayer] Registration with demotion completed', {
        registrationId: result.id,
        playerId,
      });

      return {
        registration: result,
        categoryRegistration: categoryResult.categoryRegistration
          ? {
            ...categoryResult.categoryRegistration,
            isNew: categoryResult.isNew,
          }
          : null,
        capacityInfo: { status: 'REGISTERED', capacity: tournament.capacity, currentCount: capacityCheck.currentCount },
        message: 'Successfully registered for tournament',
      };
    } else {
      // No demotion specified, add to waitlist
      registrationStatus = 'WAITLISTED';
      console.log('[registerPlayer] No demotion ID, adding to waitlist');
    }
  }

  // T014: Validate category membership if waitlisted (FR-029, FR-030)
  await validateCategoryMembership(playerId, tournament.categoryId, registrationStatus);

  // T015: Ensure category registration for REGISTERED players (FR-004, FR-030)
  const categoryResult = await ensureCategoryRegistration(
    playerId,
    tournament.categoryId,
    registrationStatus
  );

  // Create tournament registration
  const registration = await prisma.tournamentRegistration.create({
    data: {
      playerId,
      tournamentId,
      status: registrationStatus,
      registrationTimestamp: new Date()
    },
    include: {
      player: {
        select: {
          id: true,
          name: true,
          email: true,
          gender: true,
          birthDate: true
        }
      },
      tournament: {
        include: {
          category: true
        }
      }
    }
  });

  return {
    registration,
    categoryRegistration: categoryResult.categoryRegistration
      ? {
        ...categoryResult.categoryRegistration,
        isNew: categoryResult.isNew
      }
      : null,
    capacityInfo: capacityCheck,
    message: registrationStatus === 'WAITLISTED'
      ? 'Added to waitlist - tournament is at capacity'
      : 'Successfully registered for tournament'
  };
}

/**
 * T026-T028: Unregister player from tournament with auto-promotion and smart cleanup
 * Implements waitlist auto-promotion (T027) and smart category cleanup (T028)
 */
export async function unregisterPlayer(playerId, tournamentId) {
  // Fetch current registration
  const registration = await prisma.tournamentRegistration.findUnique({
    where: {
      playerId_tournamentId: {
        playerId,
        tournamentId
      }
    },
    include: {
      tournament: {
        include: {
          category: true
        }
      }
    }
  });

  if (!registration) {
    throw createHttpError(404, 'Registration not found', {
      code: 'REGISTRATION_NOT_FOUND'
    });
  }

  // Check if already withdrawn
  if (registration.status === 'WITHDRAWN' || registration.status === 'CANCELLED') {
    throw createHttpError(400, 'Registration already withdrawn or cancelled', {
      code: 'ALREADY_WITHDRAWN',
      currentStatus: registration.status
    });
  }

  const categoryId = registration.tournament.categoryId;
  const wasRegistered = registration.status === 'REGISTERED';

  // T027: Use transaction for atomic withdrawal + auto-promotion
  const result = await prisma.$transaction(async (tx) => {
    // Update registration to WITHDRAWN
    const withdrawnRegistration = await tx.tournamentRegistration.update({
      where: { id: registration.id },
      data: {
        status: 'WITHDRAWN',
        withdrawnAt: new Date()
      }
    });

    let promotedRegistration = null;

    // T027: Auto-promote from waitlist if player was REGISTERED (freeing up a spot)
    if (wasRegistered) {
      // Find oldest waitlisted player (FIFO by registrationTimestamp) using shared service
      const nextWaitlisted = await sharedTournamentService.getNextWaitlistCandidate(tournamentId, 'tournamentRegistration');

      // Promote if found
      if (nextWaitlisted) {
        // Fetch full player details for the response
        const fullWaitlisted = await tx.tournamentRegistration.findUnique({
          where: { id: nextWaitlisted.id },
          include: {
            player: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });

        promotedRegistration = await tx.tournamentRegistration.update({
          where: { id: nextWaitlisted.id },
          data: {
            status: 'REGISTERED',
            promotedBy: 'SYSTEM',
            promotedAt: new Date()
          },
          include: {
            player: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });
      }
    }

    return {
      withdrawnRegistration,
      promotedRegistration
    };
  });

  // T028: Smart category cleanup (after transaction)
  const cleanupResult = await categoryService.shouldUnregisterFromCategory(playerId, categoryId);

  let categoryUnregistered = false;
  if (cleanupResult.shouldUnregister) {
    // Delete category registration
    await prisma.categoryRegistration.delete({
      where: {
        playerId_categoryId: {
          playerId,
          categoryId
        }
      }
    });
    categoryUnregistered = true;
  }

  return {
    registration: result.withdrawnRegistration,
    promotedPlayer: result.promotedRegistration
      ? {
        id: result.promotedRegistration.id,
        playerId: result.promotedRegistration.playerId,
        playerName: result.promotedRegistration.player.name,
        status: result.promotedRegistration.status,
        promotedAt: result.promotedRegistration.promotedAt,
        promotedBy: result.promotedRegistration.promotedBy
      }
      : null,
    categoryCleanup: {
      unregistered: categoryUnregistered,
      reason: cleanupResult.reason,
      categoryId
    },
    message: wasRegistered
      ? 'Successfully unregistered from tournament. Spot given to next waitlisted player.'
      : 'Successfully removed from waitlist'
  };
}

/**
 * Get tournament registration for a player
 */
export async function getPlayerRegistration(playerId, tournamentId) {
  const registration = await prisma.tournamentRegistration.findUnique({
    where: {
      playerId_tournamentId: {
        playerId,
        tournamentId
      }
    },
    include: {
      player: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      tournament: {
        include: {
          category: true
        }
      }
    }
  });

  if (!registration) {
    throw createHttpError(404, 'Registration not found', {
      code: 'REGISTRATION_NOT_FOUND'
    });
  }

  return registration;
}

/**
 * Get all registrations for a tournament
 */
export async function getTournamentRegistrations(tournamentId, status = null) {
  const where = {
    tournamentId
  };

  if (status) {
    where.status = status;
  }

  const registrations = await prisma.tournamentRegistration.findMany({
    where,
    include: {
      player: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      registrationTimestamp: 'asc'
    }
  });

  return registrations;
}

/**
 * Get all tournaments a player is registered for
 */
export async function getPlayerTournaments(playerId, status = null) {
  const where = {
    playerId
  };

  if (status) {
    where.status = status;
  }

  const registrations = await prisma.tournamentRegistration.findMany({
    where,
    include: {
      tournament: {
        include: {
          category: true
        }
      }
    },
    orderBy: {
      registrationTimestamp: 'desc'
    }
  });

  return registrations;
}

/**
 * Withdraw a player from a tournament by registration ID (organizer/admin use)
 * Same logic as unregisterPlayer but takes registration ID instead of playerId + tournamentId
 */
export async function withdrawPlayerByRegistrationId(registrationId) {
  // Fetch current registration
  const registration = await prisma.tournamentRegistration.findUnique({
    where: { id: registrationId },
    include: {
      tournament: {
        include: {
          category: true
        }
      }
    }
  });

  if (!registration) {
    throw createHttpError(404, 'Registration not found', {
      code: 'REGISTRATION_NOT_FOUND'
    });
  }

  // Check if already withdrawn
  if (registration.status === 'WITHDRAWN' || registration.status === 'CANCELLED') {
    throw createHttpError(400, 'Registration already withdrawn or cancelled', {
      code: 'ALREADY_WITHDRAWN',
      currentStatus: registration.status
    });
  }

  const playerId = registration.playerId;
  const tournamentId = registration.tournamentId;
  const categoryId = registration.tournament.categoryId;
  const wasRegistered = registration.status === 'REGISTERED';

  // Use transaction for atomic withdrawal + auto-promotion
  const result = await prisma.$transaction(async (tx) => {
    // Update registration to WITHDRAWN
    const withdrawnRegistration = await tx.tournamentRegistration.update({
      where: { id: registrationId },
      data: {
        status: 'WITHDRAWN',
        withdrawnAt: new Date()
      }
    });

    let promotedRegistration = null;

    // Auto-promote from waitlist if player was REGISTERED (freeing up a spot)
    if (wasRegistered) {
      // Find oldest waitlisted player (FIFO by registrationTimestamp)
      const nextWaitlisted = await tx.tournamentRegistration.findFirst({
        where: {
          tournamentId,
          status: 'WAITLISTED'
        },
        orderBy: {
          registrationTimestamp: 'asc' // Oldest first
        },
        include: {
          player: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Promote if found
      if (nextWaitlisted) {
        promotedRegistration = await tx.tournamentRegistration.update({
          where: { id: nextWaitlisted.id },
          data: {
            status: 'REGISTERED',
            promotedBy: 'SYSTEM',
            promotedAt: new Date()
          },
          include: {
            player: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });
      }
    }

    return {
      withdrawnRegistration,
      promotedRegistration
    };
  });

  // Smart category cleanup (after transaction)
  const cleanupResult = await categoryService.shouldUnregisterFromCategory(playerId, categoryId);

  let categoryUnregistered = false;
  if (cleanupResult.shouldUnregister) {
    // Delete category registration
    await prisma.categoryRegistration.delete({
      where: {
        playerId_categoryId: {
          playerId,
          categoryId
        }
      }
    });
    categoryUnregistered = true;
  }

  return {
    registration: result.withdrawnRegistration,
    promotedPlayer: result.promotedRegistration ? {
      playerId: result.promotedRegistration.playerId,
      playerName: result.promotedRegistration.player.name,
      playerEmail: result.promotedRegistration.player.email
    } : null,
    categoryCleanup: {
      unregistered: categoryUnregistered,
      reason: cleanupResult.reason
    },
    message: result.promotedRegistration
      ? `Player unregistered. ${result.promotedRegistration.player.name} has been promoted from the waitlist.`
      : 'Player unregistered successfully'
  };
}

