# Research: Tournament Seeding Placement

**Feature**: 010-seeding-placement
**Date**: 2026-01-13
**Purpose**: Technical research and feasibility analysis for recursive seeding placement algorithm

## Research Questions

1. How to implement recursive seeding placement algorithm (2→4→8→16 seeds)?
2. How to implement deterministic randomization for testing reproducibility?
3. How to integrate with feature 008 (rankings) and feature 009 (bracket structure)?
4. How to validate randomization fairness in automated tests?
5. How to calculate bracket positions accounting for byes and preliminary matches?

---

## Decision 1: Recursive Seeding Placement Algorithm

**Decision**: Implement recursive function that places seeds in phases: place_2_seeds() → place_4_seeds() → place_8_seeds() → place_16_seeds()

**Rationale**:
- Feature spec explicitly requires recursive algorithm (FR-003: "apply 2-seed placement rules before any higher-seed placement")
- Each seeding level builds on previous: 4-seed calls 2-seed first, 8-seed calls 4-seed first, etc.
- Matches real-world tournament seeding practices where top 2 seeds are always at opposite ends
- Simplifies testing: can test each level independently and verify composition

**Algorithm Structure**:
```javascript
function placeTwoSeeds(bracketSize, seeds) {
  // Place 1st seed at position 1 (top)
  // Place 2nd seed at position bracketSize (bottom)
  return positions;
}

function placeFourSeeds(bracketSize, seeds, randomSeed) {
  // First, place top 2 seeds using placeTwoSeeds()
  let positions = placeTwoSeeds(bracketSize, seeds.slice(0, 2));

  // Randomize order of 3rd and 4th seeds
  const [third, fourth] = shuffle([seeds[2], seeds[3]], randomSeed);

  // Place at bottom of first half and top of second half
  const halfSize = bracketSize / 2;
  positions[halfSize] = third;      // Bottom of first half
  positions[halfSize + 1] = fourth; // Top of second half

  return positions;
}

function placeEightSeeds(bracketSize, seeds, randomSeed) {
  // First, place top 4 seeds using placeFourSeeds()
  let positions = placeFourSeeds(bracketSize, seeds.slice(0, 4), randomSeed);

  // Divide bracket into quarters
  // Randomize and place seeds 5-8 in free quarter positions
  // (positions not occupied by seeds 1-4)

  return positions;
}

function placeSixteenSeeds(bracketSize, seeds, randomSeed) {
  // First, place top 8 seeds using placeEightSeeds()
  let positions = placeEightSeeds(bracketSize, seeds.slice(0, 8), randomSeed);

  // Divide bracket into eighths
  // Randomize and place seeds 9-16 in free eighth positions

  return positions;
}
```

**Alternatives Considered**:
- **Iterative approach**: Rejected because spec explicitly requires recursive logic
- **Lookup table**: Rejected because doesn't scale and isn't maintainable for different bracket sizes
- **External library**: Rejected because algorithm is domain-specific and not standardized

---

## Decision 2: Deterministic Randomization with Seedable PRNG

**Decision**: Use `seedrandom` npm package for deterministic pseudo-random number generation in tests

**Rationale**:
- FR-017 explicitly requires deterministic randomization for testing reproducibility
- Need to verify randomization fairness (FR-016) across multiple test runs
- Must be able to reproduce specific random orderings for debugging
- `seedrandom` is widely used, well-tested, and provides drop-in replacement for Math.random()

**Implementation**:
```javascript
import seedrandom from 'seedrandom';

// Production: use crypto.randomBytes for true randomness
function getRandomSeed() {
  return crypto.randomBytes(16).toString('hex');
}

// Testing: use deterministic seed
function shuffle(array, seed) {
  const rng = seedrandom(seed);
  const result = [...array];

  // Fisher-Yates shuffle with seeded RNG
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}
```

