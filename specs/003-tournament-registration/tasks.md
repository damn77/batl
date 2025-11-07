# Tasks: Tournament Registration & Enhanced Tournament Management

**Input**: Design documents from `/specs/003-tournament-registration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL for this feature (not explicitly requested in specification). Only generate test tasks if adopting TDD approach.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/`, `backend/prisma/`
- **Frontend**: `frontend/src/`
- **Tests**: `backend/tests/`, `frontend/tests/` (optional)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema updates and optional testing framework setup

- [ ] T001 Create database migration for new enums (TournamentRegistrationStatus, WaitlistDisplayOrder) in backend/prisma/migrations/
- [ ] T002 [P] Extend Tournament model with enhanced fields (capacity, organizerEmail, organizerPhone, entryFee, rulesUrl, prizeDescription, registrationOpenDate, registrationCloseDate, minParticipants, waitlistDisplayOrder, lastStatusChange) in backend/prisma/schema.prisma
- [ ] T003 [P] Extend CategoryRegistration model with hasParticipated field in backend/prisma/schema.prisma
- [ ] T004 [P] Create TournamentRegistration model with all fields and indexes in backend/prisma/schema.prisma
- [ ] T005 Run migration and generate Prisma client with `npx prisma migrate dev --name add_tournament_registration`
- [ ] T006 [P] (OPTIONAL) Install Vitest and configure for backend in backend/package.json and backend/vitest.config.js
- [ ] T007 [P] (OPTIONAL) Install Vitest and @testing-library/react for frontend in frontend/package.json and frontend/vitest.config.js

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core validation and shared utilities that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T008 Extend validation middleware with registration validation schemas in backend/src/middleware/validate.js
- [ ] T009 [P] Create validation schema for tournament registration (tournamentId, playerId) in backend/src/middleware/validate.js
- [ ] T010 [P] Create validation schema for enhanced tournament creation (all optional fields) in backend/src/middleware/validate.js
- [ ] T011 [P] Create validation schema for waitlist operations in backend/src/middleware/validate.js

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Register for Tournament with Auto-Category Registration (Priority: P1) 🎯 MVP

**Goal**: Enable players to register for tournaments with automatic category enrollment if they're not already in the category

**Independent Test**: Register a player for a tournament and verify they're automatically registered in the tournament's category. Verify capacity tracking and waitlist assignment when tournament is full.

### Implementation for User Story 1

- [ ] T012 [P] [US1] Create tournamentRegistrationService.js with registerPlayer method in backend/src/services/tournamentRegistrationService.js
- [ ] T013 [P] [US1] Implement capacity check logic (count REGISTERED, compare to capacity) in backend/src/services/tournamentRegistrationService.js
- [ ] T014 [P] [US1] Implement anti-spam protection (waitlist requires category membership) in backend/src/services/tournamentRegistrationService.js
- [ ] T015 [US1] Implement auto-category registration logic (create CategoryRegistration if REGISTERED status) in backend/src/services/tournamentRegistrationService.js
- [ ] T016 [US1] Implement registration window validation (registrationOpenDate, registrationCloseDate) in backend/src/services/tournamentRegistrationService.js
- [ ] T017 [US1] Implement duplicate registration prevention in backend/src/services/tournamentRegistrationService.js
- [ ] T018 [P] [US1] Create registrationController.js with register endpoint in backend/src/api/registrationController.js
- [ ] T019 [P] [US1] Create registrationRoutes.js with POST /api/tournaments/:id/register route in backend/src/api/routes/registrationRoutes.js
- [ ] T020 [US1] Mount registrationRoutes in backend/src/index.js
- [ ] T021 [P] [US1] Create tournamentRegistrationService.js frontend API client in frontend/src/services/tournamentRegistrationService.js
- [ ] T022 [P] [US1] Create TournamentRegistrationPage.jsx with registration form in frontend/src/pages/TournamentRegistrationPage.jsx
- [ ] T023 [P] [US1] Create RegistrationStatusBadge.jsx component for displaying status in frontend/src/components/RegistrationStatusBadge.jsx
- [ ] T024 [US1] Add /player/tournaments/register route in frontend/src/App.jsx
- [ ] T025 [US1] Integrate eligibility validation from categoryService before allowing registration in backend/src/services/tournamentRegistrationService.js

