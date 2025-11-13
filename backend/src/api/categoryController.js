// T024-T030: Category Controller - HTTP handlers for category endpoints
import * as categoryService from '../services/categoryService.js';
import { checkEligibility } from '../services/registrationService.js';

/**
 * T025: GET /api/v1/categories - List all categories with optional filtering
 * Authorization: All authenticated users (PLAYER, ORGANIZER, ADMIN)
 * Query params: playerId (optional) - if provided, includes eligibility info for that player
 */
export async function listCategories(req, res, next) {
  try {
    // Get validated query parameters from middleware
    const filters = req.validatedQuery || {};
    const { playerId } = req.query;

    const result = await categoryService.listCategories(filters);

    // If playerId is provided, check eligibility for each category
    let playerProfile = null;
    if (playerId) {
      try {
        const { findPlayerById } = await import('../services/playerService.js');
        playerProfile = await findPlayerById(playerId);
      } catch (err) {
        console.error('Failed to load player profile:', err);
      }
    }

    const categoriesWithEligibility = await Promise.all(
      result.categories.map(async (cat) => {
        const categoryData = {
          id: cat.id,
          type: cat.type,
          ageGroup: cat.ageGroup,
          gender: cat.gender,
          name: cat.name,
          description: cat.description,
          createdAt: cat.createdAt,
          updatedAt: cat.updatedAt,
          _counts: {
            tournaments: cat._count.tournaments,
            registrations: cat._count.registrations,
            rankings: cat._count.rankings
          }
        };

        // Add eligibility info if player profile is available
        if (playerProfile) {
          try {
            const eligibility = await checkEligibility(playerId, cat.id);
            categoryData.eligibility = eligibility;
          } catch {
            categoryData.eligibility = { eligible: false, validations: [] };
          }
        }

        return categoryData;
      })
    );

    return res.status(200).json({
      success: true,
      data: {
        categories: categoriesWithEligibility,
        pagination: result.pagination
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * T026: GET /api/v1/categories/:id - Get category by ID
 * Authorization: All authenticated users (PLAYER, ORGANIZER, ADMIN)
 */
export async function getCategoryById(req, res, next) {
  try {
    const { id } = req.params;

    const category = await categoryService.getCategoryById(id);

    return res.status(200).json({
      success: true,
      data: {
        id: category.id,
        type: category.type,
        ageGroup: category.ageGroup,
        gender: category.gender,
        name: category.name,
        description: category.description,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        _counts: {
          tournaments: category._count.tournaments,
          registrations: category._count.registrations,
          rankings: category._count.rankings
        }
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
 * T027: POST /api/v1/categories - Create a new category
 * Authorization: ADMIN or ORGANIZER roles required
 */
export async function createCategory(req, res, next) {
  try {
    // Request body already validated by middleware
    const category = await categoryService.createCategory(req.body);

    return res.status(201).json({
      success: true,
      data: {
        id: category.id,
        type: category.type,
        ageGroup: category.ageGroup,
        gender: category.gender,
        name: category.name,
        description: category.description,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
      },
      message: 'Category created successfully'
    });
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({
        success: false,
        error: {
          code: err.code || 'DUPLICATE_CATEGORY',
          message: err.message,
          details: {
            existingCategoryId: err.existingCategoryId
          }
        }
      });
    }
    next(err);
  }
}

/**
 * T028: PATCH /api/v1/categories/:id - Update category description
 * Authorization: ADMIN or ORGANIZER roles required
 * Note: type, ageGroup, gender are immutable (business rule)
 */
export async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;

    // Request body already validated by middleware
    const category = await categoryService.updateCategory(id, req.body);

    return res.status(200).json({
      success: true,
      data: {
        id: category.id,
        type: category.type,
        ageGroup: category.ageGroup,
        gender: category.gender,
        name: category.name,
        description: category.description,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
      },
      message: 'Category updated successfully'
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
 * T029: DELETE /api/v1/categories/:id - Delete category
 * Authorization: ADMIN role required
 * Note: Can only delete if no tournaments or registrations exist
 */
export async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;

    await categoryService.deleteCategory(id);

    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
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
    if (err.statusCode === 409) {
      return res.status(409).json({
        success: false,
        error: {
          code: err.code || 'CATEGORY_IN_USE',
          message: err.message,
          details: {
            tournamentCount: err.tournamentCount,
            registrationCount: err.registrationCount
          }
        }
      });
    }
    next(err);
  }
}

/**
 * T030: GET /api/v1/categories/:id/stats - Get category statistics
 * Authorization: All authenticated users (PLAYER, ORGANIZER, ADMIN)
 */
export async function getCategoryStats(req, res, next) {
  try {
    const { id } = req.params;

    const stats = await categoryService.getCategoryStats(id);

    return res.status(200).json({
      success: true,
      data: stats
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
