# Testing Patterns

**Analysis Date:** 2026-02-26

## Test Framework

**Runner:**
- Jest 30.2.0 (Node.js backend)
- Config: `backend/jest.config.js`
- No frontend testing framework configured (Vitest mentioned in CLAUDE.md but not implemented)

**Assertion Library:**
- Jest built-in assertions (expect API)

**Run Commands:**
```bash
npm run test              # Run all tests
npm run test:watch       # Watch mode (re-run on file changes)
npm run test:coverage    # Generate coverage report
```

**Coverage Configuration:**
- Directory: `backend/coverage/`
- Collected from: `src/**/*.js`
- Excluded: `src/index.js`, `src/db.js`
- No coverage thresholds enforced

## Test File Organization

**Location:**
- Backend: Separate directory `backend/__tests__/` (not co-located)
- Structure mirrors source: `__tests__/unit/`, `__tests__/integration/`, `__tests__/performance/`
- Frontend: No test files present

**Naming:**
- `.test.js` suffix - e.g., `bracketService.test.js`, `seedingRoutes.test.js`
- Directory structure:
  - `unit/` - Service and utility function tests
  - `integration/` - API endpoint tests (using supertest)
  - `performance/` - Performance/benchmark tests
  - Root level - Service-specific tests that don't fit categories

**Structure:**
```
backend/__tests__/
├── unit/
│   ├── bracketService.test.js
│   ├── bracketTemplates.test.js
│   ├── seedingPlacement2Seed.test.js
│   ├── seedingPlacement4Seed.test.js
│   ├── seedingPlacement8Seed.test.js
│   ├── seedingPlacement16Seed.test.js
│   └── randomizationFairness.test.js
├── integration/
│   ├── bracketRoutes.test.js
│   └── seedingRoutes.test.js
├── performance/
│   └── seedingPerformance.test.js
├── sharedRankingService.test.js
├── sharedTournamentService.test.js
└── tournamentRegistrationService.test.js
```

## Test Structure

**Suite Organization:**
```javascript
describe('bracketService', () => {
  describe('getBracketByPlayerCount', () => {
    it('should return correct bracket structure for 7 players', async () => {
      // Arrange
      if (!bracketService) {
        throw new Error('bracketService not implemented yet');
      }

      // Act
      const result = await bracketService.getBracketByPlayerCount(7);

      // Assert
      expect(result).toBeDefined();
      expect(result.playerCount).toBe(7);
      expect(result.structure).toBe('1000');
      expect(result.preliminaryMatches).toBe(3);
      expect(result.byes).toBe(1);
      expect(result.bracketSize).toBe(8);
    });
  });
});
```

**Patterns:**
- Top-level `describe()` for module/service
- Nested `describe()` for function or feature
- Individual `it()` or `test()` for specific assertion
- Async test support with `async` keyword on test function

**Setup/Teardown:**
- `beforeAll()` - Setup before all tests in suite
- `beforeEach()` - Setup before each test
- `afterAll()` - Cleanup after all tests
- `afterEach()` - Cleanup after each test
- Example:
```javascript
describe('Example', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });
});
```

## Test-First Development Pattern

**Feature 009 (Bracket Generation) & 010 (Seeding Placement):**
- Tests written BEFORE implementation (TDD approach)
- Test file imports module with try-catch to allow graceful failure if not yet implemented:
```javascript
let bracketService;

try {
  const module = await import('../../src/services/bracketService.js');
  bracketService = module;
} catch (error) {
  bracketService = null;
}

describe('bracketService', () => {
  it('should have functionality', async () => {
    if (!bracketService) {
      throw new Error('bracketService not implemented yet');
    }
    // Test code
  });
});
```
- Tests define specification before code exists
- Implementation follows to satisfy tests

## Mocking

**Framework:** Jest built-in mocking (no additional libraries detected)

**Patterns:**
- Service imports tested directly without mocking (integration-style)
- API endpoints tested with `supertest` for HTTP layer:
```javascript
import request from 'supertest';
import app from '../../src/index.js';

describe('POST /api/v1/seeding/generate-bracket', () => {
  test('generates bracket with 7 players', async () => {
    const response = await request(app)
      .post('/api/v1/seeding/generate-bracket')
      .send({
        categoryId: 'test-category-id',
        playerCount: 7
      });

    expect(response.status).toBe(200);
  });
});
```

**What to Mock:**
- Not observed: No mocking of database calls in tests
- Database: Relies on actual Prisma client (integration testing)
- External APIs: Not integrated in test fixtures

**What NOT to Mock:**
- Service functions (tested directly)
- Prisma models (tests interact with real database state)
- Route handlers (tested via supertest)

## Fixtures and Factories

**Test Data:**
- Feature 009 (Bracket): Uses hardcoded test cases in arrays:
```javascript
const testCases = [
  { playerCount: 4, expectedPreliminary: 2, expectedByes: 0, expectedBracketSize: 4 },
  { playerCount: 7, expectedPreliminary: 3, expectedByes: 1, expectedBracketSize: 8 },
  { playerCount: 16, expectedPreliminary: 8, expectedByes: 0, expectedBracketSize: 16 },
  { playerCount: 32, expectedPreliminary: 16, expectedByes: 0, expectedBracketSize: 32 }
];

for (const testCase of testCases) {
  const result = await bracketService.getBracketByPlayerCount(testCase.playerCount);
  expect(result.preliminaryMatches).toBe(testCase.expectedPreliminary);
}
```