**Checkpoint**: At this point, User Story 1 should be fully functional - players can register for tournaments with auto-category enrollment, capacity enforcement, and anti-spam protection

---

## Phase 4: User Story 2 - Unregister from Tournament with Smart Category Cleanup (Priority: P1) 🎯 MVP

**Goal**: Enable players to withdraw from tournaments with automatic category unregistration when they have no remaining participation in that category

**Independent Test**: Register a player for two tournaments in the same category, withdraw from one (stays in category), then withdraw from the second (auto-removes from category if hasParticipated=false)

### Implementation for User Story 2

- [ ] T026 [P] [US2] Implement unregisterPlayer method with auto-promotion logic in backend/src/services/tournamentRegistrationService.js
- [ ] T027 [P] [US2] Implement transaction-based waitlist auto-promotion (query oldest WAITLISTED by timestamp) in backend/src/services/tournamentRegistrationService.js
- [ ] T028 [US2] Implement smart category cleanup logic (check hasParticipated and active tournaments) in backend/src/services/tournamentRegistrationService.js
- [ ] T029 [US2] Extend categoryService with shouldUnregisterFromCategory method in backend/src/services/categoryService.js
- [ ] T030 [P] [US2] Add unregister endpoint (DELETE) in backend/src/api/registrationController.js
- [ ] T031 [P] [US2] Add DELETE /api/tournaments/:id/register route in backend/src/api/routes/registrationRoutes.js
- [ ] T032 [US2] Add unregister method to frontend tournamentRegistrationService in frontend/src/services/tournamentRegistrationService.js
- [ ] T033 [US2] Add unregister button and confirmation dialog to TournamentRegistrationPage in frontend/src/pages/TournamentRegistrationPage.jsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - complete MVP registration flow

---

## Phase 5: User Story 3 - Create Tournament with Enhanced Details (Priority: P2)

**Goal**: Enable organizers to create tournaments with comprehensive logistical information including location, capacity, organizer contacts, and entry costs

**Independent Test**: Create a tournament with all optional enhanced fields and verify the information is stored and displayed correctly

### Implementation for User Story 3

- [ ] T034 [P] [US3] Extend tournamentService.js with enhanced field handling in POST /tournaments in backend/src/services/tournamentService.js
- [ ] T035 [US3] Add validation for enhanced tournament fields (capacity >= 0, valid dates, email format) in backend/src/services/tournamentService.js
- [ ] T036 [US3] Extend tournament controller POST handler with new fields in backend/src/api/tournamentController.js
- [ ] T037 [P] [US3] Extend TournamentSetupPage.jsx with form fields for all enhanced details in frontend/src/pages/TournamentSetupPage.jsx
- [ ] T038 [P] [US3] Add waitlist display order dropdown (REGISTRATION_TIME or ALPHABETICAL) in frontend/src/pages/TournamentSetupPage.jsx
- [ ] T039 [US3] Extend frontend tournamentService with enhanced field handling in frontend/src/services/tournamentService.js
- [ ] T040 [US3] Add form validation for enhanced fields (required capacity > 0, valid email/phone, dates) in frontend/src/pages/TournamentSetupPage.jsx

**Checkpoint**: Organizers can now create tournaments with full logistical details

---

## Phase 6: User Story 4 - Manage Tournament Lifecycle (Priority: P2)

**Goal**: Enable organizers to update tournament details and manage tournament status (start, complete, cancel) with appropriate handling of registrations

**Independent Test**: Update tournament details and verify changes, start tournament, complete tournament (sets hasParticipated=true), cancel tournament (marks all registrations as CANCELLED)

### Implementation for User Story 4

- [ ] T041 [P] [US4] Implement PATCH /tournaments/:id endpoint with validation in backend/src/api/tournamentController.js
- [ ] T042 [P] [US4] Implement capacity change logic (auto-promote if increased, auto-demote if decreased) in backend/src/services/tournamentService.js
- [ ] T043 [P] [US4] Implement startTournament method (SCHEDULED → IN_PROGRESS) in backend/src/services/tournamentService.js
- [ ] T044 [P] [US4] Implement completeTournament method with hasParticipated update in backend/src/services/tournamentService.js
- [ ] T045 [P] [US4] Implement cancelTournament method (bulk update to CANCELLED, trigger category cleanup) in backend/src/services/tournamentService.js
- [ ] T046 [US4] Add lifecycle routes: POST /tournaments/:id/start, /complete, /cancel in backend/src/api/routes/tournamentRoutes.js
- [ ] T047 [US4] Implement status transition validation (prevent invalid transitions) in backend/src/services/tournamentService.js
- [ ] T048 [US4] Add tournament update form to TournamentSetupPage with lifecycle action buttons in frontend/src/pages/TournamentSetupPage.jsx
- [ ] T049 [US4] Add confirmation dialogs for start, complete, cancel actions in frontend/src/pages/TournamentSetupPage.jsx

