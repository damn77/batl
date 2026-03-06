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
import { getBracketByPlayerCount } from './bracketService.js';

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
 * @param {string} [options.mode='seeded'] - 'seeded' | 'manual'. Manual mode creates empty bracket (no auto-placement)
 * @returns {Promise<{bracket: Object, roundCount: number, matchCount: number}>}
 * @throws {Error} TOURNAMENT_NOT_FOUND | REGISTRATION_NOT_CLOSED | BRACKET_LOCKED | INSUFFICIENT_PLAYERS
 */
export async function generateBracket(tournamentId, options = {}) {
  const { randomSeed, mode = 'seeded' } = options;

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

  // Step 4: Guard — bracket is locked if tournament is in progress/completed AND a bracket exists (DRAW-05)
  // Allow initial draw generation for IN_PROGRESS when no bracket has been created yet (recovery path)
  if (tournament.status === 'IN_PROGRESS' || tournament.status === 'COMPLETED') {
    const existingBracketCount = await prisma.bracket.count({ where: { tournamentId } });
    if (existingBracketCount > 0) {
      throw makeError(
        'BRACKET_LOCKED',
        `Cannot modify bracket when tournament status is ${tournament.status}`
      );
    }
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

  // --- MANUAL MODE: skip seeding, create empty bracket ---
  // Step 7 (manual): Load bracket template to determine BYE positions from structure string
  let positions, bracketSize, structure, actualSeed;

  if (mode === 'manual') {
    const templateResult = await getBracketByPlayerCount(playerCount);
    bracketSize = templateResult.bracketSize;
    structure = (templateResult.structure || '').replace(/\s/g, '');

    // Build positions array: bracketSize slots, all null (no players placed yet)
    positions = Array.from({ length: bracketSize }, () => ({ entityId: null }));
    actualSeed = null;
  } else {
    // Step 7 (seeded): Call seeding placement service to get seeded positions
    let seedingResult;
    try {
      seedingResult = await generateSeededBracket(
        tournament.categoryId,
        playerCount,
        randomSeed
      );
    } catch (seedingError) {
      // Fallback: if seeding fails for any reason (no rankings, service error),
      // create an empty bracket and let all players go through unseeded placement
      const templateResult = await getBracketByPlayerCount(playerCount);
      seedingResult = {
        bracket: {
          playerCount,
          bracketSize: templateResult.bracketSize,
          structure: (templateResult.structure || '').replace(/\s/g, ''),
          seedCount: 0,
          positions: Array.from({ length: templateResult.bracketSize }, (_, i) => ({
            positionNumber: i + 1,
            positionIndex: i,
            seed: null,
            entityId: null,
            entityType: null,
            entityName: null,
            isBye: false,
            isPreliminary: false
          })),
          randomSeed: randomSeed || null
        },
        seedingInfo: { seedCount: 0, note: 'Seeding unavailable, using random placement.' }
      };
    }

    // structure is match-indexed: structure[matchIdx] === '1' means BYE match,
    // '0' means preliminary match. Length = bracketSize / 2.
    ({ positions, bracketSize, randomSeed: actualSeed } = seedingResult.bracket);
    const rawStructure = seedingResult.bracket.structure;
    structure = (rawStructure || '').replace(/\s/g, '');

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
    const totalMatchesSeeded = bracketSize / 2;
    for (let matchIdx = 0; matchIdx < totalMatchesSeeded; matchIdx++) {
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
    for (let matchIdx = 0; matchIdx < totalMatchesSeeded; matchIdx++) {
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

    // Step 7c: Defensive guard — validate entity IDs match expected table.
    // For DOUBLES, all entityIds must be valid DoublesPair IDs.
    // This prevents a raw FK constraint violation from reaching Prisma and provides
    // a clear, actionable error message if the wrong ranking type was used for seeding.
    if (categoryType === 'DOUBLES') {
      const entityIds = positions
        .map(p => p.entityId)
        .filter(id => id != null);
      if (entityIds.length > 0) {
        const pairCount = await prisma.doublesPair.count({
          where: { id: { in: entityIds } }
        });
        if (pairCount !== entityIds.length) {
          throw makeError(
            'INVALID_ENTITY_IDS',
            `Seeding returned ${entityIds.length - pairCount} entity IDs that are not valid DoublesPair records. This typically means ranking entries of the wrong type (MEN/WOMEN instead of PAIR) were used for seeding.`
          );
        }
      }
    }
  }

  // Step 8: Persist atomically inside a Prisma transaction (DRAW-02, DRAW-04)
  let matchCount = 0;
  const isManual = mode === 'manual';

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
        matchGuarantee,
        drawMode: isManual ? 'MANUAL' : 'SEEDED'
      }
    });

    // Step 8c: Create Rounds and Matches
    const totalRounds = Math.log2(bracketSize);
    let matchNumber = 1;

    // Collected during Round 1 creation for BYE pre-population in Round 2 (seeded mode only)
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
              // Manual mode: all player/pair slots null (organizer places manually)
              // Seeded mode: BYE matches set isBye=true with player in slot 1, BYE slot null
              pair1Id: isManual ? null : (pos1?.entityId || null),
              pair2Id: isManual ? null : (pos2?.entityId || null),
              player1Id: null,
              player2Id: null,
              pair1Seed: isManual ? null : (pos1?.seed || null),
              pair2Seed: isManual ? null : (pos2?.seed || null)
            };
          } else {
            matchData = {
              tournamentId,
              bracketId: bracket.id,
              roundId: round.id,
              matchNumber: matchNumber++,
              isBye: isByeMatch,
              status: isByeMatch ? 'BYE' : 'SCHEDULED',
              // Manual mode: all player slots null (organizer places manually)
              // Seeded mode: BYE matches have player in slot 1, BYE slot null
              player1Id: isManual ? null : (pos1?.entityId || null),
              player2Id: isManual ? null : (pos2?.entityId || null),
              player1Seed: isManual ? null : (pos1?.seed || null),
              player2Seed: isManual ? null : (pos2?.seed || null)
            };
          }

          await tx.match.create({ data: matchData });
          matchCount++;

          // Track BYE matches for Round 2 pre-population (seeded mode only — no players to advance in manual)
          if (isByeMatch && !isManual) {
            byeInfo.push({
              posInRound: i,
              playerId: categoryType !== 'DOUBLES' ? (pos1?.entityId || null) : null,
              pairId: categoryType === 'DOUBLES' ? (pos1?.entityId || null) : null,
              seed: pos1?.seed || null
            });
          }
        }
      } else {
        // Rounds 2+: placeholder matches — player IDs start null (BYEs pre-populated below in seeded mode)
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

    // Step 8d: Pre-populate Round 2 slots for BYE players (seeded mode only).
    // BYE matches auto-advance their player — no result is ever submitted for them,
    // so advanceBracketSlot never runs. We seed Round 2 here at bracket creation time.
    // In manual mode, players haven't been placed yet, so we skip this step.
    for (const bye of byeInfo) {
      const round2Idx = Math.floor(bye.posInRound / 2);
      const isPlayer1Slot = bye.posInRound % 2 === 0;
      const targetMatchId = round2MatchIds[round2Idx];
      if (!targetMatchId) continue;

      const updateData = {};
      if (categoryType === 'DOUBLES') {
        if (isPlayer1Slot) { updateData.pair1Id = bye.pairId; updateData.pair1Seed = bye.seed; }
        else { updateData.pair2Id = bye.pairId; updateData.pair2Seed = bye.seed; }
      } else {
        if (isPlayer1Slot) { updateData.player1Id = bye.playerId; updateData.player1Seed = bye.seed; }
        else { updateData.player2Id = bye.playerId; updateData.player2Seed = bye.seed; }
      }
      await tx.match.update({ where: { id: targetMatchId }, data: updateData });
    }

    // Step 8e: Generate CONSOLATION bracket when matchGuarantee === 'MATCH_2'
    // Consolation bracket is always empty at generation time — applies to both modes
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
 * Assign or clear a player/pair in a specific Round 1 bracket slot.
 *
 * Business rules (DRAW-01, DRAW-02, DRAW-06):
 *   - Tournament must exist → TOURNAMENT_NOT_FOUND
 *   - Tournament must not be IN_PROGRESS or COMPLETED → BRACKET_LOCKED
 *   - Target match must exist in this tournament and be Round 1 → MATCH_NOT_FOUND / NOT_ROUND_1
 *   - Target match must not be a BYE match → BYE_SLOT_NOT_ASSIGNABLE
 *   - If assigning (entityId not null):
 *       - Player/pair must be registered → NOT_REGISTERED
 *       - Player/pair must not already be placed in a different slot → ALREADY_PLACED
 *   - Assigning next to a BYE match auto-advances the player to Round 2
 *   - Clearing a BYE-adjacent slot also removes the player from Round 2
 *   - Reassignment atomically clears old occupant (with Round 2 undo) and places new entity
 *
 * @param {string} tournamentId - Tournament primary key
 * @param {Object} assignment - Assignment details
 * @param {string} assignment.matchId - Target Round 1 match ID
 * @param {'player1'|'player2'} assignment.slot - Which slot in the match
 * @param {string|null} assignment.playerId - Player profile ID for singles (null to clear)
 * @param {string|null} assignment.pairId - Doubles pair ID for doubles (null to clear)
 * @returns {Promise<{matchId: string, slot: string, entityId: string|null, action: string}>}
 * @throws {Error} TOURNAMENT_NOT_FOUND | BRACKET_LOCKED | MATCH_NOT_FOUND | NOT_ROUND_1 | BYE_SLOT_NOT_ASSIGNABLE | NOT_REGISTERED | ALREADY_PLACED
 */
export async function assignPosition(tournamentId, assignment) {
  const { matchId, slot, playerId, pairId } = assignment;

  return prisma.$transaction(async (tx) => {
    // Step 1: Load and validate tournament
    const tournament = await tx.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        status: true,
        categoryId: true,
        category: { select: { type: true } }
      }
    });

    if (!tournament) {
      throw makeError('TOURNAMENT_NOT_FOUND', `Tournament ${tournamentId} not found`);
    }

    if (tournament.status === 'IN_PROGRESS' || tournament.status === 'COMPLETED') {
      throw makeError(
        'BRACKET_LOCKED',
        'Cannot modify bracket when tournament is in progress or completed'
      );
    }

    // Step 2: Load and validate target match
    const targetMatch = await tx.match.findUnique({
      where: { id: matchId },
      include: { round: { select: { roundNumber: true, bracketId: true } } }
    });

    if (!targetMatch || targetMatch.tournamentId !== tournamentId) {
      throw makeError('MATCH_NOT_FOUND', `Match ${matchId} not found in tournament ${tournamentId}`);
    }

    if (targetMatch.round?.roundNumber !== 1) {
      throw makeError('NOT_ROUND_1', 'Can only assign positions in Round 1');
    }

    if (targetMatch.isBye && slot === 'player2') {
      throw makeError('BYE_SLOT_NOT_ASSIGNABLE', 'Cannot assign players to the BYE slot');
    }

    // Step 3: Determine entity field names based on category type
    const isDoubles = tournament.category?.type === 'DOUBLES';
    const entityId = isDoubles ? pairId : playerId;
    const entityField1 = isDoubles ? 'pair1Id' : 'player1Id';
    const entityField2 = isDoubles ? 'pair2Id' : 'player2Id';
    const slotField = slot === 'player1' ? entityField1 : entityField2;

    // Step 4: If assigning (not clearing), validate registration and uniqueness
    if (entityId !== null && entityId !== undefined) {
      // Registration check
      if (isDoubles) {
        const pairReg = await tx.pairRegistration.findFirst({
          where: { tournamentId, pairId: entityId, status: 'REGISTERED' }
        });
        if (!pairReg) {
          throw makeError('NOT_REGISTERED', 'Pair is not registered for this tournament');
        }
      } else {
        const playerReg = await tx.tournamentRegistration.findFirst({
          where: { tournamentId, playerId: entityId, status: 'REGISTERED' }
        });
        if (!playerReg) {
          throw makeError('NOT_REGISTERED', 'Player is not registered for this tournament');
        }
      }

      // Already-placed check: load all Round 1 matches in the MAIN bracket
      const bracketId = targetMatch.round?.bracketId;
      const round1Matches = await tx.match.findMany({
        where: { tournamentId, round: { bracketId, roundNumber: 1 } },
        orderBy: { matchNumber: 'asc' }
      });

      for (const m of round1Matches) {
        const inSlot1 = m[entityField1] === entityId;
        const inSlot2 = m[entityField2] === entityId;
        if (inSlot1 || inSlot2) {
          // Check if same match + same slot (no-op: already assigned here)
          const sameMatch = m.id === matchId;
          const sameSlot = (inSlot1 && slot === 'player1') || (inSlot2 && slot === 'player2');
          if (sameMatch && sameSlot) {
            // Already assigned to this exact slot — no-op
            return {
              matchId,
              slot,
              entityId,
              action: 'assigned'
            };
          }
          throw makeError(
            'ALREADY_PLACED',
            'Player/pair is already placed at a different bracket position'
          );
        }
      }
    }

    // Helper to compute BYE-adjacent Round 2 update data
    // Returns { round2MatchId, round2UpdateData } or null if not BYE-adjacent
    async function getByeAdjacentRound2Update(matchIdToCheck, entityToPlace) {
      const bracketId = targetMatch.round?.bracketId;
      const round1Matches = await tx.match.findMany({
        where: { tournamentId, round: { bracketId, roundNumber: 1 } },
        orderBy: { matchNumber: 'asc' }
      });

      const posInRound = round1Matches.findIndex(m => m.id === matchIdToCheck);
      if (posInRound === -1) return null;

      // Partner match index: even pairs with odd (posInRound+1), odd pairs with even (posInRound-1)
      const partnerIdx = posInRound % 2 === 0 ? posInRound + 1 : posInRound - 1;
      const partnerMatch = round1Matches[partnerIdx];
      if (!partnerMatch || !partnerMatch.isBye) return null;

      // This match is BYE-adjacent — get the Round 2 match
      const round2MatchIdx = Math.floor(posInRound / 2);
      const isPlayer1Slot = posInRound % 2 === 0;

      const round2Matches = await tx.match.findMany({
        where: { tournamentId, round: { bracketId, roundNumber: 2 } },
        orderBy: { matchNumber: 'asc' }
      });

      const round2Match = round2Matches[round2MatchIdx];
      if (!round2Match) return null;

      const round2Field = isPlayer1Slot ? entityField1 : entityField2;
      return {
        round2MatchId: round2Match.id,
        round2Field,
        round2UpdateData: { [round2Field]: entityToPlace }
      };
    }

    // Step 5: Handle current occupant of the target slot (reassignment)
    const currentOccupant = targetMatch[slotField];

    if (currentOccupant !== null && currentOccupant !== undefined && currentOccupant !== entityId) {
      // Undo Round 2 pre-population for the old occupant if BYE-adjacent
      const byeAdjacentInfo = await getByeAdjacentRound2Update(matchId, null);
      if (byeAdjacentInfo) {
        await tx.match.update({
          where: { id: byeAdjacentInfo.round2MatchId },
          data: byeAdjacentInfo.round2UpdateData
        });
      }

      // Clear the target slot
      await tx.match.update({
        where: { id: matchId },
        data: { [slotField]: null }
      });
    }

    // Step 6 & 7: If clearing (entityId is null/undefined), also undo Round 2 pre-population
    if (entityId === null || entityId === undefined) {
      if (currentOccupant !== null && currentOccupant !== undefined) {
        // Was occupied — undo Round 2 advancement if BYE-adjacent
        const byeAdjacentInfo = await getByeAdjacentRound2Update(matchId, null);
        if (byeAdjacentInfo) {
          await tx.match.update({
            where: { id: byeAdjacentInfo.round2MatchId },
            data: byeAdjacentInfo.round2UpdateData
          });
        }
        // Undo Round 2 advancement if match itself is a BYE
        if (targetMatch.isBye && slot === 'player1') {
          const bracketId = targetMatch.round?.bracketId;
          const round1Matches = await tx.match.findMany({
            where: { tournamentId, round: { bracketId, roundNumber: 1 } },
            orderBy: { matchNumber: 'asc' }
          });
          const posInRound = round1Matches.findIndex(m => m.id === matchId);
          if (posInRound !== -1) {
            const round2MatchIdx = Math.floor(posInRound / 2);
            const isPlayer1InR2 = posInRound % 2 === 0;
            const round2Matches = await tx.match.findMany({
              where: { tournamentId, round: { bracketId, roundNumber: 2 } },
              orderBy: { matchNumber: 'asc' }
            });
            const round2Match = round2Matches[round2MatchIdx];
            if (round2Match) {
              const r2Field = isPlayer1InR2 ? entityField1 : entityField2;
              await tx.match.update({
                where: { id: round2Match.id },
                data: { [r2Field]: null }
              });
            }
          }
        }
        // Clear the slot
        await tx.match.update({
          where: { id: matchId },
          data: { [slotField]: null }
        });
      }

      return { matchId, slot, entityId: null, action: 'cleared' };
    }

    // Step 8: Assign the new entity
    await tx.match.update({
      where: { id: matchId },
      data: { [slotField]: entityId }
    });

    // BYE auto-advance: if this match is BYE-adjacent, pre-populate Round 2
    const byeAdjacentInfo = await getByeAdjacentRound2Update(matchId, entityId);
    if (byeAdjacentInfo) {
      await tx.match.update({
        where: { id: byeAdjacentInfo.round2MatchId },
        data: byeAdjacentInfo.round2UpdateData
      });
    }

    // BYE match auto-advance: if the match itself is a BYE, the player1 auto-advances to Round 2
    if (targetMatch.isBye && slot === 'player1') {
      const bracketId = targetMatch.round?.bracketId;
      const round1Matches = await tx.match.findMany({
        where: { tournamentId, round: { bracketId, roundNumber: 1 } },
        orderBy: { matchNumber: 'asc' }
      });
      const posInRound = round1Matches.findIndex(m => m.id === matchId);
      if (posInRound !== -1) {
        const round2MatchIdx = Math.floor(posInRound / 2);
        const isPlayer1InR2 = posInRound % 2 === 0;
        const round2Matches = await tx.match.findMany({
          where: { tournamentId, round: { bracketId, roundNumber: 2 } },
          orderBy: { matchNumber: 'asc' }
        });
        const round2Match = round2Matches[round2MatchIdx];
        if (round2Match) {
          const r2Field = isPlayer1InR2 ? entityField1 : entityField2;
          await tx.match.update({
            where: { id: round2Match.id },
            data: { [r2Field]: entityId }
          });
        }
      }
    }

    // Step 9: Return result
    return {
      matchId,
      slot,
      entityId,
      action: 'assigned'
    };
  });
}

