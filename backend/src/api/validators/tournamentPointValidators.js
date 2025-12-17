/**
 * Tournament Point Configuration Validators
 * Feature: 008-tournament-rankings
 */

import Joi from 'joi';

/**
 * Validator for creating/updating tournament point configuration
 */
export const tournamentPointConfigSchema = Joi.object({
    calculationMethod: Joi.string()
        .valid('PLACEMENT', 'FINAL_ROUND')
        .required()
        .messages({
            'any.required': 'Calculation method is required',
            'any.only': 'Calculation method must be either PLACEMENT or FINAL_ROUND'
        }),

    multiplicativeValue: Joi.number()
        .min(0.1)
        .max(100)
        .default(2)
        .messages({
            'number.min': 'Multiplicative value must be at least 0.1',
            'number.max': 'Multiplicative value cannot exceed 100'
        }),

    doublePointsEnabled: Joi.boolean()
        .default(false)
        .messages({
            'boolean.base': 'Double points enabled must be a boolean value'
        })
});

/**
 * Validator for calculate points request
 */
export const calculatePointsSchema = Joi.object({
    results: Joi.array()
        .items(
            Joi.object({
                playerId: Joi.string().uuid().when('pairId', {
                    is: Joi.exist(),
                    then: Joi.optional(),
                    otherwise: Joi.required()
                }),
                pairId: Joi.string().uuid().optional(),
                placement: Joi.number().integer().min(1).when('finalRoundReached', {
                    is: Joi.exist(),
                    then: Joi.optional(),
                    otherwise: Joi.required()
                }),
                finalRoundReached: Joi.string().optional(),
                isConsolation: Joi.boolean().default(false)
            })
        )
        .min(1)
        .required()
        .messages({
            'array.min': 'At least one result is required',
            'any.required': 'Results array is required'
        })
});

/**
 * Validate tournament point configuration
 * @param {Object} data - Point configuration data
 * @returns {Object} Validated data
 * @throws {Error} Validation error
 */
export function validateTournamentPointConfig(data) {
    const { error, value } = tournamentPointConfigSchema.validate(data, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        const messages = error.details.map(detail => detail.message);
        throw new Error(`Validation failed: ${messages.join(', ')}`);
    }

    return value;
}

/**
 * Validate calculate points request
 * @param {Object} data - Calculate points request data
 * @returns {Object} Validated data
 * @throws {Error} Validation error
 */
export function validateCalculatePoints(data) {
    const { error, value } = calculatePointsSchema.validate(data, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        const messages = error.details.map(detail => detail.message);
        throw new Error(`Validation failed: ${messages.join(', ')}`);
    }

    return value;
}
