/**
 * Bracket Persistence Service
 *
 * Bridges the in-memory seeding placement service (Feature 010) with the Prisma
 * database. Provides three core operations:
 *   - closeRegistration(): locks tournament registration before draw generation
 *   - generateBracket(): fetches players, calls generateSeededBracket(), persists
 *     Bracket + Round + Match records atomically
 *   - swapSlots(): batch-updates match player slots atomically
 *
 * Feature: Phase 01.1 - Bracket Generation and Seeding Persistence
 * Requirements: DRAW-01 through DRAW-07
 */

import { PrismaClient } from '@prisma/client';
import seedrandom from 'seedrandom';
import { generateSeededBracket } from './seedingPlacementService.js';

const prisma = new PrismaClient();

/**
 * Helper: create structured errors with a machine-readable code property.
 * Used by unit tests to assert on error.code rather than error.message.
 *
 * @param {string} code - Machine-readable error code (e.g. 'TOURNAMENT_NOT_FOUND')
 * @param {string} message - Human-readable error message
 * @returns {Error} Error object with .code property set
 */
function makeError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/**
 * Close tournament registration so bracket generation can proceed.
 *
 * Business rules (DRAW-01):
 *   - Tournament must exist → TOURNAMENT_NOT_FOUND
 *   - Registration must not already be closed → ALREADY_CLOSED
 *   - Sets registrationClosed = true and returns updated tournament
 *
 * @param {string} tournamentId - Tournament primary key
 * @returns {Promise<Object>} Updated tournament record
 * @throws {Error} TOURNAMENT_NOT_FOUND | ALREADY_CLOSED
 */
export async function closeRegistration(tournamentId) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, status: true, registrationClosed: true }
  });

  if (!tournament) {
    throw makeError('TOURNAMENT_NOT_FOUND', `Tournament ${tournamentId} not found`);
  }

  if (tournament.registrationClosed) {
    throw makeError('ALREADY_CLOSED', `Tournament ${tournamentId} registration is already closed`);
  }

  return prisma.tournament.update({
    where: { id: tournamentId },
    data: { registrationClosed: true }
  });
}

/**
 * Generate a seeded bracket and persist it to the database atomically.
 *
 * Business rules (DRAW-02 through DRAW-05):
 *   - Tournament must exist → TOURNAMENT_NOT_FOUND
 *   - Registration must be closed first → REGISTRATION_NOT_CLOSED (DRAW-03)
 *   - Tournament must not be IN_PROGRESS or COMPLETED → BRACKET_LOCKED (DRAW-05)
 *   - Need at least 4 registered players/pairs → INSUFFICIENT_PLAYERS
 *   - Deletes existing Bracket/Round/Match records before creating new ones (DRAW-04)
 *   - Creates Bracket + Rounds + Matches in a single Prisma transaction
 *
 * Round structure:
 *   - totalRounds = log2(bracketSize)
 *   - Round 1 matches use player IDs from the positions array (from seeding service)
 *   - Rounds 2+ are placeholder matches (both player IDs null, status SCHEDULED)
 *   - BYE matches in Round 1 get isBye=true and status=BYE
 *
 * @param {string} tournamentId - Tournament primary key
 * @param {Object} [options={}] - Generation options
 * @param {string} [options.randomSeed] - Optional deterministic seed for reproducibility
 * @param {string} [options.doublesMethod='PAIR_SCORE'] - 'PAIR_SCORE' | 'AVERAGE_SCORE'
 * @returns {Promise<{bracket: Object, roundCount: number, matchCount: number}>}
 * @throws {Error} TOURNAMENT_NOT_FOUND | REGISTRATION_NOT_CLOSED | BRACKET_LOCKED | INSUFFICIENT_PLAYERS
 */
