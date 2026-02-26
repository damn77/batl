# Tasks: Knockout Tournament Bracket View

**Input**: Design documents from `/specs/011-knockout-bracket-view/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL per constitution - not explicitly requested in feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/` for all new files
- This feature is frontend-only with no backend changes required

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Configuration and shared utilities needed by all user stories

- [x] T001 [P] Create bracket color configuration in frontend/src/config/bracketColors.js
- [x] T002 [P] Add CSS custom properties to frontend/src/components/KnockoutBracket.css for theming
- [x] T003 [P] Create utility functions for match position calculation in frontend/src/utils/bracketUtils.js

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core component structure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Refactor existing KnockoutBracket.jsx to new architecture in frontend/src/components/KnockoutBracket.jsx
- [x] T005 Create BracketMatch component skeleton in frontend/src/components/BracketMatch.jsx
- [x] T006 Update KnockoutBracket.css with new CSS Grid layout structure in frontend/src/components/KnockoutBracket.css

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Tournament Bracket (Priority: P1) 🎯 MVP

**Goal**: Display tournament brackets in triangular layout with proper match positioning, player names, scores, and winner highlighting

**Independent Test**: Load any tournament with 8-16 players and verify bracket displays correctly with match info, player names, scores, and winner colors

### Implementation for User Story 1

- [x] T007 [P] [US1] Implement triangular CSS Grid layout in frontend/src/components/KnockoutBracket.css (FR-001)
- [x] T008 [P] [US1] Add match vertical positioning calculation using grid-row in frontend/src/utils/bracketUtils.js (FR-002)
- [x] T009 [US1] Implement BracketMatch component with player name display in frontend/src/components/BracketMatch.jsx (FR-003, FR-004)
- [x] T010 [US1] Add top/bottom player background colors using bracketColors config in frontend/src/components/BracketMatch.jsx (FR-005)
- [x] T011 [US1] Implement winner highlighting with green background in frontend/src/components/BracketMatch.jsx (FR-006)
- [x] T012 [US1] Add score display (completed, BYE, pending "-") in frontend/src/components/BracketMatch.jsx (FR-003)
- [x] T013 [US1] Add court number display in frontend/src/components/BracketMatch.jsx (FR-003)
- [x] T014 [US1] Implement doubles match display (4 player names) in frontend/src/components/BracketMatch.jsx (FR-004)
- [x] T015 [US1] Add error state (red background) for missing match data in frontend/src/components/BracketMatch.jsx (FR-014)
- [x] T016 [US1] Add connector lines between rounds using CSS pseudo-elements in frontend/src/components/KnockoutBracket.css
- [x] T017 [US1] Integrate BracketMatch into KnockoutBracket grid in frontend/src/components/KnockoutBracket.jsx
- [x] T018 [US1] Add BracketRound component for round headers in frontend/src/components/KnockoutBracket.jsx

**Checkpoint**: At this point, User Story 1 should be fully functional - brackets display with correct layout, player info, and colors

---

## Phase 4: User Story 2 - Navigate Large Brackets (Priority: P2)

**Goal**: Enable zoom/pan navigation for large brackets (32+ players) with Reset button

**Independent Test**: Load 64-player tournament, verify zoom in/out with scroll wheel, pan by dragging, and Reset button returns to default view

### Implementation for User Story 2

- [x] T019 [P] [US2] Create useBracketNavigation hook with viewport state in frontend/src/hooks/useBracketNavigation.js
- [x] T020 [P] [US2] Create BracketControls component skeleton in frontend/src/components/BracketControls.jsx
- [x] T021 [US2] Implement zoom state (scale: 0.25-4.0) in frontend/src/hooks/useBracketNavigation.js (FR-010)
- [x] T022 [US2] Implement pan state (translateX, translateY) in frontend/src/hooks/useBracketNavigation.js (FR-011)
- [x] T023 [US2] Add mouse wheel zoom handler in frontend/src/hooks/useBracketNavigation.js
- [x] T024 [US2] Add mouse drag pan handlers in frontend/src/hooks/useBracketNavigation.js
- [x] T025 [US2] Add touch pinch-to-zoom handler in frontend/src/hooks/useBracketNavigation.js
- [x] T026 [US2] Add touch drag pan handler in frontend/src/hooks/useBracketNavigation.js
- [x] T027 [US2] Implement Reset button in BracketControls in frontend/src/components/BracketControls.jsx (FR-012)
- [x] T028 [US2] Implement Zoom In/Out buttons in BracketControls in frontend/src/components/BracketControls.jsx (FR-010)
- [x] T029 [US2] Add CSS transform application with smooth transitions in frontend/src/components/KnockoutBracket.css
- [x] T030 [US2] Integrate useBracketNavigation hook into KnockoutBracket in frontend/src/components/KnockoutBracket.jsx
- [x] T031 [US2] Add touch-action: none CSS to prevent browser zoom conflicts in frontend/src/components/KnockoutBracket.css

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - large brackets are navigable with zoom/pan/reset

---

## Phase 5: User Story 3 - Toggle First Round BYE Visibility (Priority: P3)

**Goal**: Hide first-round BYE matches by default with toggle to show/hide them

