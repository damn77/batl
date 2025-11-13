// T020, T040-T041: Match Rules Service - Cascading rule resolution
import { PrismaClient } from '@prisma/client';
import createHttpError from 'http-errors';

const prisma = new PrismaClient();

/**
 * T040-T041: Get effective rules for a match (with cascade resolution)
 * Resolution order: match → round → group/bracket → tournament
 *
 * @param {string} matchId - Match ID
 * @returns {Promise<Object>} Effective scoring rules for the match
 */
export async function getEffectiveRulesForMatch(matchId) {
  // Fetch match with all parent entities for cascade
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      tournament: true,
      group: true,
      bracket: true,
      round: {
        include: {
          bracket: true
        }
      }
    }
  });

  if (!match) {
    throw createHttpError(404, 'Match not found', {
      code: 'MATCH_NOT_FOUND'
    });
  }

  // If match is completed, return the snapshot
  if (match.status === 'COMPLETED' && match.completedWithRules) {
    return {
      source: 'SNAPSHOT',
      rules: JSON.parse(match.completedWithRules),
      snapshotDate: match.completedAt
    };
  }

  // Parse tournament default rules (base)
  const tournamentRules = JSON.parse(match.tournament.defaultScoringRules);

  // Initialize effective rules with tournament defaults
  let effectiveRules = { ...tournamentRules };
  const cascade = [
    { level: 'tournament', source: 'default' }
  ];

  // Layer 1: Group or Bracket overrides (depending on format)
  if (match.group?.ruleOverrides) {
    const groupOverrides = JSON.parse(match.group.ruleOverrides);
    effectiveRules = { ...effectiveRules, ...groupOverrides };
    cascade.push({
      level: 'group',
      groupNumber: match.group.groupNumber,
      overrides: groupOverrides
    });
  } else if (match.bracket?.ruleOverrides) {
    const bracketOverrides = JSON.parse(match.bracket.ruleOverrides);
    effectiveRules = { ...effectiveRules, ...bracketOverrides };
    cascade.push({
      level: 'bracket',
      bracketType: match.bracket.bracketType,
      overrides: bracketOverrides
    });
  } else if (match.round?.bracket?.ruleOverrides) {
    const bracketOverrides = JSON.parse(match.round.bracket.ruleOverrides);
    effectiveRules = { ...effectiveRules, ...bracketOverrides };
    cascade.push({
      level: 'bracket',
      bracketType: match.round.bracket.bracketType,
      overrides: bracketOverrides
    });
  }

  // Layer 2: Round overrides
  if (match.round?.ruleOverrides) {
    const roundOverrides = JSON.parse(match.round.ruleOverrides);
    effectiveRules = { ...effectiveRules, ...roundOverrides };
    cascade.push({
      level: 'round',
      roundNumber: match.round.roundNumber,
      overrides: roundOverrides
    });
  }

  // Layer 3: Match-specific overrides (highest priority)
  if (match.ruleOverrides) {
    const matchOverrides = JSON.parse(match.ruleOverrides);
    effectiveRules = { ...effectiveRules, ...matchOverrides };
    cascade.push({
      level: 'match',
      matchNumber: match.matchNumber,
      overrides: matchOverrides
    });
  }

  return {
    source: 'CASCADED',
    rules: effectiveRules,
    cascade
  };
}

export default {
  getEffectiveRulesForMatch
};
