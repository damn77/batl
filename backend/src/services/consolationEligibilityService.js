/**
 * Consolation Eligibility Service
 *
 * Manages loser routing to the consolation bracket for MATCH_2 tournaments:
 *   - getRealMatchCount(): count competitive matches a player/pair has played
 *   - isConsolationEligible(): check if player/pair qualifies for consolation
 *   - routeLoserToConsolation(): place the loser of a MAIN R1 match into consolation R1
 *
 * Real-match counting rules (Phase 5, CONTEXT.md):
 *   - Does NOT count: BYE (isBye=true), CANCELLED status, FORFEIT outcome,
 *     NO_SHOW outcome, WALKOVER outcome
 *   - DOES count as 1: RETIRED outcome (play started before retirement)
 *   - DOES count as 1: COMPLETED status with a scored result
 *
 * Feature: Phase 05 - Loser Routing and Consolation Progression (Plan 02)
 *
 * Exports:
 *   - getRealMatchCount(tx, tournamentId, playerId, pairId)
 *   - isConsolationEligible(tx, tournamentId, playerId, pairId)
 *   - routeLoserToConsolation(tx, completedMatch, winnerId, isOrganizer)
 */

import { advanceBracketSlot } from './tournamentLifecycleService.js';

/**
 * Count the number of real (competitive) matches a player/pair has played
 * in a given tournament. Called inside a Prisma transaction (tx).
 *
 * A "real match" is one where competitive play actually started.
 *
 * Excluded from real-match count:
 *   - BYE matches (isBye = true)
 *   - CANCELLED status
 *   - FORFEIT outcome (result JSON outcome === 'FORFEIT')
 *   - NO_SHOW outcome (result JSON outcome === 'NO_SHOW')
 *   - WALKOVER outcome (result JSON outcome === 'WALKOVER')
 *
 * Counted as 1 real match:
 *   - RETIRED outcome (play started before retirement)
 *   - COMPLETED status with a scored result (normal win/loss)
 *
 * @param {Object} tx - Prisma transaction client
 * @param {string} tournamentId
 * @param {string|null} playerId - PlayerProfile ID (singles)
 * @param {string|null} pairId - DoublesPair ID (doubles)
 * @returns {Promise<number>} count of real matches played
 */
export async function getRealMatchCount(tx, tournamentId, playerId, pairId) {
  // Build the participant filter — match on either player slot (player1 or player2)
  // or pair slot (pair1 or pair2) depending on the tournament type.
  let participantFilter;
  if (pairId) {
    participantFilter = {
      OR: [{ pair1Id: pairId }, { pair2Id: pairId }]
    };
  } else if (playerId) {
    participantFilter = {
      OR: [{ player1Id: playerId }, { player2Id: playerId }]
    };
  } else {
    return 0;
  }

  // Fetch all completed matches (terminal states) for this player/pair in the tournament.
  // We fetch result JSON so we can inspect the outcome field for special outcomes.
  const matches = await tx.match.findMany({
    where: {
      tournamentId,
      ...participantFilter,
      // Only terminal matches matter — SCHEDULED/IN_PROGRESS have not been played
      status: { in: ['COMPLETED', 'CANCELLED', 'BYE'] }
    },
    select: {
      id: true,
      isBye: true,
      status: true,
      result: true
    }
  });

  let realCount = 0;

  for (const match of matches) {
    // Exclude BYE matches (never competitive)
    if (match.isBye) continue;

    // Exclude CANCELLED status (match never played)
    if (match.status === 'CANCELLED') continue;

    // Parse result JSON to inspect outcome
    let outcome = null;
    if (match.result) {
      try {
        const parsed = JSON.parse(match.result);
        outcome = parsed.outcome ?? null;
      } catch {
        // malformed JSON — treat as normal match
      }
    }

    // Exclude non-competitive special outcomes
    if (outcome === 'FORFEIT') continue;
    if (outcome === 'NO_SHOW') continue;
    if (outcome === 'WALKOVER') continue;

    // RETIRED counts as 1 real match (play started)
    // COMPLETED (normal result, outcome=null) also counts as 1 real match
    realCount += 1;
  }

  return realCount;
}

/**
 * Returns true if the player/pair is eligible for consolation (< 2 real matches).
 *
 * @param {Object} tx - Prisma transaction client
 * @param {string} tournamentId
 * @param {string|null} playerId - PlayerProfile ID (singles)
 * @param {string|null} pairId - DoublesPair ID (doubles)
 * @returns {Promise<boolean>}
 */
export async function isConsolationEligible(tx, tournamentId, playerId, pairId) {
  const count = await getRealMatchCount(tx, tournamentId, playerId, pairId);
  return count < 2;
}

