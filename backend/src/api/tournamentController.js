// T038, T041-T045: Tournament Controller - HTTP handlers for tournament endpoints
// T010-T011: New endpoints for tournament view feature
import * as tournamentService from '../services/tournamentService.js';

/**
 * T042: GET /api/v1/tournaments - List all tournaments with optional filtering
 * Authorization: All authenticated users (PLAYER, ORGANIZER, ADMIN)
 */
export async function listTournaments(req, res, next) {
  try {
    // Get validated query parameters from middleware
    const filters = req.validatedQuery || {};

    // Pass user ID if authenticated (for including registration status)
    const userId = req.user?.id || null;

    const result = await tournamentService.listTournaments(filters, userId);

    return res.status(200).json({
      success: true,
      data: {
        tournaments: result.tournaments.map(t => {
          const tournamentData = {
            id: t.id,
            name: t.name,
            categoryId: t.categoryId,
            description: t.description,
            capacity: t.capacity,
            registeredCount: t.registeredCount || 0,
            waitlistedCount: t.waitlistedCount || 0,
            // Legacy fields for backward compatibility (derived from location)
            clubName: t.location?.clubName || null,
            address: t.location?.address || null,
            // New relational fields
            location: t.location ? {
              id: t.location.id,
              clubName: t.location.clubName,
              address: t.location.address
            } : null,
            organizer: t.organizer ? {
              id: t.organizer.id,
              name: t.organizer.name,
              email: t.organizer.email,
              phone: t.organizer.phone
            } : null,
            startDate: t.startDate,
            endDate: t.endDate,
            status: t.status,
            formatType: t.formatType,
            formatConfig: t.formatConfig,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            category: {
              id: t.category.id,
              name: t.category.name,
              type: t.category.type,
              ageGroup: t.category.ageGroup,
              gender: t.category.gender
            }
          };

          // Include user's registration status if available
          if (t.myRegistration) {
            tournamentData.myRegistration = t.myRegistration;
          }

          return tournamentData;
        }),
        pagination: result.pagination
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * T009, T043: GET /api/v1/tournaments/:id - Get tournament by ID
 * Authorization: PUBLIC - No authentication required
 * Enhanced to include registrationCount, waitlistCount, and ruleComplexity
 */
export async function getTournamentById(req, res, next) {
  try {
    const { id } = req.params;

    const tournament = await tournamentService.getTournamentWithRelatedData(id);

    return res.status(200).json({
      success: true,
      data: {
        id: tournament.id,
        name: tournament.name,
        categoryId: tournament.categoryId,
        description: tournament.description,
        capacity: tournament.capacity,
        // Legacy fields for backward compatibility (derived from location)
        clubName: tournament.location?.clubName || null,
        address: tournament.location?.address || null,
        // New relational fields
        location: tournament.location ? {
          id: tournament.location.id,
          clubName: tournament.location.clubName,
          address: tournament.location.address
        } : null,
        backupLocation: tournament.backupLocation ? {
          id: tournament.backupLocation.id,
          clubName: tournament.backupLocation.clubName,
          address: tournament.backupLocation.address
        } : null,
        organizer: tournament.organizer ? {
          id: tournament.organizer.id,
          name: tournament.organizer.name,
          email: tournament.organizer.email,
          phone: tournament.organizer.phone
        } : null,
        deputyOrganizer: tournament.deputyOrganizer ? {
          id: tournament.deputyOrganizer.id,
          name: tournament.deputyOrganizer.name,
          email: tournament.deputyOrganizer.email,
          phone: tournament.deputyOrganizer.phone
        } : null,
        courts: tournament.courts,
        entryFee: tournament.entryFee,
        rulesUrl: tournament.rulesUrl,
        prizeDescription: tournament.prizeDescription,
        registrationOpenDate: tournament.registrationOpenDate,
        registrationCloseDate: tournament.registrationCloseDate,
        minParticipants: tournament.minParticipants,
        waitlistDisplayOrder: tournament.waitlistDisplayOrder,
        formatType: tournament.formatType,
        formatConfig: tournament.formatConfig,
        defaultScoringRules: tournament.defaultScoringRules,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        status: tournament.status,
        lastStatusChange: tournament.lastStatusChange,
        createdAt: tournament.createdAt,
        updatedAt: tournament.updatedAt,
        category: {
          id: tournament.category.id,
          name: tournament.category.name,
          type: tournament.category.type,
          ageGroup: tournament.category.ageGroup,
          gender: tournament.category.gender
        },
        // T008: Computed fields
        registrationCount: tournament.registrationCount,
        waitlistCount: tournament.waitlistCount,
        ruleComplexity: tournament.ruleComplexity
      }
    });
  } catch (err) {
    // T049: Handle tournament not found errors
    if (err.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: {
          code: err.code || 'TOURNAMENT_NOT_FOUND',
          message: err.message
        }
      });
    }
    next(err);
  }
}

/**
 * T041: POST /api/v1/tournaments - Create a new tournament
 * Authorization: ADMIN or ORGANIZER roles required
 * T049: Handle invalid categoryId errors
 */
export async function createTournament(req, res, next) {
  try {
    // Request body already validated by middleware
    // Pass current user's ID to create organizer record
    const tournament = await tournamentService.createTournament(req.body, req.user.id);

    return res.status(201).json({
      success: true,
      data: {
        id: tournament.id,
        name: tournament.name,
        categoryId: tournament.categoryId,
        description: tournament.description,
        capacity: tournament.capacity,
        // Legacy fields for backward compatibility (derived from location)
        clubName: tournament.location?.clubName || null,
        address: tournament.location?.address || null,
        // New relational fields
        location: tournament.location ? {
          id: tournament.location.id,
          clubName: tournament.location.clubName,
          address: tournament.location.address
        } : null,
        organizer: tournament.organizer ? {
          id: tournament.organizer.id,
          name: tournament.organizer.name,
          email: tournament.organizer.email,
          phone: tournament.organizer.phone
        } : null,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        status: tournament.status,
        createdAt: tournament.createdAt,
        updatedAt: tournament.updatedAt,
        category: {
          id: tournament.category.id,
          name: tournament.category.name,
          type: tournament.category.type,
          ageGroup: tournament.category.ageGroup,
          gender: tournament.category.gender
        }
      },
      message: 'Tournament created successfully'
    });
  } catch (err) {
    // T049: Handle category not found
    if (err.statusCode === 404 && err.code === 'CATEGORY_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: err.message,
          field: 'categoryId'
        }
      });
    }
    // Handle validation errors
    if (err.statusCode === 400) {
      return res.status(400).json({
        success: false,
        error: {
          code: err.code || 'VALIDATION_ERROR',
          message: err.message
        }
      });
    }
    next(err);
  }
}