export async function generateBracket(tournamentId, options = {}) {
  const { randomSeed } = options;

  // Step 1: Load tournament with category info
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      status: true,
      registrationClosed: true,
      categoryId: true,
      category: { select: { type: true } },
      formatConfig: true
    }
  });

  // Step 2: Guard — tournament must exist
  if (!tournament) {
    throw makeError('TOURNAMENT_NOT_FOUND', `Tournament ${tournamentId} not found`);
  }

  // Step 3: Guard — registration must be closed (DRAW-03)
  if (!tournament.registrationClosed) {
    throw makeError(
      'REGISTRATION_NOT_CLOSED',
      'Registration must be closed before generating bracket'
    );
  }

  // Step 4: Guard — bracket is locked if tournament is in progress or completed (DRAW-05)
  if (tournament.status === 'IN_PROGRESS' || tournament.status === 'COMPLETED') {
    throw makeError(
      'BRACKET_LOCKED',
      `Cannot modify bracket when tournament status is ${tournament.status}`
    );
  }

  // Step 4b: Parse matchGuarantee from formatConfig JSON string
  let parsedFormatConfig = {};
  if (tournament.formatConfig) {
    try {
      parsedFormatConfig = JSON.parse(tournament.formatConfig);
    } catch (_) {
      // malformed JSON — treat as default MATCH_1
    }
  }
  const matchGuarantee = parsedFormatConfig.matchGuarantee || 'MATCH_1';

  // Step 5: Load registered players/pairs, retaining entity IDs for placement
  const categoryType = tournament.category?.type;
  let allEntities; // { entityId } for every registered player/pair

  if (categoryType === 'DOUBLES') {
    const pairRegs = await prisma.pairRegistration.findMany({
      where: { tournamentId, status: 'REGISTERED' },
      include: { pair: { select: { id: true } } }
    });
    allEntities = pairRegs.map(r => ({ entityId: r.pair.id }));
  } else {
    const registrations = await prisma.tournamentRegistration.findMany({
      where: { tournamentId, status: 'REGISTERED' },
      include: { player: { select: { id: true } } },
      orderBy: { registrationTimestamp: 'asc' }
    });
    allEntities = registrations.map(r => ({ entityId: r.player.id }));
  }

  const playerCount = allEntities.length;

  // Step 6: Guard — minimum 4 players required
  if (playerCount < 4) {
    throw makeError(
      'INSUFFICIENT_PLAYERS',
      'Need at least 4 players to generate bracket'
    );
  }

  // Step 7: Call seeding placement service to get seeded positions
  const seedingResult = await generateSeededBracket(
    tournament.categoryId,
    playerCount,
    randomSeed
  );

  // structure is match-indexed: structure[matchIdx] === '1' means BYE match,
  // '0' means preliminary match. Length = bracketSize / 2.
  const { positions, bracketSize, structure: rawStructure, randomSeed: actualSeed } =
    seedingResult.bracket;
  const structure = (rawStructure || '').replace(/\s/g, '');

  // Step 7b: Fill unseeded players into empty non-BYE match positions.
  // generateSeededBracket only places seeds; remaining slots need real players.
  const seededIds = new Set(positions.filter(p => p.entityId).map(p => p.entityId));
  const unseeded = allEntities.filter(e => !seededIds.has(e.entityId));

  // Shuffle unseeded players deterministically using the same random seed
  const rng = seedrandom(actualSeed || randomSeed || 'default');
  for (let i = unseeded.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [unseeded[i], unseeded[j]] = [unseeded[j], unseeded[i]];
  }

  // Normalize BYE matches: player always in the first (even) slot, BYE in the second (odd) slot.
  // placeTwoSeeds places seed2 at the very last position (odd slot of the bottom BYE match),
  // but the UI convention is player-first in every match. Move any entity sitting in an odd BYE
  // slot to the even slot of the same match.
  const totalMatches = bracketSize / 2;
  for (let matchIdx = 0; matchIdx < totalMatches; matchIdx++) {
    if (!structure || structure[matchIdx] !== '1') continue;
    const evenIdx = matchIdx * 2;
    const oddIdx = matchIdx * 2 + 1;
    if (!positions[evenIdx].entityId && positions[oddIdx].entityId) {
      positions[evenIdx].entityId = positions[oddIdx].entityId;
      positions[oddIdx].entityId = null;
    }
  }

  // BYE slot is always the second (odd) position in each BYE match.
  const byeSlotIndices = new Set();
  for (let matchIdx = 0; matchIdx < totalMatches; matchIdx++) {
    if (!structure || structure[matchIdx] !== '1') continue;
    byeSlotIndices.add(matchIdx * 2 + 1);
  }

  let unseededIdx = 0;
  for (let posIdx = 0; posIdx < positions.length; posIdx++) {
    if (positions[posIdx].entityId) continue;    // already has a seed or normalized seed
    if (byeSlotIndices.has(posIdx)) continue;    // actual BYE slot — leave null
    if (unseededIdx < unseeded.length) {
      positions[posIdx].entityId = unseeded[unseededIdx++].entityId;
    }
  }

  // Step 8: Persist atomically inside a Prisma transaction (DRAW-02, DRAW-04)
  let matchCount = 0;

  const result = await prisma.$transaction(async (tx) => {
    // Step 8a: Delete existing records in cascade order (DRAW-04)
    // FK constraints require: Match → Round → Bracket deletion order
    await tx.match.deleteMany({ where: { tournamentId } });
    await tx.round.deleteMany({ where: { tournamentId } });
    await tx.bracket.deleteMany({ where: { tournamentId } });

    // Step 8b: Create Bracket record
    const bracket = await tx.bracket.create({
      data: {
        tournamentId,
        bracketType: 'MAIN',
        matchGuarantee
      }
    });

    // Step 8c: Create Rounds and Matches
    const totalRounds = Math.log2(bracketSize);
    let matchNumber = 1;

    // Collected during Round 1 creation for BYE pre-population in Round 2
    const byeInfo = []; // { posInRound, playerId, pairId }
    const round2MatchIds = []; // IDs of Round 2 matches in creation order

    for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
      // Create Round record
      const round = await tx.round.create({
        data: {
          tournamentId,
          bracketId: bracket.id,
          roundNumber: roundNum
        }
      });

      if (roundNum === 1) {
        // Round 1: create matches from positions array (paired in groups of 2)
        const matchesInRound = bracketSize / 2;
        for (let i = 0; i < matchesInRound; i++) {
          const pos1 = positions[i * 2];
          const pos2 = positions[i * 2 + 1];

          // Use structure (match-indexed) for BYE detection — pos.isBye is
          // position-indexed and misaligns for bracketSize > structure.length.
          const isByeMatch = structure ? structure[i] === '1' : false;

          let matchData;
          if (categoryType === 'DOUBLES') {
            matchData = {
              tournamentId,
              bracketId: bracket.id,
              roundId: round.id,
              matchNumber: matchNumber++,
              isBye: isByeMatch,
              status: isByeMatch ? 'BYE' : 'SCHEDULED',
              pair1Id: pos1?.entityId || null,
              pair2Id: pos2?.entityId || null,
              player1Id: null,
              player2Id: null
            };
          } else {
            matchData = {
              tournamentId,
              bracketId: bracket.id,
              roundId: round.id,
              matchNumber: matchNumber++,
              isBye: isByeMatch,
              status: isByeMatch ? 'BYE' : 'SCHEDULED',
              player1Id: pos1?.entityId || null,
              player2Id: pos2?.entityId || null
            };
          }

          await tx.match.create({ data: matchData });
          matchCount++;

          // Track BYE matches so we can pre-populate their Round 2 slot below
          if (isByeMatch) {
            byeInfo.push({
              posInRound: i,
              playerId: categoryType !== 'DOUBLES' ? (pos1?.entityId || null) : null,
              pairId: categoryType === 'DOUBLES' ? (pos1?.entityId || null) : null
            });
          }
        }
      } else {
        // Rounds 2+: placeholder matches — player IDs start null (BYEs pre-populated below)
        const matchesInRound = bracketSize / Math.pow(2, roundNum);
        for (let i = 0; i < matchesInRound; i++) {
          const created = await tx.match.create({
            data: {
              tournamentId,
              bracketId: bracket.id,
              roundId: round.id,
              matchNumber: matchNumber++,
              isBye: false,
              status: 'SCHEDULED',
              player1Id: null,
              player2Id: null
            }
          });
          if (roundNum === 2) round2MatchIds.push(created.id);
          matchCount++;
        }
      }
    }

    // Step 8d: Pre-populate Round 2 slots for BYE players.
    // BYE matches auto-advance their player — no result is ever submitted for them,
    // so advanceBracketSlot never runs. We seed Round 2 here at bracket creation time.
    for (const bye of byeInfo) {
      const round2Idx = Math.floor(bye.posInRound / 2);
      const isPlayer1Slot = bye.posInRound % 2 === 0;
      const targetMatchId = round2MatchIds[round2Idx];
      if (!targetMatchId) continue;

      const updateData = {};
      if (categoryType === 'DOUBLES') {
        if (isPlayer1Slot) updateData.pair1Id = bye.pairId;
        else updateData.pair2Id = bye.pairId;
      } else {
        if (isPlayer1Slot) updateData.player1Id = bye.playerId;
        else updateData.player2Id = bye.playerId;
      }
      await tx.match.update({ where: { id: targetMatchId }, data: updateData });
    }

    // Step 8e: Generate CONSOLATION bracket when matchGuarantee === 'MATCH_2'
    let consolationBracket = null;
    if (matchGuarantee === 'MATCH_2') {
      consolationBracket = await generateConsolationBracket(
        tx, tournamentId, bracket.id, bracketSize, categoryType, matchGuarantee
      );
    }

    return { bracket, consolationBracket, totalRounds, matchCount };
  });

  return {
    bracket: result.bracket,
    consolationBracket: result.consolationBracket || null,
    roundCount: result.totalRounds,
    matchCount: result.matchCount
  };
}

