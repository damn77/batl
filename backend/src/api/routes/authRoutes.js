import express from 'express';
import { login, logout, checkSession, register } from '../authController.js';
import { isAuthenticated } from '../../middleware/auth.js';
import { validateBody, schemas } from '../../middleware/validate.js';
import { loginLimiter } from '../../middleware/rateLimiter.js';

const router = express.Router();

// POST /api/auth/login - Login with email and password
router.post('/login', loginLimiter, validateBody(schemas.login), login);

// POST /api/auth/logout - Logout and destroy session
router.post('/logout', isAuthenticated, logout);

// GET /api/auth/session - Check current session status
router.get('/session', isAuthenticated, checkSession);

// POST /api/auth/register - Player self-registration (public)
router.post('/register', loginLimiter, validateBody(schemas.register), register);

export default router;
