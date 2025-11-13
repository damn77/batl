// T019-T023: Tournament Rules Service - Format and rule management
import { PrismaClient } from '@prisma/client';
import createHttpError from 'http-errors';
import { validateFormatConfig } from '../validation/formatConfigSchemas.js';
import { validateScoringRules } from '../validation/scoringRulesSchemas.js';
import { FormatType } from '../types/formatTypes.js';

const prisma = new PrismaClient();

/**
 * T019: Set tournament format type and format-specific configuration
 * @param {string} tournamentId - Tournament ID
 * @param {string} formatType - KNOCKOUT, GROUP, SWISS, or COMBINED
 * @param {Object} formatConfig - Format-specific configuration
 * @returns {Promise<Object>} Updated tournament
 */
export async function setTournamentFormat(tournamentId, formatType, formatConfig) {
  // Verify tournament exists
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      matches: {
        where: {
          status: { in: ['COMPLETED', 'IN_PROGRESS'] }
        }
      }
    }
  });

  if (!tournament) {
    throw createHttpError(404, 'Tournament not found', {
      code: 'TOURNAMENT_NOT_FOUND'
    });
  }

  // T021: Validate format config
  const validatedConfig = validateFormatConfig(formatType, formatConfig);

  // Prevent format changes if matches are already completed or in progress
  if (tournament.matches.length > 0) {
    throw createHttpError(409, 'Cannot change format type after matches have started or completed', {
      code: 'FORMAT_CHANGE_NOT_ALLOWED',
      matchesCount: tournament.matches.length
    });
  }

  // Update tournament format
  const updated = await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      formatType,
      formatConfig: JSON.stringify(validatedConfig)
    }
  });

  return {
    ...updated,
    formatConfig: JSON.parse(updated.formatConfig)
  };
}

/**
 * T023: Set default scoring rules for tournament
 * @param {string} tournamentId - Tournament ID
 * @param {Object} scoringRules - Scoring rules configuration
 * @returns {Promise<Object>} Updated tournament
 */
export async function setDefaultScoringRules(tournamentId, scoringRules) {
  // Verify tournament exists
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId }
  });

  if (!tournament) {
    throw createHttpError(404, 'Tournament not found', {
      code: 'TOURNAMENT_NOT_FOUND'
    });
  }

  // T022: Validate scoring rules
  const validatedRules = validateScoringRules(scoringRules);

  // Update tournament default scoring rules
  const updated = await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      defaultScoringRules: JSON.stringify(validatedRules)
    }
  });

  return {
    ...updated,
    formatConfig: JSON.parse(updated.formatConfig),
    defaultScoringRules: JSON.parse(updated.defaultScoringRules)
  };
}

/**
 * T042: Get tournament format and rules
 * @param {string} tournamentId - Tournament ID
 * @returns {Promise<Object>} Tournament with format and rules
 */
export async function getTournamentFormatAndRules(tournamentId) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId }
  });

  if (!tournament) {
    throw createHttpError(404, 'Tournament not found', {
      code: 'TOURNAMENT_NOT_FOUND'
    });
  }

  // Get registration statistics
  const [registeredCount, waitlistedCount] = await Promise.all([
    prisma.tournamentRegistration.count({
      where: { tournamentId, status: 'REGISTERED' }
    }),
    prisma.tournamentRegistration.count({
      where: { tournamentId, status: 'WAITLISTED' }
    })
  ]);

  return {
    id: tournament.id,
    name: tournament.name,
    formatType: tournament.formatType,
    formatConfig: JSON.parse(tournament.formatConfig),
    defaultScoringRules: JSON.parse(tournament.defaultScoringRules),
    capacity: tournament.capacity,
    registeredCount,
    waitlistedCount
  };
}

/**
 * T043: Get all rule overrides for a tournament (group, bracket, round, match levels)
 * @param {string} tournamentId - Tournament ID
 * @returns {Promise<Object>} All rule overrides at all levels
 */
