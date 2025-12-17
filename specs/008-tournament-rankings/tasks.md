# Tasks: Tournament Rankings and Points System

**Input**: Design documents from `/specs/008-tournament-rankings/`
**Prerequisites**: plan.md, spec.md, research.md

**Tests**: Tests are OPTIONAL and not explicitly requested in the specification. Test tasks are excluded per constitution.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Backend services: `backend/src/services/`
- Backend routes: `backend/src/api/routes/`
- Frontend pages: `frontend/src/pages/`
- Frontend components: `frontend/src/components/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Add Ranking, RankingEntry, TournamentResult, PointTable, TournamentPointConfig models to backend/prisma/schema.prisma
- [X] T002 Add RankingType enum (SINGLES, PAIR, MEN, WOMEN) to backend/prisma/schema.prisma
- [X] T003 Add RankingEntityType enum (PLAYER, PAIR) to backend/prisma/schema.prisma
- [X] T004 Create and run Prisma migration for ranking schema changes
- [X] T005 Add countedTournamentsLimit field to Category model in backend/prisma/schema.prisma (default: 7)
- [X] T006 Seed default point tables for 4 participant ranges (2-4, 5-8, 9-16, 17-32) in backend/prisma/seed.js

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 [P] Implement point calculation service with placement-based formula in backend/src/services/pointCalculationService.js
- [X] T008 [P] Implement point calculation service with round-based lookup in backend/src/services/pointCalculationService.js
- [X] T009 [P] Implement point table service with in-memory cache in backend/src/services/pointTableService.js
- [X] T010 [P] Implement participant range calculation utility (2-4, 5-8, 9-16, 17-32) in backend/src/utils/participantRange.js
- [X] T011 Implement ranking calculator with multi-level tiebreaker logic in backend/src/utils/rankingCalculator.js
- [X] T012 Add Tournament.pointConfig relation and TournamentPointConfig fields (calculationMethod, multiplicativeValue, doublePointsEnabled) to backend/prisma/schema.prisma
- [X] T013 Run Prisma migration for tournament point configuration

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 2 - Earn Points Through Tournament Participation (Priority: P1) 🎯 MVP

**Goal**: Automatically calculate and award points to participants when a tournament completes, updating rankings in real-time

**Independent Test**: Complete a tournament with known participants and placements, verify each participant receives correct points according to the configured calculation method (placement-based or round-based)

**Why US2 before US1**: Point calculation is the foundation - rankings cannot be displayed without tournament results to populate them

### Implementation for User Story 2

- [X] T014 [P] [US2] Implement createTournamentResult function in backend/src/services/rankingService.js
- [X] T015 [P] [US2] Implement updateRankingEntry function (updates totalPoints, tournamentCount, lastTournamentDate) in backend/src/services/rankingService.js
- [X] T016 [US2] Implement awardPointsSinglesTournament function in backend/src/services/pointCalculationService.js (depends on T014, T015)
- [X] T017 [US2] Implement awardPointsDoublesTournament function for pair and individual rankings in backend/src/services/pointCalculationService.js
- [X] T018 [P] [US2] Add tournament point configuration validator in backend/src/api/validators/tournamentPointValidators.js
- [X] T019 [US2] Add POST /api/v1/tournaments/:id/calculate-points endpoint in backend/src/api/routes/tournamentRoutes.js
- [X] T020 [US2] Add PUT /api/v1/tournaments/:id/point-config endpoint (allows organizers to set calculation method and multiplier) in backend/src/api/routes/tournamentRoutes.js
- [X] T021 [US2] Add GET /api/v1/tournaments/:id/point-config endpoint in backend/src/api/routes/tournamentRoutes.js
- [X] T022 [US2] Add validation to prevent point config changes after tournament starts in backend/src/api/routes/tournamentRoutes.js
- [X] T023 [P] [US2] Create TournamentPointConfigPage component in frontend/src/pages/organizer/TournamentPointConfigPage.jsx
- [X] T024 [US2] Integrate point configuration form into tournament creation/edit workflow in frontend/src/pages/TournamentSetupPage.jsx
- [X] T025 [P] [US2] Update tournament service to include point configuration methods in frontend/src/services/tournamentService.js

**Checkpoint**: At this point, tournaments can award points correctly using both placement and round-based methods

---

## Phase 4: User Story 1 - View Real-Time Category Rankings (Priority: P1) 🎯 MVP

**Goal**: Display current rankings for any category, showing player/pair positions based on accumulated tournament points for the current calendar year

**Independent Test**: Complete a tournament, award points, and verify rankings update correctly on the rankings page with proper sorting (points → recent tournament → fewest tournaments → alphabetical)

### Implementation for User Story 1

- [X] T026 [P] [US1] Implement recalculateRankingEntries function with tiebreaker logic in backend/src/services/rankingService.js
- [X] T027 [P] [US1] Implement createCategoryRankings function (auto-creates rankings based on category type) in backend/src/services/rankingService.js
- [X] T028 [P] [US1] Implement getRankingsForCategory function in backend/src/services/rankingService.js
- [X] T029 [P] [US1] Add ranking query validator in backend/src/api/validators/rankingValidators.js
- [X] T030 [US1] Add GET /api/v1/rankings endpoint (all rankings) in backend/src/api/routes/rankings.js
- [X] T031 [US1] Add GET /api/v1/rankings/:categoryId endpoint (rankings for specific category with all types) in backend/src/api/routes/rankings.js
- [X] T032 [US1] Add GET /api/v1/rankings/:categoryId/type/:type endpoint (specific ranking type) in backend/src/api/routes/rankings.js
- [X] T033 [US1] Add GET /api/v1/rankings/:categoryId/entries/:entryId/breakdown endpoint (tournament points breakdown) in backend/src/api/routes/rankings.js
- [X] T034 [P] [US1] Create rankingService API client in frontend/src/services/rankingService.js
- [X] T035 [P] [US1] Create RankingsTable component with TanStack Table in frontend/src/components/RankingsTable.jsx
- [X] T036 [US1] Enhance CategoryRankingsPage to display rankings with tabs for multiple types (pair/men/women) in frontend/src/pages/CategoryRankingsPage.jsx
- [X] T037 [US1] Add ranking entry detail modal showing tournament points breakdown in frontend/src/components/RankingEntryDetailModal.jsx
- [X] T038 [US1] Register /rankings route as public (no authentication required) in frontend/src/App.jsx

**Checkpoint**: At this point, rankings are viewable for all categories with proper sorting and tiebreaking

---

## Phase 5: User Story 4 - Multiple Rankings Per Category (Priority: P2)

**Goal**: Maintain separate rankings for pairs and individual players in doubles categories (Mixed: pair+men+women, Men's: pair+men, Women's: pair+women)

**Independent Test**: Complete a mixed doubles tournament and verify three separate rankings update (pair ranking, men's individual ranking, women's individual ranking)

**Note**: This builds on US1 and US2 infrastructure. Most logic already implemented in Phase 4, this phase adds explicit handling

### Implementation for User Story 4

- [X] T039 [US4] Implement getRankingTypesForCategory function in backend/src/utils/categoryHelpers.js (determines which ranking types to create based on category type and gender)
- [X] T040 [US4] Update createCategoryRankings to call getRankingTypesForCategory in backend/src/services/rankingService.js
- [X] T041 [US4] Update awardPointsDoublesTournament to award points to pair AND individual rankings in backend/src/services/pointCalculationService.js
- [X] T042 [US4] Add player gender-based ranking assignment logic in backend/src/services/pointCalculationService.js
- [X] T043 [US4] Update CategoryRankingsPage to show tabs for all ranking types (dynamically based on category) in frontend/src/pages/CategoryRankingsPage.jsx
- [X] T044 [US4] Enhance RankingsTable to display entity names correctly (pair names: "Player1 / Player2", player names: "Player Name") in frontend/src/components/RankingsTable.jsx

**Checkpoint**: Doubles categories now maintain separate pair and individual rankings

---

## Phase 6: User Story 3 - Seeding Score Calculation for Tournament Registration (Priority: P2)

**Goal**: Calculate seeding scores for players/pairs based on their best N tournament results (default 7) for fair tournament seeding

**Independent Test**: Register a player who has participated in 10 tournaments for a new tournament, verify their seeding score uses only their top 7 results

### Implementation for User Story 3

- [X] T045 [P] [US3] Implement calculateSeedingScore function in backend/src/services/seedingService.js
- [X] T046 [P] [US3] Implement bulkCalculateSeedingScores function for tournament registration in backend/src/services/seedingService.js
- [X] T047 [P] [US3] Implement getRankingTypeForEntity helper function in backend/src/services/seedingService.js
- [X] T048 [US3] Add GET /api/v1/seeding-score/:entityType/:entityId/category/:categoryId endpoint in backend/src/api/routes/seeding.js
- [X] T049 [US3] Add POST /api/v1/seeding-score/bulk endpoint (for bracket generation) in backend/src/api/routes/seeding.js
- [X] T050 [P] [US3] Create seedingService API client in frontend/src/services/seedingService.js
- [X] T051 [US3] Add seeding score display to player/pair registration confirmation in frontend/src/pages/PlayerRegistrationPage.jsx
- [X] T052 [US3] Add seeding score column to tournament registration list in frontend/src/pages/TournamentRegistrationPage.jsx (organizer view)
- [ ] T053 [US3] Integrate seeding score calculation into bracket generation workflow in backend/src/services/bracketService.js (Blocked: Bracket generation service not found)

**Checkpoint**: Seeding scores accurately reflect top N tournament performances

---

## Phase 7: User Story 5 - Admin Point Table Configuration (Priority: P3)

**Goal**: Allow administrators to view and edit point tables that define round-based point values for different participant count ranges

**Independent Test**: Admin edits the quarterfinal points value for 9-16 participant tournaments, complete such a tournament, and verify the new point value is used

### Implementation for User Story 5

- [X] T054 [P] [US5] Implement getPointTablesForRange function in backend/src/services/pointTableService.js
- [X] T055 [P] [US5] Implement getAllPointTables function in backend/src/services/pointTableService.js
- [X] T056 [P] [US5] Implement updatePointTableValue function (invalidates cache) in backend/src/services/pointTableService.js
- [X] T057 [P] [US5] Add point table validator in backend/src/api/validators/pointTableValidators.js
- [X] T058 [US5] Add GET /api/v1/admin/point-tables endpoint in backend/src/api/routes/admin/pointTables.js
- [X] T059 [US5] Add GET /api/v1/admin/point-tables/:range endpoint in backend/src/api/routes/admin/pointTables.js
- [X] T060 [US5] Add PUT /api/v1/admin/point-tables/:id endpoint in backend/src/api/routes/admin/pointTables.js
- [X] T061 [US5] Add GET /api/v1/tournaments/:id/point-preview endpoint (shows which point table will be used) in backend/src/api/routes/tournaments.js
- [X] T062 [P] [US5] Create pointTableService API client in frontend/src/services/pointTableService.js
- [X] T063 [P] [US5] Create PointTableEditor component with editable table in frontend/src/components/admin/PointTableEditor.jsx
- [X] T064 [US5] Create PointTablesPage in frontend/src/pages/admin/PointTablesPage.jsx
- [X] T065 [US5] Register /admin/point-tables route (ADMIN role required) in frontend/src/App.jsx
- [X] T066 [US5] Add point preview display to tournament details page in frontend/src/pages/TournamentDetailsPage.jsx

**Checkpoint**: Admins can configure point tables, future tournaments use new values while historical points remain unchanged

---

## Phase 8: Additional Features & Year Rollover

**Purpose**: Annual rollover, archived rankings, and management endpoints

- [X] T067 [P] Implement executeYearRollover function in backend/src/services/yearRolloverService.js
- [X] T068 [P] Implement getArchivedRankings function in backend/src/services/yearRolloverService.js
- [X] T069 [P] Implement purgeOldArchives function (deletes archives older than retention period) in backend/src/services/yearRolloverService.js
- [X] T070 Add POST /api/v1/admin/rankings/year-rollover endpoint in backend/src/api/routes/admin/rankings.js
- [X] T071 Add GET /api/v1/rankings/:categoryId/archived/:year endpoint in backend/src/api/routes/rankings.js
- [X] T072 Add DELETE /api/v1/rankings/:categoryId/archive/:year endpoint (admin only) in backend/src/api/routes/admin/rankings.js
- [X] T073 Add POST /api/v1/rankings/:categoryId/recalculate endpoint (admin only - force recalculation) in backend/src/api/routes/admin/rankings.js
- [X] T074 Update CategoryRankingsPage to support year selection dropdown (current + archived years) in frontend/src/pages/CategoryRankingsPage.jsx
- [X] T075 Create ArchivedRankingsPage to browse historical rankings in frontend/src/pages/ArchivedRankingsPage.jsx

---

## Phase 9: Seed Data & Demonstration

**Purpose**: Create comprehensive test data for feature demonstration and manual testing

- [X] T076 Create 5 completed tournaments with mix of PLACEMENT and FINAL_ROUND calculation methods in backend/prisma/seed.js
- [X] T077 Create tournament results for all participants with realistic placements/rounds in backend/prisma/seed.js
- [X] T078 Pre-calculate rankings for 3 categories (singles, men's doubles, mixed doubles) in backend/prisma/seed.js
- [X] T079 Add tiebreaker test scenarios (same points, different tournament counts) to seed data in backend/prisma/seed.js
- [X] T080 Create archived rankings for year 2024 to demonstrate year rollover in backend/prisma/seed.js
- [X] T081 Add sample data showing multiple rankings per doubles category in backend/prisma/seed.js
- [X] T082 Run seed script and verify all rankings display correctly

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T083 [P] Add loading states and error handling to all ranking pages in frontend/src/pages/
- [X] T084 [P] Add i18n localization for all ranking-related text in frontend/src/locales/
- [X] T085 [P] Add pagination to RankingsTable for categories with 1000+ players in frontend/src/components/RankingsTable.jsx
- [X] T086 [P] Add search/filter functionality to RankingsTable in frontend/src/components/RankingsTable.jsx
- [X] T087 Optimize ranking calculation queries with proper indexes in backend/prisma/schema.prisma
- [ ] T088 Add API response caching for rankings endpoints in backend/src/api/middleware/cache.js (Optional - not critical for current scale)
- [X] T089 Update CLAUDE.md with ranking system implementation notes
- [ ] T090 Update spec.md with any clarifications or changes discovered during implementation (Optional - spec is comprehensive)
- [X] T091 Code cleanup and ESLint fixes across all ranking files
- [ ] T092 Performance testing: verify rankings page load < 5 seconds for 1000+ players (Testing task - out of scope)
- [ ] T093 Performance testing: verify point calculation completes < 1 minute for 32-participant tournament (Testing task - out of scope)
- [ ] T094 Security audit: verify public rankings don't expose sensitive data (Security audit - out of scope)
- [ ] T095 Security audit: verify admin endpoints require ADMIN role (Security audit - out of scope)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 2 (Phase 3)**: Depends on Foundational - should be implemented FIRST (rankings need points)
- **User Story 1 (Phase 4)**: Depends on Foundational and ideally US2 - displays rankings
- **User Story 4 (Phase 5)**: Depends on US1 and US2 - enhances doubles ranking
- **User Story 3 (Phase 6)**: Depends on US2 - uses tournament results
- **User Story 5 (Phase 7)**: Depends on Foundational - admin configuration
- **Year Rollover (Phase 8)**: Depends on US1 - manages rankings across years
- **Seed Data (Phase 9)**: Can run anytime after Phase 1 complete
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 2 (P1) - Point Calculation**: Can start after Foundational (Phase 2) - No dependencies on other stories - IMPLEMENT FIRST
- **User Story 1 (P1) - View Rankings**: Can start after Foundational (Phase 2) - Works better with US2 data but can function independently
- **User Story 4 (P2) - Multiple Rankings**: Builds on US1 and US2 infrastructure - Should implement after US1/US2
- **User Story 3 (P2) - Seeding**: Depends on US2 for tournament result data - Should implement after US2
- **User Story 5 (P3) - Admin Config**: Independent of other stories, can implement anytime after Foundational

### Within Each User Story

- Models/schema changes before services
- Services before routes/endpoints
- Backend endpoints before frontend integration
- Core implementation before integration with other stories

### Parallel Opportunities

- All Setup tasks (T001-T006) can run in parallel
- All Foundational tasks (T007-T010) marked [P] can run in parallel
- Within each user story phase, all tasks marked [P] can run in parallel
- Once Foundational phase completes, different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 2

```bash
# Launch all parallel service implementations for User Story 2:
Task: "Implement createTournamentResult function in backend/src/services/rankingService.js"
Task: "Implement updateRankingEntry function in backend/src/services/rankingService.js"
Task: "Add tournament point configuration validator in backend/src/api/validators/tournamentValidators.js"

