/**
 * Randomization Fairness Tests (User Story 2: T042-T045)
 *
 * Tests verify that shuffle() produces fair randomization using chi-square goodness-of-fit test.
 * Each position should have equal probability (~50%) of getting either seed.
 */

import {
  shuffle,
  placeFourSeeds,
  placeEightSeeds,
  placeSixteenSeeds
} from '../../src/services/seedingPlacementService.js';

describe('Randomization Fairness (User Story 2)', () => {
  describe('shuffle() fairness', () => {
    // T042: Chi-square test for shuffle function
    test('produces fair distribution across many iterations', () => {
      const iterations = 1000;
      const array = ['A', 'B'];

      // Count how many times A appears in position 0
      let aAtPosition0 = 0;

      for (let i = 0; i < iterations; i++) {
        const seed = `test-seed-${i}`;
        const shuffled = shuffle(array, seed);
        if (shuffled[0] === 'A') {
          aAtPosition0++;
        }
      }

      // Expected: 50% ± tolerance
      const expectedProbability = 0.5;
      const tolerance = 0.05; // 5% tolerance (45%-55%)
      const observedProbability = aAtPosition0 / iterations;

      expect(observedProbability).toBeGreaterThanOrEqual(expectedProbability - tolerance);
      expect(observedProbability).toBeLessThanOrEqual(expectedProbability + tolerance);

      // Chi-square test: χ² = Σ((observed - expected)² / expected)
      const expected = iterations * expectedProbability;
      const observed1 = aAtPosition0;
      const observed2 = iterations - aAtPosition0;
      const chiSquare =
        Math.pow(observed1 - expected, 2) / expected +
        Math.pow(observed2 - expected, 2) / expected;

      // Critical value for χ² with 1 degree of freedom at 95% confidence: 3.841
      // If χ² < 3.841, we cannot reject the null hypothesis (distribution is fair)
      expect(chiSquare).toBeLessThan(3.841);
    });

    // T043: Test shuffle with 4 elements
    test('produces fair distribution for 4-element array', () => {
      const iterations = 1000;
      const array = ['A', 'B', 'C', 'D'];
      const positionCounts = [
        { A: 0, B: 0, C: 0, D: 0 }, // Position 0
        { A: 0, B: 0, C: 0, D: 0 }, // Position 1
        { A: 0, B: 0, C: 0, D: 0 }, // Position 2
        { A: 0, B: 0, C: 0, D: 0 } // Position 3
      ];

      for (let i = 0; i < iterations; i++) {
        const seed = `test-seed-${i}`;
        const shuffled = shuffle(array, seed);
        shuffled.forEach((element, position) => {
          positionCounts[position][element]++;
        });
      }

      // Each element should appear ~25% of the time at each position (250 times out of 1000)
      const expectedCount = iterations / 4; // 250
      const tolerance = 50; // ±50 (200-300 range)

      positionCounts.forEach((counts, position) => {
        Object.entries(counts).forEach(([element, count]) => {
          expect(count).toBeGreaterThanOrEqual(expectedCount - tolerance);
          expect(count).toBeLessThanOrEqual(expectedCount + tolerance);
        });
      });
    });
  });

  describe('placeFourSeeds() randomization fairness', () => {
    // T044: Verify seeds 3-4 are fairly distributed
    test('distributes seeds 3-4 fairly across positions 7 and 8', () => {
      const iterations = 1000;
      const bracketSize = 16;
      const seeds = [
        { rank: 1, entityId: 'p1', entityName: 'Player 1' },
        { rank: 2, entityId: 'p2', entityName: 'Player 2' },
        { rank: 3, entityId: 'p3', entityName: 'Player 3' },
        { rank: 4, entityId: 'p4', entityName: 'Player 4' }
      ];

      // Count how many times seed 3 appears at position 7 (index 7)
      let seed3AtPosition7 = 0;

      for (let i = 0; i < iterations; i++) {
        const randomSeed = `test-seed-${i}`;
        const positions = placeFourSeeds(bracketSize, seeds, randomSeed);

        if (positions[7].seed === 3) {
          seed3AtPosition7++;
        }
      }

      // Expected: 50% ± tolerance
      const expectedProbability = 0.5;
      const tolerance = 0.05; // 5% tolerance (45%-55%)
      const observedProbability = seed3AtPosition7 / iterations;

      expect(observedProbability).toBeGreaterThanOrEqual(expectedProbability - tolerance);
      expect(observedProbability).toBeLessThanOrEqual(expectedProbability + tolerance);

      // Chi-square test
      const expected = iterations * expectedProbability;
      const observed1 = seed3AtPosition7;
      const observed2 = iterations - seed3AtPosition7;
      const chiSquare =
        Math.pow(observed1 - expected, 2) / expected +
        Math.pow(observed2 - expected, 2) / expected;

      // Critical value for χ² with 1 degree of freedom at 95% confidence: 3.841
      expect(chiSquare).toBeLessThan(3.841);
    });

    // T045: Verify deterministic behavior (same seed = same result)
    test('produces identical results for identical random seeds', () => {
      const bracketSize = 16;
      const seeds = [
        { rank: 1, entityId: 'p1', entityName: 'Player 1' },
        { rank: 2, entityId: 'p2', entityName: 'Player 2' },
        { rank: 3, entityId: 'p3', entityName: 'Player 3' },
        { rank: 4, entityId: 'p4', entityName: 'Player 4' }
      ];

      const randomSeed = 'deterministic-test-seed';

      // Run multiple times with the same seed
      const results = [];
      for (let i = 0; i < 10; i++) {
        const positions = placeFourSeeds(bracketSize, seeds, randomSeed);
        results.push({
          position7Seed: positions[7].seed,
          position8Seed: positions[8].seed,
          position7EntityId: positions[7].entityId,
          position8EntityId: positions[8].entityId
        });
      }

      // All results should be identical
      const firstResult = results[0];
      results.forEach((result) => {
        expect(result).toEqual(firstResult);
      });
    });
  });
});

