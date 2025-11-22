// Doubles Pair Routes
// Feature: 006-doubles-pairs

import express from 'express';
import * as pairController from '../pairController.js';
import { isAuthenticated } from '../../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/v1/pairs
 * Create or get existing doubles pair
 * Auth: Required (PLAYER must be in pair, ORGANIZER/ADMIN can create any pair)
 */
router.post('/', isAuthenticated, pairController.createPair);

/**
 * POST /api/v1/pairs/recalculate-seeding/:categoryId
 * Manually recalculate seeding scores for category
 * Auth: Required (ORGANIZER/ADMIN only)
 * Feature: 006-doubles-pairs - User Story 3
 */
router.post('/recalculate-seeding/:categoryId', isAuthenticated, pairController.recalculateCategorySeeding);

/**
 * GET /api/v1/pairs/:id/history
 * Get tournament history for a pair
 * Auth: Not required (public)
 * Feature: 006-doubles-pairs - Phase 7 (T078)
 */
router.get('/:id/history', pairController.getPairHistory);

/**
 * GET /api/v1/pairs/:id
 * Get pair details by ID
 * Auth: Not required (public)
 */
router.get('/:id', pairController.getPair);

/**
 * GET /api/v1/pairs
 * List pairs with filtering
 * Auth: Not required (public)
 */
router.get('/', pairController.listPairs);

export default router;