/**
 * Atomically swap player slots across multiple matches.
 *
 * Business rules (DRAW-06, DRAW-07):
 *   - Tournament must exist → TOURNAMENT_NOT_FOUND
 *   - Tournament must not be IN_PROGRESS or COMPLETED → BRACKET_LOCKED
 *   - BYE matches only allow player1 (auto-advance) slot swaps → BYE_SLOT_NOT_SWAPPABLE
 *   - All updates happen in a single transaction (no partial updates on failure)
 *
 * @param {string} tournamentId - Tournament primary key
 * @param {Array<{matchId: string, field: 'player1Id'|'player2Id'|'pair1Id'|'pair2Id', newPlayerId: string}>} swaps
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

  // Step 3: Guard — BYE matches only allow player1 (auto-advancing slot) swaps (DRAW-07)
  const byeMatchIds = new Set(matches.filter((m) => m.isBye).map((m) => m.id));
  const blockedSwap = swaps.find(
    (s) => byeMatchIds.has(s.matchId) && (s.field === 'player2Id' || s.field === 'pair2Id')
  );
  if (blockedSwap) {
    throw makeError(
      'BYE_SLOT_NOT_SWAPPABLE',
      `Match ${blockedSwap.matchId} is a BYE match — only the player1 (auto-advance) slot can be changed`
    );
  }

  // Step 4: Atomically apply all swaps in a single transaction (DRAW-06)
  let totalSwaps = swaps.length;
  await prisma.$transaction(async (tx) => {
    for (const swap of swaps) {
      await tx.match.update({
        where: { id: swap.matchId },
        data: { [swap.field]: swap.newPlayerId }
      });

      // Step 5: Cascade BYE auto-advancement to the next round
      // When a BYE match's player1/pair1 is changed, the winner (who auto-advances)
      // must be updated in the corresponding next-round match slot.
      const match = matches.find((m) => m.id === swap.matchId);
      if (match?.isBye && (swap.field === 'player1Id' || swap.field === 'pair1Id')) {
        // Find this match's round to locate the next round
        const round = await tx.round.findUnique({ where: { id: match.roundId } });
        if (!round) continue;

        const nextRound = await tx.round.findFirst({
          where: { bracketId: round.bracketId, roundNumber: round.roundNumber + 1 }
        });
        if (!nextRound) continue;

        // Determine position: match's index in its round → next round slot
        const currentRoundMatches = await tx.match.findMany({
          where: { roundId: round.id },
          orderBy: { matchNumber: 'asc' },
          select: { id: true }
        });
        const posInRound = currentRoundMatches.findIndex((m) => m.id === match.id);
        if (posInRound < 0) continue;

        const nextPosInRound = Math.floor(posInRound / 2);
        const isTopSlot = posInRound % 2 === 0; // even → player1/pair1, odd → player2/pair2

        const nextRoundMatches = await tx.match.findMany({
          where: { roundId: nextRound.id },
          orderBy: { matchNumber: 'asc' },
          select: { id: true }
        });
        const nextMatch = nextRoundMatches[nextPosInRound];
        if (!nextMatch) continue;

        // Update the correct slot in the next round match
        const isPair = swap.field === 'pair1Id';
        const nextSlotField = isPair
          ? (isTopSlot ? 'pair1Id' : 'pair2Id')
          : (isTopSlot ? 'player1Id' : 'player2Id');

        await tx.match.update({
          where: { id: nextMatch.id },
          data: { [nextSlotField]: swap.newPlayerId }
        });
        totalSwaps++;
      }
    }
  });

  return { swapped: totalSwaps };
}
