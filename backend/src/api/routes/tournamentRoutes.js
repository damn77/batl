// T046-T047: Tournament Routes - Wire up tournament endpoints with auth/validation
// T014: Add new routes for format-structure and matches endpoints
// Phase 01.1: Bracket generation and seeding persistence routes
import express from 'express';
import {
  listTournaments,
  getTournamentById,
  createTournament,
  updateTournament,
  deleteTournament,
  getFormatStructure,
  getMatches,
  getTournamentPointPreview,
  startTournament,
  copyTournament
} from '../tournamentController.js';
import { isAuthenticated } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validateBody, validateQuery, schemas } from '../../middleware/validate.js';
import {
  closeTournamentRegistration,
  generateTournamentBracket,
  swapBracketSlots,
  assignBracketPosition
} from '../bracketPersistenceController.js';
import { recordConsolationOptOut } from '../consolationOptOutController.js';
import {
  generateBracketSchema,
  swapSlotsSchema,
  assignPositionSchema
} from '../validators/bracketPersistenceValidator.js';
import { copyTournamentSchema } from '../validators/tournamentCopyValidator.js';

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
 * POST /api/v1/tournaments/:id/copy
 * Copy a tournament — creates a new SCHEDULED tournament with source config pre-filled.
 * Authorization: ADMIN or ORGANIZER roles required
 * Phase 14: Tournament Copy
 * Note: Registered BEFORE the generic /:id routes to avoid path shadowing
 */
router.post(
  '/:id/copy',
  isAuthenticated,
  authorize('create', 'Tournament'),
  validateBody(copyTournamentSchema),
  copyTournament
);

/**
 * PATCH /api/v1/tournaments/:id/start
 * Start a tournament — transitions SCHEDULED → IN_PROGRESS, closes registration
 * Authorization: ADMIN or ORGANIZER roles required (LIFE-01, LIFE-02)
 * Note: Registered BEFORE the generic /:id route to avoid path shadowing
 */
router.patch(
  '/:id/start',
  isAuthenticated,
  authorize('update', 'Tournament'),
  startTournament
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
          success: true,
          data: {
            tournamentId: id,
            calculationMethod: 'PLACEMENT',
            multiplicativeValue: 2,
            doublePointsEnabled: false,
            isDefault: true
          }
        });
      }

      res.json({ success: true, data: config });
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
        return res.status(404).json({ success: false, error: { code: 'TOURNAMENT_NOT_FOUND', message: 'Tournament not found' } });
      }

      if (tournament.status !== 'SCHEDULED') {
        return res.status(400).json({
          success: false,
          error: { code: 'TOURNAMENT_ALREADY_STARTED', message: 'Cannot modify point configuration after tournament has started' }
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

      res.json({ success: true, data: config });
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
      const { awardPointsSinglesTournament, awardPointsDoublesTournament, deriveConsolationResults } = await import('../../services/pointCalculationService.js');

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

      // For MATCH_2 tournaments using FINAL_ROUND method, automatically derive and
      // include consolation bracket results (server-side, appended after validation)
      const formatConfig = typeof tournament.formatConfig === 'string'
        ? JSON.parse(tournament.formatConfig)
        : tournament.formatConfig;
      const isMatch2 = formatConfig?.matchGuarantee === 'MATCH_2';

      let allResults = results;
      if (isMatch2 && pointConfig.calculationMethod === 'FINAL_ROUND') {
        const consolationResults = await deriveConsolationResults(id);
        allResults = [...results, ...consolationResults];
      }

      let awardedResults;

      // Award points based on tournament type
      if (tournament.category.type === 'SINGLES') {
        awardedResults = await awardPointsSinglesTournament(id, allResults, pointConfig);
      } else {
        awardedResults = await awardPointsDoublesTournament(id, allResults, pointConfig);
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

// ============================================
// PHASE 01.1: BRACKET GENERATION AND SEEDING PERSISTENCE
// ============================================

/**
 * PATCH /api/v1/tournaments/:id/close-registration
 * Close registration for a tournament (prerequisite for generate draw)
 * Authorization: ORGANIZER or ADMIN
 */
router.patch(
  '/:id/close-registration',
  isAuthenticated,
  authorize('update', 'Tournament'),
  closeTournamentRegistration
);

/**
 * POST /api/v1/tournaments/:id/bracket
 * Generate and persist the tournament bracket draw
 * Authorization: ORGANIZER or ADMIN
 */
router.post(
  '/:id/bracket',
  isAuthenticated,
  authorize('update', 'Tournament'),
  validateBody(generateBracketSchema),
  generateTournamentBracket
);

/**
 * PATCH /api/v1/tournaments/:id/bracket/slots
 * Batch swap player slots in the generated bracket
 * Authorization: ORGANIZER or ADMIN
 */
router.patch(
  '/:id/bracket/slots',
  isAuthenticated,
  authorize('update', 'Tournament'),
  validateBody(swapSlotsSchema),
  swapBracketSlots
);

/**
 * PUT /api/v1/tournaments/:id/bracket/positions
 * Assign or clear a player/pair position in the bracket
 * Authorization: ORGANIZER or ADMIN
 * Phase 12: Manual Draw API
 */
router.put(
  '/:id/bracket/positions',
  isAuthenticated,
  authorize('update', 'Tournament'),
  validateBody(assignPositionSchema),
  assignBracketPosition
);

// ============================================
// PHASE 05: CONSOLATION BRACKET LIFECYCLE
// ============================================

/**
 * POST /api/v1/tournaments/:id/consolation-opt-out
 * Record a consolation opt-out for a player or pair.
 * Authorization: PLAYER (self-service) or ORGANIZER/ADMIN
 * Body: { playerId: string } | { pairId: string }
 *
 * Note: Authorization is handled inside the controller/service —
 * players can opt out themselves; organizers can opt out anyone.
 * The isAuthenticated middleware ensures the submitter is logged in.
 */
router.post(
  '/:id/consolation-opt-out',
  isAuthenticated,
  recordConsolationOptOut
);

export default router;
