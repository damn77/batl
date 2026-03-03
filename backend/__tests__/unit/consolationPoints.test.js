/**
 * Unit tests for consolation point derivation functions
 * Feature: 07-consolation-points - Phase 01
 *
 * Tests: roundNumberToName + deriveConsolationResults
 *
 * Status: RED (functions not yet implemented)
 *
 * Uses jest.unstable_mockModule() for ES module mocking so that
 * @prisma/client is mocked before the service module is dynamically imported.
 */
import { jest } from '@jest/globals';

// ---------------------------------------------------------------------------
// Mock @prisma/client using unstable_mockModule (ES module safe)
// ---------------------------------------------------------------------------
const mockPrisma = {
  bracket: {
    findFirst: jest.fn()
  },
  round: {
    findMany: jest.fn()
  },
  match: {
    findMany: jest.fn()
  },
  tournament: {
    findUnique: jest.fn()
  }
};

jest.unstable_mockModule('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));

// ---------------------------------------------------------------------------
// Also mock other imports pointCalculationService uses at the top level
// ---------------------------------------------------------------------------
jest.unstable_mockModule('../../src/utils/participantRange.js', () => ({
  getParticipantRange: jest.fn(() => '9-16')
}));

jest.unstable_mockModule('../../src/services/pointTableService.js', () => ({
  getPointsForRound: jest.fn(() => 5)
}));

jest.unstable_mockModule('../../src/utils/categoryHelpers.js', () => ({
  getRankingTypesForCategory: jest.fn(() => ['SINGLES'])
}));

// ---------------------------------------------------------------------------
// Dynamically import AFTER mocks are registered
// ---------------------------------------------------------------------------
const { roundNumberToName, deriveConsolationResults } =
  await import('../../src/services/pointCalculationService.js');

// ---------------------------------------------------------------------------
// Reset mocks between tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();
});

// ===========================================================================
// roundNumberToName
// ===========================================================================
describe('roundNumberToName(roundNumber, totalRounds)', () => {
  // Test 1: 1-round bracket
  it('maps 1-round bracket: round 1 → FINAL', () => {
    expect(roundNumberToName(1, 1)).toBe('FINAL');
  });

  // Test 2: 2-round bracket
  it('maps 2-round bracket: round 1 → SEMIFINAL, round 2 → FINAL', () => {
    expect(roundNumberToName(1, 2)).toBe('SEMIFINAL');
    expect(roundNumberToName(2, 2)).toBe('FINAL');
  });

  // Test 3: 3-round bracket
  it('maps 3-round bracket: round 1 → QUARTERFINAL, round 2 → SEMIFINAL, round 3 → FINAL', () => {
    expect(roundNumberToName(1, 3)).toBe('QUARTERFINAL');
    expect(roundNumberToName(2, 3)).toBe('SEMIFINAL');
    expect(roundNumberToName(3, 3)).toBe('FINAL');
  });

  // Test 4: 4-round bracket
  it('maps 4-round bracket: round 1 → FIRST_ROUND, round 2 → QUARTERFINAL, round 3 → SEMIFINAL, round 4 → FINAL', () => {
    expect(roundNumberToName(1, 4)).toBe('FIRST_ROUND');
    expect(roundNumberToName(2, 4)).toBe('QUARTERFINAL');
    expect(roundNumberToName(3, 4)).toBe('SEMIFINAL');
    expect(roundNumberToName(4, 4)).toBe('FINAL');
  });
});

