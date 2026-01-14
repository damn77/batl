# Tasks: Tournament Seeding Placement

**Input**: Design documents from `/specs/010-seeding-placement/`
**Prerequisites**: plan.md (✓), spec.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓), quickstart.md (✓)

**Tests**: Tests are explicitly REQUIRED per FR-015, FR-016, FR-017. Test-first development approach mandated by constitution.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/`, `backend/__tests__/`
- **Services**: `backend/src/services/`
- **API**: `backend/src/api/` (controllers, validators, routes)
- **Tests**: `backend/__tests__/unit/`, `backend/__tests__/integration/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency installation

- [x] T001 Install seedrandom dependency (npm install seedrandom@^3.0.5) in backend/
- [x] T002 Verify Jest 30.2.0 configuration supports ES Modules in backend/jest.config.js
- [x] T003 Verify Joi 18.0.1 is available for validation in backend/package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core service infrastructure and validation framework that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create seedingPlacementService.js structure with utility functions in backend/src/services/seedingPlacementService.js
- [x] T005 Implement getSeedCount(playerCount) function to determine seed count (2/4/8/16) based on player count in backend/src/services/seedingPlacementService.js
- [x] T006 Implement createRandomSeed() function using crypto.randomBytes for production randomness in backend/src/services/seedingPlacementService.js
- [x] T007 Implement shuffle(array, seed) function using seedrandom for deterministic randomization in backend/src/services/seedingPlacementService.js
- [x] T008 Create seedingValidator.js with Joi schemas for request validation in backend/src/api/validators/seedingValidator.js
- [x] T009 Add validation schema for generateBracket request (categoryId, playerCount 4-128, optional randomSeed) in backend/src/api/validators/seedingValidator.js
- [x] T010 Create seedingController.js structure in backend/src/api/seedingController.js
- [x] T011 Create seedingRoutes.js structure with POST /api/v1/seeding/generate-bracket route in backend/src/api/routes/seedingRoutes.js
- [x] T012 Register seeding routes in backend/src/index.js at /api/v1/seeding

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Place Two Seeded Players (Priority: P1) 🎯 MVP

**Goal**: Implement foundational 2-seed placement logic for small tournaments (4-9 players)

**Independent Test**: Create a 7-player tournament with 2 seeded players, verify 1st seed at position 1 and 2nd seed at bottom position (position 8). Test without any higher-seed dependencies.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T013 [P] [US1] Create seedingPlacement2Seed.test.js with test structure for 2-seed placement in backend/__tests__/unit/seedingPlacement2Seed.test.js
- [x] T014 [P] [US1] Write test: "places 1st seed at position 1 (top)" in backend/__tests__/unit/seedingPlacement2Seed.test.js
- [x] T015 [P] [US1] Write test: "places 2nd seed at position N (bottom)" for various bracket sizes (8, 16, 32) in backend/__tests__/unit/seedingPlacement2Seed.test.js
- [x] T016 [P] [US1] Write test: "handles 5-player tournament (2 seeds)" in backend/__tests__/unit/seedingPlacement2Seed.test.js
- [x] T017 [P] [US1] Write test: "handles 9-player tournament (2 seeds)" in backend/__tests__/unit/seedingPlacement2Seed.test.js
- [x] T018 [P] [US1] Write test: "2-seed placement with bye positions" in backend/__tests__/unit/seedingPlacement2Seed.test.js
- [x] T019 [P] [US1] Run tests and verify they FAIL before implementation

### Implementation for User Story 1

