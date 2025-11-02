# Tasks: Tournament Category System

**Input**: Design documents from `/specs/002-category-system/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL for this feature (not explicitly requested in specification). Test framework (Jest) selected in research phase but test tasks are omitted per constitution principle IV.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This project follows web application structure:
- Backend: `backend/src/`, `backend/prisma/`
- Frontend: `frontend/src/`
- Tests: `backend/tests/` (if added later)

---

## Implementation Notes & Changes

### Age Calculation Adjustment (2025-11-01)

**Change**: Updated age calculation to use calendar year only, not exact birthdate.

**Reason**: Tournament registration standard - players should be eligible from January 1st of the year they turn the required age, regardless of their exact birthdate.

**Implementation**:
- Age = current year - birth year (no month/day consideration)
- Example: Player born Dec 31, 1988 is considered 37 years old for entire 2025 calendar year
- Updated in: `backend/src/services/registrationService.js` (calculateAge function)

**Specifications Updated**:
- `spec.md`: Updated FR-008 and Assumptions section
- `contracts/registration-api.md`: Updated Eligibility Validation and Business Rules sections

**Impact**: Simpler administration, clear eligibility windows, matches standard tournament practice

### Tournament Category Change Rule (2025-11-01)

**Change**: Updated tournament category change rule from "immutable after creation" to "can be changed if all registered players remain eligible".

**Reason**: Organizers need flexibility to adjust categories when facing low participation or player injuries. The original immutability rule was too restrictive for real-world tournament management scenarios.

**Implementation**:
- Added `validateRegisteredPlayersForNewCategory()` function in `backend/src/services/tournamentService.js`
- Validates all ACTIVE and SUSPENDED registrations against new category requirements
- Uses existing `checkEligibility()` function from registrationService
- Returns detailed list of ineligible players with specific reasons (age, gender, profile)
- Rejects change if any registered player would be ineligible

**Specifications Updated**:
- `spec.md`: Updated FR-006 business rule
- `contracts/tournament-api.md`: Updated endpoint documentation, error responses, and business rules
- `backend/src/middleware/validate.js`: Added categoryId to tournamentUpdate schema

**Impact**: Increased organizer flexibility while maintaining eligibility integrity and player safety

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify project structure and prepare for category system implementation

- [x] T001 Verify backend project structure exists with Express, Prisma, and required dependencies
- [x] T002 [P] Verify frontend project structure exists (note: frontend framework TBD in implementation)
- [x] T003 [P] Review existing authentication/authorization middleware in backend/src/middleware/
- [x] T004 Review existing Prisma schema in backend/prisma/schema.prisma for PlayerProfile structure

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend data model and create migrations - MUST be complete before ANY user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Extend Prisma schema with CategoryType enum (SINGLES, DOUBLES) in backend/prisma/schema.prisma
- [x] T006 [P] Extend Prisma schema with AgeGroup enum (ALL_AGES, AGE_20...AGE_80) in backend/prisma/schema.prisma
- [x] T007 [P] Extend Prisma schema with Gender enum (MEN, WOMEN, MIXED) in backend/prisma/schema.prisma
- [x] T008 [P] Extend Prisma schema with RegistrationStatus enum (ACTIVE, WITHDRAWN, SUSPENDED) in backend/prisma/schema.prisma
- [x] T009 [P] Extend Prisma schema with TournamentStatus enum (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED) in backend/prisma/schema.prisma
- [x] T010 Extend PlayerProfile model with birthDate (DateTime?) and gender (Gender?) fields in backend/prisma/schema.prisma
- [x] T011 [P] Create Category model with unique constraint on [type, ageGroup, gender] in backend/prisma/schema.prisma
- [x] T012 [P] Create Tournament model with categoryId foreign key in backend/prisma/schema.prisma
- [x] T013 [P] Create CategoryRegistration model with unique constraint on [playerId, categoryId] in backend/prisma/schema.prisma
- [x] T014 [P] Create CategoryRanking model with unique constraint on [playerId, categoryId] in backend/prisma/schema.prisma
- [x] T015 Add indexes to all models per data-model.md specifications in backend/prisma/schema.prisma
- [x] T016 Generate Prisma migration with `npx prisma migrate dev --name add-category-system`
- [x] T017 Generate updated Prisma Client with `npx prisma generate`
- [x] T018 [P] Create seed data for common categories in backend/prisma/seed.js
- [x] T019 [P] Update PlayerProfile seed data to include birthDate and gender in backend/prisma/seed.js

**Checkpoint**: Foundation ready - Prisma schema extended, migrations created, user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create Standard Tournament Categories (Priority: P1) 🎯 MVP

**Goal**: Allow organizers to create categories by combining type, age group, and gender

**Independent Test**: Organizer can create "Men's Singles 35+" category, system prevents duplicate creation, category name is auto-generated correctly

### Implementation for User Story 1

- [x] T020 [P] [US1] Create categoryService.js with category creation logic in backend/src/services/categoryService.js
- [x] T021 [P] [US1] Create categoryController.js with create category endpoint handler in backend/src/api/categoryController.js
- [x] T022 [US1] Implement category name generation logic (e.g., "Men's Singles 35+") in backend/src/services/categoryService.js
- [x] T023 [US1] Implement duplicate prevention check using unique constraint in backend/src/services/categoryService.js
- [x] T024 [US1] Create Joi validation schema for category creation request in backend/src/middleware/validate.js
- [x] T025 [US1] Implement GET /api/v1/categories endpoint (list all categories) in backend/src/api/categoryController.js
- [x] T026 [US1] Implement GET /api/v1/categories/:id endpoint (get category by ID) in backend/src/api/categoryController.js
- [x] T027 [US1] Implement POST /api/v1/categories endpoint (create category) in backend/src/api/categoryController.js
- [x] T028 [US1] Implement PATCH /api/v1/categories/:id endpoint (update description only) in backend/src/api/categoryController.js
- [x] T029 [US1] Implement DELETE /api/v1/categories/:id endpoint (with tournament check) in backend/src/api/categoryController.js
- [x] T030 [US1] Implement GET /api/v1/categories/:id/stats endpoint (category statistics) in backend/src/api/categoryController.js
- [x] T031 [US1] Create categoryRoutes.js with all category endpoints in backend/src/api/routes/categoryRoutes.js
- [x] T032 [US1] Add authorization checks (ADMIN/ORGANIZER for create/update/delete) in backend/src/middleware/authorize.js
- [x] T033 [US1] Register category routes in backend/src/index.js
- [x] T034 [US1] Add error handling for duplicate category errors (409) in backend/src/api/categoryController.js
- [x] T035 [US1] Add error handling for category in use errors (409) in backend/src/api/categoryController.js
- [x] T036 [US1] Add logging for category operations using Winston in backend/src/services/categoryService.js

**Checkpoint**: At this point, organizers can create, list, view, update, and delete categories. Category names are auto-generated, duplicates are prevented. User Story 1 is fully functional.

---

## Phase 4: User Story 2 - Assign Tournament to Category (Priority: P1)

**Goal**: Allow organizers to create tournaments and assign them to exactly one category

**Independent Test**: Organizer can create tournament assigned to "Men's Singles 35+" category, tournament displays category info, cannot change category after creation

### Implementation for User Story 2

- [x] T037 [P] [US2] Create tournamentService.js with tournament creation logic in backend/src/services/tournamentService.js
- [x] T038 [P] [US2] Create tournamentController.js with tournament endpoint handlers in backend/src/api/tournamentController.js
- [x] T039 [US2] Implement tournament-category assignment validation (categoryId must exist) in backend/src/services/tournamentService.js
- [x] T040 [US2] Create Joi validation schema for tournament creation request in backend/src/middleware/validate.js
- [x] T041 [US2] Implement POST /api/v1/tournaments endpoint (create tournament with required categoryId) in backend/src/api/tournamentController.js
- [x] T042 [US2] Implement GET /api/v1/tournaments endpoint (list tournaments with category filter) in backend/src/api/tournamentController.js
- [x] T043 [US2] Implement GET /api/v1/tournaments/:id endpoint (get tournament with category details) in backend/src/api/tournamentController.js
- [x] T044 [US2] Implement PATCH /api/v1/tournaments/:id endpoint (update tournament, block categoryId changes) in backend/src/api/tournamentController.js
- [x] T045 [US2] Implement DELETE /api/v1/tournaments/:id endpoint (delete only if SCHEDULED) in backend/src/api/tournamentController.js
- [x] T046 [US2] Create tournamentRoutes.js with all tournament endpoints in backend/src/api/routes/tournamentRoutes.js
- [x] T047 [US2] Add authorization checks (ADMIN/ORGANIZER for create/update, ADMIN only for delete) in backend/src/api/routes/tournamentRoutes.js
- [x] T048 [US2] Register tournament routes in backend/src/index.js
- [x] T049 [US2] Add error handling for invalid categoryId (404) in backend/src/api/tournamentController.js
- [x] T050 [US2] Add error handling for tournament status conflicts (409) in backend/src/api/tournamentController.js
- [x] T051 [US2] Add logging for tournament operations using Winston in backend/src/services/tournamentService.js
- [x] T052 [US2] Update categoryService.js to prevent category deletion if tournaments exist in backend/src/services/categoryService.js

**Checkpoint**: At this point, organizers can create tournaments assigned to categories, tournaments display category information, and categories with tournaments cannot be deleted. User Stories 1 AND 2 are fully functional.

---

## Phase 5: User Story 3 - Validate Player Eligibility for Categories (Priority: P2)

**Goal**: Allow players to register for tournaments with automatic validation based on age and gender rules

**Independent Test**: Eligible player (age 37, male) can register for "Men's Singles 35+", ineligible player (age 32) is rejected with clear error, "All ages" category bypasses age validation

### Implementation for User Story 3

- [x] T053 [P] [US3] Create registrationService.js with eligibility validation logic in backend/src/services/registrationService.js
- [x] T054 [P] [US3] Create registrationController.js with registration endpoint handlers in backend/src/api/registrationController.js
- [x] T055 [US3] Implement age calculation function from birthDate in backend/src/services/registrationService.js
- [x] T056 [US3] Implement age validation logic (player age >= category minimum, or ALL_AGES bypass) in backend/src/services/registrationService.js
- [x] T057 [US3] Implement gender validation logic (player gender matches category, or MIXED allows all) in backend/src/services/registrationService.js
- [x] T058 [US3] Implement profile completeness check (birthDate and gender must be set) in backend/src/services/registrationService.js
- [x] T059 [US3] Implement duplicate registration check in backend/src/services/registrationService.js
- [x] T060 [US3] Create comprehensive validateEligibility function combining all checks in backend/src/services/registrationService.js
- [x] T061 [US3] Create Joi validation schema for registration request in backend/src/middleware/validate.js
- [x] T062 [US3] Implement POST /api/v1/registrations endpoint (register player with validation) in backend/src/api/registrationController.js
- [x] T063 [US3] Implement POST /api/v1/registrations/check-eligibility endpoint (preview eligibility) in backend/src/api/registrationController.js
- [x] T064 [US3] Implement GET /api/v1/registrations/player/:playerId endpoint (player's registrations) in backend/src/api/registrationController.js
- [x] T065 [US3] Implement GET /api/v1/registrations/category/:categoryId endpoint (category's registrations) in backend/src/api/registrationController.js
- [x] T066 [US3] Implement PATCH /api/v1/registrations/:id/withdraw endpoint (soft delete registration) in backend/src/api/registrationController.js
- [x] T067 [US3] Implement PATCH /api/v1/registrations/:id/reactivate endpoint (reactivate with revalidation) in backend/src/api/registrationController.js
- [x] T068 [US3] Create registrationRoutes.js with all registration endpoints in backend/src/api/routes/registrationRoutes.js
- [x] T069 [US3] Add authorization checks (ADMIN/ORGANIZER can register anyone, PLAYER can self-register only) in backend/src/api/registrationController.js
- [x] T070 [US3] Register registration routes in backend/src/index.js
- [x] T071 [US3] Add error handling for eligibility failures (INELIGIBLE_AGE, INELIGIBLE_GENDER) with detailed messages in backend/src/api/registrationController.js
- [x] T072 [US3] Add error handling for incomplete profile (INCOMPLETE_PROFILE) in backend/src/api/registrationController.js
- [x] T073 [US3] Add error handling for duplicate registration (ALREADY_REGISTERED) in backend/src/api/registrationController.js
- [ ] T074 [US3] Add logging for registration operations and eligibility checks using Winston in backend/src/services/registrationService.js
- [ ] T075 [US3] Add audit logging for all registration validation failures in backend/src/services/auditService.js

**Checkpoint**: At this point, players can register for categories with automatic eligibility validation. Age and gender rules are enforced with 100% accuracy. User Stories 1, 2, AND 3 are fully functional.

---

## Phase 6: User Story 4 - Register Players in Multiple Categories (Priority: P2)

**Goal**: Allow players to register for multiple categories simultaneously

**Independent Test**: Player can register for both "Men's Singles 35+" and "Men's Doubles 35+", bulk registration returns success/failure details for each category

### Implementation for User Story 4

- [x] T076 [US4] Implement POST /api/v1/registrations/bulk endpoint (bulk registration) in backend/src/api/registrationController.js
- [x] T077 [US4] Create bulk registration logic with atomic validation per category in backend/src/services/registrationService.js
- [x] T078 [US4] Implement partial success handling (return successes and failures separately) in backend/src/services/registrationService.js
- [x] T079 [US4] Create Joi validation schema for bulk registration request in backend/src/middleware/validate.js
- [x] T080 [US4] Add error handling for bulk registration with detailed per-category results in backend/src/api/registrationController.js
- [ ] T081 [US4] Add logging for bulk registration operations in backend/src/services/registrationService.js
- [x] T082 [US4] Update GET /api/v1/registrations/player/:playerId to include all categories with status filter in backend/src/api/registrationController.js
- [x] T083 [US4] Add pagination support to category registrations endpoint in backend/src/api/registrationController.js

**Checkpoint**: At this point, players can register for multiple categories at once. Each registration is validated independently. User Stories 1-4 are fully functional.

---

## Phase 7: User Story 5 - Manage Category-Specific Rankings (Priority: P3)

**Goal**: Allow players and organizers to view rankings specific to each category

**Independent Test**: Category leaderboard displays top 10 players ranked by points, player can view their rank in specific category, rankings are independent across categories

### Implementation for User Story 5

- [x] T084 [P] [US5] Create rankingService.js with ranking calculation logic in backend/src/services/rankingService.js
- [x] T085 [P] [US5] Create rankingController.js with ranking endpoint handlers in backend/src/api/rankingController.js
- [x] T086 [US5] Implement updateCategoryRankings function (calculate points, assign ranks) in backend/src/services/rankingService.js - Placeholder for future tournament result integration
- [x] T087 [US5] Implement ranking upsert logic (update existing, create new rankings) in backend/src/services/rankingService.js - Placeholder for future tournament result integration
- [x] T088 [US5] Implement rank assignment based on points (descending order) in backend/src/services/rankingService.js - Placeholder for future tournament result integration
- [x] T089 [US5] Implement GET /api/v1/rankings/category/:categoryId endpoint (category leaderboard) in backend/src/api/rankingController.js
- [x] T090 [US5] Implement GET /api/v1/rankings/category/:categoryId/player/:playerId endpoint (player's rank in category) in backend/src/api/rankingController.js
- [x] T091 [US5] Implement GET /api/v1/rankings/player/:playerId endpoint (player's rankings across all categories) in backend/src/api/rankingController.js
- [x] T092 [US5] Create rankingRoutes.js with all ranking endpoints (read-only) in backend/src/api/routes/rankingRoutes.js
- [x] T093 [US5] Register ranking routes in backend/src/index.js
- [x] T094 [US5] Add pagination support to ranking endpoints (limit/offset) in backend/src/middleware/validate.js
- [x] T095 [US5] Add error handling for non-ranked players (NOT_RANKED) in backend/src/api/rankingController.js
- [ ] T096 [US5] Add logging for ranking updates using Winston in backend/src/services/rankingService.js
- [ ] T097 [US5] Document ranking update trigger points (called after tournament completion) in backend/src/services/rankingService.js

**Checkpoint**: All user stories are now fully functional. Rankings are category-specific and calculated independently.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final validation

- [ ] T098 [P] Add comprehensive error response formatting across all controllers in backend/src/middleware/errorHandler.js
- [ ] T099 [P] Validate all Joi schemas have consistent error messages in backend/src/api/
- [ ] T100 [P] Review and optimize database queries for N+1 issues in backend/src/services/
- [ ] T101 [P] Add request rate limiting for registration endpoints in backend/src/middleware/rateLimiter.js
- [ ] T102 [P] Update audit logging to capture all category/registration/ranking operations in backend/src/services/auditService.js
- [x] T103 Verify all API endpoints return consistent response format per contracts/ in backend/src/api/
- [x] T104 Verify all unique constraints and indexes are properly implemented in backend/prisma/schema.prisma
- [x] T105 Run database migration on fresh database and verify seed data in backend/prisma/
- [x] T106 [P] Update API documentation with all new endpoints in specs/002-category-system/contracts/
- [x] T107 Run through quickstart.md workflows and verify all curl examples work in specs/002-category-system/quickstart.md
- [x] T108 Verify constitution compliance (all user stories independently testable) per specs/002-category-system/spec.md
- [x] T109 [P] Add frontend placeholder pages for future implementation (CategoryManagement.jsx, TournamentSetup.jsx, PlayerRegistration.jsx) in frontend/src/pages/
- [x] T110 Update CLAUDE.md with category system implementation notes in CLAUDE.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User Story 1 (P1): Independent, can start after Foundational
  - User Story 2 (P1): Independent, can start after Foundational (uses Category model from US1 but doesn't depend on US1 implementation)
  - User Story 3 (P2): Independent, can start after Foundational (uses Category model but doesn't depend on US1/US2 implementation)
  - User Story 4 (P2): Extends US3 registration logic (should implement after US3)
  - User Story 5 (P3): Independent, can start after Foundational (uses CategoryRegistration but doesn't depend on US3/US4)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (Phase 3)**: No dependencies on other stories - can start after Foundational
- **User Story 2 (Phase 4)**: No dependencies on other stories - can start after Foundational (references Category model)
- **User Story 3 (Phase 5)**: No dependencies on other stories - can start after Foundational (references Category model)
- **User Story 4 (Phase 6)**: Soft dependency on User Story 3 (extends registration endpoints) - recommended to complete US3 first
- **User Story 5 (Phase 7)**: No dependencies on other stories - can start after Foundational (references CategoryRegistration model)

### Within Each User Story

- **Services before Controllers**: Service logic must exist before controller endpoints
- **Routes after Controllers**: Route registration depends on controller implementation
- **Validation before Implementation**: Joi schemas should be defined with controllers
- **Error handling after Core Logic**: Add error handling after basic implementation works

### Parallel Opportunities

**Setup Phase**: T002, T003 can run in parallel

**Foundational Phase**:
- T005-T009 (all enum definitions) can run in parallel
- T010-T014 (all model definitions) can run in parallel after enums complete
- T018-T019 (seed data) can run in parallel

**Within User Story 1**: T020-T021 can run in parallel (service + controller creation)

**Within User Story 2**: T037-T038 can run in parallel (service + controller creation)

**Within User Story 3**: T053-T054 can run in parallel (service + controller creation)

**Within User Story 5**: T084-T085 can run in parallel (service + controller creation)

**Polish Phase**: T098-T102, T106, T109-T110 can run in parallel

---

## Parallel Example: User Story 1 (Create Categories)

```bash
# Parallel: Create service and controller files together
Task T020: "Create categoryService.js with category creation logic in backend/src/services/categoryService.js"
Task T021: "Create categoryController.js with create category endpoint handler in backend/src/api/categoryController.js"

