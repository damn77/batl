import Joi from 'joi';

/**
 * Schema for validating player count parameter
 * Player count must be an integer between 4 and 128
 */
export const playerCountParamSchema = Joi.object({
  playerCount: Joi.number()
    .integer()
    .min(4)
    .max(128)
    .required()
    .messages({
      'number.base': 'Player count must be a number',
      'number.integer': 'Player count must be an integer',
      'number.min': 'Player count must be at least 4',
      'number.max': 'Player count cannot exceed 128',
      'any.required': 'Player count is required'
    })
});

/**
 * Validate player count parameter
 * @param {number} playerCount - Player count to validate
 * @returns {number} Validated player count
 * @throws {Error} If player count is invalid
 */
export function validatePlayerCount(playerCount) {
  // Convert string to number if needed (route params are strings)
  const numericValue = typeof playerCount === 'string' ? Number(playerCount) : playerCount;

  const { error, value } = Joi.number()
    .integer()
    .min(4)
    .max(128)
    .required()
    .validate(numericValue);

  if (error) {
    const validationError = new Error(error.details[0].message);
    validationError.statusCode = 400;
    validationError.code = 'INVALID_PLAYER_COUNT';
    throw validationError;
  }

  return value;
}
