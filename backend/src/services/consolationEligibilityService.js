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
 *   - checkBYEWinnerConsolationUpdate(tx, completedMatch, winnerId)
 *   - clearConsolationRouting(tx, tournamentId, entityId, isDoubles)
 *   - cascadeClearMainBracket(tx, bracketId, sourceMatchId, winnerId, winnerIsDoubles)
 *   - cascadeClearConsolationDownstream(tx, consolationBracketId, sourceMatchId, winnerId, winnerIsDoubles)
 */

import { advanceBracketSlot } from './tournamentLifecycleService.js';

/**
 * Cascade-clear the winner of a consolation match from all subsequent consolation rounds.
 *
 * Called after a main bracket match result changes (winner changed), to undo the
 * advancement of whoever won the affected consolation match before re-routing.
 *
 * @param {Object} tx - Prisma transaction client
 * @param {string} consolationBracketId - Consolation bracket ID
 * @param {string} sourceMatchId - The consolation match whose winner we're cascading from
 * @param {string} winnerId - The winner who was advanced (player or pair UUID)
 * @param {boolean} winnerIsDoubles - true if winnerId is a pair UUID
 */
async function cascadeClearWinnerFromNextRounds(tx, consolationBracketId, sourceMatchId, winnerId, winnerIsDoubles) {
  // Find the round number of the source match to limit search to higher rounds
  const sourceMatch = await tx.match.findUnique({
    where: { id: sourceMatchId },
    select: { roundId: true }
  });
  if (!sourceMatch) return;

  const sourceRound = await tx.round.findUnique({
    where: { id: sourceMatch.roundId },
    select: { roundNumber: true }
  });
  if (!sourceRound) return;

  // Find winnerId in any consolation match at a HIGHER round number
  const whereClause = {
    bracketId: consolationBracketId,
    round: { roundNumber: { gt: sourceRound.roundNumber } },
    ...(winnerIsDoubles
      ? { OR: [{ pair1Id: winnerId }, { pair2Id: winnerId }] }
      : { OR: [{ player1Id: winnerId }, { player2Id: winnerId }] })
  };

  const nextMatch = await tx.match.findFirst({
    where: whereClause,
    orderBy: { matchNumber: 'asc' },
    select: {
      id: true, roundId: true, result: true, status: true, isBye: true, completedAt: true,
      player1Id: true, player2Id: true, pair1Id: true, pair2Id: true
    }
  });

  if (!nextMatch) return; // Winner not found in higher consolation rounds

  // Determine if this match also produced a winner who advanced further
  let furtherWinnerId = null;
  let furtherWinnerIsDoubles = false;

  if (nextMatch.isBye) {
    // Sole player was auto-advanced — find who it is
    if (nextMatch.pair1Id) { furtherWinnerId = nextMatch.pair1Id; furtherWinnerIsDoubles = true; }
    else if (nextMatch.player1Id) { furtherWinnerId = nextMatch.player1Id; }
    else if (nextMatch.pair2Id) { furtherWinnerId = nextMatch.pair2Id; furtherWinnerIsDoubles = true; }
    else if (nextMatch.player2Id) { furtherWinnerId = nextMatch.player2Id; }
  } else if (nextMatch.result) {
    try {
      const parsed = JSON.parse(nextMatch.result);
      if (parsed.winner === 'PLAYER1') {
        furtherWinnerId = nextMatch.pair1Id || nextMatch.player1Id;
        furtherWinnerIsDoubles = !!nextMatch.pair1Id;
      } else if (parsed.winner === 'PLAYER2') {
        furtherWinnerId = nextMatch.pair2Id || nextMatch.player2Id;
        furtherWinnerIsDoubles = !!nextMatch.pair2Id;
      }
    } catch { /* ignore */ }
  }

  // Clear winnerId's slot in this next-round match
  const isInSlot1 = winnerIsDoubles
    ? nextMatch.pair1Id === winnerId
    : nextMatch.player1Id === winnerId;

  const slotClearData = {};
  if (winnerIsDoubles) {
    if (isInSlot1) slotClearData.pair1Id = null;
    else slotClearData.pair2Id = null;
  } else {
    if (isInSlot1) slotClearData.player1Id = null;
    else slotClearData.player2Id = null;
  }

  await tx.match.update({
    where: { id: nextMatch.id },
    data: {
      result: null,
      status: 'SCHEDULED',
      isBye: false,
      completedAt: null,
      ...slotClearData
    }
  });

  // If this match also had a further winner, cascade-clear them too
  if (furtherWinnerId) {
    await cascadeClearWinnerFromNextRounds(tx, consolationBracketId, nextMatch.id, furtherWinnerId, furtherWinnerIsDoubles);
  }
}