**Checkpoint**: Organizers can manage full tournament lifecycle including updates and cancellations

---

## Phase 7: User Story 5 - Waitlist Management for Full Tournaments (Priority: P2)

**Goal**: Enable players to join waitlists when tournaments are full, with automatic promotion when spots open and organizer manual management capabilities

**Independent Test**: Fill tournament to capacity, add players to waitlist, unregister someone and verify auto-promotion, test manual promotion/demotion by organizer

### Implementation for User Story 5

- [ ] T050 [P] [US5] Implement GET /tournaments/:id/waitlist endpoint with configurable display order in backend/src/api/registrationController.js
- [ ] T051 [P] [US5] Implement calculateWaitlistPosition utility in backend/src/services/tournamentRegistrationService.js
- [ ] T052 [P] [US5] Implement promoteFromWaitlist method (manual promotion with organizer tracking) in backend/src/services/tournamentRegistrationService.js
- [ ] T053 [P] [US5] Implement demoteToWaitlist method with auto-promotion option in backend/src/services/tournamentRegistrationService.js
- [ ] T054 [P] [US5] Add waitlist management routes (GET /waitlist, POST /promote, POST /demote) in backend/src/api/routes/registrationRoutes.js
- [ ] T055 [P] [US5] Implement PATCH /tournaments/:id/waitlist-display endpoint in backend/src/api/tournamentController.js
- [ ] T056 [P] [US5] Create WaitlistManagementModal.jsx component with promotion options in frontend/src/components/WaitlistManagementModal.jsx
- [ ] T057 [US5] Add two-step modal workflow (auto-promote vs manual select) in frontend/src/components/WaitlistManagementModal.jsx
- [ ] T058 [US5] Add waitlist display to TournamentDetailPage with manual management buttons in frontend/src/pages/TournamentDetailPage.jsx
- [ ] T059 [US5] Add waitlist display order configuration to TournamentSetupPage in frontend/src/pages/TournamentSetupPage.jsx

**Checkpoint**: Full waitlist functionality operational with auto-promotion and manual management

---

## Phase 8: User Story 6 - View Tournament Participants and Manage Capacity (Priority: P3)

**Goal**: Enable organizers and public users to view all registered and waitlisted participants with capacity indicators

**Independent Test**: Register multiple players and view the participant list with capacity counts, waitlist positions, and registration statuses

### Implementation for User Story 6

- [ ] T060 [P] [US6] Implement GET /tournaments/:id endpoint with include query params (participants, waitlist, stats) in backend/src/api/tournamentController.js
- [ ] T061 [P] [US6] Implement GET /tournaments list with filtering (registrationOpen, hasCapacity, status) in backend/src/api/tournamentController.js
- [ ] T062 [P] [US6] Implement GET /registration/status endpoint for authenticated player in backend/src/api/registrationController.js
- [ ] T063 [P] [US6] Create TournamentDetailPage.jsx with participant list and statistics in frontend/src/pages/TournamentDetailPage.jsx
- [ ] T064 [P] [US6] Add participant table with status badges and timestamps in frontend/src/pages/TournamentDetailPage.jsx
- [ ] T065 [P] [US6] Add capacity indicator (X/Y registered, Z waitlisted) in frontend/src/pages/TournamentDetailPage.jsx
- [ ] T066 [US6] Add /tournaments/:id route for detail page in frontend/src/App.jsx
- [ ] T067 [US6] Add tournament filtering to tournament list page in frontend/src/pages/TournamentSetupPage.jsx