- [x] T020 [US1] Implement placeTwoSeeds(bracketSize, seeds) function in backend/src/services/seedingPlacementService.js
- [x] T021 [US1] Implement getSeededPlayers(categoryId, seedCount) integration with feature 008 rankingService in backend/src/services/seedingPlacementService.js
- [x] T022 [US1] Implement getBracketStructure(playerCount) integration with feature 009 bracketService in backend/src/services/seedingPlacementService.js
- [x] T023 [US1] Implement createPosition(positionNumber, positionIndex, seed, entity, structure) helper in backend/src/services/seedingPlacementService.js
- [x] T024 [US1] Implement generateSeededBracket(categoryId, playerCount, randomSeed) main function for 2-seed tournaments in backend/src/services/seedingPlacementService.js
- [x] T025 [US1] Implement generateBracket controller handler in backend/src/api/seedingController.js
- [x] T026 [US1] Add error handling for CATEGORY_NOT_FOUND, INSUFFICIENT_RANKINGS in backend/src/api/seedingController.js
- [x] T027 [US1] Run User Story 1 tests and verify they PASS

### Integration Tests for User Story 1

- [x] T028 [P] [US1] Create seedingRoutes.test.js with test structure for API integration in backend/__tests__/integration/seedingRoutes.test.js
- [x] T029 [P] [US1] Write test: "POST /api/v1/seeding/generate-bracket with 7 players returns 2 seeds" in backend/__tests__/integration/seedingRoutes.test.js
- [x] T030 [P] [US1] Write test: "returns 400 for invalid player count (< 4)" in backend/__tests__/integration/seedingRoutes.test.js
- [x] T031 [P] [US1] Write test: "returns 404 for non-existent category" in backend/__tests__/integration/seedingRoutes.test.js
- [x] T032 [P] [US1] Write test: "returns 404 for insufficient rankings" in backend/__tests__/integration/seedingRoutes.test.js
- [x] T033 [US1] Run integration tests and verify they PASS

**Checkpoint**: At this point, User Story 1 should be fully functional - 2-seed placement works for 4-9 player tournaments

---

## Phase 4: User Story 2 - Place Four Seeded Players with Randomization (Priority: P2) ✅ COMPLETE

**Goal**: Extend seeding to medium tournaments (10-19 players) with recursive 2-seed placement first, then randomized 3rd/4th seed placement

**Independent Test**: Create a 15-player tournament with 4 seeded players, verify 1st/2nd follow 2-seed rules, 3rd/4th randomized in bottom-of-first-half and top-of-second-half. Run 100 times to verify ~50/50 distribution.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T034 [P] [US2] Create seedingPlacement4Seed.test.js with test structure for 4-seed placement in backend/__tests__/unit/seedingPlacement4Seed.test.js
- [x] T035 [P] [US2] Write test: "places seeds 1-2 using placeTwoSeeds (recursive)" in backend/__tests__/unit/seedingPlacement4Seed.test.js
- [x] T036 [P] [US2] Write test: "places seeds 3-4 at bottom of first half and top of second half" in backend/__tests__/unit/seedingPlacement4Seed.test.js
- [x] T037 [P] [US2] Write test: "randomizes order of seeds 3-4 with deterministic seed" in backend/__tests__/unit/seedingPlacement4Seed.test.js
- [x] T038 [P] [US2] Write test: "handles 15-player tournament (4 seeds)" in backend/__tests__/unit/seedingPlacement4Seed.test.js
- [x] T039 [P] [US2] Write test: "handles 10-player tournament (4 seeds, minimum for 4-seed)" in backend/__tests__/unit/seedingPlacement4Seed.test.js
- [x] T040 [P] [US2] Write test: "handles 19-player tournament (4 seeds, maximum for 4-seed)" in backend/__tests__/unit/seedingPlacement4Seed.test.js
- [x] T041 [P] [US2] Run tests and verify they FAIL before implementation

### Randomization Fairness Tests for User Story 2

- [x] T042 [P] [US2] Create seedingRandomization.test.js with test structure in backend/__tests__/unit/seedingRandomization.test.js
- [x] T043 [P] [US2] Write test: "4-seed randomization produces fair distribution (1000 iterations)" using chi-square test in backend/__tests__/unit/seedingRandomization.test.js
- [x] T044 [P] [US2] Write test: "same randomSeed produces identical 4-seed placement" in backend/__tests__/unit/seedingRandomization.test.js
- [x] T045 [P] [US2] Run randomization tests and verify they FAIL before implementation

