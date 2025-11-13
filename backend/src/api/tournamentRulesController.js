// T024-T026: Tournament Rules Controller - HTTP handlers for tournament rules endpoints
import * as tournamentRulesService from '../services/tournamentRulesService.js';
import * as matchRulesService from '../services/matchRulesService.js';
import * as formatValidationService from '../services/formatValidationService.js';
import { FormatType, FormatTypeLabels, FormatTypeDescriptions } from '../types/formatTypes.js';
import { ScoringFormatType, ScoringFormatTypeLabels, AdvantageRule, TiebreakTrigger } from '../types/scoringTypes.js';

// T124: In-memory cache for format metadata (static data that never changes)
let formatTypesCache = null;
let scoringFormatsCache = null;

/**
 * T025: PATCH /tournaments/:id/format - Update tournament format
 * Authorization: ORGANIZER or ADMIN
 */
export async function updateTournamentFormat(req, res, next) {
  try {
    const { id } = req.params;
    const { formatType, formatConfig } = req.body;

    // T062: Basic format configuration validation (structure only)
    // Full player count validation happens at bracket generation time
    if (formatConfig) {
      // Validate required fields based on format type
      if (formatType === 'GROUPS' && !formatConfig.groupSize) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FORMAT_CONFIG',
            message: 'Group size is required for GROUPS format'
          }
        });
      }
      if (formatType === 'SWISS' && !formatConfig.rounds) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FORMAT_CONFIG',
            message: 'Number of rounds is required for SWISS format'
          }
        });
      }
      if (formatType === 'COMBINED' && (!formatConfig.groupSize || !formatConfig.advancePerGroup)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FORMAT_CONFIG',
            message: 'Group size and advance per group are required for COMBINED format'
          }
        });
      }
    }

    const tournament = await tournamentRulesService.setTournamentFormat(
      id,
      formatType,
      formatConfig
    );

    return res.status(200).json({
      success: true,
      data: tournament,
      message: 'Tournament format updated successfully'
    });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: {
          code: err.code || 'TOURNAMENT_NOT_FOUND',
          message: err.message
        }
      });
    }
    if (err.statusCode === 409) {
      return res.status(409).json({
        success: false,
        error: {
          code: err.code || 'FORMAT_CHANGE_NOT_ALLOWED',
          message: err.message,
          details: {
            matchesCount: err.matchesCount
          }
        }
      });
    }
    if (err.message && err.message.includes('Invalid format')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FORMAT_CONFIG',
          message: err.message
        }
      });
    }
    next(err);
  }
}

/**
 * T026: PATCH /tournaments/:id/default-rules - Update default scoring rules
 * Authorization: ORGANIZER or ADMIN
 */
export async function updateDefaultScoringRules(req, res, next) {
  try {
    const { id } = req.params;
    const scoringRules = req.body;

    const tournament = await tournamentRulesService.setDefaultScoringRules(
      id,
      scoringRules
    );

    return res.status(200).json({
      success: true,
      data: tournament,
      message: 'Default scoring rules updated successfully'
    });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: {
          code: err.code || 'TOURNAMENT_NOT_FOUND',
          message: err.message
        }
      });
    }
    if (err.message && err.message.includes('Invalid scoring')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SCORING_RULES',
          message: err.message
        }
      });
    }
    next(err);
  }
}

/**
 * T044: GET /matches/:id/effective-rules - Get effective rules for a match
 * Authorization: All authenticated users
 */
export async function getMatchEffectiveRules(req, res, next) {
  try {
    const { id } = req.params;

    const result = await matchRulesService.getEffectiveRulesForMatch(id);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: {
          code: err.code || 'MATCH_NOT_FOUND',
          message: err.message
        }
      });
    }
    next(err);
  }
}

/**
 * T045: GET /tournaments/:id/format - Get tournament format and rules
 * Authorization: All authenticated users
 */
export async function getTournamentFormat(req, res, next) {
  try {
    const { id } = req.params;

    const tournament = await tournamentRulesService.getTournamentFormatAndRules(id);

    return res.status(200).json({
      success: true,
      data: tournament
    });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: {
          code: err.code || 'TOURNAMENT_NOT_FOUND',
          message: err.message
        }
      });
    }
    next(err);
  }
}

/**
 * T046: GET /tournaments/:id/all-rules - Get all rule overrides
 * Authorization: All authenticated users
 */
export async function getAllRuleOverrides(req, res, next) {
  try {
    const { id } = req.params;

    const overrides = await tournamentRulesService.getAllRuleOverrides(id);

    return res.status(200).json({
      success: true,
      data: overrides
    });
  } catch (err) {
    next(err);
  }
}

/**
 * T076: PATCH /groups/:id/rules - Set group-level rule overrides
 * Authorization: ORGANIZER or ADMIN
 */
export async function setGroupRules(req, res, next) {
  try {
    const { id } = req.params;
    const ruleOverrides = req.body;

    const group = await tournamentRulesService.setGroupRuleOverrides(id, ruleOverrides);

    return res.status(200).json({
      success: true,
      data: group,
      message: 'Group rules updated successfully'
    });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: {
          code: err.code || 'GROUP_NOT_FOUND',
          message: err.message
        }
      });
    }
    if (err.message && err.message.includes('Invalid rule')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_RULE_OVERRIDE',
          message: err.message
        }
      });
    }
    next(err);
  }
}

/**
 * T077: PATCH /brackets/:id/rules - Set bracket-level rule overrides
 * Authorization: ORGANIZER or ADMIN
 */
