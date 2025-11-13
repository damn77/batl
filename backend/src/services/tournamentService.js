// T037-T039: Tournament Service - Business logic for tournament management
import { PrismaClient } from '@prisma/client';
import createHttpError from 'http-errors';
import * as categoryService from './categoryService.js';
import * as registrationService from './registrationService.js';
import * as locationService from './locationService.js';
import * as organizerService from './organizerService.js';

const prisma = new PrismaClient();

/**
 * T039: Validate category exists before creating tournament
 * FR-006: Every tournament must belong to exactly one category
 */
async function validateCategoryExists(categoryId) {
  try {
    await categoryService.getCategoryById(categoryId);
    return true;
  } catch (error) {
    if (error.statusCode === 404) {
      throw createHttpError(404, `Category with ID ${categoryId} not found`, {
        code: 'CATEGORY_NOT_FOUND',
        field: 'categoryId'
      });
    }
    throw error;
  }
}

/**
 * T037: Create a new tournament
 * FR-006: Tournament must be assigned to exactly one category
 * categoryId is required and immutable after creation
 *
 * @param {Object} data - Tournament data including clubName/address (for Location) and userId (for Organizer)
 * @param {string} userId - ID of user creating the tournament (becomes organizer)
 */
export async function createTournament(data, userId) {
  const { name, categoryId, description, clubName, address, startDate, endDate, capacity } = data;

  // T039: Validate category exists
  await validateCategoryExists(categoryId);

  // Validate dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  if (start < now) {
    throw createHttpError(400, 'Start date must be in the future', {
      code: 'INVALID_START_DATE'
    });
  }

  if (end < start) {
    throw createHttpError(400, 'End date must be after start date', {
      code: 'INVALID_DATE_RANGE'
    });
  }

  // Create or find Location if clubName provided
  let locationId = null;
  if (clubName) {
    const location = await locationService.findOrCreateLocation({ clubName, address });
    locationId = location.id;
  }

  // Create or find Organizer for the user
  let organizerId = null;
  if (userId) {
    const organizer = await organizerService.findOrCreateOrganizer(userId);
    organizerId = organizer.id;
  }

  // Create tournament with SCHEDULED status
  const tournament = await prisma.tournament.create({
    data: {
      name,
      categoryId,
      description: description || null,
      capacity: capacity !== undefined ? (capacity === null ? null : parseInt(capacity)) : null,
      locationId,
      organizerId,
      startDate: start,
      endDate: end,
      status: 'SCHEDULED'
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          type: true,
          ageGroup: true,
          gender: true
        }
      },
      location: {
        select: {
          id: true,
          clubName: true,
          address: true
        }
      },
      organizer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true
        }
      }
    }
  });

  return tournament;
}

/**
 * Get all tournaments with optional filtering
 * Supports filtering by category, status, formatType, and start date
 * @param {Object} filters - Filter options
 * @param {string} [userId] - Optional user ID to include registration status
 */
export async function listTournaments(filters = {}, userId = null) {
  const { categoryId, status, formatType, startDate, page = 1, limit = 20 } = filters;

  const where = {};

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (status) {
    where.status = status;
  }

  // T121: Format type filter
  if (formatType) {
    where.formatType = formatType;
  }

  if (startDate) {
    where.startDate = {
      gte: new Date(startDate)
    };
  }

  const skip = (page - 1) * limit;
  const take = Math.min(limit, 100); // Max 100 per page

  const [tournaments, total] = await Promise.all([
    prisma.tournament.findMany({
      where,
      skip,
      take,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            type: true,
            ageGroup: true,
            gender: true
          }
        },
        location: {
          select: {
            id: true,
            clubName: true,
            address: true
          }
        },
        backupLocation: {
          select: {
            id: true,
            clubName: true,
            address: true
          }
        },
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: [
        { startDate: 'asc' },
        { createdAt: 'desc' }
      ]
    }),
    prisma.tournament.count({ where })
  ]);

  // Fetch user's registrations if userId provided (optimization to avoid N+1 queries)
  let userRegistrationsMap = {};
  if (userId) {
    const tournamentIds = tournaments.map(t => t.id);
    const userRegistrations = await prisma.tournamentRegistration.findMany({
      where: {
        tournamentId: { in: tournamentIds },
        playerId: userId
      },
      select: {
        tournamentId: true,
        status: true,
        registrationTimestamp: true
      }
    });

    // Create map for quick lookup
    userRegistrations.forEach(reg => {
      userRegistrationsMap[reg.tournamentId] = {
        status: reg.status,
        registeredAt: reg.registrationTimestamp
      };
    });
  }

  // Fetch registration statistics for all tournaments
  const tournamentsWithStats = await Promise.all(
    tournaments.map(async (tournament) => {
      const [registeredCount, waitlistedCount] = await Promise.all([
        prisma.tournamentRegistration.count({
          where: { tournamentId: tournament.id, status: 'REGISTERED' }
        }),
        prisma.tournamentRegistration.count({
          where: { tournamentId: tournament.id, status: 'WAITLISTED' }
        })
      ]);

      const tournamentData = {
        ...tournament,
        registeredCount,
        waitlistedCount
      };

      // Include user's registration status if available
      if (userId && userRegistrationsMap[tournament.id]) {
        tournamentData.myRegistration = userRegistrationsMap[tournament.id];
      }

      return tournamentData;
    })
  );

  return {
    tournaments: tournamentsWithStats,
    pagination: {
      page,
      limit: take,
      total,
      pages: Math.ceil(total / take)
    }
  };
}

