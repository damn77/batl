/**
 * Match Routes
 *
 * Express router for match-specific endpoints.
 * Mounted at /api/v1/matches in index.js.
 *
 * Feature: 01-match-result-submission (Plan 01)
 *
 * Routes:
 *   PATCH /:id/result — Submit or override a match result
 */

import express from 'express';
import Joi from 'joi';
import { submitMatchResult } from '../matchController.js';
import { isAuthenticated } from '../../middleware/auth.js';
import { validateBody, validateParams, validateQuery, schemas } from '../../middleware/validate.js';
import { submitResultSchema, submitSpecialOutcomeSchema } from '../validators/matchValidator.js';

const router = express.Router();

/**
 * Combined body schema: accepts either a regular result or a special outcome.
 * Joi alternatives() tries each schema in order; the first that validates wins.
 * The controller enforces role-based access after this structural validation.
 */
const resultBodySchema = Joi.alternatives()
  .try(submitResultSchema, submitSpecialOutcomeSchema)
  .required();

/**
 * Route parameter schema — :id must be a valid UUID.
 */
const matchParamsSchema = Joi.object({
  id: schemas.uuid
});

/**
 * Query schema for the result endpoint — dryRun is optional, must be 'true' or 'false' string.
 * BB-04: dryRun=true returns impact summary without modifying data.
 */
const resultQuerySchema = Joi.object({
  dryRun: Joi.string().valid('true', 'false').optional()
});

/**
 * PATCH /api/v1/matches/:id/result
 *
 * Middleware chain:
 *   1. isAuthenticated — 401 if not logged in
 *   2. validateParams  — 400 if :id is not a valid UUID
 *   3. validateQuery   — 400 if dryRun query param is not 'true' or 'false'
 *   4. validateBody    — 400 if body doesn't match either result schema
 *   5. submitMatchResult — business logic and DB write
 */
router.patch(
  '/:id/result',
  isAuthenticated,
  validateParams(matchParamsSchema),
  validateQuery(resultQuerySchema),
  validateBody(resultBodySchema),
  submitMatchResult
);

export default router;