### Implementation for User Story 2

- [x] T046 [US2] Implement placeFourSeeds(bracketSize, seeds, randomSeed) function (calls placeTwoSeeds first) in backend/src/services/seedingPlacementService.js
- [x] T047 [US2] Update generateSeededBracket() to handle 4-seed tournaments (10-19 players) in backend/src/services/seedingPlacementService.js
- [x] T048 [US2] Update seedingInfo response to include randomization note for 4-seed in backend/src/api/seedingController.js
- [x] T049 [US2] Run User Story 2 tests and verify they PASS
- [x] T050 [US2] Run randomization fairness tests and verify chi-square test PASSES

### Integration Tests for User Story 2

- [x] T051 [P] [US2] Write test: "POST /api/v1/seeding/generate-bracket with 15 players returns 4 seeds" in backend/__tests__/integration/seedingRoutes.test.js
- [x] T052 [P] [US2] Write test: "deterministic randomSeed produces identical 4-seed brackets" in backend/__tests__/integration/seedingRoutes.test.js
- [x] T053 [P] [US2] Write test: "omitting randomSeed produces different 4-seed brackets on multiple calls" in backend/__tests__/integration/seedingRoutes.test.js
- [x] T054 [US2] Run integration tests and verify they PASS

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - 2-seed and 4-seed placement fully functional

---

## Phase 5: User Story 3 - Place Eight Seeded Players with Quarter Segments (Priority: P3) ✅ COMPLETE

**Goal**: Support larger tournaments (20-39 players) with recursive 4-seed placement first, then randomized 5th-8th seed placement in quarter segments

**Independent Test**: Create a 25-player tournament with 8 seeded players, verify 1st-4th follow 4-seed rules, 5th-8th randomized in free quarter positions. Run 100 times to verify fair distribution across quarters.

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T055 [P] [US3] Create seedingPlacement8Seed.test.js with test structure for 8-seed placement in backend/__tests__/unit/seedingPlacement8Seed.test.js
- [x] T056 [P] [US3] Write test: "places seeds 1-4 using placeFourSeeds (recursive)" in backend/__tests__/unit/seedingPlacement8Seed.test.js
- [x] T057 [P] [US3] Write test: "divides bracket into quarters correctly" in backend/__tests__/unit/seedingPlacement8Seed.test.js
- [x] T058 [P] [US3] Write test: "places seeds 5-8 in free quarter positions" in backend/__tests__/unit/seedingPlacement8Seed.test.js
- [x] T059 [P] [US3] Write test: "randomizes order of seeds 5-8 with deterministic seed" in backend/__tests__/unit/seedingPlacement8Seed.test.js
- [x] T060 [P] [US3] Write test: "handles 25-player tournament (8 seeds)" in backend/__tests__/unit/seedingPlacement8Seed.test.js
- [x] T061 [P] [US3] Write test: "handles 20-player tournament (8 seeds, minimum for 8-seed)" in backend/__tests__/unit/seedingPlacement8Seed.test.js
- [x] T062 [P] [US3] Write test: "handles 39-player tournament (8 seeds, maximum for 8-seed)" in backend/__tests__/unit/seedingPlacement8Seed.test.js
- [x] T063 [P] [US3] Write test: "handles 32-player tournament (power of 2, no byes)" in backend/__tests__/unit/seedingPlacement8Seed.test.js
- [x] T064 [P] [US3] Run tests and verify they FAIL before implementation

### Randomization Fairness Tests for User Story 3

- [x] T065 [P] [US3] Write test: "8-seed randomization produces fair distribution across quarters (1000 iterations)" using chi-square test in backend/__tests__/unit/seedingRandomization.test.js
- [x] T066 [P] [US3] Write test: "same randomSeed produces identical 8-seed placement" in backend/__tests__/unit/seedingRandomization.test.js
- [x] T067 [P] [US3] Run randomization tests and verify they FAIL before implementation

