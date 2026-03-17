/**
 * Unit tests for groupPersistenceService
 *
 * Tests cover:
 *   - snakeDraft: seeded player distribution across groups
 *   - fillUnseeded: deterministic shuffle and balanced fill
 *   - generateCircleRoundRobin: circle-method round-robin scheduling
 *   - validateGroupBalance: group size balance validation
 *
 * Pure functions only — no Prisma mocking needed for unit tests.
 * Integration tests (generateGroupDraw) covered in Plan 02 integration tests.
 *
 * Feature: 27-group-formation, Plan 01
 */

import {
  snakeDraft,
  fillUnseeded,
  generateCircleRoundRobin,
  validateGroupBalance
} from '../../src/services/groupPersistenceService.js';

// ---------------------------------------------------------------------------
// snakeDraft tests
// ---------------------------------------------------------------------------

describe('snakeDraft', () => {
  // Test players: [p1, p2, p3, p4, p5, p6]
  const players = [
    { entityId: 'p1', rank: 1 },
    { entityId: 'p2', rank: 2 },
    { entityId: 'p3', rank: 3 },
    { entityId: 'p4', rank: 4 },
    { entityId: 'p5', rank: 5 },
    { entityId: 'p6', rank: 6 },
    { entityId: 'p7', rank: 7 },
    { entityId: 'p8', rank: 8 },
    { entityId: 'p9', rank: 9 }
  ];

  test('3 groups, 2 seeded rounds, 6 seeded players — correct snake placement', () => {
    const groups = snakeDraft(players, 3, 2);
    expect(groups).toHaveLength(3);
    // Round 1 (forward): p1 → group[0], p2 → group[1], p3 → group[2]
    // Round 2 (reverse): p4 → group[2], p5 → group[1], p6 → group[0]
    expect(groups[0].map(p => p.entityId)).toEqual(['p1', 'p6']);
    expect(groups[1].map(p => p.entityId)).toEqual(['p2', 'p5']);
    expect(groups[2].map(p => p.entityId)).toEqual(['p3', 'p4']);
  });

  test('3 groups, 0 seeded rounds — returns empty groups', () => {
    const groups = snakeDraft(players, 3, 0);
    expect(groups).toHaveLength(3);
    expect(groups[0]).toHaveLength(0);
    expect(groups[1]).toHaveLength(0);
    expect(groups[2]).toHaveLength(0);
  });

  test('4 groups, 1 seeded round — only 4 players placed (round 1 forward)', () => {
    const groups = snakeDraft(players, 4, 1);
    expect(groups).toHaveLength(4);
    // Round 1 (forward): p1 → [0], p2 → [1], p3 → [2], p4 → [3]
    expect(groups[0].map(p => p.entityId)).toEqual(['p1']);
    expect(groups[1].map(p => p.entityId)).toEqual(['p2']);
    expect(groups[2].map(p => p.entityId)).toEqual(['p3']);
    expect(groups[3].map(p => p.entityId)).toEqual(['p4']);
  });

  test('3 groups, 3 seeded rounds — correct alternating direction', () => {
    const groups = snakeDraft(players, 3, 3);
    // Round 1 (forward): p1→[0], p2→[1], p3→[2]
    // Round 2 (reverse): p4→[2], p5→[1], p6→[0]
    // Round 3 (forward): p7→[0], p8→[1], p9→[2]
    expect(groups[0].map(p => p.entityId)).toEqual(['p1', 'p6', 'p7']);
    expect(groups[1].map(p => p.entityId)).toEqual(['p2', 'p5', 'p8']);
    expect(groups[2].map(p => p.entityId)).toEqual(['p3', 'p4', 'p9']);
  });

  test('does not mutate input array', () => {
    const original = [...players];
    snakeDraft(players, 3, 2);
    expect(players).toEqual(original);
  });

  test('returns arrays of correct lengths when seededRounds * groupCount < players.length', () => {
    const groups = snakeDraft(players, 3, 2);
    const totalPlaced = groups.reduce((sum, g) => sum + g.length, 0);
    expect(totalPlaced).toBe(6); // 2 rounds * 3 groups = 6 placed
  });
});

// ---------------------------------------------------------------------------
// fillUnseeded tests
// ---------------------------------------------------------------------------

