---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Group & Combined Tournaments
status: executing
stopped_at: Phase 29 context gathered
last_updated: "2026-03-17T16:42:46.433Z"
last_activity: 2026-03-17 — Phase 28 Plan 03 complete (Accordion layout, CombinedFormatDisplay rewrite, dry-run skip)
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 6
  completed_plans: 6
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-15)

**Core value:** A complete tournament runs from registration to final standings without the organizer touching a spreadsheet or a WhatsApp group
**Current focus:** v1.5 Group & Combined Tournaments — Phase 27 (Group Formation)

## Current Position

Phase: 28 of 31 (Group Match Play and Visualization)
Plan: 03 complete
Status: In progress
Last activity: 2026-03-17 — Phase 28 Plan 03 complete (Accordion layout, CombinedFormatDisplay rewrite, dry-run skip)

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
| Phase 27 P01 | 6m | 2 tasks | 4 files |
| Phase 27 P02 | 4m | 2 tasks | 6 files |
| Phase 27 P03 | 3m | 3 tasks | 3 files |
| Phase 28 P01 | 3m | 2 tasks | 4 files |
| Phase 28-group-match-play-and-visualization P02 | 2min | 1 tasks | 1 files |
| Phase 28-group-match-play-and-visualization P03 | 3min | 3 tasks | 3 files |

## Accumulated Context

### Decisions

All v1.4 decisions archived to PROJECT.md Key Decisions table.
- [Phase 27]: Used prisma db push + migrate resolve instead of migrate dev due to migration history drift in dev environment
- [Phase 27]: Round records created per group independently (bracketId null) — group rounds are not shared across groups
- [Phase 27]: Used isAuthenticated+authorize(CASL) pattern for auth middleware — not requireAuth+requireRole (these don't exist in codebase)
- [Phase 27]: swapGroupParticipants deletes all bracketId=null rounds for tournament before regenerating (safe: group rounds are isolated)
- [Phase 27]: State C organizer swap: Player B dropdown filters out Player A's group to enforce cross-group swap client-side
- [Phase 27]: COMBINED format organizer routing: no-groups shows GroupDrawGenerationSection only; with groups shows both stacked
- [Phase 28]: Match rows always fetched (shouldFetch=true); visibility controlled by showMatches state initialized from tournamentStatus prop
- [Phase 28]: Entity abstraction (entities array) in GroupStandingsTable unifies singles/doubles standings calculation
- [Phase 28 P01]: COMBINED guard queries tournament.findUnique inside incompleteCount===0 block — no extra query cost on partial completions
- [Phase 28 P01]: bracket.findFirst (not findMany) used in COMBINED guard — only need existence check
- [Phase 28 P01]: getFormatStructure GROUP/COMBINED emit both players[] and pairs[] — empty arrays for inapplicable type, no nullable undefined
- [Phase 28 P03]: ExpandableSection replaced with Accordion in GROUP/COMBINED format sections — React Bootstrap Accordion provides better UX
- [Phase 28 P03]: allMatches passed as prop to CombinedFormatDisplay from FormatVisualization to avoid re-fetch
- [Phase 28 P03]: Generate Knockout Bracket button is a no-op (window.scrollTo) with TODO for Phase 30 wiring
- [Phase 28 P03]: MatchResultModal groupId guard skips dry-run for group matches (no bracket cascade exists)

### Pending Todos

None.

### Blockers/Concerns

None.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 5 | Migrate all PrismaClient instances to shared singleton | 2026-03-07 | fb4b327 | [5-migrate-all-prismaclient-instances-to-sh](./quick/5-migrate-all-prismaclient-instances-to-sh/) |
| 6 | Fix mobile bracket touch drag with callback ref pattern | 2026-03-07 | 4b42a7e | [6-fix-mobile-bracket-drag-not-working-whil](./quick/6-fix-mobile-bracket-drag-not-working-whil/) |
| 7 | Fix tournament page organizer registration panel (filter dropdown + soft-reload) | 2026-03-15 | 3c70bee | [7-fix-tournament-page-organizer-registrati](./quick/7-fix-tournament-page-organizer-registrati/) |
| 8 | Fix Draw Generation player count not updating on registration changes | 2026-03-15 | abc4b6e | [8-fix-draw-generation-player-count-not-upd](./quick/8-fix-draw-generation-player-count-not-upd/) |
| 9 | Fix login always failing on first attempt after server start | 2026-03-15 | 665c2d0 | [9-fix-login-always-failing-on-first-attemp](./quick/9-fix-login-always-failing-on-first-attemp/) |

## Session Continuity

Last session: 2026-03-17T16:42:46.430Z
Stopped at: Phase 29 context gathered
Resume file: .planning/phases/29-group-standings-and-tiebreakers/29-CONTEXT.md
