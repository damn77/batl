# Tasks: Doubles Pair Management

**Feature**: 006-doubles-pairs
**Branch**: `006-doubles-pairs`
**Input**: Design documents from `/specs/006-doubles-pairs/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: NOT explicitly requested in specification - Tests are OPTIONAL per constitution

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and database schema updates

- [X] T001 Create DoublesPair model in backend/prisma/schema.prisma with fields (id, player1Id, player2Id, categoryId, seedingScore, deletedAt, createdAt, updatedAt) and unique constraint on [player1Id, player2Id, categoryId]
- [X] T002 Create PairRanking model in backend/prisma/schema.prisma with fields (id, pairId, categoryId, rank, points, wins, losses, lastUpdated, createdAt) and unique constraint on [pairId, categoryId]
- [X] T003 Create PairRegistration model in backend/prisma/schema.prisma with fields (id, tournamentId, pairId, status, registrationTimestamp, eligibilityOverride, overrideReason, promotedAt, demotedAt, createdAt, updatedAt) and unique constraint on [tournamentId, pairId]
- [X] T004 Add indexes to DoublesPair model for performance: player1Id+deletedAt, player2Id+deletedAt, categoryId+deletedAt, categoryId+seedingScore+deletedAt
- [X] T005 Add indexes to PairRanking model: categoryId+rank, pairId
- [X] T006 Add indexes to PairRegistration model: tournamentId+status, tournamentId+registrationTimestamp, pairId+status
- [X] T007 Run Prisma migration to create new tables: npx prisma migrate dev --name add-doubles-pairs
- [X] T008 [P] Create error constants file backend/src/utils/pairErrors.js with error codes (SAME_PLAYER, INVALID_CATEGORY, PLAYER_NOT_FOUND, PAIR_NOT_FOUND, INELIGIBLE_PAIR, ALREADY_REGISTERED, etc.)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities and infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T009 Create player ID sorting utility in backend/src/utils/pairHelpers.js with sortPlayerIds(player1Id, player2Id) function that ensures player1Id < player2Id
- [X] T010 [P] Create pair authorization helper in backend/src/middleware/pairAuth.js with canCreatePair(), canRegisterPair(), canManagePairs() functions
- [X] T011 [P] Create eligibility validation base functions in backend/src/utils/eligibility.js with meetsAgeCriteria(), meetsGenderCriteria() reusable validators
- [X] T012 Add pair-related routes to Express app in backend/src/index.js (import and mount pairRoutes, registrationRoutes extensions)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Player Registers Doubles Pair for Tournament (Priority: P1) 🎯 MVP

**Goal**: Enable players to register themselves and a partner for doubles tournaments, with automatic pair creation/reuse and eligibility validation

**Independent Test**: Create two eligible players, navigate to doubles tournament registration, select both players, verify pair is created and registered successfully

### Backend Implementation for User Story 1

- [X] T013 [P] [US1] Create PairService class in backend/src/services/pairService.js with createOrGetPair(player1Id, player2Id, categoryId) method that sorts player IDs, checks for existing pair, creates new or reuses existing
- [X] T014 [P] [US1] Add getPairById(pairId) method to PairService in backend/src/services/pairService.js with includes for player1, player2, category, pairRanking, activeRegistrations
- [X] T015 [P] [US1] Add listPairs(filters) method to PairService in backend/src/services/pairService.js supporting categoryId, playerId, includeDeleted, pagination filters
- [X] T016 [US1] Create PairController in backend/src/api/pairController.js with createPair handler (POST /pairs) that validates request, checks authorization (player must be in pair unless organizer/admin), calls PairService.createOrGetPair
- [X] T017 [US1] Add getPair handler to PairController in backend/src/api/pairController.js (GET /pairs/:id) that retrieves pair details with full relationships
- [X] T018 [US1] Add listPairs handler to PairController in backend/src/api/pairController.js (GET /pairs) that supports filtering by categoryId, playerId with pagination
- [X] T019 [US1] Create pair routes in backend/src/api/routes/pairRoutes.js mounting POST /api/v1/pairs, GET /api/v1/pairs/:id, GET /api/v1/pairs with authentication middleware
- [X] T020 [P] [US1] Add validation for pair creation in PairService: ensure player1Id !== player2Id, both players exist, category exists and is DOUBLES type, return appropriate errors
- [X] T021 [P] [US1] Add initial seeding score calculation in PairService.createOrGetPair that fetches both players' CategoryRanking for the category and sums their points (default 0 if no ranking)
- [X] T022 [US1] Create PairRegistrationService in backend/src/services/pairRegistrationService.js with registerPair(tournamentId, pairId, userId, options) method
- [X] T023 [US1] Add eligibility checking to PairRegistrationService.registerPair that validates both players meet category criteria (age, gender) and neither is registered with different partner
- [X] T024 [US1] Add registration creation logic to PairRegistrationService that checks tournament capacity, creates PairRegistration with REGISTERED or WAITLISTED status
- [X] T025 [US1] Extend existing registration controller in backend/src/api/registrationController.js or create new handlers for POST /api/v1/registrations/pair endpoint
- [X] T026 [US1] Add pair registration route in backend/src/api/routes/registrationRoutes.js for POST /api/v1/registrations/pair with authentication and authorization checks
- [X] T027 [US1] Add validation for duplicate pair registration (same pair, same tournament) returning ALREADY_REGISTERED error in PairRegistrationService

### Frontend Implementation for User Story 1

- [X] T028 [P] [US1] Create pairService API client in frontend/src/services/pairService.js with createPair(player1Id, player2Id, categoryId), getPair(id), listPairs(filters) methods using axios
- [X] T029 [P] [US1] Create PairSelector component in frontend/src/components/PairSelector.jsx with Player 1 and Player 2 dropdown selects, current user pre-selection, validation preventing same player twice
- [X] T030 [US1] Add player list fetching to PairSelector component that loads eligible players for the category from existing player service
- [X] T031 [US1] Add pair lookup/creation logic to PairSelector that checks if pair exists when both players selected, creates new pair if needed, displays pair info
- [X] T032 [US1] Add eligibility validation display to PairSelector that shows warnings if either player doesn't meet category criteria before registration
- [X] T033 [P] [US1] Create PairRegistrationPage in frontend/src/pages/PairRegistrationPage.jsx with tournament selection, PairSelector integration, registration form (Note: implemented as PairRegistrationPage instead of DoublesRegistrationPage)
- [X] T034 [US1] Add pair registration submission to PairRegistrationPage that calls pairService.registerPair and handles success/error responses with user feedback
- [ ] T035 [US1] Modify TournamentRegistrationPage in frontend/src/pages/TournamentRegistrationPage.jsx to detect category type and conditionally render PairSelector for DOUBLES or existing PlayerSelector for SINGLES (DEFERRED: Created separate page instead)
- [X] T036 [US1] Add routing for doubles registration in frontend/src/App.jsx at /player/pairs route pointing to PairRegistrationPage

**Checkpoint**: At this point, User Story 1 (MVP) should be fully functional - players can register doubles pairs for tournaments with eligibility validation

---

## Phase 4: User Story 2 - System Manages Pair Lifecycle and Rankings (Priority: P2)

**Goal**: Automatically manage pair lifecycle (creation/deletion based on activity) and maintain separate rankings for pairs and individual players

**Independent Test**: Register a pair, have them complete matches to earn points, verify points in both pair ranking and individual player rankings, withdraw from all tournaments, confirm pair soft-deleted

### Backend Implementation for User Story 2

- [X] T037 [P] [US2] Create PairRankingService in backend/src/services/pairRankingService.js with getOrCreatePairRanking(pairId, categoryId) method
- [X] T038 [P] [US2] Add awardPointsToPair(pairId, pointsEarned, won, lost) method to PairRankingService that updates PairRanking (pair-specific points) AND both players' CategoryRanking (individual aggregated points)
- [X] T039 [P] [US2] Add recalculateRankings(categoryId) method to PairRankingService that recalculates rank positions for all pairs in category based on points descending
- [X] T040 [US2] Add pair lifecycle checking to PairService with checkAndDeleteInactivePair(pairId) method that counts active registrations and current season participation
- [X] T041 [US2] Implement soft delete logic in PairService.checkAndDeleteInactivePair that sets deletedAt timestamp when pair has zero active registrations AND zero current season (calendar year) participation
- [X] T042 [US2] Add withdrawPairRegistration(registrationId, userId) method to PairRegistrationService that updates status to WITHDRAWN and triggers lifecycle check
- [X] T043 [US2] Create withdrawal handler in registration controller for DELETE /api/v1/registrations/pair/:id that validates authorization (player in pair or organizer/admin) and calls PairRegistrationService.withdrawPairRegistration
- [X] T044 [US2] Add pair rankings endpoint handler to pair controller for GET /api/v1/rankings/pairs/:categoryId that retrieves paginated pair rankings with player names, seeding scores, wins, losses, winRate
- [X] T045 [US2] Add pair rankings route in backend/src/api/routes/rankingRoutes.js for GET /api/v1/rankings/pairs/:categoryId (public access, no auth required)
- [X] T046 [US2] Update match result processing in existing tournament service to call PairRankingService.awardPointsToPair when doubles match completes, ensuring points distributed to both pair and individual players

### Frontend Implementation for User Story 2

- [X] T047 [P] [US2] Create rankingService API client extension in frontend/src/services/rankingService.js adding getPairRankings(categoryId, page, limit) method
- [X] T048 [P] [US2] Create PairRankingsPage in frontend/src/pages/PairRankingsPage.jsx displaying pair rankings table with columns: rank, player 1, player 2, points, wins, losses, win rate
- [X] T049 [US2] Add category selector to PairRankingsPage that filters rankings by selected doubles category
- [X] T050 [US2] Add pagination controls to PairRankingsPage using React Bootstrap Pagination component
- [ ] T051 [US2] Add pair withdrawal capability to tournament registration views by adding withdraw button that calls pairService.withdrawRegistration and updates UI (DEFERRED: Tournament views not implemented yet)
- [X] T052 [US2] Add routing for pair rankings in frontend/src/App.jsx at /rankings/pairs route pointing to PairRankingsPage
- [X] T053 [US2] Update navigation menu to include link to pair rankings page in frontend/src/components/NavBar.jsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - pairs can be registered, earn points, have rankings, and lifecycle is managed automatically

---

## Phase 5: User Story 3 - Tournament Seeding Based on Combined Player Strength (Priority: P3)

**Goal**: Calculate tournament seeding by summing both players' individual ranking points, with automatic recalculation when tournaments close

**Independent Test**: Create players with known ranking points, form pairs, verify seeding order matches sum of individual points, verify new pairs start at bottom of pair rankings

### Backend Implementation for User Story 3

- [X] T054 [P] [US3] Add calculateSeedingScore(pairId) method to PairService that fetches both players' CategoryRanking for pair's category and returns sum of points (0 if no ranking)
- [X] T055 [P] [US3] Add recalculateCategorySeedingScores(categoryId) method to PairService that updates seedingScore for all active pairs in category by calling calculateSeedingScore for each
- [X] T056 [US3] Add tournament close hook in existing tournament service (backend/src/services/tournamentService.js) that triggers PairService.recalculateCategorySeedingScores when tournament status changes to COMPLETED
- [X] T057 [US3] Create seeding recalculation endpoint handler in pair controller for POST /api/v1/pairs/recalculate-seeding/:categoryId (organizer/admin only) that manually triggers recalculation
- [X] T058 [US3] Add seeding recalculation route in backend/src/api/routes/pairRoutes.js for POST /api/v1/pairs/recalculate-seeding/:categoryId with organizer/admin authorization middleware (Note: Already completed in Phase 3)
- [ ] T059 [US3] Update bracket generation logic in tournament service to order pairs by seedingScore DESC, then registrationTimestamp ASC for tie-breaking when generating tournament brackets (DEFERRED: Bracket generation not fully implemented yet)
- [X] T060 [US3] Add seeding score display to pair details in PairController.getPair response including both seedingScore (for tournament seeding) and pairRanking.points (for pair ranking) (Note: Already included in pair response from createOrGetPair)

### Frontend Implementation for User Story 3

- [x] T061 [P] [US3] Add seeding score display to PairSelector component in frontend/src/components/PairSelector.jsx showing combined ranking points when pair is selected *(frontend/src/components/PairSelector.jsx:112-124)*
- [x] T062 [P] [US3] Create seeding display component in frontend/src/components/PairSeedingDisplay.jsx that shows pair seeding score with breakdown of each player's individual points *(frontend/src/components/PairSeedingDisplay.jsx)*
- [x] T063 [US3] Add seeding information to tournament setup page in frontend/src/pages/TournamentSetupPage.jsx displaying all registered pairs ordered by seeding score *(Partial: Added recalc button, full seeding display deferred to tournament detail view)*
- [x] T064 [US3] Add manual seeding recalculation button to tournament setup page (organizer/admin only) that calls pairService.recalculateSeeding and refreshes display *(frontend/src/pages/TournamentSetupPage.jsx:358-369)*
- [ ] T065 [US3] Update tournament bracket display to show pair seeding positions in frontend tournament view components *(DEFERRED: Tournament bracket view not fully implemented)*

**Checkpoint**: All seeding functionality should work - pairs seeded by combined strength, automatic recalculation, manual trigger available

---

## Phase 6: User Story 4 - Organizer Overrides Eligibility Requirements (Priority: P4)

**Goal**: Allow organizers and admins to register ineligible pairs with required justification reason

**Independent Test**: Attempt to register ineligible pair as player (should fail), then as organizer with override reason (should succeed with warning indicator)

### Backend Implementation for User Story 4

- [x] T066 [P] [US4] Add eligibility override handling to PairRegistrationService.registerPair that accepts eligibilityOverride boolean and overrideReason string in options parameter *(backend/src/services/pairRegistrationService.js:23, 165-180)*
- [x] T067 [P] [US4] Add validation in PairRegistrationService that requires overrideReason to be non-null when eligibilityOverride=true, returns OVERRIDE_REASON_REQUIRED error if missing *(backend/src/services/pairRegistrationService.js:174-178)*
- [x] T068 [US4] Add role-based authorization check in PairRegistrationService that only allows ORGANIZER or ADMIN roles to use eligibilityOverride, returns OVERRIDE_NOT_ALLOWED error for PLAYER role *(backend/src/middleware/pairAuth.js:182-206)*
- [x] T069 [US4] Update eligibility checking logic in PairRegistrationService to skip validation when eligibilityOverride=true and user has appropriate role *(backend/src/services/pairRegistrationService.js:141)*
- [x] T070 [US4] Add eligibility override fields (eligibilityOverride, overrideReason) to PairRegistration response in registration controller to display override status *(backend/src/services/pairRegistrationService.js:205-206)*
- [x] T071 [US4] Update pair registration handler to accept eligibilityOverride and overrideReason in request body and pass to service layer *(backend/src/api/registrationController.js:548, 588)*

### Frontend Implementation for User Story 4

- [x] T072 [P] [US4] Add eligibility override checkbox and reason textarea to DoublesRegistrationPage in frontend/src/pages/PairRegistrationPage.jsx (only visible for organizer/admin role) *(frontend/src/pages/PairRegistrationPage.jsx:498-551)*
- [x] T073 [US4] Add validation to override reason field requiring non-empty text when override checkbox is checked *(frontend/src/pages/PairRegistrationPage.jsx:207-210, 529)*
- [x] T074 [US4] Update pair registration submission to include eligibilityOverride and overrideReason fields when organizer submits with override enabled *(frontend/src/pages/PairRegistrationPage.jsx:218-223)*
- [x] T075 [US4] Add override indicator badge to registration display components that shows "Eligibility Override" badge with tooltip containing override reason *(frontend/src/pages/PairRegistrationPage.jsx:599-606)*
- [x] T076 [US4] Add warning dialog for organizers when eligibility violations are detected, showing violations and prompting for override with reason before allowing registration *(frontend/src/pages/PairRegistrationPage.jsx:537-546)*

**Checkpoint**: Organizer override functionality complete - organizers can bypass eligibility with documented reasons

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Additional features and improvements that enhance multiple user stories

- [ ] T077 [P] Create tournament history endpoint handler in pair controller for GET /api/v1/pairs/:id/history returning all tournaments pair participated in with placement, points earned, match stats
- [ ] T078 [P] Add tournament history route in backend/src/api/routes/pairRoutes.js for GET /api/v1/pairs/:id/history (public access)
- [ ] T079 [P] Create PairHistoryDisplay component in frontend/src/components/PairHistoryDisplay.jsx showing tournament history table with placement badges, points, wins/losses
- [x] T080 Add pair test data to seed script in backend/prisma/seed.js creating 3-5 sample pairs per doubles category with various ranking points and registrations *(backend/prisma/seed.js:564-759 - Creates 4 men's, 2 women's, 2 mixed pairs with rankings and registrations)*
- [ ] T081 Update existing singles registration logic to detect category type and route to appropriate registration endpoint (backward compatibility check)
- [ ] T082 [P] Add comprehensive error handling to all pair-related endpoints ensuring consistent error response format
- [ ] T083 [P] Add logging for pair operations (creation, registration, lifecycle events) in backend services
- [ ] T084 Performance optimization: verify database indexes are created correctly and query plans are efficient for pair lookups and bracket generation
- [ ] T085 [P] Update API documentation in specs/006-doubles-pairs/contracts/ if any implementation details differ from original design
- [ ] T086 Run quickstart.md validation by executing curl commands from quickstart guide and verifying responses match expected format

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately (database schema and migrations)
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories (utilities, auth, validation)
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories CAN proceed in parallel if staffed (backend and frontend teams)
  - OR sequentially in priority order: US1 (P1) → US2 (P2) → US3 (P3) → US4 (P4)
- **Polish (Phase 7)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - MVP**: Can start after Foundational - No dependencies on other stories
  - Delivers: Pair registration for tournaments
  - Blocking tasks: T013-T027 (backend), T028-T036 (frontend)

- **User Story 2 (P2) - Lifecycle**: Can start after Foundational - Builds on US1 (uses PairService, PairRegistration)
  - Delivers: Automatic pair lifecycle, separate rankings
  - Blocking tasks: T037-T046 (backend), T047-T053 (frontend)
  - Integration point: Uses PairService from US1, extends registration withdrawal

- **User Story 3 (P3) - Seeding**: Can start after Foundational - Integrates with US1 (uses DoublesPair.seedingScore)
  - Delivers: Tournament seeding based on combined player strength
  - Blocking tasks: T054-T060 (backend), T061-T065 (frontend)
  - Integration point: Hooks into tournament close event, updates US1 pair data

- **User Story 4 (P4) - Override**: Can start after US1 complete - Extends US1 registration flow
  - Delivers: Organizer eligibility override capability
  - Blocking tasks: T066-T071 (backend), T072-T076 (frontend)
  - Integration point: Modifies PairRegistrationService and DoublesRegistrationPage from US1

### Within Each User Story

**Backend tasks must follow order**:
1. Service layer implementation (creates business logic)
2. Controller handlers (uses service layer)
3. Route mounting (connects controllers to Express)
4. Integration with existing systems

**Frontend tasks must follow order**:
1. API service client (communicates with backend)
2. UI components (uses service client)
3. Page components (composes UI components)
4. Routing and navigation (integrates pages)

**Backend before frontend**: Backend endpoints should be implemented and tested before frontend components that depend on them

### Parallel Opportunities

**Phase 1 (Setup)**: All tasks T001-T008 can run in parallel (different Prisma models and utility files)

**Phase 2 (Foundational)**: Tasks T009, T010, T011 can run in parallel (different utility files)

**Phase 3 (US1 Backend)**:
- T013, T014, T015 can run in parallel (different PairService methods)
- T016, T017, T018 can run in parallel (different controller handlers)
- T020, T021 can run in parallel (different validation functions)
- T022, T023, T024 can run in parallel (PairRegistrationService separate from PairService)

**Phase 3 (US1 Frontend)**:
- T028, T029, T033 can run in parallel (different files: service, component, page)

**Phase 4 (US2 Backend)**:
- T037, T038, T039 can run in parallel (different PairRankingService methods)
- T040, T041 can run together (lifecycle checking)

**Phase 4 (US2 Frontend)**:
- T047, T048 can run in parallel (service and page in different files)

**Phase 5 (US3 Backend)**:
- T054, T055 can run in parallel (different calculation methods)

**Phase 5 (US3 Frontend)**:
- T061, T062 can run in parallel (different components)

**Phase 6 (US4 Backend)**:
- T066, T067, T068 can run in parallel (different validation logic in same service)

**Phase 6 (US4 Frontend)**:
- T072, T073, T074 can be implemented together (same component modifications)

**Phase 7 (Polish)**:
- T077, T078, T079, T080, T082, T083, T085 can all run in parallel (different files and concerns)

---

## Parallel Example: User Story 1 Backend

```bash
# Launch parallel backend tasks for User Story 1:
# (All in different parts of PairService or different controllers)

