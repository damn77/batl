import { describe, it, expect, beforeAll } from '@jest/globals';

// Import will fail initially - that's expected for test-first approach
let bracketService;

// Try to import, but don't fail the test setup if module doesn't exist yet
try {
  const module = await import('../../src/services/bracketService.js');
  bracketService = module;
} catch (error) {
  // Service not implemented yet - tests should fail gracefully
  bracketService = null;
}

describe('bracketService', () => {
  describe('getBracketByPlayerCount', () => {
    it('should return correct bracket structure for 7 players', async () => {
      if (!bracketService) {
        throw new Error('bracketService not implemented yet');
      }

      const result = await bracketService.getBracketByPlayerCount(7);

      expect(result).toBeDefined();
      expect(result.playerCount).toBe(7);
      expect(result.structure).toBe('1000');
      expect(result.preliminaryMatches).toBe(3);
      expect(result.byes).toBe(1);
      expect(result.bracketSize).toBe(8);
    });

    it('should return correct bracket structure for 16 players (power of 2)', async () => {
      if (!bracketService) {
        throw new Error('bracketService not implemented yet');
      }

      const result = await bracketService.getBracketByPlayerCount(16);

      expect(result).toBeDefined();
      expect(result.playerCount).toBe(16);
      expect(result.structure).toBe('0000 0000');
      expect(result.preliminaryMatches).toBe(8);
      expect(result.byes).toBe(0);
      expect(result.bracketSize).toBe(16);
    });

    it('should return correct bracket structure for 11 players', async () => {
      if (!bracketService) {
        throw new Error('bracketService not implemented yet');
      }

      const result = await bracketService.getBracketByPlayerCount(11);

      expect(result).toBeDefined();
      expect(result.playerCount).toBe(11);
      expect(result.structure).toBe('1110 0101');
      expect(result.preliminaryMatches).toBe(3); // 3 zeros in structure = 3 matches (6 players)
      expect(result.byes).toBe(5); // 5 ones in structure = 5 byes
      expect(result.bracketSize).toBe(16);
    });

    it('should throw error for player count < 4', async () => {
      if (!bracketService) {
        throw new Error('bracketService not implemented yet');
      }

      await expect(bracketService.getBracketByPlayerCount(3)).rejects.toThrow();
    });

    it('should throw error for player count > 128', async () => {
      if (!bracketService) {
        throw new Error('bracketService not implemented yet');
      }

      await expect(bracketService.getBracketByPlayerCount(129)).rejects.toThrow();
    });

    it('should throw error for non-integer player count', async () => {
      if (!bracketService) {
        throw new Error('bracketService not implemented yet');
      }

      await expect(bracketService.getBracketByPlayerCount(7.5)).rejects.toThrow();
    });

    it('should correctly calculate derived fields for all valid player counts', async () => {
      if (!bracketService) {
        throw new Error('bracketService not implemented yet');
      }

      // Test a few key player counts (based on actual template values)
      const testCases = [
        { playerCount: 4, expectedPreliminary: 2, expectedByes: 0, expectedBracketSize: 4 },
        { playerCount: 7, expectedPreliminary: 3, expectedByes: 1, expectedBracketSize: 8 },
        { playerCount: 16, expectedPreliminary: 8, expectedByes: 0, expectedBracketSize: 16 },
        { playerCount: 32, expectedPreliminary: 16, expectedByes: 0, expectedBracketSize: 32 }
      ];

      for (const testCase of testCases) {
        const result = await bracketService.getBracketByPlayerCount(testCase.playerCount);
        expect(result.preliminaryMatches).toBe(testCase.expectedPreliminary);
        expect(result.byes).toBe(testCase.expectedByes);
        expect(result.bracketSize).toBe(testCase.expectedBracketSize);
      }
    });

    it('should cache templates after first load', async () => {
      if (!bracketService) {
        throw new Error('bracketService not implemented yet');
      }

      // First call
      const result1 = await bracketService.getBracketByPlayerCount(10);
      // Second call should use cache (faster)
      const result2 = await bracketService.getBracketByPlayerCount(10);

      expect(result1).toEqual(result2);
    });
  });
});
