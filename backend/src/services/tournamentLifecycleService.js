/**
 * Tournament Lifecycle Service
 *
 * Manages tournament status transitions and bracket slot advancement:
 *   - startTournament: SCHEDULED → IN_PROGRESS transition
 *   - advanceBracketSlot: Populate next-round match slot with winner
 *   - checkAndCompleteTournament: Detect and set COMPLETED when all brackets' matches are done
 *
 * Feature: 02-tournament-lifecycle-and-bracket-progression (Plan 01)
 *
 * Exports:
 *   - startTournament(tournamentId)
 *   - advanceBracketSlot(tx, updatedMatch, winnerId)
 *   - checkAndCompleteTournament(tx, tournamentId, isOrganizer)
 */

import { PrismaClient } from '@prisma/client';

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
 * Start a tournament — transitions status from SCHEDULED → IN_PROGRESS.
 *
 * Registration closure is automatic because tournamentRegistrationService
 * already throws 400 on non-SCHEDULED tournaments.
 *
 * @param {string} tournamentId - UUID of the tournament to start
 * @returns {Promise<Object>} Updated tournament record (id, status)
 */
export async function startTournament(tournamentId) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, status: true }
  });

  if (!tournament) {
    throwError(404, 'TOURNAMENT_NOT_FOUND', 'Tournament not found');
  }

  if (tournament.status !== 'SCHEDULED') {
    throwError(
      400,
      'INVALID_STATUS_TRANSITION',
      `Cannot start a tournament with status ${tournament.status}`
    );
  }

  const updated = await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      status: 'IN_PROGRESS',
      registrationClosed: true,
      lastStatusChange: new Date()
    },
    select: { id: true, status: true }
  });

  return updated;
}

/**
 * Advance the bracket slot: populate the winner's slot in the next-round match.
 *
 * Called inside a Prisma transaction after every match result write.
 * Skips gracefully when:
 *   - Match is not a bracket match (no roundId)
 *   - Match is a BYE (advancement handled at bracket creation)
 *   - No next round exists (final round)
 *   - No target match found in next round
 *
 * For doubles, advances only the pair slot (pair1Id/pair2Id) — winnerId is a
 * DoublesPair UUID and must NOT be written into player1Id/player2Id (PlayerProfile FK).
 * For singles, advances only the player slot (player1Id/player2Id).
 *
 * @param {Object} tx - Prisma transaction client
 * @param {Object} updatedMatch - Match record (must include roundId, isBye, matchNumber, player1Id, player2Id, pair1Id, pair2Id, result)
 * @param {string} winnerId - DoublesPair UUID (doubles) or PlayerProfile UUID (singles)
 */
export async function advanceBracketSlot(tx, updatedMatch, winnerId) {
  // Guard 1: Not a bracket match — skip
  if (!updatedMatch.roundId) return;

  // Guard 2: BYE match — advancement handled at bracket creation, skip
  if (updatedMatch.isBye) return;

  // Read the current round
  const currentRound = await tx.round.findUnique({
    where: { id: updatedMatch.roundId },
    select: { roundNumber: true, bracketId: true, tournamentId: true }
  });

  if (!currentRound) return;

  // Find the next round in the same bracket
  const nextRound = await tx.round.findFirst({
    where: {
      tournamentId: currentRound.tournamentId,
      bracketId: currentRound.bracketId,
      roundNumber: currentRound.roundNumber + 1
    }
  });

  // No next round — this was the final round, nothing to advance to
  if (!nextRound) return;

  // Determine position of this match within its round (sorted by matchNumber).
  // matchNumbers are globally sequential across all rounds, so we cannot use
  // Math.ceil(matchNumber / 2) directly — instead find the round-local index.
  const currentRoundMatches = await tx.match.findMany({
    where: { roundId: updatedMatch.roundId },
    orderBy: { matchNumber: 'asc' },
    select: { id: true }
  });

  const posInRound = currentRoundMatches.findIndex(m => m.id === updatedMatch.id);
  if (posInRound < 0) return;

  const nextPosInRound = Math.floor(posInRound / 2);
  const isOdd = posInRound % 2 === 0; // even position → player1 slot, odd position → player2 slot

  // Find the target match in the next round by position
  const nextRoundMatches = await tx.match.findMany({
    where: { roundId: nextRound.id },
    orderBy: { matchNumber: 'asc' },
    select: { id: true }
  });

  const nextMatch = nextRoundMatches[nextPosInRound];
  if (!nextMatch) return;

  // Determine pair advancement for doubles matches
  let resultJson;
  try {
    resultJson = JSON.parse(updatedMatch.result);
  } catch {
    resultJson = null;
  }

  // Determine which side the winner is on.
  // Primary source: resultJson.winner (set for normal result submissions).
  // Fallback: compare winnerId against the match's pair/player slots directly.
  // This fallback is required when advanceBracketSlot is called without a result
  // (e.g., from consolationOptOutService where the match has no result yet).
  let winnerIsPlayer1;
  if (resultJson?.winner === 'PLAYER1' || resultJson?.winner === 'PLAYER2') {
    winnerIsPlayer1 = resultJson.winner === 'PLAYER1';
  } else {
    // Derive from winnerId position in the match slots
    winnerIsPlayer1 = updatedMatch.pair1Id === winnerId || updatedMatch.player1Id === winnerId;
  }

  const winnerPairId = winnerIsPlayer1 ? updatedMatch.pair1Id : updatedMatch.pair2Id;

  // Build update payload — doubles and singles are mutually exclusive:
  //   Doubles (winnerPairId set): write only pair slot; player slot stays null
  //   Singles (winnerPairId null): write only player slot; pair slot stays null
  // Writing winnerId (a pairId) into player1Id/player2Id would violate the PlayerProfile FK.
  let updateData;
  if (winnerPairId) {
    // Doubles: advance the pair slot only
    updateData = isOdd ? { pair1Id: winnerPairId } : { pair2Id: winnerPairId };
  } else {
    // Singles: advance the player slot only
    updateData = isOdd ? { player1Id: winnerId } : { player2Id: winnerId };
  }

  await tx.match.update({
    where: { id: nextMatch.id },
    data: updateData
  });
}

/**
 * Check if all non-BYE matches across ALL brackets (MAIN + CONSOLATION) are
 * in a terminal state. If so, transition the tournament to COMPLETED status.
 *
 * Terminal states: COMPLETED, CANCELLED.
 * BYE matches are excluded by the isBye: false filter (they are never "incomplete").
 * SCHEDULED and IN_PROGRESS are incomplete — the tournament is not done yet.
 *
 * Only fires when the organizer submits a result — player submissions
 * never trigger tournament completion.
 *
 * @param {Object} tx - Prisma transaction client
 * @param {string} tournamentId - UUID of the tournament
 * @param {boolean} isOrganizer - true if the submitter is ADMIN or ORGANIZER
 */
export async function checkAndCompleteTournament(tx, tournamentId, isOrganizer) {
  // Guard: Only organizer result triggers COMPLETED
  if (!isOrganizer) return;

  // Count matches that are not yet in a terminal state across ALL brackets.
  // Terminal states: COMPLETED, CANCELLED, BYE (BYE already excluded by isBye:false).
  // A match with status SCHEDULED or IN_PROGRESS is incomplete.
  const incompleteCount = await tx.match.count({
    where: {
      tournamentId,
      isBye: false,
      status: { notIn: ['COMPLETED', 'CANCELLED'] }
    }
  });

  if (incompleteCount === 0) {
    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        status: 'COMPLETED',
        lastStatusChange: new Date()
      }
    });
  }
}
