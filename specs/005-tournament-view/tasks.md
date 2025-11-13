# Tasks: Tournament View

**Input**: Design documents from `/specs/005-tournament-view/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-endpoints.md

**Tests**: Tests are included per specification requirements (Unit, Integration, E2E tests requested in spec.md)

**Organization**: Tasks are grouped by functional requirement (user story equivalent) to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story/FR this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/` (from plan.md structure)
- Backend tests: `backend/tests/unit/`, `backend/tests/integration/`
- Frontend tests: `frontend/tests/unit/`, `frontend/tests/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and configure tooling for tournament view feature

- [ ] T001 Install SWR dependency in frontend using `npm install swr` from frontend/
- [ ] T002 [P] Add breadcrumb component to React Router configuration in frontend/src/App.jsx
- [ ] T003 [P] Verify existing error handling utilities (frontend/src/utils/errorHandler.js, ToastContext.jsx) are functional

**Checkpoint**: Dependencies installed, development environment ready

---

## Phase 2: Foundational (Backend APIs - Blocking Prerequisites)

**Purpose**: Core backend APIs that ALL frontend components depend on

**⚠️ CRITICAL**: No user story work can begin until these APIs are complete and tested

### Backend Service Layer

- [ ] T004 Create ruleComplexityService.js in backend/src/services/ with calculateComplexity() function
- [ ] T005 [P] Implement complexity calculation algorithm (DEFAULT/MODIFIED/SPECIFIC) in backend/src/services/ruleComplexityService.js per TR-004 spec
- [ ] T006 Modify tournamentService.js to add getTournamentWithRelatedData() method in backend/src/services/tournamentService.js
- [ ] T007 Add Prisma includes for category, location, backupLocation, organizer, deputyOrganizer in backend/src/services/tournamentService.js getTournamentWithRelatedData()
- [ ] T008 Add computed fields (registrationCount, waitlistCount, ruleComplexity) to getTournamentWithRelatedData() in backend/src/services/tournamentService.js

### Backend API Endpoints

- [ ] T009 Enhance GET /tournaments/:id endpoint in backend/src/api/tournamentController.js to use getTournamentWithRelatedData()
- [ ] T010 [P] Add GET /tournaments/:id/format-structure endpoint in backend/src/api/tournamentController.js
- [ ] T011 [P] Add GET /tournaments/:id/matches endpoint in backend/src/api/tournamentController.js with optional query filters (bracketId, groupId, roundId, status)
- [ ] T012 [P] Implement getFormatStructure() method in backend/src/services/tournamentService.js (returns groups/brackets/rounds based on formatType)
- [ ] T013 [P] Implement getMatches() method in backend/src/services/tournamentService.js with filtering support
- [ ] T014 Add routes for new endpoints in backend/src/api/routes/tournamentRoutes.js

### Backend Tests

- [ ] T015 [P] Write unit tests for ruleComplexityService.calculateComplexity() in backend/tests/unit/ruleComplexity.test.js (test DEFAULT, MODIFIED, SPECIFIC cases)
- [ ] T016 [P] Write integration test for GET /tournaments/:id with enhanced response in backend/tests/integration/tournamentView.test.js
- [ ] T017 [P] Write integration test for GET /tournaments/:id/format-structure (all 4 format types) in backend/tests/integration/tournamentView.test.js
- [ ] T018 [P] Write integration test for GET /tournaments/:id/matches with filters in backend/tests/integration/tournamentView.test.js

**Checkpoint**: All backend APIs complete, tested, and ready for frontend consumption

---

## Phase 3: US1 - Tournament Info Page (Priority: P1) 🎯 MVP

**Goal**: Display comprehensive tournament information including general details, format badge, and navigation

**Covers**: FR-001 (General Info), FR-002 (Format Display), FR-006 (Public Access), FR-007 (Responsive Design)

**Independent Test**: Navigate to `/tournaments/:id`, verify all tournament fields are displayed, no authentication required, responsive on mobile

### Frontend Service Layer

- [ ] T019 [US1] Create tournamentViewService.js in frontend/src/services/ with getTournamentById() function
- [ ] T020 [P] [US1] Add getFormatTypes() function to frontend/src/services/tournamentViewService.js (for format labels)
- [ ] T021 [P] [US1] Implement SWR wrapper functions (useTournament hook) in frontend/src/services/tournamentViewService.js

### Frontend Components - Page Structure

- [ ] T022 [US1] Create TournamentViewPage.jsx in frontend/src/pages/ with SWR data fetching
- [ ] T023 [P] [US1] Add route for `/tournaments/:id` in frontend/src/App.jsx pointing to TournamentViewPage
- [ ] T024 [P] [US1] Create TournamentHeader component in frontend/src/components/TournamentHeader.jsx (displays name, status badge, category badge, format badge)
- [ ] T025 [P] [US1] Create TournamentFormatBadge component in frontend/src/components/TournamentFormatBadge.jsx with format type icons

### Frontend Components - Info Panel

- [ ] T026 [US1] Create TournamentInfoPanel component in frontend/src/components/TournamentInfoPanel.jsx with two-column layout
- [ ] T027 [US1] Implement Location & Schedule column in TournamentInfoPanel (location, backup location, courts, dates, registration window)
- [ ] T028 [US1] Implement Organizer & Registration column in TournamentInfoPanel (organizer, deputy organizer, entry fee, prize, capacity, registration status)
- [ ] T029 [US1] Add date formatting utility (user-friendly format) in TournamentInfoPanel
- [ ] T030 [US1] Add currency formatting for entry fee in TournamentInfoPanel
- [ ] T031 [US1] Handle null/optional fields gracefully in TournamentInfoPanel (show "Not specified" or hide)

### Frontend Components - Navigation

- [ ] T032 [P] [US1] Add Breadcrumb navigation (Home > Tournaments > [Tournament Name]) in TournamentViewPage.jsx
- [ ] T033 [P] [US1] Add external rules link (if rulesUrl exists) with target="_blank" rel="noopener noreferrer" in TournamentInfoPanel

### Responsive Design (FR-007)

- [ ] T034 [US1] Implement Bootstrap grid responsive layout in TournamentViewPage.jsx (mobile-friendly)
- [ ] T035 [US1] Test mobile responsiveness for TournamentHeader and TournamentInfoPanel components

### Integration & Testing

- [ ] T036 [US1] Write integration test for TournamentViewPage render with all fields in frontend/tests/e2e/tournamentView.spec.js
- [ ] T037 [US1] Verify public access (no authentication check) in TournamentViewPage.jsx
- [ ] T038 [US1] Test with tournament data containing null optional fields (backupLocation, deputyOrganizer, etc.)

**Checkpoint**: Basic tournament info page works independently - users can view all tournament details without authentication

---

## Phase 4: US2 - Tournament Rules Modal (Priority: P1)

**Goal**: Display tournament rules in a modal popup with complexity indicator

**Covers**: FR-003 (Tournament Rules Display)

**Independent Test**: Click "View Rules" button, modal opens showing formatted rules with complexity indicator, close modal

### Frontend Components - Rules Modal

- [ ] T039 [P] [US2] Create RuleComplexityIndicator component in frontend/src/components/RuleComplexityIndicator.jsx (displays 🟢🟡🔴 icons with tooltips)
- [ ] T040 [US2] Create TournamentRulesModal component in frontend/src/components/TournamentRulesModal.jsx with tabbed interface (Format, Scoring, Overrides tabs)
- [ ] T041 [US2] Implement Format tab in TournamentRulesModal (parse formatConfig JSON, display human-readable format)
- [ ] T042 [US2] Implement Scoring tab in TournamentRulesModal (parse defaultScoringRules JSON, display in formatted view)
- [ ] T043 [US2] Implement Overrides tab in TournamentRulesModal (display group/round/match overrides if complexity is MODIFIED or SPECIFIC)
- [ ] T044 [US2] Add expandable "Show JSON" accordion in TournamentRulesModal (collapsed by default, shows raw configuration)
- [ ] T045 [US2] Add "View Rules" button with complexity indicator to TournamentInfoPanel (triggers modal open)

### JSON Parsing Utilities

- [ ] T046 [P] [US2] Create formatConfig parser function in frontend/src/services/tournamentViewService.js (handles all 4 format types)
- [ ] T047 [P] [US2] Create scoringRules parser function in frontend/src/services/tournamentViewService.js (converts JSON to human-readable text)

### Testing

- [ ] T048 [P] [US2] Write unit test for formatConfig parser (test KNOCKOUT, GROUP, SWISS, COMBINED) in frontend/tests/unit/components/TournamentRulesModal.test.js
- [ ] T049 [P] [US2] Write unit test for scoringRules parser in frontend/tests/unit/components/TournamentRulesModal.test.js
- [ ] T050 [US2] Write integration test for modal open/close interaction in frontend/tests/e2e/tournamentView.spec.js
- [ ] T051 [US2] Test rule complexity indicator display (DEFAULT, MODIFIED, SPECIFIC) in frontend/tests/e2e/tournamentView.spec.js

**Checkpoint**: Tournament rules modal works independently - users can view formatted rules with complexity indicator

---

## Phase 5: US3 - Player List (Priority: P1)

**Goal**: Display all registered players with status, rankings, and waitlist support

**Covers**: FR-004 (Player List Display)

**Independent Test**: View player list with registered players, expand waitlist, see player status badges and rankings

### Frontend Components - Player List

- [ ] T052 [US3] Create PlayerListPanel component in frontend/src/components/PlayerListPanel.jsx with table layout
- [ ] T053 [US3] Implement registered players table in PlayerListPanel (columns: Name, Ranking, Seed, Status, Format-specific data)
- [ ] T054 [US3] Fetch player rankings from CategoryRanking model via API in PlayerListPanel
- [ ] T055 [US3] Add status badges (REGISTERED, WAITLISTED, WITHDRAWN, CANCELLED) with Bootstrap colors in PlayerListPanel
- [ ] T056 [US3] Implement waitlist toggle button (collapsed by default) in PlayerListPanel
- [ ] T057 [US3] Sort waitlist by tournament.waitlistDisplayOrder (REGISTRATION_TIME or ALPHABETICAL) in PlayerListPanel
- [ ] T058 [US3] Handle empty state (no players registered) in PlayerListPanel
- [ ] T059 [US3] Add conditional player search box (show only if > 50 players) in PlayerListPanel per research.md decision Q3

### Format-Specific Display Logic

- [ ] T060 [US3] Add format-specific columns logic in PlayerListPanel (only show relevant columns based on formatType)
- [ ] T061 [US3] Display group name/position for GROUP format in PlayerListPanel
- [ ] T062 [US3] Display current round/bracket for KNOCKOUT format in PlayerListPanel
- [ ] T063 [US3] Display both group and bracket data for COMBINED format in PlayerListPanel
- [ ] T064 [US3] Display placement for SWISS format in PlayerListPanel

### Testing

- [ ] T065 [P] [US3] Write integration test for player list display with various statuses in frontend/tests/e2e/tournamentView.spec.js
- [ ] T066 [P] [US3] Test waitlist expand/collapse interaction in frontend/tests/e2e/tournamentView.spec.js
- [ ] T067 [P] [US3] Test search functionality (if > 50 players) in frontend/tests/e2e/tournamentView.spec.js
- [ ] T068 [US3] Test responsive layout for player list on mobile in frontend/tests/e2e/tournamentView.spec.js

**Checkpoint**: Player list works independently - users can view all registered and waitlisted players with status

---

## Phase 6: US4 - Format Visualization (Priority: P2) 📈 Post-MVP

**Goal**: Display graphical format visualization (brackets, groups, swiss rounds) with expand/collapse

**Covers**: FR-005 (Format Visualization)

**Independent Test**: Expand bracket/group, see match results, collapse, verify horizontal scroll on large brackets

### Frontend Service Layer - Format Data

- [ ] T069 [US4] Add getFormatStructure() function to frontend/src/services/tournamentViewService.js (fetches groups/brackets/rounds)
- [ ] T070 [P] [US4] Add getMatches() function to frontend/src/services/tournamentViewService.js (fetches matches with filters)
- [ ] T071 [P] [US4] Implement SWR caching hooks (useFormatStructure, useMatches) in frontend/src/services/tournamentViewService.js

### Frontend Components - Visualization Wrapper

- [ ] T072 [US4] Create FormatVisualization component in frontend/src/components/FormatVisualization.jsx (wrapper that selects correct visualization based on formatType)
- [ ] T073 [P] [US4] Create ExpandableSection component in frontend/src/components/ExpandableSection.jsx (reusable expand/collapse wrapper)
- [ ] T074 [P] [US4] Create MatchResultDisplay component in frontend/src/components/MatchResultDisplay.jsx (formats match result JSON)

### Frontend Components - Group Visualization

- [ ] T075 [US4] Create GroupStandingsTable component in frontend/src/components/GroupStandingsTable.jsx (displays group standings as table)
- [ ] T076 [US4] Implement standings calculation in GroupStandingsTable (wins, losses, points, head-to-head sorting)
- [ ] T077 [US4] Display matches within group in GroupStandingsTable (match results from API)

### Frontend Components - Knockout Bracket

- [ ] T078 [US4] Create KnockoutBracket component in frontend/src/components/KnockoutBracket.jsx using CSS Grid layout per research.md decision R1
- [ ] T079 [US4] Implement BracketRound sub-component in KnockoutBracket (recursive round structure)
- [ ] T080 [US4] Implement BracketMatch sub-component in KnockoutBracket (displays match with player names and result)
- [ ] T081 [US4] Add match connectors (lines between rounds) using CSS Grid in KnockoutBracket
- [ ] T082 [US4] Implement horizontal scroll for large brackets (> 32 players) in KnockoutBracket per research.md decision Q2
- [ ] T083 [US4] Add visual scroll indicators ("← Scroll to see more →") in KnockoutBracket
- [ ] T084 [US4] Add match status colors (SCHEDULED: gray, IN_PROGRESS: blue, COMPLETED: green, CANCELLED: red) in KnockoutBracket

### Frontend Components - Swiss Visualization

- [ ] T085 [US4] Create SwissRoundPairings component in frontend/src/components/SwissRoundPairings.jsx (displays round pairings and standings)
- [ ] T086 [US4] Implement current standings calculation in SwissRoundPairings (wins, Buchholz tiebreaker)

### Frontend Components - Combined Format

- [ ] T087 [US4] Create CombinedFormatDisplay component in frontend/src/components/CombinedFormatDisplay.jsx (orchestrates both GroupStandingsTable and KnockoutBracket)

### Lazy Loading & Performance

- [ ] T088 [US4] Implement lazy loading for format structure (fetch only when visualization section is expanded) in FormatVisualization.jsx
- [ ] T089 [US4] Implement lazy loading for matches (fetch only when specific bracket/group is expanded) in FormatVisualization.jsx
- [ ] T090 [US4] Add loading skeletons for format structure in FormatVisualization.jsx
- [ ] T091 [US4] Add loading skeletons for matches in GroupStandingsTable and KnockoutBracket

### Testing

- [ ] T092 [P] [US4] Write unit test for match result parser in frontend/tests/unit/components/MatchResultDisplay.test.js
- [ ] T093 [P] [US4] Write unit test for standings calculation (group) in frontend/tests/unit/components/GroupStandingsTable.test.js
- [ ] T094 [P] [US4] Write unit test for standings calculation (swiss) in frontend/tests/unit/components/SwissRoundPairings.test.js
- [ ] T095 [P] [US4] Write integration test for GROUP format visualization in frontend/tests/e2e/tournamentView.spec.js
- [ ] T096 [P] [US4] Write integration test for KNOCKOUT format visualization in frontend/tests/e2e/tournamentView.spec.js
- [ ] T097 [P] [US4] Write integration test for SWISS format visualization in frontend/tests/e2e/tournamentView.spec.js
- [ ] T098 [P] [US4] Write integration test for COMBINED format visualization in frontend/tests/e2e/tournamentView.spec.js
- [ ] T099 [US4] Test expand/collapse functionality for brackets and groups in frontend/tests/e2e/tournamentView.spec.js
- [ ] T100 [US4] Test horizontal scroll behavior on large brackets (128 players) in frontend/tests/e2e/tournamentView.spec.js

**Checkpoint**: Format visualization works independently - users can view graphical brackets, groups, and match results

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Performance optimization, accessibility, and final integration

### Performance Optimization

- [ ] T101 [P] Verify SWR caching TTL (30s for tournament, 60s for standings) in frontend/src/services/tournamentViewService.js
- [ ] T102 [P] Add React.memo to expensive components (KnockoutBracket, GroupStandingsTable) in respective component files
- [ ] T103 Performance test: Verify page load < 2 seconds using Lighthouse
- [ ] T104 Performance test: Verify bracket rendering < 1 second for 128-player bracket
- [ ] T105 Performance test: Verify rules modal opens in < 200ms

### Accessibility (WCAG AA)

- [ ] T106 [P] Add ARIA labels to expand/collapse buttons in ExpandableSection.jsx
- [ ] T107 [P] Add ARIA labels to rules modal in TournamentRulesModal.jsx
- [ ] T108 [P] Implement keyboard navigation (Tab, Enter, Escape) in TournamentRulesModal.jsx
- [ ] T109 [P] Verify color contrast for rule complexity indicators (🟢🟡🔴) using WCAG checker
- [ ] T110 [P] Add semantic HTML (header, nav, main, section) in TournamentViewPage.jsx
- [ ] T111 Add focus management for modal open/close in TournamentRulesModal.jsx
- [ ] T112 Test screen reader announcements for dynamic content (expanded sections) in frontend/tests/e2e/tournamentView.spec.js
- [ ] T113 Run accessibility audit with Lighthouse (target: zero violations)

### Error Handling

- [ ] T114 [P] Add ErrorBoundary wrapper to TournamentViewPage.jsx (catch React errors)
- [ ] T115 [P] Add error state handling for failed API calls in TournamentViewPage.jsx
- [ ] T116 Test error scenarios: tournament not found (404), network failure, invalid data in frontend/tests/e2e/tournamentView.spec.js

### Integration & E2E Tests

- [ ] T117 [P] E2E test: Full user journey (navigate, view info, open rules, view players, expand bracket) in frontend/tests/e2e/tournamentView.spec.js
- [ ] T118 [P] E2E test: Mobile responsive behavior (all components) in frontend/tests/e2e/tournamentView.spec.js
- [ ] T119 Test tournament with no matches created (empty state handling) in frontend/tests/e2e/tournamentView.spec.js
- [ ] T120 Test tournament with no players registered (empty state handling) in frontend/tests/e2e/tournamentView.spec.js

### Documentation

- [ ] T121 Update CLAUDE.md with new route `/tournaments/:id` and 13 new components
- [ ] T122 Add code comments for complex logic (complexity calculation, standings calculation, bracket layout)
- [ ] T123 Verify quickstart.md walkthrough is accurate and executable

### Final Validation

- [ ] T124 Run all backend unit tests (ruleComplexity) and verify they pass
- [ ] T125 Run all backend integration tests (enhanced API endpoints) and verify they pass
- [ ] T126 Run all frontend unit tests (parsers, calculations) and verify they pass
- [ ] T127 Run all frontend E2E tests (user journeys) and verify they pass
- [ ] T128 Manual smoke test: Load tournament view page, verify all features work end-to-end
- [ ] T129 Verify performance benchmarks met (< 2s page load, < 1s bracket render, < 200ms modal)
- [ ] T130 Verify accessibility compliance (WCAG AA, Lighthouse score > 90)

**Checkpoint**: Feature complete, tested, accessible, performant, and ready for deployment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational (Phase 2) - MVP foundation
- **US2 (Phase 4)**: Depends on US1 (needs page structure) - MVP enhancement
- **US3 (Phase 5)**: Depends on US1 (needs page structure) - MVP enhancement
- **US4 (Phase 6)**: Depends on US1 (needs page structure) - Post-MVP
- **Polish (Phase 7)**: Depends on desired user stories being complete

### User Story Dependencies

- **US1 (Tournament Info Page)**: Independent - creates page foundation
- **US2 (Rules Modal)**: Depends on US1 (integrates into page) - but modal itself is independent
- **US3 (Player List)**: Depends on US1 (integrates into page) - but panel itself is independent
- **US4 (Format Visualization)**: Depends on US1 (integrates into page) - can be deferred to P2

### Within Each User Story

- Backend tests before backend implementation
- Frontend service layer before components
- Base components before specialized components
- Core implementation before integration
- Unit tests in parallel, integration tests after implementation

### Parallel Opportunities

**Phase 1 (Setup)**: All 3 tasks can run in parallel

**Phase 2 (Foundational)**:
- T005, T015 (rule complexity service + tests) - parallel
- T010, T011 (new endpoints) - parallel
- T012, T013 (new service methods) - parallel
- T016, T017, T018 (integration tests) - parallel

**Phase 3 (US1)**:
- T020, T021 (service functions) - parallel
- T024, T025 (header components) - parallel
- T032, T033 (navigation components) - parallel

**Phase 4 (US2)**:
- T039, T046, T047 (complexity indicator + parsers) - parallel
- T048, T049 (parser tests) - parallel

**Phase 5 (US3)**:
- T060-T064 (format-specific columns) - parallel
- T065, T066, T067, T068 (integration tests) - parallel

**Phase 6 (US4)**:
- T070, T071 (service hooks) - parallel
- T073, T074 (utility components) - parallel
- T092, T093, T094 (unit tests) - parallel
- T095, T096, T097, T098 (format-specific E2E tests) - parallel

**Phase 7 (Polish)**:
- T101, T102, T106-T110, T114, T115 (optimization + accessibility) - all parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch all backend service tasks together:
Task: "Implement complexity calculation algorithm in ruleComplexityService.js"
Task: "Add new endpoint GET /tournaments/:id/format-structure"
Task: "Add new endpoint GET /tournaments/:id/matches"

# Launch all backend tests together:
Task: "Write unit tests for ruleComplexityService"
Task: "Write integration test for enhanced GET /tournaments/:id"
Task: "Write integration test for GET /tournaments/:id/format-structure"
Task: "Write integration test for GET /tournaments/:id/matches"
```