### Implementation for User Story 3

- [x] T068 [US3] Implement placeEightSeeds(bracketSize, seeds, randomSeed) function (calls placeFourSeeds first) in backend/src/services/seedingPlacementService.js
- [x] T069 [US3] Implement quarter segment calculation logic in placeEightSeeds in backend/src/services/seedingPlacementService.js
- [x] T070 [US3] Update generateSeededBracket() to handle 8-seed tournaments (20-39 players) in backend/src/services/seedingPlacementService.js
- [x] T071 [US3] Update seedingInfo response to include quarter segment randomization note in backend/src/api/seedingController.js
- [x] T072 [US3] Run User Story 3 tests and verify they PASS
- [x] T073 [US3] Run randomization fairness tests and verify chi-square test PASSES

### Integration Tests for User Story 3

- [x] T074 [P] [US3] Write test: "POST /api/v1/seeding/generate-bracket with 25 players returns 8 seeds" in backend/__tests__/integration/seedingRoutes.test.js
- [x] T075 [P] [US3] Write test: "POST /api/v1/seeding/generate-bracket with 32 players (power of 2) returns 8 seeds" in backend/__tests__/integration/seedingRoutes.test.js
- [x] T076 [P] [US3] Write test: "deterministic randomSeed produces identical 8-seed brackets" in backend/__tests__/integration/seedingRoutes.test.js
- [x] T077 [US3] Run integration tests and verify they PASS

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently - 2, 4, and 8-seed placement fully functional

---

## Phase 6: User Story 4 - Place Sixteen Seeded Players with Eighth Segments (Priority: P4) ✅ COMPLETE

## Phase 6 (Original): User Story 4 - Place Sixteen Seeded Players with Eight Segments (Priority: P4)

**Goal**: Support maximum tournament size (40-128 players) with recursive 8-seed placement first, then randomized 9th-16th seed placement in eighth segments

**Independent Test**: Create a 64-player tournament with 16 seeded players, verify 1st-8th follow 8-seed rules, 9th-16th randomized in free segment positions. Verify performance < 2 seconds per SC-004.

### Tests for User Story 4

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T078 [P] [US4] Create seedingPlacement16Seed.test.js with test structure for 16-seed placement in backend/__tests__/unit/seedingPlacement16Seed.test.js
- [x] T079 [P] [US4] Write test: "places seeds 1-8 using placeEightSeeds (recursive)" in backend/__tests__/unit/seedingPlacement16Seed.test.js
- [x] T080 [P] [US4] Write test: "divides bracket into eight segments correctly" in backend/__tests__/unit/seedingPlacement16Seed.test.js
- [x] T081 [P] [US4] Write test: "places seeds 9-16 in free eighth positions" in backend/__tests__/unit/seedingPlacement16Seed.test.js
- [x] T082 [P] [US4] Write test: "randomizes order of seeds 9-16 with deterministic seed" in backend/__tests__/unit/seedingPlacement16Seed.test.js
- [x] T083 [P] [US4] Write test: "handles 64-player tournament (16 seeds)" in backend/__tests__/unit/seedingPlacement16Seed.test.js
- [x] T084 [P] [US4] Write test: "handles 40-player tournament (16 seeds, minimum for 16-seed)" in backend/__tests__/unit/seedingPlacement16Seed.test.js
- [x] T085 [P] [US4] Write test: "handles 128-player tournament (16 seeds, maximum supported)" in backend/__tests__/unit/seedingPlacement16Seed.test.js
- [x] T086 [P] [US4] Write test: "handles 100-player tournament (16 seeds)" in backend/__tests__/unit/seedingPlacement16Seed.test.js
- [x] T087 [P] [US4] Write test: "handles 64-player tournament (power of 2, no byes)" in backend/__tests__/unit/seedingPlacement16Seed.test.js
- [x] T088 [P] [US4] Run tests and verify they FAIL before implementation

