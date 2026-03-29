/**
 * Group Standings Routes
 *
 * Exposes three endpoints for group standings with tiebreaker support:
 *   GET    /api/v1/tournaments/:tournamentId/groups/:groupId/standings         — public
 *   POST   /api/v1/tournaments/:tournamentId/groups/:groupId/standings/override — auth required
 *   DELETE /api/v1/tournaments/:tournamentId/groups/:groupId/standings/override — auth required
 *
 * Feature: 29-group-standings-and-tiebreakers, Plan 02
 * Requirements: GSTAND-04, GSTAND-05
 */

import express from 'express';
import { getStandings, saveOverride, deleteOverride } from '../groupStandingsController.js';
import { validateBody } from '../../middleware/validate.js';
import { isAuthenticated } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { saveOverrideSchema } from '../validators/groupStandingsValidator.js';

const router = express.Router();

/**
 * GET /api/v1/tournaments/:tournamentId/groups/:groupId/standings
 * Public endpoint — no authentication required.
 */
router.get('/:tournamentId/groups/:groupId/standings', getStandings);

/**
 * POST /api/v1/tournaments/:tournamentId/groups/:groupId/standings/override
 * Save manual tie-resolution override.
 * Authorization: ORGANIZER or ADMIN
 */
router.post(
  '/:tournamentId/groups/:groupId/standings/override',
  isAuthenticated,
  authorize('update', 'Tournament'),
  validateBody(saveOverrideSchema),
  saveOverride
);

/**
 * DELETE /api/v1/tournaments/:tournamentId/groups/:groupId/standings/override
 * Clear manual override and return recalculated standings.
 * Authorization: ORGANIZER or ADMIN
 */
router.delete(
  '/:tournamentId/groups/:groupId/standings/override',
  isAuthenticated,
  authorize('update', 'Tournament'),
  deleteOverride
);

export default router;