/**
 * Route the loser of a completed MAIN bracket match to their consolation slot.
 *
 * Called inside the matchResultService Prisma transaction immediately after
 * the main bracket winner is advanced (advanceBracketSlot).
 *
 * Logic:
 *  1. Verify the completed match is in the MAIN bracket — if not, return early.
 *  2. Verify the match is Round 1 — only R1 losers go to consolation R1
 *     (R2+ losers have ≥2 real matches and are ineligible anyway).
 *  3. Find the consolation bracket for the tournament — if none, return early (MATCH_1).
 *  4. Determine the loserId (player/pair that did NOT win).
 *  5. Check for RETIRED outcome — auto-create ConsolationOptOut with recordedBy='AUTO',
 *     do NOT place the player in consolation.
 *  6. Check if loser has a ConsolationOptOut — if yes, skip placement (treat slot as
 *     permanently empty; auto-BYE logic below will handle the paired slot).
 *  7. Check real-match count — if ≥ 2, return early.
 *  8. Find the target consolation R1 match via mirror-draw rule:
 *       posInRound (0-indexed in main R1) → consolation match = Math.floor(posInRound / 2)
 *       isPlayer1Slot = posInRound % 2 === 0
 *  9. Check if the target slot is already filled — throw CONSOLATION_SLOT_CONFLICT if so.
 * 10. Fill the slot with loserId.
 * 11. After filling, check if the paired main match is a BYE (permanent empty slot).
 *     If so, mark the consolation match as BYE and advance the lone player via advanceBracketSlot.
 *
 * @param {Object} tx - Prisma transaction client
 * @param {Object} completedMatch - The just-completed match record
 * @param {string} winnerId - PlayerProfile ID of the winner (from parsed result JSON)
 * @param {boolean} isOrganizer - Passed through for conditional logic
 * @returns {Promise<void>}
 */
