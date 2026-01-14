/**
 * Feature 010: Seeding Placement Routes
 * Endpoints for tournament bracket generation with seeding placement
 */

import express from 'express';
import { generateBracket } from '../seedingController.js';

const router = express.Router();

/**
 * POST /api/v1/seeding/generate-bracket
 * Generate a seeded tournament bracket
 * Authorization: ORGANIZER or ADMIN role required
 */
router.post('/generate-bracket', generateBracket);

export default router;
