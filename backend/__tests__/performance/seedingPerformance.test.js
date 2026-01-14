/**
 * Performance Tests for Seeding Placement (T119)
 *
 * Validates that bracket generation completes within performance requirements:
 * - SC-004: All bracket generations must complete in under 2 seconds
 * - 128-player bracket (worst case) should complete well under this limit
 */

import {
  getSeedCount,
  placeTwoSeeds,
  placeFourSeeds,
  placeEightSeeds,
  placeSixteenSeeds,
  shuffle
} from '../../src/services/seedingPlacementService.js';

describe('Seeding Placement Performance (T119)', () => {
  // Mock seeds for performance testing
  const create16Seeds = () =>
    Array.from({ length: 16 }, (_, i) => ({
      rank: i + 1,
      entityId: `player${i + 1}`,
      entityName: `Player ${i + 1}`,
      entityType: 'PLAYER'
    }));

  test('128-player bracket generation completes in under 2 seconds', () => {
    const bracketSize = 128;
    const seeds = create16Seeds();
    const randomSeed = 'performance-test-128';

    const startTime = performance.now();
    const positions = placeSixteenSeeds(bracketSize, seeds, randomSeed);
    const endTime = performance.now();

    const executionTime = endTime - startTime;

    // Verify correct output
    expect(positions).toHaveLength(128);
    expect(positions.filter((p) => p.seed !== null)).toHaveLength(16);

    // Performance requirement: < 2000ms (SC-004)
    expect(executionTime).toBeLessThan(2000);

    // Log performance for monitoring
    console.log(`128-player bracket generation: ${executionTime.toFixed(2)}ms`);
  });

  test('64-player bracket generation completes quickly', () => {
    const bracketSize = 64;
    const seeds = create16Seeds();
    const randomSeed = 'performance-test-64';

    const startTime = performance.now();
    const positions = placeSixteenSeeds(bracketSize, seeds, randomSeed);
    const endTime = performance.now();

    const executionTime = endTime - startTime;

    expect(positions).toHaveLength(64);
    expect(executionTime).toBeLessThan(2000);

    console.log(`64-player bracket generation: ${executionTime.toFixed(2)}ms`);
  });

  test('32-player bracket (8-seed) completes quickly', () => {
    const bracketSize = 32;
    const seeds = create16Seeds().slice(0, 8);
    const randomSeed = 'performance-test-32';

    const startTime = performance.now();
    const positions = placeEightSeeds(bracketSize, seeds, randomSeed);
    const endTime = performance.now();

    const executionTime = endTime - startTime;

    expect(positions).toHaveLength(32);
    expect(executionTime).toBeLessThan(500);

    console.log(`32-player bracket generation: ${executionTime.toFixed(2)}ms`);
  });

  test('16-player bracket (4-seed) completes quickly', () => {
    const bracketSize = 16;
    const seeds = create16Seeds().slice(0, 4);
    const randomSeed = 'performance-test-16';

    const startTime = performance.now();
    const positions = placeFourSeeds(bracketSize, seeds, randomSeed);
    const endTime = performance.now();

    const executionTime = endTime - startTime;

    expect(positions).toHaveLength(16);
    expect(executionTime).toBeLessThan(200);

    console.log(`16-player bracket generation: ${executionTime.toFixed(2)}ms`);
  });

  test('shuffle() performance with 16 elements', () => {
    const array = Array.from({ length: 16 }, (_, i) => i + 1);
    const seed = 'performance-test-shuffle';

    const iterations = 1000;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      shuffle(array, `${seed}-${i}`);
    }

    const endTime = performance.now();
    const executionTime = endTime - startTime;
    const avgTime = executionTime / iterations;

    // 1000 shuffles should complete in reasonable time
    expect(executionTime).toBeLessThan(1000); // < 1s for 1000 shuffles
    expect(avgTime).toBeLessThan(1); // < 1ms per shuffle

    console.log(
      `shuffle() performance: ${avgTime.toFixed(3)}ms per shuffle (${iterations} iterations)`
    );
  });

  test('getSeedCount() performance', () => {
    const iterations = 10000;
    const playerCounts = [4, 9, 10, 19, 20, 39, 40, 64, 128];

    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      playerCounts.forEach((count) => getSeedCount(count));
    }

    const endTime = performance.now();
    const executionTime = endTime - startTime;
    const avgTime = executionTime / (iterations * playerCounts.length);

    // Should be extremely fast (simple conditional logic)
    expect(avgTime).toBeLessThan(0.01); // < 0.01ms per call

    console.log(
      `getSeedCount() performance: ${avgTime.toFixed(6)}ms per call (${
        iterations * playerCounts.length
      } calls)`
    );
  });
});
