# Tasks: Tournament Rules and Formats

**Input**: Design documents from `/specs/004-tournament-rules/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL per constitution - not explicitly requested in specification

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Backend services: `backend/src/services/`
- Backend API: `backend/src/api/`
- Frontend pages: `frontend/src/pages/`
- Frontend components: `frontend/src/components/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Review existing project structure from 003-tournament-registration
- [X] T002 [P] Install Zod validation library in backend/package.json
- [X] T003 [P] Review Prisma schema structure in backend/prisma/schema.prisma

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data models and validation that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Data Models

- [X] T004 Extend Tournament model with formatType, formatConfig, defaultScoringRules in backend/prisma/schema.prisma
- [X] T005 [P] Create Group model in backend/prisma/schema.prisma
- [X] T006 [P] Create Bracket model in backend/prisma/schema.prisma
- [X] T007 [P] Create Round model in backend/prisma/schema.prisma
- [X] T008 [P] Create Match model in backend/prisma/schema.prisma
- [X] T009 [P] Create GroupParticipant model in backend/prisma/schema.prisma
- [X] T010 Create Prisma migration for new models and Tournament extension
- [X] T011 Run Prisma migration to update database schema

### Validation Schemas and Enums

- [X] T012 [P] Create FormatType enum in backend/src/types/formatTypes.js
- [X] T013 [P] Create ScoringFormatType enum in backend/src/types/scoringTypes.js
- [X] T014 [P] Create MatchStatus enum in backend/src/types/matchStatus.js
- [X] T015 [P] Create BracketType and MatchGuaranteeType enums in backend/src/types/bracketTypes.js
- [X] T016 Create Zod schemas for FormatConfig types in backend/src/validation/formatConfigSchemas.js
- [X] T017 Create Zod schemas for ScoringRules types in backend/src/validation/scoringRulesSchemas.js
- [X] T018 Create validation helpers for format config in backend/src/validation/formatValidation.js

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Define Tournament Format and Basic Rules (Priority: P1) 🎯 MVP

**Goal**: Enable organizers to select tournament format (knockout, group, swiss, combined) and define basic match scoring rules

**Independent Test**: Create a tournament, set format to "Knockout" with "2 sets, advantage" rules, verify rules are stored and displayed correctly

### Backend Services for US1

- [ ] T019 [P] [US1] Create tournamentRulesService.js with setTournamentFormat function in backend/src/services/tournamentRulesService.js
- [ ] T020 [P] [US1] Create matchRulesService.js with basic structure in backend/src/services/matchRulesService.js
- [ ] T021 [US1] Implement validateFormatConfig function in backend/src/services/tournamentRulesService.js
- [ ] T022 [US1] Implement validateScoringRules function in backend/src/services/tournamentRulesService.js
- [ ] T023 [US1] Implement setDefaultScoringRules function in backend/src/services/tournamentRulesService.js

### Backend API for US1

- [ ] T024 [US1] Create tournamentRulesController.js in backend/src/api/tournamentRulesController.js
- [ ] T025 [US1] Implement PATCH /tournaments/:id/format endpoint in backend/src/api/tournamentRulesController.js
- [ ] T026 [US1] Implement PATCH /tournaments/:id/default-rules endpoint in backend/src/api/tournamentRulesController.js
- [ ] T027 [US1] Add validation middleware for format config in backend/src/middleware/validateRules.js
- [ ] T028 [US1] Add validation middleware for scoring rules in backend/src/middleware/validateRules.js
- [ ] T029 [US1] Register tournament rules routes in backend/src/server.js

### Frontend Services for US1

- [ ] T030 [P] [US1] Create tournamentRulesService.js API client in frontend/src/services/tournamentRulesService.js
- [ ] T031 [US1] Implement setTournamentFormat API call in frontend/src/services/tournamentRulesService.js
- [ ] T032 [US1] Implement setDefaultScoringRules API call in frontend/src/services/tournamentRulesService.js

### Frontend Components for US1

- [ ] T033 [P] [US1] Create TournamentFormatSelector.jsx component in frontend/src/components/TournamentFormatSelector.jsx
- [ ] T034 [P] [US1] Create MatchScoringRulesForm.jsx component in frontend/src/components/MatchScoringRulesForm.jsx
- [ ] T035 [US1] Create TournamentRulesSetupPage.jsx in frontend/src/pages/TournamentRulesSetupPage.jsx
- [ ] T036 [US1] Integrate TournamentFormatSelector into TournamentRulesSetupPage
- [ ] T037 [US1] Integrate MatchScoringRulesForm into TournamentRulesSetupPage
- [ ] T038 [US1] Add route for /organizer/tournament/:id/rules in frontend/src/App.jsx
- [ ] T039 [US1] Add navigation link to tournament rules setup in frontend/src/components/NavBar.jsx