### Randomization Fairness Tests for User Story 4

- [x] T089 [P] [US4] Write test: "16-seed randomization produces fair distribution across eighths (1000 iterations)" using chi-square test in backend/__tests__/unit/seedingRandomization.test.js
- [x] T090 [P] [US4] Write test: "same randomSeed produces identical 16-seed placement" in backend/__tests__/unit/seedingRandomization.test.js
- [x] T091 [P] [US4] Run randomization tests and verify they FAIL before implementation

### Performance Tests for User Story 4

- [x] T092 [P] [US4] Write test: "128-player bracket generation completes in < 2 seconds" (per SC-004) in backend/__tests__/unit/seedingPlacement16Seed.test.js
- [x] T093 [P] [US4] Run performance test and verify it FAILS before implementation

### Implementation for User Story 4

- [x] T094 [US4] Implement placeSixteenSeeds(bracketSize, seeds, randomSeed) function (calls placeEightSeeds first) in backend/src/services/seedingPlacementService.js
- [x] T095 [US4] Implement eighth segment calculation logic in placeSixteenSeeds in backend/src/services/seedingPlacementService.js
- [x] T096 [US4] Update generateSeededBracket() to handle 16-seed tournaments (40-128 players) in backend/src/services/seedingPlacementService.js
- [x] T097 [US4] Update seedingInfo response to include eighth segment randomization note in backend/src/api/seedingController.js
- [x] T098 [US4] Run User Story 4 tests and verify they PASS
- [x] T099 [US4] Run randomization fairness tests and verify chi-square test PASSES
- [ ] T100 [US4] Run performance test and verify 128-player bracket generation < 2 seconds

### Integration Tests for User Story 4

- [ ] T101 [P] [US4] Write test: "POST /api/v1/seeding/generate-bracket with 64 players returns 16 seeds" in backend/__tests__/integration/seedingRoutes.test.js
- [ ] T102 [P] [US4] Write test: "POST /api/v1/seeding/generate-bracket with 128 players returns 16 seeds" in backend/__tests__/integration/seedingRoutes.test.js
- [ ] T103 [P] [US4] Write test: "POST /api/v1/seeding/generate-bracket with 100 players returns 16 seeds" in backend/__tests__/integration/seedingRoutes.test.js
- [ ] T104 [P] [US4] Write test: "returns 400 for player count > 128" in backend/__tests__/integration/seedingRoutes.test.js
- [ ] T105 [P] [US4] Write test: "deterministic randomSeed produces identical 16-seed brackets" in backend/__tests__/integration/seedingRoutes.test.js
- [ ] T106 [P] [US4] Write test: "128-player bracket generation API response time < 2 seconds" (per SC-004) in backend/__tests__/integration/seedingRoutes.test.js
- [ ] T107 [US4] Run integration tests and verify they PASS

**Checkpoint**: All user stories should now be independently functional - complete seeding system for 2, 4, 8, and 16 seeds

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final validation

