# Roadmap: BATL — Amateur Tennis League Manager

## Milestones

- ✅ **v1.0 Tournament Core** — Phases 1, 01.1, 2, 3 (shipped 2026-02-28)
- ✅ **v1.1 Consolation Brackets** — Phases 4, 5, 5.1, 5.2, 6, 6.1, 7, 8 (shipped 2026-03-03)
- ✅ **v1.2 Data Seeding Update** — Phases 9, 10, 11 (shipped 2026-03-04)
- 🚧 **v1.3 Manual Draw & QoL** — Phases 12, 13, 14, 15, 16, 17 (in progress)

## Phases

<details>
<summary>✅ v1.0 Tournament Core (Phases 1, 01.1, 2, 3) — SHIPPED 2026-02-28</summary>

- [x] Phase 1: Match Result Submission (3/3 plans) — completed 2026-02-27
- [x] Phase 01.1: Bracket Generation and Seeding Persistence (5/5 plans) — completed 2026-02-28 (INSERTED)
- [x] Phase 2: Tournament Lifecycle and Bracket Progression (2/2 plans) — completed 2026-02-28
- [x] Phase 3: Player Statistics (3/3 plans) — completed 2026-02-28

See `.planning/milestones/v1.0-ROADMAP.md` for full phase details.

</details>

<details>
<summary>✅ v1.1 Consolation Brackets (Phases 4–8) — SHIPPED 2026-03-03</summary>

- [x] Phase 4: Configuration and Consolation Draw (2/2 plans) — completed 2026-03-01
- [x] Phase 5: Loser Routing and Consolation Progression (6/6 plans) — completed 2026-03-01
- [x] Phase 5.1: Consolation Gap Closure (1/1 plan) — completed 2026-03-01
- [x] Phase 5.2: Doubles Backend Fixes (1/1 plan) — completed 2026-03-01
- [x] Phase 6: Visualization and Result Entry (1/1 plan) — completed 2026-03-03
- [x] Phase 6.1: Match Result Resubmission and Bracket Recalculation (2/2 plans) — completed 2026-03-03
- [x] Phase 7: Consolation Points (1/1 plan) — completed 2026-03-03
- [x] Phase 8: Consolation Bug Fixes (1/1 plan) — completed 2026-03-03

See `.planning/milestones/v1.1-ROADMAP.md` for full phase details.

</details>

<details>
<summary>✅ v1.2 Data Seeding Update (Phases 9–11) — SHIPPED 2026-03-04</summary>

- [x] Phase 9: Real Player and League Data (2/2 plans) — completed 2026-03-03
- [x] Phase 10: Data Quality and Script Cleanup (2/2 plans) — completed 2026-03-03
- [x] Phase 11: Seed Script Cleanup (1/1 plan) — completed 2026-03-03

See `.planning/milestones/v1.2-ROADMAP.md` for full phase details.

</details>

### 🚧 v1.3 Manual Draw & QoL (In Progress)

**Milestone Goal:** Organizers can manually control bracket draw positions, copy existing tournament configurations, delete or revert tournaments, admin users have full parity with organizer capabilities, and bracket view UX issues are resolved.

- [x] **Phase 12: Manual Draw API** — Backend endpoints for manual bracket draw: empty-position generation, player assignment, position clearing, and start-gate validation (completed 2026-03-04)
- [x] **Phase 13: Manual Draw UI** — Organizer-facing bracket draw interface with position assignment dropdowns, clear controls, and placement progress display (completed 2026-03-04)
- [x] **Phase 14: Tournament Copy** — Duplicate a tournament's configuration (category, rules, format, location, capacity) into a new SCHEDULED tournament (completed 2026-03-04)
- [ ] **Phase 15: Tournament Deletion and Revert** — Cascading tournament deletion with confirmation dialog and revert-to-scheduled with draw erasure and registration unlock; both trigger ranking recalculation when applicable
- [ ] **Phase 16: Admin Access Parity** — Verify and fix all gaps where admin users cannot access organizer functionality; validate mixed-role users see combined capabilities

## Phase Details

### Phase 12: Manual Draw API
**Goal**: Organizers can generate an empty bracket and assign/clear player positions via API
**Depends on**: Existing draw infrastructure (v1.0 Phase 01.1)
**Requirements**: DRAW-01, DRAW-02, DRAW-06
**Success Criteria** (what must be TRUE):
  1. Calling the draw endpoint with "manual" mode creates a bracket with all positions empty (no players auto-placed)
  2. An API endpoint accepts a player/pair assignment to a specific bracket position and persists it
  3. The tournament start endpoint rejects start attempts when any registered player/pair is not yet placed in the bracket
**Plans**: 2 plans
Plans:
- [ ] 12-01-PLAN.md — Manual draw mode in bracket generation + start-gate validation
- [ ] 12-02-PLAN.md — Position assignment API endpoint with BYE auto-advance logic

### Phase 13: Manual Draw UI
**Goal**: Organizers can interactively assign players to bracket positions and correct mistakes through the tournament draw page
**Depends on**: Phase 12
**Requirements**: DRAW-03, DRAW-04, DRAW-05
**Success Criteria** (what must be TRUE):
  1. Organizer sees a dropdown on each empty bracket position showing only unplaced players/pairs
  2. Selecting a player from the dropdown assigns them to that position immediately
  3. Organizer can click a clear button on any filled position to return it to empty, making that player available again in other dropdowns
  4. A placement progress indicator shows how many positions are filled vs. total required before start is enabled
**Plans**: 2 plans
Plans:
- [ ] 13-01-PLAN.md — Expose drawMode in API, add assignPosition service, draw mode radios
- [ ] 13-02-PLAN.md — ManualDrawEditor component, BracketGenerationSection wiring, Start button integration

