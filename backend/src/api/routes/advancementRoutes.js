/**
 * Advancement Routes
 *
 * Exposes three endpoints for group-to-knockout advancement in COMBINED format tournaments:
 *   GET    /api/v1/tournaments/:id/advancement/preview  — compute waterfall preview (read-only)
 *   POST   /api/v1/tournaments/:id/advancement           — confirm and generate brackets
 *   DELETE /api/v1/tournaments/:id/advancement           — revert advancement
 *
 * All endpoints require ORGANIZER or ADMIN role (isAuthenticated + authorize('update', 'Tournament')).
 *
 * Feature: 30-combined-format-advancement, Plan 02
 * Requirements: COMB-01, COMB-07, ADV-03, ADV-04
 */

import { Router } from 'express';
import { isAuthenticated } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import {
  previewAdvancement,
  handleConfirmAdvancement,
  handleRevertAdvancement
} from '../advancementController.js';

const router = Router();

/**
 * GET /api/v1/tournaments/:id/advancement/preview
 * Compute waterfall advancement preview — read-only, no state change.
 * Authorization: ORGANIZER or ADMIN
 */
router.get(
  '/:id/advancement/preview',
  isAuthenticated,
  authorize('update', 'Tournament'),
  previewAdvancement
);

/**
 * POST /api/v1/tournaments/:id/advancement
 * Confirm advancement: generate main and secondary knockout brackets atomically.
 * Returns 201 on success.
 * Authorization: ORGANIZER or ADMIN
 */
router.post(
  '/:id/advancement',
  isAuthenticated,
  authorize('update', 'Tournament'),
  handleConfirmAdvancement
);

/**
 * DELETE /api/v1/tournaments/:id/advancement
 * Revert advancement: delete generated brackets and unlock group phase.
 * Authorization: ORGANIZER or ADMIN
 */
router.delete(
  '/:id/advancement',
  isAuthenticated,
  authorize('update', 'Tournament'),
  handleRevertAdvancement
);

export default router;
