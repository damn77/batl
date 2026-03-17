/**
 * Group Persistence Service
 *
 * Implements group draw generation for GROUP and COMBINED tournament formats.
 * Provides:
 *   - Snake-draft seeding: distributes top-ranked players evenly across groups
 *   - Circle-method round-robin: generates N*(N-1)/2 unique fixtures per group
 *   - Atomic generation: persists Group + GroupParticipant + Round + Match records
 *
 * Feature: 27-group-formation, Plan 01
 * Requirements: GFORM-01, GFORM-02, GFORM-04, GFORM-05, GFORM-07
 * Dependencies: Feature 010 (seeding), Feature 008 (rankings), Prisma
 */

import prisma from '../lib/prisma.js';
import { getSeededPlayers, shuffle, createRandomSeed } from './seedingPlacementService.js';

/**
 * Helper: create structured errors with a machine-readable code property.
 *
 * @param {string} code - Machine-readable error code
 * @param {string} message - Human-readable error message
 * @returns {Error} Error with .code property
 */
function makeError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/**
 * Distribute seeded (ranked) players across groups using the snake-draft algorithm.
 *
 * The snake draft distributes top-ranked players as evenly as possible:
 *   - Round 1 (forward): fill groups 0 → groupCount-1
 *   - Round 2 (reverse): fill groups groupCount-1 → 0
 *   - Round 3 (forward): fill groups 0 → groupCount-1
 *   - ... alternating each round
 *
 * Only `seededRounds * groupCount` entities are placed; the remaining
 * unseeded entities are handled by fillUnseeded().
 *
 * @param {Array<Object>} rankedEntities - Players/pairs sorted by rank (best first)
 * @param {number} groupCount - Number of groups
 * @param {number} seededRounds - Number of rounds to fill with seeded players
 * @returns {Array<Array<Object>>} Array of groupCount arrays, each containing entities for that group
 */
export function snakeDraft(rankedEntities, groupCount, seededRounds) {
  // Initialize empty groups
  const groups = Array.from({ length: groupCount }, () => []);

  if (seededRounds === 0) {
    return groups;
  }

  const totalSeeded = seededRounds * groupCount;
  const entitiesToPlace = rankedEntities.slice(0, totalSeeded);

  for (let round = 0; round < seededRounds; round++) {
    const isForward = round % 2 === 0;
    for (let i = 0; i < groupCount; i++) {
      const entityIdx = round * groupCount + i;
      if (entityIdx >= entitiesToPlace.length) break;
      const groupIdx = isForward ? i : (groupCount - 1 - i);
      groups[groupIdx].push(entitiesToPlace[entityIdx]);
    }
  }

  return groups;
}

/**
 * Fill remaining group slots with unseeded players using deterministic shuffle.
 *
 * Shuffles unseeded entities using the provided random seed, then distributes
 * them snake-style across groups (filling group 0 first, then 1, etc. —
 * continuing the natural snake-fill order after seeded rounds).
 *
 * The first groups receive extra players when count is not evenly divisible.
 *
 * @param {Array<Array<Object>>} groups - Groups partially filled by snakeDraft (mutated in place)
 * @param {Array<Object>} unseededEntities - Entities not placed by snakeDraft
 * @param {string} randomSeed - Deterministic seed for Fisher-Yates shuffle
 * @returns {void} Modifies groups in place
 */
export function fillUnseeded(groups, unseededEntities, randomSeed) {
  const shuffled = shuffle(unseededEntities, randomSeed);
  const groupCount = groups.length;

  // Determine how many players each group needs
  const currentSizes = groups.map(g => g.length);
  const totalCurrent = currentSizes.reduce((sum, s) => sum + s, 0);
  const totalAfter = totalCurrent + shuffled.length;
  const targetBase = Math.floor(totalAfter / groupCount);
  const remainder = totalAfter % groupCount;

  // Calculate how many each group needs
  const targets = groups.map((g, i) => {
    const targetSize = i < remainder ? targetBase + 1 : targetBase;
    return Math.max(0, targetSize - g.length);
  });

  // Distribute shuffled entities into groups
  let unseededIdx = 0;
  for (let i = 0; i < groupCount; i++) {
    for (let j = 0; j < targets[i]; j++) {
      if (unseededIdx < shuffled.length) {
        groups[i].push(shuffled[unseededIdx++]);
      }
    }
  }
}

