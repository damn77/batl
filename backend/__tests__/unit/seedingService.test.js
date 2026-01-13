import { describe, it, expect } from '@jest/globals';

// Import will fail initially - that's expected for test-first approach
let bracketService;

try {
  bracketService = await import('../../src/services/bracketService.js');
} catch (error) {
  // Service not implemented yet - tests should fail gracefully
  bracketService = null;
}

describe('bracketService - getSeedingConfig', () => {
  describe('getSeedingConfig', () => {
    it('should return 2 seeded players for 4-9 player range', async () => {
      if (!bracketService) {
        throw new Error('bracketService not implemented yet');
      }

      const testCases = [
        { playerCount: 4, expectedSeeded: 2, expectedMin: 4, expectedMax: 9 },
        { playerCount: 7, expectedSeeded: 2, expectedMin: 4, expectedMax: 9 },
        { playerCount: 9, expectedSeeded: 2, expectedMin: 4, expectedMax: 9 }
      ];

      for (const testCase of testCases) {
        const result = await bracketService.getSeedingConfig(testCase.playerCount);
        expect(result.playerCount).toBe(testCase.playerCount);
        expect(result.seededPlayers).toBe(testCase.expectedSeeded);
        expect(result.range.min).toBe(testCase.expectedMin);
        expect(result.range.max).toBe(testCase.expectedMax);
        expect(result.note).toBeDefined();
      }
    });

    it('should return 4 seeded players for 10-19 player range', async () => {
      if (!bracketService) {
        throw new Error('bracketService not implemented yet');
      }

      const testCases = [
        { playerCount: 10, expectedSeeded: 4, expectedMin: 10, expectedMax: 19 },
        { playerCount: 15, expectedSeeded: 4, expectedMin: 10, expectedMax: 19 },
        { playerCount: 19, expectedSeeded: 4, expectedMin: 10, expectedMax: 19 }
      ];

      for (const testCase of testCases) {
        const result = await bracketService.getSeedingConfig(testCase.playerCount);
        expect(result.playerCount).toBe(testCase.playerCount);
        expect(result.seededPlayers).toBe(testCase.expectedSeeded);
        expect(result.range.min).toBe(testCase.expectedMin);
        expect(result.range.max).toBe(testCase.expectedMax);
      }
    });

    it('should return 8 seeded players for 20-39 player range', async () => {
      if (!bracketService) {
        throw new Error('bracketService not implemented yet');
      }

      const testCases = [
        { playerCount: 20, expectedSeeded: 8, expectedMin: 20, expectedMax: 39 },
        { playerCount: 30, expectedSeeded: 8, expectedMin: 20, expectedMax: 39 },
        { playerCount: 39, expectedSeeded: 8, expectedMin: 20, expectedMax: 39 }
      ];

      for (const testCase of testCases) {
        const result = await bracketService.getSeedingConfig(testCase.playerCount);
        expect(result.playerCount).toBe(testCase.playerCount);
        expect(result.seededPlayers).toBe(testCase.expectedSeeded);
        expect(result.range.min).toBe(testCase.expectedMin);
        expect(result.range.max).toBe(testCase.expectedMax);
      }
    });

    it('should return 16 seeded players for 40-128 player range', async () => {
      if (!bracketService) {
        throw new Error('bracketService not implemented yet');
      }

      const testCases = [
        { playerCount: 40, expectedSeeded: 16, expectedMin: 40, expectedMax: 128 },
        { playerCount: 100, expectedSeeded: 16, expectedMin: 40, expectedMax: 128 },
        { playerCount: 128, expectedSeeded: 16, expectedMin: 40, expectedMax: 128 }
      ];

      for (const testCase of testCases) {
        const result = await bracketService.getSeedingConfig(testCase.playerCount);
        expect(result.playerCount).toBe(testCase.playerCount);
        expect(result.seededPlayers).toBe(testCase.expectedSeeded);
        expect(result.range.min).toBe(testCase.expectedMin);
        expect(result.range.max).toBe(testCase.expectedMax);
      }
    });

    it('should throw error for player count < 4', async () => {
      if (!bracketService) {
        throw new Error('bracketService not implemented yet');
      }

      expect(() => bracketService.getSeedingConfig(3)).toThrow('Player count must be at least 4');
    });

    it('should throw error for player count > 128', async () => {
      if (!bracketService) {
        throw new Error('bracketService not implemented yet');
      }

      expect(() => bracketService.getSeedingConfig(200)).toThrow('Player count cannot exceed 128');
    });

    it('should throw error for non-integer player count', async () => {
      if (!bracketService) {
        throw new Error('bracketService not implemented yet');
      }

      expect(() => bracketService.getSeedingConfig(7.5)).toThrow('Player count must be an integer');
    });

    it('should include manual seeding note in response', async () => {
      if (!bracketService) {
        throw new Error('bracketService not implemented yet');
      }

      const result = await bracketService.getSeedingConfig(15);
      expect(result.note).toContain('manually');
      expect(result.note).toContain('organizers');
    });
  });
});
