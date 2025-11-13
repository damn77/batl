// T092: Ranking Routes - Wire up ranking endpoints (read-only)
import express from 'express';
import {
  getCategoryLeaderboard,
  getPlayerRankingInCategory,
  getPlayerAllRankings
} from '../rankingController.js';
import { validateQuery, schemas } from '../../middleware/validate.js';

const router = express.Router();

/**
 * GET /api/v1/rankings/category/:categoryId
 * Get category leaderboard with top ranked players
 * Authorization: PUBLIC - No authentication required
 */
router.get(
  '/category/:categoryId',
  validateQuery(schemas.categoryLeaderboardQuery),
  getCategoryLeaderboard
);

/**
 * GET /api/v1/rankings/category/:categoryId/player/:playerId
 * Get specific player's ranking in a category
 * Authorization: PUBLIC - No authentication required
 */
router.get(
  '/category/:categoryId/player/:playerId',
  getPlayerRankingInCategory
);

/**
 * GET /api/v1/rankings/player/:playerId
 * Get player's rankings across all categories
 * Authorization: PUBLIC - No authentication required
 */
router.get(
  '/player/:playerId',
  getPlayerAllRankings
);

export default router;