/**
 * Cascade-clear the winner of a main bracket match from all subsequent main bracket rounds.
 *
 * Called when an organizer changes the winner of a main bracket match — the old winner
 * was advanced to the next main bracket match and must be removed recursively.
 *
 * Algorithm mirrors cascadeClearWinnerFromNextRounds but operates on the MAIN bracket.
 *
 * @param {Object} tx - Prisma transaction client
 * @param {string} bracketId - Main bracket ID
 * @param {string} sourceMatchId - The match whose winner we're cascading from
 * @param {string} winnerId - The winner who was advanced (player or pair UUID)
 * @param {boolean} winnerIsDoubles - true if winnerId is a pair UUID
 * @returns {Promise<Array>} Array of cleared match objects (for dry-run reporting)
 */
export async function cascadeClearMainBracket(tx, bracketId, sourceMatchId, winnerId, winnerIsDoubles) {
  // Find the round number of the source match
  const sourceMatch = await tx.match.findUnique({
    where: { id: sourceMatchId },
    select: { roundId: true }
  });
  if (!sourceMatch) return [];

  const sourceRound = await tx.round.findUnique({
    where: { id: sourceMatch.roundId },
    select: { roundNumber: true }
  });
  if (!sourceRound) return [];

  // Find winnerId in any main bracket match at a HIGHER round number
  const whereClause = {
    bracketId,
    round: { roundNumber: { gt: sourceRound.roundNumber } },
    ...(winnerIsDoubles
      ? { OR: [{ pair1Id: winnerId }, { pair2Id: winnerId }] }
      : { OR: [{ player1Id: winnerId }, { player2Id: winnerId }] })
  };

  const nextMatch = await tx.match.findFirst({
    where: whereClause,
    orderBy: { matchNumber: 'asc' },
    select: {
      id: true, roundId: true, result: true, status: true, isBye: true, completedAt: true,
      player1Id: true, player2Id: true, pair1Id: true, pair2Id: true
    }
  });

  if (!nextMatch) return []; // Winner not found in higher main bracket rounds

  // Determine if this match also produced a further winner who advanced
  let furtherWinnerId = null;
  let furtherWinnerIsDoubles = false;

  if (nextMatch.isBye) {
    // Sole player was auto-advanced
    if (nextMatch.pair1Id) { furtherWinnerId = nextMatch.pair1Id; furtherWinnerIsDoubles = true; }
    else if (nextMatch.player1Id) { furtherWinnerId = nextMatch.player1Id; }
    else if (nextMatch.pair2Id) { furtherWinnerId = nextMatch.pair2Id; furtherWinnerIsDoubles = true; }
    else if (nextMatch.player2Id) { furtherWinnerId = nextMatch.player2Id; }
  } else if (nextMatch.result) {
    try {
      const parsed = JSON.parse(nextMatch.result);
      if (parsed.winner === 'PLAYER1') {
        furtherWinnerId = nextMatch.pair1Id || nextMatch.player1Id;
        furtherWinnerIsDoubles = !!nextMatch.pair1Id;
      } else if (parsed.winner === 'PLAYER2') {
        furtherWinnerId = nextMatch.pair2Id || nextMatch.player2Id;
        furtherWinnerIsDoubles = !!nextMatch.pair2Id;
      }
    } catch { /* ignore */ }
  }

  // Clear winnerId's slot in the next-round match
  const isInSlot1 = winnerIsDoubles
    ? nextMatch.pair1Id === winnerId
    : nextMatch.player1Id === winnerId;

  const slotClearData = {};
  if (winnerIsDoubles) {
    if (isInSlot1) slotClearData.pair1Id = null;
    else slotClearData.pair2Id = null;
  } else {
    if (isInSlot1) slotClearData.player1Id = null;
    else slotClearData.player2Id = null;
  }

  await tx.match.update({
    where: { id: nextMatch.id },
    data: {
      result: null,
      status: 'SCHEDULED',
      isBye: false,
      completedAt: null,
      ...slotClearData
    }
  });

  const clearedMatches = [nextMatch];

  // If this match also had a further winner, cascade-clear them too
  if (furtherWinnerId) {
    const moreClearedMatches = await cascadeClearMainBracket(
      tx, bracketId, nextMatch.id, furtherWinnerId, furtherWinnerIsDoubles
    );
    clearedMatches.push(...moreClearedMatches);
  }

  return clearedMatches;
}

