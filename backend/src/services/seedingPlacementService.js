/**
 * Seeding Placement Service
 *
 * Implements recursive tournament seeding placement algorithm for knockout brackets.
 * Supports 2, 4, 8, and 16 seeded players based on tournament size.
 *
 * Feature: 010-seeding-placement
 * Dependencies: Feature 008 (rankings), Feature 009 (bracket structure)
 */

import crypto from 'crypto';
import seedrandom from 'seedrandom';

/**
 * Determine the number of seeds based on player count
 *
 * Implements seeding ranges from FR-012:
 * - 4-9 players: 2 seeded players
 * - 10-19 players: 4 seeded players
 * - 20-39 players: 8 seeded players
 * - 40-128 players: 16 seeded players
 *
 * @param {number} playerCount - Total number of participants (4-128)
 * @returns {number} Number of seeds (2, 4, 8, or 16)
 * @throws {Error} If player count is outside valid range (4-128)
 *
 * @example
 * getSeedCount(7);   // Returns 2
 * getSeedCount(15);  // Returns 4
 * getSeedCount(25);  // Returns 8
 * getSeedCount(64);  // Returns 16
 */
export function getSeedCount(playerCount) {
  if (playerCount < 4 || playerCount > 128) {
    throw new Error('Player count must be between 4 and 128');
  }

  // Seed count rules from FR-012
  if (playerCount >= 4 && playerCount <= 9) return 2;
  if (playerCount >= 10 && playerCount <= 19) return 4;
  if (playerCount >= 20 && playerCount <= 39) return 8;
  if (playerCount >= 40 && playerCount <= 128) return 16;

  throw new Error(`Invalid player count: ${playerCount}`);
}

/**
 * Create a random seed for deterministic randomization
 *
 * Generates a cryptographically secure random seed that can be used
 * to produce reproducible randomization results. The same seed will
 * always produce the same shuffle order when used with shuffle().
 *
 * @returns {string} Hex-encoded random seed (32 characters)
 *
 * @example
 * const seed = createRandomSeed();
 * // Returns: "a3f5c8b9d2e1f4a6b8c0d3e5f7a9b1c3"
 */
export function createRandomSeed() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Shuffle an array using deterministic randomization
 *
 * Uses the Fisher-Yates algorithm with seeded PRNG for reproducible results.
 * The same input array and seed will always produce the same shuffle order,
 * which is critical for fair and auditable tournament seeding.
 *
 * @param {Array} array - Array to shuffle (any type of elements)
 * @param {string} seed - Seed for deterministic randomization (hex string)
 * @returns {Array} New shuffled array (does not modify original)
 *
 * @example
 * const seeds = [3, 4];
 * const shuffled = shuffle(seeds, 'test-seed-123');
 * // First call might return [4, 3]
 * // Same seed always returns [4, 3]
 *
 * @example
 * const players = ['Alice', 'Bob', 'Charlie'];
 * shuffle(players, 'abc123');  // Returns new array, players unchanged
 */
