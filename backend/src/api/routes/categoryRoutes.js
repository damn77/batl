// T031-T033: Category Routes - Wire up category endpoints with auth/validation
import express from 'express';
import {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats
} from '../categoryController.js';
import { isAuthenticated } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validateBody, validateQuery, schemas } from '../../middleware/validate.js';

const router = express.Router();

/**
 * GET /api/v1/categories
 * List all categories with optional filtering
 * Authorization: PUBLIC - No authentication required
 */
router.get(
  '/',
  validateQuery(schemas.categoryListQuery),
  listCategories
);

/**
 * GET /api/v1/categories/:id
 * Get category by ID
 * Authorization: PUBLIC - No authentication required
 */
router.get(
  '/:id',
  getCategoryById
);

/**
 * GET /api/v1/categories/:id/stats
 * Get category statistics
 * Authorization: PUBLIC - No authentication required
 */
router.get(
  '/:id/stats',
  getCategoryStats
);

/**
 * POST /api/v1/categories
 * Create a new category
 * Authorization: ADMIN or ORGANIZER roles required
 */
router.post(
  '/',
  isAuthenticated,
  authorize('create', 'Category'),
  validateBody(schemas.categoryCreation),
  createCategory
);

/**
 * PATCH /api/v1/categories/:id
 * Update category description
 * Authorization: ADMIN or ORGANIZER roles required
 */
router.patch(
  '/:id',
  isAuthenticated,
  authorize('update', 'Category'),
  validateBody(schemas.categoryUpdate),
  updateCategory
);

/**
 * DELETE /api/v1/categories/:id
 * Delete category (only if no tournaments assigned)
 * Authorization: ADMIN role required
 */
router.delete(
  '/:id',
  isAuthenticated,
  authorize('delete', 'Category'),
  deleteCategory
);

export default router;
