---
phase: 30-combined-format-advancement
plan: "02"
subsystem: backend-api
tags: [advancement, api, controller, routes, validation, integration-tests, combined-format]
dependency_graph:
  requires: []
  provides: [advancement-api-endpoints, advancement-controller, advancement-routes, advancement-validator]
  affects: [backend/src/index.js]
tech_stack:
  added: []
  patterns: [controller-error-mapping, jest-unstable-mockModule, route-auth-middleware]
key_files:
  created:
    - backend/src/api/validators/advancementValidator.js
    - backend/src/api/advancementController.js
    - backend/src/api/routes/advancementRoutes.js
    - backend/src/services/advancementService.js
    - backend/__tests__/integration/advancementRoutes.test.js
  modified:
    - backend/src/index.js
decisions:
  - "ADV-04: FORMAT_CHANGE_NOT_ALLOWED guard in tournamentRulesService.setTournamentFormat() already prevents mainBracketSize/secondaryBracketSize changes once tournament has IN_PROGRESS/COMPLETED matches — no additional guard needed in advancement controller"
  - "advancementService.js stub created as placeholder — Plan 01 implements full business logic; stub throws NOT_IMPLEMENTED for all methods"
  - "POST /advancement returns 201 (not 200) on success, consistent with group draw generation pattern"
  - "Controller uses mapErrorToStatus() helper for clean error code → HTTP status mapping, same pattern as groupDrawController.js"
metrics:
  duration: "8min"
  completed: "2026-03-18"
  tasks: 2
  files: 6
---

# Phase 30 Plan 02: Advancement API Layer Summary

Advancement REST endpoints for COMBINED format tournaments: validator, controller, routes, route registration in Express app, and 21 integration test stubs.

## What Was Built

Three REST endpoints under `/api/v1/tournaments/:id/advancement`:

| Method | Path | Handler | Status |
|--------|------|---------|--------|
| GET | `/:id/advancement/preview` | `previewAdvancement` | 200 on success |
| POST | `/:id/advancement` | `handleConfirmAdvancement` | 201 on success |
| DELETE | `/:id/advancement` | `handleRevertAdvancement` | 200 on success |

All three endpoints require `isAuthenticated + authorize('update', 'Tournament')` — same pattern as `groupDrawRoutes.js`.

## Error Code Mapping

| Service Error Code | HTTP Status |
|-------------------|-------------|
| `TOURNAMENT_NOT_FOUND` | 404 |
| `NO_BRACKETS` | 404 |
| `INVALID_FORMAT` | 400 |
| `INVALID_STATUS` | 400 |
| `INVALID_BRACKET_SIZE` | 400 |
| `NO_ADVANCEMENT_CONFIG` | 400 |
| `UNRESOLVED_TIES` | 409 |
| `ALREADY_ADVANCED` | 409 |
| `MATCHES_HAVE_RESULTS` | 409 |

## ADV-04 Verification

**Finding:** `tournamentRulesService.setTournamentFormat()` throws `FORMAT_CHANGE_NOT_ALLOWED` (line 39) when `tournament.matches.length > 0`. Since `formatConfig` includes `mainBracketSize` and `secondaryBracketSize`, these fields are already locked once the tournament has any IN_PROGRESS or COMPLETED matches.

**Conclusion:** No additional guard is needed in the advancement controller. ADV-04 is already enforced by the existing `PATCH /api/v1/tournament-rules/:id/format` endpoint guard.

## Test Results

21 integration tests pass (all GREEN):
- Auth enforcement on all 3 endpoints (401 for unauthenticated, service not called)
- Error code → HTTP status mapping verified via route structure
- Response format follows BATL API error format (`{error: {code, message}}`)
- POST 201 status confirmed

## Deviations from Plan

### Auto-added: advancementService.js stub

**Found during:** Task 1 (TDD RED phase)
**Issue:** `jest.unstable_mockModule('../../src/services/advancementService.js', ...)` fails with "Could not locate module" if the file does not exist — even though the test mocks it.
**Fix:** Created `backend/src/services/advancementService.js` as a stub with all three exported functions throwing `NOT_IMPLEMENTED`. Plan 01 will replace this with the full implementation.
**Files modified:** `backend/src/services/advancementService.js`
**Rule:** Rule 3 (blocking issue — tests could not run without the file)

## Self-Check: PASSED

All created files verified:
- `backend/src/api/validators/advancementValidator.js` — exists, contains `Joi.string().uuid()`
- `backend/src/api/advancementController.js` — exists, imports `computeAdvancementPreview, confirmAdvancement, revertAdvancement`
- `backend/src/api/routes/advancementRoutes.js` — exists, contains 3 router entries
- `backend/src/services/advancementService.js` — exists (stub)
- `backend/__tests__/integration/advancementRoutes.test.js` — exists, 21 tests passing
- `backend/src/index.js` — contains `import advancementRoutes` and `app.use('/api/v1/tournaments', advancementRoutes)`

Commits:
- `1f9e4c0`: feat(30-02): advancement API layer — validator, controller, routes, integration tests
- `d7a388c`: feat(30-02): register advancement routes in Express app at /api/v1/tournaments
