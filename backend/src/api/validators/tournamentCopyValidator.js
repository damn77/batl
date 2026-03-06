/**
 * Joi validation schema for POST /api/v1/tournaments/:id/copy
 *
 * Phase 14: Tournament Copy
 * Requirements: COPY-01, COPY-02
 *
 * All fields are optional — the copy endpoint accepts override fields that
 * the organizer has edited in the pre-filled form before submitting. The
 * service layer enforces that name + startDate + endDate are provided when
 * creating the new tournament record (required by the DB schema).
 */

import Joi from 'joi';

/**
 * Schema for the copy request body.
 * Accepts optional override fields applied on top of the source tournament's configuration.
 *
 * Override fields:
 * - name: New tournament display name (required by DB, must be provided by organizer)
 * - description: Optional tournament description
 * - startDate: Start date (ISO string or parseable date)
 * - endDate: End date (ISO string or parseable date)
 * - capacity: Maximum registered players (min 2)
 * - clubName: Primary location club name (creates/finds Location record)
 * - address: Primary location address (paired with clubName)
 */
export const copyTournamentSchema = Joi.object({
  name: Joi.string().trim().optional(),
  description: Joi.string().trim().allow('', null).optional(),
  startDate: Joi.string().isoDate().optional(),
  endDate: Joi.string().isoDate().optional(),
  capacity: Joi.number().integer().min(2).allow(null).optional(),
  clubName: Joi.string().trim().optional(),
  address: Joi.string().trim().allow('', null).optional()
});