describe('Randomization Fairness (User Story 3)', () => {
  describe('placeEightSeeds() randomization fairness', () => {
    // T065: Verify seeds 5-8 are fairly distributed across quarters
    test('distributes seeds 5-8 fairly across quarters (chi-square test)', () => {
      const iterations = 1000;
      const bracketSize = 32;
      const seeds = Array.from({ length: 8 }, (_, i) => ({
        rank: i + 1,
        entityId: `p${i + 1}`,
        entityName: `Player ${i + 1}`
      }));

      // Count occurrences of each seed in each quarter
      // For 32-player bracket: free positions at indices 3, 11, 19, 27 (quarters 0, 1, 2, 3)
      const quarterCounts = {
        5: [0, 0, 0, 0], // Seed 5 in quarters 0,1,2,3
        6: [0, 0, 0, 0],
        7: [0, 0, 0, 0],
        8: [0, 0, 0, 0]
      };

      for (let i = 0; i < iterations; i++) {
        const randomSeed = `test-seed-${i}`;
        const positions = placeEightSeeds(bracketSize, seeds, randomSeed);

        // Find which quarter each seed 5-8 landed in
        positions
          .filter((p) => p.seed >= 5 && p.seed <= 8)
          .forEach((p) => {
            const quarter = Math.floor(p.positionIndex / 8); // 32/4 = 8 positions per quarter
            quarterCounts[p.seed][quarter]++;
          });
      }

      // Each seed should appear ~25% of the time in each quarter (250 times out of 1000)
      const expectedCount = iterations / 4; // 250
      const tolerance = 60; // ±60 (190-310 range)

      Object.entries(quarterCounts).forEach(([seed, counts]) => {
        counts.forEach((count, quarter) => {
          expect(count).toBeGreaterThanOrEqual(expectedCount - tolerance);
          expect(count).toBeLessThanOrEqual(expectedCount + tolerance);
        });
      });

      // Chi-square test for each seed across quarters
      Object.entries(quarterCounts).forEach(([seed, counts]) => {
        const expected = expectedCount;
        let chiSquare = 0;
        counts.forEach((observed) => {
          chiSquare += Math.pow(observed - expected, 2) / expected;
        });
        // Critical value for χ² with 3 degrees of freedom at 95% confidence: 7.815
        expect(chiSquare).toBeLessThan(7.815);
      });
    });

    // T066: Test deterministic behavior
    test('produces identical results for identical random seeds', () => {
      const bracketSize = 32;
      const seeds = Array.from({ length: 8 }, (_, i) => ({
        rank: i + 1,
        entityId: `p${i + 1}`,
        entityName: `Player ${i + 1}`
      }));

      const randomSeed = 'deterministic-test-seed-8';

      // Run multiple times with the same seed
      const results = [];
      for (let i = 0; i < 10; i++) {
        const positions = placeEightSeeds(bracketSize, seeds, randomSeed);
        const seed5To8Positions = [3, 11, 19, 27].map((idx) => ({
          index: idx,
          seed: positions[idx].seed,
          entityId: positions[idx].entityId
        }));
        results.push(seed5To8Positions);
      }

      // All results should be identical
      const firstResult = results[0];
      results.forEach((result) => {
        expect(result).toEqual(firstResult);
      });
    });
  });
});