Task T013: "Create PairService.createOrGetPair method"
Task T014: "Create PairService.getPairById method"
Task T015: "Create PairService.listPairs method"

# Then after services complete, launch parallel controller tasks:
Task T016: "Create PairController.createPair handler"
Task T017: "Create PairController.getPair handler"
Task T018: "Create PairController.listPairs handler"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

**Goal**: Get doubles pair registration working end-to-end

1. Complete **Phase 1: Setup** (T001-T008) - Database schema ready
2. Complete **Phase 2: Foundational** (T009-T012) - Core utilities ready
3. Complete **Phase 3: User Story 1** (T013-T036) - Pair registration working
4. **STOP and VALIDATE**:
   - Test pair creation via API
   - Test pair registration for doubles tournament
   - Test eligibility validation (both accept and reject cases)
   - Verify frontend flow from tournament selection to pair registration
5. Deploy/demo MVP if validation passes

**Estimated Tasks**: 36 tasks for MVP (all of Phase 1, 2, and 3)
**Estimated Effort**: 2-3 days for experienced developer

### Incremental Delivery

**After MVP (User Story 1)**:

1. **Add User Story 2** (T037-T053) - 17 tasks
   - Delivers: Pair lifecycle management, separate rankings
   - Test independently: Register pair, earn points, verify rankings, withdraw and confirm deletion
   - Deploy/Demo: Rankings page now available

