// T037-T039: Tournament Service - Business logic for tournament management
import { PrismaClient } from '@prisma/client';
import createHttpError from 'http-errors';
import * as categoryService from './categoryService.js';
import * as registrationService from './registrationService.js';
import * as locationService from './locationService.js';
import * as organizerService from './organizerService.js';
import * as ruleComplexityService from './ruleComplexityService.js';
import { getParticipantRange } from '../utils/participantRange.js';
import { getPointTableForRange } from './pointTableService.js';

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
  const userRegistrationsMap = {};
  if (userId) {
    const tournamentIds = tournaments.map(t => t.id);

    // Fetch individual registrations
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
        type: 'SINGLES',
        status: reg.status,
        registeredAt: reg.registrationTimestamp
      };
    });

    // Fetch pair registrations for DOUBLES tournaments
    const doublesTournamentIds = tournaments
      .filter(t => t.category?.type === 'DOUBLES')
      .map(t => t.id);

    if (doublesTournamentIds.length > 0) {
      const userPairRegistrations = await prisma.pairRegistration.findMany({
        where: {
          tournamentId: { in: doublesTournamentIds },
          pair: {
            OR: [
              { player1Id: userId },
              { player2Id: userId }
            ]
          }
        },
        select: {
          tournamentId: true,
          status: true,
          registrationTimestamp: true,
          pairId: true,
          pair: {
            select: {
              player1: { select: { id: true, name: true } },
              player2: { select: { id: true, name: true } }
            }
          }
        }
      });

      // Add pair registrations to map (overwrite individual if exists)
      userPairRegistrations.forEach(reg => {
        userRegistrationsMap[reg.tournamentId] = {
          type: 'DOUBLES',
          status: reg.status,
          registeredAt: reg.registrationTimestamp,
          pairId: reg.pairId,
          pair: reg.pair
        };
      });
    }
  }

  // Fetch registration statistics for all tournaments
  const tournamentsWithStats = await Promise.all(
    tournaments.map(async (tournament) => {
      let registeredCount, waitlistedCount;

      if (tournament.category?.type === 'DOUBLES') {
        // Count pair registrations for DOUBLES tournaments
        [registeredCount, waitlistedCount] = await Promise.all([
          prisma.pairRegistration.count({
            where: { tournamentId: tournament.id, status: 'REGISTERED' }
          }),
          prisma.pairRegistration.count({
            where: { tournamentId: tournament.id, status: 'WAITLISTED' }
          })
        ]);
      } else {
        // Count individual registrations for SINGLES tournaments
        [registeredCount, waitlistedCount] = await Promise.all([
          prisma.tournamentRegistration.count({
            where: { tournamentId: tournament.id, status: 'REGISTERED' }
          }),
          prisma.tournamentRegistration.count({
            where: { tournamentId: tournament.id, status: 'WAITLISTED' }
          })
        ]);
      }

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
 * T006-T008: Get tournament by ID with all related data and computed fields
 * Used for tournament view page - includes full tournament details, registration counts, and rule complexity
 *
 * FR-001: Display all general tournament information
 * FR-003: Calculate and display rule complexity indicator
 *
 * @param {string} id - Tournament ID
 * @returns {Object} Tournament with related data and computed fields (registrationCount, waitlistCount, ruleComplexity)
 */
export async function getTournamentWithRelatedData(id) {
  // T007: Fetch tournament with all related entities
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
      },
      groups: {
        select: {
          ruleOverrides: true
        }
      },
      brackets: {
        select: {
          ruleOverrides: true
        }
      },
      rounds: {
        select: {
          ruleOverrides: true
        }
      },
      matches: {
        select: {
          ruleOverrides: true
        }
      }
    }
  });

  if (!tournament) {
    throw createHttpError(404, 'Tournament not found', { code: 'TOURNAMENT_NOT_FOUND' });
  }

  // T008: Add computed fields
  let registrationCount, waitlistCount;

  if (tournament.category?.type === 'DOUBLES') {
    [registrationCount, waitlistCount] = await Promise.all([
      prisma.pairRegistration.count({
        where: { tournamentId: id, status: 'REGISTERED' }
      }),
      prisma.pairRegistration.count({
        where: { tournamentId: id, status: 'WAITLISTED' }
      })
    ]);
  } else {
    [registrationCount, waitlistCount] = await Promise.all([
      prisma.tournamentRegistration.count({
        where: { tournamentId: id, status: 'REGISTERED' }
      }),
      prisma.tournamentRegistration.count({
        where: { tournamentId: id, status: 'WAITLISTED' }
      })
    ]);
  }

  // Calculate rule complexity using the groups, brackets, rounds, and matches data
  const ruleComplexity = ruleComplexityService.calculateComplexity(
    tournament.groups,
    tournament.brackets,
    tournament.rounds,
    tournament.matches
  );

  // Remove the rule-related arrays from the response (only used for complexity calculation)
  // eslint-disable-next-line no-unused-vars
  const { groups, brackets, rounds, matches, ...tournamentData } = tournament;

  return {
    ...tournamentData,
    registrationCount,
    waitlistCount,
    ruleComplexity
  };
}

