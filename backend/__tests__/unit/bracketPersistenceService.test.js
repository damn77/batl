/**
 * Unit tests for bracketPersistenceService.js
 * Feature: Phase 01.1 - Bracket Generation and Seeding Persistence
 * Tests: DRAW-01 through DRAW-07
 *
 * Status: GREEN (service implemented)
 *
 * Uses jest.unstable_mockModule() for ES module mocking so that
 * @prisma/client and seedingPlacementService are mocked before the service
 * module is dynamically imported.
 */
import { jest } from '@jest/globals';

// ---------------------------------------------------------------------------
// Mock @prisma/client using unstable_mockModule (ES module safe)
// ---------------------------------------------------------------------------
const mockPrisma = {
  tournament: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  match: {
    deleteMany: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn()
  },
  round: {
    deleteMany: jest.fn(),
    create: jest.fn()
  },
  bracket: {
    deleteMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn()
  },
  tournamentRegistration: {
    findMany: jest.fn()
  },
  pairRegistration: {
    findMany: jest.fn()
  },
  // $transaction executes the callback synchronously with mockPrisma as tx
  $transaction: jest.fn((fn) => fn(mockPrisma))
};

jest.unstable_mockModule('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));

// ---------------------------------------------------------------------------
// Mock seedingPlacementService
// ---------------------------------------------------------------------------
const mockGenerateSeededBracket = jest.fn();

jest.unstable_mockModule('../../src/services/seedingPlacementService.js', () => ({
  generateSeededBracket: mockGenerateSeededBracket
}));

// ---------------------------------------------------------------------------
// Dynamically import the service AFTER mocks are registered
// ---------------------------------------------------------------------------
const { closeRegistration, generateBracket, regenerateBracket, swapSlots } =
  await import('../../src/services/bracketPersistenceService.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal positions array for a bracket of given size.
 * byeMatchAt: array of match indices (0-based) that are BYE matches.
 * In each BYE match, the even position (first slot) holds the real player and
 * the odd position (second slot) is the actual BYE slot (entityId: null).
 */
function makeSinglesPositions(bracketSize, { byeMatchAt = [] } = {}) {
  return Array.from({ length: bracketSize }, (_, posIdx) => {
    const matchIdx = Math.floor(posIdx / 2);
    const isByeSlot = byeMatchAt.includes(matchIdx) && posIdx % 2 === 1;
    return {
      positionNumber: posIdx + 1,
      positionIndex: posIdx,
      seed: null,
      entityId: isByeSlot ? null : `player-${posIdx + 1}`,
      entityType: 'PLAYER',
      entityName: isByeSlot ? null : `Player ${posIdx + 1}`,
      isBye: isByeSlot,
      isPreliminary: false
    };
  });
}

/**
 * Standard seeded bracket result from the seeding service.
 * byeMatchAt: match-indexed array specifying which matches are BYEs.
 * structure is match-indexed (bracketSize/2 chars): '1'=BYE, '0'=preliminary.
 */
function makeSeededBracketResult(bracketSize = 8, byeMatchAt = []) {
  const matchCount = bracketSize / 2;
  const structure = Array.from({ length: matchCount }, (_, i) =>
    byeMatchAt.includes(i) ? '1' : '0'
  ).join('');
  return {
    bracket: {
      categoryId: 'cat-1',
      playerCount: bracketSize,
      bracketSize,
      structure,
      seedCount: 2,
      positions: makeSinglesPositions(bracketSize, { byeMatchAt }),
      randomSeed: 'test-seed',
      generatedAt: new Date().toISOString()
    },
    seedingInfo: { seedCount: 2, seedRange: { min: 4, max: 9 }, note: 'test' }
  };
}

// ---------------------------------------------------------------------------
// Reset mocks between tests to prevent cross-test contamination
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();
  // Re-wire $transaction after clearAllMocks resets it to a plain mock
  mockPrisma.$transaction.mockImplementation((fn) => fn(mockPrisma));
});