/**
 * Get tournament by ID with category, location, and organizer details
 */
export async function getTournamentById(id) {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          type: true,
          ageGroup: true,
          gender: true
        }
      },
      location: {
        select: {
          id: true,
          clubName: true,
          address: true
        }
      },
      backupLocation: {
        select: {
          id: true,
          clubName: true,
          address: true
        }
      },
      organizer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true
        }
      },
      deputyOrganizer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true
        }
      }
    }
  });

  if (!tournament) {
    throw createHttpError(404, 'Tournament not found', { code: 'TOURNAMENT_NOT_FOUND' });
  }

  return tournament;
}

/**
 * Validate that all registered players are eligible for new category
 * Used when changing tournament category
 */
async function validateRegisteredPlayersForNewCategory(tournamentId, newCategoryId) {
  // Get all active registrations for this tournament's category
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      categoryId: true,
      category: { select: { id: true, name: true } }
    }
  });

  // Get all active registrations for the current category
  const registrations = await prisma.categoryRegistration.findMany({
    where: {
      categoryId: tournament.categoryId,
      status: { in: ['ACTIVE', 'SUSPENDED'] }
    },
    select: { playerId: true, player: { select: { name: true } } }
  });

  // If no registrations, category change is allowed
  if (registrations.length === 0) {
    return { valid: true, ineligiblePlayers: [] };
  }

  // Validate each player against new category
  const ineligiblePlayers = [];
  for (const registration of registrations) {
    try {
      await registrationService.checkEligibility(registration.playerId, newCategoryId);
    } catch (error) {
      // Player is not eligible for new category
      if (error.code === 'INELIGIBLE_AGE' || error.code === 'INELIGIBLE_GENDER' || error.code === 'INCOMPLETE_PROFILE') {
        ineligiblePlayers.push({
          playerId: registration.playerId,
          playerName: registration.player.name,
          reason: error.code,
          details: error.message
        });
      }
    }
  }

  if (ineligiblePlayers.length > 0) {
    throw createHttpError(400, 'Cannot change category: some registered players are ineligible for the new category', {
      code: 'PLAYERS_INELIGIBLE_FOR_NEW_CATEGORY',
      ineligiblePlayers,
      message: `${ineligiblePlayers.length} registered player(s) do not meet eligibility requirements for the new category`
    });
  }

  return { valid: true, ineligiblePlayers: [] };
}

/**
 * Update tournament
 * Can update: name, description, clubName/address (location), startDate, endDate, categoryId
 *
 * Category change: Allowed if all registered players are eligible for new category
 * Reason: Organizers need flexibility for low participation or injuries
 */
export async function updateTournament(id, data) {
  // Verify tournament exists
  await getTournamentById(id);

  // Validate category change if requested
  if (data.categoryId) {
    // Verify new category exists
    await validateCategoryExists(data.categoryId);

    // Validate all registered players are eligible for new category
    await validateRegisteredPlayersForNewCategory(id, data.categoryId);
  }

  // Validate dates if provided
  if (data.startDate || data.endDate) {
    const existingTournament = await prisma.tournament.findUnique({
      where: { id },
      select: { startDate: true, endDate: true }
    });

    const start = data.startDate ? new Date(data.startDate) : existingTournament.startDate;
    const end = data.endDate ? new Date(data.endDate) : existingTournament.endDate;

    if (end < start) {
      throw createHttpError(400, 'End date must be after start date', {
        code: 'INVALID_DATE_RANGE'
      });
    }
  }

  // Update allowed fields
  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.description !== undefined) updateData.description = data.description || null;
  if (data.capacity !== undefined) updateData.capacity = data.capacity === null ? null : parseInt(data.capacity);
  if (data.startDate) updateData.startDate = new Date(data.startDate);
  if (data.endDate) updateData.endDate = new Date(data.endDate);

  // Handle location update - create or find location if clubName provided
  if (data.clubName !== undefined) {
    const location = await locationService.findOrCreateLocation({
      clubName: data.clubName,
      address: data.address
    });
    updateData.locationId = location.id;
  }

  return await prisma.tournament.update({
    where: { id },
    data: updateData,
    include: {
      category: {
        select: {
          id: true,
          name: true,
          type: true,
          ageGroup: true,
          gender: true
        }
      },
      location: {
        select: {
          id: true,
          clubName: true,
          address: true
        }
      },
      backupLocation: {
        select: {
          id: true,
          clubName: true,
          address: true
        }
      },
      organizer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true
        }
      },
      deputyOrganizer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true
        }
      }
    }
  });
}

/**
 * Delete tournament (only if status is SCHEDULED)
 * Cannot delete tournaments that are IN_PROGRESS or COMPLETED
 */
export async function deleteTournament(id) {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: { status: true }
  });

  if (!tournament) {
    throw createHttpError(404, 'Tournament not found', { code: 'TOURNAMENT_NOT_FOUND' });
  }

  // T050: Only allow deletion if tournament hasn't started
  if (tournament.status !== 'SCHEDULED') {
    throw createHttpError(409, 'Cannot delete tournament that is IN_PROGRESS, COMPLETED, or CANCELLED', {
      code: 'TOURNAMENT_STARTED',
      currentStatus: tournament.status
    });
  }

  await prisma.tournament.delete({ where: { id } });
}