export async function routeLoserToConsolation(tx, completedMatch, winnerId, isOrganizer) {
  // Step 1: Verify this match belongs to the MAIN bracket
  const bracket = await tx.bracket.findUnique({
    where: { id: completedMatch.bracketId },
    select: { id: true, bracketType: true }
  });

  if (!bracket || bracket.bracketType !== 'MAIN') {
    // Not a main bracket match — consolation advancement handles its own matches
    return;
  }

  // Step 2: Verify this is Round 1 (only R1 losers are routed to consolation R1)
  const currentRound = await tx.round.findUnique({
    where: { id: completedMatch.roundId },
    select: { roundNumber: true }
  });

  if (!currentRound || currentRound.roundNumber !== 1) {
    // R2+ losers have already played ≥2 real matches; they're not consolation eligible
    return;
  }

  // Step 3: Find the consolation bracket for this tournament
  const consolationBracket = await tx.bracket.findFirst({
    where: {
      tournamentId: completedMatch.tournamentId,
      bracketType: 'CONSOLATION'
    },
    select: { id: true }
  });

  if (!consolationBracket) {
    // MATCH_1 tournament — no consolation bracket; nothing to do
    return;
  }

  // Step 4: Determine loserId
  // Parse result to find winner, then loser is the other player/pair
  let parsedResult;
  try {
    parsedResult = JSON.parse(completedMatch.result);
  } catch {
    // Malformed result — cannot determine loser; bail out gracefully
    return;
  }

  const winnerIsPlayer1 = parsedResult.winner === 'PLAYER1';
  const loserId = winnerIsPlayer1 ? completedMatch.player2Id : completedMatch.player1Id;
  const loserPairId = winnerIsPlayer1 ? completedMatch.pair2Id : completedMatch.pair1Id;
  const outcome = parsedResult.outcome ?? null;

  // Determine the effective entity ID (singles = playerId, doubles = pairId)
  const entityId = loserPairId ?? loserId;

  if (!entityId) {
    // Safety: no loser could be determined (e.g., BYE match — should not reach here)
    return;
  }

  // Step 5: RETIRED outcome — auto-opt-out the retiring player from consolation
  // The retiring player gets 1 real match counted and is automatically ineligible
  // for consolation per the CONTEXT.md business rule.
  if (outcome === 'RETIRED') {
    // Create ConsolationOptOut with recordedBy='AUTO' (ignore unique-constraint errors
    // in case this has already been recorded — use upsert pattern)
    try {
      await tx.consolationOptOut.create({
        data: {
          tournamentId: completedMatch.tournamentId,
          playerId: loserId || null,
          pairId: loserPairId || null,
          recordedBy: 'AUTO'
        }
      });
    } catch {
      // Already opted out — ignore duplicate; still skip consolation placement
    }
    // Do NOT place the RETIRED player in consolation; their slot stays empty.
    // The auto-BYE detection below will handle the other player in the pair.
    return;
  }

  // Step 6: Check if loser has a ConsolationOptOut
  const optOutFilter = loserPairId
    ? { tournamentId: completedMatch.tournamentId, pairId: loserPairId }
    : { tournamentId: completedMatch.tournamentId, playerId: loserId };

  const existingOptOut = await tx.consolationOptOut.findFirst({
    where: optOutFilter,
    select: { id: true }
  });

  if (existingOptOut) {
    // Loser opted out — treat their consolation slot as permanently empty.
    // The auto-BYE check that follows will advance the other slot if it becomes lonely.
    return;
  }

  // Step 7: Check real-match count — if ≥ 2, not eligible
  const realCount = await getRealMatchCount(
    tx,
    completedMatch.tournamentId,
    loserId,
    loserPairId
  );
  if (realCount >= 2) {
    return;
  }

  // Step 8: Find the mirror-draw consolation match
  //
  // Main R1 matches are sorted by matchNumber ascending (positions 0, 1, 2, 3, ...).
  // posInRound (0-indexed) maps to:
  //   consolation match index = Math.floor(posInRound / 2)
  //   isPlayer1Slot = posInRound % 2 === 0
  //
  // Main matches 0,1 → consolation match 0 (positions 0=player1, 1=player2)
  // Main matches 2,3 → consolation match 1 (positions 0=player1, 1=player2)
  // etc.

  const mainR1Matches = await tx.match.findMany({
    where: { roundId: completedMatch.roundId },
    orderBy: { matchNumber: 'asc' },
    select: { id: true, isBye: true }
  });

  const posInRound = mainR1Matches.findIndex(m => m.id === completedMatch.id);
  if (posInRound < 0) {
    // Match not found in its own round — data inconsistency; bail
    return;
  }

  const consolationMatchIndex = Math.floor(posInRound / 2);
  const isPlayer1Slot = posInRound % 2 === 0;

  // Find consolation R1
  const consolationR1Round = await tx.round.findFirst({
    where: {
      bracketId: consolationBracket.id,
      roundNumber: 1
    },
    select: { id: true }
  });

  if (!consolationR1Round) {
    return;
  }

  const consolationR1Matches = await tx.match.findMany({
    where: { roundId: consolationR1Round.id },
    orderBy: { matchNumber: 'asc' },
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

  const targetConsolationMatch = consolationR1Matches[consolationMatchIndex];
  if (!targetConsolationMatch) {
    return;
  }

  // Step 9: Check if the target consolation slot is already filled — throw conflict
  const slotField = isPlayer1Slot ? (loserPairId ? 'pair1Id' : 'player1Id') : (loserPairId ? 'pair2Id' : 'player2Id');
  const currentSlotValue = targetConsolationMatch[slotField];

  if (currentSlotValue !== null && currentSlotValue !== undefined) {
    const err = new Error(`Consolation slot ${slotField} in match ${targetConsolationMatch.id} is already occupied`);
    err.code = 'CONSOLATION_SLOT_CONFLICT';
    err.statusCode = 409;
    throw err;
  }

  // Step 10: Fill the consolation slot with the loser's ID
  const updateData = {};
  if (loserPairId) {
    // Doubles: update pair slot AND the representative player slot
    if (isPlayer1Slot) {
      updateData.pair1Id = loserPairId;
      if (loserId) updateData.player1Id = loserId;
    } else {
      updateData.pair2Id = loserPairId;
      if (loserId) updateData.player2Id = loserId;
    }
  } else {
    // Singles: update player slot only
    if (isPlayer1Slot) {
      updateData.player1Id = loserId;
    } else {
      updateData.player2Id = loserId;
    }
  }

  const updatedConsolationMatch = await tx.match.update({
    where: { id: targetConsolationMatch.id },
    data: updateData,
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

  // Step 11: Auto-BYE detection — check if the paired main match is a BYE,
  // which means the other consolation slot will NEVER be filled.
  //
  // The paired main match is the other match feeding into the same consolation slot:
  //   if posInRound is even (player1 slot), paired main match is posInRound+1
  //   if posInRound is odd (player2 slot), paired main match is posInRound-1
  const pairedMainMatchIndex = isPlayer1Slot ? posInRound + 1 : posInRound - 1;
  const pairedMainMatch = mainR1Matches[pairedMainMatchIndex];

  if (pairedMainMatch && pairedMainMatch.isBye) {
    // The paired main match is a BYE — the other consolation slot will never be filled.
    // Mark the consolation match as BYE and advance the lone player.

    // Determine the sole player's ID for advanceBracketSlot.
    // For doubles, use the pair ID as the advancement key (advanceBracketSlot accepts pairId).
    // For singles, use player1Id/player2Id. Fall back to player slot if pair slot is missing.
    const solePlayerId = loserPairId
      ? (isPlayer1Slot
          ? (updatedConsolationMatch.pair1Id || updatedConsolationMatch.player1Id || null)
          : (updatedConsolationMatch.pair2Id || updatedConsolationMatch.player2Id || null))
      : (isPlayer1Slot
          ? (updatedConsolationMatch.player1Id || null)
          : (updatedConsolationMatch.player2Id || null));

    const byeConsolationMatch = await tx.match.update({
      where: { id: updatedConsolationMatch.id },
      data: {
        status: 'BYE',
        isBye: true
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

    // Advance the lone player to the next consolation round
    await advanceBracketSlot(tx, byeConsolationMatch, solePlayerId);
  }
}
