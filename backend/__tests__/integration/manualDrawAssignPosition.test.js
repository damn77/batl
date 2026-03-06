/**
 * Integration-style unit tests for assignPosition() in bracketPersistenceService.js
 *
 * Covers Phase 13 manual draw requirements:
 *   - DRAW-03: Organizer can assign a player/pair to any empty bracket position
 *   - DRAW-04: Dropdown shows only unplaced players (ALREADY_PLACED guard)
 *   - DRAW-05: Organizer can clear a filled bracket position back to empty
 *
 * Uses jest.unstable_mockModule() for ES module-safe mocking of @prisma/client,
 * following the established pattern from bracketPersistenceService.test.js.
 */

import { jest } from '@jest/globals';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function mockTournament(overrides = {}) {
  return {
    id: 'tour-1',
    status: 'SCHEDULED',
    categoryId: 'cat-1',
    category: { type: 'SINGLES' },
    ...overrides
  };
}

function mockMatch(overrides = {}) {
  return {
    id: 'match-1',
    tournamentId: 'tour-1',
    matchNumber: 1,
    player1Id: null,
    player2Id: null,
    pair1Id: null,
    pair2Id: null,
    isBye: false,
    round: { roundNumber: 1, bracketId: 'bracket-1' },
    ...overrides
  };
}

function mockRegistration(overrides = {}) {
  return {
    tournamentId: 'tour-1',
    playerId: 'player-A',
    status: 'REGISTERED',
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Mock @prisma/client
// ---------------------------------------------------------------------------

const mockPrisma = {
  tournament: {
    findUnique: jest.fn()
  },
  match: {
    findUnique: jest.fn(),
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
    findFirst: jest.fn()
  },
  pairRegistration: {
    findFirst: jest.fn()
  },
  // $transaction executes the callback synchronously with mockPrisma as tx
  $transaction: jest.fn((fn) => fn(mockPrisma))
};

jest.unstable_mockModule('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));

// Mock bracketService (imported by bracketPersistenceService but not needed for assignPosition)
jest.unstable_mockModule('../../src/services/bracketService.js', () => ({
  getBracketByPlayerCount: jest.fn()
}));

// Mock seedingPlacementService (not needed for assignPosition tests)
jest.unstable_mockModule('../../src/services/seedingPlacementService.js', () => ({
  generateSeededBracket: jest.fn()
}));

// ---------------------------------------------------------------------------
// Dynamic import of service AFTER mocks are registered
// ---------------------------------------------------------------------------
const { assignPosition } = await import('../../src/services/bracketPersistenceService.js');

// ---------------------------------------------------------------------------
// Reset mocks between tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.$transaction.mockImplementation((fn) => fn(mockPrisma));
});

// ===========================================================================
// DRAW-03: Assign player to position
// ===========================================================================
describe('DRAW-03: assignPosition() — assign player to empty slot', () => {
  it('assigns player to player1 slot (updates player1Id in DB)', async () => {
    mockPrisma.tournament.findUnique.mockResolvedValue(mockTournament());
    mockPrisma.match.findUnique.mockResolvedValue(mockMatch());
    mockPrisma.tournamentRegistration.findFirst.mockResolvedValue(mockRegistration());
    mockPrisma.pairRegistration.findFirst.mockResolvedValue(null);
    // No existing placements
    mockPrisma.match.findMany.mockResolvedValue([mockMatch()]);
    mockPrisma.match.update.mockResolvedValue({ id: 'match-1', player1Id: 'player-A' });

    const result = await assignPosition('tour-1', {
      matchId: 'match-1',
      slot: 'player1',
      playerId: 'player-A',
      pairId: null
    });

    expect(mockPrisma.match.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'match-1' },
        data: { player1Id: 'player-A' }
      })
    );
    expect(result).toMatchObject({
      matchId: 'match-1',
      slot: 'player1',
      entityId: 'player-A',
      action: 'assigned'
    });
  });

  it('assigns player to player2 slot (updates player2Id in DB)', async () => {
    mockPrisma.tournament.findUnique.mockResolvedValue(mockTournament());
    mockPrisma.match.findUnique.mockResolvedValue(mockMatch({ player1Id: 'player-X' }));
    mockPrisma.tournamentRegistration.findFirst.mockResolvedValue(mockRegistration({ playerId: 'player-B' }));
    mockPrisma.pairRegistration.findFirst.mockResolvedValue(null);
    // player-B not yet placed
    mockPrisma.match.findMany.mockResolvedValue([mockMatch({ player1Id: 'player-X' })]);
    mockPrisma.match.update.mockResolvedValue({ id: 'match-1', player2Id: 'player-B' });

    const result = await assignPosition('tour-1', {
      matchId: 'match-1',
      slot: 'player2',
      playerId: 'player-B',
      pairId: null
    });

    expect(mockPrisma.match.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'match-1' },
        data: { player2Id: 'player-B' }
      })
    );
    expect(result).toMatchObject({
      matchId: 'match-1',
      slot: 'player2',
      entityId: 'player-B',
      action: 'assigned'
    });
  });

  it('assigns pair to pair1 slot for doubles category', async () => {
    mockPrisma.tournament.findUnique.mockResolvedValue(
      mockTournament({ category: { type: 'DOUBLES' } })
    );
    const doublesMatch = mockMatch({ pair1Id: null, pair2Id: null });
    mockPrisma.match.findUnique.mockResolvedValue(doublesMatch);
    mockPrisma.pairRegistration.findFirst.mockResolvedValue({
      tournamentId: 'tour-1',
      pairId: 'pair-A',
      status: 'REGISTERED'
    });
    mockPrisma.tournamentRegistration.findFirst.mockResolvedValue(null);
    // No existing placements
    mockPrisma.match.findMany.mockResolvedValue([doublesMatch]);
    mockPrisma.match.update.mockResolvedValue({ id: 'match-1', pair1Id: 'pair-A' });

    const result = await assignPosition('tour-1', {
      matchId: 'match-1',
      slot: 'player1',
      playerId: null,
      pairId: 'pair-A'
    });

    expect(mockPrisma.match.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'match-1' },
        data: { pair1Id: 'pair-A' }
      })
    );
    expect(result).toMatchObject({
      matchId: 'match-1',
      slot: 'player1',
      entityId: 'pair-A',
      action: 'assigned'
    });
  });
});

