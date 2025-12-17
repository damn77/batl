// T046-T047: Tournament Routes - Wire up tournament endpoints with auth/validation
// T014: Add new routes for format-structure and matches endpoints
import express from 'express';
import {
  listTournaments,
  getTournamentById,
  createTournament,
  updateTournament,
  deleteTournament,
  getFormatStructure,
  getMatches,
  getTournamentPointPreview
} from '../tournamentController.js';
import { isAuthenticated } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validateBody, validateQuery, schemas } from '../../middleware/validate.js';

const router = express.Router();

/**
 * GET /api/v1/tournaments
 * List all tournaments with optional filtering
 * Authorization: PUBLIC - No authentication required
 */
router.get(
  '/',
  validateQuery(schemas.tournamentListQuery),
  listTournaments
);

/**
 * GET /api/v1/tournaments/:id
 * Get tournament by ID with category details
 * Authorization: PUBLIC - No authentication required
 */
router.get(
  '/:id',
  getTournamentById
);

/**
 * T014: GET /api/v1/tournaments/:id/format-structure
 * Get tournament format structure (groups/brackets/rounds)
 * Authorization: PUBLIC - No authentication required
 */
router.get(
  '/:id/format-structure',
  getFormatStructure
);

/**
 * T014: GET /api/v1/tournaments/:id/matches
 * Get tournament matches with optional filters
 * Authorization: PUBLIC - No authentication required
 * Query params: groupId, bracketId, roundId, status
 */
router.get(
  '/:id/matches',
  getMatches
);

/**
 * T061: GET /api/v1/tournaments/:id/point-preview
 * Get point table preview for tournament
 * Authorization: PUBLIC - No authentication required
 */
router.get(
  '/:id/point-preview',
  getTournamentPointPreview
);

/**
 * POST /api/v1/tournaments
 * Create a new tournament assigned to a category
 * Authorization: ADMIN or ORGANIZER roles required (T047)
 */
router.post(
  '/',
  isAuthenticated,
  authorize('create', 'Tournament'),
  validateBody(schemas.tournamentCreation),
  createTournament
);

/**
 * PATCH /api/v1/tournaments/:id
 * Update tournament details (categoryId is immutable per FR-006)
 * Authorization: ADMIN or ORGANIZER roles required (T047)
 */
router.patch(
  '/:id',
  isAuthenticated,
  authorize('update', 'Tournament'),
  validateBody(schemas.tournamentUpdate),
  updateTournament
);

/**
 * DELETE /api/v1/tournaments/:id
 * Delete tournament (only if status is SCHEDULED)
 * Authorization: ADMIN role required (T047)
 */
router.delete(
  '/:id',
  isAuthenticated,
  authorize('delete', 'Tournament'),
  deleteTournament
);

// ============================================
// TOURNAMENT POINT CONFIGURATION (008-tournament-rankings)
// ============================================

/**
 * T021: GET /api/v1/tournaments/:id/point-config
 * Get tournament point configuration
 * Authorization: PUBLIC - No authentication required
 */
router.get(
  '/:id/point-config',
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      const config = await prisma.tournamentPointConfig.findUnique({
        where: { tournamentId: id }
      });

      if (!config) {
        // Return default configuration if none exists
        return res.json({
          tournamentId: id,
          calculationMethod: 'PLACEMENT',
          multiplicativeValue: 2,
          doublePointsEnabled: false,
          isDefault: true
        });
      }

      res.json(config);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * T020: PUT /api/v1/tournaments/:id/point-config
 * Update tournament point configuration
 * Authorization: ADMIN or ORGANIZER roles required
 * Validation: Cannot change after tournament starts (T022)
 */
router.put(
  '/:id/point-config',
  isAuthenticated,
  authorize('update', 'Tournament'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const { validateTournamentPointConfig } = await import('../validators/tournamentPointValidators.js');

      // Validate input
      const validatedData = validateTournamentPointConfig(req.body);

      // T022: Check if tournament has started
      const tournament = await prisma.tournament.findUnique({
        where: { id },
        select: { status: true }
      });

      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      if (tournament.status !== 'SCHEDULED') {
        return res.status(400).json({
          error: 'Cannot modify point configuration after tournament has started',
          code: 'TOURNAMENT_ALREADY_STARTED'
        });
      }

      // Create or update point configuration
      const config = await prisma.tournamentPointConfig.upsert({
        where: { tournamentId: id },
        update: validatedData,
        create: {
          tournamentId: id,
          ...validatedData
        }
      });

      res.json(config);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * T019: POST /api/v1/tournaments/:id/calculate-points
 * Calculate and award points for tournament participants
 * Authorization: ADMIN or ORGANIZER roles required
 * Body: { results: [{playerId/pairId, placement?, finalRoundReached?}] }
 */
router.post(
  '/:id/calculate-points',
  isAuthenticated,
  authorize('update', 'Tournament'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { results } = req.body;
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const { awardPointsSinglesTournament, awardPointsDoublesTournament } = await import('../../services/pointCalculationService.js');

      if (!results || !Array.isArray(results) || results.length === 0) {
        return res.status(400).json({
          error: 'Results array is required and must not be empty'
        });
      }

      // Get tournament with category and point config
      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
          category: true,
          pointConfig: true
        }
      });

      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      // Use point config or defaults
      const pointConfig = tournament.pointConfig || {
        calculationMethod: 'PLACEMENT',
        multiplicativeValue: 2,
        doublePointsEnabled: false
      };

      let awardedResults;

      // Award points based on tournament type
      if (tournament.category.type === 'SINGLES') {
        awardedResults = await awardPointsSinglesTournament(id, results, pointConfig);
      } else {
        awardedResults = await awardPointsDoublesTournament(id, results, pointConfig);
      }

      res.json({
        message: 'Points calculated and awarded successfully',
        tournamentId: id,
        resultsCount: awardedResults.length,
        calculationMethod: pointConfig.calculationMethod
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
