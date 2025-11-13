// T029: Tournament Rules Routes - API endpoints for tournament rules management
import express from 'express';
import {
  updateTournamentFormat,
  updateDefaultScoringRules,
  getMatchEffectiveRules,
  getTournamentFormat,
  getAllRuleOverrides,
  setGroupRules,
  setBracketRules,
  setRoundRules,
  setMatchRules,
  removeRuleOverrides,
  validateGroupDivision,
  getFormatTypes,
  getScoringFormats
} from '../tournamentRulesController.js';
import { isAuthenticated } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validateFormatConfig, validateScoringRules } from '../../middleware/validateRules.js';
import { ruleModificationLimiter } from '../../middleware/rateLimiter.js'; // T125

const tournamentRulesRouter = express.Router();
const matchRulesRouter = express.Router();

// Tournament Rules Routes (mounted at /api/v1/tournament-rules)

/**
 * T106: GET /api/v1/tournament-rules/format-types
 * Get available tournament format types
 * Authorization: PUBLIC (no auth required)
 */
tournamentRulesRouter.get('/format-types', getFormatTypes);

/**
 * T107: GET /api/v1/tournament-rules/scoring-formats
 * Get available scoring format types
 * Authorization: PUBLIC (no auth required)
 */
tournamentRulesRouter.get('/scoring-formats', getScoringFormats);

/**
 * PATCH /api/v1/tournament-rules/:id/format
 * Update tournament format type and configuration
 * Authorization: ORGANIZER or ADMIN (via CASL 'update' on 'Tournament')
 * T125: Rate limited to prevent abuse
 */
tournamentRulesRouter.patch(
  '/:id/format',
  ruleModificationLimiter,
  isAuthenticated,
  authorize('update', 'Tournament'),
  validateFormatConfig,
  updateTournamentFormat
);

/**
 * PATCH /api/v1/tournament-rules/:id/default-rules
 * Update default scoring rules for tournament
 * Authorization: ORGANIZER or ADMIN (via CASL 'update' on 'Tournament')
 * T125: Rate limited to prevent abuse
 */
tournamentRulesRouter.patch(
  '/:id/default-rules',
  ruleModificationLimiter,
  isAuthenticated,
  authorize('update', 'Tournament'),
  validateScoringRules,
  updateDefaultScoringRules
);

/**
 * GET /api/v1/tournament-rules/:id/format
 * Get tournament format and rules
 * Authorization: All authenticated users
 */
tournamentRulesRouter.get(
  '/:id/format',
  isAuthenticated,
  getTournamentFormat
);

/**
 * GET /api/v1/tournament-rules/:id/all-rules
 * Get all rule overrides at all levels
 * Authorization: All authenticated users
 */
tournamentRulesRouter.get(
  '/:id/all-rules',
  isAuthenticated,
  getAllRuleOverrides
);

/**
 * T061: POST /api/v1/tournament-rules/validate-groups
 * Validate if players can be evenly divided into groups
 * Authorization: All authenticated users
 */
tournamentRulesRouter.post(
  '/validate-groups',
  isAuthenticated,
  validateGroupDivision
);

// Match Rules Routes (mounted at /api/v1/match-rules)

/**
 * GET /api/v1/match-rules/:id/effective-rules
 * Get effective rules for a specific match (with cascade resolution)
 * Authorization: All authenticated users
 */
matchRulesRouter.get(
  '/:id/effective-rules',
  isAuthenticated,
  getMatchEffectiveRules
);

// T076-T080: Rule Override Routes
// Separate routers for each entity type

const groupRulesRouter = express.Router();
const bracketRulesRouter = express.Router();
const roundRulesRouter = express.Router();
const matchOverridesRouter = express.Router();

/**
 * PATCH /api/v1/groups/:id/rules
 * Set rule overrides for a specific group
 * Authorization: ORGANIZER or ADMIN (via CASL 'update' on 'Tournament')
 * T125: Rate limited to prevent abuse
 */
groupRulesRouter.patch(
  '/:id/rules',
  ruleModificationLimiter,
  isAuthenticated,
  authorize('update', 'Tournament'),
  validateScoringRules,
  setGroupRules
);

/**
 * DELETE /api/v1/groups/:id/rules
 * Remove rule overrides for a specific group
 * Authorization: ORGANIZER or ADMIN (via CASL 'update' on 'Tournament')
 */
groupRulesRouter.delete(
  '/:id/rules',
  isAuthenticated,
  authorize('update', 'Tournament'),
  (req, res, next) => {
    req.params.entityType = 'group';
    removeRuleOverrides(req, res, next);
  }
);

/**
 * PATCH /api/v1/brackets/:id/rules
 * Set rule overrides for a specific bracket
 * Authorization: ORGANIZER or ADMIN (via CASL 'update' on 'Tournament')
 * T125: Rate limited to prevent abuse
 */
bracketRulesRouter.patch(
  '/:id/rules',
  ruleModificationLimiter,
  isAuthenticated,
  authorize('update', 'Tournament'),
  validateScoringRules,
  setBracketRules
);

/**
 * DELETE /api/v1/brackets/:id/rules
 * Remove rule overrides for a specific bracket
 * Authorization: ORGANIZER or ADMIN (via CASL 'update' on 'Tournament')
 */
bracketRulesRouter.delete(
  '/:id/rules',
  isAuthenticated,
  authorize('update', 'Tournament'),
  (req, res, next) => {
    req.params.entityType = 'bracket';
    removeRuleOverrides(req, res, next);
  }
);

/**
 * PATCH /api/v1/rounds/:id/rules
 * Set rule overrides for a specific round
 * Authorization: ORGANIZER or ADMIN (via CASL 'update' on 'Tournament')
 * T125: Rate limited to prevent abuse
 */
roundRulesRouter.patch(
  '/:id/rules',
  ruleModificationLimiter,
  isAuthenticated,
  authorize('update', 'Tournament'),
  validateScoringRules,
  setRoundRules
);

/**
 * DELETE /api/v1/rounds/:id/rules
 * Remove rule overrides for a specific round
 * Authorization: ORGANIZER or ADMIN (via CASL 'update' on 'Tournament')
 */
roundRulesRouter.delete(
  '/:id/rules',
  isAuthenticated,
  authorize('update', 'Tournament'),
  (req, res, next) => {
    req.params.entityType = 'round';
    removeRuleOverrides(req, res, next);
  }
);

/**
 * PATCH /api/v1/matches/:id/rules
 * Set rule overrides for a specific match
 * Authorization: ORGANIZER or ADMIN (via CASL 'update' on 'Tournament')
 * T125: Rate limited to prevent abuse
 */
matchOverridesRouter.patch(
  '/:id/rules',
  ruleModificationLimiter,
  isAuthenticated,
  authorize('update', 'Tournament'),
  validateScoringRules,
  setMatchRules
);

/**
 * DELETE /api/v1/matches/:id/rules
 * Remove rule overrides for a specific match
 * Authorization: ORGANIZER or ADMIN (via CASL 'update' on 'Tournament')
 */
matchOverridesRouter.delete(
  '/:id/rules',
  isAuthenticated,
  authorize('update', 'Tournament'),
  (req, res, next) => {
    req.params.entityType = 'match';
    removeRuleOverrides(req, res, next);
  }
);

export {
  tournamentRulesRouter,
  matchRulesRouter,
  groupRulesRouter,
  bracketRulesRouter,
  roundRulesRouter,
  matchOverridesRouter
};
export default tournamentRulesRouter;