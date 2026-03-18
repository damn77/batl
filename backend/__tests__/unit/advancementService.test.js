/**
 * Unit tests for advancementService.js
 * Tests the pure algorithm functions: crossGroupRank and computeWaterfall
 *
 * Requirements: COMB-03, COMB-04, COMB-05, COMB-09
 */

import { computeWaterfall, crossGroupRank } from '../../src/services/advancementService.js';

// ─────────────────────────────────────────────────────────────────────────────
// Test data helpers
// ─────────────────────────────────────────────────────────────────────────────

function makePlayer(id, name, wins, setDiff = 0, gameDiff = 0, totalGames = 0) {
  return {
    entity: { id, name },
    groupId: 'group-1',
    groupNumber: 1,
    position: 1,
    wins,
    setDiff,
    gameDiff,
    totalGames
  };
}

function makeGroupStandings(groupNumber, entries) {
  return {
    groupId: `group-${groupNumber}`,
    groupNumber,
    standings: entries.map((e, idx) => ({
      entity: e.entity,
      position: idx + 1,
      wins: e.wins,
      setDiff: e.setDiff,
      gameDiff: e.gameDiff,
      totalGames: e.totalGames
    }))
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// crossGroupRank tests
// ─────────────────────────────────────────────────────────────────────────────

describe('crossGroupRank', () => {
  it('sorts by wins descending (level 1)', () => {
    const players = [
      makePlayer('p1', 'Alice', 1, 0, 0, 4),
      makePlayer('p2', 'Bob', 3, 0, 0, 4),
      makePlayer('p3', 'Charlie', 2, 0, 0, 4)
    ];
    const ranked = crossGroupRank(players);
    expect(ranked[0].entity.id).toBe('p2'); // 3 wins
    expect(ranked[1].entity.id).toBe('p3'); // 2 wins
    expect(ranked[2].entity.id).toBe('p1'); // 1 win
  });

  it('breaks wins tie by setDiff descending (level 2)', () => {
    const players = [
      makePlayer('p1', 'Alice', 2, 1, 0, 4),
      makePlayer('p2', 'Bob', 2, 3, 0, 4),
      makePlayer('p3', 'Charlie', 2, 2, 0, 4)
    ];
    const ranked = crossGroupRank(players);
    expect(ranked[0].entity.id).toBe('p2'); // setDiff 3
    expect(ranked[1].entity.id).toBe('p3'); // setDiff 2
    expect(ranked[2].entity.id).toBe('p1'); // setDiff 1
  });

  it('breaks wins+setDiff tie by gameDiff descending (level 3)', () => {
    const players = [
      makePlayer('p1', 'Alice', 2, 1, 3, 10),
      makePlayer('p2', 'Bob', 2, 1, 5, 10),
      makePlayer('p3', 'Charlie', 2, 1, 4, 10)
    ];
    const ranked = crossGroupRank(players);
    expect(ranked[0].entity.id).toBe('p2'); // gameDiff 5
    expect(ranked[1].entity.id).toBe('p3'); // gameDiff 4
    expect(ranked[2].entity.id).toBe('p1'); // gameDiff 3
  });

  it('breaks wins+setDiff+gameDiff tie by totalGames ascending (level 4, fewer = better)', () => {
    const players = [
      makePlayer('p1', 'Alice', 2, 1, 2, 12),
      makePlayer('p2', 'Bob', 2, 1, 2, 8),
      makePlayer('p3', 'Charlie', 2, 1, 2, 10)
    ];
    const ranked = crossGroupRank(players);
    expect(ranked[0].entity.id).toBe('p2'); // totalGames 8 (fewest)
    expect(ranked[1].entity.id).toBe('p3'); // totalGames 10
    expect(ranked[2].entity.id).toBe('p1'); // totalGames 12
  });

  it('breaks all-stats tie by alphabetical name (level 5)', () => {
    const players = [
      makePlayer('p1', 'Charlie', 2, 1, 2, 8),
      makePlayer('p2', 'Alice', 2, 1, 2, 8),
      makePlayer('p3', 'Bob', 2, 1, 2, 8)
    ];
    const ranked = crossGroupRank(players);
    expect(ranked[0].entity.name).toBe('Alice');
    expect(ranked[1].entity.name).toBe('Bob');
    expect(ranked[2].entity.name).toBe('Charlie');
  });

  it('does not mutate the input array', () => {
    const players = [
      makePlayer('p1', 'Alice', 2),
      makePlayer('p2', 'Bob', 3)
    ];
    const copy = [...players];
    crossGroupRank(players);
    expect(players[0].entity.id).toBe(copy[0].entity.id);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeWaterfall tests
// ─────────────────────────────────────────────────────────────────────────────

describe('computeWaterfall', () => {
  // 3 groups of 4: the canonical CONTEXT.md example
  // mainN=6, secondaryM=4
  it('CONTEXT.md example: 3 groups, mainN=6, secondaryM=4', () => {
    const g1 = makeGroupStandings(1, [
      makePlayer('g1p1', 'A1', 3, 5, 10, 20),
      makePlayer('g1p2', 'A2', 2, 2, 4, 18),
      makePlayer('g1p3', 'A3', 1, -2, -3, 18),
      makePlayer('g1p4', 'A4', 0, -5, -11, 20)
    ]);
    const g2 = makeGroupStandings(2, [
      makePlayer('g2p1', 'B1', 3, 4, 9, 22),
      makePlayer('g2p2', 'B2', 2, 1, 3, 20),
      makePlayer('g2p3', 'B3', 1, -1, -2, 20),
      makePlayer('g2p4', 'B4', 0, -4, -10, 22)
    ]);
    const g3 = makeGroupStandings(3, [
      makePlayer('g3p1', 'C1', 3, 3, 8, 21),
      makePlayer('g3p2', 'C2', 2, 2, 5, 19),
      makePlayer('g3p3', 'C3', 1, -3, -5, 19),
      makePlayer('g3p4', 'C4', 0, -3, -12, 21)
    ]);

    const result = computeWaterfall([g1, g2, g3], 6, 4);

    expect(result.mainSlots).toHaveLength(6);
    expect(result.secondarySlots).toHaveLength(4);
    // Total advancing = 6 + 4 = 10; eliminated = 2 (some 4th-place players)
    expect(result.eliminated.length).toBeGreaterThan(0);

    // All 1st-place players go to main bracket (3 players, 3 < 6)
    const mainIds = result.mainSlots.map(s => s.entity.id);
    expect(mainIds).toContain('g1p1');
    expect(mainIds).toContain('g2p1');
    expect(mainIds).toContain('g3p1');

    // All 3 second-place go to main (fills remaining 3 slots)
    expect(mainIds).toContain('g1p2');
    expect(mainIds).toContain('g2p2');
    expect(mainIds).toContain('g3p2');
  });

  it('1st-place players not marked as spillover when all fit', () => {
    const g1 = makeGroupStandings(1, [makePlayer('g1p1', 'A1', 3), makePlayer('g1p2', 'A2', 0)]);
    const g2 = makeGroupStandings(2, [makePlayer('g2p1', 'B1', 3), makePlayer('g2p2', 'B2', 0)]);

    const result = computeWaterfall([g1, g2], 4, 0);

    const firstPlaceInMain = result.mainSlots.filter(s =>
      s.entity.id === 'g1p1' || s.entity.id === 'g2p1'
    );
    expect(firstPlaceInMain).toHaveLength(2);
    expect(firstPlaceInMain.every(s => s.isSpillover === false)).toBe(true);
  });

  it('spillover players are marked isSpillover=true', () => {
    // 3 groups, 1 slot available for position=1 → 2 players compete for 1 slot
    // One goes to main (spillover), others eliminated or go secondary
    const g1 = makeGroupStandings(1, [
      makePlayer('g1p1', 'Alice', 3, 5, 10, 8)
    ]);
    const g2 = makeGroupStandings(2, [
      makePlayer('g2p1', 'Bob', 3, 2, 4, 8)
    ]);
    const g3 = makeGroupStandings(3, [
      makePlayer('g3p1', 'Charlie', 3, 1, 2, 8)
    ]);

    const result = computeWaterfall([g1, g2, g3], 1, 2);

    expect(result.mainSlots).toHaveLength(1);
    expect(result.secondarySlots).toHaveLength(2);

    // Main slot player (best wins/setDiff) should be spillover=true (partial bucket)
    expect(result.mainSlots[0].isSpillover).toBe(true);
    // Secondary slot players also spillover
    expect(result.secondarySlots.every(s => s.isSpillover === true)).toBe(true);
  });

  it('main fills before secondary starts', () => {
    // 2 groups of 2: 2 first-place, 2 second-place
    // mainN=3, secondaryM=1
    const g1 = makeGroupStandings(1, [
      makePlayer('g1p1', 'A1', 2),
      makePlayer('g1p2', 'A2', 0)
    ]);
    const g2 = makeGroupStandings(2, [
      makePlayer('g2p1', 'B1', 2),
      makePlayer('g2p2', 'B2', 0)
    ]);

    const result = computeWaterfall([g1, g2], 3, 1);

    // Main should have 3 (both 1st-place + 1 second-place)
    expect(result.mainSlots).toHaveLength(3);
    expect(result.secondarySlots).toHaveLength(1);
  });

  it('all players fit main bracket (no secondary, no eliminated)', () => {
    const g1 = makeGroupStandings(1, [
      makePlayer('g1p1', 'A1', 2),
      makePlayer('g1p2', 'A2', 0)
    ]);
    const g2 = makeGroupStandings(2, [
      makePlayer('g2p1', 'B1', 2),
      makePlayer('g2p2', 'B2', 0)
    ]);

    const result = computeWaterfall([g1, g2], 4, 0);

    expect(result.mainSlots).toHaveLength(4);
    expect(result.secondarySlots).toHaveLength(0);
    expect(result.eliminated).toHaveLength(0);
  });

  it('secondary=0 means no secondary bracket', () => {
    const g1 = makeGroupStandings(1, [
      makePlayer('g1p1', 'A1', 2),
      makePlayer('g1p2', 'A2', 0)
    ]);
    const g2 = makeGroupStandings(2, [
      makePlayer('g2p1', 'B1', 2),
      makePlayer('g2p2', 'B2', 0)
    ]);

    const result = computeWaterfall([g1, g2], 2, 0);

    expect(result.secondarySlots).toHaveLength(0);
    expect(result.eliminated).toHaveLength(2); // both 2nd-place eliminated
  });

  it('eliminated players have bracket=null', () => {
    const g1 = makeGroupStandings(1, [
      makePlayer('g1p1', 'A1', 2),
      makePlayer('g1p2', 'A2', 0)
    ]);
    const g2 = makeGroupStandings(2, [
      makePlayer('g2p1', 'B1', 2),
      makePlayer('g2p2', 'B2', 0)
    ]);

    const result = computeWaterfall([g1, g2], 2, 0);

    expect(result.eliminated.every(e => e.bracket === null)).toBe(true);
  });

  it('cross-group ranking selects best from tied position bucket', () => {
    // 3 groups with 1 slot — best by wins/setDiff wins
    const g1 = makeGroupStandings(1, [makePlayer('g1p1', 'Alice', 2, 5, 10, 10)]);
    const g2 = makeGroupStandings(2, [makePlayer('g2p1', 'Bob', 2, 3, 6, 10)]);
    const g3 = makeGroupStandings(3, [makePlayer('g3p1', 'Charlie', 2, 1, 2, 10)]);

    const result = computeWaterfall([g1, g2, g3], 1, 0);

    // Alice has best setDiff → wins the only main slot
    expect(result.mainSlots[0].entity.id).toBe('g1p1');
    expect(result.eliminated).toHaveLength(2);
  });

  it('returns correct bracket property on each slot', () => {
    const g1 = makeGroupStandings(1, [
      makePlayer('g1p1', 'A1', 2),
      makePlayer('g1p2', 'A2', 0)
    ]);
    const g2 = makeGroupStandings(2, [
      makePlayer('g2p1', 'B1', 2),
      makePlayer('g2p2', 'B2', 0)
    ]);

    const result = computeWaterfall([g1, g2], 2, 2);

    expect(result.mainSlots.every(s => s.bracket === 'main')).toBe(true);
    expect(result.secondarySlots.every(s => s.bracket === 'secondary')).toBe(true);
  });
});
