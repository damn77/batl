---
phase: 02-tournament-lifecycle-and-bracket-progression
plan: 02
subsystem: ui
tags: [react, swr, react-bootstrap, tournament-lifecycle, bracket]

# Dependency graph
requires:
  - phase: 02-01
    provides: PATCH /api/v1/tournaments/:id/start endpoint, advanceBracketSlot, checkAndCompleteTournament
provides:
  - startTournament() in frontend tournamentService
  - Champion field in GET /api/v1/tournaments/:id response
  - Start Tournament button (organizer-only, SCHEDULED status)
  - Champion banner (COMPLETED status with winner name)
  - Read-only bracket gate for players after COMPLETED
  - Round 2 BYE slot pre-population after bracket generation
  - Set score validation (blocking for players, advisory for organizers)
  - TBD opponent guard preventing premature result submission
affects:
  - TournamentViewPage
  - KnockoutBracket
  - FormatVisualization

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SWR mutate() called after successful startTournament() for optimistic cache invalidation
    - window.confirm() for lightweight confirmation dialogs (no modal component)
    - tournamentStatus prop threaded from TournamentViewPage to FormatVisualization to KnockoutBracket

key-files:
  created: []
  modified:
    - frontend/src/services/tournamentService.js
    - frontend/src/pages/TournamentViewPage.jsx
    - frontend/src/components/KnockoutBracket.jsx
    - frontend/src/components/FormatVisualization.jsx
    - backend/src/services/tournamentService.js
    - backend/src/api/tournamentController.js

key-decisions:
  - "PlayerProfile uses a single name field (not firstName/lastName) — champion name assembled directly"
  - "Champion banner uses Alert variant=warning (yellow) for visual prominence without alarm semantics"
  - "tournamentStatus prop passes through FormatVisualization to KnockoutBracket — minimal prop drilling to avoid modifying KnockoutBracket's internal architecture"
  - "Set score validation is blocking for players and advisory for organizers — matches existing permission model"
  - "Players blocked from opening result modal when opponent slot is TBD — prevents incomplete match submissions"

patterns-established:
  - "Lifecycle button pattern: role-gated + status-gated, inline error Alert, SWR mutate on success"
  - "Champion query: findFirst with bracket.bracketType=MAIN + isBye=false + status=COMPLETED, orderBy roundNumber desc"

requirements-completed: [LIFE-01, LIFE-02, LIFE-03, LIFE-04]

# Metrics
duration: ~45min
completed: 2026-02-28
---

# Phase 02 Plan 02: Tournament Lifecycle Frontend Summary

**Start Tournament button, champion banner, read-only bracket gate, and 4 verification-driven fixes completing the full tournament lifecycle UI**

## Performance

- **Duration:** ~45 min (including human verification and 4 follow-up fixes)
- **Started:** 2026-02-28T08:56:26Z
- **Completed:** 2026-02-28
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint — approved)
- **Files modified:** 6

## Accomplishments

- Organizer can start a SCHEDULED tournament in one click; status badge updates to IN_PROGRESS via SWR cache bust without page reload
- Champion computation added to backend GET response — queries final MAIN bracket COMPLETED match and parses result JSON winner
- TournamentViewPage shows champion banner (Alert variant=warning) and Start Tournament button in the correct lifecycle states
- KnockoutBracket gates player click handler behind tournamentStatus prop — players see read-only bracket after COMPLETED
- Four verification-driven fixes applied: KnockoutBracket visibility for organizers, Round 2 BYE slot pre-population, TBD opponent guard, and set score validation

## Task Commits

Each task was committed atomically:

1. **Task 1: Add startTournament() to frontend tournamentService.js and compute champion in backend** - `34dec5a` (feat)
2. **Task 2: TournamentViewPage — Start Tournament button + champion banner; KnockoutBracket — read-only gate** - `392db6c` (feat)
3. **Task 3: Human verification** - Approved

**Verification fixes (applied during and after checkpoint):**
- `bc673bc` fix(02-02): show KnockoutBracket for organizers on IN_PROGRESS/COMPLETED tournaments
- `a1341df` fix(02-02): pre-populate Round 2 BYE slots and fix bracket advancement lookup
- `3fc8e4e` fix(02-02): block players from opening result modal when opponent slot is TBD
- `07bbdd2` fix(02-02): validate set scores — block players on invalid input, warn organizers

**Plan metadata:** `dddeac0` (docs: checkpoint placeholder commit)

## Files Created/Modified

