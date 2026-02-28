/**
 * Bracket color configuration (FR-015)
 * All colors are configurable HEX values
 *
 * To customize colors, modify the values in this file.
 * Changes take effect after page refresh.
 */

export const bracketColors = {
  // Player slot backgrounds (FR-005, FR-006)
  topPlayer: '#f0f0f0',      // Light grey - top player/pair
  bottomPlayer: '#ffffff',   // White - bottom player/pair
  winner: '#d1e7dd',         // Bootstrap success-bg - winner highlight
  error: '#f8d7da',          // Bootstrap danger-bg - error state (FR-014)

  // Match border colors by status
  scheduled: '#6c757d',      // Bootstrap secondary - not played yet
  inProgress: '#0d6efd',     // Bootstrap primary - currently playing
  completed: '#198754',      // Bootstrap success - finished
  cancelled: '#dc3545',      // Bootstrap danger - cancelled
  bye: '#ffc107',            // Bootstrap warning - BYE match

  // Connector lines between matches
  connector: '#dee2e6',           // Bootstrap border - normal lines
  connectorHighlight: '#0d6efd',  // Bootstrap primary - highlighted path

  // UI controls
  controlActive: '#0d6efd',    // Bootstrap primary - active button
  controlInactive: '#6c757d',  // Bootstrap secondary - inactive button

  // Special outcome winners (W/O, FF, N/S) — blue to distinguish from standard green winners
  specialOutcomeWinner: '#cfe2ff',  // Bootstrap info-bg - walkover/forfeit/no-show winner
};

/**
 * Validate that a color is a valid HEX color
 * @param {string} color - Color to validate
 * @returns {boolean} True if valid HEX color
 */
export function isValidHexColor(color) {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Merge custom colors with defaults, validating each color
 * @param {Object} customColors - Custom color overrides
 * @returns {Object} Merged color configuration
 */
export function mergeColors(customColors = {}) {
  const merged = { ...bracketColors };

  for (const [key, value] of Object.entries(customColors)) {
    if (key in bracketColors && isValidHexColor(value)) {
      merged[key] = value;
    }
  }

  return merged;
}

export default bracketColors;
