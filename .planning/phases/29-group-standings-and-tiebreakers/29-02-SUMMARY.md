---
phase: 29-group-standings-and-tiebreakers
plan: "02"
subsystem: backend-api
tags: [api, group-standings, tiebreakers, integration-tests, express]
dependency_graph:
  requires: ["29-01"]
  provides: ["GET /api/v1/tournaments/:id/groups/:groupId/standings", "POST standings/override", "DELETE standings/override"]
  affects: ["frontend-standings-display (Plan 03)"]
tech_stack:
  added: []
  patterns: ["jest.unstable_mockModule for ES module mocking", "isAuthenticated+authorize(CASL) auth pattern", "deleteMany for safe no-op deletes"]
key_files:
  created:
    - backend/src/api/validators/groupStandingsValidator.js
    - backend/src/api/groupStandingsController.js
    - backend/src/api/routes/groupStandingsRoutes.js
    - backend/__tests__/integration/groupStandingsRoutes.test.js
  modified:
    - backend/src/index.js
decisions:
  - "GET standings is public (no auth); POST/DELETE override require isAuthenticated + authorize('update', 'Tournament')"
  - "deleteMany used in deleteOverride to safely handle case where no override record exists (avoids P2025 error)"
  - "Integration tests mock groupStandingsService and prisma using jest.unstable_mockModule — consistent with groupDrawRoutes.test.js pattern"
  - "POST override validates entityId membership via GroupParticipant lookup before upsert"
metrics:
  duration: "3min"
  completed: "2026-03-17"
  tasks: 2
  files: 5
---

# Phase 29 Plan 02: Group Standings API Layer Summary

REST API for group standings with tiebreaker metadata — three Express endpoints exposing the Plan 01 service via HTTP.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create validator, controller, and routes for group standings API | 79a9121 | groupStandingsValidator.js, groupStandingsController.js, groupStandingsRoutes.js, index.js |
| 2 | Write integration tests for group standings API endpoints | 6b26fd9 | groupStandingsRoutes.test.js |

## What Was Built

Three REST endpoints registered at `/api/v1/tournaments`:

- **GET `/:tournamentId/groups/:groupId/standings`** — Public. Calls `getGroupStandings(groupId)` from Plan 01 service and returns full standings shape with tiebreaker metadata.
- **POST `/:tournamentId/groups/:groupId/standings/override`** — Protected (ORGANIZER/ADMIN). Validates positions, checks entityIds belong to group, upserts `GroupTieResolution`, returns updated standings.
- **DELETE `/:tournamentId/groups/:groupId/standings/override`** — Protected (ORGANIZER/ADMIN). Removes override via `deleteMany` (safe if none exists), returns recalculated standings.

**Validator:** `saveOverrideSchema` — Joi array of `{entityId: uuid, position: integer}` with min(2).

**24 integration tests** covering:
- GET shape validation (all required fields, zero-match groups, tied standings, unresolvedTies, hasManualOverride, overrideIsStale)
- POST auth guard, validation errors, INVALID_ENTITY code
- DELETE auth guard, deleteMany safety, recalculated response
- Response format compliance (BATL API pattern: `{success, data}`)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Files Exist
- `backend/src/api/validators/groupStandingsValidator.js` — FOUND
- `backend/src/api/groupStandingsController.js` — FOUND
- `backend/src/api/routes/groupStandingsRoutes.js` — FOUND
- `backend/__tests__/integration/groupStandingsRoutes.test.js` — FOUND

### Commits Exist
- `79a9121` feat(29-02): create group standings API layer — FOUND
- `6b26fd9` test(29-02): add integration tests for group standings API endpoints — FOUND

### Tests Pass
- Unit tests (Plan 01): 28/28 passing
- Integration tests (Plan 02): 24/24 passing
- Total: 52/52 passing

## Self-Check: PASSED