- [ ] T108 [P] Add comprehensive JSDoc comments to all public functions in backend/src/services/seedingPlacementService.js
- [ ] T109 [P] Add comprehensive JSDoc comments to controller functions in backend/src/api/seedingController.js
- [ ] T110 [P] Verify all error responses follow BATL API error format in backend/src/api/seedingController.js
- [ ] T111 [P] Add audit logging for bracket generation (ORGANIZER/ADMIN actions) in backend/src/api/seedingController.js
- [ ] T112 [P] Run full test suite (all unit + integration tests) and verify 100% pass rate (per SC-003)
- [ ] T113 [P] Verify test coverage for all seeding variants (2, 4, 8, 16 seeds) is comprehensive (per FR-015)
- [ ] T114 [P] Verify all randomization variants tested (per FR-016)
- [ ] T115 [P] Verify deterministic randomization used throughout tests (per FR-017)
- [ ] T116 Validate quickstart.md examples work end-to-end (curl commands, expected responses)
- [ ] T117 Update CLAUDE.md with feature 010 completion notes and seedrandom dependency
- [ ] T118 Final code review: check for edge cases, error handling, input validation
- [ ] T119 Performance validation: run 128-player bracket generation 10 times, verify all < 2 seconds
- [ ] T120 Run all tests one final time before marking feature complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 2 (P2): Can start after Foundational - Uses US1's placeTwoSeeds but independently testable
  - User Story 3 (P3): Can start after Foundational - Uses US2's placeFourSeeds but independently testable
  - User Story 4 (P4): Can start after Foundational - Uses US3's placeEightSeeds but independently testable
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### Recursive Dependencies (Code Reuse)

While user stories build recursively in code:
- placeFourSeeds() calls placeTwoSeeds()
- placeEightSeeds() calls placeFourSeeds()
- placeSixteenSeeds() calls placeEightSeeds()

They remain independently testable because:
- Each story tests its own seeding logic end-to-end
- Integration tests verify full bracket generation for each seed count
- No cross-story data dependencies or shared state

### Within Each User Story

1. **Tests FIRST** (TDD approach per constitution):
   - Write all unit tests and verify they FAIL
   - Write randomization fairness tests (if applicable) and verify they FAIL
2. **Implementation SECOND**:
   - Implement recursive placement function
   - Update main generateSeededBracket() function
   - Update controller response formatting
3. **Verify Tests PASS**:
   - Run unit tests and verify they PASS
   - Run randomization tests (if applicable) and verify they PASS
4. **Integration Tests**:
   - Write integration tests
   - Run integration tests and verify they PASS
5. **Story Complete**: Move to next priority

### Parallel Opportunities

- **Phase 1 (Setup)**: All 3 tasks can run in parallel
- **Phase 2 (Foundational)**: Tasks T004-T007 (service functions) can run in parallel, T008-T009 (validation) can run in parallel with T010-T012 (controller/routes setup)
- **Within Each User Story**:
  - All test writing tasks marked [P] can run in parallel (different test files)
  - Randomization fairness tests can run in parallel with unit tests (different concerns)
  - Integration tests can run in parallel if they don't share test database state
- **Across User Stories**:
  - Once Foundational phase completes, all 4 user stories CAN be worked on in parallel by different developers
  - However, recursive code dependencies (placeTwoSeeds → placeFourSeeds → placeEightSeeds → placeSixteenSeeds) mean sequential implementation may be simpler
- **Phase 7 (Polish)**: Tasks T108-T115 can run in parallel (different files/concerns)

---

## Parallel Example: User Story 2

