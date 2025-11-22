// T019-T031: Tournament Registration Routes
// Wire up tournament registration endpoints with auth/validation (003-tournament-registration)
import express from 'express';
import {
  registerForTournament,
  unregisterFromTournament,
  getMyRegistration,
  getTournamentRegistrations,
  getPlayerTournaments,
  withdrawTournamentRegistration,
  updateTournamentRegistration
} from '../tournamentRegistrationController.js';
import { isAuthenticated } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';

const router = express.Router();

/**
 * POST /api/tournaments/:tournamentId/register
 * Register authenticated player for a tournament
 * T019, FR-001 to FR-017
 * Authorization: PLAYER or ORGANIZER (must have player profile)
 */
router.post(
  '/:tournamentId/register',
  isAuthenticated,
  registerForTournament
);

/**
 * T031: DELETE /api/tournaments/:tournamentId/register
 * Unregister authenticated player from a tournament
 * Authorization: PLAYER (self only) or ORGANIZER/ADMIN
 */
router.delete(
  '/:tournamentId/register',
  isAuthenticated,
  unregisterFromTournament
);

/**
 * GET /api/tournaments/:tournamentId/registration
 * Get current user's registration for a tournament
 * Authorization: Authenticated users with player profile
 */
router.get(
  '/:tournamentId/registration',
  isAuthenticated,
  getMyRegistration
);

/**
 * GET /api/tournaments/:tournamentId/registrations
 * Get all registrations for a tournament (organizer view)
 * Authorization: ORGANIZER or ADMIN
 */
router.get(
  '/:tournamentId/registrations',
  isAuthenticated,
  authorize('read', 'Tournament'),
  getTournamentRegistrations
);

/**
 * GET /api/players/:playerId/tournaments
 * Get all tournaments a player is registered for
 * Authorization: PLAYER (self only) or ORGANIZER/ADMIN
 */
router.get(
  '/players/:playerId/tournaments',
  isAuthenticated,
  getPlayerTournaments
);

/**
 * DELETE /api/tournaments/registrations/:registrationId
 * Withdraw a specific tournament registration (organizer/admin only)
 * Authorization: ORGANIZER or ADMIN
 */
router.delete(
  '/registrations/:registrationId',
  isAuthenticated,
  authorize('update', 'Tournament'),
  withdrawTournamentRegistration
);

/**
 * PATCH /api/tournaments/registrations/:registrationId
 * Update a specific tournament registration (organizer/admin only)
 * Authorization: ORGANIZER or ADMIN
 */
router.patch(
  '/registrations/:registrationId',
  isAuthenticated,
  authorize('update', 'Tournament'),
  updateTournamentRegistration
);

export default router;