**Testing Pattern**:
```javascript
// Test with fixed seed for reproducibility
test('4-seed placement with seed "test123" produces specific order', () => {
  const result = placeFourSeeds(16, [1,2,3,4], 'test123');
  expect(result).toEqual(expectedOrder);
});

// Test randomization fairness with multiple seeds
test('randomization produces fair distribution', () => {
  const results = { firstHalf: 0, secondHalf: 0 };

  for (let i = 0; i < 1000; i++) {
    const placement = placeFourSeeds(16, [1,2,3,4], `seed${i}`);
    // Count where 3rd seed ends up
    if (placement[8] === 3) results.firstHalf++;
    if (placement[9] === 3) results.secondHalf++;
  }

  // Should be approximately 50/50 (allow 5% variance)
  expect(results.firstHalf).toBeGreaterThan(450);
  expect(results.firstHalf).toBeLessThan(550);
});
```

**Alternatives Considered**:
- **Math.random()**: Rejected because not deterministic, can't reproduce test failures
- **Custom LCG**: Rejected because reinventing the wheel, not worth maintenance burden
- **Mock Math.random**: Rejected because doesn't work well with ES modules

**Dependencies**:
- `seedrandom` v3.0.5+ (MIT license, 3.4KB, widely used)

---

## Decision 3: Integration with Features 008 and 009

**Decision**: Use service-to-service calls for integration (seedingPlacementService → rankingService → bracketService)

**Rationale**:
- Feature 008 provides ranking data via existing rankingService
- Feature 009 provides bracket structure via existing bracketService
- Service layer pattern already established in BATL codebase
- Clean separation of concerns: seeding service focuses only on placement logic

**Integration Points**:

### With Feature 008 (Rankings):
```javascript
// Get top N ranked players/pairs for category
import { getRankingEntries } from '../services/rankingService.js';

async function getSeededPlayers(categoryId, seedCount) {
  // Fetch top N players from category rankings
  const rankings = await getRankingEntries(categoryId, {
    limit: seedCount,
    orderBy: 'rank'
  });

  return rankings.map(entry => ({
    entityId: entry.playerId || entry.pairId,
    entityType: entry.playerId ? 'PLAYER' : 'PAIR',
    rank: entry.rank,
    name: entry.name
  }));
}
```

### With Feature 009 (Bracket Structure):
```javascript
// Get bracket structure template
import { getBracketStructure } from '../services/bracketService.js';

async function generateSeededBracket(playerCount, categoryId) {
  // Get bracket structure (size, byes, preliminary matches)
  const structure = await getBracketStructure(playerCount);

  // Determine seed count based on player count
  const seedCount = getSeedCount(playerCount);

  // Get top N ranked players
  const seededPlayers = await getSeededPlayers(categoryId, seedCount);

  // Apply seeding placement algorithm
  const positions = placeSeeds(structure.bracketSize, seededPlayers, seedCount);

  return {
    bracketSize: structure.bracketSize,
    structure: structure.structure,
    positions: positions,
    seededCount: seedCount
  };
}
```

**Alternatives Considered**:
- **Direct database queries**: Rejected because duplicates logic from features 008/009
- **Shared data models only**: Rejected because doesn't encapsulate business logic
- **GraphQL federation**: Rejected because overkill for internal service calls

---

## Decision 4: Randomization Fairness Validation

**Decision**: Use chi-square goodness-of-fit test with 1000+ iterations to validate randomization fairness

**Rationale**:
- Need to verify that randomization doesn't favor specific positions (FR-016)
- Statistical test provides objective measure of fairness
- 1000 iterations provides sufficient sample size for chi-square test
- Can validate each seeding level (4, 8, 16 seeds) independently

