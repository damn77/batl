---
phase: 14-tournament-copy
plan: "01"
subsystem: backend-api
tags: [tournament-copy, api-endpoint, joi-validation, prisma-transaction]
dependency_graph:
  requires: [tournamentService, organizerService, locationService, prisma.tournamentPointConfig]
  provides: [POST /api/v1/tournaments/:id/copy]
  affects: [tournamentRoutes.js, tournamentController.js, tournamentService.js]
tech_stack:
  added: []
  patterns: [joi-validation, http-errors, prisma-transaction, jest-mock-modules]
key_files:
  created:
    - backend/src/api/validators/tournamentCopyValidator.js
    - backend/__tests__/integration/tournamentCopy.test.js
  modified:
    - backend/src/services/tournamentService.js
    - backend/src/api/tournamentController.js
    - backend/src/api/routes/tournamentRoutes.js
decisions:
  - "Validator accepts all override fields as optional; service enforces name+startDate+endDate are provided (DB schema requires non-nullable DateTime fields)"
  - "Deputy organizer is NOT copied to new tournament — copying user becomes primary organizer, deputy can be assigned later"
  - "Registration open/close dates are NOT copied — must be set fresh for the new tournament"
  - "pointConfigCloned field included in response only when a config was actually cloned (not present otherwise)"
metrics:
  duration: "4m"
  completed_date: "2026-03-04"
  tasks_completed: 1
  files_changed: 5
---

# Phase 14 Plan 01: Tournament Copy Backend API Summary

Backend API endpoint enabling organizers to copy an existing tournament via `POST /api/v1/tournaments/:id/copy`, creating a new SCHEDULED tournament pre-populated with the source's configuration, with override fields applied and TournamentPointConfig cloned if present.

## What Was Built

### Validator — `tournamentCopyValidator.js`

Joi schema `copyTournamentSchema` accepting optional override fields: `name`, `description`, `startDate` (ISO date string), `endDate` (ISO date string), `capacity` (integer min 2), `clubName`, `address`. All fields optional since the frontend sends the user-edited form payload.

### Service Function — `copyTournament(sourceId, overrides, userId)`

Added to `tournamentService.js`:
1. Fetch source tournament by ID (include `pointConfig`) — throw 404 if not found
2. Require `name`, `startDate`, `endDate` in overrides — throw 400 `MISSING_REQUIRED_OVERRIDES` if absent
3. Validate date range (end >= start)
4. Set organizer to copying user via `organizerService.findOrCreateOrganizer(userId)`
5. Resolve location: use override `clubName` if provided, else keep source `locationId`
6. Build new tournament data copying: `categoryId`, `description`, `locationId`, `backupLocationId`, `courts`, `capacity`, `entryFee`, `rulesUrl`, `prizeDescription`, `minParticipants`, `waitlistDisplayOrder`, `formatType`, `formatConfig`, `defaultScoringRules`
7. Prisma `$transaction`: create tournament + optionally clone `TournamentPointConfig`
8. Return `{ tournament, copiedFrom: { id, name }, pointConfigCloned? }`

**Fields NOT copied:** `name` (empty — organizer fills), `startDate`/`endDate` (required as overrides), `registrationOpenDate`, `registrationCloseDate`, `deputyOrganizerId`, registrations, brackets, draw.

**Reset fields:** `status = SCHEDULED`, `registrationClosed = false`.

### Controller Handler — `copyTournament`

Added to `tournamentController.js`:
- Calls `tournamentService.copyTournament(id, req.body, req.user.id)`
- Returns 201 with `{ success: true, data: { tournament, copiedFrom } }` and message
- Maps 404 (tournament not found) and 400 (missing overrides / date range) errors

### Route Registration

Added to `tournamentRoutes.js` BEFORE generic `/:id` routes:
```
POST /:id/copy  →  isAuthenticated + authorize('create', 'Tournament') + validateBody(copyTournamentSchema) + copyTournament
```

### Integration Tests — `tournamentCopy.test.js`

20 tests covering:
- Authentication: 401 without session, route distinct from POST /
- Validator shape: all fields accepted, empty body valid, capacity min 2, non-string name rejected
- Response contract: SCHEDULED status, registrationClosed false, no registrations/brackets, required fields present
- Service mock behavior: 404 simulation, point config cloned/absent, override application, status always SCHEDULED, category/format preserved

## Deviations from Plan

None — plan executed exactly as written. The test strategy used Jest mock modules (`jest.unstable_mockModule`) consistent with the existing `bracketPersistenceRoutes.test.js` pattern. The plan mentioned `npx vitest run` in the verify step but the backend uses Jest (`node --experimental-vm-modules jest`).

## Self-Check: PASSED

- FOUND: backend/src/api/validators/tournamentCopyValidator.js
- FOUND: backend/src/services/tournamentService.js
- FOUND: backend/src/api/tournamentController.js
- FOUND: backend/src/api/routes/tournamentRoutes.js
- FOUND: backend/__tests__/integration/tournamentCopy.test.js
- FOUND commit: d3c56b6 feat(14-01): implement POST /api/v1/tournaments/:id/copy endpoint
- Tests: 20 passed, 0 failed