export function shuffle(array, seed) {
  const rng = seedrandom(seed);
  const result = [...array];

  // Fisher-Yates shuffle with seeded RNG
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/**
 * Place two seeded players at top and bottom of bracket
 *
 * Implements base case for recursive seeding algorithm (FR-001, FR-002):
 * - 1st seed at position 1 (top of bracket)
 * - 2nd seed at last position (bottom of bracket)
 *
 * This ensures maximum separation between top seeds, as they can only
 * meet in the final round.
 *
 * @param {number} bracketSize - Size of bracket (power of 2, e.g., 16, 32, 64)
 * @param {Array<Object>} seeds - Array of seeded players (length 2)
 * @param {string} [structure] - Optional bracket structure for bye/preliminary detection
 * @returns {Array<Object>} Positions array with seeds placed and metadata
 *
 * @example
 * const seeds = [
 *   { rank: 1, entityId: 'p1', entityName: 'Alice' },
 *   { rank: 2, entityId: 'p2', entityName: 'Bob' }
 * ];
 * const positions = placeTwoSeeds(16, seeds);
 * // positions[0]  = { positionNumber: 1, seed: 1, entityName: 'Alice', ... }
 * // positions[15] = { positionNumber: 16, seed: 2, entityName: 'Bob', ... }
 */
export function placeTwoSeeds(bracketSize, seeds, structure) {
  // Initialize positions array
  const positions = [];

  // Place seeds according to 2-seed rules (FR-001, FR-002)
  for (let i = 0; i < bracketSize; i++) {
    const positionNumber = i + 1; // 1-based position number
    const positionIndex = i; // 0-based index

    let seed = null;
    let entity = null;

    // FR-001: 1st seed at position 1 (top)
    if (i === 0) {
      seed = 1;
      entity = seeds[0];
    }
    // FR-002: 2nd seed at bottom position
    else if (i === bracketSize - 1) {
      seed = 2;
      entity = seeds[1];
    }

    // Determine if bye or preliminary based on structure (if provided)
    const isBye = structure ? structure[i] === '1' : false;
    const isPreliminary = structure ? structure[i] === '0' : false;

    positions.push({
      positionNumber,
      positionIndex,
      seed,
      entityId: entity ? entity.entityId : null,
      entityType: entity ? (entity.entityType || 'PLAYER') : null,
      entityName: entity ? entity.entityName : null,
      isBye,
      isPreliminary
    });
  }

  return positions;
}

/**
 * Place four seeded players using recursive 2-seed placement + randomization
 *
 * Implements User Story 2 seeding algorithm (FR-003, FR-004):
 * 1. Places seeds 1-2 using placeTwoSeeds() (recursive)
 * 2. Randomizes seeds 3-4 for fairness
 * 3. Places seed 3/4 at bottom of first half (position 8 for 16-bracket)
 * 4. Places seed 4/3 at top of second half (position 9 for 16-bracket)
 *
 * Randomization ensures seeds 3 and 4 have equal probability (50%) of
 * being placed in either position, preventing systematic bias.
 *
 * @param {number} bracketSize - Size of bracket (power of 2, e.g., 16, 32)
 * @param {Array<Object>} seeds - Array of seeded players (length 4)
 * @param {string} randomSeed - Seed for deterministic randomization
 * @param {string} [structure] - Optional bracket structure for bye/preliminary detection
 * @returns {Array<Object>} Positions array with seeds placed
 *
 * @example
 * const seeds = [
 *   { rank: 1, entityId: 'p1', entityName: 'Player 1' },
 *   { rank: 2, entityId: 'p2', entityName: 'Player 2' },
 *   { rank: 3, entityId: 'p3', entityName: 'Player 3' },
 *   { rank: 4, entityId: 'p4', entityName: 'Player 4' }
 * ];
 * const positions = placeFourSeeds(16, seeds, 'random-seed-abc');
 * // Seeds 1-2 at positions 1 and 16 (deterministic)
 * // Seeds 3-4 at positions 8 and 9 (randomized order)
 */
export function placeFourSeeds(bracketSize, seeds, randomSeed, structure) {
  // Step 1: Place seeds 1-2 using placeTwoSeeds (recursive)
  const positions = placeTwoSeeds(bracketSize, seeds.slice(0, 2), structure);

  // Step 2: Randomize which seed goes to which position for fairness
  // Shuffle the seed numbers [3, 4] to randomly assign to positions
  const shuffledSeedNumbers = shuffle([3, 4], randomSeed);

  // Step 3: Place randomized seeds at specific positions
  // Bottom of first half (last position of top half)
  // Top of second half (first position of bottom half)
  const halfSize = bracketSize / 2;
  const position1Index = halfSize - 1; // Bottom of first half (e.g., position 8 for 16-bracket, index 7)
  const position2Index = halfSize; // Top of second half (e.g., position 9 for 16-bracket, index 8)

  // Assign first randomized seed number to position1
  const seed1Number = shuffledSeedNumbers[0];
  const seed1Entity = seeds[seed1Number - 1]; // seed 3 is at seeds[2], seed 4 is at seeds[3]
  positions[position1Index].seed = seed1Number;
  positions[position1Index].entityId = seed1Entity.entityId;
  positions[position1Index].entityType = seed1Entity.entityType || 'PLAYER';
  positions[position1Index].entityName = seed1Entity.entityName;

  // Assign second randomized seed number to position2
  const seed2Number = shuffledSeedNumbers[1];
  const seed2Entity = seeds[seed2Number - 1];
  positions[position2Index].seed = seed2Number;
  positions[position2Index].entityId = seed2Entity.entityId;
  positions[position2Index].entityType = seed2Entity.entityType || 'PLAYER';
  positions[position2Index].entityName = seed2Entity.entityName;

  return positions;
}

/**
 * Place eight seeded players using recursive 4-seed placement + quarter randomization
 *
 * Implements User Story 3 seeding algorithm (FR-005, FR-006, FR-007):
 * 1. Places seeds 1-4 using placeFourSeeds() (recursive)
 * 2. Divides bracket into 4 quarters
 * 3. Identifies free position in each quarter (middle position)
 * 4. Randomizes seeds 5-8 across the 4 quarters
 *
 * For 32-player bracket:
 * - Quarter 1: positions 1-8   → free position 4 (index 3)
 * - Quarter 2: positions 9-16  → free position 12 (index 11)
 * - Quarter 3: positions 17-24 → free position 20 (index 19)
 * - Quarter 4: positions 25-32 → free position 28 (index 27)
 *
 * Each seed 5-8 has equal probability (25%) of being placed in any quarter.
 *
 * @param {number} bracketSize - Size of bracket (power of 2, e.g., 32, 64)
 * @param {Array<Object>} seeds - Array of seeded players (length 8)
 * @param {string} randomSeed - Seed for deterministic randomization
 * @param {string} [structure] - Optional bracket structure for bye/preliminary detection
 * @returns {Array<Object>} Positions array with seeds placed
 *
 * @example
 * const seeds = Array.from({ length: 8 }, (_, i) => ({
 *   rank: i + 1,
 *   entityId: `p${i + 1}`,
 *   entityName: `Player ${i + 1}`
 * }));
 * const positions = placeEightSeeds(32, seeds, 'test-seed-8');
 * // Seeds 1-4 placed using 4-seed algorithm
 * // Seeds 5-8 randomly distributed across 4 quarters
 */
export function placeEightSeeds(bracketSize, seeds, randomSeed, structure) {
  // Step 1: Place seeds 1-4 using placeFourSeeds (recursive)
  const positions = placeFourSeeds(bracketSize, seeds.slice(0, 4), randomSeed, structure);

  // Step 2: Divide bracket into quarters and find free positions
  // The free position is the top or bottom of each quarter that was NOT
  // occupied by the recursive 4-seed placement (seeds 1-4).
  const quarterSize = bracketSize / 4;
  const freePositions = [];

  for (let quarter = 0; quarter < 4; quarter++) {
    const quarterStart = quarter * quarterSize;
    const quarterEnd = quarterStart + quarterSize - 1;

    const topOccupied = positions[quarterStart].seed !== null;
    const bottomOccupied = positions[quarterEnd].seed !== null;

    let freeIndex;
    if (topOccupied && !bottomOccupied) {
      freeIndex = quarterEnd;
    } else if (!topOccupied && bottomOccupied) {
      freeIndex = quarterStart;
    } else {
      freeIndex = quarterEnd; // fallback
    }
    freePositions.push(freeIndex);
  }

  // Step 3: Randomize which seed goes to which quarter (seeds 5-8)
  const shuffledSeedNumbers = shuffle([5, 6, 7, 8], randomSeed);

  // Step 4: Place randomized seeds at free quarter positions
  freePositions.forEach((freeIndex, i) => {
    const seedNumber = shuffledSeedNumbers[i];
    const seedEntity = seeds[seedNumber - 1]; // seed 5 is at seeds[4], etc.

    positions[freeIndex].seed = seedNumber;
    positions[freeIndex].entityId = seedEntity.entityId;
    positions[freeIndex].entityType = seedEntity.entityType || 'PLAYER';
    positions[freeIndex].entityName = seedEntity.entityName;
  });

  return positions;
}

/**
 * Place sixteen seeded players using recursive 8-seed placement + eighth randomization
 *
 * Implements User Story 4 seeding algorithm (FR-008, FR-009, FR-010):
 * 1. Places seeds 1-8 using placeEightSeeds() (recursive)
 * 2. Divides bracket into 8 eighths
 * 3. Identifies free position in each eighth (middle position)
 * 4. Randomizes seeds 9-16 across the 8 eighths
 *
 * For 64-player bracket:
 * - Eighth 1: positions 1-8    → free position 4 (index 3)
 * - Eighth 2: positions 9-16   → free position 12 (index 11)
 * - Eighth 3: positions 17-24  → free position 20 (index 19)
 * - Eighth 4: positions 25-32  → free position 28 (index 27)
 * - Eighth 5: positions 33-40  → free position 36 (index 35)
 * - Eighth 6: positions 41-48  → free position 44 (index 43)
 * - Eighth 7: positions 49-56  → free position 52 (index 51)
 * - Eighth 8: positions 57-64  → free position 60 (index 59)
 *
 * Each seed 9-16 has equal probability (12.5%) of being placed in any eighth.
 *
 * @param {number} bracketSize - Size of bracket (power of 2, e.g., 64, 128)
 * @param {Array<Object>} seeds - Array of seeded players (length 16)
 * @param {string} randomSeed - Seed for deterministic randomization
 * @param {string} [structure] - Optional bracket structure for bye/preliminary detection
 * @returns {Array<Object>} Positions array with seeds placed
 *
 * @example
 * const seeds = Array.from({ length: 16 }, (_, i) => ({
 *   rank: i + 1,
 *   entityId: `p${i + 1}`,
 *   entityName: `Player ${i + 1}`
 * }));
 * const positions = placeSixteenSeeds(64, seeds, 'test-seed-16');
 * // Seeds 1-8 placed using 8-seed algorithm
 * // Seeds 9-16 randomly distributed across 8 eighths
 */
export function placeSixteenSeeds(bracketSize, seeds, randomSeed, structure) {
  // Step 1: Place seeds 1-8 using placeEightSeeds (recursive)
  const positions = placeEightSeeds(bracketSize, seeds.slice(0, 8), randomSeed, structure);

  // Step 2: Divide bracket into eighths and find free positions
  // The free position is the top or bottom of each eighth that was NOT
  // occupied by the recursive 8-seed placement (seeds 1-8).
  const eighthSize = bracketSize / 8;
  const freePositions = [];

  for (let eighth = 0; eighth < 8; eighth++) {
    const eighthStart = eighth * eighthSize;
    const eighthEnd = eighthStart + eighthSize - 1;

    const topOccupied = positions[eighthStart].seed !== null;
    const bottomOccupied = positions[eighthEnd].seed !== null;

    let freeIndex;
    if (topOccupied && !bottomOccupied) {
      freeIndex = eighthEnd;
    } else if (!topOccupied && bottomOccupied) {
      freeIndex = eighthStart;
    } else {
      freeIndex = eighthEnd; // fallback
    }
    freePositions.push(freeIndex);
  }

  // Step 3: Randomize which seed goes to which eighth (seeds 9-16)
  const shuffledSeedNumbers = shuffle([9, 10, 11, 12, 13, 14, 15, 16], randomSeed);

  // Step 4: Place randomized seeds at free eighth positions
  freePositions.forEach((freeIndex, i) => {
    const seedNumber = shuffledSeedNumbers[i];
    const seedEntity = seeds[seedNumber - 1]; // seed 9 is at seeds[8], etc.

    positions[freeIndex].seed = seedNumber;
    positions[freeIndex].entityId = seedEntity.entityId;
    positions[freeIndex].entityType = seedEntity.entityType || 'PLAYER';
    positions[freeIndex].entityName = seedEntity.entityName;
  });

  return positions;
}

/**
 * Get ranked players/pairs for seeding from category rankings
 *
 * Integrates with Feature 008 (tournament-rankings) to retrieve the top N
 * ranked players or pairs based on current year rankings. Rankings are sorted
 * by rank and the top seedCount entries are selected.
 *
 * For doubles categories, only PAIR ranking entries are used (not MEN/WOMEN
 * individual entries) to ensure DoublesPair IDs flow into match pair fields.
 * For singles categories, only SINGLES ranking entries are used.
 *
 * @param {string} categoryId - Category identifier
 * @param {number} seedCount - Number of seeds to retrieve (2, 4, 8, or 16)
 * @returns {Promise<Array<Object>>} Top N ranked players/pairs with seeding info
 * @throws {Error} If no rankings found or insufficient ranking entries
 *
 * @example
 * const seeds = await getSeededPlayers('cat-123', 8);
 * // Returns:
 * // [
 * //   { rank: 1, entityId: 'p1', entityType: 'PLAYER', entityName: 'Alice Smith',
 * //     seedingScore: 750, totalPoints: 1200 },
 * //   { rank: 2, entityId: 'pair-5', entityType: 'PAIR', entityName: 'Bob/Carol',
 * //     seedingScore: 680, totalPoints: 1100 },
 * //   ...
 * // ]
 */
export async function getSeededPlayers(categoryId, seedCount) {
  // Integration with feature 008: Get top N ranked players/pairs
  const { getRankingsForCategory } = await import('./rankingService.js');

  const currentYear = new Date().getFullYear();
  const rankings = await getRankingsForCategory(categoryId, currentYear);

  if (!rankings || rankings.length === 0) {
    return []; // No rankings available — caller decides how to handle
  }

  // Determine category type from the rankings data.
  // Each ranking object includes category info from getRankingsForCategory.
  const categoryType = rankings[0]?.category?.type;

  // Filter to the appropriate ranking type before flatMapping entries.
  // SINGLES categories: only SINGLES rankings (entries have playerId / PlayerProfile IDs)
  // DOUBLES categories: only PAIR rankings (entries have pairId / DoublesPair IDs)
  // This prevents PlayerProfile IDs from being used as pair1Id/pair2Id in Match records,
  // which would violate the Match_pair1Id_fkey FK constraint to the DoublesPair table.
  const relevantRankings = rankings.filter(ranking => {
    if (categoryType === 'DOUBLES') return ranking.type === 'PAIR';
    return ranking.type === 'SINGLES';
  });

  // Get all entries from the filtered ranking types
  const allEntries = relevantRankings.flatMap(ranking => ranking.entries || []);

  if (allEntries.length === 0) {
    return []; // No entries available — caller decides how to handle
  }

  // Sort by rank and take top N (return whatever is available, up to seedCount)
  const topEntries = allEntries
    .sort((a, b) => a.rank - b.rank)
    .slice(0, seedCount);

  // Transform to seeding format
  return topEntries.map(entry => {
    const isPlayer = !!entry.player;
    const isPair = !!entry.pair;

    let entityName;
    if (isPlayer) {
      entityName = `${entry.player.firstName} ${entry.player.lastName}`;
    } else if (isPair) {
      const p1Name = `${entry.pair.player1.firstName} ${entry.pair.player1.lastName}`;
      const p2Name = `${entry.pair.player2.firstName} ${entry.pair.player2.lastName}`;
      entityName = `${p1Name} / ${p2Name}`;
    }

    return {
      rank: entry.rank,
      entityId: entry.playerId || entry.pairId,
      entityType: isPlayer ? 'PLAYER' : 'PAIR',
      entityName,
      seedingScore: entry.seedingScore,
      totalPoints: entry.totalPoints
    };
  });
}

/**
 * Get bracket structure from feature 009 bracket service
 *
 * Integrates with Feature 009 (bracket-generation) to retrieve the bracket
 * template for the given player count. The bracket template includes the
 * structure string ("0" = preliminary, "1" = bye) and metadata.
 *
 * @param {number} playerCount - Total number of participants (4-128)
 * @returns {Promise<Object>} Bracket structure with size, pattern, byes, preliminaries
 * @throws {Error} If bracket template not found for player count
 *
 * @example
 * const bracket = await getBracketStructure(11);
 * // Returns:
 * // {
 * //   playerCount: 11,
 * //   bracketSize: 16,
 * //   structure: "1110 0101",
 * //   preliminaryMatches: 3,
 * //   byes: 5
 * // }
 */
export async function getBracketStructure(playerCount) {
  // Integration with feature 009: Get bracket structure template
  const { getBracketByPlayerCount } = await import('./bracketService.js');

  const bracket = await getBracketByPlayerCount(playerCount);

  return {
    playerCount: bracket.playerCount,
    bracketSize: bracket.bracketSize,
    structure: bracket.structure,
    preliminaryMatches: bracket.preliminaryMatches,
    byes: bracket.byes
  };
}

/**
 * Create a position object for bracket
 *
 * Helper function to construct a standardized position object with all
 * necessary metadata for bracket rendering and match processing.
 *
 * @param {number} positionNumber - 1-based position number (display number)
 * @param {number} positionIndex - 0-based index in structure array
 * @param {number|null} seed - Seed number (1-N) or null for unseeded
 * @param {Object|null} entity - Player or pair entity with entityId, entityName
 * @param {string} structure - Bracket structure string for bye/preliminary detection
 * @returns {Object} Position object with all bracket metadata
 *
 * @example
 * const pos = createPosition(1, 0, 1,
 *   { entityId: 'p1', entityName: 'Alice', entityType: 'PLAYER' },
 *   '10000000');
 * // Returns:
 * // {
 * //   positionNumber: 1,
 * //   positionIndex: 0,
 * //   seed: 1,
 * //   entityId: 'p1',
 * //   entityType: 'PLAYER',
 * //   entityName: 'Alice',
 * //   isBye: true,
 * //   isPreliminary: false
 * // }
 */
export function createPosition(positionNumber, positionIndex, seed, entity, structure) {
  const isBye = structure ? structure[positionIndex] === '1' : false;
  const isPreliminary = structure ? structure[positionIndex] === '0' : false;

  return {
    positionNumber,
    positionIndex,
    seed,
    entityId: entity ? entity.entityId : null,
    entityType: entity ? (entity.entityType || 'PLAYER') : null,
    entityName: entity ? entity.entityName : null,
    isBye,
    isPreliminary
  };
}

/**
 * Generate a seeded bracket for a tournament
 *
 * Main entry point for automated tournament bracket generation with optimal
 * seeding placement. Integrates with Features 008 (rankings) and 009 (bracket
 * templates) to create a complete, seeded bracket ready for tournament play.
 *
 * Algorithm overview:
 * 1. Retrieves bracket structure template (Feature 009)
 * 2. Determines seed count based on player count (FR-012)
 * 3. Fetches top N ranked players/pairs (Feature 008)
 * 4. Applies appropriate seeding algorithm (2, 4, 8, or 16-seed)
 * 5. Returns complete bracket with positions, byes, and seeding info
 *
 * @param {string} categoryId - Category identifier for ranking lookup
 * @param {number} playerCount - Total number of participants (4-128)
 * @param {string} [randomSeed] - Optional seed for deterministic randomization.
 *                                If omitted, generates random seed automatically.
 * @returns {Promise<Object>} Seeded bracket with positions and metadata
 * @throws {Error} If player count invalid, rankings unavailable, or algorithm not implemented
 *
 * @example
 * // Generate bracket for 11-player tournament in category cat-123
 * const result = await generateSeededBracket('cat-123', 11);
 * // Returns:
 * // {
 * //   bracket: {
 * //     categoryId: 'cat-123',
 * //     playerCount: 11,
 * //     bracketSize: 16,
 * //     structure: "1110 0101",
 * //     seedCount: 4,
 * //     positions: [...],  // 16 positions with seeds 1-4 placed
 * //     randomSeed: "a3f5c8b9...",
 * //     generatedAt: "2026-01-14T12:00:00.000Z"
 * //   },
 * //   seedingInfo: {
 * //     seedCount: 4,
 * //     seedRange: { min: 10, max: 19 },
 * //     note: "Seeding positions are determined by category rankings..."
 * //   }
 * // }
 *
 * @example
 * // Generate bracket with deterministic seed for testing
 * const result = await generateSeededBracket('cat-123', 32, 'test-seed-123');
 * // Same seed produces identical placement every time
 */
export async function generateSeededBracket(categoryId, playerCount, randomSeed) {
  // T024: Initial implementation for 2-seed tournaments (User Story 1)
  // Will be extended in T047 (4-seed), T070 (8-seed), T096 (16-seed)

  // Get bracket structure from feature 009
  const bracket = await getBracketStructure(playerCount);

  // Determine requested seed count based on player count
  const requestedSeedCount = getSeedCount(playerCount);

  // Get top N ranked players/pairs from feature 008
  const seeds = await getSeededPlayers(categoryId, requestedSeedCount);

  // Determine actual seed tier based on available rankings
  // Reduce to the highest valid seed tier that has enough ranked players: 16→8→4→2→0
  let actualSeedCount;
  if (seeds.length >= 16) {
    actualSeedCount = 16;
  } else if (seeds.length >= 8) {
    actualSeedCount = 8;
  } else if (seeds.length >= 4) {
    actualSeedCount = 4;
  } else if (seeds.length >= 2) {
    actualSeedCount = 2;
  } else if (seeds.length === 1) {
    actualSeedCount = 1; // Special case: only seed 1 placed
  } else {
    actualSeedCount = 0; // No seeding — all positions empty for unseeded pool
  }

  // Cap actual seed count to what was requested (e.g., don't use 8 seeds for a 9-player tournament)
  if (actualSeedCount > requestedSeedCount) {
    actualSeedCount = requestedSeedCount;
  }

  // Generate random seed if not provided
  const actualRandomSeed = randomSeed || createRandomSeed();

  // Apply seeding placement based on actual seed count
  let positions;
  if (actualSeedCount === 0) {
    // No seeding — return empty positions
    positions = placeTwoSeeds(bracket.bracketSize, [
      { entityId: null, entityName: null, entityType: null },
      { entityId: null, entityName: null, entityType: null }
    ], bracket.structure);
    // Clear the fake seeds
    positions.forEach(p => { p.seed = null; p.entityId = null; p.entityType = null; p.entityName = null; });
  } else if (actualSeedCount === 1) {
    // Only seed 1 placed at top; seed 2 slot left empty
    positions = placeTwoSeeds(bracket.bracketSize, [
      seeds[0],
      { entityId: null, entityName: null, entityType: null }
    ], bracket.structure);
    // Clear the fake seed 2
    positions[bracket.bracketSize - 1].seed = null;
    positions[bracket.bracketSize - 1].entityId = null;
    positions[bracket.bracketSize - 1].entityType = null;
    positions[bracket.bracketSize - 1].entityName = null;
  } else if (actualSeedCount === 2) {
    positions = placeTwoSeeds(bracket.bracketSize, seeds.slice(0, 2), bracket.structure);
  } else if (actualSeedCount === 4) {
    positions = placeFourSeeds(bracket.bracketSize, seeds.slice(0, 4), actualRandomSeed);
    positions = positions.map((pos, idx) => ({
      ...pos,
      isBye: bracket.structure[idx] === '1',
      isPreliminary: bracket.structure[idx] === '0'
    }));
  } else if (actualSeedCount === 8) {
    positions = placeEightSeeds(bracket.bracketSize, seeds.slice(0, 8), actualRandomSeed);
    positions = positions.map((pos, idx) => ({
      ...pos,
      isBye: bracket.structure[idx] === '1',
      isPreliminary: bracket.structure[idx] === '0'
    }));
  } else if (actualSeedCount === 16) {
    positions = placeSixteenSeeds(bracket.bracketSize, seeds.slice(0, 16), actualRandomSeed);
    positions = positions.map((pos, idx) => ({
      ...pos,
      isBye: bracket.structure[idx] === '1',
      isPreliminary: bracket.structure[idx] === '0'
    }));
  }

  // Build seeding info (reflect actual seeds used)
  const seedingInfo = {
    seedCount: actualSeedCount,
    requestedSeedCount,
    seedRange: {
      min: requestedSeedCount === 2 ? 4 : requestedSeedCount === 4 ? 10 : requestedSeedCount === 8 ? 20 : 40,
      max: requestedSeedCount === 2 ? 9 : requestedSeedCount === 4 ? 19 : requestedSeedCount === 8 ? 39 : 128
    },
    note: actualSeedCount === 0
      ? 'No ranked players available. All positions left for unseeded placement.'
      : actualSeedCount < requestedSeedCount
        ? `Only ${actualSeedCount} ranked players available (${requestedSeedCount} requested). Reduced to ${actualSeedCount}-seed placement.`
        : actualSeedCount === 2
          ? 'Seeding positions are determined by category rankings. 1st seed at top, 2nd seed at bottom.'
          : `Seeding positions are determined by category rankings. Positions ${actualSeedCount / 2 + 1}-${actualSeedCount} are randomized for fairness.`
  };

  return {
    bracket: {
      categoryId,
      playerCount: bracket.playerCount,
      bracketSize: bracket.bracketSize,
      structure: bracket.structure,
      seedCount: actualSeedCount,
      positions,
      randomSeed: actualRandomSeed,
      generatedAt: new Date().toISOString()
    },
    seedingInfo
  };
}