**Checkpoint**: All user stories should now be independently functional - complete feature implementation

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T068 [P] Add error handling and user-friendly error messages across all registration endpoints in backend/src/api/registrationController.js
- [ ] T069 [P] Add loading states and optimistic updates to all registration UI in frontend/src/pages/
- [ ] T070 [P] Add success/error toast notifications for registration actions in frontend/src/pages/TournamentRegistrationPage.jsx
- [ ] T071 [P] Verify quickstart.md scenarios work end-to-end (Steps 1-13)
- [ ] T072 [P] Add audit logging for registration operations in backend/src/services/tournamentRegistrationService.js
- [ ] T073 [P] Performance optimization: verify waitlist queries use composite indexes in backend/prisma/schema.prisma
- [ ] T074 [P] Security review: verify anti-spam protection and authorization checks in backend/src/api/registrationController.js
- [ ] T075 Code cleanup and comment documentation in backend/src/services/tournamentRegistrationService.js

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1 (P1) and US2 (P1) are MVP - implement first
  - US3, US4, US5 (P2) can proceed after MVP or in parallel
  - US6 (P3) is lowest priority
- **Polish (Phase 9)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1 - MVP)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1 - MVP)**: Can start after Foundational - Shares tournamentRegistrationService with US1 but independently testable
- **User Story 3 (P2)**: Can start after Foundational - Extends existing tournament creation, no dependency on US1/US2
- **User Story 4 (P2)**: Can start after Foundational - Tournament lifecycle independent of registration
- **User Story 5 (P2)**: Depends on US1 for registration flow, but waitlist logic is independent
- **User Story 6 (P3)**: Can start after Foundational - Viewing functionality independent of creation/registration

### Within Each User Story

- Backend services before controllers
- Controllers before routes
- Routes mounted before frontend work begins
- Frontend services before components
- Components before pages
- Pages before routes added to App.jsx

### Parallel Opportunities

- **Setup Phase**: T002, T003, T004 (different models), T006, T007 (different projects)
- **Foundational Phase**: T009, T010, T011 (different validation schemas)
- **Within US1**: T012-T014 (service methods), T018-T019 (controller/routes), T021-T023 (frontend components)
- **Within US2**: T026-T027 (service methods), T030-T031 (controller/routes)
- **Within US3**: T034, T037-T038 (backend/frontend)
- **Within US4**: T041-T045 (different service methods)
- **Within US5**: T050-T055 (different endpoints), T056-T059 (frontend components)
- **Within US6**: T060-T062 (different endpoints), T063-T067 (frontend pages)
- **Polish Phase**: T068-T075 (all independent improvements)
- **Between User Stories**: Once Foundational complete, different developers can work on US1, US3, US4 in parallel

---

## Parallel Example: User Story 1 (MVP)

```bash
# Backend services (parallel start):
Task: "Create tournamentRegistrationService.js with registerPlayer method"
Task: "Implement capacity check logic"
Task: "Implement anti-spam protection"

# Backend API (parallel after services complete):
Task: "Create registrationController.js with register endpoint"
Task: "Create registrationRoutes.js with POST route"

# Frontend (parallel):
Task: "Create tournamentRegistrationService.js frontend API client"
Task: "Create TournamentRegistrationPage.jsx"
Task: "Create RegistrationStatusBadge.jsx component"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup (database migration)
2. Complete Phase 2: Foundational (validation schemas)
3. Complete Phase 3: User Story 1 (registration with auto-category)
4. Complete Phase 4: User Story 2 (unregistration with cleanup)
5. **STOP and VALIDATE**: Test US1 and US2 independently
6. Deploy/demo MVP

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 + 2 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 3 → Test enhanced tournament creation → Deploy/Demo
4. Add User Story 4 → Test lifecycle management → Deploy/Demo
5. Add User Story 5 → Test waitlist functionality → Deploy/Demo
6. Add User Story 6 → Test participant viewing → Deploy/Demo
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 + 2 (MVP core)
   - Developer B: User Story 3 + 4 (tournament management)
   - Developer C: User Story 5 + 6 (waitlist + viewing)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Tests are OPTIONAL - only add if adopting TDD or requested
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- MVP = US1 + US2 (core registration flow)
- Priority order: P1 (MVP) → P2 (Enhanced) → P3 (Future)
- Anti-spam protection (FR-029): Waitlist requires category membership
- Transaction-based auto-promotion pattern for consistency and performance

---

**Total Tasks**: 75 tasks across 9 phases
**MVP Tasks**: T001-T033 (33 tasks for User Stories 1 & 2)
**Enhanced Tasks**: T034-T067 (34 tasks for User Stories 3-6)
**Polish Tasks**: T068-T075 (8 tasks for cross-cutting concerns)