/**
 * Generate round-robin fixtures for a group using the circle method.
 *
 * The circle method produces a schedule where every participant plays every
 * other participant exactly once: N*(N-1)/2 unique matches for N participants.
 *
 * Algorithm:
 *   - If N is odd, add null BYE sentinel to make N even
 *   - Generate N-1 rounds (where N is the even-padded count)
 *   - Each round: pair positions[i] with positions[N-1-i] for i in 0..N/2-1
 *   - After each round: fix positions[0], rotate positions[1..N-1]
 *     (remove last element, insert at index 1)
 *   - Skip fixtures where either participant is null (BYE)
 *
 * Match numbering: groupNumber * 100 + matchIndex + 1
 *   Group 1: 101, 102, 103, ...
 *   Group 2: 201, 202, 203, ...
 *
 * @param {Array} participants - Participant IDs or objects for this group
 * @param {number} groupNumber - Group number (1-indexed) for match numbering
 * @returns {Array<{round: number, matchNumber: number, p1: any, p2: any}>} Fixtures
 */
export function generateCircleRoundRobin(participants, groupNumber) {
  const fixtures = [];
  let matchIndex = 0;

  // Pad to even number with null BYE sentinel
  const positions = [...participants];
  if (positions.length % 2 !== 0) {
    positions.push(null); // BYE sentinel
  }

  const n = positions.length;
  const numRounds = n - 1;

  for (let round = 0; round < numRounds; round++) {
    // Generate matches for this round
    for (let i = 0; i < n / 2; i++) {
      const p1 = positions[i];
      const p2 = positions[n - 1 - i];

      // Skip BYE fixtures (either participant is null)
      if (p1 === null || p2 === null) continue;

      fixtures.push({
        round: round + 1,
        matchNumber: groupNumber * 100 + matchIndex + 1,
        p1,
        p2
      });
      matchIndex++;
    }

    // Rotate: fix positions[0], rotate positions[1..n-1]
    // Remove last element (positions[n-1]) and insert at index 1
    const last = positions.pop();
    positions.splice(1, 0, last);
  }

  return fixtures;
}

/**
 * Validate that player count and group count produce balanced groups.
 *
 * Groups are considered balanced if:
 *   - The size difference between largest and smallest group is at most 1
 *   - Every group has at least 2 players (minimum for round-robin)
 *
 * @param {number} playerCount - Total number of players/pairs
 * @param {number} groupCount - Number of groups
 * @returns {{ valid: boolean, sizes: string, error?: string }}
 */
export function validateGroupBalance(playerCount, groupCount) {
  const baseSize = Math.floor(playerCount / groupCount);
  const largerGroupCount = playerCount % groupCount;

  // Build size description string
  const sizeParts = [];
  if (largerGroupCount > 0) {
    sizeParts.push(`${largerGroupCount} of ${baseSize + 1}`);
  }
  const smallerGroupCount = groupCount - largerGroupCount;
  if (smallerGroupCount > 0) {
    sizeParts.push(`${smallerGroupCount} of ${baseSize}`);
  }
  const sizes = sizeParts.join(', ');

  // Check minimum group size (at least 2 players per group)
  if (baseSize < 2) {
    return {
      valid: false,
      sizes,
      error: `Each group must have at least 2 players. With ${playerCount} players and ${groupCount} groups, minimum group size would be ${baseSize}.`
    };
  }

  // Difference between largest and smallest is at most 1 (always true for floor/ceiling split)
  return { valid: true, sizes };
}