**Checkpoint**: At this point, organizers can set tournament format and default scoring rules via UI

---

## Phase 4: User Story 5 - View Tournament Rules and Format (Priority: P1) 🎯 MVP

**Goal**: Enable players and organizers to clearly view tournament format, all active rules, and rule variations at different levels

**Independent Test**: View a tournament with cascading rules, verify all levels (tournament, group, round, match) are clearly displayed

### Backend Services for US5

- [ ] T040 [P] [US5] Implement getEffectiveRulesForMatch function in backend/src/services/matchRulesService.js
- [ ] T041 [US5] Implement cascade resolution logic (match → round → group/bracket → tournament) in backend/src/services/matchRulesService.js
- [ ] T042 [US5] Implement getTournamentFormatAndRules function in backend/src/services/tournamentRulesService.js
- [ ] T043 [US5] Implement getAllRuleOverrides function in backend/src/services/tournamentRulesService.js

### Backend API for US5

- [ ] T044 [US5] Implement GET /matches/:id/effective-rules endpoint in backend/src/api/tournamentRulesController.js
- [ ] T045 [US5] Implement GET /tournaments/:id/format endpoint in backend/src/api/tournamentRulesController.js
- [ ] T046 [US5] Implement GET /tournaments/:id/all-rules endpoint in backend/src/api/tournamentRulesController.js

### Frontend Services for US5

- [ ] T047 [P] [US5] Implement getEffectiveRulesForMatch API call in frontend/src/services/tournamentRulesService.js
- [ ] T048 [P] [US5] Implement getTournamentFormat API call in frontend/src/services/tournamentRulesService.js
- [ ] T049 [P] [US5] Implement getAllRuleOverrides API call in frontend/src/services/tournamentRulesService.js

### Frontend Components for US5

- [ ] T050 [P] [US5] Create RuleCascadeViewer.jsx component in frontend/src/components/RuleCascadeViewer.jsx
- [ ] T051 [P] [US5] Create TournamentFormatDisplay.jsx component in frontend/src/components/TournamentFormatDisplay.jsx
- [ ] T052 [US5] Create TournamentRulesViewPage.jsx in frontend/src/pages/TournamentRulesViewPage.jsx
- [ ] T053 [US5] Integrate RuleCascadeViewer into TournamentRulesViewPage
- [ ] T054 [US5] Integrate TournamentFormatDisplay into TournamentRulesViewPage
- [ ] T055 [US5] Add route for /tournament/:id/rules in frontend/src/App.jsx
- [ ] T056 [US5] Add "View Rules" link to TournamentRegistrationPage.jsx

**Checkpoint**: At this point, US1 and US5 (P1 MVP) are complete - organizers can set rules and everyone can view them

---

## Phase 5: User Story 2 - Configure Format-Specific Settings (Priority: P2)

**Goal**: Enable organizers to configure format-specific settings like match guarantees for knockout, group sizes for groups, and advancement rules for combined tournaments

**Independent Test**: Create knockout tournament with "2 match guarantee", group tournament with "group size 4", combined tournament with "top 2 advance to knockout", verify settings are saved and applied

### Backend Services for US2

- [ ] T057 [P] [US2] Create formatValidationService.js in backend/src/services/formatValidationService.js
- [ ] T058 [US2] Implement canDivideIntoGroups function in backend/src/services/formatValidationService.js
- [ ] T059 [US2] Implement validateAdvancementRules function in backend/src/services/formatValidationService.js
- [ ] T060 [US2] Implement validateMatchGuarantee function in backend/src/services/formatValidationService.js

### Backend API for US2

- [ ] T061 [US2] Implement POST /tournaments/validate-groups endpoint in backend/src/api/tournamentRulesController.js
- [ ] T062 [US2] Add format config validation to PATCH /tournaments/:id/format endpoint

### Frontend Components for US2

- [ ] T063 [P] [US2] Create KnockoutConfigPanel.jsx component in frontend/src/components/KnockoutConfigPanel.jsx
- [ ] T064 [P] [US2] Create GroupConfigPanel.jsx component in frontend/src/components/GroupConfigPanel.jsx
- [ ] T065 [P] [US2] Create SwissConfigPanel.jsx component in frontend/src/components/SwissConfigPanel.jsx
- [ ] T066 [P] [US2] Create CombinedConfigPanel.jsx component in frontend/src/components/CombinedConfigPanel.jsx
- [ ] T067 [US2] Create FormatConfigPanel.jsx wrapper component in frontend/src/components/FormatConfigPanel.jsx
- [ ] T068 [US2] Integrate FormatConfigPanel into TournamentRulesSetupPage.jsx
- [ ] T069 [US2] Implement validateGroups API call in frontend/src/services/tournamentRulesService.js
- [ ] T070 [US2] Add client-side group size validation in GroupConfigPanel.jsx

