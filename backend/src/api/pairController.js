// Doubles Pair Controller
// Feature: 006-doubles-pairs

import { PrismaClient } from '@prisma/client';
import * as pairService from '../services/pairService.js';
import * as pairRankingService from '../services/pairRankingService.js';
import { canCreatePair, canManagePairs } from '../middleware/pairAuth.js';
import { PairErrorStatusCodes } from '../utils/pairErrors.js';

const prisma = new PrismaClient();

/**
 * POST /api/v1/pairs
 * Create or get existing doubles pair
 */
export async function createPair(req, res, next) {
  try {
    const { player1Id, player2Id, categoryId } = req.body;

    // Validate required fields
    if (!player1Id || !player2Id || !categoryId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'player1Id, player2Id, and categoryId are required',
        },
      });
    }

    // Check authorization
    const userProfileId = req.user?.playerId || null;
    const authResult = canCreatePair(req.user, player1Id, player2Id, userProfileId);

    if (!authResult.authorized) {
      return res.status(authResult.statusCode).json(authResult.error);
    }

    // Create or get pair
    const pair = await pairService.createOrGetPair(player1Id, player2Id, categoryId);

    // Return 201 for new pairs, 200 for existing
    const statusCode = pair.isNew ? 201 : 200;

    return res.status(statusCode).json({
      success: true,
      data: pair,
    });
  } catch (error) {
    // Handle pair-specific errors
    if (error.success === false) {
      const statusCode = PairErrorStatusCodes[error.error.code] || 500;
      return res.status(statusCode).json(error);
    }

    next(error);
  }
}

/**
 * GET /api/v1/pairs/:id
 * Get pair details by ID
 */
export async function getPair(req, res, next) {
  try {
    const { id } = req.params;
    const includeDeleted = req.query.includeDeleted === 'true';

    const pair = await pairService.getPairById(id, includeDeleted);

    if (!pair) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PAIR_NOT_FOUND',
          message: 'Pair not found',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: pair,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/pairs
 * List pairs with filtering and pagination
 */
export async function listPairs(req, res, next) {
  try {
    const {
      categoryId,
      playerId,
      includeDeleted,
      page,
      limit,
    } = req.query;

    const filters = {
      categoryId,
      playerId,
      includeDeleted: includeDeleted === 'true',
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };

    const result = await pairService.listPairs(filters);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/rankings/pairs/:categoryId
 * Get pair rankings leaderboard for a category
 * Feature: 006-doubles-pairs - User Story 2 (T044)
 */
export async function getPairRankings(req, res, next) {
  try {
    const { categoryId } = req.params;
    const { page, limit } = req.query;

    const options = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    };

    const result = await pairRankingService.getPairRankings(categoryId, options);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error.message === 'Category not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: error.message,
        },
      });
    }

    if (error.message.includes('DOUBLES type')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WRONG_CATEGORY_TYPE',
          message: error.message,
        },
      });
    }

    next(error);
  }
}

/**
 * POST /api/v1/pairs/recalculate-seeding/:categoryId
 * Manually recalculate seeding scores for all pairs in category
 * Authorization: ORGANIZER or ADMIN only
 * Feature: 006-doubles-pairs - User Story 3 (T057)
 */
export async function recalculateCategorySeeding(req, res, next) {
  try {
    const { categoryId } = req.params;

    // Check authorization
    const authResult = canManagePairs(req.user);
    if (!authResult.authorized) {
      return res.status(authResult.statusCode).json(authResult.error);
    }

    // Verify category exists and is DOUBLES type
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found',
        },
      });
    }

    if (category.type !== 'DOUBLES') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WRONG_CATEGORY_TYPE',
          message: 'Category must be DOUBLES type for seeding recalculation',
        },
      });
    }

    // Recalculate seeding scores
    const pairsUpdated = await pairService.recalculateCategorySeedingScores(categoryId);

    return res.status(200).json({
      success: true,
      data: {
        categoryId,
        categoryName: category.name,
        pairsUpdated,
        message: `Successfully recalculated seeding scores for ${pairsUpdated} pairs`,
      },
    });
  } catch (error) {
    next(error);
  }
}

export default {
  createPair,
  getPair,
  listPairs,
  getPairRankings,
  recalculateCategorySeeding,
};
