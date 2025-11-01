import express from 'express';
import {
  createPlayerHandler,
  listPlayersHandler,
  getPlayerHandler,
  updatePlayerHandler,
  checkDuplicatesHandler
} from '../playerController.js';
import { isAuthenticated } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validateBody, validateQuery, schemas } from '../../middleware/validate.js';

const router = express.Router();

// Check for duplicate profiles - ORGANIZER/ADMIN only (used before creating)
router.get(
  '/check-duplicates',
  isAuthenticated,
  authorize('manage', 'PlayerProfile'),
  checkDuplicatesHandler
);

// Create new player profile - ORGANIZER/ADMIN only
router.post(
  '/',
  isAuthenticated,
  authorize('manage', 'PlayerProfile'),
  validateBody(schemas.playerProfileCreation),
  createPlayerHandler
);

// List player profiles - PUBLIC (with limited fields) or authenticated (full fields)
router.get(
  '/',
  validateQuery(schemas.playerListQuery),
  listPlayersHandler
);

// Get specific player profile - PUBLIC (with limited fields) or authenticated (full fields)
router.get(
  '/:id',
  getPlayerHandler
);

// Update player profile - PLAYER can update own profile, ORGANIZER/ADMIN can update any
router.patch(
  '/:id',
  isAuthenticated,
  validateBody(schemas.playerProfileUpdate),
  updatePlayerHandler
);

export default router;
