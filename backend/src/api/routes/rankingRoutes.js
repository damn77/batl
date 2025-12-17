// Ranking Routes - Tournament Ranking System
import express from 'express';
import {
  getAllRankings,
  getRankingsForCategory,
  getRankingEntryBreakdown,
  executeYearRollover,
  getArchivedRankings,
  deleteArchivedRanking,
  recalculateRankings
} from '../rankingController.js';
import { isAuthenticated, authorize } from '../../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/v1/rankings
 * Get all rankings summary
 * Authorization: PUBLIC
 */
router.get('/', getAllRankings);

/**
 * GET /api/v1/rankings/:categoryId
 * Get rankings for a category
 * Authorization: PUBLIC
 */
router.get('/:categoryId', getRankingsForCategory);

/**
 * GET /api/v1/rankings/:categoryId/type/:type
 * Get rankings for a category filtered by type (SINGLES, PAIR, MEN, WOMEN)
 * Authorization: PUBLIC
 */
router.get('/:categoryId/type/:type', getRankingsForCategory);

/**
 * GET /api/v1/rankings/:categoryId/entries/:entryId/breakdown
 * Get ranking entry details with tournament breakdown
 * Authorization: PUBLIC
 */
router.get('/:categoryId/entries/:entryId/breakdown', getRankingEntryBreakdown);

/**
 * POST /api/v1/rankings/admin/year-rollover
 * Execute year rollover (archive old, create new)
 * Authorization: ADMIN
 */
router.post('/admin/year-rollover', isAuthenticated, authorize('ADMIN'), executeYearRollover);

/**
 * GET /api/v1/rankings/:categoryId/archived/:year
 * Get archived rankings for a specific year
 * Authorization: PUBLIC
 */
router.get('/:categoryId/archived/:year', getArchivedRankings);

/**
 * DELETE /api/v1/rankings/:categoryId/archive/:year
 * Delete archived rankings
 * Authorization: ADMIN
 */
router.delete('/:categoryId/archive/:year', isAuthenticated, authorize('ADMIN'), deleteArchivedRanking);

/**
 * POST /api/v1/rankings/:categoryId/recalculate
 * Force recalculation of rankings
 * Authorization: ADMIN
 */
router.post('/:categoryId/recalculate', isAuthenticated, authorize('ADMIN'), recalculateRankings);

export default router;