/**
 * Generate a complete group draw and persist it atomically to the database.
 *
 * Business rules:
 *   - Tournament must exist → TOURNAMENT_NOT_FOUND
 *   - Tournament status must be SCHEDULED → INVALID_STATUS
 *   - Registration must be closed → REGISTRATION_NOT_CLOSED
 *   - Minimum 4 players required → INSUFFICIENT_PLAYERS
 *   - groupCount must be >= 2 → INVALID_GROUP_COUNT
 *   - groupCount must be <= floor(playerCount / 2) → INVALID_GROUP_COUNT
 *   - Groups must be balanced (max 1-player size difference) → UNBALANCED_GROUPS
 *   - Existing groups are deleted before new ones are created → idempotent
 *
 * For DOUBLES tournaments: uses pairId in GroupParticipant records (not playerId).
 * For SINGLES tournaments: uses playerId in GroupParticipant records.
 *
 * @param {string} tournamentId - Tournament primary key
 * @param {Object} options - Generation options
 * @param {number} options.groupCount - Number of groups (>= 2)
 * @param {number} [options.seededRounds=0] - Rounds to fill with seeded players
 * @param {string} [options.randomSeed] - Optional deterministic seed
 * @returns {Promise<{groups: Array, participantCount: number, matchCount: number, randomSeed: string}>}
 * @throws {Error} TOURNAMENT_NOT_FOUND | INVALID_STATUS | REGISTRATION_NOT_CLOSED |
 *                 INSUFFICIENT_PLAYERS | INVALID_GROUP_COUNT | UNBALANCED_GROUPS
 */