2. **Add User Story 3** (T054-T065) - 12 tasks
   - Delivers: Fair tournament seeding based on combined strength
   - Test independently: Create tournament, verify bracket seeding order
   - Deploy/Demo: Tournaments now properly seeded

3. **Add User Story 4** (T066-T076) - 11 tasks
   - Delivers: Organizer override flexibility
   - Test independently: Register ineligible pair with override as organizer
   - Deploy/Demo: Organizers can handle special cases

4. **Polish** (T077-T086) - 10 tasks
   - Delivers: Tournament history, seed data, performance optimization
   - Deploy/Demo: Full feature complete

**Total Tasks**: 86 tasks across all phases

### Parallel Team Strategy

With **2 developers** (1 backend, 1 frontend):

1. **Together**: Complete Phase 1 + 2 (Setup + Foundational) - 12 tasks
2. **Phase 3 (US1)**:
   - Backend dev: T013-T027 (backend tasks) - 15 tasks
   - Frontend dev: T028-T036 (frontend tasks) - 9 tasks
   - Integrate and test together
3. **Phase 4 (US2)**:
   - Backend dev: T037-T046 - 10 tasks
   - Frontend dev: T047-T053 - 7 tasks
4. Continue pattern through remaining stories

With **3 developers** (2 backend, 1 frontend):

