---
gsd_state_version: 1.0
milestone: v1.4
milestone_name: UI Rework & Mobile Design
status: planning
stopped_at: Completed 23-01-PLAN.md
last_updated: "2026-03-07T09:39:42.471Z"
last_activity: 2026-03-06 — Roadmap created, 6 phases defined, 28/28 requirements mapped
progress:
  total_phases: 6
  completed_phases: 3
  total_plans: 6
  completed_plans: 5
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-06)

**Core value:** A complete tournament runs from registration to final standings without the organizer touching a spreadsheet or a WhatsApp group
**Current focus:** v1.4 UI Rework & Mobile Design — Phase 20 (Mobile Dev Tooling)

## Current Position

Phase: 20 of 25 (Mobile Dev Tooling)
Plan: — (not yet planned)
Status: Ready to plan
Last activity: 2026-03-06 — Roadmap created, 6 phases defined, 28/28 requirements mapped

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0 (this milestone)
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

*Updated after each plan completion*
| Phase 20-mobile-dev-tooling P01 | 30min | 3 tasks | 4 files |
| Phase 21-navigation-fix P01 | 2min | 1 tasks | 4 files |
| Phase 21-navigation-fix P01 | 45min | 2 tasks | 5 files |
| Phase 22-tournament-view-layout P01 | 3min | 2 tasks | 3 files |
| Phase 22-tournament-view-layout P02 | multi-session | 2 tasks | 1 files |
| Phase 23 P01 | 3min | 1 tasks | 1 files |

## Accumulated Context

### Decisions

All v1.3 decisions archived to PROJECT.md Key Decisions table.

Key architectural context for v1.4:
- Frontend-only milestone — no backend API changes, Express/Prisma untouched
- Primary stack additions: vite-plugin-qrcode (dev dep only), no production library changes in v1.4 core
- react-zoom-pan-pinch deferred to v1.4.x pending real-device validation of +/- button UX
- NavBar fix: replace data-bs-toggle plain nav with React Bootstrap Navbar.Offcanvas (collapseOnSelect)
- Tournament view restructure: buildSectionOrder(status, role) function, Accordion for collapsible secondary sections
- Bracket touch fix: imperative addEventListener({passive: false}) on DOM node — React registers touch as passive by default
- Score entry fix: type="text" inputMode="numeric" on score fields (type="number" shows decimal keypad on iOS)
- Phase ordering rationale: tooling → nav → layout → bracket/score → organizer → responsive sweep
- [Phase 20]: vite-plugin-qrcode added unconditionally to plugins; --host CLI flag drives QR activation, not server.host config
- [Phase 20-mobile-dev-tooling]: VITE_API_URL commented out in .env.development so Vite proxy handles /api requests from mobile devices — mobile cannot resolve localhost to dev machine
- [Phase 20-mobile-dev-tooling]: vite-plugin-qrcode added unconditionally; --host CLI flag in dev:mobile script activates network binding and QR output without affecting regular dev script
- [Phase 21-navigation-fix]: Accordion placed as sibling to Nav so Accordion.Header clicks don't trigger collapseOnSelect and close the drawer
- [Phase 21-navigation-fix]: Desktop ADMIN links rendered in a separate d-none d-lg-flex Nav; Accordion only shows on mobile (d-lg-none)
- [Phase 21-navigation-fix]: Desktop controls moved outside Navbar.Offcanvas into container-fluid d-none d-lg-flex to fix desktop layout regression
- [Phase 21-navigation-fix]: LanguageSwitcher: drop=down + position:absolute to prevent dropdown clipping inside Offcanvas overflow context
- [Phase 21-navigation-fix]: CORS whitelist extended with 192.168.x.x LAN IP pattern for mobile dev testing (development only)
- [Phase 22-01]: TournamentInfoPanel renders Accordion.Item children (not a full Accordion) — parent TournamentViewPage owns the Accordion wrapper
- [Phase 22-01]: COMPLETED status section order puts points/players first so rankings are prominent after tournament ends
- [Phase 22-01]: alwaysExpanded prop on FormatVisualization enables hero bracket rendering without toggle header or Collapse wrapper
- [Phase 22-02]: Organizer & Registration accordion collapsed by default for ALL statuses — avoids visual noise on first load, user-verified at checkpoint
- [Phase 22-02]: renderSection switch pattern maps string section keys to Accordion.Items; TournamentInfoPanel fragment renders both location-schedule and organizer-registration items, skip key deduplication via null return
- [Phase 23]: CSS-only 44px tap targets at 576px breakpoint; horizontal row layout for bracket controls on mobile

### Pending Todos

None.

### Blockers/Concerns

- [Phase 23]: Pinch-to-zoom decision gate — verify +/- button UX on real device before committing to react-zoom-pan-pinch
- [Phase 23]: BYE row vertical whitespace on mobile — visibility:hidden wastes space; display:none may break connector lines
- [Phase 24]: Manual draw mobile UX extent unknown — searchable select may suffice OR bottom-sheet picker needed (HIGH effort path)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 5 | Migrate all PrismaClient instances to shared singleton | 2026-03-07 | fb4b327 | [5-migrate-all-prismaclient-instances-to-sh](./quick/5-migrate-all-prismaclient-instances-to-sh/) |
| 6 | Fix mobile bracket touch drag with callback ref pattern | 2026-03-07 | 4b42a7e | [6-fix-mobile-bracket-drag-not-working-whil](./quick/6-fix-mobile-bracket-drag-not-working-whil/) |

## Session Continuity

Last session: 2026-03-07T09:39:42.469Z
Stopped at: Completed 23-01-PLAN.md
Resume file: None