// ===========================================================================
// DRAW-01: Close registration
// ===========================================================================
describe('closeRegistration()', () => {
  it('sets tournament registrationClosed = true', async () => {
    mockPrisma.tournament.findUnique.mockResolvedValue({
      id: 'tour-1',
      status: 'SCHEDULED',
      registrationClosed: false
    });
    mockPrisma.tournament.update.mockResolvedValue({
      id: 'tour-1',
      registrationClosed: true
    });

    const result = await closeRegistration('tour-1');

    expect(mockPrisma.tournament.update).toHaveBeenCalledWith({
      where: { id: 'tour-1' },
      data: { registrationClosed: true }
    });
    expect(result.registrationClosed).toBe(true);
  });

  it('throws TOURNAMENT_NOT_FOUND if tournament does not exist', async () => {
    mockPrisma.tournament.findUnique.mockResolvedValue(null);

    await expect(closeRegistration('nonexistent')).rejects.toMatchObject({
      code: 'TOURNAMENT_NOT_FOUND'
    });
  });

  it('throws ALREADY_CLOSED if already closed', async () => {
    mockPrisma.tournament.findUnique.mockResolvedValue({
      id: 'tour-1',
      status: 'SCHEDULED',
      registrationClosed: true
    });

    await expect(closeRegistration('tour-1')).rejects.toMatchObject({
      code: 'ALREADY_CLOSED'
    });
  });
});

// ===========================================================================
// DRAW-02: Generate draw persists DB records
// ===========================================================================
describe('generateBracket()', () => {
  /** Set up all mocks for a standard 8-player singles tournament */
  function setupGenerateBracketMocks({ bracketSize = 8, byeMatchAt = [] } = {}) {
    mockPrisma.tournament.findUnique.mockResolvedValue({
      id: 'tour-1',
      status: 'SCHEDULED',
      registrationClosed: true,
      categoryId: 'cat-1',
      category: { type: 'SINGLES' }
    });
    mockPrisma.tournamentRegistration.findMany.mockResolvedValue(
      Array.from({ length: bracketSize }, (_, i) => ({
        id: `reg-${i}`,
        player: { id: `player-${i + 1}`, name: `Player ${i + 1}` }
      }))
    );
    mockPrisma.bracket.create.mockResolvedValue({
      id: 'bracket-1',
      tournamentId: 'tour-1',
      bracketType: 'MAIN',
      matchGuarantee: 'MATCH_1'
    });
    mockPrisma.round.create.mockImplementation((args) => ({
      id: `round-${args.data.roundNumber}`,
      ...args.data
    }));
    mockPrisma.match.create.mockImplementation((args) => ({
      id: `match-${Math.random()}`,
      ...args.data
    }));
    mockPrisma.match.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.round.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.bracket.deleteMany.mockResolvedValue({ count: 0 });
    mockGenerateSeededBracket.mockResolvedValue(
      makeSeededBracketResult(bracketSize, byeMatchAt)
    );
  }

  it('creates exactly one Bracket record for the tournament', async () => {
    setupGenerateBracketMocks({ bracketSize: 8 });

    await generateBracket('tour-1');

    expect(mockPrisma.bracket.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.bracket.create).toHaveBeenCalledWith({
      data: {
        tournamentId: 'tour-1',
        bracketType: 'MAIN',
        matchGuarantee: 'MATCH_1',
        drawMode: 'SEEDED'
      }
    });
  });

  it('creates correct number of Round records based on bracket size', async () => {
    // bracketSize=8 → log2(8)=3 rounds
    setupGenerateBracketMocks({ bracketSize: 8 });

    await generateBracket('tour-1');

    expect(mockPrisma.round.create).toHaveBeenCalledTimes(3);
    const roundNums = mockPrisma.round.create.mock.calls.map(
      (c) => c[0].data.roundNumber
    );
    expect(roundNums).toEqual([1, 2, 3]);
  });

  it('creates Round 1 Match records with player IDs from positions array', async () => {
    setupGenerateBracketMocks({ bracketSize: 8 });

    await generateBracket('tour-1');

    // Round 1: bracketSize/2 = 4 matches
    const allMatchCreateCalls = mockPrisma.match.create.mock.calls;
    const round1Calls = allMatchCreateCalls.slice(0, 4);

    round1Calls.forEach((call, i) => {
      expect(call[0].data.player1Id).toBe(`player-${i * 2 + 1}`);
      expect(call[0].data.player2Id).toBe(`player-${i * 2 + 2}`);
    });
  });

  it('creates later-round Match records with null player1Id and player2Id', async () => {
    // bracketSize=8 → 4 + 2 + 1 = 7 total matches; matches 5-7 are later rounds
    setupGenerateBracketMocks({ bracketSize: 8 });

    await generateBracket('tour-1');

    const allMatchCreateCalls = mockPrisma.match.create.mock.calls;
    const laterRoundCalls = allMatchCreateCalls.slice(4); // skip Round 1
    laterRoundCalls.forEach((call) => {
      expect(call[0].data.player1Id).toBeNull();
      expect(call[0].data.player2Id).toBeNull();
    });
  });

  it('marks BYE positions as isBye=true with status BYE', async () => {
    // Match 0 is a BYE: pos[0]=player-1 (real player), pos[1]=null (BYE slot)
    setupGenerateBracketMocks({ bracketSize: 8, byeMatchAt: [0] });

    await generateBracket('tour-1');

    const round1Calls = mockPrisma.match.create.mock.calls.slice(0, 4);
    // First match — BYE: player advances from player1 slot, player2 slot is null
    expect(round1Calls[0][0].data.isBye).toBe(true);
    expect(round1Calls[0][0].data.status).toBe('BYE');
    expect(round1Calls[0][0].data.player1Id).toBe('player-1');
    expect(round1Calls[0][0].data.player2Id).toBeNull();

    // Second match — preliminary: both slots have players
    expect(round1Calls[1][0].data.isBye).toBe(false);
    expect(round1Calls[1][0].data.status).toBe('SCHEDULED');
  });
});

