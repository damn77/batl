// Authorization helpers for doubles pair management
// Feature: 006-doubles-pairs

import { PairErrorCodes, createPairError, PairErrorStatusCodes } from '../utils/pairErrors.js';
import { isPlayerInPair } from '../utils/pairHelpers.js';

/**
 * Check if user can create a pair for the given players
 *
 * Authorization rules:
 * - ADMIN/ORGANIZER: Can create pair for any two players
 * - PLAYER: Can only create pair if they are one of the two players
 * - Unauthenticated: Cannot create pairs
 *
 * @param {Object} user - User object from req.user
 * @param {string} player1Id - First player ID
 * @param {string} player2Id - Second player ID
 * @param {string} [userProfileId] - User's player profile ID (if PLAYER role)
 * @returns {Object} { authorized: boolean, error?: Object }
 */
export function canCreatePair(user, player1Id, player2Id, userProfileId = null) {
  // Unauthenticated users cannot create pairs
  if (!user) {
    return {
      authorized: false,
      error: createPairError(PairErrorCodes.UNAUTHORIZED),
      statusCode: PairErrorStatusCodes[PairErrorCodes.UNAUTHORIZED],
    };
  }

  // Admin and Organizer can create pair for any players
  if (user.role === 'ADMIN' || user.role === 'ORGANIZER') {
    return { authorized: true };
  }

  // Player role: must be one of the two players in the pair
  if (user.role === 'PLAYER') {
    if (!userProfileId) {
      return {
        authorized: false,
        error: createPairError(
          PairErrorCodes.FORBIDDEN,
          'Player profile not found for user'
        ),
        statusCode: PairErrorStatusCodes[PairErrorCodes.FORBIDDEN],
      };
    }

    if (userProfileId === player1Id || userProfileId === player2Id) {
      return { authorized: true };
    }

    return {
      authorized: false,
      error: createPairError(
        PairErrorCodes.FORBIDDEN,
        'Players can only create pairs they are part of'
      ),
      statusCode: PairErrorStatusCodes[PairErrorCodes.FORBIDDEN],
    };
  }

  // Unknown role - deny access
  return {
    authorized: false,
    error: createPairError(PairErrorCodes.FORBIDDEN),
    statusCode: PairErrorStatusCodes[PairErrorCodes.FORBIDDEN],
  };
}

/**
 * Check if user can register a pair for a tournament
 *
 * Authorization rules:
 * - ADMIN/ORGANIZER: Can register any pair
 * - PLAYER: Can only register if they are one of the pair members
 * - Unauthenticated: Cannot register pairs
 *
 * @param {Object} user - User object from req.user
 * @param {Object} pair - DoublesPair object with player1Id and player2Id
 * @param {string} [userProfileId] - User's player profile ID (if PLAYER role)
 * @returns {Object} { authorized: boolean, error?: Object }
 */
export function canRegisterPair(user, pair, userProfileId = null) {
  // Unauthenticated users cannot register pairs
  if (!user) {
    return {
      authorized: false,
      error: createPairError(PairErrorCodes.UNAUTHORIZED),
      statusCode: PairErrorStatusCodes[PairErrorCodes.UNAUTHORIZED],
    };
  }

  // Admin and Organizer can register any pair
  if (user.role === 'ADMIN' || user.role === 'ORGANIZER') {
    return { authorized: true };
  }

  // Player role: must be one of the pair members
  if (user.role === 'PLAYER') {
    if (!userProfileId) {
      return {
        authorized: false,
        error: createPairError(
          PairErrorCodes.FORBIDDEN,
          'Player profile not found for user'
        ),
        statusCode: PairErrorStatusCodes[PairErrorCodes.FORBIDDEN],
      };
    }

    if (isPlayerInPair(pair, userProfileId)) {
      return { authorized: true };
    }

    return {
      authorized: false,
      error: createPairError(
        PairErrorCodes.FORBIDDEN,
        'Players can only register pairs they are part of'
      ),
      statusCode: PairErrorStatusCodes[PairErrorCodes.FORBIDDEN],
    };
  }

  // Unknown role - deny access
  return {
    authorized: false,
    error: createPairError(PairErrorCodes.FORBIDDEN),
    statusCode: PairErrorStatusCodes[PairErrorCodes.FORBIDDEN],
  };
}

/**
 * Check if user can manage pairs (delete, recalculate seeding, etc.)
 *
 * Authorization rules:
 * - ADMIN/ORGANIZER: Can manage all pairs
 * - PLAYER: Cannot manage pairs
 * - Unauthenticated: Cannot manage pairs
 *
 * @param {Object} user - User object from req.user
 * @returns {Object} { authorized: boolean, error?: Object }
 */
export function canManagePairs(user) {
  // Unauthenticated users cannot manage pairs
  if (!user) {
    return {
      authorized: false,
      error: createPairError(PairErrorCodes.UNAUTHORIZED),
      statusCode: PairErrorStatusCodes[PairErrorCodes.UNAUTHORIZED],
    };
  }

  // Admin and Organizer can manage pairs
  if (user.role === 'ADMIN' || user.role === 'ORGANIZER') {
    return { authorized: true };
  }

  // Players cannot manage pairs
  return {
    authorized: false,
    error: createPairError(
      PairErrorCodes.FORBIDDEN,
      'Only admins and organizers can manage pairs'
    ),
    statusCode: PairErrorStatusCodes[PairErrorCodes.FORBIDDEN],
  };
}

/**
 * Check if user can use eligibility override
 *
 * Authorization rules:
 * - ADMIN/ORGANIZER: Can override eligibility
 * - PLAYER: Cannot override eligibility
 * - Unauthenticated: Cannot override eligibility
 *
 * @param {Object} user - User object from req.user
 * @returns {Object} { authorized: boolean, error?: Object }
 */
export function canOverrideEligibility(user) {
  // Unauthenticated users cannot override
  if (!user) {
    return {
      authorized: false,
      error: createPairError(PairErrorCodes.UNAUTHORIZED),
      statusCode: PairErrorStatusCodes[PairErrorCodes.UNAUTHORIZED],
    };
  }

  // Admin and Organizer can override eligibility
  if (user.role === 'ADMIN' || user.role === 'ORGANIZER') {
    return { authorized: true };
  }

  // Players cannot override eligibility
  return {
    authorized: false,
    error: createPairError(
      PairErrorCodes.OVERRIDE_NOT_ALLOWED,
      'Only admins and organizers can override eligibility requirements'
    ),
    statusCode: PairErrorStatusCodes[PairErrorCodes.OVERRIDE_NOT_ALLOWED],
  };
}

/**
 * Express middleware to check pair creation authorization
 * Expects req.body.player1Id, req.body.player2Id
 * Expects req.user (from auth middleware)
 * Uses req.user.playerId (set by deserializeUser if user has linked player profile)
 */
export const authorizePairCreation = (req, res, next) => {
  const { player1Id, player2Id } = req.body;
  const userProfileId = req.user?.playerId || null;

  const authResult = canCreatePair(req.user, player1Id, player2Id, userProfileId);

  if (!authResult.authorized) {
    return res.status(authResult.statusCode).json(authResult.error);
  }

  next();
};

/**
 * Express middleware to check pair management authorization
 * Expects req.user (from auth middleware)
 */
export const authorizePairManagement = (req, res, next) => {
  const authResult = canManagePairs(req.user);

  if (!authResult.authorized) {
    return res.status(authResult.statusCode).json(authResult.error);
  }

  next();
};

export default {
  canCreatePair,
  canRegisterPair,
  canManagePairs,
  canOverrideEligibility,
  authorizePairCreation,
  authorizePairManagement,
};
