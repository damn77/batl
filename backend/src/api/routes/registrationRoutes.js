// T068-T069: Registration Routes - Wire up registration endpoints with auth/validation
import express from 'express';
import {
  registerPlayer,
  checkEligibility,
  getPlayerRegistrations,
  getCategoryRegistrations,
  withdrawRegistration,
  reactivateRegistration,
  bulkRegisterPlayer,
  registerPairForTournament,
  withdrawPairRegistration,
  checkPairEligibility
} from '../registrationController.js';
import { isAuthenticated } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validateBody, validateQuery, schemas } from '../../middleware/validate.js';

const router = express.Router();

/**
 * POST /api/v1/registrations
 * Register player for a category with eligibility validation
 * Authorization: ADMIN, ORGANIZER, or PLAYER (self-registration only)
 */
router.post(
  '/',
  isAuthenticated,
  authorize('create', 'Registration'),
  validateBody(schemas.registrationCreation),
  registerPlayer
);

/**
 * POST /api/v1/registrations/check-eligibility
 * Check eligibility without creating registration
 * Authorization: All authenticated users
 */
router.post(
  '/check-eligibility',
  isAuthenticated,
  validateBody(schemas.checkEligibility),
  checkEligibility
);

/**
 * POST /api/v1/registrations/bulk
 * Bulk register player for multiple categories
 * Authorization: ADMIN, ORGANIZER, or PLAYER (self-registration only)
 */
router.post(
  '/bulk',
  isAuthenticated,
  authorize('create', 'Registration'),
  validateBody(schemas.bulkRegistration),
  bulkRegisterPlayer
);

/**
 * GET /api/v1/registrations/player/:playerId
 * Get all registrations for a specific player
 * Authorization: ADMIN/ORGANIZER can view any, PLAYER can view their own only
 */
router.get(
  '/player/:playerId',
  isAuthenticated,
  validateQuery(schemas.playerRegistrationsQuery),
  getPlayerRegistrations
);

/**
 * GET /api/v1/registrations/category/:categoryId
 * Get all registrations for a specific category
 * Authorization: All authenticated users
 */
router.get(
  '/category/:categoryId',
  isAuthenticated,
  validateQuery(schemas.categoryRegistrationsQuery),
  getCategoryRegistrations
);

/**
 * PATCH /api/v1/registrations/:id/withdraw
 * Withdraw a registration (soft delete)
 * Authorization: ADMIN/ORGANIZER can withdraw any, PLAYER can withdraw their own only
 */
router.patch(
  '/:id/withdraw',
  isAuthenticated,
  authorize('update', 'Registration'),
  withdrawRegistration
);

/**
 * PATCH /api/v1/registrations/:id/reactivate
 * Reactivate a withdrawn registration with eligibility revalidation
 * Authorization: ADMIN or ORGANIZER only
 */
router.patch(
  '/:id/reactivate',
  isAuthenticated,
  authorize('reactivate', 'Registration'),
  reactivateRegistration
);

/**
 * POST /api/v1/registrations/pair
 * Register a doubles pair for a tournament
 * Authorization: ADMIN, ORGANIZER, or PLAYER (must be in pair)
 * Feature: 006-doubles-pairs (T026)
 */
router.post(
  '/pair',
  isAuthenticated,
  registerPairForTournament
);

/**
 * POST /api/v1/registrations/pair/check
 * Check pair eligibility for tournament
 * Authorization: Not required (public)
 * Feature: 006-doubles-pairs
 */
router.post(
  '/pair/check',
  checkPairEligibility
);

/**
 * DELETE /api/v1/registrations/pair/:id
 * Withdraw pair registration
 * Authorization: ADMIN, ORGANIZER, or PLAYER (must be in pair)
 * Feature: 006-doubles-pairs (T027)
 */
router.delete(
  '/pair/:id',
  isAuthenticated,
  withdrawPairRegistration
);

export default router;
