---
phase: quick-5
plan: 01
subsystem: database
tags: [prisma, singleton, connection-pool]

requires: []
provides:
  - Single shared PrismaClient instance for entire backend
affects: [all backend services, API controllers]

tech-stack:
  added: []
  patterns: ["Shared PrismaClient singleton at backend/src/lib/prisma.js"]

key-files:
  created: []
  modified:
    - backend/src/services/*.js (25 files)
    - backend/src/api/pairController.js
    - backend/src/api/tournamentRegistrationController.js
    - backend/src/api/routes/tournamentRoutes.js

key-decisions:
  - "Mechanical import replacement only -- no logic changes"

patterns-established:
  - "All database access imports from backend/src/lib/prisma.js"

requirements-completed: []

duration: 3min
completed: 2026-03-07
---

# Quick Task 5: Migrate All PrismaClient Instances Summary

**Replaced 28 separate PrismaClient instantiations with shared singleton import from lib/prisma.js to eliminate connection pool exhaustion**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-07T08:50:11Z
- **Completed:** 2026-03-07T08:53:00Z
- **Tasks:** 3
- **Files modified:** 28

## Accomplishments
- Migrated 25 service files from `new PrismaClient()` to shared singleton import
- Migrated 2 controller files (pairController, tournamentRegistrationController)
- Removed 3 inline dynamic PrismaClient imports from tournamentRoutes.js route handlers
- Verified zero remaining `new PrismaClient()` outside lib/prisma.js
- Backend starts without import errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate all service files to shared prisma singleton** - `a4e1633` (refactor)
2. **Task 2: Migrate controller and route files to shared prisma singleton** - `3124ef3` (refactor)
3. **Task 3: Verify zero remaining PrismaClient instantiations and backend starts** - verification only, no code changes

## Files Created/Modified
- `backend/src/services/auditService.js` - Replaced PrismaClient with shared import
- `backend/src/services/bracketPersistenceService.js` - Replaced PrismaClient with shared import
- `backend/src/services/categoryService.js` - Replaced PrismaClient with shared import
- `backend/src/services/consolationOptOutService.js` - Replaced PrismaClient with shared import
- `backend/src/services/locationService.js` - Replaced PrismaClient with shared import
- `backend/src/services/matchResultService.js` - Replaced PrismaClient with shared import
- `backend/src/services/matchRulesService.js` - Replaced PrismaClient with shared import
- `backend/src/services/matchService.js` - Replaced PrismaClient with shared import
- `backend/src/services/organizerService.js` - Replaced PrismaClient with shared import
- `backend/src/services/pairRegistrationService.js` - Replaced PrismaClient with shared import
- `backend/src/services/pairService.js` - Replaced PrismaClient with shared import
- `backend/src/services/playerService.js` - Replaced PrismaClient with shared import
- `backend/src/services/pointCalculationService.js` - Replaced PrismaClient with shared import
- `backend/src/services/pointTableService.js` - Replaced PrismaClient with shared import
- `backend/src/services/rankingService.js` - Replaced PrismaClient with shared import
- `backend/src/services/registrationService.js` - Replaced PrismaClient with shared import
- `backend/src/services/ruleHistoryService.js` - Replaced PrismaClient with shared import
- `backend/src/services/seedingService.js` - Replaced PrismaClient with shared import
- `backend/src/services/sharedTournamentService.js` - Replaced PrismaClient with shared import
- `backend/src/services/tournamentLifecycleService.js` - Replaced PrismaClient with shared import
- `backend/src/services/tournamentRegistrationService.js` - Replaced PrismaClient with shared import
- `backend/src/services/tournamentRulesService.js` - Replaced PrismaClient with shared import
- `backend/src/services/tournamentService.js` - Replaced PrismaClient with shared import
- `backend/src/services/userService.js` - Replaced PrismaClient with shared import
- `backend/src/services/yearRolloverService.js` - Replaced PrismaClient with shared import
- `backend/src/api/pairController.js` - Replaced PrismaClient with shared import
- `backend/src/api/tournamentRegistrationController.js` - Replaced PrismaClient with shared import
- `backend/src/api/routes/tournamentRoutes.js` - Removed 3 inline dynamic imports, added static singleton import

## Decisions Made
None - followed plan as specified. Mechanical import replacement only.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All backend files now use a single connection pool via the shared singleton
- No further migration work needed

## Self-Check: PASSED

---
*Quick Task: 5-migrate-all-prismaclient-instances*
*Completed: 2026-03-07*