export async function generateGroupDraw(tournamentId, options = {}) {
  const { groupCount, seededRounds = 0, randomSeed: inputSeed } = options;

  // Step 1: Load tournament with category info
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      status: true,
      registrationClosed: true,
      categoryId: true,
      category: { select: { type: true } }
    }
  });

  if (!tournament) {
    throw makeError('TOURNAMENT_NOT_FOUND', `Tournament ${tournamentId} not found`);
  }

  // Step 2: Guard — tournament must be SCHEDULED
  if (tournament.status !== 'SCHEDULED') {
    throw makeError(
      'INVALID_STATUS',
      `Tournament must be SCHEDULED to generate group draw. Current status: ${tournament.status}`
    );
  }

  // Step 3: Guard — registration must be closed
  if (!tournament.registrationClosed) {
    throw makeError(
      'REGISTRATION_NOT_CLOSED',
      'Registration must be closed before generating group draw'
    );
  }

  // Step 4: Load registered entities (players or pairs)
  const categoryType = tournament.category?.type;
  let allEntities;

  if (categoryType === 'DOUBLES') {
    const pairRegs = await prisma.pairRegistration.findMany({
      where: { tournamentId, status: 'REGISTERED' },
      include: { pair: { select: { id: true } } }
    });
    allEntities = pairRegs.map(r => ({ entityId: r.pair.id }));
  } else {
    const registrations = await prisma.tournamentRegistration.findMany({
      where: { tournamentId, status: 'REGISTERED' },
      include: { player: { select: { id: true } } }
    });
    allEntities = registrations.map(r => ({ entityId: r.player.id }));
  }

  const playerCount = allEntities.length;

  // Step 5: Guard — minimum 4 players
  if (playerCount < 4) {
    throw makeError(
      'INSUFFICIENT_PLAYERS',
      `Need at least 4 players to generate group draw. Found: ${playerCount}`
    );
  }

  // Step 6: Guard — groupCount must be valid
  if (!groupCount || groupCount < 2) {
    throw makeError(
      'INVALID_GROUP_COUNT',
      'Group count must be at least 2'
    );
  }

  if (groupCount > Math.floor(playerCount / 2)) {
    throw makeError(
      'INVALID_GROUP_COUNT',
      `Group count ${groupCount} is too large for ${playerCount} players. Maximum: ${Math.floor(playerCount / 2)}`
    );
  }

  // Step 7: Validate group balance
  const balanceCheck = validateGroupBalance(playerCount, groupCount);
  if (!balanceCheck.valid) {
    throw makeError('UNBALANCED_GROUPS', balanceCheck.error);
  }

  // Step 8: Determine random seed
  const randomSeed = inputSeed || createRandomSeed();

  // Step 9: Snake-draft seeded players
  let groups;
  if (seededRounds > 0) {
    const seedCount = seededRounds * groupCount;
    const seededPlayers = await getSeededPlayers(tournament.categoryId, seedCount);
    groups = snakeDraft(seededPlayers, groupCount, seededRounds);

    // Determine which entities are NOT seeded
    const seededIds = new Set(seededPlayers.map(p => p.entityId));
    const unseeded = allEntities.filter(e => !seededIds.has(e.entityId));
    fillUnseeded(groups, unseeded, randomSeed);
  } else {
    groups = snakeDraft([], groupCount, 0);
    fillUnseeded(groups, allEntities, randomSeed);
  }

  // Step 10: Persist atomically in a Prisma transaction
  let totalMatchCount = 0;
  const groupRecords = [];

  await prisma.$transaction(async (tx) => {
    // Step 10a: Delete existing groups (cascade deletes GroupParticipants and Matches)
    const existingGroups = await tx.group.findMany({
      where: { tournamentId },
      select: { id: true }
    });
    const existingGroupIds = existingGroups.map(g => g.id);

    if (existingGroupIds.length > 0) {
      await tx.match.deleteMany({ where: { groupId: { in: existingGroupIds } } });
      await tx.groupParticipant.deleteMany({ where: { groupId: { in: existingGroupIds } } });
      await tx.group.deleteMany({ where: { tournamentId } });
    }

    // Step 10b: Create Groups and GroupParticipants
    for (let i = 0; i < groupCount; i++) {
      const groupEntities = groups[i];
      const groupNumber = i + 1;

      const group = await tx.group.create({
        data: {
          tournamentId,
          groupNumber,
          groupSize: groupEntities.length
        }
      });
      groupRecords.push(group);

      // Create GroupParticipants
      for (let j = 0; j < groupEntities.length; j++) {
        const entity = groupEntities[j];
        // seedPosition: 1-indexed global seed (from snakeDraft order)
        // entities placed by snakeDraft have their original rank; unseeded have null
        const seedPosition = entity.rank != null ? entity.rank : null;

        const participantData = {
          groupId: group.id,
          seedPosition
        };

        if (categoryType === 'DOUBLES') {
          participantData.pairId = entity.entityId;
        } else {
          participantData.playerId = entity.entityId;
        }

        await tx.groupParticipant.create({ data: participantData });
      }

      // Step 10c: Generate round-robin fixtures for this group
      // Use participant IDs (entityId) as the participants
      const participantIds = groupEntities.map(e => e.entityId);
      const fixtures = generateCircleRoundRobin(participantIds, groupNumber);

      // Determine number of rounds (N-1 where N is padded to even)
      const paddedN = participantIds.length % 2 === 0
        ? participantIds.length
        : participantIds.length + 1;
      const numRounds = paddedN - 1;

      // Create Round records (one per round-robin round)
      const roundRecords = [];
      for (let roundNum = 1; roundNum <= numRounds; roundNum++) {
        const round = await tx.round.create({
          data: {
            tournamentId,
            bracketId: null,
            roundNumber: roundNum
          }
        });
        roundRecords.push(round);
      }

      // Create Match records from fixtures
      for (const fixture of fixtures) {
        const roundRecord = roundRecords[fixture.round - 1];

        const matchData = {
          tournamentId,
          groupId: group.id,
          roundId: roundRecord.id,
          matchNumber: fixture.matchNumber,
          status: 'SCHEDULED'
        };

        if (categoryType === 'DOUBLES') {
          matchData.pair1Id = fixture.p1;
          matchData.pair2Id = fixture.p2;
        } else {
          matchData.player1Id = fixture.p1;
          matchData.player2Id = fixture.p2;
        }

        await tx.match.create({ data: matchData });
        totalMatchCount++;
      }
    }
  });

  return {
    groups: groupRecords,
    participantCount: playerCount,
    matchCount: totalMatchCount,
    randomSeed
  };
}