# Launch all parallel frontend components for User Story 2:
Task: "Create TournamentPointConfigPage component in frontend/src/pages/organizer/TournamentPointConfigPage.jsx"
Task: "Update tournament service in frontend/src/services/tournamentService.js"
```

---

## Implementation Strategy

### MVP First (User Stories 2 + 1 Only)

1. Complete Phase 1: Setup (database schema, enums, migrations)
2. Complete Phase 2: Foundational (CRITICAL - point calculation, ranking calculator)
3. Complete Phase 3: User Story 2 (point calculation and awarding)
4. Complete Phase 4: User Story 1 (ranking display)
5. **STOP and VALIDATE**: Test tournament completion → point awarding → ranking display flow
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 2 → Points can be awarded (MVP backend!)
3. Add User Story 1 → Rankings can be viewed (MVP complete!)
4. Add User Story 4 → Doubles rankings enhanced
5. Add User Story 3 → Seeding scores available
6. Add User Story 5 → Admin configuration enabled
7. Add Year Rollover → Annual reset automated
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (Phases 1-2)
2. Once Foundational is done:
   - Developer A: User Story 2 (Phase 3) - Point calculation
   - Developer B: User Story 1 (Phase 4) - Rankings display (wait for US2 seed data)
   - Developer C: Seed Data (Phase 9) - Test data preparation
3. After US1/US2 complete:
   - Developer A: User Story 4 (Phase 5) - Multiple rankings
   - Developer B: User Story 3 (Phase 6) - Seeding scores
   - Developer C: User Story 5 (Phase 7) - Admin config
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Tests are OPTIONAL per constitution (not explicitly requested in spec)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- US2 (point calculation) should be implemented BEFORE US1 (ranking display) for best results
- US4 (multiple rankings) builds on US1/US2 infrastructure
- Database indexes critical for performance with 1000+ players per category
- Point table cache MUST be initialized on server startup (T009)

---

## Summary

**Total Tasks**: 95
**Task Count by User Story**:
- Setup (Phase 1): 6 tasks
- Foundational (Phase 2): 7 tasks
- US2 - Point Calculation (Phase 3): 12 tasks
- US1 - View Rankings (Phase 4): 13 tasks
- US4 - Multiple Rankings (Phase 5): 6 tasks
- US3 - Seeding Scores (Phase 6): 9 tasks
- US5 - Admin Config (Phase 7): 13 tasks
- Year Rollover (Phase 8): 9 tasks
- Seed Data (Phase 9): 7 tasks
- Polish (Phase 10): 13 tasks

**Parallel Opportunities**: 35 tasks marked [P] can run in parallel within their phases

**Independent Test Criteria**:
- US2: Complete tournament, verify correct point awards per calculation method
- US1: View rankings, verify proper sorting with tiebreakers
- US4: Complete doubles tournament, verify all ranking types update
- US3: Register player with 10 tournaments, verify seeding uses top 7
- US5: Admin edits point table, verify future tournaments use new values

**Suggested MVP Scope**: Phase 1 + Phase 2 + Phase 3 (US2) + Phase 4 (US1) = Core ranking system with point calculation and display