1. **Together**: Phase 1 + 2
2. **After Foundational complete**:
   - Backend Dev A: User Story 1 backend (T013-T027)
   - Backend Dev B: User Story 2 backend (T037-T046)
   - Frontend Dev: User Story 1 frontend (T028-T036), then US2 frontend (T047-T053)
3. Stories complete and integrate as they finish

---

## Task Summary

**Total Tasks**: 86

### By Phase:
- Phase 1 (Setup): 8 tasks
- Phase 2 (Foundational): 4 tasks
- Phase 3 (US1 - MVP): 24 tasks (15 backend, 9 frontend)
- Phase 4 (US2 - Lifecycle): 17 tasks (10 backend, 7 frontend)
- Phase 5 (US3 - Seeding): 12 tasks (7 backend, 5 frontend)
- Phase 6 (US4 - Override): 11 tasks (6 backend, 5 frontend)
- Phase 7 (Polish): 10 tasks

### By User Story:
- **US1 (P1)**: 24 tasks - Core pair registration (MVP)
- **US2 (P2)**: 17 tasks - Lifecycle and rankings
- **US3 (P3)**: 12 tasks - Tournament seeding
- **US4 (P4)**: 11 tasks - Organizer overrides

### Parallel Opportunities:
- **Phase 1**: 8 parallel tasks (all can run together)
- **Phase 2**: 3 parallel tasks (T009, T010, T011)
- **Phase 3**: 15+ parallel opportunities (backend services, controllers, frontend components)
- **Phase 4**: 10+ parallel opportunities
- **Phase 5**: 6+ parallel opportunities
- **Phase 6**: 5+ parallel opportunities
- **Phase 7**: 7+ parallel tasks