### Phase 14: Tournament Copy
**Goal**: Organizers can create a new SCHEDULED tournament pre-populated with an existing tournament's configuration
**Depends on**: Phases 12–13 (no hard dependency, can run in parallel)
**Requirements**: COPY-01, COPY-02, COPY-03, COPY-04, COPY-05
**Success Criteria** (what must be TRUE):
  1. A "Copy tournament" action on the tournament page creates a new tournament in SCHEDULED status
  2. The new tournament carries over category, rules, format, location, and capacity from the source tournament
  3. The new tournament has no name, no dates, no registrations, and no draw (organizer must fill these in)
  4. Organizer can edit every field of the copied tournament after creation, including all settings copied from the source
**Plans**: 2 plans
Plans:
- [ ] 14-01-PLAN.md — Copy tournament backend API endpoint with validation, service logic, and integration tests
- [ ] 14-02-PLAN.md — Action dropdown on tournament list with Copy flow pre-filling creation form

### Phase 15: Tournament Deletion and Revert
**Goal**: Organizers can fully delete a tournament or revert it to SCHEDULED, with appropriate data cleanup and ranking correction
**Depends on**: Phases 12–14 (no hard dependency)
**Requirements**: DEL-01, DEL-02, DEL-03, DEL-04, DEL-05, REVERT-01, REVERT-02, REVERT-03, REVERT-04
**Success Criteria** (what must be TRUE):
  1. Clicking delete on a tournament shows a confirmation dialog displaying tournament name and key details
  2. Confirmation dialog shows an additional highlighted warning when the tournament is IN_PROGRESS or COMPLETED
  3. Confirming deletion removes the tournament and all associated registrations, draw data, and match results
  4. Deleting a completed tournament triggers ranking recalculation for affected categories and removes those tournament results from rankings
  5. Organizer can revert an IN_PROGRESS or COMPLETED tournament to SCHEDULED, which deletes the draw, unlocks player registration, and triggers ranking recalculation if the tournament was completed
**Plans**: 2 plans
Plans:
- [ ] 15-01-PLAN.md — Expand delete endpoint for all statuses with cascade + ranking recalc, add revert endpoint
- [ ] 15-02-PLAN.md — Delete/revert confirmation modals in tournament list dropdown + revert button on detail page

### Phase 16: Admin Access Parity
**Goal**: Admin users have full access to all organizer functionality and mixed-role users see combined capabilities
**Depends on**: Phases 12–15 (validates across all new features too)
**Requirements**: ADMIN-01, ADMIN-02
**Success Criteria** (what must be TRUE):
  1. Admin user can perform every organizer action (tournament CRUD, draw generation and management, result entry, registration management) without receiving permission errors
  2. A user with both Player and Organizer roles can access both player-facing and organizer-facing pages and actions
  3. A user with Player, Organizer, and Admin roles can access all functionality across all three roles simultaneously
**Plans**: TBD

### Phase 17: Bracket View UX Fixes
**Goal**: Fix bracket view scroll behavior and pair name display in match submission modal
**Depends on**: None (independent bug fixes)
**Requirements**: UX-01, UX-02
**Success Criteria** (what must be TRUE):
  1. Middle mouse wheel on bracket view scrolls the bracket up/down instead of changing zoom level
  2. Submit match modal for doubles/pairs displays both pair names at the top of the modal
**Plans**: 1 plan
Plans:
- [ ] 17-01-PLAN.md — Remove wheel-zoom, update nav hint, fix pair name display in modal

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Match Result Submission | v1.0 | 3/3 | Complete | 2026-02-27 |
| 01.1. Bracket Generation and Seeding Persistence | v1.0 | 5/5 | Complete | 2026-02-28 |
| 2. Tournament Lifecycle and Bracket Progression | v1.0 | 2/2 | Complete | 2026-02-28 |
| 3. Player Statistics | v1.0 | 3/3 | Complete | 2026-02-28 |
| 4. Configuration and Consolation Draw | v1.1 | 2/2 | Complete | 2026-03-01 |
| 5. Loser Routing and Consolation Progression | v1.1 | 6/6 | Complete | 2026-03-01 |
| 5.1. Consolation Gap Closure | v1.1 | 1/1 | Complete | 2026-03-01 |
| 5.2. Doubles Backend Fixes | v1.1 | 1/1 | Complete | 2026-03-01 |
| 6. Visualization and Result Entry | v1.1 | 1/1 | Complete | 2026-03-03 |
| 6.1. Match Result Resubmission and Bracket Recalculation | v1.1 | 2/2 | Complete | 2026-03-03 |
| 7. Consolation Points | v1.1 | 1/1 | Complete | 2026-03-03 |
| 8. Consolation Bug Fixes | v1.1 | 1/1 | Complete | 2026-03-03 |
| 9. Real Player and League Data | v1.2 | 2/2 | Complete | 2026-03-03 |
| 10. Data Quality and Script Cleanup | v1.2 | 2/2 | Complete | 2026-03-03 |
| 11. Seed Script Cleanup | v1.2 | 1/1 | Complete | 2026-03-03 |
| 12. Manual Draw API | v1.3 | 2/2 | Complete | 2026-03-04 |
| 13. Manual Draw UI | 2/2 | Complete   | 2026-03-04 | - |
| 14. Tournament Copy | 2/2 | Complete    | 2026-03-04 | - |
| 15. Tournament Deletion and Revert | 1/2 | In Progress|  | - |
| 16. Admin Access Parity | v1.3 | 0/? | Not started | - |
| 17. Bracket View UX Fixes | 1/1 | Complete    | 2026-03-04 | - |
