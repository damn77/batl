/**
 * Joi validation schemas for advancement endpoints.
 *
 * Feature: 30-combined-format-advancement, Plan 02
 * Requirements: COMB-01, COMB-07, ADV-03, ADV-04
 */

import Joi from 'joi';

/**
 * Schema for validating the tournament ID path parameter.
 * Used by all three advancement endpoints:
 *   GET    /:id/advancement/preview
 *   POST   /:id/advancement
 *   DELETE /:id/advancement
 */
export const advancementParamsSchema = Joi.object({
  id: Joi.string().uuid().required()
    .messages({
      'string.guid': 'Tournament ID must be a valid UUID',
      'any.required': 'Tournament ID is required'
    })
});
