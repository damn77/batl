/**
 * Advancement Service
 *
 * Handles group-to-knockout-bracket advancement for COMBINED format tournaments.
 * Computes waterfall preview, confirms advancement by generating brackets,
 * and reverts advancement if needed.
 *
 * Feature: 30-combined-format-advancement, Plan 01
 * Requirements: COMB-01, COMB-07, ADV-01, ADV-02, ADV-03
 *
 * NOTE: This is a placeholder stub. Full implementation in Plan 01.
 */

/**
 * Compute advancement preview: assign group finishers to main/secondary/eliminated slots.
 *
 * @param {string} tournamentId
 * @returns {Promise<{mainSlots, secondarySlots, eliminated, mainBracketInfo, secondaryBracketInfo}>}
 */
export async function computeAdvancementPreview(tournamentId) {
  throw Object.assign(new Error('Not implemented'), { code: 'NOT_IMPLEMENTED' });
}

/**
 * Confirm advancement: atomically generate main and secondary knockout brackets.
 *
 * @param {string} tournamentId
 * @returns {Promise<{success, mainBracket, secondaryBracket}>}
 */
export async function confirmAdvancement(tournamentId) {
  throw Object.assign(new Error('Not implemented'), { code: 'NOT_IMPLEMENTED' });
}

/**
 * Revert advancement: delete generated brackets and unlock group phase.
 *
 * @param {string} tournamentId
 * @returns {Promise<{success}>}
 */
export async function revertAdvancement(tournamentId) {
  throw Object.assign(new Error('Not implemented'), { code: 'NOT_IMPLEMENTED' });
}
