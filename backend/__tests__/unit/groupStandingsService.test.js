/**
 * Unit tests for groupStandingsService.js — Phase 29 Group Standings & Tiebreakers
 *
 * Tests for pure functions only (no DB access):
 * - buildEntityStats
 * - sortWithTiebreakers
 * - detectH2HCycle
 * - computeGroupStandings
 */

import {
  buildEntityStats,
  sortWithTiebreakers,
  detectH2HCycle,
  computeGroupStandings
} from '../../src/services/groupStandingsService.js';

// ─────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────

function makePlayer(id, name) {
  return { id, name };
}

function makeMatch({
  id = 'match-1',
  player1Id = null,
  player2Id = null,
  pair1Id = null,
  pair2Id = null,
  winner = 'PLAYER1',
  sets = [{ setNumber: 1, player1Score: 6, player2Score: 3 }],
  outcome = null,
  completedAt = new Date('2026-03-01T10:00:00Z')
} = {}) {
  return {
    id,
    status: 'COMPLETED',
    player1Id,
    player2Id,
    pair1Id,
    pair2Id,
    result: JSON.stringify({ winner, sets, outcome }),
    completedAt
  };
}

// ─────────────────────────────────────────────
// GSTAND-01: Stats accumulation
// ─────────────────────────────────────────────

describe('buildEntityStats', () => {
  it('accumulates correct W/L/sets/games for 3 players in round-robin', () => {
    const A = makePlayer('A', 'Alice');
    const B = makePlayer('B', 'Bob');
    const C = makePlayer('C', 'Carol');
    const entities = [A, B, C];

    const matches = [
      // A beats B 6-3, 6-2
      makeMatch({
        id: 'm1', player1Id: 'A', player2Id: 'B', winner: 'PLAYER1',
        sets: [
          { setNumber: 1, player1Score: 6, player2Score: 3 },
          { setNumber: 2, player1Score: 6, player2Score: 2 }
        ]
      }),
      // A beats C 6-4, 6-1
      makeMatch({
        id: 'm2', player1Id: 'A', player2Id: 'C', winner: 'PLAYER1',
        sets: [
          { setNumber: 1, player1Score: 6, player2Score: 4 },
          { setNumber: 2, player1Score: 6, player2Score: 1 }
        ]
      }),
      // B beats C 6-3, 7-5
      makeMatch({
        id: 'm3', player1Id: 'B', player2Id: 'C', winner: 'PLAYER1',
        sets: [
          { setNumber: 1, player1Score: 6, player2Score: 3 },
          { setNumber: 2, player1Score: 7, player2Score: 5 }
        ]
      })
    ];

    const stats = buildEntityStats(entities, matches);

    // Alice: 2 wins, 0 losses, 4 sets won, 0 sets lost
    const aStats = stats.get('A');
    expect(aStats.wins).toBe(2);
    expect(aStats.losses).toBe(0);
    expect(aStats.played).toBe(2);
    expect(aStats.setsWon).toBe(4);
    expect(aStats.setsLost).toBe(0);
    expect(aStats.gamesWon).toBe(24);  // 6+6+6+6
    expect(aStats.gamesLost).toBe(10); // 3+2+4+1
    expect(aStats.setDiff).toBe(4);
    expect(aStats.gameDiff).toBe(14);

    // Bob: 1 win, 1 loss
    const bStats = stats.get('B');
    expect(bStats.wins).toBe(1);
    expect(bStats.losses).toBe(1);
    expect(bStats.played).toBe(2);
    expect(bStats.setsWon).toBe(2);
    expect(bStats.setsLost).toBe(2);

    // Carol: 0 wins, 2 losses
    const cStats = stats.get('C');
    expect(cStats.wins).toBe(0);
    expect(cStats.losses).toBe(2);
    expect(cStats.played).toBe(2);
    expect(cStats.setsWon).toBe(0);
    expect(cStats.setsLost).toBe(4);
  });

  it('returns all-zero stats for player with no completed matches', () => {
    const A = makePlayer('A', 'Alice');
    const B = makePlayer('B', 'Bob');
    const entities = [A, B];

    // Only one match but not completed
    const matches = [
      {
        id: 'm1', status: 'SCHEDULED',
        player1Id: 'A', player2Id: 'B',
        pair1Id: null, pair2Id: null,
        result: null,
        completedAt: null
      }
    ];

    const stats = buildEntityStats(entities, matches);
    const aStats = stats.get('A');
    expect(aStats.wins).toBe(0);
    expect(aStats.losses).toBe(0);
    expect(aStats.played).toBe(0);
    expect(aStats.setsWon).toBe(0);
    expect(aStats.gamesWon).toBe(0);
    expect(aStats.setDiff).toBe(0);
    expect(aStats.gameDiff).toBe(0);
  });

  it('handles walkover: winner gets win, loser gets loss, set/game counts from actual sets', () => {
    const entities = [makePlayer('A', 'Alice'), makePlayer('B', 'Bob')];

    // Walkover — outcome is WALKOVER, sets may be empty
    const matches = [
      makeMatch({
        id: 'm1', player1Id: 'A', player2Id: 'B', winner: 'PLAYER1',
        sets: [],
        outcome: 'WALKOVER'
      })
    ];

    const stats = buildEntityStats(entities, matches);
    expect(stats.get('A').wins).toBe(1);
    expect(stats.get('B').losses).toBe(1);
    // No actual sets played
    expect(stats.get('A').setsWon).toBe(0);
    expect(stats.get('A').gamesWon).toBe(0);
  });

  it('correctly credits PLAYER2 as winner', () => {
    const entities = [makePlayer('A', 'Alice'), makePlayer('B', 'Bob')];
    const matches = [
      makeMatch({
        id: 'm1', player1Id: 'A', player2Id: 'B', winner: 'PLAYER2',
        sets: [{ setNumber: 1, player1Score: 3, player2Score: 6 }]
      })
    ];

    const stats = buildEntityStats(entities, matches);
    expect(stats.get('A').wins).toBe(0);
    expect(stats.get('A').losses).toBe(1);
    expect(stats.get('B').wins).toBe(1);
    expect(stats.get('B').losses).toBe(0);
    // B's games won = player2Score = 6
    expect(stats.get('B').gamesWon).toBe(6);
    expect(stats.get('B').gamesLost).toBe(3);
  });

  it('totalGames equals gamesWon + gamesLost', () => {
    const entities = [makePlayer('A', 'Alice'), makePlayer('B', 'Bob')];
    const matches = [
      makeMatch({
        id: 'm1', player1Id: 'A', player2Id: 'B', winner: 'PLAYER1',
        sets: [
          { setNumber: 1, player1Score: 6, player2Score: 3 },
          { setNumber: 2, player1Score: 6, player2Score: 4 }
        ]
      })
    ];

    const stats = buildEntityStats(entities, matches);
    const a = stats.get('A');
    expect(a.totalGames).toBe(a.gamesWon + a.gamesLost); // 12 + 7 = 19
    const b = stats.get('B');
    expect(b.totalGames).toBe(b.gamesWon + b.gamesLost);
  });
});

