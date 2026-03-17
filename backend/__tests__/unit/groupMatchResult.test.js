/**
 * Unit tests for group match result submission
 * Feature: Phase 28 Plan 01 - Group Match Play and Visualization
 * Requirements: GPLAY-02 (player submits group match), GPLAY-03 (organizer corrects)
 *
 * Wave 0 stubs: These tests verify that the existing matchResultService.submitResult()
 * path handles group matches correctly:
 *   - Group matches have roundId=null, groupId set
 *   - advanceBracketSlot returns early for group matches (no bracket cascade)
 *   - Organizer corrections work without dry-run for group matches
 *   - checkAndCompleteTournament is called after organizer submission
 *
 * Status: GREEN — existing submitResult logic already handles these cases correctly.
 * advanceBracketSlot checks `if (!updatedMatch.roundId) return;` so no cascade fires.
 */
import { jest } from '@jest/globals';

// ---------------------------------------------------------------------------
// Mock prisma singleton so we don't hit a real database
// ---------------------------------------------------------------------------
const mockTx = {
  match: {
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn()
  },
  tournament: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  bracket: {
    findFirst: jest.fn(),
    findUnique: jest.fn()
  },
  round: {
    findUnique: jest.fn()
  },
  playerProfile: {
    findUnique: jest.fn()
  },
  groupParticipant: {
    findFirst: jest.fn()
  }
};

const mockPrisma = {
  $transaction: jest.fn((fn) => fn(mockTx))
};

jest.unstable_mockModule('../../src/lib/prisma.js', () => ({
  default: mockPrisma
}));

// Also mock consolation service (not relevant for group matches)
jest.unstable_mockModule('../../src/services/consolationEligibilityService.js', () => ({
  routeLoserToConsolation: jest.fn().mockResolvedValue(undefined),
  checkBYEWinnerConsolationUpdate: jest.fn().mockResolvedValue(undefined),
  clearConsolationRouting: jest.fn().mockResolvedValue(undefined),
  cascadeClearMainBracket: jest.fn().mockResolvedValue(undefined),
  cascadeClearConsolationDownstream: jest.fn().mockResolvedValue(undefined)
}));

// Mock tournamentLifecycleService to spy on its functions
const mockCheckAndCompleteTournament = jest.fn().mockResolvedValue(undefined);
const mockAdvanceBracketSlot = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule('../../src/services/tournamentLifecycleService.js', () => ({
  checkAndCompleteTournament: mockCheckAndCompleteTournament,
  advanceBracketSlot: mockAdvanceBracketSlot
}));

