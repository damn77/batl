// T004-T005: Rule Complexity Service - Calculate tournament rule complexity level
// FR-003: Display rule complexity indicator (DEFAULT/MODIFIED/SPECIFIC)

/**
 * Calculate the complexity level of tournament rules based on rule overrides
 * at different levels (tournament, group, round, bracket, match).
 *
 * Complexity hierarchy: DEFAULT < MODIFIED < SPECIFIC
 *
 * - DEFAULT: No rule overrides at any level (rules defined only at tournament level)
 * - MODIFIED: Rule overrides exist at group, round, or bracket level
 * - SPECIFIC: Rule overrides exist at match level (highest complexity)
 *
 * @param {Array} groups - Array of group objects with ruleOverrides property
 * @param {Array} brackets - Array of bracket objects with ruleOverrides property
 * @param {Array} rounds - Array of round objects with ruleOverrides property
 * @param {Array} matches - Array of match objects with ruleOverrides property
 * @returns {'DEFAULT' | 'MODIFIED' | 'SPECIFIC'} The complexity level
 */
export function calculateComplexity(groups = [], brackets = [], rounds = [], matches = []) {
  let complexity = 'DEFAULT';

  // Check for group-level overrides
  if (groups.some(g => g.ruleOverrides !== null)) {
    complexity = 'MODIFIED';
  }

  // Check for round-level overrides
  if (rounds.some(r => r.ruleOverrides !== null)) {
    complexity = 'MODIFIED';
  }

  // Check for bracket-level overrides
  if (brackets.some(b => b.ruleOverrides !== null)) {
    complexity = 'MODIFIED';
  }

  // Check for match-level overrides (highest complexity)
  if (matches.some(m => m.ruleOverrides !== null)) {
    complexity = 'SPECIFIC';
  }

  return complexity;
}