- `frontend/src/services/tournamentService.js` - Added startTournament() export calling PATCH /api/v1/tournaments/:id/start
- `frontend/src/pages/TournamentViewPage.jsx` - Start Tournament button (organizer/SCHEDULED), champion banner (COMPLETED), handleStartTournament handler with SWR mutate and inline error display
- `frontend/src/components/KnockoutBracket.jsx` - tournamentStatus prop + read-only gate in handleMatchClick; TBD opponent guard; set score validation
- `frontend/src/components/FormatVisualization.jsx` - Pass tournamentStatus={tournament.status} to KnockoutBracket; fixed visibility for organizers on IN_PROGRESS/COMPLETED
- `backend/src/services/tournamentService.js` - Champion computation in getTournamentWithRelatedData(); Round 2 BYE slot pre-population; bracket advancement lookup fix
- `backend/src/api/tournamentController.js` - Expose champion field in GET /tournaments/:id response

## Decisions Made

- PlayerProfile uses a single `name` field (verified via schema grep) — no firstName/lastName concatenation needed
- window.confirm() used for Start Tournament confirmation (plan explicitly allows this)
- Champion query uses `bracket: { bracketType: 'MAIN' }` filter via Prisma relation traversal
- Set score validation is blocking for players (cannot submit invalid input) and advisory-only for organizers (can override) — matches overall permission model throughout the application
- Players blocked from opening result modal when opponent slot is TBD — prevents incomplete match submissions creating data integrity issues

## Deviations from Plan

### Auto-fixed Issues (during human verification checkpoint)

**1. [Rule 1 - Bug] KnockoutBracket not rendering for organizers on IN_PROGRESS/COMPLETED tournaments**
- **Found during:** Human verification (Task 3)
- **Issue:** FormatVisualization conditional rendering did not show KnockoutBracket for organizer role when tournament was IN_PROGRESS or COMPLETED
- **Fix:** Updated FormatVisualization conditional to include IN_PROGRESS and COMPLETED states in organizer view
- **Files modified:** frontend/src/components/FormatVisualization.jsx
- **Verification:** Organizer can see and interact with bracket in all tournament states
- **Committed in:** bc673bc

**2. [Rule 1 - Bug] Round 2 BYE slots not pre-populated after bracket generation**
- **Found during:** Human verification (Task 3)
- **Issue:** When a Round 1 match was a BYE, the winner was not automatically advanced to the Round 2 slot; Round 2 showed "TBD" instead of the actual player
- **Fix:** Backend service pre-populates Round 2 BYE advancement slots immediately during bracket generation; also fixed bracket advancement lookup query
- **Files modified:** backend/src/services/tournamentService.js
- **Verification:** Round 2 slots show correct players immediately after bracket generation when Round 1 BYEs exist
- **Committed in:** a1341df

**3. [Rule 2 - Missing Critical] Block players from opening result modal when opponent slot is TBD**
- **Found during:** Human verification (Task 3)
- **Issue:** Players could open the result modal on a match where their opponent had not been determined yet, allowing incomplete match submissions
- **Fix:** handleMatchClick in KnockoutBracket checks both player slots; if either is null/TBD the modal is blocked for non-organizers
- **Files modified:** frontend/src/components/KnockoutBracket.jsx
- **Verification:** Players cannot open modal on matches with TBD opponents; organizers still can
- **Committed in:** 3fc8e4e

**4. [Rule 2 - Missing Critical] Set score validation — block players on invalid input, warn organizers**
- **Found during:** Human verification (Task 3)
- **Issue:** Players could submit clearly invalid set scores (e.g., 0-0, negative values, non-numeric) without client-side feedback
- **Fix:** Added client-side validation in result modal area: blocks player submission on invalid scores, displays advisory warning for organizers who can override
- **Files modified:** frontend/src/components/KnockoutBracket.jsx
- **Verification:** Player submit button disabled on invalid input; organizer sees warning but can proceed
- **Committed in:** 07bbdd2

---

**Total deviations:** 4 auto-fixed (2 bugs, 2 missing critical)
**Impact on plan:** All four fixes were necessary for correct tournament lifecycle operation. No scope creep — each fix directly supports the core lifecycle user stories (LIFE-01 through LIFE-04).

## Issues Encountered

- Bracket advancement lookup query used an incorrect field reference in the backend service; required query correction to find the next-round match slot. Resolved in a1341df.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Full tournament lifecycle (SCHEDULED to IN_PROGRESS to COMPLETED) is now functional end-to-end in both backend and frontend
- Champion banner and read-only bracket gate are in place and verified
- Phase 2 is complete; all four requirements (LIFE-01, LIFE-02, LIFE-03, LIFE-04) satisfied and human-verified
- No known blockers for future phases

---
*Phase: 02-tournament-lifecycle-and-bracket-progression*
*Completed: 2026-02-28*
