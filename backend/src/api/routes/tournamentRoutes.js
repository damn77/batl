// T046-T047: Tournament Routes - Wire up tournament endpoints with auth/validation
import express from 'express';
import {
  listTournaments,
  getTournamentById,
  createTournament,
  updateTournament,
  deleteTournament
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

export default router;