export async function getAllRuleOverrides(tournamentId) {
  const [groups, brackets, rounds, matches] = await Promise.all([
    prisma.group.findMany({
      where: { tournamentId, ruleOverrides: { not: null } },
      select: { id: true, groupNumber: true, ruleOverrides: true }
    }),
    prisma.bracket.findMany({
      where: { tournamentId, ruleOverrides: { not: null } },
      select: { id: true, bracketType: true, ruleOverrides: true }
    }),
    prisma.round.findMany({
      where: { tournamentId, ruleOverrides: { not: null } },
      select: { id: true, roundNumber: true, bracketId: true, ruleOverrides: true }
    }),
    prisma.match.findMany({
      where: { tournamentId, ruleOverrides: { not: null } },
      select: { id: true, matchNumber: true, ruleOverrides: true }
    })
  ]);

  return {
    groups: groups.map(g => ({ ...g, ruleOverrides: JSON.parse(g.ruleOverrides) })),
    brackets: brackets.map(b => ({ ...b, ruleOverrides: JSON.parse(b.ruleOverrides) })),
    rounds: rounds.map(r => ({ ...r, ruleOverrides: JSON.parse(r.ruleOverrides) })),
    matches: matches.map(m => ({ ...m, ruleOverrides: JSON.parse(m.ruleOverrides) }))
  };
}

/**
 * T071: Set scoring rule overrides for a specific group
 * @param {string} groupId - Group ID
 * @param {Object} ruleOverrides - Partial scoring rules to override
 * @returns {Promise<Object>} Updated group
 */
export async function setGroupRuleOverrides(groupId, ruleOverrides) {
  // Verify group exists
  const group = await prisma.group.findUnique({
    where: { id: groupId }
  });

  if (!group) {
    throw createHttpError(404, 'Group not found', {
      code: 'GROUP_NOT_FOUND'
    });
  }

  // Validate override rules (partial validation)
  const { validateScoringRulesOverride } = await import('../validation/scoringRulesSchemas.js');
  const validatedRules = validateScoringRulesOverride(ruleOverrides);

  // Update group with rule overrides
  const updated = await prisma.group.update({
    where: { id: groupId },
    data: {
      ruleOverrides: JSON.stringify(validatedRules)
    }
  });

  return {
    ...updated,
    ruleOverrides: JSON.parse(updated.ruleOverrides)
  };
}

/**
 * T072: Set scoring rule overrides for a specific bracket
 * @param {string} bracketId - Bracket ID
 * @param {Object} ruleOverrides - Partial scoring rules to override
 * @returns {Promise<Object>} Updated bracket
 */
export async function setBracketRuleOverrides(bracketId, ruleOverrides) {
  // Verify bracket exists
  const bracket = await prisma.bracket.findUnique({
    where: { id: bracketId }
  });

  if (!bracket) {
    throw createHttpError(404, 'Bracket not found', {
      code: 'BRACKET_NOT_FOUND'
    });
  }

  // Validate override rules
  const { validateScoringRulesOverride } = await import('../validation/scoringRulesSchemas.js');
  const validatedRules = validateScoringRulesOverride(ruleOverrides);

  // Update bracket with rule overrides
  const updated = await prisma.bracket.update({
    where: { id: bracketId },
    data: {
      ruleOverrides: JSON.stringify(validatedRules)
    }
  });

  return {
    ...updated,
    ruleOverrides: JSON.parse(updated.ruleOverrides)
  };
}

/**
 * T073: Set scoring rule overrides for a specific round
 * @param {string} roundId - Round ID
 * @param {Object} ruleOverrides - Partial scoring rules to override
 * @returns {Promise<Object>} Updated round
 */