**Independent Test**: Load 11-player tournament (5 BYEs), verify BYEs hidden by default, toggle shows/hides them, later-round BYEs always visible

### Implementation for User Story 3

- [x] T032 [P] [US3] Add isFirstRoundBye utility function in frontend/src/utils/bracketUtils.js
- [x] T033 [P] [US3] Add hasFirstRoundByes utility function in frontend/src/utils/bracketUtils.js
- [x] T034 [US3] Add showFirstRoundByes state to KnockoutBracket in frontend/src/components/KnockoutBracket.jsx (FR-007)
- [x] T035 [US3] Implement BYE match filtering logic (hide first-round only) in frontend/src/components/KnockoutBracket.jsx (FR-007, FR-009)
- [x] T036 [US3] Add Toggle BYE button to BracketControls in frontend/src/components/BracketControls.jsx (FR-008)
- [x] T037 [US3] Conditionally show toggle based on hasByes in frontend/src/components/BracketControls.jsx
- [x] T038 [US3] Add BYE match styling (yellow border, "BYE" text) in frontend/src/components/KnockoutBracket.css
- [x] T039 [US3] Wire toggle button to KnockoutBracket state in frontend/src/components/KnockoutBracket.jsx

**Checkpoint**: All user stories 1-3 should now be independently functional - BYE toggle works without breaking display or navigation

---

## Phase 6: User Story 4 - Find My Match (Priority: P4)

**Goal**: "My Match" button navigates logged-in participants to their relevant matches

**Independent Test**: Log in as tournament player, click "My Match", verify bracket navigates to show player's next/current match

### Implementation for User Story 4

- [x] T040 [P] [US4] Create BracketMyMatch component skeleton in frontend/src/components/BracketMyMatch.jsx
- [x] T041 [P] [US4] Add findMyMatch utility function in frontend/src/utils/bracketUtils.js
- [x] T042 [US4] Implement MyMatchContext calculation (current, previous, opponent matches) in frontend/src/utils/bracketUtils.js
- [x] T043 [US4] Add centerOnElement function to useBracketNavigation in frontend/src/hooks/useBracketNavigation.js
- [x] T044 [US4] Implement My Match button with visibility logic in frontend/src/components/BracketMyMatch.jsx (FR-013)
- [x] T045 [US4] Add match highlighting state to KnockoutBracket in frontend/src/components/KnockoutBracket.jsx
- [x] T046 [US4] Add highlight styling for "My Match" matches in frontend/src/components/KnockoutBracket.css
- [x] T047 [US4] Integrate BracketMyMatch into KnockoutBracket in frontend/src/components/KnockoutBracket.jsx
- [x] T048 [US4] Wire My Match navigation to centerOnElement in frontend/src/components/KnockoutBracket.jsx
- [x] T049 [US4] Add status text for eliminated/winner states in frontend/src/components/BracketMyMatch.jsx

**Checkpoint**: All user stories should now be independently functional - My Match navigation works for logged-in participants

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T050 [P] Update TournamentViewPage to use enhanced KnockoutBracket in frontend/src/pages/TournamentViewPage.jsx
- [x] T051 [P] Add responsive CSS for mobile devices in frontend/src/components/KnockoutBracket.css
- [x] T052 Add accessibility attributes (aria-labels) to bracket components in frontend/src/components/KnockoutBracket.jsx
- [x] T053 [P] Add loading and error states to KnockoutBracket in frontend/src/components/KnockoutBracket.jsx
- [ ] T054 Run quickstart.md validation scenarios
- [ ] T055 Performance testing with 128-player bracket (target: <3s render)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - No dependencies on US1
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Works with US2 controls but independently testable
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Uses US2 navigation but independently testable

### Within Each User Story

- Utility functions before components
- Component structure before behavior
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks (T001-T003) can run in parallel
- T019 and T020 (US2 hook and controls skeleton) can run in parallel
- T032 and T033 (US3 utility functions) can run in parallel
- T040 and T041 (US4 component and utility) can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch parallel CSS and utility tasks:
Task: T007 "Implement triangular CSS Grid layout"
Task: T008 "Add match vertical positioning calculation"

# After foundation: Launch all BracketMatch feature tasks in sequence
# (same component file, sequential work)
```

## Parallel Example: User Story 2

```bash
# Launch hook and controls skeleton in parallel:
Task: T019 "Create useBracketNavigation hook with viewport state"
Task: T020 "Create BracketControls component skeleton"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T006)
3. Complete Phase 3: User Story 1 (T007-T018)
4. **STOP and VALIDATE**: Test bracket display with 8-16 player tournaments
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (**MVP!**)
3. Add User Story 2 → Test with 64-player bracket → Deploy/Demo
4. Add User Story 3 → Test with 11-player bracket → Deploy/Demo
5. Add User Story 4 → Test as logged-in player → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (core display)
   - Developer B: User Story 2 (navigation)
3. After US1/US2 merge:
   - Developer A: User Story 3 (BYE toggle)
   - Developer B: User Story 4 (My Match)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- FR-XXX references map to spec.md functional requirements
- Colors are configurable via bracketColors.js (FR-015)
- Read-only display - no modification features (FR-017)