### MVP Scope (US1 Only):
- **Setup + Foundational + US1**: 36 tasks
- **Delivers**: Players can register doubles pairs for tournaments with eligibility validation
- **Time Estimate**: 2-3 days for experienced full-stack developer

---

## Notes

- **[P] marker**: Tasks in different files with no dependencies can run in parallel
- **[Story] label**: Maps each task to specific user story for traceability (US1, US2, US3, US4)
- **Independent stories**: Each user story should be completable and testable on its own after Foundational phase
- **File paths**: All paths are exact (backend/src/services/..., frontend/src/components/...)
- **Database first**: Prisma schema changes (Phase 1) must complete before any service implementation
- **Backend before frontend**: Implement and test backend endpoints before building frontend components that use them
- **Checkpoints**: Stop at each phase checkpoint to validate independently before continuing
- **Tests optional**: Per constitution, tests were not explicitly requested in specification
- **Commit strategy**: Commit after each logical task group (e.g., after completing all PairService methods)

---

## Validation Checklist

After completing each user story phase, validate:

### After US1 (MVP):
- [ ] Can create new doubles pair via API with two different players
- [ ] Existing pair is reused for same players in same category across multiple tournaments
- [ ] Eligibility validation rejects ineligible pairs (wrong age/gender)
- [ ] Cannot register same player twice in a pair
- [ ] Cannot register same pair twice in same tournament
- [ ] Frontend PairSelector component works with dropdowns and validation
- [ ] DoublesRegistrationPage successfully registers pair for tournament
- [ ] TournamentRegistrationPage correctly detects DOUBLES vs SINGLES category type

