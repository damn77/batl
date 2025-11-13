// T018: Validation helpers for format configuration
import { FormatType } from '../types/formatTypes.js';
import { validateFormatConfig } from './formatConfigSchemas.js';

/**
 * Validates if N players can be divided into groups of size X and X-1
 * @param {number} totalPlayers - Total number of players
 * @param {number} desiredGroupSize - Desired group size (2-8)
 * @returns {Object} - { valid: boolean, groupsOfSize?: number, groupsOfSizeMinus1?: number, error?: string }
 */
export function canDivideIntoGroups(totalPlayers, desiredGroupSize) {
  // Validation
  if (desiredGroupSize < 2 || desiredGroupSize > 8) {
    return {
      valid: false,
      error: 'Group size must be between 2 and 8'
    };
  }

  if (totalPlayers < desiredGroupSize) {
    return {
      valid: false,
      error: `Not enough players (${totalPlayers}) for group size ${desiredGroupSize}`
    };
  }

  // Try all combinations of groups with size X and X-1
  for (let groupsOfX = 0; groupsOfX <= Math.floor(totalPlayers / desiredGroupSize); groupsOfX++) {
    const remaining = totalPlayers - (groupsOfX * desiredGroupSize);
    const groupsOfXMinus1 = remaining / (desiredGroupSize - 1);

    // Valid if we can make exact groups of X-1
    if (Number.isInteger(groupsOfXMinus1) && groupsOfXMinus1 >= 0) {
      return {
        valid: true,
        groupsOfSize: groupsOfX,
        groupsOfSizeMinus1: Math.floor(groupsOfXMinus1),
        totalGroups: groupsOfX + Math.floor(groupsOfXMinus1)
      };
    }
  }

  return {
    valid: false,
    error: `Cannot divide ${totalPlayers} players into groups of size ${desiredGroupSize} or ${desiredGroupSize - 1}`
  };
}

/**
 * Validates advancement rules for combined format
 * @param {Array} advancementRules - Array of { position, bracket } objects
 * @param {number} groupSize - Size of groups
 * @returns {Object} - { valid: boolean, error?: string }
 */
export function validateAdvancementRules(advancementRules, groupSize) {
  if (!Array.isArray(advancementRules) || advancementRules.length === 0) {
    return {
      valid: false,
      error: 'Advancement rules must be a non-empty array'
    };
  }

  // Check that positions are 1 through groupSize
  const positions = advancementRules.map(rule => rule.position);
  const uniquePositions = new Set(positions);

  if (positions.length !== uniquePositions.size) {
    return {
      valid: false,
      error: 'Each position can only appear once in advancement rules'
    };
  }

  for (const rule of advancementRules) {
    if (rule.position < 1 || rule.position > groupSize) {
      return {
        valid: false,
        error: `Position ${rule.position} is invalid (must be between 1 and ${groupSize})`
      };
    }

    if (!['MAIN', 'CONSOLATION', 'PLACEMENT', 'NONE'].includes(rule.bracket)) {
      return {
        valid: false,
        error: `Invalid bracket type: ${rule.bracket}`
      };
    }
  }

  return { valid: true };
}

/**
 * Validates match guarantee type for knockout format
 * @param {string} matchGuarantee - MATCH_1, MATCH_2, or UNTIL_PLACEMENT
 * @returns {Object} - { valid: boolean, error?: string }
 */
export function validateMatchGuarantee(matchGuarantee) {
  const validTypes = ['MATCH_1', 'MATCH_2', 'UNTIL_PLACEMENT'];

  if (!validTypes.includes(matchGuarantee)) {
    return {
      valid: false,
      error: `Invalid match guarantee type: ${matchGuarantee}`
    };
  }

  return { valid: true };
}

/**
 * Validates complete format configuration
 * @param {string} formatType - KNOCKOUT, GROUP, SWISS, or COMBINED
 * @param {Object} formatConfig - Format-specific configuration object
 * @returns {Object} - { valid: boolean, config?: Object, error?: string }
 */
export function validateCompleteFormatConfig(formatType, formatConfig) {
  try {
    // Validate using Zod schema
    const validatedConfig = validateFormatConfig(formatType, formatConfig);

    // Additional business logic validation
    if (formatType === FormatType.GROUP || formatType === FormatType.COMBINED) {
      const groupSizeValidation = canDivideIntoGroups(100, formatConfig.groupSize); // Placeholder check
      if (!groupSizeValidation.valid && groupSizeValidation.error.includes('Group size must be')) {
        return {
          valid: false,
          error: groupSizeValidation.error
        };
      }
    }

    if (formatType === FormatType.COMBINED) {
      const advancementValidation = validateAdvancementRules(
        formatConfig.advancementRules,
        formatConfig.groupSize
      );
      if (!advancementValidation.valid) {
        return {
          valid: false,
          error: advancementValidation.error
        };
      }
    }

    return {
      valid: true,
      config: validatedConfig
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

export default {
  canDivideIntoGroups,
  validateAdvancementRules,
  validateMatchGuarantee,
  validateCompleteFormatConfig
};
