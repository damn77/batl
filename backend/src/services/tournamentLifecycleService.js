/**
 * Tournament Lifecycle Service
 *
 * Manages tournament status transitions and bracket slot advancement:
 *   - startTournament: SCHEDULED → IN_PROGRESS transition
 *   - advanceBracketSlot: Populate next-round match slot with winner
 *   - checkAndCompleteTournament: Detect and set COMPLETED status when all matches done
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
 * For doubles, also advances the pair slot (pair1Id / pair2Id) alongside player slot.
 *
 * @param {Object} tx - Prisma transaction client
 * @param {Object} updatedMatch - Match record (must include roundId, isBye, matchNumber, player1Id, player2Id, pair1Id, pair2Id, result)
 * @param {string} winnerId - PlayerProfile ID of the winner
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

  // Compute next-round match slot
  const nextMatchNumber = Math.ceil(updatedMatch.matchNumber / 2);
  const isOdd = updatedMatch.matchNumber % 2 === 1;

  // Find the target match in the next round
  const nextMatch = await tx.match.findFirst({
    where: { roundId: nextRound.id, matchNumber: nextMatchNumber }
  });

  if (!nextMatch) return;

  // Determine pair advancement for doubles matches
  let resultJson;
  try {
    resultJson = JSON.parse(updatedMatch.result);
  } catch {
    resultJson = null;
  }

  const winnerIsPlayer1 = resultJson?.winner === 'PLAYER1';
  const winnerPairId = winnerIsPlayer1 ? updatedMatch.pair1Id : updatedMatch.pair2Id;

  // Update the next match — place winner in correct slot
  const updateData = isOdd
    ? { player1Id: winnerId, pair1Id: winnerPairId ?? undefined }
    : { player2Id: winnerId, pair2Id: winnerPairId ?? undefined };

  // If winnerPairId is null (singles), exclude pair field from update to avoid overwriting
  if (isOdd) {
    if (winnerPairId !== null && winnerPairId !== undefined) {
      updateData.pair1Id = winnerPairId;
    } else {
      delete updateData.pair1Id;
    }
  } else {
    if (winnerPairId !== null && winnerPairId !== undefined) {
      updateData.pair2Id = winnerPairId;
    } else {
      delete updateData.pair2Id;
    }
  }

  await tx.match.update({
    where: { id: nextMatch.id },
    data: updateData
  });
}

/**
 * Check if all MAIN-bracket non-BYE matches are COMPLETED.
 * If so, transition the tournament to COMPLETED status.
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

  // Count MAIN-bracket non-BYE matches that are not yet COMPLETED
  const incompleteCount = await tx.match.count({
    where: {
      tournamentId,
      bracket: { bracketType: 'MAIN' },
      isBye: false,
      status: { not: 'COMPLETED' }
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