/**
 * Generate the consolation bracket structure for a MATCH_2 tournament.
 *
 * Mirror-draw rule: loser of Main Match N vs loser of Main Match N+1 (1-indexed).
 * The consolation bracket covers all rounds needed to produce a consolation winner.
 *
 * @param {Object} tx - Prisma transaction client
 * @param {string} tournamentId - Tournament primary key
 * @param {string} mainBracketId - ID of the MAIN bracket (for reference only)
 * @param {number} bracketSize - Main bracket size (next power of 2 >= playerCount)
 * @param {string} categoryType - 'SINGLES', 'DOUBLES', etc.
 * @param {string} matchGuarantee - 'MATCH_2' (passed through to Bracket record)
 * @returns {Promise<Object>} Created consolation Bracket record
 */
async function generateConsolationBracket(tx, tournamentId, mainBracketId, bracketSize, categoryType, matchGuarantee) {
  // Create consolation Bracket record
  const consolationBracket = await tx.bracket.create({
    data: { tournamentId, bracketType: 'CONSOLATION', matchGuarantee }
  });

  // Consolation bracket covers bracketSize/2 players (all Round 1 losers from main bracket)
  const consolationSize = bracketSize / 2;
  const totalConsolationRounds = Math.log2(consolationSize);
  let matchNumber = 1000; // offset to avoid collision with main bracket match numbers (1..N)

  for (let roundNum = 1; roundNum <= totalConsolationRounds; roundNum++) {
    const round = await tx.round.create({
      data: { tournamentId, bracketId: consolationBracket.id, roundNumber: roundNum }
    });

    const matchesInRound = consolationSize / Math.pow(2, roundNum);
    for (let i = 0; i < matchesInRound; i++) {
      await tx.match.create({
        data: {
          tournamentId,
          bracketId: consolationBracket.id,
          roundId: round.id,
          matchNumber: matchNumber++,
          isBye: false,
          status: 'SCHEDULED',
          player1Id: null,
          player2Id: null
        }
      });
    }
  }

  return consolationBracket;
}