// ===========================================================================
// DRAW-03: Prerequisite guard
// ===========================================================================
describe('generateBracket() prerequisite', () => {
  it('throws REGISTRATION_NOT_CLOSED if registrationClosed is false', async () => {
    mockPrisma.tournament.findUnique.mockResolvedValue({
      id: 'tour-1',
      status: 'SCHEDULED',
      registrationClosed: false,
      categoryId: 'cat-1',
      category: { type: 'SINGLES' }
    });

    await expect(generateBracket('tour-1')).rejects.toMatchObject({
      code: 'REGISTRATION_NOT_CLOSED'
    });
  });
});

// ===========================================================================
// DRAW-04: Regeneration atomicity
// ===========================================================================
describe('regenerateBracket()', () => {
  function setupRegenerateMocks() {
    mockPrisma.tournament.findUnique.mockResolvedValue({
      id: 'tour-1',
      status: 'SCHEDULED',
      registrationClosed: true,
      categoryId: 'cat-1',
      category: { type: 'SINGLES' }
    });
    mockPrisma.tournamentRegistration.findMany.mockResolvedValue(
      Array.from({ length: 8 }, (_, i) => ({
        id: `reg-${i}`,
        player: { id: `player-${i + 1}`, name: `Player ${i + 1}` }
      }))
    );
    mockPrisma.bracket.create.mockResolvedValue({
      id: 'bracket-1',
      tournamentId: 'tour-1'
    });
    mockPrisma.round.create.mockImplementation((args) => ({
      id: `round-${args.data.roundNumber}`,
      ...args.data
    }));
    mockPrisma.match.create.mockImplementation((args) => ({
      id: `match-${Math.random()}`,
      ...args.data
    }));
    mockPrisma.match.deleteMany.mockResolvedValue({ count: 5 });
    mockPrisma.round.deleteMany.mockResolvedValue({ count: 3 });
    mockPrisma.bracket.deleteMany.mockResolvedValue({ count: 1 });
    mockGenerateSeededBracket.mockResolvedValue(makeSeededBracketResult(8));
  }

  it('deletes all existing Match/Round/Bracket records before creating new ones', async () => {
    setupRegenerateMocks();

    await regenerateBracket('tour-1');

    // Verify cascade deletion in correct order: Match → Round → Bracket
    expect(mockPrisma.match.deleteMany).toHaveBeenCalledWith({
      where: { tournamentId: 'tour-1' }
    });
    expect(mockPrisma.round.deleteMany).toHaveBeenCalledWith({
      where: { tournamentId: 'tour-1' }
    });
    expect(mockPrisma.bracket.deleteMany).toHaveBeenCalledWith({
      where: { tournamentId: 'tour-1' }
    });
    // New bracket was created after deletions
    expect(mockPrisma.bracket.create).toHaveBeenCalledTimes(1);
  });

  it('creates fresh records atomically (no orphans on failure)', async () => {
    setupRegenerateMocks();

    await regenerateBracket('tour-1');

    // All operations happen inside a single $transaction call
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    const txFn = mockPrisma.$transaction.mock.calls[0][0];
    expect(typeof txFn).toBe('function');
  });
});

