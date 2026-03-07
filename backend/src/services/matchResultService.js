/**
 * Match Result Service
 *
 * Business logic for match result submission:
 *   - Participant check (players must be match participants)
 *   - Organizer-lock check (players cannot modify organizer-set results)
 *   - Non-organizer winner-change block (BB-01)
 *   - Score-only passthrough when winner unchanged (BB-02)
 *   - Main bracket cascade-clear on organizer winner change (BB-03)
 *   - Consolation bracket cascade-clear on winner change (BB-05)
 *   - Dry-run impact detection without mutations (BB-04)
 *   - Atomic DB write via Prisma transaction
 *
 * Feature: 01-match-result-submission (Plan 01)
 * Feature: 06.1-match-result-resubmission (Plan 01)
 *
 * Exports:
 *   - submitResult({ matchId, body, isOrganizer, submitterPlayerId, dryRun })
 */

import prisma from '../lib/prisma.js';
import { advanceBracketSlot, checkAndCompleteTournament } from './tournamentLifecycleService.js';
import {
  routeLoserToConsolation,
  checkBYEWinnerConsolationUpdate,
  clearConsolationRouting,
  cascadeClearMainBracket,
  cascadeClearConsolationDownstream
} from './consolationEligibilityService.js';

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
 * Read-only traversal of downstream main bracket matches for dry-run impact detection.
 * Returns all matches where the given winner is found at higher round numbers.
 *
 * @param {Object} tx - Prisma transaction client
 * @param {string} bracketId - Main bracket ID
 * @param {string} sourceMatchId - The match whose winner we're scanning from
 * @param {string} winnerId - The winner to trace downstream
 * @param {boolean} winnerIsDoubles - true if winnerId is a pair UUID
 * @returns {Promise<Array>} Array of downstream match objects
 */
async function findDownstreamMainMatches(tx, bracketId, sourceMatchId, winnerId, winnerIsDoubles) {
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
      id: true, roundId: true, result: true, isBye: true,
      player1Id: true, player2Id: true, pair1Id: true, pair2Id: true
    }
  });

  if (!nextMatch) return [];

  // Determine further winner from this match
  let furtherWinnerId = null;
  let furtherWinnerIsDoubles = false;

  if (nextMatch.isBye) {
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

  const downstream = [nextMatch];

  if (furtherWinnerId) {
    const more = await findDownstreamMainMatches(tx, bracketId, nextMatch.id, furtherWinnerId, furtherWinnerIsDoubles);
    downstream.push(...more);
  }

  return downstream;
}

/**
 * Read-only traversal of downstream consolation matches for a given entity.
 * Finds the consolation match where entityId is placed and recursively finds
 * further downstream matches if a winner had already been recorded.
 *
 * @param {Object} tx - Prisma transaction client
 * @param {string} consolationBracketId - Consolation bracket ID
 * @param {string} entityId - Player or pair UUID to trace
 * @param {boolean} isDoubles - true if entityId is a pair UUID
 * @returns {Promise<Array>} Array of impacted consolation match objects
 */
