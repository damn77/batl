// T057-T060: Format validation service for tournament format configurations
import createHttpError from 'http-errors';

/**
 * T058: Validate if a given number of players can be evenly divided into groups
 * @param {number} playerCount - Total number of registered players
 * @param {number} groupSize - Desired size of each group
 * @returns {Object} Validation result { valid: boolean, groups: number, remainder: number, message: string }
 */
export function canDivideIntoGroups(playerCount, groupSize) {
  if (!playerCount || !groupSize) {
    return {
      valid: false,
      groups: 0,
      remainder: 0,
      message: 'Player count and group size are required'
    };
  }

  if (playerCount < groupSize) {
    return {
      valid: false,
      groups: 0,
      remainder: playerCount,
      message: `Not enough players (${playerCount}) to form even one group of size ${groupSize}`
    };
  }

  const groups = Math.floor(playerCount / groupSize);
  const remainder = playerCount % groupSize;

  if (remainder === 0) {
    return {
      valid: true,
      groups,
      remainder: 0,
      message: `${playerCount} players can be divided into ${groups} groups of ${groupSize} players`
    };
  }

  return {
    valid: false,
    groups,
    remainder,
    message: `${playerCount} players cannot be evenly divided into groups of ${groupSize}. Would create ${groups} groups with ${remainder} player(s) remaining`
  };
}

/**
 * T059: Validate advancement rules for combined format tournaments
 * @param {Object} formatConfig - Format configuration object
 * @param {number} playerCount - Total number of registered players
 * @returns {Object} Validation result { valid: boolean, message: string, knockoutPlayers: number }
 */
export function validateAdvancementRules(formatConfig, playerCount) {
  const { formatType, groupSize, advancePerGroup } = formatConfig;

  if (formatType !== 'COMBINED') {
    return {
      valid: true,
      message: 'Advancement rules only apply to COMBINED format',
      knockoutPlayers: 0
    };
  }

  if (!groupSize || !advancePerGroup) {
    return {
      valid: false,
      message: 'Group size and advance per group are required for COMBINED format',
      knockoutPlayers: 0
    };
  }

  // Validate group size
  const groupValidation = canDivideIntoGroups(playerCount, groupSize);
  if (!groupValidation.valid) {
    return {
      valid: false,
      message: groupValidation.message,
      knockoutPlayers: 0
    };
  }

  // Validate advancement count
  if (advancePerGroup >= groupSize) {
    return {
      valid: false,
      message: `Cannot advance ${advancePerGroup} players from a group of ${groupSize}. Advance count must be less than group size.`,
      knockoutPlayers: 0
    };
  }

  if (advancePerGroup < 1) {
    return {
      valid: false,
      message: 'At least 1 player must advance from each group',
      knockoutPlayers: 0
    };
  }

  const totalGroups = groupValidation.groups;
  const knockoutPlayers = totalGroups * advancePerGroup;

  // Validate that knockout players is a power of 2 (for single-elimination knockout)
  const isPowerOfTwo = (n) => n > 0 && (n & (n - 1)) === 0;

  if (!isPowerOfTwo(knockoutPlayers)) {
    return {
      valid: false,
      message: `Advancement rules result in ${knockoutPlayers} players for knockout stage, which is not a power of 2 (required for single-elimination). Adjust group size or advance count.`,
      knockoutPlayers
    };
  }

  return {
    valid: true,
    message: `${playerCount} players → ${totalGroups} groups of ${groupSize} → ${knockoutPlayers} players advance to knockout`,
    knockoutPlayers
  };
}

/**
 * T060: Validate match guarantee configuration for knockout tournaments
 * @param {string} matchGuarantee - Match guarantee level (MATCH_1, MATCH_2, MATCH_3)
 * @param {number} playerCount - Total number of registered players
 * @returns {Object} Validation result { valid: boolean, message: string, totalRounds: number }
 */
export function validateMatchGuarantee(matchGuarantee, playerCount) {
  const validGuarantees = ['MATCH_1', 'MATCH_2', 'MATCH_3'];

  if (!validGuarantees.includes(matchGuarantee)) {
    return {
      valid: false,
      message: `Invalid match guarantee: ${matchGuarantee}. Must be one of: ${validGuarantees.join(', ')}`,
      totalRounds: 0
    };
  }

  if (!playerCount || playerCount < 2) {
    return {
      valid: false,
      message: 'At least 2 players are required for a knockout tournament',
      totalRounds: 0
    };
  }

  // Extract guarantee number
  const guaranteeNum = parseInt(matchGuarantee.split('_')[1]);

  // Calculate rounds needed for single elimination
  const singleElimRounds = Math.ceil(Math.log2(playerCount));

  // For match guarantees > 1, we need additional rounds/brackets
  let totalRounds;
  let message;

  switch (matchGuarantee) {
    case 'MATCH_1':
      // Single elimination only
      totalRounds = singleElimRounds;
      message = `Single elimination with ${playerCount} players requires ${totalRounds} rounds`;
      break;

    case 'MATCH_2':
      // Double elimination (winners + losers brackets)
      totalRounds = singleElimRounds * 2;
      message = `Double elimination (2 match guarantee) with ${playerCount} players requires approximately ${totalRounds} total rounds`;
      break;

    case 'MATCH_3':
      // Triple elimination (requires more complex bracket structure)
      totalRounds = singleElimRounds * 3;
      message = `Triple elimination (3 match guarantee) with ${playerCount} players requires approximately ${totalRounds} total rounds`;
      break;

    default:
      return {
        valid: false,
        message: 'Unknown match guarantee type',
        totalRounds: 0
      };
  }

  return {
    valid: true,
    message,
    totalRounds
  };
}

/**
 * Validate complete format configuration
 * @param {Object} formatConfig - Complete format configuration
 * @param {number} playerCount - Total number of registered players
 * @returns {Object} Validation result with details
 */
export function validateFormatConfig(formatConfig, playerCount = 0) {
  const { formatType } = formatConfig;

  switch (formatType) {
    case 'KNOCKOUT': {
      const { matchGuarantee = 'MATCH_1' } = formatConfig;
      return validateMatchGuarantee(matchGuarantee, playerCount);
    }

    case 'GROUPS': {
      const { groupSize } = formatConfig;
      if (!groupSize) {
        return {
          valid: false,
          message: 'Group size is required for GROUPS format'
        };
      }
      return canDivideIntoGroups(playerCount, groupSize);
    }

    case 'SWISS': {
      // Swiss format has fewer constraints
      const { rounds } = formatConfig;
      if (!rounds || rounds < 1) {
        return {
          valid: false,
          message: 'Number of rounds is required for SWISS format (minimum 1)'
        };
      }
      return {
        valid: true,
        message: `Swiss tournament with ${rounds} rounds`
      };
    }

    case 'COMBINED': {
      return validateAdvancementRules(formatConfig, playerCount);
    }

    default:
      return {
        valid: false,
        message: `Unknown format type: ${formatType}`
      };
  }
}

export default {
  canDivideIntoGroups,
  validateAdvancementRules,
  validateMatchGuarantee,
  validateFormatConfig
};