---

## Implementation Strategy

### MVP First (P1 Only)

**Minimum Viable Product**: Tournament info page with rules and player list

1. Complete Phase 1: Setup (3 tasks)
2. Complete Phase 2: Foundational APIs (15 tasks) - CRITICAL blocker
3. Complete Phase 3: US1 - Tournament Info Page (20 tasks) - Core MVP
4. Complete Phase 4: US2 - Rules Modal (13 tasks) - MVP enhancement
5. Complete Phase 5: US3 - Player List (17 tasks) - MVP complete
6. **STOP and VALIDATE**: Test all P1 features independently
7. Complete Phase 7: Polish (30 tasks) - subset for MVP
8. Deploy/demo MVP

**Total MVP Tasks**: ~98 tasks (excludes P2 format visualization)

### Full Feature (P1 + P2)

**Post-MVP Enhancement**: Add graphical format visualization

1. Complete MVP (Phases 1-5 + Polish subset)
2. Complete Phase 6: US4 - Format Visualization (32 tasks)
3. Complete remaining Polish tasks
4. Deploy/demo full feature

**Total Feature Tasks**: ~130 tasks

### Incremental Delivery Timeline

- **Sprint 1** (Setup + Backend): Phases 1-2 → Backend APIs ready
- **Sprint 2** (MVP Core): Phase 3 → Tournament info page working
- **Sprint 3** (MVP Enhancement): Phases 4-5 → Rules modal + player list added
- **Sprint 4** (MVP Polish): Phase 7 (subset) → MVP production-ready
- **Sprint 5** (P2): Phase 6 → Format visualization added
- **Sprint 6** (Final Polish): Phase 7 (remaining) → Full feature complete

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story/FR for traceability
- Each user story should be independently completable and testable
- Backend APIs (Phase 2) are blocking - must complete before any frontend work
- US1 creates page foundation that US2, US3, US4 integrate into
- FR-006 (Public Access) and FR-007 (Responsive Design) are baked into all components, not separate phases
- Tests are written alongside implementation per spec requirements
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- MVP does not include FR-005 (Format Visualization) - defer to P2
