/**
 * Unit Tests: Seeding Placement Fallback Behavior
 *
 * Tests verify graceful degradation when insufficient ranked players
 * are available for the requested seed count.
 */

import { jest } from '@jest/globals';

// ---------------------------------------------------------------------------
// Mock ranking and bracket services
// ---------------------------------------------------------------------------
let mockRankings = [];
let mockBracketTemplate = null;

jest.unstable_mockModule('../../src/services/rankingService.js', () => ({
  getRankingsForCategory: jest.fn(async () => mockRankings)
}));

jest.unstable_mockModule('../../src/services/bracketService.js', () => ({
  getBracketByPlayerCount: jest.fn(async (playerCount) => {
    if (mockBracketTemplate) return mockBracketTemplate;
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(playerCount)));
    return {
      playerCount,
      bracketSize,
      structure: '1'.repeat(bracketSize),
      preliminaryMatches: 0,
      byes: bracketSize - playerCount
    };
  })
}));

// Dynamic import after mocking
const { generateSeededBracket } =
  await import('../../src/services/seedingPlacementService.js');

function makeRankings(count) {
  const entries = Array.from({ length: count }, (_, i) => ({
    rank: i + 1,
    playerId: `player-${i + 1}`,
    player: { firstName: 'Player', lastName: `${i + 1}` },
    seedingScore: 1000 - i * 50,
    totalPoints: 2000 - i * 100
  }));

  return [{
    type: 'SINGLES',
    category: { type: 'SINGLES' },
    entries
  }];
}

describe('Seeding Placement Fallback Behavior', () => {
  beforeEach(() => {
    mockRankings = [];
    mockBracketTemplate = null;
  });

  describe('0 ranked players', () => {
    test('returns all-empty positions when no rankings exist', async () => {
      mockRankings = [];
      mockBracketTemplate = {
        playerCount: 15,
        bracketSize: 16,
        structure: '1111111100000000',
        preliminaryMatches: 0,
        byes: 1
      };

      const result = await generateSeededBracket('cat-123', 15, 'test-seed');

      expect(result.bracket.seedCount).toBe(0);
      expect(result.seedingInfo.seedCount).toBe(0);

      const seededPositions = result.bracket.positions.filter(p => p.seed !== null);
      expect(seededPositions).toHaveLength(0);
    });
  });

  describe('1 ranked player', () => {
    test('places only seed 1 at top, no seed 2', async () => {
      mockRankings = makeRankings(1);
      mockBracketTemplate = {
        playerCount: 15,
        bracketSize: 16,
        structure: '1111111100000000',
        preliminaryMatches: 0,
        byes: 1
      };

      const result = await generateSeededBracket('cat-123', 15, 'test-seed');

      expect(result.bracket.seedCount).toBe(1);

      // Seed 1 at top
      expect(result.bracket.positions[0].seed).toBe(1);
      expect(result.bracket.positions[0].entityId).toBe('player-1');

      // Seed 2 slot should be empty
      expect(result.bracket.positions[15].seed).toBeNull();
      expect(result.bracket.positions[15].entityId).toBeNull();
    });
  });

  describe('2 ranked players when 4 needed', () => {
    test('falls back to 2-seed placement', async () => {
      mockRankings = makeRankings(2);
      mockBracketTemplate = {
        playerCount: 15,
        bracketSize: 16,
        structure: '1111111100000000',
        preliminaryMatches: 0,
        byes: 1
      };

      const result = await generateSeededBracket('cat-123', 15, 'test-seed');

      expect(result.bracket.seedCount).toBe(2);
      expect(result.seedingInfo.requestedSeedCount).toBe(4);

      expect(result.bracket.positions[0].seed).toBe(1);
      expect(result.bracket.positions[15].seed).toBe(2);

      const seed3 = result.bracket.positions.find(p => p.seed === 3);
      const seed4 = result.bracket.positions.find(p => p.seed === 4);
      expect(seed3).toBeUndefined();
      expect(seed4).toBeUndefined();
    });
  });

  describe('3 ranked players when 4 needed', () => {
    test('falls back to 2-seed placement (uses top 2)', async () => {
      mockRankings = makeRankings(3);
      mockBracketTemplate = {
        playerCount: 15,
        bracketSize: 16,
        structure: '1111111100000000',
        preliminaryMatches: 0,
        byes: 1
      };

      const result = await generateSeededBracket('cat-123', 15, 'test-seed');

      expect(result.bracket.seedCount).toBe(2);
      expect(result.bracket.positions[0].seed).toBe(1);
      expect(result.bracket.positions[15].seed).toBe(2);
    });
  });

  describe('5 ranked players when 8 needed', () => {
    test('falls back to 4-seed placement (uses top 4)', async () => {
      mockRankings = makeRankings(5);
      mockBracketTemplate = {
        playerCount: 25,
        bracketSize: 32,
        structure: '11111111111111111111111111111111',
        preliminaryMatches: 0,
        byes: 7
      };

      const result = await generateSeededBracket('cat-123', 25, 'test-seed');

      expect(result.bracket.seedCount).toBe(4);
      expect(result.seedingInfo.requestedSeedCount).toBe(8);

      const seededPositions = result.bracket.positions.filter(p => p.seed !== null);
      expect(seededPositions).toHaveLength(4);
      expect(seededPositions.map(p => p.seed).sort()).toEqual([1, 2, 3, 4]);
    });
  });

  describe('exact match', () => {
    test('4 ranked players when 4 needed uses normal 4-seed placement', async () => {
      mockRankings = makeRankings(4);
      mockBracketTemplate = {
        playerCount: 15,
        bracketSize: 16,
        structure: '1111111100000000',
        preliminaryMatches: 0,
        byes: 1
      };

      const result = await generateSeededBracket('cat-123', 15, 'test-seed');

      expect(result.bracket.seedCount).toBe(4);
      expect(result.seedingInfo.requestedSeedCount).toBe(4);

      const seededPositions = result.bracket.positions.filter(p => p.seed !== null);
      expect(seededPositions).toHaveLength(4);
      expect(seededPositions.map(p => p.seed).sort()).toEqual([1, 2, 3, 4]);
    });
  });

  describe('seedingInfo reflects actual vs requested', () => {
    test('note explains reduced seeding when fallback occurs', async () => {
      mockRankings = makeRankings(2);
      mockBracketTemplate = {
        playerCount: 25,
        bracketSize: 32,
        structure: '11111111111111111111111111111111',
        preliminaryMatches: 0,
        byes: 7
      };

      const result = await generateSeededBracket('cat-123', 25, 'test-seed');

      expect(result.seedingInfo.seedCount).toBe(2);
      expect(result.seedingInfo.requestedSeedCount).toBe(8);
      expect(result.seedingInfo.note).toContain('2 ranked players available');
      expect(result.seedingInfo.note).toContain('8 requested');
    });
  });
});
