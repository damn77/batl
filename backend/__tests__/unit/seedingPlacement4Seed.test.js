/**
 * Unit Tests: 4-Seed Placement (User Story 2)
 *
 * Tests 4-seed placement logic for tournaments with 10-19 players.
 * Includes recursive 2-seed placement + randomization for 3rd/4th seeds.
 * Feature: 010-seeding-placement
 *
 * Test-first development (TDD): These tests are written BEFORE implementation
 * per FR-015, FR-016, FR-017.
 */

import { placeFourSeeds, getSeedCount } from '../../src/services/seedingPlacementService.js';

describe('4-Seed Placement (User Story 2)', () => {
  describe('placeFourSeeds()', () => {
    // T035: Test "places seeds 1-2 using placeTwoSeeds (recursive)"
    test('places seeds 1-2 using placeTwoSeeds (recursive)', () => {
      const bracketSize = 16;
      const seeds = [
        { rank: 1, entityId: 'player1', entityName: 'Player 1' },
        { rank: 2, entityId: 'player2', entityName: 'Player 2' },
        { rank: 3, entityId: 'player3', entityName: 'Player 3' },
        { rank: 4, entityId: 'player4', entityName: 'Player 4' }
      ];
      const randomSeed = 'test-seed-123';

      const positions = placeFourSeeds(bracketSize, seeds, randomSeed);

      expect(positions).toHaveLength(16);

      // 1st seed should be at position 0 (top) - from 2-seed placement
      expect(positions[0]).toMatchObject({
        positionNumber: 1,
        seed: 1,
        entityId: 'player1'
      });

      // 2nd seed should be at position 15 (bottom) - from 2-seed placement
      expect(positions[15]).toMatchObject({
        positionNumber: 16,
        seed: 2,
        entityId: 'player2'
      });
    });

    // T036: Test "places seeds 3-4 at bottom of first half and top of second half"
    test('places seeds 3-4 at bottom of first half and top of second half', () => {
      const bracketSize = 16;
      const seeds = [
        { rank: 1, entityId: 'player1', entityName: 'Player 1' },
        { rank: 2, entityId: 'player2', entityName: 'Player 2' },
        { rank: 3, entityId: 'player3', entityName: 'Player 3' },
        { rank: 4, entityId: 'player4', entityName: 'Player 4' }
      ];
      const randomSeed = 'test-seed-456';

      const positions = placeFourSeeds(bracketSize, seeds, randomSeed);

      // Bottom of first half = position 7 (index 7, 0-indexed)
      // Top of second half = position 8 (index 8, 0-indexed)
      const position7 = positions[7];
      const position8 = positions[8];

      // One should be seed 3, the other seed 4 (order randomized)
      const seedsAt7And8 = [position7.seed, position8.seed].sort();
      expect(seedsAt7And8).toEqual([3, 4]);

      // Both should have entities
      expect(position7.entityId).toBeTruthy();
      expect(position8.entityId).toBeTruthy();
    });

    // T037: Test "randomizes order of seeds 3-4 with deterministic seed"
    test('randomizes order of seeds 3-4 with deterministic seed', () => {
      const bracketSize = 16;
      const seeds = [
        { rank: 1, entityId: 'player1', entityName: 'Player 1' },
        { rank: 2, entityId: 'player2', entityName: 'Player 2' },
        { rank: 3, entityId: 'player3', entityName: 'Player 3' },
        { rank: 4, entityId: 'player4', entityName: 'Player 4' }
      ];

      // Same seed should produce identical results
      const positions1 = placeFourSeeds(bracketSize, seeds, 'deterministic-seed-1');
      const positions2 = placeFourSeeds(bracketSize, seeds, 'deterministic-seed-1');

      expect(positions1[7].seed).toBe(positions2[7].seed);
      expect(positions1[8].seed).toBe(positions2[8].seed);

      // Different seed might produce different results
      const positions3 = placeFourSeeds(bracketSize, seeds, 'deterministic-seed-2');

      // At least one of the positions should potentially differ (not guaranteed but likely)
      // We just verify the structure is valid
      expect([3, 4]).toContain(positions3[7].seed);
      expect([3, 4]).toContain(positions3[8].seed);
      expect(positions3[7].seed).not.toBe(positions3[8].seed);
    });

    // T038: Test "handles 15-player tournament (4 seeds)"
    test('handles 15-player tournament (4 seeds)', () => {
      const bracketSize = 16;
      const seeds = [
        { rank: 1, entityId: 'player1', entityName: 'Player 1' },
        { rank: 2, entityId: 'player2', entityName: 'Player 2' },
        { rank: 3, entityId: 'player3', entityName: 'Player 3' },
        { rank: 4, entityId: 'player4', entityName: 'Player 4' }
      ];
      const randomSeed = 'test-15-players';

      const positions = placeFourSeeds(bracketSize, seeds, randomSeed);

      expect(positions).toHaveLength(16);

      // Verify all 4 seeds are placed
      const seededPositions = positions.filter(p => p.seed !== null);
      expect(seededPositions).toHaveLength(4);

      // Verify seed numbers are correct
      const seedNumbers = seededPositions.map(p => p.seed).sort();
      expect(seedNumbers).toEqual([1, 2, 3, 4]);
    });

    // T039: Test "handles 10-player tournament (4 seeds, minimum for 4-seed)"
    test('handles 10-player tournament (4 seeds, minimum for 4-seed)', () => {
      const bracketSize = 16;
      const seeds = [
        { rank: 1, entityId: 'player1', entityName: 'Player 1' },
        { rank: 2, entityId: 'player2', entityName: 'Player 2' },
        { rank: 3, entityId: 'player3', entityName: 'Player 3' },
        { rank: 4, entityId: 'player4', entityName: 'Player 4' }
      ];
      const randomSeed = 'test-10-players';

      const positions = placeFourSeeds(bracketSize, seeds, randomSeed);

      expect(positions).toHaveLength(16);

      // All 4 seeds should be present
      const seededCount = positions.filter(p => p.seed !== null).length;
      expect(seededCount).toBe(4);
    });

    // T040: Test "handles 19-player tournament (4 seeds, maximum for 4-seed)"
    test('handles 19-player tournament (4 seeds, maximum for 4-seed)', () => {
      const bracketSize = 32;
      const seeds = [
        { rank: 1, entityId: 'player1', entityName: 'Player 1' },
        { rank: 2, entityId: 'player2', entityName: 'Player 2' },
        { rank: 3, entityId: 'player3', entityName: 'Player 3' },
        { rank: 4, entityId: 'player4', entityName: 'Player 4' }
      ];
      const randomSeed = 'test-19-players';

      const positions = placeFourSeeds(bracketSize, seeds, randomSeed);

      expect(positions).toHaveLength(32);

      // Seeds 1 and 2 at opposite ends
      expect(positions[0].seed).toBe(1);
      expect(positions[31].seed).toBe(2);

      // Seeds 3 and 4 at halfway points
      const halfSize = bracketSize / 2;
      const seedsAtHalves = [positions[halfSize - 1].seed, positions[halfSize].seed].sort();
      expect(seedsAtHalves).toEqual([3, 4]);
    });

    // T041: Test with structure (byes)
    test('handles 4-seed placement with bye positions', () => {
      const bracketSize = 16;
      const seeds = [
        { rank: 1, entityId: 'player1', entityName: 'Player 1' },
        { rank: 2, entityId: 'player2', entityName: 'Player 2' },
        { rank: 3, entityId: 'player3', entityName: 'Player 3' },
        { rank: 4, entityId: 'player4', entityName: 'Player 4' }
      ];
      const randomSeed = 'test-with-byes';
      const structure = '1000000011001101'; // Example structure with byes

      const positions = placeFourSeeds(bracketSize, seeds, randomSeed, structure);

      expect(positions).toHaveLength(16);

      // Verify bye information is correct for seeded positions
      expect(positions[0].isBye).toBe(true); // structure[0] = '1'
      expect(positions[15].isBye).toBe(true); // structure[15] = '1'
    });
  });

  describe('getSeedCount()', () => {
    test('returns 4 seeds for 10 players (minimum)', () => {
      expect(getSeedCount(10)).toBe(4);
    });

    test('returns 4 seeds for 15 players (middle of range)', () => {
      expect(getSeedCount(15)).toBe(4);
    });

    test('returns 4 seeds for 19 players (maximum)', () => {
      expect(getSeedCount(19)).toBe(4);
    });
  });
});
