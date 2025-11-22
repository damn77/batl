// Error codes and messages for doubles pair management
// Feature: 006-doubles-pairs

export const PairErrorCodes = {
  // Pair Creation Errors
  SAME_PLAYER: 'SAME_PLAYER',
  INVALID_CATEGORY: 'INVALID_CATEGORY',
  PLAYER_NOT_FOUND: 'PLAYER_NOT_FOUND',
  PAIR_NOT_FOUND: 'PAIR_NOT_FOUND',

  // Registration Errors
  INELIGIBLE_PAIR: 'INELIGIBLE_PAIR',
  ALREADY_REGISTERED: 'ALREADY_REGISTERED',
  TOURNAMENT_FULL: 'TOURNAMENT_FULL',
  WRONG_CATEGORY_TYPE: 'WRONG_CATEGORY_TYPE',
  TOURNAMENT_NOT_FOUND: 'TOURNAMENT_NOT_FOUND',

  // Authorization Errors
  FORBIDDEN: 'FORBIDDEN',
  UNAUTHORIZED: 'UNAUTHORIZED',
  OVERRIDE_NOT_ALLOWED: 'OVERRIDE_NOT_ALLOWED',
  OVERRIDE_REASON_REQUIRED: 'OVERRIDE_REASON_REQUIRED',

  // Partner Conflict Errors
  PLAYER_ALREADY_REGISTERED: 'PLAYER_ALREADY_REGISTERED',
};

export const PairErrorMessages = {
  [PairErrorCodes.SAME_PLAYER]: 'Player 1 and Player 2 must be different players',
  [PairErrorCodes.INVALID_CATEGORY]: 'Category must be DOUBLES type for pair registration',
  [PairErrorCodes.PLAYER_NOT_FOUND]: 'One or both players not found',
  [PairErrorCodes.PAIR_NOT_FOUND]: 'Pair not found',

  [PairErrorCodes.INELIGIBLE_PAIR]: 'Pair does not meet tournament eligibility requirements',
  [PairErrorCodes.ALREADY_REGISTERED]: 'This pair is already registered for this tournament',
  [PairErrorCodes.TOURNAMENT_FULL]: 'Tournament is at capacity',
  [PairErrorCodes.WRONG_CATEGORY_TYPE]: 'Tournament category is not DOUBLES type',
  [PairErrorCodes.TOURNAMENT_NOT_FOUND]: 'Tournament not found',

  [PairErrorCodes.FORBIDDEN]: 'User lacks permission for this action',
  [PairErrorCodes.UNAUTHORIZED]: 'Authentication required',
  [PairErrorCodes.OVERRIDE_NOT_ALLOWED]: 'Only organizers and admins can use eligibility override',
  [PairErrorCodes.OVERRIDE_REASON_REQUIRED]: 'Override reason is required when eligibilityOverride is true',

  [PairErrorCodes.PLAYER_ALREADY_REGISTERED]: 'Player is already registered in this tournament with a different partner',
};

/**
 * Create a standardized error response for pair-related errors
 * @param {string} code - Error code from PairErrorCodes
 * @param {string} [customMessage] - Optional custom message (overrides default)
 * @param {Object} [details] - Optional additional error details
 * @returns {Object} Error response object
 */
export function createPairError(code, customMessage = null, details = null) {
  const error = {
    success: false,
    error: {
      code,
      message: customMessage || PairErrorMessages[code] || 'An error occurred',
    },
  };

  if (details) {
    error.error.details = details;
  }

  return error;
}

/**
 * Create an eligibility violation error with specific details
 * @param {Array<string>} violations - List of eligibility violations
 * @returns {Object} Error response object
 */
export function createEligibilityError(violations) {
  return createPairError(
    PairErrorCodes.INELIGIBLE_PAIR,
    PairErrorMessages[PairErrorCodes.INELIGIBLE_PAIR],
    { violations }
  );
}

/**
 * HTTP status codes for pair errors
 */
export const PairErrorStatusCodes = {
  [PairErrorCodes.SAME_PLAYER]: 400,
  [PairErrorCodes.INVALID_CATEGORY]: 400,
  [PairErrorCodes.PLAYER_NOT_FOUND]: 404,
  [PairErrorCodes.PAIR_NOT_FOUND]: 404,

  [PairErrorCodes.INELIGIBLE_PAIR]: 400,
  [PairErrorCodes.ALREADY_REGISTERED]: 400,
  [PairErrorCodes.TOURNAMENT_FULL]: 400,
  [PairErrorCodes.WRONG_CATEGORY_TYPE]: 400,
  [PairErrorCodes.TOURNAMENT_NOT_FOUND]: 404,

  [PairErrorCodes.FORBIDDEN]: 403,
  [PairErrorCodes.UNAUTHORIZED]: 401,
  [PairErrorCodes.OVERRIDE_NOT_ALLOWED]: 403,
  [PairErrorCodes.OVERRIDE_REASON_REQUIRED]: 400,

  [PairErrorCodes.PLAYER_ALREADY_REGISTERED]: 400,
};
