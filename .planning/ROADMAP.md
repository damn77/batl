# Roadmap: BATL — Amateur Tennis League Manager

## Milestones

- ✅ **v1.0 Tournament Core** — Phases 1, 01.1, 2, 3 (shipped 2026-02-28)
- ✅ **v1.1 Consolation Brackets** — Phases 4, 5, 5.1, 5.2, 6, 6.1, 7, 8 (shipped 2026-03-03)
- ✅ **v1.2 Data Seeding Update** — Phases 9, 10, 11 (shipped 2026-03-04)
- ✅ **v1.3 Manual Draw & QoL** — Phases 12, 13, 14, 15, 16, 17, 18 (shipped 2026-03-06)
- ✅ **v1.4 UI Rework & Mobile Design** — Phases 20–26 (shipped 2026-03-15)
- 🚧 **v1.5 Group & Combined Tournaments** — Phases 27–31 (planning)

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

<details>
<summary>✅ v1.3 Manual Draw & QoL (Phases 12–18) — SHIPPED 2026-03-06</summary>

- [x] Phase 12: Manual Draw API (2/2 plans) — completed 2026-03-04
- [x] Phase 13: Manual Draw UI (2/2 plans) — completed 2026-03-04
- [x] Phase 14: Tournament Copy (2/2 plans) — completed 2026-03-04
- [x] Phase 15: Tournament Deletion and Revert (2/2 plans) — completed 2026-03-04
- [x] Phase 16: Admin Access Parity (2/2 plans) — completed 2026-03-04
- [x] Phase 17: Phase 13 Verification & DRAW-05 Gap Closure (1/1 plan) — completed 2026-03-05
- [x] Phase 18: Integration Bug Fixes (1/1 plan) — completed 2026-03-06

See `.planning/milestones/v1.3-ROADMAP.md` for full phase details.

</details>

<details>
<summary>✅ v1.4 UI Rework & Mobile Design (Phases 20–26) — SHIPPED 2026-03-15</summary>

- [x] Phase 20: Mobile Dev Tooling (1/1 plan) — completed 2026-03-06
- [x] Phase 21: Navigation Fix (1/1 plan) — completed 2026-03-06
- [x] Phase 22: Tournament View Layout (2/2 plans) — completed 2026-03-07
- [x] Phase 23: Bracket and Score Entry Mobile UX (2/2 plans) — completed 2026-03-07
- [x] Phase 24: Organizer Mobile Support (1/1 plan) — completed 2026-03-07
- [x] Phase 25: App-Wide Responsive Pass (3/3 plans) — completed 2026-03-15
- [x] Phase 26: Player Profile Mobile Fix (1/1 plan) — completed 2026-03-15

See `.planning/milestones/v1.4-ROADMAP.md` for full phase details.

</details>

### v1.5 Group & Combined Tournaments

**Milestone Goal:** Implement group stage tournaments (round-robin) and combined format (groups → knockout brackets) with configurable advancement rules, group formation via seeded snake draft, standings with multi-level tiebreakers, and full singles/doubles support.

- [ ] **Phase 27: Group Formation** — Schema migration, snake draft seeding, round-robin schedule generation, group draw UI
- [ ] **Phase 28: Group Match Play and Visualization** — Group result entry, lifecycle guards, group standings display on tournament page
- [ ] **Phase 29: Group Standings and Tiebreakers** — 6-level tiebreaker chain, cyclic lock detection, manual resolution, head-to-head display
- [ ] **Phase 30: Combined Format Advancement** — Group-to-knockout advancement, spillover selection, advancement config UI, bracket generation from groups
- [ ] **Phase 31: Points Integration and Group-Only Format** — Group placement points, knockout point supersede, GROUP-only tournament end-to-end

## Phase Details (v1.5)

### Phase 27: Group Formation
**Goal**: Organizer generates a seeded group draw with round-robin schedule for GROUP or COMBINED tournaments
**Depends on**: Nothing (first v1.5 phase)
**Requirements**: GFORM-01, GFORM-02, GFORM-03, GFORM-04, GFORM-05, GFORM-06, GFORM-07
**Success Criteria** (what must be TRUE):
  1. Organizer sees "Generate Group Draw" section and can configure group count and seeded rounds before generating
  2. System validates balanced group sizes (no group more than 1 player smaller than the largest)
  3. After generating, each group has correct snake-draft player distribution and complete round-robin fixture list
  4. Doubles tournament generates group assignments using pairs with no FK errors
  5. Organizer can manually override player-to-group assignments and regenerate the draw
**Plans**: 3 plans
Plans:
- [ ] 27-01-PLAN.md — Schema migration + groupPersistenceService (snake draft, circle method, atomic generation)
- [ ] 27-02-PLAN.md — API layer (controller, routes, validators) + integration tests + swap endpoint
- [ ] 27-03-PLAN.md — Frontend GroupDrawGenerationSection + FormatVisualization wiring

