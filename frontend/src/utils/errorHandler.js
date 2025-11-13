// T112: User-friendly error message handling for tournament rules

/**
 * Error codes from backend (must match backend/src/types/errorCodes.js)
 */
export const ErrorCodes = {
  // Format validation errors
  INVALID_FORMAT_TYPE: 'INVALID_FORMAT_TYPE',
  FORMAT_CONFIG_MISMATCH: 'FORMAT_CONFIG_MISMATCH',
  INVALID_FORMAT_CONFIG: 'INVALID_FORMAT_CONFIG',
  INVALID_MATCH_GUARANTEE: 'INVALID_MATCH_GUARANTEE',
  INVALID_GROUP_SIZE: 'INVALID_GROUP_SIZE',
  INVALID_SWISS_ROUNDS: 'INVALID_SWISS_ROUNDS',

  // Scoring rules validation errors
  INVALID_SCORING_FORMAT: 'INVALID_SCORING_FORMAT',
  INVALID_WINNING_SETS: 'INVALID_WINNING_SETS',
  INVALID_WINNING_GAMES: 'INVALID_WINNING_GAMES',
  INVALID_ADVANTAGE_RULE: 'INVALID_ADVANTAGE_RULE',
  INVALID_TIEBREAK_TRIGGER: 'INVALID_TIEBREAK_TRIGGER',
  INVALID_MATCH_TIEBREAK_POINTS: 'INVALID_MATCH_TIEBREAK_POINTS',

  // Active tournament errors
  FORMAT_CHANGE_NOT_ALLOWED: 'FORMAT_CHANGE_NOT_ALLOWED',
  RULE_CHANGE_ON_COMPLETED_MATCH: 'RULE_CHANGE_ON_COMPLETED_MATCH',
  TOURNAMENT_HAS_ACTIVE_MATCHES: 'TOURNAMENT_HAS_ACTIVE_MATCHES',

  // Entity not found errors
  TOURNAMENT_NOT_FOUND: 'TOURNAMENT_NOT_FOUND',
  MATCH_NOT_FOUND: 'MATCH_NOT_FOUND',
  GROUP_NOT_FOUND: 'GROUP_NOT_FOUND',
  BRACKET_NOT_FOUND: 'BRACKET_NOT_FOUND',
  ROUND_NOT_FOUND: 'ROUND_NOT_FOUND',

  // Authorization errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // General errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  MISSING_PARAMETERS: 'MISSING_PARAMETERS',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
};

/**
 * User-friendly error messages
 */
const ErrorMessages = {
  [ErrorCodes.INVALID_FORMAT_TYPE]: 'Invalid tournament format type. Please select a valid format.',
  [ErrorCodes.FORMAT_CONFIG_MISMATCH]: 'Format configuration does not match the selected format type.',
  [ErrorCodes.INVALID_FORMAT_CONFIG]: 'Invalid format configuration. Please check your settings.',
  [ErrorCodes.INVALID_MATCH_GUARANTEE]: 'Invalid match guarantee option. Please select 1 match, 2 matches, or until placement.',
  [ErrorCodes.INVALID_GROUP_SIZE]: 'Invalid group size. Group size must be between 2 and 8.',
  [ErrorCodes.INVALID_SWISS_ROUNDS]: 'Invalid number of rounds. Swiss tournaments require at least 3 rounds.',

  [ErrorCodes.INVALID_SCORING_FORMAT]: 'Invalid scoring format. Please select a valid format.',
  [ErrorCodes.INVALID_WINNING_SETS]: 'Invalid number of winning sets. Must be 1, 2, or 3.',
  [ErrorCodes.INVALID_WINNING_GAMES]: 'Invalid number of winning games. Must be between 1 and 10.',
  [ErrorCodes.INVALID_ADVANTAGE_RULE]: 'Invalid advantage rule. Please select advantage or no advantage.',
  [ErrorCodes.INVALID_TIEBREAK_TRIGGER]: 'Invalid tiebreak trigger. Please select a valid game score.',
  [ErrorCodes.INVALID_MATCH_TIEBREAK_POINTS]: 'Invalid match tiebreak points. Must be at least 7.',

  [ErrorCodes.FORMAT_CHANGE_NOT_ALLOWED]: 'Tournament format cannot be changed after matches have started or been completed.',
  [ErrorCodes.RULE_CHANGE_ON_COMPLETED_MATCH]: 'Rules cannot be changed for completed matches.',
  [ErrorCodes.TOURNAMENT_HAS_ACTIVE_MATCHES]: 'This operation cannot be performed while the tournament has active matches.',

  [ErrorCodes.TOURNAMENT_NOT_FOUND]: 'Tournament not found. It may have been deleted.',
  [ErrorCodes.MATCH_NOT_FOUND]: 'Match not found.',
  [ErrorCodes.GROUP_NOT_FOUND]: 'Group not found.',
  [ErrorCodes.BRACKET_NOT_FOUND]: 'Bracket not found.',
  [ErrorCodes.ROUND_NOT_FOUND]: 'Round not found.',

  [ErrorCodes.UNAUTHORIZED]: 'You must be logged in to perform this action.',
  [ErrorCodes.FORBIDDEN]: 'You do not have permission to perform this action.',

  [ErrorCodes.VALIDATION_FAILED]: 'Validation failed. Please check your input.',
  [ErrorCodes.MISSING_PARAMETERS]: 'Required parameters are missing.',
  [ErrorCodes.INTERNAL_SERVER_ERROR]: 'An unexpected error occurred. Please try again later.'
};

/**
 * Extract user-friendly error message from API error response
 *
 * @param {Error|Object} error - Axios error or error object
 * @returns {string} User-friendly error message
 */
export function getErrorMessage(error) {
  // Handle Axios error structure
  if (error.response?.data?.error) {
    const errorData = error.response.data.error;

    // Check for error code and return mapped message
    if (errorData.code && ErrorMessages[errorData.code]) {
      return ErrorMessages[errorData.code];
    }

    // Fallback to error message from API
    if (errorData.message) {
      return errorData.message;
    }
  }

  // Handle direct message property
  if (error.message) {
    return error.message;
  }

  // Generic fallback
  return ErrorMessages[ErrorCodes.INTERNAL_SERVER_ERROR];
}

/**
 * Get error code from API error response
 *
 * @param {Error|Object} error - Axios error or error object
 * @returns {string|null} Error code or null
 */
export function getErrorCode(error) {
  return error.response?.data?.error?.code || null;
}

/**
 * Check if error is a specific error code
 *
 * @param {Error|Object} error - Axios error or error object
 * @param {string} code - Error code to check
 * @returns {boolean} True if error matches code
 */
export function isErrorCode(error, code) {
  return getErrorCode(error) === code;
}

/**
 * Format field-level validation errors for display
 *
 * @param {Error|Object} error - Axios error or error object
 * @returns {Object} Field-level error messages
 */
export function getFieldErrors(error) {
  const fieldErrors = error.response?.data?.error?.fieldErrors || {};
  return fieldErrors;
}

export default {
  getErrorMessage,
  getErrorCode,
  isErrorCode,
  getFieldErrors,
  ErrorCodes
};