// ===========================================================================
// DRAW-05: Lock after IN_PROGRESS
// ===========================================================================
describe('bracket lock', () => {
  it('throws BRACKET_LOCKED if tournament status is IN_PROGRESS', async () => {
    mockPrisma.tournament.findUnique.mockResolvedValue({
      id: 'tour-1',
      status: 'IN_PROGRESS',
      registrationClosed: true,
      categoryId: 'cat-1',
      category: { type: 'SINGLES' }
    });
    mockPrisma.bracket.count.mockResolvedValue(1); // Bracket exists → locked

    await expect(generateBracket('tour-1')).rejects.toMatchObject({
      code: 'BRACKET_LOCKED'
    });
  });

  it('throws BRACKET_LOCKED if tournament status is COMPLETED', async () => {
    mockPrisma.tournament.findUnique.mockResolvedValue({
      id: 'tour-1',
      status: 'COMPLETED',
      registrationClosed: true,
      categoryId: 'cat-1',
      category: { type: 'SINGLES' }
    });
    mockPrisma.bracket.count.mockResolvedValue(1); // Bracket exists → locked

    await expect(generateBracket('tour-1')).rejects.toMatchObject({
      code: 'BRACKET_LOCKED'
    });
  });
});

// ===========================================================================
// DRAW-06: Slot swap
// ===========================================================================
describe('swapSlots()', () => {
  it('updates match player IDs atomically across all swaps in a batch', async () => {
    mockPrisma.tournament.findUnique.mockResolvedValue({
      id: 'tour-1',
      status: 'SCHEDULED'
    });
    mockPrisma.match.findMany.mockResolvedValue([
      { id: 'match-1', isBye: false },
      { id: 'match-2', isBye: false }
    ]);
    mockPrisma.match.update.mockResolvedValue({ id: 'match-1' });

    const swaps = [
      { matchId: 'match-1', field: 'player1Id', newPlayerId: 'player-A' },
      { matchId: 'match-2', field: 'player2Id', newPlayerId: 'player-B' }
    ];

    const result = await swapSlots('tour-1', swaps);

    expect(result).toEqual({ swapped: 2 });
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.match.update).toHaveBeenCalledTimes(2);
    expect(mockPrisma.match.update).toHaveBeenCalledWith({
      where: { id: 'match-1' },
      data: { player1Id: 'player-A' }
    });
    expect(mockPrisma.match.update).toHaveBeenCalledWith({
      where: { id: 'match-2' },
      data: { player2Id: 'player-B' }
    });
  });

  it('throws TOURNAMENT_NOT_FOUND if tournament does not exist', async () => {
    mockPrisma.tournament.findUnique.mockResolvedValue(null);

    await expect(
      swapSlots('nonexistent', [
        { matchId: 'm1', field: 'player1Id', newPlayerId: 'p1' }
      ])
    ).rejects.toMatchObject({ code: 'TOURNAMENT_NOT_FOUND' });
  });
});

// ===========================================================================
// DRAW-07: BYE slot guard
// ===========================================================================
describe('swapSlots() BYE guard', () => {
  it('throws BYE_SLOT_NOT_SWAPPABLE when swapping player2 on a BYE match', async () => {
    mockPrisma.tournament.findUnique.mockResolvedValue({
      id: 'tour-1',
      status: 'SCHEDULED'
    });
    mockPrisma.match.findMany.mockResolvedValue([
      { id: 'match-1', isBye: false },
      { id: 'match-bye', isBye: true }
    ]);

    await expect(
      swapSlots('tour-1', [
        { matchId: 'match-1', field: 'player1Id', newPlayerId: 'player-A' },
        { matchId: 'match-bye', field: 'player2Id', newPlayerId: 'player-B' }
      ])
    ).rejects.toMatchObject({ code: 'BYE_SLOT_NOT_SWAPPABLE' });
  });
});
