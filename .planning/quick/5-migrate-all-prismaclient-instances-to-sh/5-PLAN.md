---
phase: quick-5
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/src/services/auditService.js
  - backend/src/services/bracketPersistenceService.js
  - backend/src/services/categoryService.js
  - backend/src/services/locationService.js
  - backend/src/services/matchResultService.js
  - backend/src/services/matchRulesService.js
  - backend/src/services/consolationOptOutService.js
  - backend/src/services/matchService.js
  - backend/src/services/organizerService.js
  - backend/src/services/pairRegistrationService.js
  - backend/src/services/pairService.js
  - backend/src/services/playerService.js
  - backend/src/services/pointCalculationService.js
  - backend/src/services/rankingService.js
  - backend/src/services/registrationService.js
  - backend/src/services/pointTableService.js
  - backend/src/services/ruleHistoryService.js
  - backend/src/services/seedingService.js
  - backend/src/services/sharedTournamentService.js
  - backend/src/services/tournamentLifecycleService.js
  - backend/src/services/tournamentRegistrationService.js
  - backend/src/services/tournamentRulesService.js
  - backend/src/services/tournamentService.js
  - backend/src/services/userService.js
  - backend/src/services/yearRolloverService.js
  - backend/src/api/pairController.js
  - backend/src/api/tournamentRegistrationController.js
  - backend/src/api/routes/tournamentRoutes.js
autonomous: true
requirements: []
must_haves:
  truths:
    - "No file in backend/src creates its own PrismaClient instance"
    - "All database access uses the shared singleton from backend/src/lib/prisma.js"
    - "Backend starts and responds to API requests after migration"
  artifacts:
    - path: "backend/src/lib/prisma.js"
      provides: "Shared PrismaClient singleton"
  key_links:
    - from: "backend/src/services/*.js"
      to: "backend/src/lib/prisma.js"
      via: "import prisma from '../lib/prisma.js'"
      pattern: "import prisma from.*lib/prisma"
---

<objective>
Replace all remaining `new PrismaClient()` instantiations across 28 files with imports from the shared singleton at `backend/src/lib/prisma.js`.

Purpose: Eliminate connection pool exhaustion from multiple PrismaClient instances. Each instance opens its own connection pool; the singleton ensures one pool for the entire backend.
Output: All backend files use the shared prisma singleton. Zero `new PrismaClient()` calls remain outside `lib/prisma.js`.
</objective>

<execution_context>
@C:/Users/erich/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/erich/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@backend/src/lib/prisma.js (the shared singleton — already created)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Migrate all service files to shared prisma singleton</name>
  <files>
    backend/src/services/auditService.js
    backend/src/services/bracketPersistenceService.js
    backend/src/services/categoryService.js
    backend/src/services/locationService.js
    backend/src/services/matchResultService.js
    backend/src/services/matchRulesService.js
    backend/src/services/consolationOptOutService.js
    backend/src/services/matchService.js
    backend/src/services/organizerService.js
    backend/src/services/pairRegistrationService.js
    backend/src/services/pairService.js
    backend/src/services/playerService.js
    backend/src/services/pointCalculationService.js
    backend/src/services/rankingService.js
    backend/src/services/registrationService.js
    backend/src/services/pointTableService.js
    backend/src/services/ruleHistoryService.js
    backend/src/services/seedingService.js
    backend/src/services/sharedTournamentService.js
    backend/src/services/tournamentLifecycleService.js
    backend/src/services/tournamentRegistrationService.js
    backend/src/services/tournamentRulesService.js
    backend/src/services/tournamentService.js
    backend/src/services/userService.js
    backend/src/services/yearRolloverService.js
  </files>
  <action>
For each of the 25 service files listed above, apply this mechanical transformation:

1. Remove the line: `import { PrismaClient } from '@prisma/client';`
2. Remove the line: `const prisma = new PrismaClient();`
3. Add the line: `import prisma from '../lib/prisma.js';`

Place the new import alongside other imports at the top of the file. The rest of each file remains untouched — all existing code already references `prisma` as a module-level variable, so no other changes are needed.

Do NOT change any logic, function signatures, or exports.
  </action>
  <verify>
    <automated>cd D:/Workspace/BATL && grep -r "new PrismaClient" backend/src/services/ | wc -l</automated>
  </verify>
  <done>grep returns 0 matches. All 25 service files import from ../lib/prisma.js instead of creating their own PrismaClient.</done>
</task>

<task type="auto">
  <name>Task 2: Migrate controller and route files to shared prisma singleton</name>
  <files>
    backend/src/api/pairController.js
    backend/src/api/tournamentRegistrationController.js
    backend/src/api/routes/tournamentRoutes.js
  </files>
  <action>
For `pairController.js` and `tournamentRegistrationController.js`, apply the same transformation as Task 1:
1. Remove `import { PrismaClient } from '@prisma/client';`
2. Remove `const prisma = new PrismaClient();`
3. Add `import prisma from '../lib/prisma.js';`

For `tournamentRoutes.js`, this file has 3 inline instances inside route handlers (lines ~182, ~223, ~278) using dynamic import pattern:
```js
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
```

Replace all 3 occurrences:
1. Add `import prisma from '../../lib/prisma.js';` at the top of the file with other imports
2. Remove all 3 pairs of `const { PrismaClient } = await import(...)` and `const prisma = new PrismaClient()` lines from inside the route handlers
3. The handler code already uses `prisma.tournamentPointConfig.findUnique(...)` etc., so the module-level import will be used automatically

Do NOT change any logic, function signatures, or exports.
  </action>
  <verify>
    <automated>cd D:/Workspace/BATL && grep -r "new PrismaClient" backend/src/api/ | wc -l</automated>
  </verify>
  <done>grep returns 0 matches. All 3 API files import from the shared singleton.</done>
</task>

<task type="auto">
  <name>Task 3: Verify zero remaining PrismaClient instantiations and backend starts</name>
  <files></files>
  <action>
Run a final sweep to confirm no `new PrismaClient()` exists anywhere in `backend/src/` except `backend/src/lib/prisma.js`.

Then start the backend server briefly to confirm it boots without import errors:
```bash
cd D:/Workspace/BATL && node -e "import('./backend/src/index.js').then(() => console.log('OK')).catch(e => { console.error(e); process.exit(1); })"
```

If the server starts (binds to port), that confirms all imports resolve correctly. Kill after confirming startup.
  </action>
  <verify>
    <automated>cd D:/Workspace/BATL && count=$(grep -r "new PrismaClient" backend/src/ --include="*.js" | grep -v "lib/prisma.js" | wc -l) && echo "Remaining instances: $count" && test "$count" -eq 0</automated>
  </verify>
  <done>Zero `new PrismaClient()` instances outside lib/prisma.js. Backend starts without import errors.</done>
</task>

</tasks>

<verification>
- `grep -r "new PrismaClient" backend/src/ --include="*.js"` returns ONLY `backend/src/lib/prisma.js`
- `grep -r "import prisma from" backend/src/ --include="*.js"` returns 28+ files (25 services + 2 controllers + 1 routes + auth.js + authController.js)
- Backend starts without errors
</verification>

<success_criteria>
- All 28 files migrated to use shared prisma singleton
- Zero `new PrismaClient()` calls remain outside `backend/src/lib/prisma.js`
- Backend boots and responds to requests
</success_criteria>

<output>
After completion, create `.planning/quick/5-migrate-all-prismaclient-instances-to-sh/5-SUMMARY.md`
</output>