export async function setRoundRuleOverrides(roundId, ruleOverrides) {
  // Verify round exists
  const round = await prisma.round.findUnique({
    where: { id: roundId }
  });

  if (!round) {
    throw createHttpError(404, 'Round not found', {
      code: 'ROUND_NOT_FOUND'
    });
  }

  // Validate override rules
  const { validateScoringRulesOverride } = await import('../validation/scoringRulesSchemas.js');
  const validatedRules = validateScoringRulesOverride(ruleOverrides);

  // Update round with rule overrides
  const updated = await prisma.round.update({
    where: { id: roundId },
    data: {
      ruleOverrides: JSON.stringify(validatedRules)
    }
  });

  return {
    ...updated,
    ruleOverrides: JSON.parse(updated.ruleOverrides)
  };
}

/**
 * T100: Set early tiebreak flag for "until placement" rounds
 * When enabled, losing teams in consolation/placement rounds are immediately placed
 * @param {string} roundId - Round ID
 * @param {boolean} earlyTiebreakEnabled - Enable/disable early tiebreak
 * @returns {Promise<Object>} Updated round
 */
export async function setRoundEarlyTiebreak(roundId, earlyTiebreakEnabled) {
  // Verify round exists
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      bracket: {
        select: {
          bracketType: true
        }
      }
    }
  });

  if (!round) {
    throw createHttpError(404, 'Round not found', {
      code: 'ROUND_NOT_FOUND'
    });
  }

  // Early tiebreak only makes sense for consolation/placement brackets
  const validBracketTypes = ['CONSOLATION', 'PLACEMENT'];
  if (round.bracket && !validBracketTypes.includes(round.bracket.bracketType)) {
    throw createHttpError(400, 'Early tiebreak only applicable to consolation or placement brackets', {
      code: 'INVALID_BRACKET_TYPE_FOR_EARLY_TIEBREAK',
      bracketType: round.bracket.bracketType
    });
  }

  // Get existing overrides or create new object
  const existingOverrides = round.ruleOverrides ? JSON.parse(round.ruleOverrides) : {};

  // Set earlyTiebreakEnabled property
  const updatedOverrides = {
    ...existingOverrides,
    earlyTiebreakEnabled
  };

  // Update round
  const updated = await prisma.round.update({
    where: { id: roundId },
    data: {
      ruleOverrides: JSON.stringify(updatedOverrides)
    }
  });

  return {
    ...updated,
    ruleOverrides: JSON.parse(updated.ruleOverrides)
  };
}

/**
 * T074: Set scoring rule overrides for a specific match
 * @param {string} matchId - Match ID
 * @param {Object} ruleOverrides - Partial scoring rules to override
 * @returns {Promise<Object>} Updated match
 */
export async function setMatchRuleOverrides(matchId, ruleOverrides) {
  // Verify match exists and is not completed
  const match = await prisma.match.findUnique({
    where: { id: matchId }
  });

  if (!match) {
    throw createHttpError(404, 'Match not found', {
      code: 'MATCH_NOT_FOUND'
    });
  }

  // T075: Prevent override changes on completed matches
  if (match.status === 'COMPLETED') {
    throw createHttpError(409, 'Cannot modify rules for completed match', {
      code: 'MATCH_ALREADY_COMPLETED'
    });
  }

  // Validate override rules
  const { validateScoringRulesOverride } = await import('../validation/scoringRulesSchemas.js');
  const validatedRules = validateScoringRulesOverride(ruleOverrides);

  // Update match with rule overrides
  const updated = await prisma.match.update({
    where: { id: matchId },
    data: {
      ruleOverrides: JSON.stringify(validatedRules)
    }
  });

  return {
    ...updated,
    ruleOverrides: JSON.parse(updated.ruleOverrides)
  };
}

/**
 * T075: Remove rule overrides from entity (set to null)
 * @param {string} entityType - 'group', 'bracket', 'round', or 'match'
 * @param {string} entityId - Entity ID
 * @returns {Promise<Object>} Updated entity
 */
