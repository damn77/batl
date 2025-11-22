// Eligibility validation utilities for tournament categories
// Feature: 006-doubles-pairs (also reusable for other features)

/**
 * Calculate player's age based on birth date
 * Uses calendar year calculation (currentYear - birthYear)
 *
 * @param {Date|string} birthDate - Player's birth date
 * @returns {number} Player's age
 */
export function calculateAge(birthDate) {
  const birth = new Date(birthDate);
  const currentYear = new Date().getFullYear();
  const birthYear = birth.getFullYear();

  return currentYear - birthYear;
}

/**
 * Get minimum age requirement for an age group
 *
 * @param {string} ageGroup - Age group enum value (e.g., "AGE_35", "ALL_AGES")
 * @returns {number|null} Minimum age or null for ALL_AGES
 */
export function getMinimumAge(ageGroup) {
  if (ageGroup === 'ALL_AGES') {
    return null;
  }

  // Extract age from enum (e.g., "AGE_35" -> 35)
  const match = ageGroup.match(/AGE_(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }

  return null;
}

/**
 * Check if player meets age criteria for a category
 *
 * @param {Object} player - Player profile object
 * @param {Date|string} player.birthDate - Player's birth date
 * @param {string} categoryAgeGroup - Category age group enum (e.g., "AGE_35", "ALL_AGES")
 * @returns {Object} { eligible: boolean, reason?: string, age?: number, minAge?: number }
 */
export function meetsAgeCriteria(player, categoryAgeGroup) {
  // If category is ALL_AGES, any age is eligible
  if (categoryAgeGroup === 'ALL_AGES') {
    return { eligible: true };
  }

  // Player must have birth date to verify age
  if (!player.birthDate) {
    return {
      eligible: false,
      reason: 'Birth date not set (required for age validation)',
    };
  }

  const playerAge = calculateAge(player.birthDate);
  const minAge = getMinimumAge(categoryAgeGroup);

  if (minAge === null) {
    // Should not happen unless invalid age group
    return {
      eligible: false,
      reason: `Invalid age group: ${categoryAgeGroup}`,
    };
  }

  if (playerAge >= minAge) {
    return {
      eligible: true,
      age: playerAge,
      minAge,
    };
  }

  return {
    eligible: false,
    reason: `Player age (${playerAge}) does not meet minimum age requirement (${minAge}+)`,
    age: playerAge,
    minAge,
  };
}

/**
 * Check if player meets gender criteria for a category
 *
 * @param {Object} player - Player profile object
 * @param {string} player.gender - Player's gender (MEN, WOMEN)
 * @param {string} categoryGender - Category gender enum (MEN, WOMEN, MIXED)
 * @returns {Object} { eligible: boolean, reason?: string }
 */
export function meetsGenderCriteria(player, categoryGender) {
  // MIXED category accepts any gender
  if (categoryGender === 'MIXED') {
    return { eligible: true };
  }

  // Player must have gender set to verify
  if (!player.gender) {
    return {
      eligible: false,
      reason: 'Gender not set (required for gender validation)',
    };
  }

  // Gender must match exactly for non-MIXED categories
  if (player.gender === categoryGender) {
    return { eligible: true };
  }

  return {
    eligible: false,
    reason: `Player gender (${player.gender}) does not match category requirement (${categoryGender})`,
  };
}

/**
 * Check if player meets all criteria for a category
 * Combines age and gender checks
 *
 * @param {Object} player - Player profile object
 * @param {Object} category - Category object
 * @param {string} category.ageGroup - Category age group
 * @param {string} category.gender - Category gender requirement
 * @returns {Object} { eligible: boolean, violations: string[] }
 */
export function meetsAllCriteria(player, category) {
  const violations = [];

  // Check age eligibility
  const ageCheck = meetsAgeCriteria(player, category.ageGroup);
  if (!ageCheck.eligible) {
    violations.push(ageCheck.reason);
  }

  // Check gender eligibility
  const genderCheck = meetsGenderCriteria(player, category.gender);
  if (!genderCheck.eligible) {
    violations.push(genderCheck.reason);
  }

  return {
    eligible: violations.length === 0,
    violations,
  };
}

/**
 * Format player eligibility message for display
 *
 * @param {string} playerName - Player's name
 * @param {string} violation - Eligibility violation reason
 * @returns {string} Formatted message (e.g., "John Doe does not meet age requirement (must be 35+)")
 */
export function formatEligibilityViolation(playerName, violation) {
  return `${playerName} ${violation.replace(/^Player /, '')}`;
}

export default {
  calculateAge,
  getMinimumAge,
  meetsAgeCriteria,
  meetsGenderCriteria,
  meetsAllCriteria,
  formatEligibilityViolation,
};
