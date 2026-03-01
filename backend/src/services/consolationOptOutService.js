/**
 * Consolation Opt-Out Service
 *
 * Allows organizers and players to record a consolation opt-out for a
 * player or pair in a MATCH_2 (Double Elimination) tournament.
 *
 * Business rules:
 *   - Either the organizer or the player (self-service) can record an opt-out.
 *   - Opt-out is allowed any time before the player's next consolation match is played.
 *   - For doubles: opt-out is pair-level; one partner opting out withdraws the whole pair.
 *   - Pre-placement opt-out is valid: record is created immediately; routeLoserToConsolation
 *     checks it at placement time.
 *
 * Feature: Phase 05 - Loser Routing and Consolation Progression (Plan 03)
 * Requirement: LIFE-05
 *
 * Exports:
 *   - recordOptOut({ tournamentId, playerId, pairId, isOrganizer, submitterPlayerId })
 */

import { PrismaClient } from '@prisma/client';
import { advanceBracketSlot } from './tournamentLifecycleService.js';

const prisma = new PrismaClient();

/**
 * Helper to throw structured errors consumed by the controller.
 *
 * @param {number} statusCode - HTTP status code
 * @param {string} code - Machine-readable error code
 * @param {string} message - Human-readable error message
 */
function throwError(statusCode, code, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  throw err;
}

/**
 * Record a consolation opt-out for a player or pair in a tournament.
 *
 * @param {Object} params
 * @param {string} params.tournamentId - UUID of the tournament
 * @param {string|null} params.playerId - PlayerProfile ID (singles) or null (doubles)
 * @param {string|null} params.pairId - DoublesPair ID (doubles) or null (singles)
 * @param {boolean} params.isOrganizer - true if submitter is ADMIN/ORGANIZER
 * @param {string|null} params.submitterPlayerId - PlayerProfile ID of the logged-in submitter
 * @returns {Promise<Object>} Created ConsolationOptOut record
 * @throws {Error} TOURNAMENT_NOT_FOUND | NOT_CONSOLATION_TOURNAMENT | ALREADY_OPTED_OUT |
 *                 NEXT_MATCH_ALREADY_PLAYED | NOT_AUTHORIZED
 */
export async function recordOptOut({ tournamentId, playerId, pairId, isOrganizer, submitterPlayerId }) {
  // Step 1: Fetch the tournament (need formatConfig to check matchGuarantee)
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, formatConfig: true }
  });

  if (!tournament) {
    throwError(404, 'TOURNAMENT_NOT_FOUND', 'Tournament not found');
  }

  // Step 2: Verify this is a MATCH_2 (consolation) tournament
  let formatConfig;
  try {
    formatConfig = typeof tournament.formatConfig === 'string'
      ? JSON.parse(tournament.formatConfig)
      : tournament.formatConfig;
  } catch {
    formatConfig = {};
  }

  if (!formatConfig || formatConfig.matchGuarantee !== 'MATCH_2') {
    throwError(400, 'NOT_CONSOLATION_TOURNAMENT', 'This tournament does not have a consolation bracket');
  }

  // Step 3: Authorization check
  if (!isOrganizer) {
    if (playerId) {
      // Singles self-service: submitter must be the player
      if (submitterPlayerId !== playerId) {
        throwError(403, 'NOT_AUTHORIZED', 'You can only opt out yourself from consolation');
      }
    } else if (pairId) {
      // Doubles self-service: submitter must be a member of the pair
      const pair = await prisma.doublesPair.findUnique({
        where: { id: pairId },
        select: { player1Id: true, player2Id: true }
      });

      if (!pair) {
        throwError(404, 'PAIR_NOT_FOUND', 'Doubles pair not found');
      }

      if (submitterPlayerId !== pair.player1Id && submitterPlayerId !== pair.player2Id) {
        throwError(403, 'NOT_AUTHORIZED', 'You can only opt out a pair you are a member of');
      }
    }
  }

  // Step 4: Check for an existing opt-out (idempotency guard)
  const existingOptOutWhere = { tournamentId };
  if (playerId) {
    existingOptOutWhere.playerId = playerId;
  } else if (pairId) {
    existingOptOutWhere.pairId = pairId;
  }

  const existingOptOut = await prisma.consolationOptOut.findFirst({
    where: existingOptOutWhere
  });

  if (existingOptOut) {
    throwError(409, 'ALREADY_OPTED_OUT', 'Player/pair has already opted out of consolation');
  }

  // Step 5: Check if the next consolation match is already played (COMPLETED)
  // If no consolation bracket has been generated yet, skip this check — pre-draw opt-out is valid.
  const consolationBracket = await prisma.bracket.findFirst({
    where: {
      tournamentId,
      bracketType: 'CONSOLATION'
    },
    select: { id: true }
  });

  if (consolationBracket) {
    // Build participant filter for the consolation matches
    let participantFilter;
    if (pairId) {
      participantFilter = {
        OR: [{ pair1Id: pairId }, { pair2Id: pairId }]
      };
    } else {
      participantFilter = {
        OR: [{ player1Id: playerId }, { player2Id: playerId }]
      };
    }

    const playedConsolationMatches = await prisma.match.findMany({
      where: {
        bracketId: consolationBracket.id,
        ...participantFilter,
        status: 'COMPLETED'
      },
      select: { id: true }
    });

    if (playedConsolationMatches.length > 0) {
      throwError(409, 'NEXT_MATCH_ALREADY_PLAYED', 'Cannot opt out — consolation match has already been played');
    }
  }

  // Step 6 + 7: Create the opt-out record and advance the opponent (if placed) — atomically.
  const optOut = await prisma.$transaction(async (tx) => {
    // Step 6: Create the opt-out record
    const created = await tx.consolationOptOut.create({
      data: {
        tournamentId,
        playerId: playerId || null,
        pairId: pairId || null,
        recordedBy: isOrganizer ? 'ORGANIZER' : 'SELF'
      }
    });

    // Step 7: If the consolation bracket exists, find the opted-out player's current
    // (non-COMPLETED) consolation slot and advance the opponent if present.
    if (consolationBracket) {
      const currentMatch = await tx.match.findFirst({
        where: {
          bracketId: consolationBracket.id,
          ...participantFilter,
          status: { not: 'COMPLETED' }
        },
        select: {
          id: true,
          roundId: true,
          bracketId: true,
          matchNumber: true,
          tournamentId: true,
          isBye: true,
          result: true,
          status: true,
          player1Id: true,
          player2Id: true,
          pair1Id: true,
          pair2Id: true
        }
      });

      if (currentMatch) {
        // Determine which slot the opted-out entity occupies and who the opponent is
        let opponentId;
        if (pairId) {
          opponentId = currentMatch.pair1Id === pairId
            ? currentMatch.pair2Id
            : currentMatch.pair1Id;
        } else {
          opponentId = currentMatch.player1Id === playerId
            ? currentMatch.player2Id
            : currentMatch.player1Id;
        }

        // If the opponent is already placed, advance them (opted-out player forfeits)
        if (opponentId) {
          await advanceBracketSlot(tx, currentMatch, opponentId);
        }
        // If opponent is null (not yet placed), the pre-placement opt-out is handled
        // by routeLoserToConsolation's existing opt-out check when the opponent arrives.
      }
    }

    return created;
  });

  return optOut;
}
