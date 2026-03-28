/**
 * Unit Tests: Group Point Calculation Service Functions
 *
 * Tests the following functions in pointCalculationService.js:
 *   - deriveGroupResults(tournamentId)
 *   - computeTierOffsets(largestGroupSize, pointConfig, secondaryBracketSize)
 *   - awardGroupPointsSingles(tournamentId, groupResults, pointConfig, offset)
 *   - awardGroupPointsDoubles(tournamentId, groupResults, pointConfig, offset)
 *   - deriveKnockoutResults(tournamentId, bracketId, isDoubles)
 *
 * Feature: 31-points-integration-and-group-only-format, Plan 01
 * Requirements: PTS-01, PTS-02, PTS-04
 *
 * Strategy: Mock prisma and groupStandingsService at the ES module level
 * using jest.unstable_mockModule() to avoid needing a live database.
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

// ---- Mock groupStandingsService BEFORE imports ----
const mockGetGroupStandings = jest.fn();
jest.unstable_mockModule('../../src/services/groupStandingsService.js', () => ({
  getGroupStandings: mockGetGroupStandings,
  computeGroupStandings: jest.fn(),
  buildEntityStats: jest.fn(),
  detectH2HCycle: jest.fn(),
  sortWithTiebreakers: jest.fn()
}));

// ---- Mock prisma ----
const mockGroupFindMany = jest.fn();
const mockTournamentFindUnique = jest.fn();
const mockMatchFindMany = jest.fn();
const mockRankingUpsert = jest.fn();
const mockRankingEntryUpsert = jest.fn();
const mockTournamentResultCreate = jest.fn();
const mockRankingEntryFindUnique = jest.fn();
const mockRankingEntryUpdate = jest.fn();
const mockRankingEntryFindMany = jest.fn();
const mockDoublesPairFindUnique = jest.fn();

jest.unstable_mockModule('../../src/lib/prisma.js', () => ({
  default: {
    group: { findMany: mockGroupFindMany },
    tournament: { findUnique: mockTournamentFindUnique },
    match: { findMany: mockMatchFindMany },
    ranking: { upsert: mockRankingUpsert },
    rankingEntry: {
      upsert: mockRankingEntryUpsert,
      findUnique: mockRankingEntryFindUnique,
      update: mockRankingEntryUpdate,
      findMany: mockRankingEntryFindMany
    },
    tournamentResult: { create: mockTournamentResultCreate },
    doublesPair: { findUnique: mockDoublesPairFindUnique }
  }
}));

// ---- Mock pointTableService (required by pointCalculationService imports) ----
jest.unstable_mockModule('../../src/services/pointTableService.js', () => ({
  getPointsForRound: jest.fn().mockReturnValue(0)
}));

// ---- Dynamic imports AFTER mock registration ----
let deriveGroupResults;
let computeTierOffsets;
let awardGroupPointsSingles;
let awardGroupPointsDoubles;
let deriveKnockoutResults;
let calculatePlacementPoints;

beforeAll(async () => {
  const svc = await import('../../src/services/pointCalculationService.js');
  deriveGroupResults = svc.deriveGroupResults;
  computeTierOffsets = svc.computeTierOffsets;
  awardGroupPointsSingles = svc.awardGroupPointsSingles;
  awardGroupPointsDoubles = svc.awardGroupPointsDoubles;
  deriveKnockoutResults = svc.deriveKnockoutResults;
  calculatePlacementPoints = svc.calculatePlacementPoints;
});

beforeEach(() => {
  mockGetGroupStandings.mockReset();
  mockGroupFindMany.mockReset();
  mockTournamentFindUnique.mockReset();
  mockMatchFindMany.mockReset();
  mockRankingUpsert.mockReset();
  mockRankingEntryUpsert.mockReset();
  mockTournamentResultCreate.mockReset();
  mockRankingEntryFindUnique.mockReset();
  mockRankingEntryUpdate.mockReset();
  mockRankingEntryFindMany.mockReset();
  mockDoublesPairFindUnique.mockReset();
});

// ---- Test constants ----
const TOURNAMENT_ID = 'tourn-111';
const BRACKET_ID = 'bracket-222';
const GROUP_A_ID = 'group-aaa';
const GROUP_B_ID = 'group-bbb';
const CATEGORY_ID = 'cat-111';

const PLAYER_1 = 'player-001';
const PLAYER_2 = 'player-002';
const PLAYER_3 = 'player-003';
const PLAYER_4 = 'player-004';
const PLAYER_5 = 'player-005';
const PLAYER_6 = 'player-006';
const PLAYER_7 = 'player-007';

const PAIR_1 = 'pair-001';
const PAIR_2 = 'pair-002';
const PAIR_3 = 'pair-003';
const PAIR_4 = 'pair-004';

// ============================================================
// computeTierOffsets
// ============================================================

describe('computeTierOffsets', () => {
  it('computes secondaryOffset = maxGroupPoints + 1 for 4-player group, multiplicativeValue=2', () => {
    // maxGroupPoints = calculatePlacementPoints(4, 1, 2, false) = (4-1+1)*2 = 8
    // secondaryOffset = 8 + 1 = 9
    const result = computeTierOffsets(4, { multiplicativeValue: 2, doublePointsEnabled: false }, 4);
    expect(result.secondaryOffset).toBe(9);
  });

  it('computes mainOffset correctly for 4-player groups and 4-player secondary bracket', () => {
    // maxGroupPoints = 8
    // secondaryOffset = 9
    // maxSecondaryPoints = calculatePlacementPoints(4, 1, 2, false) + secondaryOffset = 8 + 9 = 17
    // mainOffset = 17 + 1 = 18
    const result = computeTierOffsets(4, { multiplicativeValue: 2, doublePointsEnabled: false }, 4);
    expect(result.mainOffset).toBe(18);
  });

  it('returns secondaryOffset = maxGroupPoints + 1 for 3-player group', () => {
    // maxGroupPoints = calculatePlacementPoints(3, 1, 2, false) = (3-1+1)*2 = 6
    // secondaryOffset = 7
    const result = computeTierOffsets(3, { multiplicativeValue: 2, doublePointsEnabled: false }, 4);
    expect(result.secondaryOffset).toBe(7);
  });

  it('doubles offsets when doublePointsEnabled = true', () => {
    // Without double: maxGroupPoints = (4-1+1)*2 = 8, secondaryOffset = 9
    // With double: maxGroupPoints = (4-1+1)*2*2 = 16, secondaryOffset = 17
    const normal = computeTierOffsets(4, { multiplicativeValue: 2, doublePointsEnabled: false }, 4);
    const doubled = computeTierOffsets(4, { multiplicativeValue: 2, doublePointsEnabled: true }, 4);
    // doublePoints doubles maxGroupPoints: normal=8, doubled=16
    // doubled.secondaryOffset = 16 + 1 = 17; normal.secondaryOffset = 8 + 1 = 9
    expect(doubled.secondaryOffset).toBe(16 + 1); // maxGroupPoints*2 + 1 = 17
    expect(doubled.secondaryOffset).toBeGreaterThan(normal.secondaryOffset);
    expect(doubled.mainOffset).toBeGreaterThan(normal.mainOffset);
  });

  it('handles secondaryBracketSize=0 (no secondary bracket) gracefully', () => {
    // maxGroupPoints = 8, secondaryOffset = 9
    // No secondary: mainOffset = secondaryOffset + 1
    const result = computeTierOffsets(4, { multiplicativeValue: 2, doublePointsEnabled: false }, 0);
    expect(result.secondaryOffset).toBe(9);
    expect(result.mainOffset).toBeGreaterThan(result.secondaryOffset);
  });

  it('uses default multiplicativeValue=2 when not provided', () => {
    const result = computeTierOffsets(4, {}, 4);
    expect(result.secondaryOffset).toBe(9);
  });

  it('guarantees mainOffset > secondaryOffset > 0', () => {
    const result = computeTierOffsets(5, { multiplicativeValue: 3, doublePointsEnabled: false }, 6);
    expect(result.mainOffset).toBeGreaterThan(result.secondaryOffset);
    expect(result.secondaryOffset).toBeGreaterThan(0);
  });
});

// ============================================================
// deriveGroupResults
// ============================================================

describe('deriveGroupResults', () => {
  it('returns grouped results for a singles GROUP tournament', async () => {
    mockGroupFindMany.mockResolvedValue([
      { id: GROUP_A_ID, groupSize: 4 },
      { id: GROUP_B_ID, groupSize: 3 }
    ]);
    mockTournamentFindUnique.mockResolvedValue({
      id: TOURNAMENT_ID,
      category: { type: 'SINGLES' }
    });
    mockGetGroupStandings
      .mockResolvedValueOnce({
        standings: [
          { entity: { id: PLAYER_1 }, position: 1, tiedRange: null },
          { entity: { id: PLAYER_2 }, position: 2, tiedRange: null },
          { entity: { id: PLAYER_3 }, position: 3, tiedRange: null },
          { entity: { id: PLAYER_4 }, position: 4, tiedRange: null }
        ],
        unresolvedTies: []
      })
      .mockResolvedValueOnce({
        standings: [
          { entity: { id: PLAYER_5 }, position: 1, tiedRange: null },
          { entity: { id: PLAYER_6 }, position: 2, tiedRange: null },
          { entity: { id: PLAYER_7 }, position: 3, tiedRange: null }
        ],
        unresolvedTies: []
      });

    const result = await deriveGroupResults(TOURNAMENT_ID);

    expect(result).toHaveLength(2);
    expect(result[0].groupId).toBe(GROUP_A_ID);
    expect(result[0].groupSize).toBe(4);
    expect(result[0].results).toHaveLength(4);
    expect(result[0].results[0]).toEqual({ playerId: PLAYER_1, placement: 1 });
    expect(result[0].results[3]).toEqual({ playerId: PLAYER_4, placement: 4 });

    expect(result[1].groupId).toBe(GROUP_B_ID);
    expect(result[1].groupSize).toBe(3);
    expect(result[1].results).toHaveLength(3);
    expect(result[1].results[0]).toEqual({ playerId: PLAYER_5, placement: 1 });
  });

  it('returns pairId-based results for a doubles GROUP tournament', async () => {
    mockGroupFindMany.mockResolvedValue([
      { id: GROUP_A_ID, groupSize: 4 }
    ]);
    mockTournamentFindUnique.mockResolvedValue({
      id: TOURNAMENT_ID,
      category: { type: 'DOUBLES' }
    });
    mockGetGroupStandings.mockResolvedValueOnce({
      standings: [
        { entity: { id: PAIR_1 }, position: 1, tiedRange: null },
        { entity: { id: PAIR_2 }, position: 2, tiedRange: null },
        { entity: { id: PAIR_3 }, position: 3, tiedRange: null },
        { entity: { id: PAIR_4 }, position: 4, tiedRange: null }
      ],
      unresolvedTies: []
    });

    const result = await deriveGroupResults(TOURNAMENT_ID);

    expect(result[0].results[0]).toEqual({ pairId: PAIR_1, placement: 1 });
    expect(result[0].results[1]).toEqual({ pairId: PAIR_2, placement: 2 });
    expect(result[0].results).not.toHaveProperty('playerId');
  });

  it('throws UNRESOLVED_TIES error when any group has unresolved ties', async () => {
    mockGroupFindMany.mockResolvedValue([
      { id: GROUP_A_ID, groupSize: 4 },
      { id: GROUP_B_ID, groupSize: 4 }
    ]);
    mockTournamentFindUnique.mockResolvedValue({
      id: TOURNAMENT_ID,
      category: { type: 'SINGLES' }
    });
    // Group A is clean
    mockGetGroupStandings
      .mockResolvedValueOnce({
        standings: [
          { entity: { id: PLAYER_1 }, position: 1, tiedRange: null },
          { entity: { id: PLAYER_2 }, position: 2, tiedRange: null },
          { entity: { id: PLAYER_3 }, position: 3, tiedRange: null },
          { entity: { id: PLAYER_4 }, position: 4, tiedRange: null }
        ],
        unresolvedTies: []
      })
      // Group B has ties
      .mockResolvedValueOnce({
        standings: [
          { entity: { id: PLAYER_5 }, position: 1, tiedRange: null },
          { entity: { id: PLAYER_6 }, position: 2, tiedRange: [2, 3] },
          { entity: { id: PLAYER_7 }, position: 2, tiedRange: [2, 3] }
        ],
        unresolvedTies: [{ groupId: GROUP_B_ID, positions: [2, 3] }]
      });

    await expect(deriveGroupResults(TOURNAMENT_ID)).rejects.toMatchObject({
      code: 'UNRESOLVED_TIES'
    });
  });

  it('throws UNRESOLVED_TIES with details including the affected groups', async () => {
    mockGroupFindMany.mockResolvedValue([
      { id: GROUP_A_ID, groupSize: 3 }
    ]);
    mockTournamentFindUnique.mockResolvedValue({
      id: TOURNAMENT_ID,
      category: { type: 'SINGLES' }
    });
    mockGetGroupStandings.mockResolvedValueOnce({
      standings: [
        { entity: { id: PLAYER_1 }, position: 1, tiedRange: [1, 2] },
        { entity: { id: PLAYER_2 }, position: 1, tiedRange: [1, 2] },
        { entity: { id: PLAYER_3 }, position: 3, tiedRange: null }
      ],
      unresolvedTies: [{ groupId: GROUP_A_ID, positions: [1, 2] }]
    });

    try {
      await deriveGroupResults(TOURNAMENT_ID);
      expect(true).toBe(false); // Should not reach here
    } catch (err) {
      expect(err.code).toBe('UNRESOLVED_TIES');
      expect(err.details).toBeDefined();
      expect(err.details.groups).toBeDefined();
    }
  });
});

// ============================================================
// awardGroupPointsSingles
// ============================================================

describe('awardGroupPointsSingles', () => {
  const pointConfig = { calculationMethod: 'PLACEMENT', multiplicativeValue: 2, doublePointsEnabled: false };
  const RANKING_ID = 'ranking-001';
  const RANKING_ENTRY_ID = 'rentry-001';

  const groupResults = [
    {
      groupId: GROUP_A_ID,
      groupSize: 4,
      results: [
        { playerId: PLAYER_1, placement: 1 }, // (4-1+1)*2 = 8 points
        { playerId: PLAYER_2, placement: 2 }, // (4-2+1)*2 = 6 points
        { playerId: PLAYER_3, placement: 3 }, // (4-3+1)*2 = 4 points
        { playerId: PLAYER_4, placement: 4 }  // (4-4+1)*2 = 2 points
      ]
    }
  ];

  beforeEach(() => {
    mockTournamentFindUnique.mockResolvedValue({
      id: TOURNAMENT_ID,
      categoryId: CATEGORY_ID,
      category: { type: 'SINGLES' }
    });
    mockRankingUpsert.mockResolvedValue({ id: RANKING_ID });
    mockRankingEntryUpsert.mockResolvedValue({ id: RANKING_ENTRY_ID });
    mockTournamentResultCreate.mockResolvedValue({ id: 'result-001', pointsAwarded: 8 });
    mockRankingEntryFindUnique.mockResolvedValue({
      id: RANKING_ENTRY_ID,
      tournamentResults: [{ pointsAwarded: 8, awardDate: new Date() }],
      ranking: { category: { countedTournamentsLimit: 7 } }
    });
    mockRankingEntryUpdate.mockResolvedValue({});
    mockRankingEntryFindMany.mockResolvedValue([
      { id: RANKING_ENTRY_ID, totalPoints: 8 }
    ]);
  });

  it('uses group.groupSize (4) not total registrations as participantCount', async () => {
    await awardGroupPointsSingles(TOURNAMENT_ID, groupResults, pointConfig, 0);

    // Check that tournamentResult was created with correct points for 1st place in 4-player group
    // (4-1+1)*2 = 8
    const firstCall = mockTournamentResultCreate.mock.calls[0][0].data;
    expect(firstCall.pointsAwarded).toBe(8);
    expect(firstCall.placement).toBe(1);
    expect(firstCall.playerId).toBe(PLAYER_1);
  });

  it('1st in 4-player group earns 8 points (not more based on total participants)', async () => {
    await awardGroupPointsSingles(TOURNAMENT_ID, groupResults, pointConfig, 0);
    const firstCall = mockTournamentResultCreate.mock.calls[0][0].data;
    expect(firstCall.pointsAwarded).toBe(8);
  });

  it('adds offset to calculated points when offset > 0', async () => {
    const offset = 10;
    await awardGroupPointsSingles(TOURNAMENT_ID, groupResults, pointConfig, offset);

    // 1st place in 4-player group = 8 + offset(10) = 18
    const firstCall = mockTournamentResultCreate.mock.calls[0][0].data;
    expect(firstCall.pointsAwarded).toBe(18);
  });

  it('creates one TournamentResult per player', async () => {
    await awardGroupPointsSingles(TOURNAMENT_ID, groupResults, pointConfig, 0);
    expect(mockTournamentResultCreate).toHaveBeenCalledTimes(4);
  });

  it('uneven group: 1st in 3-player group gets (3-1+1)*2=6 points', async () => {
    const threePlayerGroup = [{
      groupId: GROUP_B_ID,
      groupSize: 3,
      results: [
        { playerId: PLAYER_1, placement: 1 },
        { playerId: PLAYER_2, placement: 2 },
        { playerId: PLAYER_3, placement: 3 }
      ]
    }];

    await awardGroupPointsSingles(TOURNAMENT_ID, threePlayerGroup, pointConfig, 0);
    const firstCall = mockTournamentResultCreate.mock.calls[0][0].data;
    expect(firstCall.pointsAwarded).toBe(6);
  });
});

// ============================================================
// awardGroupPointsDoubles
// ============================================================

describe('awardGroupPointsDoubles', () => {
  const pointConfig = { calculationMethod: 'PLACEMENT', multiplicativeValue: 2, doublePointsEnabled: false };
  const RANKING_ID = 'ranking-pairs';
  const RANKING_ENTRY_ID = 'rentry-pairs';

  const groupResults = [
    {
      groupId: GROUP_A_ID,
      groupSize: 4,
      results: [
        { pairId: PAIR_1, placement: 1 },
        { pairId: PAIR_2, placement: 2 }
      ]
    }
  ];

  beforeEach(() => {
    mockTournamentFindUnique.mockResolvedValue({
      id: TOURNAMENT_ID,
      categoryId: CATEGORY_ID,
      category: { type: 'DOUBLES', gender: 'MIXED' }
    });
    mockRankingUpsert.mockResolvedValue({ id: RANKING_ID });
    mockRankingEntryUpsert.mockResolvedValue({ id: RANKING_ENTRY_ID });
    mockTournamentResultCreate.mockResolvedValue({ id: 'result-001', pointsAwarded: 8 });
    mockRankingEntryFindUnique.mockResolvedValue({
      id: RANKING_ENTRY_ID,
      tournamentResults: [{ pointsAwarded: 8, awardDate: new Date() }],
      ranking: { category: { countedTournamentsLimit: 7 } }
    });
    mockRankingEntryUpdate.mockResolvedValue({});
    mockRankingEntryFindMany.mockResolvedValue([
      { id: RANKING_ENTRY_ID, totalPoints: 8 }
    ]);
    mockDoublesPairFindUnique.mockResolvedValue({
      id: PAIR_1,
      player1Id: 'p1-id',
      player2Id: 'p2-id',
      player1: { gender: 'MEN' },
      player2: { gender: 'WOMEN' }
    });
  });

  it('creates TournamentResult records for pairs using group.groupSize', async () => {
    await awardGroupPointsDoubles(TOURNAMENT_ID, groupResults, pointConfig, 0);

    // Should have called tournamentResult.create at least once (for the pair)
    expect(mockTournamentResultCreate).toHaveBeenCalled();
    const pairCall = mockTournamentResultCreate.mock.calls.find(
      c => c[0].data.pairId === PAIR_1
    );
    expect(pairCall).toBeDefined();
    expect(pairCall[0].data.pointsAwarded).toBe(8); // (4-1+1)*2 = 8
  });

  it('adds offset to pair points', async () => {
    const offset = 5;
    await awardGroupPointsDoubles(TOURNAMENT_ID, groupResults, pointConfig, offset);

    const pairCall = mockTournamentResultCreate.mock.calls.find(
      c => c[0].data.pairId === PAIR_1
    );
    expect(pairCall[0].data.pointsAwarded).toBe(13); // 8 + 5
  });
});

// ============================================================
// deriveKnockoutResults
// ============================================================

describe('deriveKnockoutResults', () => {
  const PLAYER_W = 'player-winner';
  const PLAYER_F = 'player-finalist';
  const PLAYER_SF1 = 'player-semi1';
  const PLAYER_SF2 = 'player-semi2';

  function makeMatch(roundNumber, p1Id, p2Id, winner) {
    return {
      roundNumber,
      player1Id: p1Id,
      player2Id: p2Id,
      pair1Id: null,
      pair2Id: null,
      winnerId: winner === 'PLAYER1' ? p1Id : p2Id,
      winnerPairId: null,
      result: JSON.stringify({ winner }),
      status: 'COMPLETED',
      isBye: false
    };
  }

  it('derives placements from a 4-player bracket (2 rounds)', async () => {
    // Round 2 = FINAL: PLAYER_W beats PLAYER_F → W=1st, F=2nd
    // Round 1 = SEMIFINAL: 2 matches → losers = 3rd place
    // Ordered descending by roundNumber (as the service queries orderBy: roundNumber desc)
    const matches = [
      makeMatch(2, PLAYER_W, PLAYER_F, 'PLAYER1'),        // PLAYER_W wins final
      makeMatch(1, PLAYER_SF1, PLAYER_W, 'PLAYER2'),   // PLAYER_W wins semi
      makeMatch(1, PLAYER_SF2, PLAYER_F, 'PLAYER2')    // PLAYER_F wins semi
    ];

    mockMatchFindMany.mockResolvedValue(matches);
    mockTournamentFindUnique.mockResolvedValue({
      id: TOURNAMENT_ID,
      category: { type: 'SINGLES' }
    });

    const results = await deriveKnockoutResults(TOURNAMENT_ID, BRACKET_ID, false);

    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);

    const winnerResult = results.find(r => r.playerId === PLAYER_W);
    const finalistResult = results.find(r => r.playerId === PLAYER_F);
    const semi1Result = results.find(r => r.playerId === PLAYER_SF1);
    const semi2Result = results.find(r => r.playerId === PLAYER_SF2);

    expect(winnerResult?.placement).toBe(1);
    expect(finalistResult?.placement).toBe(2);
    // Semifinal losers both get placement 3
    expect(semi1Result?.placement).toBe(3);
    expect(semi2Result?.placement).toBe(3);
  });

  it('returns pairId-based results for doubles brackets', async () => {
    const pairMatches = [
      {
        roundNumber: 1,
        player1Id: null,
        player2Id: null,
        pair1Id: 'pair-loser',
        pair2Id: 'pair-winner',
        winnerId: null,
        winnerPairId: 'pair-winner',
        result: JSON.stringify({ winner: 'PLAYER2' }),
        status: 'COMPLETED',
        isBye: false
      }
    ];

    mockMatchFindMany.mockResolvedValue(pairMatches);
    mockTournamentFindUnique.mockResolvedValue({
      id: TOURNAMENT_ID,
      category: { type: 'DOUBLES' }
    });

    const results = await deriveKnockoutResults(TOURNAMENT_ID, BRACKET_ID, true);

    expect(results).toBeDefined();
    const winnerResult = results.find(r => r.pairId === 'pair-winner');
    expect(winnerResult).toBeDefined();
    expect(winnerResult.placement).toBe(1);
  });

  it('returns empty array when no completed matches', async () => {
    mockMatchFindMany.mockResolvedValue([]);
    mockTournamentFindUnique.mockResolvedValue({
      id: TOURNAMENT_ID,
      category: { type: 'SINGLES' }
    });

    const results = await deriveKnockoutResults(TOURNAMENT_ID, BRACKET_ID, false);
    expect(results).toEqual([]);
  });

  it('uses playerId field (not pairId) for singles brackets', async () => {
    const singleMatch = [makeMatch(1, PLAYER_1, PLAYER_2, 'PLAYER1')];
    mockMatchFindMany.mockResolvedValue(singleMatch);
    mockTournamentFindUnique.mockResolvedValue({
      id: TOURNAMENT_ID,
      category: { type: 'SINGLES' }
    });

    const results = await deriveKnockoutResults(TOURNAMENT_ID, BRACKET_ID, false);
    for (const r of results) {
      expect(r).toHaveProperty('playerId');
      expect(r).not.toHaveProperty('pairId');
    }
  });
});
