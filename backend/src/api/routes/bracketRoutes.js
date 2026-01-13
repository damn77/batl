// Feature 009: Bracket Generation Routes
import express from 'express';
import { getBracketStructure, getSeedingConfiguration } from '../bracketController.js';
import { validateParams } from '../../middleware/validate.js';
import { playerCountParamSchema } from '../validators/bracketValidator.js';

const router = express.Router();

/**
 * GET /api/v1/brackets/structure/:playerCount
 * Get bracket structure for a given player count
 * User Story: P1 - Retrieve Bracket Structure
 * Authorization: PUBLIC - No authentication required
 */
router.get(
  '/structure/:playerCount',
  validateParams(playerCountParamSchema),
  getBracketStructure
);

/**
 * GET /api/v1/brackets/seeding/:playerCount
 * Get seeding configuration for a given player count
 * User Story: P2 - Determine Seeding Requirements
 * Authorization: PUBLIC - No authentication required
 */
router.get(
  '/seeding/:playerCount',
  validateParams(playerCountParamSchema),
  getSeedingConfiguration
);

export default router;