/**
 * T044: PATCH /api/v1/tournaments/:id - Update tournament
 * Authorization: ADMIN or ORGANIZER roles required
 * Note: categoryId can be changed if all registered players are eligible for new category
 */
export async function updateTournament(req, res, next) {
  try {
    const { id } = req.params;

    // Request body already validated by middleware
    const tournament = await tournamentService.updateTournament(id, req.body);

    return res.status(200).json({
      success: true,
      data: {
        id: tournament.id,
        name: tournament.name,
        categoryId: tournament.categoryId,
        description: tournament.description,
        capacity: tournament.capacity,
        // Legacy fields for backward compatibility (derived from location)
        clubName: tournament.location?.clubName || null,
        address: tournament.location?.address || null,
        // New relational fields
        location: tournament.location ? {
          id: tournament.location.id,
          clubName: tournament.location.clubName,
          address: tournament.location.address
        } : null,
        backupLocation: tournament.backupLocation ? {
          id: tournament.backupLocation.id,
          clubName: tournament.backupLocation.clubName,
          address: tournament.backupLocation.address
        } : null,
        organizer: tournament.organizer ? {
          id: tournament.organizer.id,
          name: tournament.organizer.name,
          email: tournament.organizer.email,
          phone: tournament.organizer.phone
        } : null,
        deputyOrganizer: tournament.deputyOrganizer ? {
          id: tournament.deputyOrganizer.id,
          name: tournament.deputyOrganizer.name,
          email: tournament.deputyOrganizer.email,
          phone: tournament.deputyOrganizer.phone
        } : null,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        status: tournament.status,
        createdAt: tournament.createdAt,
        updatedAt: tournament.updatedAt,
        category: {
          id: tournament.category.id,
          name: tournament.category.name,
          type: tournament.category.type,
          ageGroup: tournament.category.ageGroup,
          gender: tournament.category.gender
        }
      },
      message: 'Tournament updated successfully'
    });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: {
          code: err.code || 'TOURNAMENT_NOT_FOUND',
          message: err.message
        }
      });
    }
    if (err.statusCode === 400) {
      const errorResponse = {
        success: false,
        error: {
          code: err.code || 'VALIDATION_ERROR',
          message: err.message
        }
      };

      // Include ineligible players list if category change failed
      if (err.code === 'PLAYERS_INELIGIBLE_FOR_NEW_CATEGORY' && err.ineligiblePlayers) {
        errorResponse.error.details = {
          ineligiblePlayers: err.ineligiblePlayers
        };
      }

      return res.status(400).json(errorResponse);
    }
    next(err);
  }
}