- Feature 010 (Seeding): Hardcoded test arrays for placement verification
- No factory pattern or data builders observed
- Seed script in `prisma/seed.js` for database fixtures (not test-specific)

**Location:**
- Test data defined inline in test files
- Template data in `docs/bracket-templates-all.json` (read by service)
- No separate fixtures directory

## Coverage

**Requirements:** No coverage thresholds enforced (feature-based testing)

**View Coverage:**
```bash
npm run test:coverage
# Generates HTML report in backend/coverage/lcov-report/index.html
```

**Current Coverage:**
- Feature 009: 38 tests all passing
- Feature 010: 89 tests all passing
- Features 001-008: Service integration tests (smoke tests)

## Test Types

**Unit Tests:**
- Location: `backend/__tests__/unit/`
- Scope: Individual functions and utilities
- Example: `bracketService.test.js` - Tests bracket calculation functions
- Approach: Direct function calls with expected inputs/outputs
- No database access
- ~50 tests total (across all features)

**Integration Tests:**
- Location: `backend/__tests__/integration/`
- Scope: API endpoints + database interaction
- Example: `seedingRoutes.test.js` - Tests POST /api/v1/seeding/generate-bracket endpoint
- Approach: HTTP requests via supertest + Prisma client
- Verifies: Request validation, service integration, response format
- ~30+ tests total

**E2E Tests:**
- Status: Not implemented
- Frontend lacks test framework setup
- Manual testing via UI browser interaction

**Performance Tests:**
- Location: `backend/__tests__/performance/`
- Example: `seedingPerformance.test.js` - Verifies 16-seed placement completes < 100ms
- Approach: Time measurement within test
- Used for algorithmic performance validation

## Common Patterns

**Async Testing:**
```javascript
it('should load bracket templates', async () => {
  // Mark test function as async
  const result = await bracketService.loadBracketTemplates();

  // Assertions work normally with async results
  expect(result).toBeDefined();
  expect(result.length).toBe(125);
});

// Or use supertest for async HTTP:
test('returns 200 for valid request', async () => {
  const response = await request(app)
    .post('/api/v1/seeding/generate-bracket')
    .send({ categoryId: 'test', playerCount: 15 });

  expect(response.status).toBe(200);
});
```

**Error Testing:**
```javascript
// Test that async function throws
it('should throw error for invalid player count', async () => {
  await expect(bracketService.getBracketByPlayerCount(3))
    .rejects.toThrow();
});

// Test HTTP error response
test('returns 400 for invalid player count', async () => {
  const response = await request(app)
    .post('/api/v1/seeding/generate-bracket')
    .send({ categoryId: 'test-id', playerCount: 3 });

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
  expect(response.body.error.code).toBe('VALIDATION_ERROR');
});
```

**Validation Testing:**
```javascript
test('returns 400 with violations for invalid input', async () => {
  const response = await request(app)
    .post('/api/v1/seeding/generate-bracket')
    .send({ categoryId: 'test', playerCount: 3 });

  expect(response.status).toBe(400);
  expect(response.body.error.details.violations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        field: 'playerCount',
        message: expect.stringContaining('at least 4')
      })
    ])
  );
});
```

**Chi-Square Fairness Testing:**
- Feature 010 includes statistical fairness tests for randomization:
```javascript
describe('Randomization Fairness (008 tests)', () => {
  it('16-seed distribution is fair', () => {
    // Generate multiple seeded brackets and verify even distribution
    const distribution = {};
    for (let i = 0; i < 1000; i++) {
      const seed = `seed-${i}`;
      const bracket = placeSixteenSeeds(..., seed);
      // Track position frequencies
    }
    // Chi-square test that distribution is statistically fair
    expect(chiSquareScore).toBeLessThan(criticalValue);
  });
});
```

## Test Statistics

**Overall Coverage:**
- 31 test files total
- 127+ tests across implemented features
- Focus: Features 009-010 (Bracket & Seeding) with comprehensive test suites
- Features 001-008 with smoke/integration tests

**Feature Test Distribution:**
- Feature 001-008: Service integration tests (~20 tests)
- Feature 009: 38 tests (template validation, service units, integration)
- Feature 010: 89 tests (placement algorithms, fairness, integration)

## Test Execution

**Local Development:**
```bash
# Single run
npm run test

# Watch mode during development
npm run test:watch

# Coverage report
npm run test:coverage
# Open backend/coverage/lcov-report/index.html in browser
```

**CI/CD:**
- Not configured in repository
- Jest configured with `--experimental-vm-modules` flag for ES Modules support

## Known Testing Gaps

**Frontend:**
- No testing framework configured (Vitest mentioned in CLAUDE.md but not set up)
- Components lack unit/integration tests
- Manual testing only via UI

**Integration Tests:**
- Database state assumed to exist (no test database setup)
- Tests for endpoints may fail without valid database state
- Example: Seeding routes test checks for category existence in database

**Mocking:**
- No mocking of external services (API integrations)
- No database mocking (tests use actual Prisma client)

---

*Testing analysis: 2026-02-26*