// ===========================================================================
// deriveConsolationResults
// ===========================================================================
describe('deriveConsolationResults(tournamentId)', () => {
  // Test 5: No CONSOLATION bracket → return empty array
  it('returns empty array when no CONSOLATION bracket exists', async () => {
    mockPrisma.bracket.findFirst.mockResolvedValue(null);

    const result = await deriveConsolationResults('tournament-1');

    expect(result).toEqual([]);
    expect(mockPrisma.bracket.findFirst).toHaveBeenCalledWith({
      where: { tournamentId: 'tournament-1', bracketType: 'CONSOLATION' }
    });
  });

  // Test 6: Player who won R1 gets result with finalRoundReached = round name
  it('returns results only for players who won at least 1 consolation match', async () => {
    mockPrisma.bracket.findFirst.mockResolvedValue({ id: 'bracket-c1', bracketType: 'CONSOLATION' });
    // 1 round total → FINAL
    mockPrisma.round.findMany.mockResolvedValue([
      { id: 'round-1', roundNumber: 1 }
    ]);
    // 1 match: player1 wins
    mockPrisma.match.findMany.mockResolvedValue([
      {
        id: 'match-1001',
        roundId: 'round-1',
        player1Id: 'player-A',
        player2Id: 'player-B',
        pair1Id: null,
        pair2Id: null,
        result: JSON.stringify({ winner: 'PLAYER1' })
      }
    ]);
    // Tournament is SINGLES
    mockPrisma.tournament.findUnique.mockResolvedValue({
      category: { type: 'SINGLES' }
    });

    const result = await deriveConsolationResults('tournament-1');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      playerId: 'player-A',
      finalRoundReached: 'FINAL',
      isConsolation: true
    });
  });

  // Test 7: Player who lost all consolation matches → no entry
  it('returns empty when player lost all consolation matches', async () => {
    mockPrisma.bracket.findFirst.mockResolvedValue({ id: 'bracket-c1', bracketType: 'CONSOLATION' });
    mockPrisma.round.findMany.mockResolvedValue([
      { id: 'round-1', roundNumber: 1 }
    ]);
    // No completed matches (all lost, or just none)
    mockPrisma.match.findMany.mockResolvedValue([]);
    mockPrisma.tournament.findUnique.mockResolvedValue({
      category: { type: 'SINGLES' }
    });

    const result = await deriveConsolationResults('tournament-1');

    expect(result).toEqual([]);
  });

  // Test 8: isConsolation=true on all returned results
  it('sets isConsolation=true on all returned results', async () => {
    mockPrisma.bracket.findFirst.mockResolvedValue({ id: 'bracket-c1', bracketType: 'CONSOLATION' });
    mockPrisma.round.findMany.mockResolvedValue([
      { id: 'round-1', roundNumber: 1 },
      { id: 'round-2', roundNumber: 2 }
    ]);
    mockPrisma.match.findMany.mockResolvedValue([
      {
        id: 'match-1001',
        roundId: 'round-1',
        player1Id: 'player-A',
        player2Id: 'player-B',
        pair1Id: null,
        pair2Id: null,
        result: JSON.stringify({ winner: 'PLAYER2' })
      },
      {
        id: 'match-1002',
        roundId: 'round-1',
        player1Id: 'player-C',
        player2Id: 'player-D',
        pair1Id: null,
        pair2Id: null,
        result: JSON.stringify({ winner: 'PLAYER1' })
      }
    ]);
    mockPrisma.tournament.findUnique.mockResolvedValue({
      category: { type: 'SINGLES' }
    });

    const result = await deriveConsolationResults('tournament-1');

    expect(result.every(r => r.isConsolation === true)).toBe(true);
  });

  // Test 9: Doubles — returns pairId instead of playerId
  it('returns pairId for doubles tournaments', async () => {
    mockPrisma.bracket.findFirst.mockResolvedValue({ id: 'bracket-c1', bracketType: 'CONSOLATION' });
    mockPrisma.round.findMany.mockResolvedValue([
      { id: 'round-1', roundNumber: 1 }
    ]);
    mockPrisma.match.findMany.mockResolvedValue([
      {
        id: 'match-1001',
        roundId: 'round-1',
        player1Id: null,
        player2Id: null,
        pair1Id: 'pair-A',
        pair2Id: 'pair-B',
        result: JSON.stringify({ winner: 'PLAYER2' })
      }
    ]);
    mockPrisma.tournament.findUnique.mockResolvedValue({
      category: { type: 'DOUBLES_MIXED' }
    });

    const result = await deriveConsolationResults('tournament-1');

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('pairId', 'pair-B');
    expect(result[0]).not.toHaveProperty('playerId');
    expect(result[0].isConsolation).toBe(true);
  });

  // Test 10: Player who won R1 and R2 gets R2's name (highest round won)
  it('returns the HIGHEST round won (R2 over R1 for same player)', async () => {
    mockPrisma.bracket.findFirst.mockResolvedValue({ id: 'bracket-c1', bracketType: 'CONSOLATION' });
    // 2 rounds: SEMIFINAL, FINAL
    mockPrisma.round.findMany.mockResolvedValue([
      { id: 'round-1', roundNumber: 1 },
      { id: 'round-2', roundNumber: 2 }
    ]);
    // player-A wins R1 AND R2
    mockPrisma.match.findMany.mockResolvedValue([
      {
        id: 'match-1001',
        roundId: 'round-1',
        player1Id: 'player-A',
        player2Id: 'player-B',
        pair1Id: null,
        pair2Id: null,
        result: JSON.stringify({ winner: 'PLAYER1' })
      },
      {
        id: 'match-1002',
        roundId: 'round-2',
        player1Id: 'player-A',
        player2Id: 'player-C',
        pair1Id: null,
        pair2Id: null,
        result: JSON.stringify({ winner: 'PLAYER1' })
      }
    ]);
    mockPrisma.tournament.findUnique.mockResolvedValue({
      category: { type: 'SINGLES' }
    });

    const result = await deriveConsolationResults('tournament-1');

    expect(result).toHaveLength(1);
    expect(result[0].playerId).toBe('player-A');
    // 2-round bracket: R2 = FINAL
    expect(result[0].finalRoundReached).toBe('FINAL');
    expect(result[0].isConsolation).toBe(true);
  });
});