export async function removeRuleOverrides(entityType, entityId) {
  const modelMap = {
    group: prisma.group,
    bracket: prisma.bracket,
    round: prisma.round,
    match: prisma.match
  };

  const model = modelMap[entityType];
  if (!model) {
    throw createHttpError(400, 'Invalid entity type', {
      code: 'INVALID_ENTITY_TYPE'
    });
  }

  // Verify entity exists
  const entity = await model.findUnique({
    where: { id: entityId }
  });

  if (!entity) {
    throw createHttpError(404, `${entityType} not found`, {
      code: `${entityType.toUpperCase()}_NOT_FOUND`
    });
  }

  // Update entity to remove overrides
  const updated = await model.update({
    where: { id: entityId },
    data: {
      ruleOverrides: null
    }
  });

  return updated;
}

/**
 * T095: Validate whether rule changes are allowed for an active tournament
 * @param {string} tournamentId - Tournament ID
 * @param {string} ruleChangeType - Type of change: 'format', 'default-rules', 'override'
 * @returns {Promise<Object>} Validation result with allowed flag and impact info
 */
export async function validateRuleChangeForActiveTournament(tournamentId, ruleChangeType) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      status: true,
      formatType: true
    }
  });

  if (!tournament) {
    throw createHttpError(404, 'Tournament not found', {
      code: 'TOURNAMENT_NOT_FOUND'
    });
  }

  // Get match statistics
  const [completedMatches, inProgressMatches, scheduledMatches] = await Promise.all([
    prisma.match.count({
      where: { tournamentId, status: 'COMPLETED' }
    }),
    prisma.match.count({
      where: { tournamentId, status: 'IN_PROGRESS' }
    }),
    prisma.match.count({
      where: { tournamentId, status: 'SCHEDULED' }
    })
  ]);

  const totalMatches = completedMatches + inProgressMatches + scheduledMatches;

  // Format changes: Only allowed if NO matches have been completed or started
  if (ruleChangeType === 'format') {
    const allowed = completedMatches === 0 && inProgressMatches === 0;
    return {
      allowed,
      reason: allowed ? null : 'Format changes not allowed after matches have started or completed',
      impact: {
        completedMatches,
        inProgressMatches,
        scheduledMatches,
        totalMatches
      }
    };
  }

  // Default rule changes: Allowed, but only affect future matches
  if (ruleChangeType === 'default-rules') {
    return {
      allowed: true,
      reason: null,
      impact: {
        completedMatches,
        inProgressMatches,
        scheduledMatches,
        affectedMatches: scheduledMatches, // Only scheduled matches use new default rules
        totalMatches
      }
    };
  }

  // Rule overrides: Allowed, only affect future matches at that level
  if (ruleChangeType === 'override') {
    return {
      allowed: true,
      reason: null,
      impact: {
        completedMatches,
        inProgressMatches,
        scheduledMatches,
        totalMatches
      }
    };
  }

  throw createHttpError(400, `Invalid rule change type: ${ruleChangeType}`, {
    code: 'INVALID_RULE_CHANGE_TYPE'
  });
}

/**
 * T096: Update default scoring rules with active tournament logic
 * This wraps setDefaultScoringRules with validation and impact tracking
 * @param {string} tournamentId - Tournament ID
 * @param {Object} scoringRules - New scoring rules
 * @returns {Promise<Object>} Updated tournament with impact info
 */
export async function updateDefaultScoringRulesForActiveTournament(tournamentId, scoringRules) {
  // Validate rule change is allowed
  const validation = await validateRuleChangeForActiveTournament(tournamentId, 'default-rules');

  // Update the rules
  const updated = await setDefaultScoringRules(tournamentId, scoringRules);

  // Return with impact information
  return {
    tournament: updated,
    changeImpact: validation.impact
  };
}

export default {
  setTournamentFormat,
  setDefaultScoringRules,
  getTournamentFormatAndRules,
  getAllRuleOverrides,
  setGroupRuleOverrides,
  setBracketRuleOverrides,
  setRoundRuleOverrides,
  setRoundEarlyTiebreak,
  setMatchRuleOverrides,
  removeRuleOverrides,
  validateRuleChangeForActiveTournament,
  updateDefaultScoringRulesForActiveTournament
};