### After US2 (Lifecycle):
- [ ] Points earned by pair are added to both PairRanking and both players' CategoryRanking
- [ ] New pairs start with 0 points in pair ranking even if players highly ranked individually
- [ ] Pair is soft-deleted when withdrawn from last tournament with no current season participation
- [ ] Historical data preserved after pair deletion
- [ ] PairRankingsPage displays rankings correctly with pagination
- [ ] Withdrawal updates registration status and triggers lifecycle check

### After US3 (Seeding):
- [ ] Seeding score equals sum of both players' individual ranking points in category
- [ ] Tournament bracket orders pairs by seeding score descending
- [ ] Seeding scores recalculate automatically when tournament closes
- [ ] Manual recalculation endpoint works for organizers
- [ ] Tie-breaking uses registration timestamp for pairs with equal seeding scores

### After US4 (Override):
- [ ] Player role cannot use eligibility override (returns error)
- [ ] Organizer/admin can override with required reason
- [ ] Override reason validation enforces non-empty string when override enabled
- [ ] Overridden registrations show badge with reason in UI
- [ ] Warning dialog appears for organizers when eligibility violations detected

### After Phase 7 (Polish):
- [ ] Tournament history endpoint returns correct data
- [ ] Seed data creates sample pairs successfully
- [ ] All curl commands in quickstart.md execute successfully
- [ ] Performance benchmarks met (<500ms for seeding 32 pairs)
- [ ] Error responses follow consistent format across all endpoints