# Sequential: Implement service logic, then controller endpoints
Task T022-T023: Service logic implementation
Task T024-T030: Controller endpoint implementation
Task T031: Route creation (depends on controller)
Task T032-T036: Authorization, error handling, logging (can be parallel)
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (verify existing structure)
2. Complete Phase 2: Foundational (extend Prisma schema, create migrations) - **CRITICAL**
3. Complete Phase 3: User Story 1 (create categories)
4. Complete Phase 4: User Story 2 (assign tournaments)
5. **STOP and VALIDATE**: Test that organizers can create categories and assign tournaments
6. Deploy/demo if ready - **This is the MVP!**

### Incremental Delivery (Recommended)

1. **Setup + Foundational** → Foundation ready (Prisma schema extended)
2. **Add User Story 1** → Organizers can create categories → Test independently
3. **Add User Story 2** → Organizers can create tournaments → Test independently → **Deploy (MVP)**
4. **Add User Story 3** → Players can register with validation → Test independently → Deploy
5. **Add User Story 4** → Bulk registration works → Test independently → Deploy
6. **Add User Story 5** → Rankings available → Test independently → Deploy
7. **Polish** → Final quality improvements → Deploy

Each user story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers after Foundational phase completes:

- **Developer A**: User Story 1 (categories) + User Story 2 (tournaments)
- **Developer B**: User Story 3 (registration validation) + User Story 4 (bulk registration)
- **Developer C**: User Story 5 (rankings)
- **All**: Polish phase together