### Phase 28: Group Match Play and Visualization
**Goal**: Players enter group match results and the tournament page shows groups with fixtures and standings
**Depends on**: Phase 27
**Requirements**: GPLAY-01, GPLAY-02, GPLAY-03, GPLAY-04, GPLAY-05, GVIEW-01, GVIEW-02, GVIEW-03, GVIEW-04
**Success Criteria** (what must be TRUE):
  1. Player taps a group match row, enters score, and result is saved without bracket cascade logic firing
  2. Organizer can submit and correct group stage match results
  3. Group stage matches follow tournament format rules (sets, tiebreaks, advantage settings)
  4. Tournament page shows all groups with fixture list, standings table, and completion progress per group
  5. COMBINED tournament with all group matches complete stays IN_PROGRESS (not auto-COMPLETED)
  6. Group visualization is responsive at 375px viewport
**Plans**: TBD

### Phase 29: Group Standings and Tiebreakers
**Goal**: Authoritative 6-level tiebreaker chain with cyclic lock detection and manual organizer resolution
**Depends on**: Phase 28
**Requirements**: GSTAND-01, GSTAND-02, GSTAND-03, GSTAND-04, GSTAND-05, GSTAND-06
**Success Criteria** (what must be TRUE):
  1. Match results update standings in real time with correct rank, W/L, set diff, game diff
  2. Tiebreaker chain applies correctly: set/point diff → fewer games/points → head-to-head
  3. Circular 3-way lock (A>B, B>C, C>A) is detected and falls through without non-deterministic ordering
  4. Organizer can manually resolve a 3-way deadlock via a UI prompt
  5. Tiebreaker criterion label appears in standings when points alone don't separate players
  6. Doubles pairs display correctly as "Player A / Player B" in standings
**Plans**: TBD

### Phase 30: Combined Format Advancement
**Goal**: Group-to-knockout advancement with seeded bracket generation and spillover selection for odd groups
**Depends on**: Phase 29
**Requirements**: COMB-01, COMB-02, COMB-03, COMB-04, COMB-05, COMB-06, COMB-07, COMB-08, COMB-09, ADV-01, ADV-02, ADV-03, ADV-04
**Success Criteria** (what must be TRUE):
  1. Organizer configures advancement rules via dedicated UI (which positions → which knockout brackets)
  2. Advancement UI validates total count against valid bracket sizes (4-128)
  3. "Advance to Knockout" button disabled until all group matches have results
  4. Spillover slots filled by best remaining players across groups using cross-group ranking
  5. Generated knockout bracket(s) use existing bracket generation and seeding infrastructure
  6. Post-advancement: group results locked, knockout bracket active, combined tournament completes only when all brackets finish
**Plans**: TBD

### Phase 31: Points Integration and Group-Only Format
**Goal**: Group placement points for non-advancing players, knockout supersede for advancing, GROUP-only tournament end-to-end
**Depends on**: Phase 30
**Requirements**: PTS-01, PTS-02, PTS-03, PTS-04, GVIEW-05
**Success Criteria** (what must be TRUE):
  1. Non-advancing COMBINED player receives group placement points after tournament completion
  2. Advancing COMBINED player receives knockout points only (superseding group placement)
  3. GROUP-only tournament awards group placement points to all participants on completion
  4. GROUP-only tournament page shows group section only (no bracket section)
  5. Advancement status is visible on group standings (which players have advanced)
**Plans**: TBD

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
| 13. Manual Draw UI | v1.3 | 2/2 | Complete | 2026-03-04 |
| 14. Tournament Copy | v1.3 | 2/2 | Complete | 2026-03-04 |
| 15. Tournament Deletion and Revert | v1.3 | 2/2 | Complete | 2026-03-04 |
| 16. Admin Access Parity | v1.3 | 2/2 | Complete | 2026-03-04 |
| 17. Phase 13 Verification & DRAW-05 Gap Closure | v1.3 | 1/1 | Complete | 2026-03-05 |
| 18. Integration Bug Fixes | v1.3 | 1/1 | Complete | 2026-03-06 |
| 20. Mobile Dev Tooling | v1.4 | 1/1 | Complete | 2026-03-06 |
| 21. Navigation Fix | v1.4 | 1/1 | Complete | 2026-03-06 |
| 22. Tournament View Layout | v1.4 | 2/2 | Complete | 2026-03-07 |
| 23. Bracket and Score Entry Mobile UX | v1.4 | 2/2 | Complete | 2026-03-07 |
| 24. Organizer Mobile Support | v1.4 | 1/1 | Complete | 2026-03-07 |
| 25. App-Wide Responsive Pass | v1.4 | 3/3 | Complete | 2026-03-15 |
| 26. Player Profile Mobile Fix | v1.4 | 1/1 | Complete | 2026-03-15 |
| 27. Group Formation | 1/3 | In Progress|  | - |
| 28. Group Match Play and Visualization | v1.5 | 0/TBD | Not started | - |
| 29. Group Standings and Tiebreakers | v1.5 | 0/TBD | Not started | - |
| 30. Combined Format Advancement | v1.5 | 0/TBD | Not started | - |
| 31. Points Integration and Group-Only Format | v1.5 | 0/TBD | Not started | - |