describe('Randomization Fairness (User Story 4)', () => {
  describe('placeSixteenSeeds() randomization fairness', () => {
    // T092: Verify seeds 9-16 are fairly distributed across eighths
    test('distributes seeds 9-16 fairly across eighths (chi-square test)', () => {
      const iterations = 1000;
      const bracketSize = 64;
      const seeds = Array.from({ length: 16 }, (_, i) => ({
        rank: i + 1,
        entityId: `p${i + 1}`,
        entityName: `Player ${i + 1}`
      }));

      // Count occurrences of each seed in each eighth
      // For 64-player bracket: free positions at indices 3, 11, 19, 27, 35, 43, 51, 59
      const eighthCounts = {
        9: [0, 0, 0, 0, 0, 0, 0, 0], // Seed 9 in eighths 0-7
        10: [0, 0, 0, 0, 0, 0, 0, 0],
        11: [0, 0, 0, 0, 0, 0, 0, 0],
        12: [0, 0, 0, 0, 0, 0, 0, 0],
        13: [0, 0, 0, 0, 0, 0, 0, 0],
        14: [0, 0, 0, 0, 0, 0, 0, 0],
        15: [0, 0, 0, 0, 0, 0, 0, 0],
        16: [0, 0, 0, 0, 0, 0, 0, 0]
      };

      for (let i = 0; i < iterations; i++) {
        const randomSeed = `test-seed-${i}`;
        const positions = placeSixteenSeeds(bracketSize, seeds, randomSeed);

        // Find which eighth each seed 9-16 landed in
        positions
          .filter((p) => p.seed >= 9 && p.seed <= 16)
          .forEach((p) => {
            const eighth = Math.floor(p.positionIndex / 8); // 64/8 = 8 positions per eighth
            eighthCounts[p.seed][eighth]++;
          });
      }

      // Each seed should appear ~12.5% of the time in each eighth (125 times out of 1000)
      const expectedCount = iterations / 8; // 125
      const tolerance = 40; // ±40 (85-165 range)

      Object.entries(eighthCounts).forEach(([seed, counts]) => {
        counts.forEach((count, eighth) => {
          expect(count).toBeGreaterThanOrEqual(expectedCount - tolerance);
          expect(count).toBeLessThanOrEqual(expectedCount + tolerance);
        });
      });

      // Chi-square test for each seed across eighths
      Object.entries(eighthCounts).forEach(([seed, counts]) => {
        const expected = expectedCount;
        let chiSquare = 0;
        counts.forEach((observed) => {
          chiSquare += Math.pow(observed - expected, 2) / expected;
        });
        // Critical value for χ² with 7 degrees of freedom at 95% confidence: 14.067
        expect(chiSquare).toBeLessThan(14.067);
      });
    });

    // T093: Test deterministic behavior
    test('produces identical results for identical random seeds', () => {
      const bracketSize = 64;
      const seeds = Array.from({ length: 16 }, (_, i) => ({
        rank: i + 1,
        entityId: `p${i + 1}`,
        entityName: `Player ${i + 1}`
      }));

      const randomSeed = 'deterministic-test-seed-16';

      // Run multiple times with the same seed
      const results = [];
      for (let i = 0; i < 10; i++) {
        const positions = placeSixteenSeeds(bracketSize, seeds, randomSeed);
        const seed9To16Positions = [3, 11, 19, 27, 35, 43, 51, 59].map((idx) => ({
          index: idx,
          seed: positions[idx].seed,
          entityId: positions[idx].entityId
        }));
        results.push(seed9To16Positions);
      }

      // All results should be identical
      const firstResult = results[0];
      results.forEach((result) => {
        expect(result).toEqual(firstResult);
      });
    });
  });
});