// ─────────────────────────────────────────────
// GSTAND-03: Cycle detection
// ─────────────────────────────────────────────

describe('detectH2HCycle', () => {
  it('returns true for A>B, B>C, C>A (3-way cycle)', () => {
    const subset = ['A', 'B', 'C'];
    const h2hWins = new Map([
      ['A', new Set(['B'])],
      ['B', new Set(['C'])],
      ['C', new Set(['A'])]
    ]);
    expect(detectH2HCycle(subset, h2hWins)).toBe(true);
  });

  it('returns false for A>B, A>C, B>C (linear ordering, no cycle)', () => {
    const subset = ['A', 'B', 'C'];
    const h2hWins = new Map([
      ['A', new Set(['B', 'C'])],
      ['B', new Set(['C'])],
      ['C', new Set([])]
    ]);
    expect(detectH2HCycle(subset, h2hWins)).toBe(false);
  });

  it('returns false for 2-player direct H2H (A beats B)', () => {
    const subset = ['A', 'B'];
    const h2hWins = new Map([
      ['A', new Set(['B'])],
      ['B', new Set([])]
    ]);
    expect(detectH2HCycle(subset, h2hWins)).toBe(false);
  });

  it('returns true for 4-way cycle (A>B>C>D>A)', () => {
    const subset = ['A', 'B', 'C', 'D'];
    const h2hWins = new Map([
      ['A', new Set(['B'])],
      ['B', new Set(['C'])],
      ['C', new Set(['D'])],
      ['D', new Set(['A'])]
    ]);
    expect(detectH2HCycle(subset, h2hWins)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// GSTAND-02: Tiebreaker chain
// ─────────────────────────────────────────────

describe('sortWithTiebreakers', () => {
  function makeStats(id, name, overrides = {}) {
    return {
      entity: { id, name },
      played: 2,
      wins: 1,
      losses: 1,
      setsWon: 2, setsLost: 2,
      gamesWon: 12, gamesLost: 12,
      setDiff: 0,
      gameDiff: 0,
      totalGames: 24,
      ...overrides
    };
  }

  it('resolves tie by set diff when wins are equal', () => {
    const stats = [
      makeStats('A', 'Alice', { wins: 1, setDiff: 2 }),
      makeStats('B', 'Bob',   { wins: 1, setDiff: -2 })
    ];
    const result = sortWithTiebreakers(stats, null);

    expect(result[0].entity.id).toBe('A');
    expect(result[0].position).toBe(1);
    expect(result[0].tiebreakerCriterion).toBe('Set diff');
    expect(result[1].entity.id).toBe('B');
    expect(result[1].position).toBe(2);
  });

  it('resolves tie by game diff when wins and set diff are equal', () => {
    const stats = [
      makeStats('A', 'Alice', { wins: 1, setDiff: 0, gameDiff: 5 }),
      makeStats('B', 'Bob',   { wins: 1, setDiff: 0, gameDiff: -5 })
    ];
    const result = sortWithTiebreakers(stats, null);

    expect(result[0].entity.id).toBe('A');
    expect(result[0].tiebreakerCriterion).toBe('Game diff');
  });

  it('resolves tie by fewest total games when wins/setDiff/gameDiff all equal', () => {
    const stats = [
      makeStats('A', 'Alice', { wins: 1, setDiff: 0, gameDiff: 0, totalGames: 20 }),
      makeStats('B', 'Bob',   { wins: 1, setDiff: 0, gameDiff: 0, totalGames: 28 })
    ];
    const result = sortWithTiebreakers(stats, null);

    expect(result[0].entity.id).toBe('A'); // fewer games is better
    expect(result[0].tiebreakerCriterion).toBe('Fewest games');
  });

  it('leaves entities tied when all levels exhausted, sets tiedRange', () => {
    const stats = [
      makeStats('A', 'Alice', { wins: 1, setDiff: 0, gameDiff: 0, totalGames: 24 }),
      makeStats('B', 'Bob',   { wins: 1, setDiff: 0, gameDiff: 0, totalGames: 24 })
    ];
    const result = sortWithTiebreakers(stats, null);

    expect(result[0].tiebreakerCriterion).toBeNull();
    expect(result[1].tiebreakerCriterion).toBeNull();
    expect(result[0].tiedRange).toBe('1-2');
    expect(result[1].tiedRange).toBe('1-2');
  });

  it('correctly sorts by wins descending first (no tie needed)', () => {
    const stats = [
      makeStats('A', 'Alice', { wins: 0 }),
      makeStats('B', 'Bob',   { wins: 2 }),
      makeStats('C', 'Carol', { wins: 1 })
    ];
    const result = sortWithTiebreakers(stats, null);

    expect(result[0].entity.id).toBe('B');
    expect(result[1].entity.id).toBe('C');
    expect(result[2].entity.id).toBe('A');
    // No ties, positions are sequential
    expect(result[0].position).toBe(1);
    expect(result[1].position).toBe(2);
    expect(result[2].position).toBe(3);
    expect(result[0].tiedRange).toBeNull();
  });
});

// ─────────────────────────────────────────────
// GSTAND-02: H2H tiebreaker
// ─────────────────────────────────────────────

describe('computeGroupStandings — H2H tiebreaker', () => {
  it('resolves 2-player tie via H2H when direct result available', () => {
    // 3-player group: A and B both have 1 win (A beat B; C beat A; B beat C is NOT possible
    // without creating a cycle). Use: A beats B, C beats A, C beats B → A and B tied at 0
    // Actually: need A and B tied on wins with A having beaten B in H2H
    // Setup: A beats B (H2H); C beats A; C beats B → A=1W, B=0W, C=2W — not tied
    //
    // Better: 3 players, A=1W (beat B), B=1W (beat C), C=1W (beat A) would be a cycle.
    // Instead: 4-player group where A and B both have 1 win but different opponents,
    // AND A beat B directly.
    // A beats B, A loses to C; B loses to C; D not relevant
    // → A=1W(beat B), B=0W, C=2W... still not tied between A and B.
    //
    // Simplest correct scenario:
    // A and B both beat C but lost to each other... wait, A beats B means B lost to A.
    // For A and B to be tied on wins: A wins some match NOT against B, B wins some match NOT against A,
    // AND A also beat B (so B has an extra loss but same win count if they each win vs someone else)
    // E.g.: 4 players A, B, C, D
    //   A beats B (H2H), A beats C
    //   B beats C, B beats D
    //   → A=2W, B=2W — tied! and A beat B in H2H
    const entities = [
      makePlayer('A', 'Alice'), makePlayer('B', 'Bob'),
      makePlayer('C', 'Carol'), makePlayer('D', 'Dave')
    ];
    const matches = [
      makeMatch({ id: 'm1', player1Id: 'A', player2Id: 'B', winner: 'PLAYER1',
        sets: [{ setNumber: 1, player1Score: 6, player2Score: 4 }] }), // A beats B
      makeMatch({ id: 'm2', player1Id: 'A', player2Id: 'C', winner: 'PLAYER1',
        sets: [{ setNumber: 1, player1Score: 6, player2Score: 4 }] }), // A beats C
      makeMatch({ id: 'm3', player1Id: 'B', player2Id: 'C', winner: 'PLAYER1',
        sets: [{ setNumber: 1, player1Score: 6, player2Score: 4 }] }), // B beats C
      makeMatch({ id: 'm4', player1Id: 'B', player2Id: 'D', winner: 'PLAYER1',
        sets: [{ setNumber: 1, player1Score: 6, player2Score: 4 }] })  // B beats D
    ];

    // A=2W (beat B, C), B=2W (beat C, D), tied. A beat B in H2H → A wins
    const { standings } = computeGroupStandings(entities, matches, null);
    expect(standings[0].entity.id).toBe('A');
    expect(standings[0].tiebreakerCriterion).toBe('H2H');
    expect(standings[1].entity.id).toBe('B');
  });
});

// ─────────────────────────────────────────────
// GSTAND-03: Cycle detection in computeGroupStandings
// ─────────────────────────────────────────────

describe('computeGroupStandings — cycle detection', () => {
  it('3-way cycle (A>B, B>C, C>A) falls through to set diff', () => {
    const entities = [makePlayer('A', 'Alice'), makePlayer('B', 'Bob'), makePlayer('C', 'Carol')];

    const matches = [
      // All 3 tied on wins=1, losses=1
      makeMatch({
        id: 'm1', player1Id: 'A', player2Id: 'B', winner: 'PLAYER1',
        sets: [{ setNumber: 1, player1Score: 6, player2Score: 3 }]
      }), // A beats B
      makeMatch({
        id: 'm2', player1Id: 'B', player2Id: 'C', winner: 'PLAYER1',
        sets: [{ setNumber: 1, player1Score: 6, player2Score: 2 }]
      }), // B beats C
      makeMatch({
        id: 'm3', player1Id: 'C', player2Id: 'A', winner: 'PLAYER1',
        sets: [{ setNumber: 1, player1Score: 6, player2Score: 4 }]
      })  // C beats A
    ];

    const { standings } = computeGroupStandings(entities, matches, null);

    // All have 1 win, 1 loss — H2H is cyclic, falls through to set diff
    // A: lost 4 games, won 6; setDiff=0, gameDiff = 6-3 + (4-6) = +2 - wait let me recalculate
    // A: won vs B (6-3), lost vs C (4-6) → gamesWon=10, gamesLost=9, setDiff=0, gameDiff=+1
    // B: won vs C (6-2), lost vs A (3-6) → gamesWon=9, gamesLost=8, setDiff=0, gameDiff=+1
    // Wait: A wins 1 set (vs B), loses 1 set (vs C) → setDiff=0
    //       B wins 1 set (vs C), loses 1 set (vs A) → setDiff=0
    //       C wins 1 set (vs A), loses 1 set (vs B) → setDiff=0
    // gameDiff: A=(6-3)+(4-6)=+1, B=(6-2)+(3-6)=+1, C=(6-4)+(2-6)=-2
    // So C is last, A and B still tied on gameDiff
    // Neither tiebreakerCriterion should be 'H2H' (cycle detected)
    const criteria = standings.map(s => s.tiebreakerCriterion);
    expect(criteria).not.toContain('H2H'); // H2H skipped due to cycle
    // C should be last (worst set diff and game diff)
    expect(standings[2].entity.id).toBe('C');
  });

  it('no cycle: A>B, A>C, B>C resolves correctly via H2H', () => {
    const entities = [makePlayer('A', 'Alice'), makePlayer('B', 'Bob'), makePlayer('C', 'Carol')];

    const matches = [
      // A beats B and C; B beats C — all have different H2H records
      makeMatch({ id: 'm1', player1Id: 'A', player2Id: 'B', winner: 'PLAYER1',
        sets: [{ setNumber: 1, player1Score: 6, player2Score: 3 }] }),
      makeMatch({ id: 'm2', player1Id: 'A', player2Id: 'C', winner: 'PLAYER1',
        sets: [{ setNumber: 1, player1Score: 6, player2Score: 3 }] }),
      makeMatch({ id: 'm3', player1Id: 'B', player2Id: 'C', winner: 'PLAYER1',
        sets: [{ setNumber: 1, player1Score: 6, player2Score: 3 }] })
    ];

    const { standings } = computeGroupStandings(entities, matches, null);

    // A: 2W, B: 1W, C: 0W — no tie at all
    expect(standings[0].entity.id).toBe('A');
    expect(standings[0].tiebreakerCriterion).toBeNull(); // resolved by wins, no tiebreaker needed
    expect(standings[1].entity.id).toBe('B');
    expect(standings[2].entity.id).toBe('C');
  });

  it('4-player group: D lost to all, A>B>C>A cycle — D resolved, A/B/C cycle falls through', () => {
    const entities = [
      makePlayer('A', 'Alice'), makePlayer('B', 'Bob'),
      makePlayer('C', 'Carol'), makePlayer('D', 'Dave')
    ];

    const matches = [
      // D loses to A, B, C → D has 0 wins
      makeMatch({ id: 'm1', player1Id: 'A', player2Id: 'D', winner: 'PLAYER1',
        sets: [{ setNumber: 1, player1Score: 6, player2Score: 1 }] }),
      makeMatch({ id: 'm2', player1Id: 'B', player2Id: 'D', winner: 'PLAYER1',
        sets: [{ setNumber: 1, player1Score: 6, player2Score: 1 }] }),
      makeMatch({ id: 'm3', player1Id: 'C', player2Id: 'D', winner: 'PLAYER1',
        sets: [{ setNumber: 1, player1Score: 6, player2Score: 1 }] }),
      // Cycle among A, B, C — each has 1 additional win and 1 loss among themselves
      makeMatch({ id: 'm4', player1Id: 'A', player2Id: 'B', winner: 'PLAYER1',
        sets: [{ setNumber: 1, player1Score: 6, player2Score: 3 }] }),
      makeMatch({ id: 'm5', player1Id: 'B', player2Id: 'C', winner: 'PLAYER1',
        sets: [{ setNumber: 1, player1Score: 6, player2Score: 3 }] }),
      makeMatch({ id: 'm6', player1Id: 'C', player2Id: 'A', winner: 'PLAYER1',
        sets: [{ setNumber: 1, player1Score: 6, player2Score: 3 }] })
    ];

    const { standings } = computeGroupStandings(entities, matches, null);

    // D should be last (0 wins)
    expect(standings[3].entity.id).toBe('D');

    // A, B, C are in positions 1-3 (could be any order due to cycle/tie)
    const topThreeIds = standings.slice(0, 3).map(s => s.entity.id);
    expect(topThreeIds).toContain('A');
    expect(topThreeIds).toContain('B');
    expect(topThreeIds).toContain('C');

    // H2H should NOT be the criterion for A, B, C (cycle detected)
    const topThreeCriteria = standings.slice(0, 3).map(s => s.tiebreakerCriterion);
    expect(topThreeCriteria).not.toContain('H2H');
  });
});

// ─────────────────────────────────────────────
// GSTAND-02: Partial resolution
// ─────────────────────────────────────────────

describe('computeGroupStandings — partial resolution', () => {
  it('resolves one player from tied group while others remain tied', () => {
    // 3 players tied on wins; A has better set diff; B and C remain tied
    const entities = [makePlayer('A', 'Alice'), makePlayer('B', 'Bob'), makePlayer('C', 'Carol')];

    // Build a scenario: A has better setDiff, B and C have equal setDiff
    // Use pure sortWithTiebreakers to test this
    const statsArray = [
      { entity: { id: 'A', name: 'Alice' }, wins: 1, losses: 1, played: 2,
        setsWon: 3, setsLost: 0, gamesWon: 18, gamesLost: 6,
        setDiff: 3, gameDiff: 12, totalGames: 24 },
      { entity: { id: 'B', name: 'Bob' }, wins: 1, losses: 1, played: 2,
        setsWon: 1, setsLost: 1, gamesWon: 12, gamesLost: 12,
        setDiff: 0, gameDiff: 0, totalGames: 24 },
      { entity: { id: 'C', name: 'Carol' }, wins: 1, losses: 1, played: 2,
        setsWon: 1, setsLost: 1, gamesWon: 12, gamesLost: 12,
        setDiff: 0, gameDiff: 0, totalGames: 24 }
    ];

    const result = sortWithTiebreakers(statsArray, null);

    // A should be resolved at position 1 by set diff
    expect(result[0].entity.id).toBe('A');
    expect(result[0].position).toBe(1);
    expect(result[0].tiedRange).toBeNull();
    expect(result[0].tiebreakerCriterion).toBe('Set diff');

    // B and C should remain tied at range 2-3
    const tied = result.slice(1);
    expect(tied[0].tiedRange).toBe('2-3');
    expect(tied[1].tiedRange).toBe('2-3');
  });
});

// ─────────────────────────────────────────────
// GSTAND-06: Doubles pairs
// ─────────────────────────────────────────────

describe('computeGroupStandings — doubles pairs', () => {
  it('pair entities produce identical standings computation to player entities', () => {
    const pairA = { id: 'pair-A', name: 'Alice / Alex' };
    const pairB = { id: 'pair-B', name: 'Bob / Bella' };
    const entities = [pairA, pairB];

    const matches = [
      makeMatch({
        id: 'm1',
        pair1Id: 'pair-A', pair2Id: 'pair-B',
        player1Id: null, player2Id: null,
        winner: 'PLAYER1',
        sets: [{ setNumber: 1, player1Score: 6, player2Score: 3 }]
      })
    ];

    const { standings } = computeGroupStandings(entities, matches, null);
    expect(standings[0].entity.id).toBe('pair-A');
    expect(standings[0].wins).toBe(1);
    expect(standings[1].entity.id).toBe('pair-B');
    expect(standings[1].losses).toBe(1);
  });

  it('entity name is passed through unchanged for pair name strings', () => {
    const pairA = { id: 'pair-A', name: 'Alice / Alex' };
    const entities = [pairA];
    const { standings } = computeGroupStandings(entities, [], null);
    expect(standings[0].entity.name).toBe('Alice / Alex');
  });
});

// ─────────────────────────────────────────────
// Manual override
// ─────────────────────────────────────────────

describe('computeGroupStandings — manual override', () => {
  it('applies override positions when not stale, sets isManual=true', () => {
    const entities = [makePlayer('A', 'Alice'), makePlayer('B', 'Bob')];
    const matches = [
      // Both have 1 win — tied (A beat B in H2H, but we'll test override takes precedence)
      makeMatch({
        id: 'm1', player1Id: 'A', player2Id: 'B', winner: 'PLAYER1',
        sets: [{ setNumber: 1, player1Score: 6, player2Score: 4 }],
        completedAt: new Date('2026-03-01T10:00:00Z')
      })
    ];

    // Override says B is position 1, A is position 2
    const override = {
      positions: JSON.stringify([
        { entityId: 'B', position: 1 },
        { entityId: 'A', position: 2 }
      ]),
      resultSnapshotAt: new Date('2026-03-01T11:00:00Z') // after the match
    };

    // A has 1 win (beat B), B has 0 wins — they're NOT tied by wins
    // But override should only apply to the tied subset
    // For this test, make them tied: A and B have equal wins but the H2H favors A
    // Actually, with only 1 match (A beats B): A=1win, B=0wins — not tied, so override won't apply
    // Let's use sortWithTiebreakers directly with tied stats:
    const statsArray = [
      { entity: { id: 'A', name: 'Alice' }, wins: 1, losses: 0, played: 1,
        setsWon: 1, setsLost: 0, gamesWon: 6, gamesLost: 4,
        setDiff: 1, gameDiff: 2, totalGames: 10 },
      { entity: { id: 'B', name: 'Bob' }, wins: 1, losses: 0, played: 1,
        setsWon: 1, setsLost: 0, gamesWon: 6, gamesLost: 4,
        setDiff: 1, gameDiff: 2, totalGames: 10 }
    ];

    const result = sortWithTiebreakers(statsArray, override);

    // Override should put B first, A second
    expect(result[0].entity.id).toBe('B');
    expect(result[0].isManual).toBe(true);
    expect(result[0].tiebreakerCriterion).toBe('Manual');
    expect(result[1].entity.id).toBe('A');
    expect(result[1].isManual).toBe(true);
  });

  it('returns overrideIsStale=true when match completed after resultSnapshotAt', () => {
    const entities = [makePlayer('A', 'Alice'), makePlayer('B', 'Bob')];
    const matches = [
      makeMatch({
        id: 'm1', player1Id: 'A', player2Id: 'B', winner: 'PLAYER1',
        completedAt: new Date('2026-03-02T10:00:00Z') // after override
      })
    ];

    const override = {
      positions: JSON.stringify([
        { entityId: 'A', position: 1 },
        { entityId: 'B', position: 2 }
      ]),
      resultSnapshotAt: new Date('2026-03-01T10:00:00Z') // BEFORE the match
    };

    const { overrideIsStale } = computeGroupStandings(entities, matches, override);
    expect(overrideIsStale).toBe(true);
  });

  it('returns overrideIsStale=false when override is newer than all matches', () => {
    const entities = [makePlayer('A', 'Alice'), makePlayer('B', 'Bob')];
    const matches = [
      makeMatch({
        id: 'm1', player1Id: 'A', player2Id: 'B', winner: 'PLAYER1',
        completedAt: new Date('2026-03-01T10:00:00Z')
      })
    ];

    const override = {
      positions: JSON.stringify([
        { entityId: 'A', position: 1 },
        { entityId: 'B', position: 2 }
      ]),
      resultSnapshotAt: new Date('2026-03-01T11:00:00Z') // AFTER the match
    };

    const { overrideIsStale } = computeGroupStandings(entities, matches, override);
    expect(overrideIsStale).toBe(false);
  });
});

// ─────────────────────────────────────────────
// Edge cases
// ─────────────────────────────────────────────

describe('computeGroupStandings — edge cases', () => {
  it('returns all-zero stats for group with 0 completed matches', () => {
    const entities = [makePlayer('A', 'Alice'), makePlayer('B', 'Bob'), makePlayer('C', 'Carol')];
    const { standings, unresolvedTies } = computeGroupStandings(entities, [], null);

    expect(standings).toHaveLength(3);
    standings.forEach(s => {
      expect(s.wins).toBe(0);
      expect(s.losses).toBe(0);
      expect(s.played).toBe(0);
    });

    // All tied — tiedRange should cover all
    expect(standings[0].tiedRange).toBe('1-3');
    expect(unresolvedTies).toHaveLength(1);
    expect(unresolvedTies[0].range).toBe('1-3');
  });

  it('single entity in group gets position 1 with no tiebreaker', () => {
    const entities = [makePlayer('A', 'Alice')];
    const { standings } = computeGroupStandings(entities, [], null);

    expect(standings).toHaveLength(1);
    expect(standings[0].position).toBe(1);
    expect(standings[0].tiedRange).toBeNull();
    expect(standings[0].tiebreakerCriterion).toBeNull();
  });

  it('returns hasManualOverride=true when override is provided', () => {
    const entities = [makePlayer('A', 'Alice'), makePlayer('B', 'Bob')];
    const override = {
      positions: JSON.stringify([{ entityId: 'A', position: 1 }, { entityId: 'B', position: 2 }]),
      resultSnapshotAt: new Date('2026-03-01T12:00:00Z')
    };
    const { hasManualOverride } = computeGroupStandings(entities, [], override);
    expect(hasManualOverride).toBe(true);
  });

  it('returns hasManualOverride=false when no override', () => {
    const entities = [makePlayer('A', 'Alice')];
    const { hasManualOverride } = computeGroupStandings(entities, [], null);
    expect(hasManualOverride).toBe(false);
  });
});
