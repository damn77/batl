/**
 * Unit Tests: 8-Seed Placement (User Story 3: T055-T064)
 *
 * Tests verify recursive 4-seed placement for seeds 1-4, then randomized placement
 * of seeds 5-8 in quarter segments for tournaments with 20-39 players.
 */

import {
  placeTwoSeeds,
  placeFourSeeds,
  placeEightSeeds,
  getSeedCount
} from '../../src/services/seedingPlacementService.js';

describe('8-Seed Placement (User Story 3)', () => {
  // Mock seeded players
  const mockSeeds = Array.from({ length: 8 }, (_, i) => ({
    rank: i + 1,
    entityId: `player${i + 1}`,
    entityName: `Player ${i + 1}`,
    entityType: 'PLAYER'
  }));

  describe('placeEightSeeds()', () => {
    // T056: Test "places seeds 1-4 using placeFourSeeds (recursive)"
    test('places seeds 1-4 using placeFourSeeds (recursive)', () => {
      const bracketSize = 32;
      const seeds = mockSeeds.slice(0, 8);
      const randomSeed = 'test-seed-8-1';

      const positions = placeEightSeeds(bracketSize, seeds, randomSeed);

      expect(positions).toHaveLength(32);

      // Seeds 1-4 should follow 4-seed placement rules
      // Seed 1 at position 1 (index 0)
      expect(positions[0]).toMatchObject({
        positionNumber: 1,
        seed: 1,
        entityId: 'player1'
      });

      // Seed 2 at position 32 (index 31)
      expect(positions[31]).toMatchObject({
        positionNumber: 32,
        seed: 2,
        entityId: 'player2'
      });

      // Seeds 3-4 should be at bottom of first half and top of second half (positions 16-17, indices 15-16)
      const seed3Position = positions.find((p) => p.seed === 3);
      const seed4Position = positions.find((p) => p.seed === 4);
      const positions16And17 = [positions[15].seed, positions[16].seed].sort();
      expect(positions16And17).toEqual([3, 4]);
    });

    // T057: Test "divides bracket into quarters correctly"
    test('divides bracket into quarters correctly', () => {
      const bracketSize = 32;
      const seeds = mockSeeds.slice(0, 8);
      const randomSeed = 'test-seed-8-2';

      const positions = placeEightSeeds(bracketSize, seeds, randomSeed);

      // For 32-player bracket:
      // Quarter 1: positions 1-8 (indices 0-7)
      // Quarter 2: positions 9-16 (indices 8-15)
      // Quarter 3: positions 17-24 (indices 16-23)
      // Quarter 4: positions 25-32 (indices 24-31)

      // Verify seeds 5-8 are placed in quarters
      const seed5Position = positions.find((p) => p.seed === 5);
      const seed6Position = positions.find((p) => p.seed === 6);
      const seed7Position = positions.find((p) => p.seed === 7);
      const seed8Position = positions.find((p) => p.seed === 8);

      expect(seed5Position).toBeDefined();
      expect(seed6Position).toBeDefined();
      expect(seed7Position).toBeDefined();
      expect(seed8Position).toBeDefined();

      // Each seed should be in a different quarter
      const seed5Quarter = Math.floor(seed5Position.positionIndex / 8);
      const seed6Quarter = Math.floor(seed6Position.positionIndex / 8);
      const seed7Quarter = Math.floor(seed7Position.positionIndex / 8);
      const seed8Quarter = Math.floor(seed8Position.positionIndex / 8);

      const quarters = [seed5Quarter, seed6Quarter, seed7Quarter, seed8Quarter].sort();
      expect(quarters).toEqual([0, 1, 2, 3]);
    });

    // T058: Test "places seeds 5-8 in free quarter positions"
    test('places seeds 5-8 in free quarter positions (not occupied by seeds 1-4)', () => {
      const bracketSize = 32;
      const seeds = mockSeeds.slice(0, 8);
      const randomSeed = 'test-seed-8-3';

      const positions = placeEightSeeds(bracketSize, seeds, randomSeed);

      // Find positions of seeds 1-4
      const seed1To4Positions = positions
        .filter((p) => p.seed >= 1 && p.seed <= 4)
        .map((p) => p.positionIndex);

      // Find positions of seeds 5-8
      const seed5To8Positions = positions
        .filter((p) => p.seed >= 5 && p.seed <= 8)
        .map((p) => p.positionIndex);

      // Seeds 5-8 should not overlap with seeds 1-4
      seed5To8Positions.forEach((pos) => {
        expect(seed1To4Positions).not.toContain(pos);
      });

      // Seeds 5-8 should be in "free" quarter positions
      // Quarter 1 free position: position 4 (index 3) - middle of quarter
      // Quarter 2 free position: position 12 (index 11)
      // Quarter 3 free position: position 20 (index 19)
      // Quarter 4 free position: position 28 (index 27)
      const expectedFreePositions = [3, 11, 19, 27];
      seed5To8Positions.forEach((pos) => {
        expect(expectedFreePositions).toContain(pos);
      });
    });

    // T059: Test "randomizes order of seeds 5-8 with deterministic seed"
    test('randomizes order of seeds 5-8 with deterministic seed', () => {
      const bracketSize = 32;
      const seeds = mockSeeds.slice(0, 8);

      // Same seed should produce identical results
      const positions1 = placeEightSeeds(bracketSize, seeds, 'deterministic-seed-1');
      const positions2 = placeEightSeeds(bracketSize, seeds, 'deterministic-seed-1');

      const seeds5To8Pos1 = [3, 11, 19, 27].map((idx) => positions1[idx].seed);
      const seeds5To8Pos2 = [3, 11, 19, 27].map((idx) => positions2[idx].seed);

      expect(seeds5To8Pos1).toEqual(seeds5To8Pos2);

      // Different seed might produce different results
      const positions3 = placeEightSeeds(bracketSize, seeds, 'deterministic-seed-2');
      const seeds5To8Pos3 = [3, 11, 19, 27].map((idx) => positions3[idx].seed);

      // Verify the seeds are valid (5, 6, 7, 8 in some order)
      expect(seeds5To8Pos3.sort()).toEqual([5, 6, 7, 8]);
    });

    // T060: Test "handles 25-player tournament (8 seeds)"
    test('handles 25-player tournament (8 seeds)', () => {
      const bracketSize = 32; // Next power of 2 >= 25
      const seeds = mockSeeds.slice(0, 8);
      const randomSeed = 'test-seed-25';

      const positions = placeEightSeeds(bracketSize, seeds, randomSeed);

      expect(positions).toHaveLength(32);

      // Verify all 8 seeds are placed
      const seededPositions = positions.filter((p) => p.seed !== null);
      expect(seededPositions).toHaveLength(8);

      const seedNumbers = seededPositions.map((p) => p.seed).sort();
      expect(seedNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    // T061: Test "handles 20-player tournament (8 seeds, minimum for 8-seed)"
    test('handles 20-player tournament (8 seeds, minimum for 8-seed)', () => {
      const bracketSize = 32;
      const seeds = mockSeeds.slice(0, 8);
      const randomSeed = 'test-seed-20';

      const positions = placeEightSeeds(bracketSize, seeds, randomSeed);

      expect(positions).toHaveLength(32);

      const seededPositions = positions.filter((p) => p.seed !== null);
      expect(seededPositions).toHaveLength(8);
    });

    // T062: Test "handles 39-player tournament (8 seeds, maximum for 8-seed)"
    test('handles 39-player tournament (8 seeds, maximum for 8-seed)', () => {
      const bracketSize = 64; // Next power of 2 >= 39
      const seeds = mockSeeds.slice(0, 8);
      const randomSeed = 'test-seed-39';

      const positions = placeEightSeeds(bracketSize, seeds, randomSeed);

      expect(positions).toHaveLength(64);

      const seededPositions = positions.filter((p) => p.seed !== null);
      expect(seededPositions).toHaveLength(8);

      // For 64-player bracket, quarters are 16 positions each
      // Free positions: quarterStart + quarterSize/2 - 1 = 0+8-1=7, 16+8-1=23, 32+8-1=39, 48+8-1=55
      const seed5To8Indices = positions
        .filter((p) => p.seed >= 5 && p.seed <= 8)
        .map((p) => p.positionIndex);

      const expectedFreePositions = [7, 23, 39, 55];
      seed5To8Indices.forEach((idx) => {
        expect(expectedFreePositions).toContain(idx);
      });
    });

    // T063: Test "handles 32-player tournament (power of 2, no byes)"
    test('handles 32-player tournament (power of 2, no byes)', () => {
      const bracketSize = 32;
      const seeds = mockSeeds.slice(0, 8);
      const randomSeed = 'test-seed-32';

      const positions = placeEightSeeds(bracketSize, seeds, randomSeed);

      expect(positions).toHaveLength(32);

      const seededPositions = positions.filter((p) => p.seed !== null);
      expect(seededPositions).toHaveLength(8);
    });

    // T064: Test with structure (byes)
    test('handles 8-seed placement with bye positions', () => {
      const bracketSize = 32;
      const seeds = mockSeeds.slice(0, 8);
      const randomSeed = 'test-with-byes-8';
      // Example 32-character structure with some byes
      const structure = '10000000100000001000000010000000'; // Byes at positions 1, 9, 17, 25

      const positions = placeEightSeeds(bracketSize, seeds, randomSeed, structure);

      expect(positions).toHaveLength(32);

      // Verify bye information is correct
      expect(positions[0].isBye).toBe(true); // structure[0] = '1'
      expect(positions[8].isBye).toBe(true); // structure[8] = '1'
      expect(positions[16].isBye).toBe(true); // structure[16] = '1'
      expect(positions[24].isBye).toBe(true); // structure[24] = '1'
    });
  });

  describe('getSeedCount()', () => {
    test('returns 8 seeds for 20 players (minimum)', () => {
      expect(getSeedCount(20)).toBe(8);
    });

    test('returns 8 seeds for 25 players (middle of range)', () => {
      expect(getSeedCount(25)).toBe(8);
    });

    test('returns 8 seeds for 39 players (maximum)', () => {
      expect(getSeedCount(39)).toBe(8);
    });
  });
});