// ===========================================================================
// DRAW-04: Uniqueness guard (already placed)
// ===========================================================================
describe('DRAW-04: assignPosition() — ALREADY_PLACED guard', () => {
  it('throws ALREADY_PLACED when player is already placed in a different slot', async () => {
    mockPrisma.tournament.findUnique.mockResolvedValue(mockTournament());
    mockPrisma.match.findUnique.mockResolvedValue(mockMatch());
    mockPrisma.tournamentRegistration.findFirst.mockResolvedValue(mockRegistration());
    mockPrisma.pairRegistration.findFirst.mockResolvedValue(null);
    // player-A is already in match-2 player1 slot
    mockPrisma.match.findMany.mockResolvedValue([
      mockMatch({ id: 'match-1', player1Id: null, player2Id: null }),
      mockMatch({ id: 'match-2', player1Id: 'player-A', player2Id: null })
    ]);

    await expect(
      assignPosition('tour-1', {
        matchId: 'match-1',
        slot: 'player1',
        playerId: 'player-A',
        pairId: null
      })
    ).rejects.toMatchObject({ code: 'ALREADY_PLACED' });
  });

  it('throws ALREADY_PLACED when player is already placed in a different match (player2 slot)', async () => {
    mockPrisma.tournament.findUnique.mockResolvedValue(mockTournament());
    mockPrisma.match.findUnique.mockResolvedValue(mockMatch());
    mockPrisma.tournamentRegistration.findFirst.mockResolvedValue(mockRegistration());
    mockPrisma.pairRegistration.findFirst.mockResolvedValue(null);
    // player-A is already in match-3 player2 slot
    mockPrisma.match.findMany.mockResolvedValue([
      mockMatch({ id: 'match-1', player1Id: null, player2Id: null }),
      mockMatch({ id: 'match-3', player1Id: null, player2Id: 'player-A' })
    ]);

    await expect(
      assignPosition('tour-1', {
        matchId: 'match-1',
        slot: 'player2',
        playerId: 'player-A',
        pairId: null
      })
    ).rejects.toMatchObject({ code: 'ALREADY_PLACED' });
  });

  it('returns assigned (no-op) when player is already in the exact same slot', async () => {
    mockPrisma.tournament.findUnique.mockResolvedValue(mockTournament());
    // player-A already in match-1 player1 slot
    mockPrisma.match.findUnique.mockResolvedValue(mockMatch({ player1Id: 'player-A' }));
    mockPrisma.tournamentRegistration.findFirst.mockResolvedValue(mockRegistration());
    mockPrisma.pairRegistration.findFirst.mockResolvedValue(null);
    // Same match, player-A in player1 slot
    mockPrisma.match.findMany.mockResolvedValue([
      mockMatch({ id: 'match-1', player1Id: 'player-A' })
    ]);

    const result = await assignPosition('tour-1', {
      matchId: 'match-1',
      slot: 'player1',
      playerId: 'player-A',
      pairId: null
    });

    // No-op: already assigned here
    expect(result).toMatchObject({
      matchId: 'match-1',
      slot: 'player1',
      entityId: 'player-A',
      action: 'assigned'
    });
    // match.update should NOT be called for the assignment (no change needed)
    expect(mockPrisma.match.update).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// DRAW-05: Clear position
// ===========================================================================
describe('DRAW-05: assignPosition() — clear slot', () => {
  it('clears player1 slot when playerId is null', async () => {
    mockPrisma.tournament.findUnique.mockResolvedValue(mockTournament());
    // match-1 has player-A in player1 slot
    mockPrisma.match.findUnique.mockResolvedValue(mockMatch({ player1Id: 'player-A' }));
    mockPrisma.tournamentRegistration.findFirst.mockResolvedValue(null);
    mockPrisma.pairRegistration.findFirst.mockResolvedValue(null);
    // For getByeAdjacentRound2Update: match-1 is not BYE-adjacent
    mockPrisma.match.findMany.mockResolvedValue([
      mockMatch({ id: 'match-1', player1Id: 'player-A' }),
      mockMatch({ id: 'match-2', player1Id: null })
    ]);
    mockPrisma.match.update.mockResolvedValue({ id: 'match-1', player1Id: null });

    const result = await assignPosition('tour-1', {
      matchId: 'match-1',
      slot: 'player1',
      playerId: null,
      pairId: null
    });

    expect(mockPrisma.match.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'match-1' },
        data: { player1Id: null }
      })
    );
    expect(result).toMatchObject({
      matchId: 'match-1',
      slot: 'player1',
      entityId: null,
      action: 'cleared'
    });
  });

  it('clears pair1 slot when pairId is null (doubles)', async () => {
    mockPrisma.tournament.findUnique.mockResolvedValue(
      mockTournament({ category: { type: 'DOUBLES' } })
    );
    const doublesMatch = mockMatch({ pair1Id: 'pair-A', pair2Id: null });
    mockPrisma.match.findUnique.mockResolvedValue(doublesMatch);
    mockPrisma.tournamentRegistration.findFirst.mockResolvedValue(null);
    mockPrisma.pairRegistration.findFirst.mockResolvedValue(null);
    mockPrisma.match.findMany.mockResolvedValue([
      { ...doublesMatch },
      mockMatch({ id: 'match-2', pair1Id: null, pair2Id: null })
    ]);
    mockPrisma.match.update.mockResolvedValue({ id: 'match-1', pair1Id: null });

    const result = await assignPosition('tour-1', {
      matchId: 'match-1',
      slot: 'player1',
      playerId: null,
      pairId: null
    });

    expect(mockPrisma.match.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'match-1' },
        data: { pair1Id: null }
      })
    );
    expect(result).toMatchObject({
      action: 'cleared',
      entityId: null
    });
  });

  it('returns cleared with entityId null when slot is already empty (no-op clear)', async () => {
    mockPrisma.tournament.findUnique.mockResolvedValue(mockTournament());
    // match-1 is already empty
    mockPrisma.match.findUnique.mockResolvedValue(mockMatch({ player1Id: null }));
    mockPrisma.tournamentRegistration.findFirst.mockResolvedValue(null);
    mockPrisma.pairRegistration.findFirst.mockResolvedValue(null);
    mockPrisma.match.findMany.mockResolvedValue([mockMatch()]);
    mockPrisma.match.update.mockResolvedValue({ id: 'match-1' });

    const result = await assignPosition('tour-1', {
      matchId: 'match-1',
      slot: 'player1',
      playerId: null,
      pairId: null
    });

    // Slot was already empty, just returns cleared without touching DB
    expect(result).toMatchObject({ action: 'cleared', entityId: null });
    expect(mockPrisma.match.update).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// DRAW-05: Clear then reassign (verify uniqueness guard is lifted after clear)
// ===========================================================================
describe('DRAW-05: Clear then reassign — no ALREADY_PLACED after clear', () => {
  it('successfully assigns player to a new slot after the old slot has been cleared', async () => {
    // Simulate state after clear: player-A is not in any match
    mockPrisma.tournament.findUnique.mockResolvedValue(mockTournament());
    mockPrisma.match.findUnique.mockResolvedValue(mockMatch());
    mockPrisma.tournamentRegistration.findFirst.mockResolvedValue(mockRegistration());
    mockPrisma.pairRegistration.findFirst.mockResolvedValue(null);
    // All matches are empty — player-A was previously cleared
    mockPrisma.match.findMany.mockResolvedValue([
      mockMatch({ id: 'match-1', player1Id: null, player2Id: null }),
      mockMatch({ id: 'match-2', player1Id: null, player2Id: null })
    ]);
    mockPrisma.match.update.mockResolvedValue({ id: 'match-2', player2Id: 'player-A' });

    // Assign player-A to match-2 slot player2 — should succeed, no ALREADY_PLACED
    const result = await assignPosition('tour-1', {
      matchId: 'match-1',
      slot: 'player2',
      playerId: 'player-A',
      pairId: null
    });

    expect(result).toMatchObject({ action: 'assigned', entityId: 'player-A' });
    expect(mockPrisma.match.update).toHaveBeenCalled();
  });
});

// ===========================================================================
// Guard conditions
// ===========================================================================
describe('assignPosition() — guard conditions', () => {
  it('throws TOURNAMENT_NOT_FOUND if tournament does not exist', async () => {
    mockPrisma.tournament.findUnique.mockResolvedValue(null);

    await expect(
      assignPosition('nonexistent', {
        matchId: 'match-1',
        slot: 'player1',
        playerId: 'player-A',
        pairId: null
      })
    ).rejects.toMatchObject({ code: 'TOURNAMENT_NOT_FOUND' });
  });

  it('throws BRACKET_LOCKED if tournament status is IN_PROGRESS', async () => {
    mockPrisma.tournament.findUnique.mockResolvedValue(
      mockTournament({ status: 'IN_PROGRESS' })
    );

    await expect(
      assignPosition('tour-1', {
        matchId: 'match-1',
        slot: 'player1',
        playerId: 'player-A',
        pairId: null
      })
    ).rejects.toMatchObject({ code: 'BRACKET_LOCKED' });
  });

  it('throws MATCH_NOT_FOUND if match does not exist in this tournament', async () => {
    mockPrisma.tournament.findUnique.mockResolvedValue(mockTournament());
    mockPrisma.match.findUnique.mockResolvedValue(null);

    await expect(
      assignPosition('tour-1', {
        matchId: 'nonexistent-match',
        slot: 'player1',
        playerId: 'player-A',
        pairId: null
      })
    ).rejects.toMatchObject({ code: 'MATCH_NOT_FOUND' });
  });

  it('throws NOT_ROUND_1 if match is in Round 2 or later', async () => {
    mockPrisma.tournament.findUnique.mockResolvedValue(mockTournament());
    mockPrisma.match.findUnique.mockResolvedValue(
      mockMatch({ round: { roundNumber: 2, bracketId: 'bracket-1' } })
    );

    await expect(
      assignPosition('tour-1', {
        matchId: 'match-1',
        slot: 'player1',
        playerId: 'player-A',
        pairId: null
      })
    ).rejects.toMatchObject({ code: 'NOT_ROUND_1' });
  });

  it('throws NOT_REGISTERED if player is not registered for the tournament', async () => {
    mockPrisma.tournament.findUnique.mockResolvedValue(mockTournament());
    mockPrisma.match.findUnique.mockResolvedValue(mockMatch());
    // No registration found
    mockPrisma.tournamentRegistration.findFirst.mockResolvedValue(null);
    mockPrisma.pairRegistration.findFirst.mockResolvedValue(null);

    await expect(
      assignPosition('tour-1', {
        matchId: 'match-1',
        slot: 'player1',
        playerId: 'unregistered-player',
        pairId: null
      })
    ).rejects.toMatchObject({ code: 'NOT_REGISTERED' });
  });
});
