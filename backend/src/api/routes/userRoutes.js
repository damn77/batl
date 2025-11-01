import express from 'express';
import {
  createUserHandler,
  listUsersHandler,
  getUserHandler,
  updateUserHandler,
  deleteUserHandler
} from '../userController.js';
import { isAuthenticated } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validateBody, validateQuery, schemas } from '../../middleware/validate.js';

const router = express.Router();

// All user management routes require authentication and ADMIN role
router.use(isAuthenticated);
router.use(authorize('manage', 'User'));

// Create new user (ADMIN creates organizers)
router.post(
  '/',
  validateBody(schemas.userCreation),
  createUserHandler
);

// List users with pagination and filters
router.get(
  '/',
  validateQuery(schemas.userListQuery),
  listUsersHandler
);

// Get specific user by ID
router.get(
  '/:id',
  getUserHandler
);

// Update user
router.patch(
  '/:id',
  validateBody(schemas.userUpdate),
  updateUserHandler
);

// Delete user (soft delete)
router.delete(
  '/:id',
  deleteUserHandler
);

export default router;
