# Roadmap: BATL — Amateur Tennis League Manager

## Milestones

- ✅ **v1.0 Tournament Core** — Phases 1, 01.1, 2, 3 (shipped 2026-02-28)
- ✅ **v1.1 Consolation Brackets** — Phases 4, 5, 5.1, 5.2, 6, 6.1, 7, 8 (shipped 2026-03-03)
- ✅ **v1.2 Data Seeding Update** — Phases 9, 10, 11 (shipped 2026-03-04)
- ✅ **v1.3 Manual Draw & QoL** — Phases 12, 13, 14, 15, 16, 17, 18 (shipped 2026-03-06)
- 🚧 **v1.4 UI Rework & Mobile Design** — Phases 20–25 (in progress)

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

### 🚧 v1.4 UI Rework & Mobile Design (In Progress)

**Milestone Goal:** Restructure the UI for mobile-first usage — bracket-centric tournament view, status-aware content visibility, app-wide responsive layout, full organizer mobile support, and light visual refresh.

- [x] **Phase 20: Mobile Dev Tooling** — QR code access and network-reachable Vite dev server for real-device testing (completed 2026-03-06)
- [x] **Phase 21: Navigation Fix** — Working mobile hamburger menu with Offcanvas drawer and auto-close on tap (completed 2026-03-06)
- [ ] **Phase 22: Tournament View Layout** — Status-aware section ordering with bracket as hero for IN_PROGRESS tournaments
- [ ] **Phase 23: Bracket and Score Entry Mobile UX** — Touch-safe bracket navigation and fullscreen mobile score entry modal
- [ ] **Phase 24: Organizer Mobile Support** — Result submission and correction fully usable on touch devices
- [ ] **Phase 25: App-Wide Responsive Pass** — All key pages pass 375px viewport with column hiding, tap targets, and visual refresh

## Phase Details

### Phase 20: Mobile Dev Tooling
**Goal**: Developer can test the app on a real mobile device without typing IP addresses
**Depends on**: Nothing (first v1.4 phase)
**Requirements**: TOOL-01, TOOL-02
**Success Criteria** (what must be TRUE):
  1. Developer scans a QR code printed in the terminal and the app opens on their phone within 30 seconds
  2. The Vite dev server is reachable from other devices on the local network (server.host: true)
  3. The viewport meta tag includes viewport-fit=cover so content respects device notch/home indicator
**Plans**: 1 plan
Plans:
- [x] 20-01-PLAN.md — Install QR code plugin, add dev:mobile script, update viewport meta tag

### Phase 21: Navigation Fix
**Goal**: Users can open, navigate, and close the mobile menu on any mobile browser
**Depends on**: Phase 20
**Requirements**: NAV-01, NAV-02, NAV-03
**Success Criteria** (what must be TRUE):
  1. User taps the hamburger icon on mobile and a slide-in Offcanvas drawer opens (no Bootstrap JS required)
  2. User taps a menu item and the drawer closes automatically, landing on the target page
  3. Admin, organizer, and player role-gated links appear correctly in the mobile drawer based on logged-in role
  4. Desktop navigation bar is unchanged at lg+ breakpoint
**Plans**: 1 plan
Plans:
- [x] 21-01-PLAN.md — Refactor NavBar to React Bootstrap Offcanvas, fix LanguageSwitcher, add 150ms animation

### Phase 22: Tournament View Layout
**Goal**: Tournament page content surfaces in the right order based on tournament status, bracket-first for live tournaments
**Depends on**: Phase 21
**Requirements**: LAYOUT-01, LAYOUT-02, LAYOUT-03, LAYOUT-04, LAYOUT-05
**Success Criteria** (what must be TRUE):
  1. Player opens an IN_PROGRESS tournament on mobile and sees the bracket immediately without scrolling
  2. Secondary sections (registration info, format/rules, point tables, player list) are collapsed by default on mobile for IN_PROGRESS tournaments
  3. User taps any secondary section header and it expands; taps again and it collapses
  4. A SCHEDULED tournament shows registration information first; a COMPLETED tournament shows the champion banner first
  5. The champion banner is prominently displayed at the top for COMPLETED tournaments
**Plans**: 2 plans
Plans:
- [ ] 22-01-PLAN.md — Create section ordering utility, refactor TournamentInfoPanel to accordion items, add alwaysExpanded to FormatVisualization
- [ ] 22-02-PLAN.md — Wire hero zone + accordion layout into TournamentViewPage

### Phase 23: Bracket and Score Entry Mobile UX
**Goal**: Players can navigate the bracket and submit match scores on a real mobile device without workarounds
**Depends on**: Phase 22
**Requirements**: BRKT-01, BRKT-02, BRKT-03, BRKT-04, SCORE-01, SCORE-02, SCORE-03, SCORE-04
**Success Criteria** (what must be TRUE):
  1. Bracket fits the phone viewport width on first load without the user needing to zoom out manually
  2. User drags a finger across the bracket on a real iOS or Android device and the bracket pans (not the page)
  3. Zoom in and out buttons are large enough to tap accurately without zooming the wrong control
  4. User taps "Enter Score" and the score entry modal opens fullscreen on mobile (sm-down)
  5. Score input fields show an integer numeric keypad on iOS Safari (no decimal key)
  6. The modal submit button remains visible and tappable when the iOS keyboard is open
**Plans**: TBD

### Phase 24: Organizer Mobile Support
**Goal**: Organizer can manage match results and corrections from a phone at courtside
**Depends on**: Phase 23
**Requirements**: ORG-01, ORG-02
**Success Criteria** (what must be TRUE):
  1. Organizer opens a match on mobile, submits a result, and the result is saved without layout issues
  2. Organizer opens the result correction modal on mobile and it displays fullscreen with all controls reachable
**Plans**: TBD

### Phase 25: App-Wide Responsive Pass
**Goal**: Every key page in the app is usable at 375px viewport width with no horizontal overflow
**Depends on**: Phase 24
**Requirements**: RESP-01, RESP-02, RESP-03, RESP-04, RESP-05, RESP-06, RESP-07, RESP-08
**Success Criteria** (what must be TRUE):
  1. No page causes horizontal scrolling at 375px viewport width
  2. Rankings, player list, and tournament list tables hide non-essential columns on mobile rather than overflowing
  3. All buttons, links, and form controls across the app meet 44px minimum tap target height
  4. Tournament list, category rankings, and player profile pages are each fully usable on a 375px screen
  5. Organizer dashboard, players page, and tournament setup pages are usable on mobile
  6. Spacing, typography, and color are consistent and improved across the app (light visual refresh)
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
| 22. Tournament View Layout | 1/2 | In Progress|  | - |
| 23. Bracket and Score Entry Mobile UX | v1.4 | 0/TBD | Not started | - |
| 24. Organizer Mobile Support | v1.4 | 0/TBD | Not started | - |
| 25. App-Wide Responsive Pass | v1.4 | 0/TBD | Not started | - |
