// T027-T028: Validation middleware for tournament rules
import { FormatType, isValidFormatType } from '../types/formatTypes.js';
import { ScoringFormatType, isValidScoringFormatType } from '../types/scoringTypes.js';

/**
 * T027: Validate format configuration in request body
 */
export function validateFormatConfig(req, res, next) {
  const { formatType, formatConfig } = req.body;

  // Validate formatType
  if (!formatType || !isValidFormatType(formatType)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FORMAT_TYPE',
        message: `Invalid format type. Must be one of: ${Object.values(FormatType).join(', ')}`
      }
    });
  }

  // Validate formatConfig exists
  if (!formatConfig || typeof formatConfig !== 'object') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_FORMAT_CONFIG',
        message: 'Format configuration is required'
      }
    });
  }

  // Validate formatConfig.formatType matches top-level formatType
  if (formatConfig.formatType !== formatType) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'FORMAT_TYPE_MISMATCH',
        message: 'formatConfig.formatType must match top-level formatType'
      }
    });
  }

  // Format-specific validation
  switch (formatType) {
    case FormatType.KNOCKOUT:
      if (!formatConfig.matchGuarantee) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_MATCH_GUARANTEE',
            message: 'matchGuarantee is required for knockout format'
          }
        });
      }
      break;

    case FormatType.GROUP:
    case FormatType.COMBINED:
      if (!formatConfig.groupSize || formatConfig.groupSize < 2 || formatConfig.groupSize > 8) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_GROUP_SIZE',
            message: 'groupSize must be between 2 and 8'
          }
        });
      }
      break;

    case FormatType.SWISS:
      if (!formatConfig.rounds || formatConfig.rounds < 3) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ROUNDS',
            message: 'rounds must be at least 3 for swiss format'
          }
        });
      }
      break;
  }

  next();
}

/**
 * T028: Validate scoring rules in request body
 */
export function validateScoringRules(req, res, next) {
  const scoringRules = req.body;

  // Validate formatType
  if (!scoringRules.formatType || !isValidScoringFormatType(scoringRules.formatType)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_SCORING_FORMAT',
        message: `Invalid scoring format type. Must be one of: ${Object.values(ScoringFormatType).join(', ')}`
      }
    });
  }

  // Format-specific validation
  switch (scoringRules.formatType) {
    case ScoringFormatType.SETS:
      if (!scoringRules.winningSets || ![1, 2].includes(scoringRules.winningSets)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_WINNING_SETS',
            message: 'winningSets must be 1 or 2'
          }
        });
      }
      if (!scoringRules.advantageRule) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_ADVANTAGE_RULE',
            message: 'advantageRule is required for sets format'
          }
        });
      }
      if (!scoringRules.tiebreakTrigger) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_TIEBREAK_TRIGGER',
            message: 'tiebreakTrigger is required for sets format'
          }
        });
      }
      break;

    case ScoringFormatType.STANDARD_TIEBREAK:
      if (!scoringRules.winningTiebreaks || ![1, 2, 3].includes(scoringRules.winningTiebreaks)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_WINNING_TIEBREAKS',
            message: 'winningTiebreaks must be 1, 2, or 3 for standard tiebreak'
          }
        });
      }
      break;

    case ScoringFormatType.BIG_TIEBREAK:
      if (!scoringRules.winningTiebreaks || ![1, 2].includes(scoringRules.winningTiebreaks)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_WINNING_TIEBREAKS',
            message: 'winningTiebreaks must be 1 or 2 for big tiebreak'
          }
        });
      }
      break;

    case ScoringFormatType.MIXED:
      if (!scoringRules.winningSets || ![1, 2].includes(scoringRules.winningSets)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_WINNING_SETS',
            message: 'winningSets must be 1 or 2'
          }
        });
      }
      if (!scoringRules.finalSetTiebreak || !['STANDARD', 'BIG'].includes(scoringRules.finalSetTiebreak)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FINAL_SET_TIEBREAK',
            message: 'finalSetTiebreak must be STANDARD or BIG'
          }
        });
      }
      break;
  }

  next();
}

export default {
  validateFormatConfig,
  validateScoringRules
};