**Checkpoint**: At this point, organizers can configure all format-specific settings

---

## Phase 6: User Story 3 - Define Cascading Rules at Multiple Levels (Priority: P2)

**Goal**: Enable organizers to override tournament default rules at group, bracket, round, or individual match levels for maximum flexibility

**Independent Test**: Set tournament default "2 sets, advantage", override specific round to "big tiebreak", override specific match to "no advantage", verify cascade resolution shows correct effective rules

### Backend Services for US3

- [ ] T071 [P] [US3] Implement setGroupRuleOverrides function in backend/src/services/tournamentRulesService.js
- [ ] T072 [P] [US3] Implement setBracketRuleOverrides function in backend/src/services/tournamentRulesService.js
- [ ] T073 [P] [US3] Implement setRoundRuleOverrides function in backend/src/services/tournamentRulesService.js
- [ ] T074 [P] [US3] Implement setMatchRuleOverrides function in backend/src/services/tournamentRulesService.js
- [ ] T075 [US3] Add cascade validation (prevent conflicting overrides) in backend/src/services/matchRulesService.js

### Backend API for US3

- [ ] T076 [US3] Implement PATCH /groups/:id/rules endpoint in backend/src/api/tournamentRulesController.js
- [ ] T077 [US3] Implement PATCH /brackets/:id/rules endpoint in backend/src/api/tournamentRulesController.js
- [ ] T078 [US3] Implement PATCH /rounds/:id/rules endpoint in backend/src/api/tournamentRulesController.js
- [ ] T079 [US3] Implement PATCH /matches/:id/rules endpoint in backend/src/api/tournamentRulesController.js
- [ ] T080 [US3] Add authorization checks (only ORGANIZER/ADMIN can set overrides)

### Frontend Services for US3

- [ ] T081 [P] [US3] Implement setGroupRules API call in frontend/src/services/tournamentRulesService.js
- [ ] T082 [P] [US3] Implement setBracketRules API call in frontend/src/services/tournamentRulesService.js
- [ ] T083 [P] [US3] Implement setRoundRules API call in frontend/src/services/tournamentRulesService.js
- [ ] T084 [P] [US3] Implement setMatchRules API call in frontend/src/services/tournamentRulesService.js

### Frontend Components for US3

- [ ] T085 [P] [US3] Create RuleOverrideForm.jsx reusable component in frontend/src/components/RuleOverrideForm.jsx
- [ ] T086 [P] [US3] Create GroupRulesPanel.jsx in frontend/src/components/GroupRulesPanel.jsx
- [ ] T087 [P] [US3] Create BracketRulesPanel.jsx in frontend/src/components/BracketRulesPanel.jsx
- [ ] T088 [P] [US3] Create RoundRulesPanel.jsx in frontend/src/components/RoundRulesPanel.jsx
- [ ] T089 [P] [US3] Create MatchRulesPanel.jsx in frontend/src/components/MatchRulesPanel.jsx
- [ ] T090 [US3] Add rule override panels to TournamentRulesSetupPage.jsx
- [ ] T091 [US3] Add "Remove Override" functionality to each override panel
- [ ] T092 [US3] Show cascade visualization when setting overrides

**Checkpoint**: At this point, organizers can override rules at any level and see cascade resolution

---

## Phase 7: User Story 4 - Adjust Rules During Active Tournament (Priority: P2)

**Goal**: Enable organizers to modify tournament rules even after tournament has started, with changes applying only to future matches while preserving completed match records

**Independent Test**: Start tournament with "2 sets, advantage", complete some matches, change to "1 set, no advantage", verify completed matches retain original rules and new matches use updated rules

### Backend Services for US4

- [ ] T093 [P] [US4] Create ruleHistoryService.js in backend/src/services/ruleHistoryService.js
- [ ] T094 [US4] Implement captureRuleSnapshot function in backend/src/services/ruleHistoryService.js
- [ ] T095 [US4] Implement validateRuleChangeForActiveTournament function in backend/src/services/tournamentRulesService.js
- [ ] T096 [US4] Add rule change logic that preserves completed match rules in backend/src/services/tournamentRulesService.js