describe('fillUnseeded', () => {
  const makeGroups = (counts) => counts.map(n =>
    Array.from({ length: n }, (_, i) => ({ entityId: `seeded-${i}` }))
  );

  const unseededPlayers = [
    { entityId: 'u1' },
    { entityId: 'u2' },
    { entityId: 'u3' },
    { entityId: 'u4' },
    { entityId: 'u5' },
    { entityId: 'u6' }
  ];

  test('deterministic: same seed produces same result', () => {
    const groups1 = makeGroups([1, 1, 1]);
    const groups2 = makeGroups([1, 1, 1]);
    fillUnseeded(groups1, unseededPlayers, 'test-seed-abc');
    fillUnseeded(groups2, unseededPlayers, 'test-seed-abc');
    expect(groups1.map(g => g.map(p => p.entityId)))
      .toEqual(groups2.map(g => g.map(p => p.entityId)));
  });

  test('different seeds produce different results (probabilistic)', () => {
    const groups1 = makeGroups([0, 0, 0]);
    const groups2 = makeGroups([0, 0, 0]);
    fillUnseeded(groups1, [...unseededPlayers], 'seed-aaa');
    fillUnseeded(groups2, [...unseededPlayers], 'seed-zzz');
    const result1 = groups1.map(g => g.map(p => p.entityId)).flat();
    const result2 = groups2.map(g => g.map(p => p.entityId)).flat();
    // Both contain same elements (all 6 unseeded players)
    expect(result1.sort()).toEqual(result2.sort());
    // But at least one ordering differs
    expect(result1).not.toEqual(result2);
  });

  test('all unseeded players are placed exactly once', () => {
    const groups = makeGroups([0, 0, 0]);
    fillUnseeded(groups, unseededPlayers, 'test-seed');
    const placed = groups.flat().map(p => p.entityId);
    expect(placed.sort()).toEqual(unseededPlayers.map(p => p.entityId).sort());
  });

  test('balances groups evenly when divisible', () => {
    const groups = makeGroups([0, 0, 0]); // 3 empty groups, 6 unseeded
    fillUnseeded(groups, unseededPlayers, 'test-seed');
    expect(groups[0]).toHaveLength(2);
    expect(groups[1]).toHaveLength(2);
    expect(groups[2]).toHaveLength(2);
  });

  test('distributes remainder to first groups when not evenly divisible', () => {
    const groups = makeGroups([0, 0, 0]); // 3 groups, 7 players
    const sevenPlayers = [...unseededPlayers, { entityId: 'u7' }];
    fillUnseeded(groups, sevenPlayers, 'test-seed');
    const sizes = groups.map(g => g.length).sort((a, b) => b - a);
    expect(sizes[0]).toBe(3); // one group gets 3
    expect(sizes[1]).toBe(2);
    expect(sizes[2]).toBe(2);
  });

  test('works with groups that already have seeded players', () => {
    const groups = makeGroups([2, 2, 2]); // 3 groups with 2 seeded each, 6 unseeded
    fillUnseeded(groups, unseededPlayers, 'test-seed');
    // Each group should now have 4 players
    expect(groups[0]).toHaveLength(4);
    expect(groups[1]).toHaveLength(4);
    expect(groups[2]).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// generateCircleRoundRobin tests
// ---------------------------------------------------------------------------

describe('generateCircleRoundRobin', () => {
  test('4 participants → exactly 6 fixtures (4*3/2)', () => {
    const participants = ['A', 'B', 'C', 'D'];
    const fixtures = generateCircleRoundRobin(participants, 1);
    expect(fixtures).toHaveLength(6);
  });

  test('4 participants → exactly 3 rounds', () => {
    const participants = ['A', 'B', 'C', 'D'];
    const fixtures = generateCircleRoundRobin(participants, 1);
    const rounds = new Set(fixtures.map(f => f.round));
    expect(rounds.size).toBe(3);
  });

  test('4 participants → each participant plays exactly 3 matches', () => {
    const participants = ['A', 'B', 'C', 'D'];
    const fixtures = generateCircleRoundRobin(participants, 1);
    for (const p of participants) {
      const matchCount = fixtures.filter(f => f.p1 === p || f.p2 === p).length;
      expect(matchCount).toBe(3);
    }
  });

  test('5 participants → exactly 10 fixtures (5*4/2)', () => {
    const participants = ['A', 'B', 'C', 'D', 'E'];
    const fixtures = generateCircleRoundRobin(participants, 1);
    expect(fixtures).toHaveLength(10);
  });

  test('5 participants → BYE handling: no fixture contains null', () => {
    const participants = ['A', 'B', 'C', 'D', 'E'];
    const fixtures = generateCircleRoundRobin(participants, 1);
    expect(fixtures.every(f => f.p1 !== null && f.p2 !== null)).toBe(true);
  });

  test('3 participants → exactly 3 fixtures (3*2/2)', () => {
    const participants = ['A', 'B', 'C'];
    const fixtures = generateCircleRoundRobin(participants, 1);
    expect(fixtures).toHaveLength(3);
  });

  test('6 participants → exactly 15 fixtures (6*5/2)', () => {
    const participants = ['A', 'B', 'C', 'D', 'E', 'F'];
    const fixtures = generateCircleRoundRobin(participants, 1);
    expect(fixtures).toHaveLength(15);
  });

  test('every participant plays every other participant exactly once', () => {
    const participants = ['A', 'B', 'C', 'D', 'E'];
    const fixtures = generateCircleRoundRobin(participants, 1);
    // Check all pairs exist
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        const p1 = participants[i];
        const p2 = participants[j];
        const matchCount = fixtures.filter(
          f => (f.p1 === p1 && f.p2 === p2) || (f.p1 === p2 && f.p2 === p1)
        ).length;
        expect(matchCount).toBe(1);
      }
    }
  });

  test('match numbering: Group 1 starts at 101', () => {
    const participants = ['A', 'B', 'C', 'D'];
    const fixtures = generateCircleRoundRobin(participants, 1);
    expect(fixtures[0].matchNumber).toBe(101);
  });

  test('match numbering: Group 2 starts at 201', () => {
    const participants = ['A', 'B', 'C', 'D'];
    const fixtures = generateCircleRoundRobin(participants, 2);
    expect(fixtures[0].matchNumber).toBe(201);
  });

  test('match numbering: Group 3 starts at 301', () => {
    const participants = ['A', 'B', 'C', 'D'];
    const fixtures = generateCircleRoundRobin(participants, 3);
    expect(fixtures[0].matchNumber).toBe(301);
  });

  test('no duplicate fixtures', () => {
    const participants = ['A', 'B', 'C', 'D', 'E', 'F'];
    const fixtures = generateCircleRoundRobin(participants, 1);
    const pairs = fixtures.map(f => [f.p1, f.p2].sort().join('vs'));
    const unique = new Set(pairs);
    expect(unique.size).toBe(fixtures.length);
  });
});

// ---------------------------------------------------------------------------
// validateGroupBalance tests
// ---------------------------------------------------------------------------

describe('validateGroupBalance', () => {
  test('11 players, 3 groups → valid (sizes 4,4,3)', () => {
    const result = validateGroupBalance(11, 3);
    expect(result.valid).toBe(true);
    expect(result.sizes).toContain('4');
    expect(result.sizes).toContain('3');
  });

  test('10 players, 3 groups → valid (sizes 4,3,3)', () => {
    const result = validateGroupBalance(10, 3);
    expect(result.valid).toBe(true);
  });

  test('10 players, 2 groups → valid (sizes 5,5)', () => {
    const result = validateGroupBalance(10, 2);
    expect(result.valid).toBe(true);
  });

  test('4 players, 4 groups → invalid (groups of 1)', () => {
    const result = validateGroupBalance(4, 4);
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test('3 players, 2 groups → invalid (group of 1)', () => {
    const result = validateGroupBalance(3, 2);
    expect(result.valid).toBe(false);
  });

  test('4 players, 2 groups → valid (sizes 2,2)', () => {
    const result = validateGroupBalance(4, 2);
    expect(result.valid).toBe(true);
  });

  test('5 players, 2 groups → valid (sizes 3,2)', () => {
    const result = validateGroupBalance(5, 2);
    expect(result.valid).toBe(true);
  });

  test('12 players, 4 groups → valid (sizes 3,3,3,3)', () => {
    const result = validateGroupBalance(12, 4);
    expect(result.valid).toBe(true);
  });

  test('invalid result includes error message', () => {
    const result = validateGroupBalance(4, 4);
    expect(typeof result.error).toBe('string');
    expect(result.error.length).toBeGreaterThan(0);
  });

  test('valid result includes sizes description', () => {
    const result = validateGroupBalance(11, 3);
    expect(typeof result.sizes).toBe('string');
    expect(result.sizes.length).toBeGreaterThan(0);
  });
});
