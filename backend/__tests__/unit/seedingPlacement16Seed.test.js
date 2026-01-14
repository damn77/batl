/**
 * Unit Tests: 16-Seed Placement (User Story 4: T078-T091)
 *
 * Tests verify recursive 8-seed placement for seeds 1-8, then randomized placement
 * of seeds 9-16 in eighth segments for tournaments with 40-128 players.
 */

import {
  placeSixteenSeeds,
  getSeedCount
} from '../../src/services/seedingPlacementService.js';

describe('16-Seed Placement (User Story 4)', () => {
  // Mock seeded players
  const mockSeeds = Array.from({ length: 16 }, (_, i) => ({
    rank: i + 1,
    entityId: `player${i + 1}`,
    entityName: `Player ${i + 1}`,
    entityType: 'PLAYER'
  }));

  describe('placeSixteenSeeds()', () => {
    // T078: Test "places seeds 1-8 using placeEightSeeds (recursive)"
    test('places seeds 1-8 using placeEightSeeds (recursive)', () => {
      const bracketSize = 64;
      const seeds = mockSeeds.slice(0, 16);
      const randomSeed = 'test-seed-16-1';

      const positions = placeSixteenSeeds(bracketSize, seeds, randomSeed);

      expect(positions).toHaveLength(64);

      // Seeds 1-8 should follow 8-seed placement rules
      // Seed 1 at position 1 (index 0)
      expect(positions[0]).toMatchObject({
        positionNumber: 1,
        seed: 1,
        entityId: 'player1'
      });

      // Seed 2 at position 64 (index 63)
      expect(positions[63]).toMatchObject({
        positionNumber: 64,
        seed: 2,
        entityId: 'player2'
      });

      // Verify all 8 seeds are placed
      const seeds1To8 = positions.filter((p) => p.seed >= 1 && p.seed <= 8);
      expect(seeds1To8).toHaveLength(8);
    });

    // T079: Test "divides bracket into eighths correctly"
    test('divides bracket into eighths correctly', () => {
      const bracketSize = 64;
      const seeds = mockSeeds.slice(0, 16);
      const randomSeed = 'test-seed-16-2';

      const positions = placeSixteenSeeds(bracketSize, seeds, randomSeed);

      // For 64-player bracket:
      // Eighth 1: positions 1-8 (indices 0-7)
      // Eighth 2: positions 9-16 (indices 8-15)
      // ... and so on

      // Verify seeds 9-16 are placed in eighths
      const seed9To16Positions = positions.filter((p) => p.seed >= 9 && p.seed <= 16);

      expect(seed9To16Positions).toHaveLength(8);

      // Each seed should be in a different eighth
      const eighths = seed9To16Positions.map((p) => Math.floor(p.positionIndex / 8));
      const uniqueEighths = [...new Set(eighths)];
      expect(uniqueEighths).toHaveLength(8);
      expect(uniqueEighths.sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    });

    // T080: Test "places seeds 9-16 in free eighth positions"
    test('places seeds 9-16 in free eighth positions (not occupied by seeds 1-8)', () => {
      const bracketSize = 64;
      const seeds = mockSeeds.slice(0, 16);
      const randomSeed = 'test-seed-16-3';

      const positions = placeSixteenSeeds(bracketSize, seeds, randomSeed);

      // Find positions of seeds 1-8
      const seed1To8Positions = positions
        .filter((p) => p.seed >= 1 && p.seed <= 8)
        .map((p) => p.positionIndex);

      // Find positions of seeds 9-16
      const seed9To16Positions = positions
        .filter((p) => p.seed >= 9 && p.seed <= 16)
        .map((p) => p.positionIndex);

      // Seeds 9-16 should not overlap with seeds 1-8
      seed9To16Positions.forEach((pos) => {
        expect(seed1To8Positions).not.toContain(pos);
      });

      // Seeds 9-16 should be in "free" eighth positions
      // For 64-player bracket: eighthSize = 8
      // Free positions: eighthStart + eighthSize/2 - 1 = 0+4-1=3, 8+4-1=11, 16+4-1=19, etc.
      const expectedFreePositions = [3, 11, 19, 27, 35, 43, 51, 59];
      seed9To16Positions.forEach((pos) => {
        expect(expectedFreePositions).toContain(pos);
      });
    });

    // T081: Test "randomizes order of seeds 9-16 with deterministic seed"
    test('randomizes order of seeds 9-16 with deterministic seed', () => {
      const bracketSize = 64;
      const seeds = mockSeeds.slice(0, 16);

      // Same seed should produce identical results
      const positions1 = placeSixteenSeeds(bracketSize, seeds, 'deterministic-seed-1');
      const positions2 = placeSixteenSeeds(bracketSize, seeds, 'deterministic-seed-1');

      const freePositions = [3, 11, 19, 27, 35, 43, 51, 59];
      const seeds9To16Pos1 = freePositions.map((idx) => positions1[idx].seed);
      const seeds9To16Pos2 = freePositions.map((idx) => positions2[idx].seed);

      expect(seeds9To16Pos1).toEqual(seeds9To16Pos2);

      // Different seed might produce different results
      const positions3 = placeSixteenSeeds(bracketSize, seeds, 'deterministic-seed-2');
      const seeds9To16Pos3 = freePositions.map((idx) => positions3[idx].seed);

      // Verify the seeds are valid (9-16 in some order)
      expect(seeds9To16Pos3.sort((a, b) => a - b)).toEqual([9, 10, 11, 12, 13, 14, 15, 16]);
    });

    // T082: Test "handles 50-player tournament (16 seeds)"
    test('handles 50-player tournament (16 seeds)', () => {
      const bracketSize = 64; // Next power of 2 >= 50
      const seeds = mockSeeds.slice(0, 16);
      const randomSeed = 'test-seed-50';

      const positions = placeSixteenSeeds(bracketSize, seeds, randomSeed);

      expect(positions).toHaveLength(64);

      // Verify all 16 seeds are placed
      const seededPositions = positions.filter((p) => p.seed !== null);
      expect(seededPositions).toHaveLength(16);

      const seedNumbers = seededPositions.map((p) => p.seed).sort((a, b) => a - b);
      expect(seedNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    });

    // T083: Test "handles 40-player tournament (16 seeds, minimum for 16-seed)"
    test('handles 40-player tournament (16 seeds, minimum for 16-seed)', () => {
      const bracketSize = 64;
      const seeds = mockSeeds.slice(0, 16);
      const randomSeed = 'test-seed-40';

      const positions = placeSixteenSeeds(bracketSize, seeds, randomSeed);

      expect(positions).toHaveLength(64);

      const seededPositions = positions.filter((p) => p.seed !== null);
      expect(seededPositions).toHaveLength(16);
    });

    // T084: Test "handles 128-player tournament (16 seeds, maximum for 16-seed)"
    test('handles 128-player tournament (16 seeds, maximum for 16-seed)', () => {
      const bracketSize = 128; // Next power of 2 >= 128
      const seeds = mockSeeds.slice(0, 16);
      const randomSeed = 'test-seed-128';

      const positions = placeSixteenSeeds(bracketSize, seeds, randomSeed);

      expect(positions).toHaveLength(128);

      const seededPositions = positions.filter((p) => p.seed !== null);
      expect(seededPositions).toHaveLength(16);

      // For 128-player bracket, eighths are 16 positions each
      // Free positions: eighthStart + eighthSize/2 - 1 = 0+8-1=7, 16+8-1=23, etc.
      const seed9To16Indices = positions
        .filter((p) => p.seed >= 9 && p.seed <= 16)
        .map((p) => p.positionIndex);

      const expectedFreePositions = [7, 23, 39, 55, 71, 87, 103, 119];
      seed9To16Indices.forEach((idx) => {
        expect(expectedFreePositions).toContain(idx);
      });
    });

    // T085: Test "handles 64-player tournament (power of 2, no byes)"
    test('handles 64-player tournament (power of 2, no byes)', () => {
      const bracketSize = 64;
      const seeds = mockSeeds.slice(0, 16);
      const randomSeed = 'test-seed-64';

      const positions = placeSixteenSeeds(bracketSize, seeds, randomSeed);

      expect(positions).toHaveLength(64);

      const seededPositions = positions.filter((p) => p.seed !== null);
      expect(seededPositions).toHaveLength(16);
    });

    // T086: Test with structure (byes)
    test('handles 16-seed placement with bye positions', () => {
      const bracketSize = 64;
      const seeds = mockSeeds.slice(0, 16);
      const randomSeed = 'test-with-byes-16';
      // Example 64-character structure with some byes
      const structure =
        '1000000010000000100000001000000010000000100000001000000010000000'; // Byes at positions 1, 9, 17, 25, 33, 41, 49, 57

      const positions = placeSixteenSeeds(bracketSize, seeds, randomSeed, structure);

      expect(positions).toHaveLength(64);

      // Verify bye information is correct
      expect(positions[0].isBye).toBe(true); // structure[0] = '1'
      expect(positions[8].isBye).toBe(true); // structure[8] = '1'
      expect(positions[16].isBye).toBe(true); // structure[16] = '1'
      expect(positions[24].isBye).toBe(true); // structure[24] = '1'
    });
  });

  describe('getSeedCount()', () => {
    test('returns 16 seeds for 40 players (minimum)', () => {
      expect(getSeedCount(40)).toBe(16);
    });

    test('returns 16 seeds for 64 players (middle of range)', () => {
      expect(getSeedCount(64)).toBe(16);
    });

    test('returns 16 seeds for 100 players', () => {
      expect(getSeedCount(100)).toBe(16);
    });

    test('returns 16 seeds for 128 players (maximum)', () => {
      expect(getSeedCount(128)).toBe(16);
    });
  });
});
