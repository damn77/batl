/**
 * Unit tests for checkAndCompleteTournament — COMBINED format guard
 * Feature: Phase 28 Plan 01 - Group Match Play and Visualization
 * Requirement: GVIEW-01
 *
 * Wave 0 stubs: These tests verify that COMBINED tournaments do NOT auto-complete
 * when all group matches are done (no knockout bracket exists yet), while GROUP
 * tournaments and COMBINED tournaments with a bracket DO complete normally.
 *
 * Phase 30 update: guard now uses bracket.count instead of bracket.findFirst
 * (supports multi-bracket: MAIN + SECONDARY).
 */
import { jest } from '@jest/globals';

// ---------------------------------------------------------------------------
// Mock @prisma/client and related imports using unstable_mockModule (ES module safe)
// ---------------------------------------------------------------------------

// We test checkAndCompleteTournament directly via a mock tx object.
// No module mocks needed — the function takes a tx parameter directly.

// ---------------------------------------------------------------------------
// Import service after mocks are registered
// ---------------------------------------------------------------------------
const { checkAndCompleteTournament } = await import(
  '../../src/services/tournamentLifecycleService.js'
);

// ---------------------------------------------------------------------------
// Helpers to build mock tx objects
// ---------------------------------------------------------------------------

/**
 * Build a mock Prisma transaction object for lifecycle tests.
 *
 * @param {Object} opts
 * @param {number} opts.incompleteCount - Return value of tx.match.count
 * @param {string|null} opts.formatType - Tournament formatType ('GROUP', 'COMBINED', etc.)
 * @param {number} opts.bracketCount - Return value of tx.bracket.count (0 = none, 1+ = exists)
 */
function buildTx({ incompleteCount, formatType, bracketCount = 0 }) {
  return {
    match: {
      count: jest.fn().mockResolvedValue(incompleteCount)
    },
    tournament: {
      findUnique: jest.fn().mockResolvedValue(
        formatType !== undefined ? { formatType } : null
      ),
      update: jest.fn().mockResolvedValue({ id: 'tournament-1', status: 'COMPLETED' })
    },
    bracket: {
      count: jest.fn().mockResolvedValue(bracketCount)
    }
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('checkAndCompleteTournament — COMBINED format guard', () => {
  const TOURNAMENT_ID = 'tournament-uuid-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should NOT complete COMBINED tournament when all group matches done and no bracket exists', async () => {
    // Setup: COMBINED format, all matches completed (incompleteCount=0), no bracket record
    const tx = buildTx({ incompleteCount: 0, formatType: 'COMBINED', bracketCount: 0 });

    await checkAndCompleteTournament(tx, TOURNAMENT_ID, true /* isOrganizer */);

    // Tournament.findUnique should be called to check formatType
    expect(tx.tournament.findUnique).toHaveBeenCalledWith({
      where: { id: TOURNAMENT_ID },
      select: { formatType: true }
    });

    // bracket.count should be called to check for knockout bracket(s)
    expect(tx.bracket.count).toHaveBeenCalledWith({
      where: { tournamentId: TOURNAMENT_ID }
    });

    // tournament.update must NOT be called — stays IN_PROGRESS
    expect(tx.tournament.update).not.toHaveBeenCalled();
  });

  it('should complete COMBINED tournament when all matches done AND bracket exists', async () => {
    // Setup: COMBINED format, all matches completed, knockout bracket(s) exist
    const tx = buildTx({
      incompleteCount: 0,
      formatType: 'COMBINED',
      bracketCount: 1
    });

    await checkAndCompleteTournament(tx, TOURNAMENT_ID, true /* isOrganizer */);

    // tournament.update MUST be called with COMPLETED status
    expect(tx.tournament.update).toHaveBeenCalledWith({
      where: { id: TOURNAMENT_ID },
      data: expect.objectContaining({ status: 'COMPLETED' })
    });
  });

  it('should complete GROUP tournament when all matches done (no guard fires)', async () => {
    // Setup: GROUP format, all matches completed
    // The COMBINED guard only fires for COMBINED format — GROUP should complete normally
    const tx = buildTx({ incompleteCount: 0, formatType: 'GROUP', bracketCount: 0 });

    await checkAndCompleteTournament(tx, TOURNAMENT_ID, true /* isOrganizer */);

    // tournament.update MUST be called with COMPLETED status
    expect(tx.tournament.update).toHaveBeenCalledWith({
      where: { id: TOURNAMENT_ID },
      data: expect.objectContaining({ status: 'COMPLETED' })
    });

    // bracket.count should NOT be called for GROUP format
    expect(tx.bracket.count).not.toHaveBeenCalled();
  });

  it('should NOT complete tournament when incomplete matches remain', async () => {
    // Setup: Any format, some matches still incomplete
    const tx = buildTx({ incompleteCount: 3, formatType: 'COMBINED', bracketCount: 0 });

    await checkAndCompleteTournament(tx, TOURNAMENT_ID, true /* isOrganizer */);

    // tournament.update must NOT be called
    expect(tx.tournament.update).not.toHaveBeenCalled();

    // tournament.findUnique and bracket.count should NOT be called
    // (we short-circuit before them when incompleteCount > 0)
    expect(tx.tournament.findUnique).not.toHaveBeenCalled();
    expect(tx.bracket.count).not.toHaveBeenCalled();
  });
});