### Backend API for US4

- [ ] T097 [US4] Add validation to prevent format changes after matches completed in PATCH /tournaments/:id/format
- [ ] T098 [US4] Add validation to prevent rule changes on completed matches in PATCH /matches/:id/rules
- [ ] T099 [US4] Implement match completion hook to capture rule snapshot in backend/src/services/matchService.js
- [ ] T100 [US4] Add earlyTiebreakEnabled field handling for rounds in PATCH /rounds/:id/rules

### Frontend Components for US4

- [ ] T101 [P] [US4] Create RuleChangeWarningModal.jsx component in frontend/src/components/RuleChangeWarningModal.jsx
- [ ] T102 [US4] Add warning dialog when changing rules for active tournament in TournamentRulesSetupPage.jsx
- [ ] T103 [US4] Show impact message (X matches will use new rules) before confirming change
- [ ] T104 [US4] Add "Early Tiebreak" toggle for "until placement" rounds in RoundRulesPanel.jsx
- [ ] T105 [US4] Display historical rules (completedWithRules) in match details view

**Checkpoint**: At this point, organizers can safely adjust rules mid-tournament with proper safeguards

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Metadata and Utility Endpoints

- [ ] T106 [P] Implement GET /tournaments/format-types endpoint in backend/src/api/tournamentRulesController.js
- [ ] T107 [P] Implement GET /tournaments/scoring-formats endpoint in backend/src/api/tournamentRulesController.js
- [ ] T108 Implement getFormatTypes API call in frontend/src/services/tournamentRulesService.js
- [ ] T109 Implement getScoringFormats API call in frontend/src/services/tournamentRulesService.js
- [ ] T110 Use format metadata to populate dropdown options in TournamentFormatSelector.jsx

### Error Handling and Validation

- [ ] T111 [P] Add error codes to backend/src/types/errorCodes.js (INVALID_FORMAT_TYPE, FORMAT_CONFIG_MISMATCH, etc.)
- [ ] T112 [P] Add user-friendly error messages for validation failures in frontend
- [ ] T113 Add error boundary for tournament rules pages in frontend/src/components/ErrorBoundary.jsx
- [ ] T114 Add toast notifications for successful rule updates in frontend

### Documentation and Testing

- [ ] T115 [P] Update API documentation with tournament rules endpoints
- [ ] T116 [P] Add examples to quickstart.md showing all rule configuration scenarios
- [ ] T117 Run quickstart.md validation scenarios manually
- [ ] T118 Verify all user story acceptance scenarios from spec.md

### Integration with Existing Features

- [ ] T119 Update TournamentSetupPage.jsx to link to tournament rules setup
- [ ] T120 Update tournament detail views to display format and default rules
- [ ] T121 Add tournament format filter to tournament list pages
- [ ] T122 Show format icon/badge on tournament cards

### Performance and Security

- [ ] T123 [P] Add database indexes for tournament format queries in backend/prisma/schema.prisma
- [ ] T124 [P] Add caching for format metadata endpoints
- [ ] T125 Add rate limiting for rule change endpoints
- [ ] T126 Audit authorization checks for all rule modification endpoints

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - **US1 (Phase 3) - P1 MVP**: Can start after Foundational
  - **US5 (Phase 4) - P1 MVP**: Can start after Foundational (technically depends on US1 for rule cascade to have data, but can be developed in parallel)
  - **US2 (Phase 5) - P2**: Can start after Foundational, integrates with US1
  - **US3 (Phase 6) - P2**: Can start after Foundational and US1 (needs base rule setting)
  - **US4 (Phase 7) - P2**: Can start after Foundational and US1 (needs rules to modify)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **US5 (P1)**: Can start after Foundational (Phase 2) - Technically independent but needs US1 data to display
- **US2 (P2)**: Can start after Foundational (Phase 2) - Extends US1 with format-specific configs
- **US3 (P2)**: Depends on US1 completion (needs base rules to override)
- **US4 (P2)**: Depends on US1 completion (needs rules to modify during active tournament)

### Within Each User Story

- Backend services before API endpoints
- API endpoints before frontend services
- Frontend services before frontend components
- Core components before page integration
- Route registration after page creation

### Parallel Opportunities

#### Phase 2 Foundational
- All model creation tasks (T005-T009) can run in parallel
- All enum/type creation tasks (T012-T015) can run in parallel
- Validation schema tasks (T016-T018) can run in parallel after enums

#### Phase 3 (US1)
- Backend services (T019-T020) can run in parallel
- Frontend services (T030) and components (T033-T034) can run in parallel
- After backend API is ready, frontend integration can proceed

