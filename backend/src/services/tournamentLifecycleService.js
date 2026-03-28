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

import prisma from '../lib/prisma.js';

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
 * Includes bracket integrity validation (DRAW-06):
 *   - Tournament must have a bracket generated → NO_BRACKET
 *   - Every non-BYE Round 1 slot must be filled → INCOMPLETE_BRACKET
 *   - All registered players/pairs must appear in the bracket → INCOMPLETE_BRACKET
 *   - No player/pair may appear in multiple bracket positions → INCOMPLETE_BRACKET
 *
 * This validation applies to both seeded and manual draw modes (safety net).
 *
 * @param {string} tournamentId - UUID of the tournament to start
 * @returns {Promise<Object>} Updated tournament record (id, status)
 */
export async function startTournament(tournamentId) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      status: true,
      formatType: true,
      categoryId: true,
      category: { select: { type: true } }
    }
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

  const categoryType = tournament.category?.type;
  const isDoubles = categoryType === 'DOUBLES';

  // --- Format-specific readiness checks ---
  if (tournament.formatType === 'GROUP' || tournament.formatType === 'COMBINED') {
    // GROUP and COMBINED formats start with group stage — require groups, not brackets
    const groupCount = await prisma.group.count({ where: { tournamentId } });
    if (groupCount === 0) {
      throwError(400, 'NO_GROUPS', 'No groups have been generated for this tournament. Generate the group draw first.');
    }

    // Verify group matches exist
    const groupIds = (await prisma.group.findMany({
      where: { tournamentId },
      select: { id: true }
    })).map(g => g.id);

    const matchCount = await prisma.match.count({
      where: { groupId: { in: groupIds } }
    });

    if (matchCount === 0) {
      throwError(400, 'NO_MATCHES', 'Groups exist but no matches have been generated.');
    }
  } else {
    // KNOCKOUT (and other bracket-first formats) — bracket integrity check (DRAW-06)

    // Load all registered entities for this tournament
    let registeredIds;
    if (isDoubles) {
      const pairRegs = await prisma.pairRegistration.findMany({
        where: { tournamentId, status: 'REGISTERED' },
        select: { pairId: true }
      });
      registeredIds = pairRegs.map(r => r.pairId);
    } else {
      const playerRegs = await prisma.tournamentRegistration.findMany({
        where: { tournamentId, status: 'REGISTERED' },
        select: { playerId: true }
      });
      registeredIds = playerRegs.map(r => r.playerId);
    }

    // Find the MAIN bracket
    const mainBracket = await prisma.bracket.findFirst({
      where: { tournamentId, bracketType: 'MAIN' }
    });

    if (!mainBracket) {
      throwError(400, 'NO_BRACKET', 'No bracket has been generated for this tournament');
    }

    // Find Round 1
    const round1 = await prisma.round.findFirst({
      where: { bracketId: mainBracket.id, roundNumber: 1 }
    });

    if (!round1) {
      throwError(400, 'NO_BRACKET', 'No bracket has been generated for this tournament');
    }

    // Load ALL Round 1 matches (for placed-entities check including BYE matches)
    const allRound1Matches = await prisma.match.findMany({
      where: { roundId: round1.id },
      select: { player1Id: true, player2Id: true, pair1Id: true, pair2Id: true, isBye: true }
    });

    // Collect all entity IDs placed in Round 1 (both slots of all matches)
    const placedIds = [];
    for (const match of allRound1Matches) {
      if (isDoubles) {
        if (match.pair1Id) placedIds.push(match.pair1Id);
        if (match.pair2Id) placedIds.push(match.pair2Id);
      } else {
        if (match.player1Id) placedIds.push(match.player1Id);
        if (match.player2Id) placedIds.push(match.player2Id);
      }
    }

    // Check integrity: every non-BYE Round 1 slot must be filled
    const nonByeMatches = allRound1Matches.filter(m => !m.isBye);
    const emptySlotMatches = nonByeMatches.filter(m => {
      if (isDoubles) return !m.pair1Id || !m.pair2Id;
      return !m.player1Id || !m.player2Id;
    });

    // Find registered entities that are NOT placed anywhere in the bracket
    const placedSet = new Set(placedIds);
    const unplacedList = registeredIds.filter(id => !placedSet.has(id));

    // Check for duplicate placements (entity in multiple positions)
    const seenIds = new Set();
    const duplicateIds = [];
    for (const id of placedIds) {
      if (seenIds.has(id)) {
        if (!duplicateIds.includes(id)) duplicateIds.push(id);
      } else {
        seenIds.add(id);
      }
    }

    // If any integrity check fails, throw INCOMPLETE_BRACKET
    if (emptySlotMatches.length > 0 || unplacedList.length > 0 || duplicateIds.length > 0) {
      const err = new Error('Bracket is incomplete — not all players/pairs are placed');
      err.statusCode = 400;
      err.code = 'INCOMPLETE_BRACKET';
      err.details = {
        unplacedPlayers: unplacedList.map(id => ({ id })),
        duplicatePlacements: duplicateIds.map(id => ({ id })),
        emptySlotCount: emptySlotMatches.length,
        placedCount: placedSet.size,
        totalRequired: registeredIds.length
      };
      throw err;
    }
  }

  // All checks passed — transition to IN_PROGRESS
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

  // Carry the winner's seed to the next round (snapshot from draw generation time)
  const winnerSeed = winnerIsPlayer1 ? updatedMatch.player1Seed : updatedMatch.player2Seed;
  const winnerPairSeed = winnerIsPlayer1 ? updatedMatch.pair1Seed : updatedMatch.pair2Seed;

  // Build update payload — doubles and singles are mutually exclusive:
  //   Doubles (winnerPairId set): write only pair slot; player slot stays null
  //   Singles (winnerPairId null): write only player slot; pair slot stays null
  // Writing winnerId (a pairId) into player1Id/player2Id would violate the PlayerProfile FK.
  let updateData;
  if (winnerPairId) {
    // Doubles: advance the pair slot only (carry seed too)
    updateData = isOdd
      ? { pair1Id: winnerPairId, pair1Seed: winnerPairSeed ?? null }
      : { pair2Id: winnerPairId, pair2Seed: winnerPairSeed ?? null };
  } else {
    // Singles: advance the player slot only (carry seed too)
    updateData = isOdd
      ? { player1Id: winnerId, player1Seed: winnerSeed ?? null }
      : { player2Id: winnerId, player2Seed: winnerSeed ?? null };
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
    // COMBINED format guard: if no knockout bracket exists, group stage is done
    // but tournament must stay IN_PROGRESS until knockout is generated and played
    const tournament = await tx.tournament.findUnique({
      where: { id: tournamentId },
      select: { formatType: true }
    });

    if (tournament?.formatType === 'COMBINED') {
      // Phase 30: multi-bracket completion guard
      // Count all brackets for this tournament (may include MAIN + SECONDARY)
      const bracketCount = await tx.bracket.count({
        where: { tournamentId }
      });
      if (bracketCount === 0) {
        return; // Group stage complete but knockout not yet generated -- stay IN_PROGRESS
      }
      // If any brackets exist, the existing incompleteCount check (above) already
      // ensures all non-BYE matches across ALL brackets are complete before reaching here.
      // No additional per-bracket check needed.
    }

    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        status: 'COMPLETED',
        lastStatusChange: new Date()
      }
    });
  }
}
