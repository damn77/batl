/**
 * Unit Tests: 2-Seed Placement (User Story 1)
 *
 * Tests foundational 2-seed placement logic for tournaments with 4-9 players.
 * Feature: 010-seeding-placement
 *
 * Test-first development (TDD): These tests are written BEFORE implementation
 * per FR-015, FR-016, FR-017.
 */

import { placeTwoSeeds, getSeedCount } from '../../src/services/seedingPlacementService.js';

describe('2-Seed Placement (User Story 1)', () => {
  describe('placeTwoSeeds()', () => {
    // T014: Test "places 1st seed at position 1 (top)"
    test('places 1st seed at position 1 (top)', () => {
      const bracketSize = 8;
      const seeds = [
        { rank: 1, entityId: 'player1', entityName: 'Player 1' },
        { rank: 2, entityId: 'player2', entityName: 'Player 2' }
      ];

      const positions = placeTwoSeeds(bracketSize, seeds);

      // Position array should have bracketSize elements
      expect(positions).toHaveLength(bracketSize);

      // 1st seed should be at position 0 (top)
      expect(positions[0]).toMatchObject({
        positionNumber: 1,
        positionIndex: 0,
        seed: 1,
        entityId: 'player1'
      });
    });

    // T015: Test "places 2nd seed at position N (bottom)" for various bracket sizes
    test('places 2nd seed at position N (bottom) for bracket size 8', () => {
      const bracketSize = 8;
      const seeds = [
        { rank: 1, entityId: 'player1', entityName: 'Player 1' },
        { rank: 2, entityId: 'player2', entityName: 'Player 2' }
      ];

      const positions = placeTwoSeeds(bracketSize, seeds);

      // 2nd seed should be at position 7 (bottom, 0-indexed)
      expect(positions[7]).toMatchObject({
        positionNumber: 8,
        positionIndex: 7,
        seed: 2,
        entityId: 'player2'
      });
    });

    test('places 2nd seed at position N (bottom) for bracket size 16', () => {
      const bracketSize = 16;
      const seeds = [
        { rank: 1, entityId: 'player1', entityName: 'Player 1' },
        { rank: 2, entityId: 'player2', entityName: 'Player 2' }
      ];

      const positions = placeTwoSeeds(bracketSize, seeds);

      expect(positions).toHaveLength(16);
      expect(positions[15]).toMatchObject({
        positionNumber: 16,
        positionIndex: 15,
        seed: 2,
        entityId: 'player2'
      });
    });

    test('places 2nd seed at position N (bottom) for bracket size 32', () => {
      const bracketSize = 32;
      const seeds = [
        { rank: 1, entityId: 'player1', entityName: 'Player 1' },
        { rank: 2, entityId: 'player2', entityName: 'Player 2' }
      ];

      const positions = placeTwoSeeds(bracketSize, seeds);

      expect(positions).toHaveLength(32);
      expect(positions[31]).toMatchObject({
        positionNumber: 32,
        positionIndex: 31,
        seed: 2,
        entityId: 'player2'
      });
    });

    // T016: Test "handles 5-player tournament (2 seeds)"
    test('handles 5-player tournament (2 seeds)', () => {
      // 5 players -> bracket size 8, 2 seeds
      const bracketSize = 8;
      const seeds = [
        { rank: 1, entityId: 'player1', entityName: 'Player 1' },
        { rank: 2, entityId: 'player2', entityName: 'Player 2' }
      ];

      const positions = placeTwoSeeds(bracketSize, seeds);

      expect(positions).toHaveLength(8);
      // 1st seed at top
      expect(positions[0].seed).toBe(1);
      expect(positions[0].entityId).toBe('player1');
      // 2nd seed at bottom
      expect(positions[7].seed).toBe(2);
      expect(positions[7].entityId).toBe('player2');
    });

    // T017: Test "handles 9-player tournament (2 seeds)"
    test('handles 9-player tournament (2 seeds)', () => {
      // 9 players -> bracket size 16, 2 seeds
      const bracketSize = 16;
      const seeds = [
        { rank: 1, entityId: 'player1', entityName: 'Player 1' },
        { rank: 2, entityId: 'player2', entityName: 'Player 2' }
      ];

      const positions = placeTwoSeeds(bracketSize, seeds);

      expect(positions).toHaveLength(16);
      expect(positions[0].seed).toBe(1);
      expect(positions[15].seed).toBe(2);
    });

    // T018: Test "2-seed placement with bye positions"
    test('2-seed placement with bye positions', () => {
      // Test that seeded players can have byes (structure with "1")
      const bracketSize = 8;
      const seeds = [
        { rank: 1, entityId: 'player1', entityName: 'Player 1' },
        { rank: 2, entityId: 'player2', entityName: 'Player 2' }
      ];
      const structure = '10000101'; // Example structure with byes

      const positions = placeTwoSeeds(bracketSize, seeds, structure);

      expect(positions).toHaveLength(8);

      // Verify 1st seed placed at position 0
      expect(positions[0].seed).toBe(1);
      expect(positions[0].isBye).toBe(true); // Position 0 is a bye (structure[0] = '1')

      // Verify 2nd seed placed at position 7
      expect(positions[7].seed).toBe(2);
      expect(positions[7].isBye).toBe(true); // Position 7 is a bye (structure[7] = '1')
    });
  });

  describe('getSeedCount()', () => {
    test('returns 2 seeds for 4 players (minimum)', () => {
      expect(getSeedCount(4)).toBe(2);
    });

    test('returns 2 seeds for 7 players (middle of range)', () => {
      expect(getSeedCount(7)).toBe(2);
    });

    test('returns 2 seeds for 9 players (maximum)', () => {
      expect(getSeedCount(9)).toBe(2);
    });

    test('throws error for invalid player count (< 4)', () => {
      expect(() => getSeedCount(3)).toThrow('Player count must be between 4 and 128');
    });

    test('throws error for invalid player count (> 128)', () => {
      expect(() => getSeedCount(129)).toThrow('Player count must be between 4 and 128');
    });
  });
});
