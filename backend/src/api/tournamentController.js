// T038, T041-T045: Tournament Controller - HTTP handlers for tournament endpoints
import * as tournamentService from '../services/tournamentService.js';

/**
 * T042: GET /api/v1/tournaments - List all tournaments with optional filtering
 * Authorization: All authenticated users (PLAYER, ORGANIZER, ADMIN)
 */
export async function listTournaments(req, res, next) {
  try {
    // Get validated query parameters from middleware
    const filters = req.validatedQuery || {};

    const result = await tournamentService.listTournaments(filters);

    return res.status(200).json({
      success: true,
      data: {
        tournaments: result.tournaments.map(t => ({
          id: t.id,
          name: t.name,
          categoryId: t.categoryId,
          description: t.description,
          location: t.location,
          startDate: t.startDate,
          endDate: t.endDate,
          status: t.status,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          category: {
            id: t.category.id,
            name: t.category.name,
            type: t.category.type,
            ageGroup: t.category.ageGroup,
            gender: t.category.gender
          }
        })),
        pagination: result.pagination
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * T043: GET /api/v1/tournaments/:id - Get tournament by ID
 * Authorization: All authenticated users (PLAYER, ORGANIZER, ADMIN)
 */
export async function getTournamentById(req, res, next) {
  try {
    const { id } = req.params;

    const tournament = await tournamentService.getTournamentById(id);

    return res.status(200).json({
      success: true,
      data: {
        id: tournament.id,
        name: tournament.name,
        categoryId: tournament.categoryId,
        description: tournament.description,
        location: tournament.location,
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
    const tournament = await tournamentService.createTournament(req.body);

    return res.status(201).json({
      success: true,
      data: {
        id: tournament.id,
        name: tournament.name,
        categoryId: tournament.categoryId,
        description: tournament.description,
        location: tournament.location,
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
        location: tournament.location,
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