```bash
# Launch all test writing tasks for User Story 2 together:
Task T034: "Create seedingPlacement4Seed.test.js with test structure"
Task T035: "Write test: places seeds 1-2 using placeTwoSeeds"
Task T036: "Write test: places seeds 3-4 at bottom/top of halves"
Task T037: "Write test: randomizes order of seeds 3-4"
Task T038: "Write test: handles 15-player tournament"
Task T039: "Write test: handles 10-player tournament"
Task T040: "Write test: handles 19-player tournament"

# And in parallel:
Task T042: "Create seedingRandomization.test.js with test structure"
Task T043: "Write test: 4-seed fairness (1000 iterations, chi-square)"
Task T044: "Write test: same randomSeed produces identical placement"

# After all tests written and verified to FAIL, implement:
Task T046: "Implement placeFourSeeds()"
Task T047: "Update generateSeededBracket() for 4-seed"
Task T048: "Update seedingInfo response for 4-seed"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (install dependencies)
2. Complete Phase 2: Foundational (service structure, validation, routes) - **CRITICAL GATE**
3. Complete Phase 3: User Story 1 (2-seed placement)
4. **STOP and VALIDATE**:
   - Run all US1 tests (should be 100% passing)
   - Test with curl commands from quickstart.md (7-player tournament)
   - Verify 2-seed placement works for 4-9 player tournaments
5. Deploy/demo if ready

**MVP Delivers**: Basic tournament seeding for small tournaments (4-9 players, 2 seeds)

### Incremental Delivery

1. **Foundation** (Phases 1-2): Setup + Core infrastructure → Foundation ready
2. **MVP** (Phase 3): User Story 1 → Test independently → Deploy (2-seed placement)
3. **Iteration 2** (Phase 4): User Story 2 → Test independently → Deploy (add 4-seed with randomization)
4. **Iteration 3** (Phase 5): User Story 3 → Test independently → Deploy (add 8-seed for larger tournaments)
5. **Iteration 4** (Phase 6): User Story 4 → Test independently → Deploy (add 16-seed for maximum tournaments)
6. **Polish** (Phase 7): Final validation and documentation

Each increment adds value without breaking previous functionality.

### Parallel Team Strategy

With multiple developers (if team capacity allows):

1. **Together**: Complete Setup + Foundational (Phases 1-2)
2. **Once Foundational done**:
   - Developer A: User Story 1 (2-seed) - MUST complete first (foundation for recursion)
   - Developer B: Wait for US1 → Start User Story 2 (4-seed)
   - Developer C: Wait for US2 → Start User Story 3 (8-seed)
   - Developer D: Wait for US3 → Start User Story 4 (16-seed)

**Note**: Due to recursive dependencies in code, sequential implementation (US1 → US2 → US3 → US4) may be more practical than parallel development.

### Test-First Approach (Critical)

Per FR-015, FR-016, FR-017 and constitution principle IV:

1. **Write tests FIRST** for each user story
2. **Verify tests FAIL** before writing implementation
3. **Implement feature** to make tests pass
4. **Verify tests PASS** after implementation
5. **Never skip tests** - they are mandatory for this feature

This ensures:
- ✅ Test coverage for all seeding variants (FR-015)
- ✅ Randomization fairness validation (FR-016)
- ✅ Deterministic reproducibility (FR-017)
- ✅ Constitution compliance (Principle IV: Test Accountability)

---

## Success Criteria Validation

After completing all phases, verify:

- **SC-001**: System correctly places seeded players in 100% of bracket generations (run full test suite)
- **SC-002**: Randomization produces ~50/50 distribution (chi-square tests pass for 4, 8, 16 seeds)
- **SC-003**: All seeding variants pass comprehensive test suites with 100% pass rate
- **SC-004**: Bracket generation with 128 players + 16 seeds completes in < 2 seconds
- **SC-005**: API returns valid bracket structure with correct player/pair mappings
- **SC-006**: Organizers can generate seeded brackets for any valid tournament size (4-128) without errors
- **SC-007**: Edge cases handled with appropriate error messages (test integration test suite)

---

## Notes

- **[P] tasks**: Different files, no dependencies - can run in parallel
- **[Story] label**: Maps task to specific user story for traceability (US1, US2, US3, US4)
- **Tests are mandatory**: FR-015, FR-016, FR-017 explicitly require comprehensive test coverage
- **TDD approach required**: Write tests first, verify they fail, then implement
- **Recursive code dependencies**: User stories build on each other in code but remain independently testable
- **Deterministic randomization**: Use seedrandom in all tests for reproducibility
- **Chi-square validation**: Verify randomization fairness with statistical tests
- **Performance target**: < 2 seconds for maximum tournament size (128 players, 16 seeds)
- **Integration points**: Feature 008 (rankings), Feature 009 (bracket structure)
- **Backend-only**: No frontend changes required per spec out-of-scope section
- **Commit frequently**: After each task or logical group for easy rollback
- **Stop at checkpoints**: Validate each user story independently before moving to next priority
