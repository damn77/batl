/**
 * Match Result Service
 *
 * Business logic for match result submission:
 *   - Participant check (players must be match participants)
 *   - Organizer-lock check (players cannot modify organizer-set results)
 *   - Atomic DB write via Prisma transaction
 *
 * Feature: 01-match-result-submission (Plan 01)
 *
 * Exports:
 *   - submitResult({ matchId, body, isOrganizer, submitterPlayerId })
 */

import { PrismaClient } from '@prisma/client';
import { advanceBracketSlot, checkAndCompleteTournament } from './tournamentLifecycleService.js';
import { routeLoserToConsolation } from './consolationEligibilityService.js';

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
 * Determine whether a player is a participant in a match.
 *
 * Handles both singles (player1Id / player2Id) and doubles
 * (pair1/pair2 members) matches.
 *
 * @param {Object} match - Match record including pair relations
 * @param {string|null} playerId - PlayerProfile id of the submitter
 * @returns {boolean}
 */
function isMatchParticipant(match, playerId) {
  if (!playerId) return false;

  // Singles participation check
  if (match.player1Id === playerId || match.player2Id === playerId) {
    return true;
  }

  // Doubles participation check — check all four pair members
  const doublesParticipants = [
    match.pair1?.player1?.id,
    match.pair1?.player2?.id,
    match.pair2?.player1?.id,
    match.pair2?.player2?.id
  ];

  return doublesParticipants.includes(playerId);
}

/**
 * Submit or override a match result.
 *
 * Rules enforced:
 *   1. Match must exist (404 MATCH_NOT_FOUND)
 *   2. Non-organizers must be match participants (403 NOT_PARTICIPANT)
 *   3. Non-organizers cannot update organizer-locked matches (403 ORGANIZER_LOCKED)
 *   4. submittedBy is always derived server-side — never from request body
 *   5. Special outcomes (WALKOVER, FORFEIT, NO_SHOW) are organizer-only (enforced by controller)
 *
 * The entire read-check-write cycle runs inside a Prisma serializable transaction
 * to prevent race conditions between concurrent submissions.
 *
 * @param {Object} params
 * @param {string} params.matchId - UUID of the match to update
 * @param {Object} params.body - Validated request body (submitResultSchema or submitSpecialOutcomeSchema)
 * @param {boolean} params.isOrganizer - true if req.user.role is ADMIN or ORGANIZER
 * @param {string|null} params.submitterPlayerId - req.user.playerId (null for organizers without player profile)
 * @returns {Promise<Object>} Updated match record
 */
export async function submitResult({ matchId, body, isOrganizer, submitterPlayerId }) {
  const updatedMatch = await prisma.$transaction(async (tx) => {
    // Read the match inside the transaction for serialized access
    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: {
        pair1: {
          include: {
            player1: true,
            player2: true
          }
        },
        pair2: {
          include: {
            player1: true,
            player2: true
          }
        }
      }
    });

    if (!match) {
      throwError(404, 'MATCH_NOT_FOUND', 'Match not found');
    }

    // Participant check — players must be in the match
    if (!isOrganizer) {
      if (!isMatchParticipant(match, submitterPlayerId)) {
        throwError(403, 'NOT_PARTICIPANT', 'You are not a participant in this match');
      }
    }

    // Organizer-lock check — once an organizer has set the result, players cannot modify it
    if (!isOrganizer && match.result) {
      let existingResult;
      try {
        existingResult = JSON.parse(match.result);
      } catch {
        existingResult = null;
      }

      if (existingResult?.submittedBy === 'ORGANIZER') {
        throwError(403, 'ORGANIZER_LOCKED', 'Result confirmed by organizer — no further player edits allowed');
      }
    }

    // Build canonical result JSON — submittedBy is always server-derived
    let resultJson;

    if (body.outcome) {
      // Special outcome path (organizer only — enforced in controller before reaching here)
      resultJson = {
        winner: body.winner,
        submittedBy: 'ORGANIZER',
        sets: [],
        outcome: body.outcome
      };
    } else {
      // Regular scored result path (SETS or BIG_TIEBREAK)
      const mappedSets = body.sets.map((set) => ({
        setNumber: set.setNumber,
        player1Score: set.player1Score,
        player2Score: set.player2Score,
        tiebreakScore: set.tiebreakScore ?? null
      }));

      resultJson = {
        winner: body.winner,
        submittedBy: isOrganizer ? 'ORGANIZER' : 'PLAYER',
        sets: mappedSets,
        outcome: null
      };
    }

    // Write the result atomically
    const updated = await tx.match.update({
      where: { id: matchId },
      data: {
        result: JSON.stringify(resultJson),
        status: 'COMPLETED',
        completedAt: new Date(),
        updatedAt: new Date()
      },
      select: {
        id: true,
        matchNumber: true,
        roundId: true,
        bracketId: true,
        tournamentId: true,
        player1Id: true,
        player2Id: true,
        pair1Id: true,
        pair2Id: true,
        isBye: true,
        result: true,
        status: true,
        completedAt: true,
        updatedAt: true
      }
    });

    // Extract winner ID from the result JSON
    const parsedResult = JSON.parse(updated.result);
    const winnerId = parsedResult.winner === 'PLAYER1' ? updated.player1Id : updated.player2Id;

    // Advance bracket slot: populate next-round match with the winner
    await advanceBracketSlot(tx, updated, winnerId);

    // Route main bracket loser to consolation slot (MATCH_2 tournaments only)
    await routeLoserToConsolation(tx, updated, winnerId, isOrganizer);

    // Detect tournament completion (organizer-only)
    await checkAndCompleteTournament(tx, updated.tournamentId, isOrganizer);

    return updated;
  });

  return updatedMatch;
}