**Test Implementation**:
```javascript
function chiSquareTest(observed, expected, degreesOfFreedom) {
  let chiSquare = 0;
  for (let i = 0; i < observed.length; i++) {
    chiSquare += Math.pow(observed[i] - expected[i], 2) / expected[i];
  }

  // For df=1, α=0.05, critical value is 3.841
  // If χ² < 3.841, distribution is fair (fail to reject null hypothesis)
  return chiSquare < 3.841;
}

test('4-seed randomization is fair', () => {
  const iterations = 1000;
  const positions = { firstHalf: 0, secondHalf: 0 };

  for (let i = 0; i < iterations; i++) {
    const placement = placeFourSeeds(16, [1,2,3,4], `seed${i}`);
    if (placement[8] === 3) positions.firstHalf++;
    else positions.secondHalf++;
  }

  const observed = [positions.firstHalf, positions.secondHalf];
  const expected = [500, 500]; // Expected 50/50 distribution

  expect(chiSquareTest(observed, expected, 1)).toBe(true);
});
```

**Acceptance Criteria**:
- Chi-square test passes with α=0.05 significance level
- Observed distribution within 5% of expected (450-550 for 1000 iterations)
- Test passes consistently across multiple test suite runs

**Alternatives Considered**:
- **Simple percentage check**: Rejected because doesn't provide statistical rigor
- **Visual inspection**: Rejected because not automatable
- **Kolmogorov-Smirnov test**: Rejected because chi-square more appropriate for categorical data

---

## Decision 5: Bracket Position Calculation with Byes

**Decision**: Position numbers are indices into bracket structure string, accounting for byes and preliminary matches

**Rationale**:
- Feature 009 provides bracket structure as string of "0" and "1" characters
- "0" = preliminary match required, "1" = bye (automatic advancement)
- Position indices directly map to bracket structure string positions
- Seeded players can receive byes (they don't affect seeding position calculation)

**Position Calculation Logic**:
```javascript
function calculateBracketPosition(bracketSize, seedNumber, totalSeeds) {
  // Position 1 = top (index 0)
  // Position N = bottom (index bracketSize-1)

  if (seedNumber === 1) return 0; // Top position
  if (seedNumber === 2) return bracketSize - 1; // Bottom position

  // For seeds 3+, calculate based on segment/quarter logic
  // (implemented in recursive placement functions)
}

// Bracket structure tells us if position is bye or match
function isByePosition(structure, position) {
  return structure[position] === '1';
}

// Seeded players can have byes - this is expected behavior
// Example: 7 players, structure "1000 0101"
//   Position 0 (1st seed) = bye (1)
//   Position 7 (2nd seed) = preliminary match (1)
```

**Example: 11-player bracket**:
```
Structure: "1110 0101" (from feature 009)
Bracket size: 16
Seeded players: 4

Positions:
- Seed 1: Position 0 (has bye "1")
- Seed 2: Position 15 (has bye "1")
- Seed 3: Position 7 or 8 (randomized) - may or may not have bye
- Seed 4: Position 8 or 7 (randomized) - may or may not have bye
```

**Alternatives Considered**:
- **Calculate match tree**: Rejected because feature 009 already provides structure
- **Skip bye positions**: Rejected because violates spec (seeded players can have byes)
- **Custom bracket representation**: Rejected because duplicates feature 009 logic

---

## Feasibility Conclusion

**Overall Assessment**: ✅ **FEASIBLE**

All technical challenges have clear, implementable solutions:
1. Recursive seeding algorithm is straightforward with well-defined rules
2. Deterministic randomization via `seedrandom` provides testing reproducibility
3. Integration with features 008/009 via service layer is clean and maintainable
4. Statistical testing ensures randomization fairness
5. Bracket position calculation leverages existing feature 009 structure

**Dependencies Verified**:
- Feature 008 (tournament-rankings) provides ranking data ✅
- Feature 009 (bracket-generation) provides bracket structure ✅
- `seedrandom` package available and suitable ✅

**Risks Identified**:
- **Low Risk**: Bracket structure interpretation from feature 009 (mitigated by integration tests)
- **Low Risk**: Randomization fairness validation (mitigated by statistical tests)
- **No Risk**: Recursive algorithm complexity (well-defined in spec)

**Next Steps**: Proceed to Phase 1 (Design) - data model, API contracts, quickstart documentation.