/**
 * T012: Get tournament format structure (groups/brackets/rounds) based on format type
 * Returns structure for KNOCKOUT, GROUP, SWISS, or COMBINED formats
 *
 * FR-002: Display tournament format type and configuration
 *
 * @param {string} id - Tournament ID
 * @returns {Object} Format structure based on tournament formatType
 */
export async function getFormatStructure(id) {
  // First verify tournament exists and get its format type
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: { formatType: true }
  });

  if (!tournament) {
    throw createHttpError(404, 'Tournament not found', { code: 'TOURNAMENT_NOT_FOUND' });
  }

  const result = {
    formatType: tournament.formatType
  };

  // Fetch data based on format type
  switch (tournament.formatType) {
    case 'KNOCKOUT':
      // Fetch brackets and rounds
      result.brackets = await prisma.bracket.findMany({
        where: { tournamentId: id },
        select: {
          id: true,
          tournamentId: true,
          bracketType: true,
          matchGuarantee: true,
          ruleOverrides: true,
          placementRange: true,
          _count: {
            select: { rounds: true }
          }
        }
      });

      // Add roundCount for each bracket
      result.brackets = result.brackets.map(bracket => ({
        ...bracket,
        roundCount: bracket._count.rounds
      }));

      result.rounds = await prisma.round.findMany({
        where: { tournamentId: id },
        select: {
          id: true,
          tournamentId: true,
          bracketId: true,
          roundNumber: true,
          ruleOverrides: true,
          earlyTiebreakEnabled: true,
          _count: {
            select: { matches: true }
          }
        },
        orderBy: [
          { bracketId: 'asc' },
          { roundNumber: 'asc' }
        ]
      });

      // Add matchCount for each round
      result.rounds = result.rounds.map(round => ({
        ...round,
        matchCount: round._count.matches
      }));
      break;

    case 'GROUP':
      // Fetch groups with participants
      result.groups = await prisma.group.findMany({
        where: { tournamentId: id },
        include: {
          groupParticipants: {
            include: {
              player: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: { seedPosition: 'asc' }
          }
        },
        orderBy: { groupNumber: 'asc' }
      });

      // Transform groupParticipants to players array for frontend
      result.groups = result.groups.map(group => ({
        ...group,
        players: group.groupParticipants?.map(gp => gp.player) || []
      }));
      break;

    case 'SWISS': {
      // Fetch rounds and all registered players for standings
      result.rounds = await prisma.round.findMany({
        where: { tournamentId: id },
        select: {
          id: true,
          tournamentId: true,
          bracketId: true,
          roundNumber: true,
          ruleOverrides: true,
          earlyTiebreakEnabled: true,
          _count: {
            select: { matches: true }
          }
        },
        orderBy: { roundNumber: 'asc' }
      });

      // Add matchCount for each round
      result.rounds = result.rounds.map(round => ({
        ...round,
        matchCount: round._count.matches
      }));

      // Fetch all registered players for Swiss standings
      const registrations = await prisma.tournamentRegistration.findMany({
        where: {
          tournamentId: id,
          status: 'REGISTERED'
        },
        include: {
          player: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { registrationTimestamp: 'asc' }
      });

      result.players = registrations.map(reg => reg.player);
      break;
    }

    case 'COMBINED':
      // Fetch groups, brackets, and rounds
      result.groups = await prisma.group.findMany({
        where: { tournamentId: id },
        include: {
          groupParticipants: {
            include: {
              player: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: { seedPosition: 'asc' }
          }
        },
        orderBy: { groupNumber: 'asc' }
      });

      // Transform groupParticipants to players array for frontend
      result.groups = result.groups.map(group => ({
        ...group,
        players: group.groupParticipants?.map(gp => gp.player) || []
      }));

      result.brackets = await prisma.bracket.findMany({
        where: { tournamentId: id },
        select: {
          id: true,
          tournamentId: true,
          bracketType: true,
          matchGuarantee: true,
          ruleOverrides: true,
          placementRange: true,
          _count: {
            select: { rounds: true }
          }
        }
      });

      // Add roundCount for each bracket
      result.brackets = result.brackets.map(bracket => ({
        ...bracket,
        roundCount: bracket._count.rounds
      }));

      result.rounds = await prisma.round.findMany({
        where: { tournamentId: id },
        select: {
          id: true,
          tournamentId: true,
          bracketId: true,
          roundNumber: true,
          ruleOverrides: true,
          earlyTiebreakEnabled: true,
          _count: {
            select: { matches: true }
          }
        },
        orderBy: [
          { bracketId: 'asc' },
          { roundNumber: 'asc' }
        ]
      });

      // Add matchCount for each round
      result.rounds = result.rounds.map(round => ({
        ...round,
        matchCount: round._count.matches
      }));
      break;

    default:
      throw createHttpError(400, `Invalid format type: ${tournament.formatType}`, {
        code: 'INVALID_FORMAT_TYPE'
      });
  }

  return result;
}

/**
 * T013: Get matches for a tournament with optional filtering
 * Supports filtering by groupId, bracketId, roundId, and status
 *
 * FR-004: Display player list with format-specific information
 *
 * @param {string} tournamentId - Tournament ID
 * @param {Object} filters - Optional filters { groupId, bracketId, roundId, status }
 * @returns {Array} Matches with player details
 */
export async function getMatches(tournamentId, filters = {}) {
  // Verify tournament exists
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true }
  });

  if (!tournament) {
    throw createHttpError(404, 'Tournament not found', { code: 'TOURNAMENT_NOT_FOUND' });
  }

  const where = { tournamentId };

  // Apply filters
  if (filters.groupId) {
    where.groupId = filters.groupId;
  }

  if (filters.bracketId) {
    where.bracketId = filters.bracketId;
  }

  if (filters.roundId) {
    where.roundId = filters.roundId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  const matches = await prisma.match.findMany({
    where,
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
      }
    },
    orderBy: { matchNumber: 'asc' }
  });

  return matches;
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

  // Get current tournament before update to check for status change
  const currentTournament = await prisma.tournament.findUnique({
    where: { id },
    select: {
      status: true,
      categoryId: true,
      category: {
        select: { type: true },
      },
    },
  });

  // Update allowed fields
  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.description !== undefined) updateData.description = data.description || null;
  if (data.capacity !== undefined) updateData.capacity = data.capacity === null ? null : parseInt(data.capacity);
  if (data.startDate) updateData.startDate = new Date(data.startDate);
  if (data.endDate) updateData.endDate = new Date(data.endDate);
  if (data.status !== undefined) updateData.status = data.status;

  // Handle location update - create or find location if clubName provided
  if (data.clubName !== undefined) {
    const location = await locationService.findOrCreateLocation({
      clubName: data.clubName,
      address: data.address
    });
    updateData.locationId = location.id;
  }

  const updatedTournament = await prisma.tournament.update({
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

  // T056: Tournament close hook - recalculate seeding scores for doubles categories
  // Check if status changed to COMPLETED and category is DOUBLES
  const statusChangedToCompleted =
    currentTournament.status !== 'COMPLETED' &&
    updatedTournament.status === 'COMPLETED';

  if (statusChangedToCompleted && currentTournament.category.type === 'DOUBLES') {
    // Recalculate seeding scores for all pairs in this category
    // This runs asynchronously - we don't wait for it to complete
    const { recalculateCategorySeedingScores } = await import('./pairService.js');
    recalculateCategorySeedingScores(currentTournament.categoryId).catch((error) => {
      console.error(
        `Failed to recalculate seeding scores for category ${currentTournament.categoryId}:`,
        error
      );
    });
  }

  // Handle capacity change - manage waitlist
  if (updateData.capacity !== undefined && updateData.capacity !== currentTournament.capacity) {
    await handleCapacityChange(id, updateData.capacity, currentTournament.category.type);
  }

  return updatedTournament;
}

/**
 * Handle capacity changes by updating registration statuses
 * - If capacity reduced: Move excess registered players to waitlist (newest first)
 * - If capacity increased: Promote waitlisted players to registered (oldest first)
 */
async function handleCapacityChange(tournamentId, newCapacity, categoryType) {
  const isDoubles = categoryType === 'DOUBLES';
  const model = isDoubles ? prisma.pairRegistration : prisma.tournamentRegistration;

  // If capacity is null (unlimited), promote all waitlisted
  if (newCapacity === null) {
    await model.updateMany({
      where: {
        tournamentId,
        status: 'WAITLISTED'
      },
      data: { status: 'REGISTERED' }
    });
    return;
  }

  // Count currently registered
  const registeredCount = await model.count({
    where: {
      tournamentId,
      status: 'REGISTERED'
    }
  });

  if (registeredCount > newCapacity) {
    // Capacity reduced below current registrations - move excess to waitlist
    // We need to find the newest registrations to move to waitlist
    const excessCount = registeredCount - newCapacity;

    const registrationsToDemote = await model.findMany({
      where: {
        tournamentId,
        status: 'REGISTERED'
      },
      orderBy: { registrationTimestamp: 'desc' }, // Newest first
      take: excessCount,
      select: { id: true }
    });

    const idsToDemote = registrationsToDemote.map(r => r.id);

    if (idsToDemote.length > 0) {
      await model.updateMany({
        where: { id: { in: idsToDemote } },
        data: { status: 'WAITLISTED' }
      });
    }
  } else if (registeredCount < newCapacity) {
    // Capacity increased - promote from waitlist
    const slotsAvailable = newCapacity - registeredCount;

    const registrationsToPromote = await model.findMany({
      where: {
        tournamentId,
        status: 'WAITLISTED'
      },
      orderBy: { registrationTimestamp: 'asc' }, // Oldest first (FIFO)
      take: slotsAvailable,
      select: { id: true }
    });

    const idsToPromote = registrationsToPromote.map(r => r.id);

    if (idsToPromote.length > 0) {
      await model.updateMany({
        where: { id: { in: idsToPromote } },
        data: { status: 'REGISTERED' }
      });
    }
  }
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
/**
 * Get point preview for a tournament based on current registration count
 * @param {string} id - Tournament ID
 * @returns {Promise<Object>} Point preview data
 */
export async function getTournamentPointPreview(id) {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      category: true
    }
  });

  if (!tournament) {
    throw createHttpError(404, 'Tournament not found', { code: 'TOURNAMENT_NOT_FOUND' });
  }

  let participantCount = 0;
  if (tournament.category.type === 'DOUBLES') {
    participantCount = await prisma.pairRegistration.count({
      where: { tournamentId: id, status: 'REGISTERED' }
    });
  } else {
    participantCount = await prisma.tournamentRegistration.count({
      where: { tournamentId: id, status: 'REGISTERED' }
    });
  }

  // Determine range and table
  // If count < 2, we still show 2-4 table as preview
  const effectiveCount = Math.max(participantCount, 2);
  const range = getParticipantRange(effectiveCount);
  const pointTable = getPointTableForRange(range);

  return {
    tournamentId: id,
    participantCount,
    effectiveRange: range,
    pointTable
  };
}