#### Phase 4 (US5)
- Service functions (T040-T043) can run in parallel
- API endpoints (T044-T046) can run in parallel after services
- Frontend service calls (T047-T049) can run in parallel
- Frontend components (T050-T051) can run in parallel

#### Phase 5 (US2)
- All config panel components (T063-T066) can run in parallel
- Service functions (T058-T060) can run in parallel

#### Phase 6 (US3)
- All backend override functions (T071-T074) can run in parallel
- All frontend API calls (T081-T084) can run in parallel
- All frontend panel components (T086-T089) can run in parallel

#### Phase 7 (US4)
- Service functions (T093-T096) can run in parallel
- Frontend components (T101) can be developed independently

#### Phase 8 Polish
- Metadata endpoints (T106-T107) can run in parallel
- Error codes and messages (T111-T112) can run in parallel
- Documentation tasks (T115-T116) can run in parallel
- Performance tasks (T123-T124) can run in parallel

---

## Parallel Example: User Story 1 (MVP)

```bash
# After Foundational Phase completes, launch US1 in parallel:

# Backend Team (parallel tasks):
Task T019: "Create tournamentRulesService.js with setTournamentFormat"
Task T020: "Create matchRulesService.js with basic structure"

# Then sequentially:
Task T021: "Implement validateFormatConfig"
Task T022: "Implement validateScoringRules"
# ... continue with API endpoints

# Frontend Team (parallel tasks, can start as soon as API contracts are known):
Task T030: "Create tournamentRulesService.js API client"
Task T033: "Create TournamentFormatSelector.jsx component"
Task T034: "Create MatchScoringRulesForm.jsx component"

# Then integrate:
Task T035: "Create TournamentRulesSetupPage.jsx"
```

---

## Implementation Strategy

### MVP First (P1 User Stories: US1 + US5)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T018) - **CRITICAL**
3. Complete Phase 3: User Story 1 (T019-T039)
4. Complete Phase 4: User Story 5 (T040-T056)
5. **STOP and VALIDATE**: Test US1 and US5 independently using quickstart scenarios
6. MVP Complete: Organizers can set format/rules, everyone can view them

### Incremental Delivery (P2 Enhanced Features)

After MVP validation:

7. Add Phase 5: User Story 2 (T057-T070) → Test independently → Format configs work
8. Add Phase 6: User Story 3 (T071-T092) → Test independently → Cascading overrides work
9. Add Phase 7: User Story 4 (T093-T105) → Test independently → Mid-tournament changes work
10. Add Phase 8: Polish (T106-T126) → Final validation → Production ready

Each phase adds value without breaking previous functionality.

### Parallel Team Strategy

With 2-3 developers after Foundational phase completes:

**Sprint 1 (MVP)**:
- Developer A: US1 backend (T019-T029)
- Developer B: US1 frontend (T030-T039)
- Developer C: US5 backend (T040-T046)

**Sprint 2 (MVP)**:
- Developer A: US5 frontend (T047-T056)
- Developer B: US2 backend (T057-T062)
- Developer C: US2 frontend (T063-T070)

**Sprint 3 (Enhanced)**:
- Developers A, B, C: US3 in parallel (backend, frontend components)

**Sprint 4 (Enhanced)**:
- Developers work on US4 and Polish tasks

---

## Notes

- **[P] tasks**: Different files, no dependencies - can run in parallel
- **[Story] label**: Maps task to specific user story for traceability
- Each user story is independently completable and testable
- Tests are OPTIONAL (not requested in spec) - focus on manual validation via quickstart scenarios
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Foundational phase (T004-T018) is CRITICAL - all stories block on this
- MVP = US1 + US5 (both P1 priorities)
- Enhanced = US2 + US3 + US4 (all P2 priorities)

---

**Total Tasks**: 126 tasks across 8 phases
**MVP Tasks**: T001-T056 (56 tasks for Setup + Foundational + US1 + US5)
**Enhanced Tasks**: T057-T105 (49 tasks for US2 + US3 + US4)
**Polish Tasks**: T106-T126 (21 tasks for cross-cutting concerns)

**Parallel Opportunities**: 40+ tasks marked [P] can be executed concurrently with proper team coordination

**Independent Test Criteria**:
- US1: Set tournament format and verify it's stored correctly
- US5: View tournament rules and verify cascade resolution displays correctly
- US2: Configure format-specific settings and verify validation works
- US3: Set rule overrides at multiple levels and verify cascade
- US4: Change rules mid-tournament and verify historical preservation