/**
 * Exported wrapper around cascadeClearWinnerFromNextRounds for consolation bracket.
 *
 * Called when an organizer changes the winner of a consolation bracket match — the old
 * winner must be removed from all subsequent consolation rounds recursively.
 *
 * @param {Object} tx - Prisma transaction client
 * @param {string} consolationBracketId - Consolation bracket ID
 * @param {string} sourceMatchId - The consolation match whose winner we're cascading from
 * @param {string} winnerId - The winner who was advanced (player or pair UUID)
 * @param {boolean} winnerIsDoubles - true if winnerId is a pair UUID
 * @returns {Promise<void>}
 */
export async function cascadeClearConsolationDownstream(tx, consolationBracketId, sourceMatchId, winnerId, winnerIsDoubles) {
  return cascadeClearWinnerFromNextRounds(tx, consolationBracketId, sourceMatchId, winnerId, winnerIsDoubles);
}

/**
 * Clear a player/pair from their consolation slot and cascade-clear any downstream
 * consolation results that depended on them.
 *
 * Called when a main bracket match result is resubmitted with a different winner,
 * so the old loser must be removed from the consolation bracket before re-routing
 * the new loser.
 *
 * @param {Object} tx - Prisma transaction client
 * @param {string} tournamentId - Tournament primary key
 * @param {string} entityId - Player UUID (singles) or Pair UUID (doubles) to clear
 * @param {boolean} isDoubles - true if entityId is a pair UUID
 */
export async function clearConsolationRouting(tx, tournamentId, entityId, isDoubles) {
  // Find consolation bracket
  const consolationBracket = await tx.bracket.findFirst({
    where: { tournamentId, bracketType: 'CONSOLATION' },
    select: { id: true }
  });
  if (!consolationBracket) return;

  // Find the consolation match where entityId occupies a slot (earliest round first)
  const whereClause = {
    bracketId: consolationBracket.id,
    ...(isDoubles
      ? { OR: [{ pair1Id: entityId }, { pair2Id: entityId }] }
      : { OR: [{ player1Id: entityId }, { player2Id: entityId }] })
  };

  const consolationMatch = await tx.match.findFirst({
    where: whereClause,
    orderBy: { matchNumber: 'asc' },
    select: {
      id: true, roundId: true, result: true, status: true, isBye: true, completedAt: true,
      player1Id: true, player2Id: true, pair1Id: true, pair2Id: true
    }
  });

  if (!consolationMatch) return; // Entity not placed in consolation bracket

  // Determine the winner of this consolation match (who may have advanced further)
  let winnerId = null;
  let winnerIsDoubles = false;

  if (consolationMatch.isBye) {
    // Sole player auto-advanced — entityId is the sole player
    winnerId = entityId;
    winnerIsDoubles = isDoubles;
  } else if (consolationMatch.result) {
    try {
      const parsed = JSON.parse(consolationMatch.result);
      if (parsed.winner === 'PLAYER1') {
        winnerId = consolationMatch.pair1Id || consolationMatch.player1Id;
        winnerIsDoubles = !!consolationMatch.pair1Id;
      } else if (parsed.winner === 'PLAYER2') {
        winnerId = consolationMatch.pair2Id || consolationMatch.player2Id;
        winnerIsDoubles = !!consolationMatch.pair2Id;
      }
    } catch { /* ignore */ }
  }

  // Cascade-clear the winner from subsequent consolation rounds (before clearing this match,
  // so the winner's slot in the next round is found and removed first)
  if (winnerId) {
    await cascadeClearWinnerFromNextRounds(tx, consolationBracket.id, consolationMatch.id, winnerId, winnerIsDoubles);
  }

  // Clear entityId's slot and reset match state
  const isInSlot1 = isDoubles
    ? consolationMatch.pair1Id === entityId
    : consolationMatch.player1Id === entityId;

  const slotClearData = {};
  if (isDoubles) {
    if (isInSlot1) slotClearData.pair1Id = null;
    else slotClearData.pair2Id = null;
  } else {
    if (isInSlot1) slotClearData.player1Id = null;
    else slotClearData.player2Id = null;
  }

  await tx.match.update({
    where: { id: consolationMatch.id },
    data: {
      result: null,
      status: 'SCHEDULED',
      isBye: false,
      completedAt: null,
      ...slotClearData
    }
  });
}

