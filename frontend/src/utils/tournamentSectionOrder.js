/**
 * tournamentSectionOrder.js
 * Pure utility functions for status-driven tournament view layout ordering.
 * Used by TournamentViewPage to determine Accordion section order and default expanded keys.
 */

/**
 * Returns the ordered array of section keys for a given tournament status.
 * The order determines render position in the accordion.
 *
 * @param {string} status - 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED'
 * @returns {string[]} Ordered section keys
 */
export function buildSectionOrder(status) {
  switch (status) {
    case 'SCHEDULED':
      return ['location-schedule', 'organizer-registration', 'format', 'players', 'points'];
    case 'IN_PROGRESS':
      return ['location-schedule', 'organizer-registration', 'format', 'players', 'points'];
    case 'COMPLETED':
      return ['points', 'players', 'location-schedule', 'organizer-registration', 'format'];
    default:
      return ['location-schedule', 'organizer-registration', 'format', 'players', 'points'];
  }
}

/**
 * Returns the default active (expanded) accordion keys for a given tournament status.
 * Empty array means all sections collapsed by default.
 *
 * @param {string} status - 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED'
 * @returns {string[]} Array of section keys to expand by default
 */
export function getDefaultActiveKeys(status) {
  switch (status) {
    case 'SCHEDULED':
      return ['location-schedule'];
    case 'IN_PROGRESS':
      return [];
    case 'COMPLETED':
      return [];
    default:
      return ['location-schedule'];
  }
}
