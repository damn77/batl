---
phase: 27-group-formation
verified: 2026-03-17T14:17:46Z
status: passed
score: 5/5 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "GROUP tournament organizer flow: open registration → close → configure groups → generate draw → swap players"
    expected: "Each state (A/B/C/D) renders correctly; group size preview updates live; swap commits immediately and refreshes standings"
    why_human: "UI state machine behavior, live reactivity, and visual correctness cannot be verified via grep"
  - test: "COMBINED tournament organizer flow: no groups → generate → view draw + CombinedFormatDisplay stacked"
    expected: "GroupDrawGenerationSection appears before CombinedFormatDisplay after draw generation"
    why_human: "Conditional rendering logic with two components stacked — visual layout requires browser verification"
---

# Phase 27: Group Formation Verification Report

**Phase Goal:** Organizer generates a seeded group draw with round-robin schedule for GROUP or COMBINED tournaments
**Verified:** 2026-03-17T14:17:46Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Organizer sees "Generate Group Draw" section and can configure group count and seeded rounds before generating | VERIFIED | `GroupDrawGenerationSection.jsx` (609 lines) State B renders group count + seeded rounds inputs; wired into `FormatVisualization.jsx` GROUP and COMBINED branches behind `isOrganizerOrAdmin` guard |
| 2 | System validates balanced group sizes (no group more than 1 player smaller than the largest) | VERIFIED | `validateGroupBalance()` exported from `groupPersistenceService.js`; called in `generateGroupDraw()` before transaction; 10 unit tests cover valid/invalid cases including min-group-size check |
| 3 | After generating, each group has correct snake-draft player distribution and complete round-robin fixture list | VERIFIED | `snakeDraft()` + `fillUnseeded()` + `generateCircleRoundRobin()` all exported and individually unit tested (34 tests, all passing). Circle method produces N*(N-1)/2 fixtures. `generateGroupDraw` calls all three in sequence within `prisma.$transaction` |
| 4 | Doubles tournament generates group assignments using pairs with no FK errors | VERIFIED | Schema: `GroupParticipant.playerId String?` (nullable) + `pairId String?` FK to `DoublesPair`; `generateGroupDraw` branches on `category.type === 'DOUBLES'` to use `pairRegistration`; integration test covers doubles path |
| 5 | Organizer can manually override player-to-group assignments and regenerate the draw | VERIFIED | `swapGroupParticipants()` exported from `groupPersistenceService.js`; POST `/:id/group-draw/swap` route wired in `groupDrawRoutes.js` + registered in `index.js`; `GroupDrawGenerationSection.jsx` State C renders swap UI with two Form.Select dropdowns |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/prisma/schema.prisma` | GroupParticipant with nullable playerId and pairId FK | VERIFIED | Line 545: `playerId String?`, Line 546: `pairId String?`, Line 555: `pair DoublesPair?` relation, Lines 558-562: `@@unique([groupId, pairId])` + `@@index([pairId])`. DoublesPair model has `groupParticipants GroupParticipant[]` reverse relation at line 593 |
| `backend/prisma/migrations/20260317000000_add_group_participant_pair_id/` | Migration applied | VERIFIED | Directory exists; applied via `db push` + `migrate resolve` due to dev environment drift |
| `backend/src/services/groupPersistenceService.js` | generateGroupDraw and 5 supporting functions | VERIFIED | 631 lines; exports: `snakeDraft`, `fillUnseeded`, `generateCircleRoundRobin`, `validateGroupBalance`, `generateGroupDraw`, `swapGroupParticipants` |
| `backend/__tests__/unit/groupPersistenceService.test.js` | Unit tests >= 100 lines | VERIFIED | 322 lines; 34 tests (all passing); covers snake draft, fill unseeded, circle round-robin, validate group balance |
| `backend/src/api/validators/groupDrawValidator.js` | Joi schemas for generate and swap | VERIFIED | Exports `generateGroupDrawSchema` and `swapGroupParticipantsSchema` |
| `backend/src/api/groupDrawController.js` | Request handlers for generate and swap | VERIFIED | Exports `generateDraw` and `swapParticipants`; imports from `groupPersistenceService.js` at line 14; `mapErrorToStatus()` helper covers all error codes |
| `backend/src/api/routes/groupDrawRoutes.js` | Express router with POST /generate and POST /swap | VERIFIED | `router.post('/:id/group-draw', ...)` and `router.post('/:id/group-draw/swap', ...)`; uses `isAuthenticated` + `authorize` + `validateBody` middleware |
| `backend/__tests__/integration/groupDrawRoutes.test.js` | Integration tests >= 100 lines | VERIFIED | 364 lines; 24 tests (all passing); covers generate draw, swap, validation errors, auth gate, doubles path, error code mapping |
| `frontend/src/services/groupDrawService.js` | API client for group draw endpoints | VERIFIED | Exports `generateGroupDraw` and `swapGroupParticipants`; calls `apiClient.post('/v1/tournaments/${tournamentId}/group-draw')` and `.../group-draw/swap`; returns `response.data.data` |
| `frontend/src/components/GroupDrawGenerationSection.jsx` | Full group draw workflow component >= 150 lines | VERIFIED | 609 lines; all 4 states (A/B/C/D); contains all required UI strings and behaviors |
| `frontend/src/components/FormatVisualization.jsx` | Updated GROUP and COMBINED branches | VERIFIED | Import at line 12; `GroupDrawGenerationSection` rendered in GROUP branch (line 82) and COMBINED branch (lines 208, 220); `isOrganizerOrAdmin` guard applied |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `groupPersistenceService.js` | `seedingPlacementService.js` | `import { getSeededPlayers, shuffle, createRandomSeed }` | WIRED | Line 16 import confirmed; `shuffle` called at line 87, `getSeededPlayers` called at line 331, `createRandomSeed` referenced |
| `groupPersistenceService.js` | `prisma.$transaction` | Prisma atomic transaction | WIRED | Two `prisma.$transaction` calls at lines 347 and 521 (generate and swap respectively) |
| `groupDrawController.js` | `groupPersistenceService.js` | `import generateGroupDraw, swapGroupParticipants` | WIRED | Lines 12-13: imports as `generateGroupDrawService` and `swapGroupParticipantsService`; called at lines 55 and 88 |
| `backend/src/index.js` | `groupDrawRoutes.js` | `app.use('/api/v1/tournaments', groupDrawRoutes)` | WIRED | Line 24: import; Line 151: `app.use('/api/v1/tournaments', groupDrawRoutes)` |
| `GroupDrawGenerationSection.jsx` | `groupDrawService.js` | `import { generateGroupDraw, swapGroupParticipants }` | WIRED | Line 17 import confirmed; both functions called in handler logic |
| `FormatVisualization.jsx` | `GroupDrawGenerationSection.jsx` | `import` + conditional render for GROUP/COMBINED | WIRED | Line 12 import; rendered at lines 82, 208, 220; passes all required props |
| `GroupDrawGenerationSection.jsx` | `/api/v1/tournaments/:id/group-draw` | API call via `groupDrawService.generateGroupDraw` | WIRED | `generateGroupDraw` imported and called; service uses `apiClient.post` to correct endpoint |

### Requirements Coverage

There is no standalone `REQUIREMENTS.md` file in `.planning/`. Requirement IDs are defined within the ROADMAP.md phase section. The plans collectively claim GFORM-01 through GFORM-07.

| Requirement | Source Plans | Coverage |
|-------------|-------------|---------|
| GFORM-01 (group draw configuration: group count, seeded rounds) | 01, 02, 03 | SATISFIED — `generateGroupDrawSchema` validates `groupCount` (int >= 2) and `seededRounds` (int >= 0); frontend State B renders both inputs |
| GFORM-02 (balanced group sizes: no group > 1 player smaller) | 01, 02 | SATISFIED — `validateGroupBalance()` enforces max 1-player size difference; called in `generateGroupDraw` before transaction; 10 unit tests verify |
| GFORM-03 (seeded player distribution via snake draft) | 01, 02, 03 | SATISFIED — `snakeDraft()` implements forward/reverse alternating distribution; frontend seeded rounds input triggers snake placement; unit tested with 6 tests |
| GFORM-04 (snake draft direction alternation) | 01, 02 | SATISFIED — `snakeDraft()` direction verified: round 1 forward (0→groupCount-1), round 2 reverse (groupCount-1→0); unit tested |
| GFORM-05 (random/deterministic fill for unseeded players) | 01, 02 | SATISFIED — `fillUnseeded()` uses `shuffle(array, seed)` from seedingPlacementService (Fisher-Yates with seedrandom); determinism verified in unit tests |
| GFORM-06 (manual player-to-group swap with fixture regeneration) | 02, 03 | SATISFIED — `swapGroupParticipants()` atomically swaps groupId, deletes old matches/rounds, regenerates round-robin; frontend State C swap UI with cross-group enforcement |
| GFORM-07 (doubles tournament: pairId FK, no playerId required) | 01, 02, 03 | SATISFIED — Schema `GroupParticipant.playerId String?` (nullable) + `pairId String?`; service branches on `category.type === 'DOUBLES'`; integration test covers doubles path |

**No orphaned requirements detected.** All GFORM-01 through GFORM-07 are claimed by plans and have verified implementation evidence.

### Anti-Patterns Found

| File | Pattern | Severity | Assessment |
|------|---------|----------|-----------|
| None found | — | — | Scanned `groupPersistenceService.js`, `groupDrawController.js`, `GroupDrawGenerationSection.jsx` for TODO/FIXME/placeholder/return null/Not implemented. No stubs detected. |

Note: The SUMMARY for Plan 02 documents a deviation — `requireAuth`/`requireRole` replaced with `isAuthenticated`/`authorize` — this is a correct fix, not a stub. The actual route file uses the codebase's real auth middleware.

### Human Verification Required

#### 1. GROUP Format Full State Machine Flow

**Test:** As ORGANIZER, navigate to a GROUP format tournament. Verify State A (open registration) shows "Close Registration". Close registration, verify State B shows config form with live group size preview. Enter groupCount=3, verify preview text updates immediately. Generate draw, verify State C shows ExpandableSection per group with GroupStandingsTable.
**Expected:** All 4 states render; group size preview ("3 groups: 2 of 4 players, 1 of 3 players") appears reactively; generated groups display player assignments; swap dropdowns work.
**Why human:** UI state transitions, live reactivity of Form inputs, and visual rendering correctness require browser testing.

#### 2. COMBINED Format Organizer Routing

**Test:** As ORGANIZER, navigate to a COMBINED format tournament in SCHEDULED status. Verify GroupDrawGenerationSection appears (not just CombinedFormatDisplay). Generate draw, verify both GroupDrawGenerationSection (State C) and CombinedFormatDisplay are stacked.
**Expected:** Three-way conditional in FormatVisualization renders correctly for each combination of status/hasGroups/role.
**Why human:** Multi-component stacking and conditional rendering with three branches is visual.

#### 3. Non-Organizer Read-Only View

**Test:** As PLAYER or anonymous, navigate to a GROUP format tournament with a generated draw. Verify GroupStandingsTable is shown (not GroupDrawGenerationSection).
**Expected:** Read-only standings view; no generation controls visible.
**Why human:** Role-based conditional rendering requires login-state browser testing.

### Gaps Summary

No gaps. All automated verification checks passed:
- All 6 primary artifacts exist with substantive content (no stubs)
- All 7 key links confirmed wired (imports + calls verified)
- 34/34 unit tests passing
- 24/24 integration tests passing
- All 7 GFORM requirements have verified implementation evidence
- Schema migration applied; Prisma validates correctly
- No anti-patterns found in key files

Three items flagged for human verification cover visual/interaction quality that grep cannot assess.

---

_Verified: 2026-03-17T14:17:46Z_
_Verifier: Claude (gsd-verifier)_