/**
 * When the winner of a MAIN R2 match came from a R1 BYE, they will never enter
 * the consolation bracket. If a R1 loser is already waiting in the consolation
 * slot paired to the BYE winner's position, that consolation match will never
 * fill the BYE winner's slot — advance the waiting player and mark the match BYE.
 *
 * Called from matchResultService after every main bracket match result.
 *
 * @param {Object} tx - Prisma transaction client
 * @param {Object} completedMatch - The just-completed match record
 * @param {string} winnerId - ID of the winner (player or pair)
 */
export async function checkBYEWinnerConsolationUpdate(tx, completedMatch, winnerId) {
  // Only relevant for MAIN bracket matches
  const bracket = await tx.bracket.findUnique({
    where: { id: completedMatch.bracketId },
    select: { id: true, bracketType: true }
  });
  if (!bracket || bracket.bracketType !== 'MAIN') return;

  // Only relevant for R2 (R1 BYE players are in R2; R3+ have already passed consolation routing)
  const currentRound = await tx.round.findUnique({
    where: { id: completedMatch.roundId },
    select: { roundNumber: true }
  });
  if (!currentRound || currentRound.roundNumber !== 2) return;

  // Find consolation bracket
  const consolationBracket = await tx.bracket.findFirst({
    where: { tournamentId: completedMatch.tournamentId, bracketType: 'CONSOLATION' },
    select: { id: true }
  });
  if (!consolationBracket) return;

  // Determine the winner's position in the R2 match
  let parsedResult;
  try { parsedResult = JSON.parse(completedMatch.result); } catch { return; }
  const winnerIsPlayer1 = parsedResult.winner === 'PLAYER1';

  // Find the index of this R2 match in R2 (0-based)
  const r2Matches = await tx.match.findMany({
    where: { roundId: completedMatch.roundId },
    orderBy: { matchNumber: 'asc' },
    select: { id: true }
  });
  const posInR2 = r2Matches.findIndex(m => m.id === completedMatch.id);
  if (posInR2 < 0) return;

  // Player1 of R2[k] came from R1[2k]; player2 from R1[2k+1]
  const winnerIsP1InR2 = winnerIsPlayer1;
  const winnerR1Pos = posInR2 * 2 + (winnerIsP1InR2 ? 0 : 1);

  // Find R1 round and check if the winner came from a BYE
  const mainR1Round = await tx.round.findFirst({
    where: { bracketId: bracket.id, roundNumber: 1 },
    select: { id: true }
  });
  if (!mainR1Round) return;

  const mainR1Matches = await tx.match.findMany({
    where: { roundId: mainR1Round.id },
    orderBy: { matchNumber: 'asc' },
    select: { id: true, isBye: true }
  });
  const winnerR1Match = mainR1Matches[winnerR1Pos];
  if (!winnerR1Match || !winnerR1Match.isBye) return;

  // Winner came from a BYE — they won R2 so they won't enter consolation.
  // Find the consolation slot for the winner's R1 BYE position.
  const consolationMatchIndex = Math.floor(winnerR1Pos / 2);
  const winnerConsolationIsP1 = winnerR1Pos % 2 === 0;

  const consolationR1Round = await tx.round.findFirst({
    where: { bracketId: consolationBracket.id, roundNumber: 1 },
    select: { id: true }
  });
  if (!consolationR1Round) return;

  const consolationR1Matches = await tx.match.findMany({
    where: { roundId: consolationR1Round.id },
    orderBy: { matchNumber: 'asc' },
    select: {
      id: true, roundId: true, bracketId: true, matchNumber: true, tournamentId: true,
      isBye: true, result: true, status: true,
      player1Id: true, player2Id: true, pair1Id: true, pair2Id: true
    }
  });
  const consolationMatch = consolationR1Matches[consolationMatchIndex];
  if (!consolationMatch || consolationMatch.isBye || consolationMatch.status === 'BYE') return;

  // The winner's consolation slot should be empty (they won R2, never placed there)
  const winnerSlotFilled = winnerConsolationIsP1
    ? (consolationMatch.pair1Id || consolationMatch.player1Id)
    : (consolationMatch.pair2Id || consolationMatch.player2Id);
  if (winnerSlotFilled) return; // Already filled — nothing to do

  // Check if the "other" consolation slot (the R1 loser's slot) has a waiting player
  const otherIsP1 = !winnerConsolationIsP1;
  const otherSlotValue = otherIsP1
    ? (consolationMatch.pair1Id || consolationMatch.player1Id)
    : (consolationMatch.pair2Id || consolationMatch.player2Id);
  if (!otherSlotValue) return; // Other slot also empty — nothing to advance yet

  // A R1 loser is waiting and the BYE winner won't fill the consolation slot.
  // Advance the waiting player and mark the consolation match as BYE.
  const solePlayerId = otherIsP1
    ? (consolationMatch.pair1Id || consolationMatch.player1Id)
    : (consolationMatch.pair2Id || consolationMatch.player2Id);

  await advanceBracketSlot(tx, consolationMatch, solePlayerId);
  await tx.match.update({
    where: { id: consolationMatch.id },
    data: { status: 'BYE', isBye: true }
  });
}

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
 *  2. Verify round ≤ 2 — R3+ losers have ≥2 real matches and are ineligible.
 *     R2 losers who came from a R1 BYE (1 real match) ARE eligible; their
 *     consolation slot is derived from the R1 BYE position in Step 8.
 *  3. Find the consolation bracket for the tournament — if none, return early (MATCH_1).
 *  4. Determine the loserId (player/pair that did NOT win).
 *  5. Check for RETIRED outcome — auto-create ConsolationOptOut with recordedBy='AUTO'
 *     using upsert (not create+catch) to avoid aborting the PostgreSQL transaction.
 *     Set loserIsOptedOut=true and fall through — if the other consolation slot is
 *     already filled we must trigger the auto-BYE advancement immediately.
 *  6. Check if loser has an existing ConsolationOptOut (manual or AUTO).
 *     Set loserIsOptedOut=true and fall through for the same reason.
 *  7. If loser is NOT opted out, check real-match count — if ≥ 2, return early.
 *  8. Find the target consolation R1 match via mirror-draw rule:
 *       posInRound (0-indexed in main R1) → consolation match = Math.floor(posInRound / 2)
 *       isPlayer1Slot = posInRound % 2 === 0
 *  9. If loser IS opted out: check if the OTHER consolation slot is already filled.
 *     If yes, advance the sole player then mark the consolation match as BYE.
 *     If no, return — the other player will trigger this when their main match completes
 *     (step 11 detects the opt-out at that point).
 * 10. If loser is NOT opted out: check if target slot is already filled — throw
 *     CONSOLATION_SLOT_CONFLICT if so. Fill the slot with loserId.
 * 11. After filling, check if the paired consolation slot will NEVER be filled:
 *     (a) The paired main match is an original BYE (no loser exists), OR
 *     (b) The paired main match is completed and its loser has a ConsolationOptOut.
 *     If so, advance the just-placed player then mark the consolation match as BYE.
 *     NOTE: advanceBracketSlot MUST be called before marking isBye=true — its guard
 *     skips matches with isBye=true, which would prevent advancement if reversed.
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
    return;
  }

  // Step 2: Verify this is Round 1 (only R1 losers are routed to consolation R1)
  const currentRound = await tx.round.findUnique({
    where: { id: completedMatch.roundId },
    select: { roundNumber: true }
  });

  if (!currentRound) return;
  // R3+ losers always have ≥2 real matches and are ineligible for consolation.
  // R2 losers who came from a R1 BYE have only 1 real match — they ARE eligible.
  // The BYE origin is verified in Step 8; non-BYE R2 losers are filtered there.
  if (currentRound.roundNumber > 2) return;

  // Step 3: Find the consolation bracket for this tournament
  const consolationBracket = await tx.bracket.findFirst({
    where: {
      tournamentId: completedMatch.tournamentId,
      bracketType: 'CONSOLATION'
    },
    select: { id: true }
  });

  if (!consolationBracket) {
    return;
  }

  // Step 4: Determine loserId
  let parsedResult;
  try {
    parsedResult = JSON.parse(completedMatch.result);
  } catch {
    return;
  }

  const winnerIsPlayer1 = parsedResult.winner === 'PLAYER1';
  const loserId = winnerIsPlayer1 ? completedMatch.player2Id : completedMatch.player1Id;
  const loserPairId = winnerIsPlayer1 ? completedMatch.pair2Id : completedMatch.pair1Id;
  const outcome = parsedResult.outcome ?? null;

  const entityId = loserPairId ?? loserId;
  if (!entityId) {
    return;
  }

  // Step 5: RETIRED outcome — auto-opt-out using upsert to avoid poisoning the
  // PostgreSQL transaction on duplicate key. A try/catch around create() catches
  // the JS error but leaves the transaction in an aborted state (error 25P02),
  // causing all subsequent tx.* calls to fail.
  // Set loserIsOptedOut=true and fall through — if the other consolation slot is
  // already occupied, the auto-BYE advancement must run immediately.
  let loserIsOptedOut = false;
  if (outcome === 'RETIRED') {
    if (loserPairId) {
      await tx.consolationOptOut.upsert({
        where: {
          tournamentId_pairId: { tournamentId: completedMatch.tournamentId, pairId: loserPairId }
        },
        create: { tournamentId: completedMatch.tournamentId, pairId: loserPairId, playerId: null, recordedBy: 'AUTO' },
        update: {}
      });
    } else if (loserId) {
      await tx.consolationOptOut.upsert({
        where: {
          tournamentId_playerId: { tournamentId: completedMatch.tournamentId, playerId: loserId }
        },
        create: { tournamentId: completedMatch.tournamentId, playerId: loserId, pairId: null, recordedBy: 'AUTO' },
        update: {}
      });
    }
    loserIsOptedOut = true;
  }

  // Step 6: Check if loser has an existing ConsolationOptOut (manual or pre-existing AUTO).
  if (!loserIsOptedOut) {
    const optOutFilter = loserPairId
      ? { tournamentId: completedMatch.tournamentId, pairId: loserPairId }
      : { tournamentId: completedMatch.tournamentId, playerId: loserId };

    const existingOptOut = await tx.consolationOptOut.findFirst({
      where: optOutFilter,
      select: { id: true }
    });

    if (existingOptOut) loserIsOptedOut = true;
  }

  // Step 7: Check real-match count — only relevant for non-opted-out losers
  if (!loserIsOptedOut) {
    const realCount = await getRealMatchCount(
      tx,
      completedMatch.tournamentId,
      loserId,
      loserPairId
    );
    if (realCount >= 2) {
      return;
    }
  }

  // Step 8: Find the mirror-draw consolation match.
  // mainR1Matches includes result + player/pair fields needed for the step 11 opt-out check.
  //
  // posInRound (0-indexed) maps to:
  //   consolation match index = Math.floor(posInRound / 2)
  //   isPlayer1Slot           = posInRound % 2 === 0
  //
  // Main matches 0,1 → consolation match 0 (0=player1, 1=player2)
  // Main matches 2,3 → consolation match 1 (0=player1, 1=player2)
  //
  // For R2 BYE-losers: the completed match is in R2, but we derive the effective R1 position
  // from which BYE match fed the loser. Player1 of R2[k] came from R1[2k]; player2 from R1[2k+1].

  // Determine the R1 round ID — for R1 matches it's completedMatch.roundId directly;
  // for R2 matches we look up the R1 round via the bracket.
  let mainR1RoundId = completedMatch.roundId;
  if (currentRound.roundNumber === 2) {
    const mainR1Round = await tx.round.findFirst({
      where: { bracketId: bracket.id, roundNumber: 1 },
      select: { id: true }
    });
    if (!mainR1Round) return;
    mainR1RoundId = mainR1Round.id;
  }

  const mainR1Matches = await tx.match.findMany({
    where: { roundId: mainR1RoundId },
    orderBy: { matchNumber: 'asc' },
    select: {
      id: true,
      isBye: true,
      result: true,
      player1Id: true,
      player2Id: true,
      pair1Id: true,
      pair2Id: true
    }
  });

  let posInRound;
  if (currentRound.roundNumber === 1) {
    posInRound = mainR1Matches.findIndex(m => m.id === completedMatch.id);
    if (posInRound < 0) return;
  } else {
    // R2: find this match's index in R2, then compute the loser's R1 BYE origin position.
    const mainR2Matches = await tx.match.findMany({
      where: { roundId: completedMatch.roundId },
      orderBy: { matchNumber: 'asc' },
      select: { id: true }
    });
    const posInR2 = mainR2Matches.findIndex(m => m.id === completedMatch.id);
    if (posInR2 < 0) return;

    // loserIsPlayer1InR2: if winner is PLAYER2, loser is player1
    const loserIsPlayer1InR2 = !winnerIsPlayer1;
    const loserR1Pos = posInR2 * 2 + (loserIsPlayer1InR2 ? 0 : 1);

    // Only proceed if the R1 match at that position is a BYE — otherwise this R2 loser
    // played a real R1 match (≥2 real matches total) and is ineligible for consolation.
    const r1MatchForLoser = mainR1Matches[loserR1Pos];
    if (!r1MatchForLoser || !r1MatchForLoser.isBye) return;

    posInRound = loserR1Pos;
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

  // Step 9: Opted-out loser path.
  // Check whether the OTHER consolation slot (paired with the opted-out slot) is already
  // filled by the loser of the other main R1 match. If yes, that sole player has no
  // opponent coming — advance them and mark the consolation match as BYE.
  // If no, return and wait: step 11 will handle it when the other main match completes.
  if (loserIsOptedOut) {
    const otherSlotValue = isPlayer1Slot
      ? (loserPairId ? targetConsolationMatch.pair2Id : targetConsolationMatch.player2Id)
      : (loserPairId ? targetConsolationMatch.pair1Id : targetConsolationMatch.player1Id);

    if (otherSlotValue) {
      const solePlayerId = isPlayer1Slot
        ? (loserPairId
            ? (targetConsolationMatch.pair2Id || targetConsolationMatch.player2Id || null)
            : targetConsolationMatch.player2Id)
        : (loserPairId
            ? (targetConsolationMatch.pair1Id || targetConsolationMatch.player1Id || null)
            : targetConsolationMatch.player1Id);

      // Advance before marking BYE — advanceBracketSlot skips isBye=true matches.
      await advanceBracketSlot(tx, targetConsolationMatch, solePlayerId);
      await tx.match.update({
        where: { id: targetConsolationMatch.id },
        data: { status: 'BYE', isBye: true }
      });
    }
    return;
  }

  // Step 10: Non-opted-out path — check for slot conflict, then fill the slot.
  const slotField = isPlayer1Slot
    ? (loserPairId ? 'pair1Id' : 'player1Id')
    : (loserPairId ? 'pair2Id' : 'player2Id');
  const currentSlotValue = targetConsolationMatch[slotField];

  if (currentSlotValue !== null && currentSlotValue !== undefined) {
    // Same player already correctly placed (resubmission with unchanged winner) — no-op
    if (currentSlotValue === entityId) return;

    const err = new Error(`Consolation slot ${slotField} in match ${targetConsolationMatch.id} is already occupied`);
    err.code = 'CONSOLATION_SLOT_CONFLICT';
    err.statusCode = 409;
    throw err;
  }

  const updateData = {};
  if (loserPairId) {
    if (isPlayer1Slot) {
      updateData.pair1Id = loserPairId;
      if (loserId) updateData.player1Id = loserId;
    } else {
      updateData.pair2Id = loserPairId;
      if (loserId) updateData.player2Id = loserId;
    }
  } else {
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

  // Step 11: Auto-BYE detection — check if the paired consolation slot will NEVER be filled.
  // The paired main match feeds the other slot. The slot is permanently empty when:
  //   (a) The paired main match is an original BYE (no loser exists), OR
  //   (b) The paired main match is completed and its loser has a ConsolationOptOut.
  //
  // IMPORTANT: Call advanceBracketSlot BEFORE marking isBye=true on the consolation match.
  // advanceBracketSlot has a guard that returns early for isBye=true matches (initial BYEs
  // are pre-populated at bracket creation time and must not be double-advanced). Marking BYE
  // first would prevent the sole player from being advanced.
  const pairedMainMatchIndex = isPlayer1Slot ? posInRound + 1 : posInRound - 1;
  const pairedMainMatch = mainR1Matches[pairedMainMatchIndex];

  let pairedSlotPermanentlyEmpty = false;

  if (pairedMainMatch) {
    if (pairedMainMatch.isBye) {
      // BYE R1 match: the player who advanced may still lose in R2 and be routed to
      // consolation. The slot is permanently empty only when:
      //   (a) The BYE match has no player (empty BYE slot), OR
      //   (b) The BYE player has already won their R2 match (won't come to consolation), OR
      //   (c) The BYE player lost R2 but has a consolation opt-out.
      const byePlayerId = pairedMainMatch.player1Id;
      const byePlayerPairId = pairedMainMatch.pair1Id;

      if (!byePlayerId && !byePlayerPairId) {
        // Empty BYE — no player will ever fill this slot
        pairedSlotPermanentlyEmpty = true;
      } else {
        // Check the BYE player's R2 match result
        const byeR2Round = await tx.round.findFirst({
          where: { bracketId: bracket.id, roundNumber: 2 },
          select: { id: true }
        });
        if (byeR2Round) {
          const byeR2Matches = await tx.match.findMany({
            where: { roundId: byeR2Round.id },
            orderBy: { matchNumber: 'asc' },
            select: { id: true, result: true, player1Id: true, player2Id: true, pair1Id: true, pair2Id: true }
          });
          const byeR2MatchIdx = Math.floor(pairedMainMatchIndex / 2);
          const byePlayerIsP1InR2 = pairedMainMatchIndex % 2 === 0;
          const byeR2Match = byeR2Matches[byeR2MatchIdx];

          if (byeR2Match?.result) {
            let byeR2Result;
            try { byeR2Result = JSON.parse(byeR2Match.result); } catch { /* ignore */ }

            if (byeR2Result) {
              const byePlayerWonR2 = byePlayerIsP1InR2
                ? (byeR2Result.winner === 'PLAYER1')
                : (byeR2Result.winner === 'PLAYER2');

              if (byePlayerWonR2) {
                // BYE player won R2 — still in the main bracket, won't come to consolation
                pairedSlotPermanentlyEmpty = true;
              } else {
                // BYE player lost R2 — check for consolation opt-out
                const r2LoserId = byePlayerIsP1InR2 ? byeR2Match.player1Id : byeR2Match.player2Id;
                const r2LoserPairId = byePlayerIsP1InR2 ? byeR2Match.pair1Id : byeR2Match.pair2Id;
                const byeOptOutFilter = (r2LoserPairId ?? byePlayerPairId)
                  ? { tournamentId: completedMatch.tournamentId, pairId: r2LoserPairId ?? byePlayerPairId }
                  : { tournamentId: completedMatch.tournamentId, playerId: r2LoserId ?? byePlayerId };
                const byeOptOut = await tx.consolationOptOut.findFirst({
                  where: byeOptOutFilter, select: { id: true }
                });
                if (byeOptOut) pairedSlotPermanentlyEmpty = true;
                // else: BYE player will be routed when their R2 loss is processed
              }
            }
            // else: malformed result — treat slot as potentially fillable
          }
          // else: R2 not yet completed — BYE player may still lose and come to consolation
        }
      }
    } else if (pairedMainMatch.result) {
      // Paired match is completed — check if its loser has opted out of consolation
      let pairedResult;
      try {
        pairedResult = JSON.parse(pairedMainMatch.result);
      } catch {
        // malformed result — cannot determine opt-out status; treat slot as potentially fillable
      }

      if (pairedResult) {
        const pairedWinnerIsPlayer1 = pairedResult.winner === 'PLAYER1';
        const pairedLoserId = pairedWinnerIsPlayer1 ? pairedMainMatch.player2Id : pairedMainMatch.player1Id;
        const pairedLoserPairId = pairedWinnerIsPlayer1 ? pairedMainMatch.pair2Id : pairedMainMatch.pair1Id;

        const pairedOptOutFilter = pairedLoserPairId
          ? { tournamentId: completedMatch.tournamentId, pairId: pairedLoserPairId }
          : { tournamentId: completedMatch.tournamentId, playerId: pairedLoserId };

        const pairedOptOut = await tx.consolationOptOut.findFirst({
          where: pairedOptOutFilter,
          select: { id: true }
        });

        if (pairedOptOut) pairedSlotPermanentlyEmpty = true;
      }
    }
  }

  if (pairedSlotPermanentlyEmpty) {
    const solePlayerId = loserPairId
      ? (isPlayer1Slot
          ? (updatedConsolationMatch.pair1Id || updatedConsolationMatch.player1Id || null)
          : (updatedConsolationMatch.pair2Id || updatedConsolationMatch.player2Id || null))
      : (isPlayer1Slot
          ? (updatedConsolationMatch.player1Id || null)
          : (updatedConsolationMatch.player2Id || null));

    // Advance first (updatedConsolationMatch.isBye is still false at this point)
    await advanceBracketSlot(tx, updatedConsolationMatch, solePlayerId);

    // Now mark as BYE to reflect the terminal state
    await tx.match.update({
      where: { id: updatedConsolationMatch.id },
      data: { status: 'BYE', isBye: true }
    });
  }
}