export async function setBracketRules(req, res, next) {
  try {
    const { id } = req.params;
    const ruleOverrides = req.body;

    const bracket = await tournamentRulesService.setBracketRuleOverrides(id, ruleOverrides);

    return res.status(200).json({
      success: true,
      data: bracket,
      message: 'Bracket rules updated successfully'
    });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: {
          code: err.code || 'BRACKET_NOT_FOUND',
          message: err.message
        }
      });
    }
    if (err.message && err.message.includes('Invalid rule')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_RULE_OVERRIDE',
          message: err.message
        }
      });
    }
    next(err);
  }
}

/**
 * T078: PATCH /rounds/:id/rules - Set round-level rule overrides
 * Authorization: ORGANIZER or ADMIN
 */
export async function setRoundRules(req, res, next) {
  try {
    const { id } = req.params;
    const ruleOverrides = req.body;

    const round = await tournamentRulesService.setRoundRuleOverrides(id, ruleOverrides);

    return res.status(200).json({
      success: true,
      data: round,
      message: 'Round rules updated successfully'
    });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: {
          code: err.code || 'ROUND_NOT_FOUND',
          message: err.message
        }
      });
    }
    if (err.message && err.message.includes('Invalid rule')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_RULE_OVERRIDE',
          message: err.message
        }
      });
    }
    next(err);
  }
}

/**
 * T079: PATCH /matches/:id/rules - Set match-level rule overrides
 * Authorization: ORGANIZER or ADMIN
 */
export async function setMatchRules(req, res, next) {
  try {
    const { id } = req.params;
    const ruleOverrides = req.body;

    const match = await tournamentRulesService.setMatchRuleOverrides(id, ruleOverrides);

    return res.status(200).json({
      success: true,
      data: match,
      message: 'Match rules updated successfully'
    });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: {
          code: err.code || 'MATCH_NOT_FOUND',
          message: err.message
        }
      });
    }
    if (err.statusCode === 409) {
      return res.status(409).json({
        success: false,
        error: {
          code: err.code || 'MATCH_ALREADY_COMPLETED',
          message: err.message
        }
      });
    }
    if (err.message && err.message.includes('Invalid rule')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_RULE_OVERRIDE',
          message: err.message
        }
      });
    }
    next(err);
  }
}

/**
 * DELETE /groups/:id/rules - Remove group-level rule overrides
 * DELETE /brackets/:id/rules - Remove bracket-level rule overrides
 * DELETE /rounds/:id/rules - Remove round-level rule overrides
 * DELETE /matches/:id/rules - Remove match-level rule overrides
 * Authorization: ORGANIZER or ADMIN
 */
export async function removeRuleOverrides(req, res, next) {
  try {
    const { id } = req.params;
    const { entityType } = req.params; // from route path

    const entity = await tournamentRulesService.removeRuleOverrides(entityType, id);

    return res.status(200).json({
      success: true,
      data: entity,
      message: `${entityType} rules removed successfully`
    });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: {
          code: err.code,
          message: err.message
        }
      });
    }
    if (err.statusCode === 400) {
      return res.status(400).json({
        success: false,
        error: {
          code: err.code || 'INVALID_ENTITY_TYPE',
          message: err.message
        }
      });
    }
    next(err);
  }
}

/**
 * T061: POST /tournaments/validate-groups - Validate group division
 * Validates if current tournament registrations can be divided into groups
 */
export async function validateGroupDivision(req, res, next) {
  try {
    const { playerCount, groupSize } = req.body;

    if (!playerCount || !groupSize) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'Both playerCount and groupSize are required'
        }
      });
    }

    const validation = formatValidationService.canDivideIntoGroups(
      parseInt(playerCount),
      parseInt(groupSize)
    );

    return res.status(200).json({
      success: true,
      data: {
        valid: validation.valid,
        groups: validation.groups,
        remainder: validation.remainder,
        message: validation.message
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * T106: GET /tournaments/format-types - Get available tournament format types
 * Returns metadata about all available format types for dropdowns/selection
 * Authorization: PUBLIC (no auth required)
 * T124: Cached for performance (static data)
 */
export async function getFormatTypes(req, res, next) {
  try {
    // T124: Use cache if available
    if (!formatTypesCache) {
      formatTypesCache = Object.values(FormatType).map(type => ({
        value: type,
        label: FormatTypeLabels[type],
        description: FormatTypeDescriptions[type]
      }));
    }

    return res.status(200).json({
      success: true,
      data: {
        formatTypes: formatTypesCache
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * T107: GET /tournaments/scoring-formats - Get available scoring format types
 * Returns metadata about all available scoring formats for dropdowns/selection
 * Authorization: PUBLIC (no auth required)
 * T124: Cached for performance (static data)
 */
export async function getScoringFormats(req, res, next) {
  try {
    // T124: Use cache if available
    if (!scoringFormatsCache) {
      scoringFormatsCache = {
        scoringFormats: Object.values(ScoringFormatType).map(type => ({
          value: type,
          label: ScoringFormatTypeLabels[type]
        })),
        advantageRules: Object.values(AdvantageRule).map(rule => ({
          value: rule,
          label: rule === 'ADVANTAGE' ? 'Advantage' : 'No Advantage'
        })),
        tiebreakTriggers: Object.values(TiebreakTrigger).map(trigger => ({
          value: trigger,
          label: `At ${trigger}`
        }))
      };
    }

    return res.status(200).json({
      success: true,
      data: scoringFormatsCache
    });
  } catch (err) {
    next(err);
  }
}

export default {
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
};
