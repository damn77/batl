---
phase: 27-group-formation
plan: "02"
subsystem: backend
tags: [api, express, joi, integration-tests, group-formation, group-draw, swap]
dependency_graph:
  requires:
    - backend/src/services/groupPersistenceService.js (generateGroupDraw, swapGroupParticipants)
    - backend/src/middleware/auth.js (isAuthenticated)
    - backend/src/middleware/authorize.js (authorize)
    - backend/src/middleware/validate.js (validateBody)
  provides:
    - backend/src/api/validators/groupDrawValidator.js (generateGroupDrawSchema, swapGroupParticipantsSchema)
    - backend/src/api/groupDrawController.js (generateDraw, swapParticipants)
    - backend/src/api/routes/groupDrawRoutes.js (POST /:id/group-draw, POST /:id/group-draw/swap)
    - POST /api/v1/tournaments/:id/group-draw (registered in index.js)
    - POST /api/v1/tournaments/:id/group-draw/swap (registered in index.js)
  affects:
    - backend/src/index.js (route registration added)
    - backend/src/services/groupPersistenceService.js (swapGroupParticipants added)
    - backend/__tests__/integration/groupDrawRoutes.test.js (new)
tech_stack:
  added: []
  patterns:
    - jest.unstable_mockModule for ES module mocking in integration tests
    - CASL authorize middleware for ORGANIZER/ADMIN role enforcement
    - Joi validateBody middleware for request validation
key_files:
  created:
    - backend/src/api/validators/groupDrawValidator.js
    - backend/src/api/groupDrawController.js
    - backend/src/api/routes/groupDrawRoutes.js
    - backend/__tests__/integration/groupDrawRoutes.test.js
  modified:
    - backend/src/index.js (added groupDrawRoutes import and registration)
    - backend/src/services/groupPersistenceService.js (added swapGroupParticipants)
decisions:
  - "Used isAuthenticated + authorize('create'/'update', 'Tournament') matching seeding route pattern — not requireAuth/requireRole (which don't exist in this codebase)"
  - "swapGroupParticipants deletes all rounds with bracketId=null for the tournament before regenerating — safe because group rounds are isolated from bracket rounds"
  - "Integration tests use 401 auth-gate pattern (matching bracketPersistenceRoutes.test.js) since sessions require live DB users"
metrics:
  duration: "~4 minutes"
  completed: "2026-03-17"
  tasks_completed: 2
  files_changed: 6
---

# Phase 27 Plan 02: Group Draw API Layer Summary

API endpoints for group draw generation and participant swap, exposing groupPersistenceService via Express with Joi validation, CASL authorization, and 24 integration tests.

## What Was Built

**Task 1: API layer — controller, validator, routes, and route registration**

Four files created/modified to expose group draw functionality as HTTP endpoints:

1. **`groupDrawValidator.js`** — Two Joi schemas:
   - `generateGroupDrawSchema`: `groupCount` (integer >= 2, required), `seededRounds` (integer >= 0, default 0), `randomSeed` (string, optional)
   - `swapGroupParticipantsSchema`: `participantAId` (UUID, required), `participantBId` (UUID, required)

2. **`groupDrawController.js`** — Two handlers:
   - `generateDraw`: extracts params, calls `generateGroupDrawService`, returns 201 on success
   - `swapParticipants`: extracts params, calls `swapGroupParticipantsService`, returns 200 on success
   - `mapErrorToStatus()` helper: maps service error codes to HTTP status codes (404, 400, 409, 500)

3. **`groupDrawRoutes.js`** — Express router:
   - `POST /:id/group-draw`: isAuthenticated → authorize('create', 'Tournament') → validateBody → generateDraw
   - `POST /:id/group-draw/swap`: isAuthenticated → authorize('update', 'Tournament') → validateBody → swapParticipants

4. **`index.js`** — Registered `groupDrawRoutes` at `/api/v1/tournaments`

5. **`groupPersistenceService.js`** — Added `swapGroupParticipants()`:
   - Validates tournament status (SCHEDULED or TOURNAMENT_LOCKED)
   - Loads both GroupParticipant records, validates they belong to the tournament
   - Validates participants are in different groups (SAME_GROUP_SWAP)
   - Atomic `prisma.$transaction`: swap groupId, delete old matches + rounds, recalculate groupSize, regenerate round-robin fixtures

**Task 2: Integration tests for generate draw and swap endpoints**

24 integration tests using `jest.unstable_mockModule` pattern from `bracketPersistenceRoutes.test.js`:
- Auth guard tests (unauthenticated → 401) for both endpoints
- Generate draw tests: GFORM-01 (happy path), GFORM-03/04 (seededRounds), GFORM-05 (random draw), GFORM-07 (doubles tournament request format)
- Swap tests: GFORM-06 (swap auth gate), validation errors (missing IDs, non-UUID IDs, empty body)
- Error code mapping tests: REGISTRATION_NOT_CLOSED, INSUFFICIENT_PLAYERS, TOURNAMENT_LOCKED, SAME_GROUP_SWAP, PARTICIPANT_NOT_FOUND
- Response format tests: BATL API error format `{ error: { code, message } }`

All 24 tests pass.

## Error Code → HTTP Status Mapping

| Error Code | Status |
|---|---|
| TOURNAMENT_NOT_FOUND | 404 |
| PARTICIPANT_NOT_FOUND | 404 |
| REGISTRATION_NOT_CLOSED | 400 |
| INVALID_GROUP_COUNT | 400 |
| INSUFFICIENT_PLAYERS | 400 |
| UNBALANCED_GROUPS | 400 |
| SAME_GROUP_SWAP | 400 |
| TOURNAMENT_LOCKED / INVALID_STATUS | 409 |
| default | 500 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Codebase uses `isAuthenticated`+`authorize` not `requireAuth`+`requireRole`**
- **Found during:** Task 1 (reading auth.js and seeding route)
- **Issue:** Plan specified `requireAuth` and `requireRole(['ORGANIZER', 'ADMIN'])` but these exports don't exist. The codebase uses `isAuthenticated` (from auth.js) + `authorize(action, subject)` (from authorize.js/CASL)
- **Fix:** Used `isAuthenticated` + `authorize('create', 'Tournament')` / `authorize('update', 'Tournament')` matching the seeding placement routes pattern
- **Files modified:** `backend/src/api/routes/groupDrawRoutes.js`
- **Commit:** 7cc42b9

## Self-Check: PASSED

| Item | Status |
|------|--------|
| backend/src/api/validators/groupDrawValidator.js | FOUND |
| backend/src/api/groupDrawController.js | FOUND |
| backend/src/api/routes/groupDrawRoutes.js | FOUND |
| backend/__tests__/integration/groupDrawRoutes.test.js | FOUND |
| backend/src/index.js contains groupDrawRoutes | FOUND |
| backend/src/services/groupPersistenceService.js contains swapGroupParticipants | FOUND |
| Commit 7cc42b9 (API layer) | FOUND |
| Commit 521f86c (integration tests) | FOUND |
| 24 integration tests passing | PASSED |