/**
 * T045: DELETE /api/v1/tournaments/:id - Delete tournament
 * Authorization: ADMIN role required
 * T050: Can only delete if status is SCHEDULED
 */
export async function deleteTournament(req, res, next) {
  try {
    const { id } = req.params;

    await tournamentService.deleteTournament(id);

    return res.status(200).json({
      success: true,
      message: 'Tournament deleted successfully'
    });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: {
          code: err.code || 'TOURNAMENT_NOT_FOUND',
          message: err.message
        }
      });
    }
    // T050: Handle tournament status conflicts
    if (err.statusCode === 409) {
      return res.status(409).json({
        success: false,
        error: {
          code: err.code || 'TOURNAMENT_STARTED',
          message: err.message,
          currentStatus: err.currentStatus
        }
      });
    }
    next(err);
  }
}

/**
 * T010: GET /api/v1/tournaments/:id/format-structure - Get tournament format structure
 * Authorization: PUBLIC - No authentication required
 * Returns groups/brackets/rounds based on tournament format type
 */
export async function getFormatStructure(req, res, next) {
  try {
    const { id } = req.params;

    const structure = await tournamentService.getFormatStructure(id);

    return res.status(200).json({
      success: true,
      data: structure
    });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: {
          code: err.code || 'TOURNAMENT_NOT_FOUND',
          message: err.message
        }
      });
    }
    if (err.statusCode === 400) {
      return res.status(400).json({
        success: false,
        error: {
          code: err.code || 'INVALID_FORMAT_TYPE',
          message: err.message
        }
      });
    }
    next(err);
  }
}

/**
 * T011: GET /api/v1/tournaments/:id/matches - Get tournament matches with filters
 * Authorization: PUBLIC - No authentication required
 * Supports query filters: groupId, bracketId, roundId, status
 */
export async function getMatches(req, res, next) {
  try {
    const { id } = req.params;

    // Extract query parameters for filtering
    const filters = {};
    if (req.query.groupId) filters.groupId = req.query.groupId;
    if (req.query.bracketId) filters.bracketId = req.query.bracketId;
    if (req.query.roundId) filters.roundId = req.query.roundId;
    if (req.query.status) filters.status = req.query.status;

    const matches = await tournamentService.getMatches(id, filters);

    return res.status(200).json({
      success: true,
      data: {
        matches
      }
    });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: {
          code: err.code || 'TOURNAMENT_NOT_FOUND',
          message: err.message
        }
      });
    }
    next(err);
  }
}
