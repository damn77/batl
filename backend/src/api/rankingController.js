// T089-T091: Ranking Controller - HTTP handlers for ranking endpoints
import * as rankingService from '../services/rankingService.js';

/**
 * T089: GET /api/v1/rankings/category/:categoryId - Get category leaderboard
 * Authorization: All authenticated users
 */
export async function getCategoryLeaderboard(req, res, next) {
  try {
    const { categoryId } = req.params;
    const { limit, offset } = req.validatedQuery || {};

    const result = await rankingService.getCategoryLeaderboard(categoryId, {
      limit: limit || 10,
      offset: offset || 0
    });

    return res.status(200).json({
      success: true,
      data: {
        categoryId: result.categoryId,
        categoryName: result.categoryName,
        lastUpdated: result.lastUpdated,
        rankings: result.rankings,
        total: result.total
      }
    });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: {
          code: err.code || 'CATEGORY_NOT_FOUND',
          message: err.message
        }
      });
    }
    next(err);
  }
}

/**
 * T090: GET /api/v1/rankings/category/:categoryId/player/:playerId
 * Get player's ranking in specific category
 * Authorization: All authenticated users
 */
export async function getPlayerRankingInCategory(req, res, next) {
  try {
    const { categoryId, playerId } = req.params;

    const result = await rankingService.getPlayerRankingInCategory(categoryId, playerId);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    // T095: Handle NOT_RANKED error
    if (err.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: {
          code: err.code || 'NOT_FOUND',
          message: err.message
        }
      });
    }
    next(err);
  }
}

/**
 * T091: GET /api/v1/rankings/player/:playerId - Get player's all rankings
 * Authorization: All authenticated users
 */
export async function getPlayerAllRankings(req, res, next) {
  try {
    const { playerId } = req.params;

    const result = await rankingService.getPlayerAllRankings(playerId);

    return res.status(200).json({
      success: true,
      data: {
        playerId: result.playerId,
        playerName: result.playerName,
        rankings: result.rankings,
        lastUpdated: result.lastUpdated
      }
    });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: {
          code: err.code || 'PLAYER_NOT_FOUND',
          message: err.message
        }
      });
    }
    next(err);
  }
}