/**
 * Regenerate an existing bracket by delegating to generateBracket().
 *
 * The generateBracket() function already handles deletion of existing records
 * before creating new ones (DRAW-04), so regenerateBracket() is an alias that
 * makes the intent explicit in callers.
 *
 * @param {string} tournamentId - Tournament primary key
 * @param {Object} [options={}] - Same options as generateBracket()
 * @returns {Promise<{bracket: Object, roundCount: number, matchCount: number}>}
 */
export async function regenerateBracket(tournamentId, options = {}) {
  return generateBracket(tournamentId, options);
}

/**
 * Atomically swap player slots across multiple matches.
 *
 * Business rules (DRAW-06, DRAW-07):
 *   - Tournament must exist → TOURNAMENT_NOT_FOUND
 *   - Tournament must not be IN_PROGRESS or COMPLETED → BRACKET_LOCKED
 *   - None of the targeted matches may be BYE matches → BYE_SLOT_NOT_SWAPPABLE
 *   - All updates happen in a single transaction (no partial updates on failure)
 *
 * @param {string} tournamentId - Tournament primary key
 * @param {Array<{matchId: string, field: 'player1Id'|'player2Id', newPlayerId: string}>} swaps
 * @returns {Promise<{swapped: number}>} Number of swaps applied
 * @throws {Error} TOURNAMENT_NOT_FOUND | BRACKET_LOCKED | BYE_SLOT_NOT_SWAPPABLE
 */
export async function swapSlots(tournamentId, swaps) {
  // Step 1: Verify tournament exists and is not locked
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, status: true }
  });

  if (!tournament) {
    throw makeError('TOURNAMENT_NOT_FOUND', `Tournament ${tournamentId} not found`);
  }

  if (tournament.status === 'IN_PROGRESS' || tournament.status === 'COMPLETED') {
    throw makeError(
      'BRACKET_LOCKED',
      `Cannot swap slots when tournament status is ${tournament.status}`
    );
  }

  // Step 2: Load targeted matches and check for BYE guard
  const matchIds = swaps.map((s) => s.matchId);
  const matches = await prisma.match.findMany({
    where: { id: { in: matchIds } }
  });

  // Step 3: Guard — no BYE matches allowed (DRAW-07)
  const byeMatch = matches.find((m) => m.isBye);
  if (byeMatch) {
    throw makeError(
      'BYE_SLOT_NOT_SWAPPABLE',
      `Match ${byeMatch.id} is a BYE match and cannot have slots swapped`
    );
  }

  // Step 4: Atomically apply all swaps in a single transaction (DRAW-06)
  await prisma.$transaction(async (tx) => {
    for (const swap of swaps) {
      await tx.match.update({
        where: { id: swap.matchId },
        data: { [swap.field]: swap.newPlayerId }
      });
    }
  });

  return { swapped: swaps.length };
}