async function findDownstreamConsolationMatches(tx, consolationBracketId, entityId, isDoubles) {
  const whereClause = {
    bracketId: consolationBracketId,
    ...(isDoubles
      ? { OR: [{ pair1Id: entityId }, { pair2Id: entityId }] }
      : { OR: [{ player1Id: entityId }, { player2Id: entityId }] })
  };

  const consolationMatch = await tx.match.findFirst({
    where: whereClause,
    orderBy: { matchNumber: 'asc' },
    select: {
      id: true, roundId: true, result: true, isBye: true,
      player1Id: true, player2Id: true, pair1Id: true, pair2Id: true
    }
  });

  if (!consolationMatch) return [];

  // Find winner of this consolation match (who would be downstream)
  let winnerId = null;
  let winnerIsDoubles = false;

  if (consolationMatch.isBye) {
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

  const downstream = [consolationMatch];

  if (winnerId) {
    const more = await findDownstreamConsolationMatchesFromMatch(tx, consolationBracketId, consolationMatch.id, winnerId, winnerIsDoubles);
    downstream.push(...more);
  }

  return downstream;
}

/**
 * Read-only traversal of downstream consolation matches starting from a specific source match.
 * Traces where the given winner was advanced to in subsequent consolation rounds.
 *
 * @param {Object} tx - Prisma transaction client
 * @param {string} consolationBracketId - Consolation bracket ID
 * @param {string} sourceMatchId - Source match to trace from
 * @param {string} winnerId - Winner to trace
 * @param {boolean} winnerIsDoubles - true if winnerId is a pair UUID
 * @returns {Promise<Array>} Array of downstream consolation match objects
 */
async function findDownstreamConsolationMatchesFromMatch(tx, consolationBracketId, sourceMatchId, winnerId, winnerIsDoubles) {
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
      id: true, roundId: true, result: true, isBye: true,
      player1Id: true, player2Id: true, pair1Id: true, pair2Id: true
    }
  });

  if (!nextMatch) return [];

  let furtherWinnerId = null;
  let furtherWinnerIsDoubles = false;

  if (nextMatch.isBye) {
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

  const downstream = [nextMatch];

  if (furtherWinnerId) {
    const more = await findDownstreamConsolationMatchesFromMatch(tx, consolationBracketId, nextMatch.id, furtherWinnerId, furtherWinnerIsDoubles);
    downstream.push(...more);
  }

  return downstream;
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
 * @param {boolean} [params.dryRun=false] - If true, return impact summary without modifying data
 * @returns {Promise<Object>} Updated match record (or dry-run impact summary thrown as DRY_RUN_RESULT)
 */
export async function submitResult({ matchId, body, isOrganizer, submitterPlayerId, dryRun = false }) {
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

    // Capture previous result before overwriting — used later to detect winner changes
    // so consolation routing can be corrected when the loser changes.
    const previousResultJson = match.result;

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

    // BB-01: Non-organizer winner-change block.
    // If a previous result exists and the new winner differs from the old winner,
    // only organizers may change the winner.
    if (previousResultJson && !isOrganizer) {
      let previousWinnerForCheck = null;
      try {
        previousWinnerForCheck = JSON.parse(previousResultJson).winner ?? null;
      } catch { /* ignore */ }

      if (previousWinnerForCheck && previousWinnerForCheck !== body.winner) {
        throwError(
          403,
          'WINNER_CHANGE_NOT_ALLOWED',
          'Only a tournament organizer can change the winner of a completed match. You can update the score without changing the winner.'
        );
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
        player1Seed: true,
        player2Seed: true,
        pair1Seed: true,
        pair2Seed: true,
        isBye: true,
        result: true,
        status: true,
        completedAt: true,
        updatedAt: true
      }
    });

    // Extract winner ID from the result JSON
    const parsedResult = JSON.parse(updated.result);
    const winnerIsPlayer1 = parsedResult.winner === 'PLAYER1';
    const winnerId = winnerIsPlayer1
      ? (updated.pair1Id ?? updated.player1Id)
      : (updated.pair2Id ?? updated.player2Id);

    const isDoubles = !!(updated.pair1Id || updated.pair2Id);

    // Detect winner change for downstream logic
    let previousWinnerStr = null;
    if (previousResultJson) {
      try {
        previousWinnerStr = JSON.parse(previousResultJson).winner ?? null;
      } catch { /* ignore */ }
    }
    const newWinnerStr = parsedResult.winner;
    const winnerChanged = !!previousWinnerStr && previousWinnerStr !== newWinnerStr;

    // BB-02: Score-only passthrough — when winner has NOT changed, skip ALL downstream
    // logic (no advanceBracketSlot, no consolation routing, no cascade).
    if (previousResultJson && !winnerChanged) {
      return updated;
    }

    // At this point, either this is a first submission or the winner changed.

    // BB-04: Dry-run mode — detect impact without modifying data.
    // Traverse the cascade path read-only, collect impacted match count and player names,
    // then throw a special DRY_RUN_RESULT error to abort the transaction.
    if (dryRun && winnerChanged) {
      // Compute old winner ID (the one who needs to be cleared downstream)
      const previousWinnerIsPlayer1 = previousWinnerStr === 'PLAYER1';
      const oldWinnerId = isDoubles
        ? (previousWinnerIsPlayer1 ? updated.pair1Id : updated.pair2Id)
        : (previousWinnerIsPlayer1 ? updated.player1Id : updated.player2Id);
      const oldLoserId = isDoubles
        ? (previousWinnerIsPlayer1 ? updated.pair2Id : updated.pair1Id)
        : (previousWinnerIsPlayer1 ? updated.player2Id : updated.player1Id);

      // Determine bracket type for cascade path selection
      const bracketForDryRun = await tx.bracket.findUnique({
        where: { id: updated.bracketId },
        select: { id: true, bracketType: true }
      });

      let impactedMainMatches = 0;
      let impactedConsolationMatches = 0;
      const affectedPlayerNames = new Set();

      const collectNames = async (match) => {
        // Collect names from player1/player2/pair relations
        if (match.player1Id) {
          const p = await tx.playerProfile.findUnique({ where: { id: match.player1Id }, select: { name: true } });
          if (p?.name) affectedPlayerNames.add(p.name);
        }
        if (match.player2Id) {
          const p = await tx.playerProfile.findUnique({ where: { id: match.player2Id }, select: { name: true } });
          if (p?.name) affectedPlayerNames.add(p.name);
        }
      };

      if (bracketForDryRun?.bracketType === 'MAIN' && oldWinnerId) {
        // Traverse main bracket downstream for the old winner
        const mainClearedMatches = await findDownstreamMainMatches(tx, updated.bracketId, updated.id, oldWinnerId, isDoubles);
        impactedMainMatches = mainClearedMatches.length;
        for (const m of mainClearedMatches) await collectNames(m);

        // Check consolation bracket for old loser's downstream
        if (oldLoserId) {
          const consolationBracket = await tx.bracket.findFirst({
            where: { tournamentId: updated.tournamentId, bracketType: 'CONSOLATION' },
            select: { id: true }
          });
          if (consolationBracket) {
            const consolationClearedMatches = await findDownstreamConsolationMatches(tx, consolationBracket.id, oldLoserId, isDoubles);
            impactedConsolationMatches = consolationClearedMatches.length;
            for (const m of consolationClearedMatches) await collectNames(m);
          }
        }
      } else if (bracketForDryRun?.bracketType === 'CONSOLATION' && oldWinnerId) {
        // Consolation bracket winner change — find downstream consolation matches
        const consolationClearedMatches = await findDownstreamConsolationMatchesFromMatch(tx, updated.bracketId, updated.id, oldWinnerId, isDoubles);
        impactedConsolationMatches = consolationClearedMatches.length;
        for (const m of consolationClearedMatches) await collectNames(m);
      }

      const totalImpactedMatches = impactedMainMatches + impactedConsolationMatches;
      const dryRunResult = {
        dryRun: true,
        impactedMainMatches,
        impactedConsolationMatches,
        totalImpactedMatches,
        affectedPlayers: [...affectedPlayerNames],
        requiresConfirmation: totalImpactedMatches > 0
      };

      // Throw to abort the transaction and surface the dry-run result
      const dryRunError = new Error('DRY_RUN_RESULT');
      dryRunError.code = 'DRY_RUN_RESULT';
      dryRunError.data = dryRunResult;
      throw dryRunError;
    }

    // BB-03/BB-05: Cascade-clear downstream matches when winner changed.
    if (winnerChanged) {
      const previousWinnerIsPlayer1 = previousWinnerStr === 'PLAYER1';
      const oldWinnerId = isDoubles
        ? (previousWinnerIsPlayer1 ? updated.pair1Id : updated.pair2Id)
        : (previousWinnerIsPlayer1 ? updated.player1Id : updated.player2Id);
      const oldLoserId = isDoubles
        ? (previousWinnerIsPlayer1 ? updated.pair2Id : updated.pair1Id)
        : (previousWinnerIsPlayer1 ? updated.player2Id : updated.player1Id);

      // Determine bracket type for cascade
      const bracketForCascade = await tx.bracket.findUnique({
        where: { id: updated.bracketId },
        select: { id: true, bracketType: true }
      });

      if (bracketForCascade?.bracketType === 'MAIN') {
        // BB-03a: Clear old winner from downstream main bracket matches
        if (oldWinnerId) {
          await cascadeClearMainBracket(tx, updated.bracketId, updated.id, oldWinnerId, isDoubles);
        }

        // BB-04c: Clear old loser from consolation bracket
        if (oldLoserId) {
          await clearConsolationRouting(tx, updated.tournamentId, oldLoserId, isDoubles);
        }
      } else if (bracketForCascade?.bracketType === 'CONSOLATION') {
        // BB-05: Clear old consolation winner from downstream consolation rounds
        if (oldWinnerId) {
          await cascadeClearConsolationDownstream(tx, updated.bracketId, updated.id, oldWinnerId, isDoubles);
        }
      }
    }

    // Advance bracket slot: populate next-round match with the winner.
    // For winner changes: old winner was cleared above; now place the new winner.
    // For first submissions: place the winner as normal.
    await advanceBracketSlot(tx, updated, winnerId);

    // Route main bracket loser to consolation slot (MATCH_2 tournaments only).
    // routeLoserToConsolation handles the same-loser resubmission case as a no-op.
    await routeLoserToConsolation(tx, updated, winnerId, isOrganizer);

    // When a R1-BYE player wins R2, they won't enter consolation — check if a
    // waiting R1 loser needs to be auto-BYE'd in the consolation bracket.
    await checkBYEWinnerConsolationUpdate(tx, updated, winnerId);

    // Detect tournament completion (organizer-only)
    await checkAndCompleteTournament(tx, updated.tournamentId, isOrganizer);

    return updated;
  });

  return updatedMatch;
}