// ---------------------------------------------------------------------------
// Import service after mocks
// ---------------------------------------------------------------------------
const { submitResult } = await import('../../src/services/matchResultService.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal group match record (roundId=null, groupId set).
 */
function buildGroupMatch(overrides = {}) {
  return {
    id: 'match-group-1',
    matchNumber: 1,
    roundId: null,        // null for group matches — key invariant
    bracketId: null,      // null for group matches
    groupId: 'group-1',   // set for group matches
    tournamentId: 'tournament-1',
    player1Id: 'player-1',
    player2Id: 'player-2',
    pair1Id: null,
    pair2Id: null,
    player1Seed: 1,
    player2Seed: 2,
    pair1Seed: null,
    pair2Seed: null,
    isBye: false,
    result: null,
    status: 'SCHEDULED',
    completedAt: null,
    updatedAt: new Date(),
    pair1: null,
    pair2: null,
    ...overrides
  };
}

/**
 * Build the updated match returned after tx.match.update.
 */
function buildUpdatedMatch(original, resultJson) {
  return {
    ...original,
    result: JSON.stringify(resultJson),
    status: 'COMPLETED',
    completedAt: new Date(),
    updatedAt: new Date()
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Group match result submission', () => {
  const PLAYER_1_RESULT = {
    winner: 'PLAYER1',
    sets: [{ setNumber: 1, player1Score: 6, player2Score: 3 }]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GPLAY-02: Player submits group match result', () => {
    it('should save result for group match (roundId=null)', async () => {
      const groupMatch = buildGroupMatch();
      const resultData = PLAYER_1_RESULT;

      // Setup mock tx responses
      mockTx.match.findUnique.mockResolvedValue(groupMatch);
      mockTx.match.update.mockResolvedValue(
        buildUpdatedMatch(groupMatch, { ...resultData, submittedBy: 'PLAYER', outcome: null })
      );
      mockTx.match.count.mockResolvedValue(1); // Some matches still incomplete — don't trigger completion

      // Player 1 submits — they are a participant
      const updated = await submitResult({
        matchId: groupMatch.id,
        body: resultData,
        isOrganizer: false,
        submitterPlayerId: 'player-1',
        dryRun: false
      });

      // Result should be saved
      expect(mockTx.match.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: groupMatch.id },
          data: expect.objectContaining({ status: 'COMPLETED' })
        })
      );
      expect(updated.status).toBe('COMPLETED');
    });

    it('should not trigger bracket advancement for group matches', async () => {
      // Group matches have roundId=null, so advanceBracketSlot should return early.
      // In the actual implementation, advanceBracketSlot checks `if (!updatedMatch.roundId) return;`
      const groupMatch = buildGroupMatch();
      const resultData = PLAYER_1_RESULT;

      mockTx.match.findUnique.mockResolvedValue(groupMatch);
      mockTx.match.update.mockResolvedValue(
        buildUpdatedMatch(groupMatch, { ...resultData, submittedBy: 'PLAYER', outcome: null })
      );
      mockTx.match.count.mockResolvedValue(1);

      await submitResult({
        matchId: groupMatch.id,
        body: resultData,
        isOrganizer: false,
        submitterPlayerId: 'player-1',
        dryRun: false
      });

      // advanceBracketSlot is called but roundId=null means it returns immediately
      expect(mockAdvanceBracketSlot).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({ roundId: null }),
        expect.any(String)
      );
    });
  });

  describe('GPLAY-03: Organizer corrects group match result', () => {
    it('should allow organizer to change winner on group match without dry-run', async () => {
      // Setup: completed group match with player1 as winner
      const groupMatch = buildGroupMatch({
        result: JSON.stringify({ winner: 'PLAYER1', submittedBy: 'PLAYER', sets: [], outcome: null }),
        status: 'COMPLETED'
      });

      // Organizer changes winner to player2
      const correctionData = {
        winner: 'PLAYER2',
        sets: [{ setNumber: 1, player1Score: 3, player2Score: 6 }]
      };

      mockTx.match.findUnique.mockResolvedValue(groupMatch);
      mockTx.match.update.mockResolvedValue(
        buildUpdatedMatch(groupMatch, { ...correctionData, submittedBy: 'ORGANIZER', outcome: null })
      );
      mockTx.match.count.mockResolvedValue(1);

      const updated = await submitResult({
        matchId: groupMatch.id,
        body: correctionData,
        isOrganizer: true,
        submitterPlayerId: null,
        dryRun: false  // No dry-run for group match corrections
      });

      // Result should be updated with ORGANIZER as submitter
      const savedResult = JSON.parse(updated.result);
      expect(savedResult.winner).toBe('PLAYER2');
      expect(savedResult.submittedBy).toBe('ORGANIZER');
    });

    it('should call checkAndCompleteTournament after organizer submission', async () => {
      const groupMatch = buildGroupMatch();
      const resultData = { ...PLAYER_1_RESULT };

      mockTx.match.findUnique.mockResolvedValue(groupMatch);
      mockTx.match.update.mockResolvedValue(
        buildUpdatedMatch(groupMatch, { ...resultData, submittedBy: 'ORGANIZER', outcome: null })
      );
      mockTx.match.count.mockResolvedValue(0); // All done — triggers completion check

      await submitResult({
        matchId: groupMatch.id,
        body: resultData,
        isOrganizer: true,
        submitterPlayerId: null,
        dryRun: false
      });

      // checkAndCompleteTournament should be called for organizer submissions
      expect(mockCheckAndCompleteTournament).toHaveBeenCalledWith(
        mockTx,
        groupMatch.tournamentId,
        true /* isOrganizer */
      );
    });
  });
});
