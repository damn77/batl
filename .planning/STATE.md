---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Manual Draw & QoL
status: planning
stopped_at: Completed 13-01-PLAN.md
last_updated: "2026-03-04T12:20:32.008Z"
last_activity: 2026-03-04 — v1.3 roadmap created, 5 phases defined (12–16), 22 requirements mapped
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 4
  completed_plans: 3
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-04)

**Core value:** A complete tournament runs from registration to final standings without the organizer touching a spreadsheet or a WhatsApp group
**Current focus:** Phase 12 — Manual Draw API

## Current Position

Phase: 12 of 16 (Manual Draw API)
Plan: — of — in current phase
Status: Ready to plan
Last activity: 2026-03-04 — v1.3 roadmap created, 5 phases defined (12–16), 22 requirements mapped

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
| Phase 12 P01 | 3m | 2 tasks | 7 files |
| Phase 12 P02 | 2m | 2 tasks | 5 files |
| Phase 13 P01 | 2m | 2 tasks | 3 files |

## Accumulated Context

### Decisions

All v1.2 decisions archived to PROJECT.md Key Decisions table.

Key architectural context for v1.3:
- Manual draw extends existing Bracket/Round/Match persistence from v1.0 Phase 01.1
- Ranking recalculation (used by DEL and REVERT) already exists from Feature 008
- Admin parity fix may touch CASL permission definitions
- [Phase 12]: drawMode stored as String in schema to avoid enum migration for two values
- [Phase 12]: Manual mode uses getBracketByPlayerCount for BYE structure, skips BYE Round 2 pre-population
- [Phase 12]: Bracket integrity check in startTournament covers both seeded and manual modes as safety net
- [Phase 12]: assignPosition uses inner async helper getByeAdjacentRound2Update() inside transaction closure for reuse across assign/clear/reassign steps
- [Phase 12]: assignPositionSchema uses default(null) for playerId/pairId instead of .oxor() — cleaner UX for null-to-clear pattern
- [Phase 13]: drawMode defaults to 'seeded' in UI state to preserve existing seeded workflow
- [Phase 13]: [Phase 13-01]: bracketDrawMode/isManualDraw derived from structure.brackets[0].drawMode for Plan 02 manual editor

### Pending Todos

None.

### Blockers/Concerns

None.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Allow backdated tournament start dates with past-date warning banner | 2026-03-04 | 93ad06d | [1-allow-backdated-tournament-start-dates-w](./quick/1-allow-backdated-tournament-start-dates-w/) |
| 2 | Fix FK constraint error on Match pair1Id for doubles draw generation | 2026-03-04 | dca5d38 | [2-fix-fk-constraint-error-on-match-pair1id](./quick/2-fix-fk-constraint-error-on-match-pair1id/) |

## Session Continuity

Last session: 2026-03-04T12:20:32.006Z
Stopped at: Completed 13-01-PLAN.md
Resume file: None