---

## Success Metrics

### Task Coverage

- **Total Tasks**: 110
- **User Story 1**: 17 tasks (T020-T036)
- **User Story 2**: 16 tasks (T037-T052)
- **User Story 3**: 23 tasks (T053-T075)
- **User Story 4**: 8 tasks (T076-T083)
- **User Story 5**: 14 tasks (T084-T097)
- **Setup**: 4 tasks (T001-T004)
- **Foundational**: 15 tasks (T005-T019)
- **Polish**: 13 tasks (T098-T110)

### Parallel Tasks

- Setup Phase: 3 parallel opportunities
- Foundational Phase: 14 parallel opportunities
- User Story 1: 2 parallel opportunities
- User Story 2: 2 parallel opportunities
- User Story 3: 2 parallel opportunities
- User Story 5: 2 parallel opportunities
- Polish Phase: 7 parallel opportunities

### Independent Test Criteria

Each user story has clear independent test criteria documented in phase headers.

### MVP Scope

**Recommended MVP**: User Stories 1 + 2 (17 + 16 = 33 tasks after Setup + Foundational)

This delivers the core value: organizers can create categories and assign tournaments to them.

---

## Notes

- **[P] tasks**: Different files, no dependencies, can run in parallel
- **[Story] label**: Maps task to specific user story for traceability
- **Tests omitted**: Per constitution principle IV, tests are optional (not requested in spec)
- **Frontend tasks deferred**: Frontend implementation requires framework selection (React+Vite recommended in research.md)
- **Each user story independently testable**: Can validate story completion before moving to next priority
- **Commit strategy**: Commit after each task or logical group of related tasks
- **All file paths are absolute**: Follow backend/ and frontend/ structure
- **Follow quickstart.md**: Use curl examples to validate each endpoint after implementation
