/**
 * Group Draw Routes
 *
 * Exposes two POST endpoints for group draw management:
 *   POST /api/v1/tournaments/:id/group-draw       — generate draw
 *   POST /api/v1/tournaments/:id/group-draw/swap  — swap participants
 *
 * Both endpoints require ORGANIZER or ADMIN role.
 *
 * Feature: 27-group-formation, Plan 02
 * Requirements: GFORM-01 through GFORM-07
 */

import express from 'express';
import { generateDraw, swapParticipants } from '../groupDrawController.js';
import { validateBody } from '../../middleware/validate.js';
import { isAuthenticated } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import {
  generateGroupDrawSchema,
  swapGroupParticipantsSchema
} from '../validators/groupDrawValidator.js';

const router = express.Router();

/**
 * POST /api/v1/tournaments/:id/group-draw
 * Generate a group draw for a tournament.
 * Authorization: ORGANIZER or ADMIN (create Tournament)
 */
router.post(
  '/:id/group-draw',
  isAuthenticated,
  authorize('create', 'Tournament'),
  validateBody(generateGroupDrawSchema),
  generateDraw
);

/**
 * POST /api/v1/tournaments/:id/group-draw/swap
 * Swap two participants between groups and regenerate fixtures.
 * Authorization: ORGANIZER or ADMIN (update Tournament)
 */
router.post(
  '/:id/group-draw/swap',
  isAuthenticated,
  authorize('update', 'Tournament'),
  validateBody(swapGroupParticipantsSchema),
  swapParticipants
);

export default router;
