---
phase: 31-points-integration-and-group-only-format
verified: 2026-03-29T00:00:00Z
status: passed
score: 11/11 must-haves verified
gaps: []
human_verification:
  - test: "Advancement badges appear in COMBINED tournament standings after all group matches complete"
    expected: "Blue 'Main' badge next to players in positions 1 to advancePerGroup; grey 'Secondary' badge for secondary advancement positions; no badges while any group match is still pending"
    why_human: "useMemo badge computation depends on live SWR data and runtime match terminal state; cannot be asserted by grep or build check alone"
  - test: "GROUP-only tournament TournamentPointConfigPage shows no advancement badges anywhere"
    expected: "No 'Main' or 'Secondary' badge visible in any group standings row for a GROUP-only tournament"
    why_human: "Absence of badges requires runtime rendering check — FormatVisualization GROUP path confirmed to omit advancementConfig prop in code, but visual confirmation needed"
  - test: "Calculate Points button disabled state when groups have unresolved ties"
    expected: "Button is greyed out with OverlayTrigger tooltip 'Resolve all group tiebreakers first'; danger alert lists affected group names"
    why_human: "Requires a COMPLETED GROUP/COMBINED tournament with a real unresolved tie condition in a running app"
---

# Phase 31: Points Integration and Group-Only Format Verification Report

**Phase Goal:** Group placement points for non-advancing players, knockout supersede for advancing, GROUP-only tournament end-to-end
**Verified:** 2026-03-29
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Non-advancing COMBINED player receives group placement points using group.groupSize as participant count | VERIFIED | `awardGroupPointsSingles` uses `group.groupSize` as `participantCount` (line 781 of pointCalculationService.js); integration test line 333 asserts base group points use groupSize |
| 2 | Advancing COMBINED player receives knockout points only with offset guaranteeing main > secondary > group | VERIFIED | `computeTierOffsets` formula: `secondaryOffset = maxGroupPoints+1`, `mainOffset = maxSecondaryPoints+1`; integration test at line 306 asserts `pointsAwarded > maxGroupPoints (8)` for advancing player |
| 3 | GROUP-only tournament calculate-points auto-derives results from group standings | VERIFIED | `tournamentRoutes.js` line 331: `if (formatType === 'GROUP')` branch calls `awardGroupFn` with `deriveGroupResults` output; no `results` body required |
| 4 | Calculate-points returns UNRESOLVED_TIES error when any group has unresolved ties | VERIFIED | `deriveGroupResults` throws `err.code = 'UNRESOLVED_TIES'` (pointCalculationService.js line 687); route returns HTTP 400 with `code: 'UNRESOLVED_TIES'` (tournamentRoutes.js line 318-326); integration test line 175 asserts this |
| 5 | Singles and doubles both produce correct TournamentResult records from group standings | VERIFIED | `awardGroupPointsSingles` and `awardGroupPointsDoubles` both exported and wired; integration test describes doubles flow; 22 unit tests cover both paths |
| 6 | GROUP-only tournament auto-completes when all group matches are terminal | VERIFIED | Integration test line 391 directly tests `checkAndCompleteTournament` with GROUP format mock; confirms no code change needed in `tournamentLifecycleService.js` |
| 7 | Advancement badges appear next to player names in group standings when all group matches complete | VERIFIED (code) / HUMAN (runtime) | `GroupStandingsTable.jsx` line 214-219: `Badge bg="primary"` and `Badge bg="secondary"` rendered from `advancementMap`; `useMemo` at line 64 guards on match terminal state |
| 8 | Main bracket advancement shows blue 'Main' badge, secondary shows grey 'Secondary' badge | VERIFIED (code) | `Badge bg="primary"` text "Main" and `Badge bg="secondary"` text "Secondary" at `fontSize: '10px'` confirmed in GroupStandingsTable.jsx |
| 9 | GROUP-only tournament shows no advancement badges | VERIFIED | `FormatVisualization.jsx` GROUP path at lines 139-146 passes no `advancementConfig` prop; prop defaults to null in GroupStandingsTable; no badges rendered |
| 10 | Calculate Points button appears on TournamentPointConfigPage for GROUP and COMBINED tournaments | VERIFIED | `TournamentPointConfigPage.jsx` line 175: card shown when `tournament.status === 'COMPLETED'` and formatType is GROUP/COMBINED; `handleCalculatePoints` calls `calculateTournamentPoints(id, null)` |
| 11 | Calculate Points button is disabled with danger alert when groups have unresolved ties | VERIFIED (code) / HUMAN (runtime) | Lines 192-221: `unresolvedGroups.length > 0` disables button, renders danger Alert, shows OverlayTrigger tooltip "Resolve all group tiebreakers first" |

**Score:** 11/11 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/services/pointCalculationService.js` | deriveGroupResults, computeTierOffsets, awardGroupPointsSingles, awardGroupPointsDoubles, deriveKnockoutResults, exported updateRankingEntry, exported recalculateRanks, import getGroupStandings | VERIFIED | All 7 exports confirmed at lines 447, 619, 660, 717, 749, 842, 998; import at line 11 |
| `backend/src/api/routes/tournamentRoutes.js` | GROUP/COMBINED auto-derive branch with formatType checks | VERIFIED | Lines 279-283 import all new functions; lines 309-331 branch on `formatType === 'GROUP'` and `'COMBINED'`; UNRESOLVED_TIES handled at line 318 |
| `backend/__tests__/unit/groupPointCalculation.test.js` | Unit tests for computeTierOffsets, deriveGroupResults, awardGroupPointsSingles, deriveKnockoutResults, UNRESOLVED_TIES | VERIFIED | File exists; contains all required test subjects; 22 tests, all PASSING |
| `backend/__tests__/integration/groupCalculatePoints.test.js` | Integration tests for GROUP/COMBINED calculate-points, UNRESOLVED_TIES blocking, PTS-02 offset verification, D-08 auto-completion | VERIFIED | File exists; 17 integration tests; PTS-02 assertion at line 333; D-08 lifecycle test at line 391; all 39 total tests PASSING |
| `frontend/src/components/GroupStandingsTable.jsx` | advancementConfig prop, advancementMap useMemo, Main/Secondary badge rendering | VERIFIED | advancementConfig prop at line 34; useMemo at line 64; badges at lines 214-219 |
| `frontend/src/components/FormatVisualization.jsx` | GROUP path passes no advancementConfig | VERIFIED | GroupStandingsTable rendered at lines 139-146 without advancementConfig prop |
| `frontend/src/components/CombinedFormatDisplay.jsx` | advancementConfig computed from tournament.formatConfig | VERIFIED | advancePerGroup at line 55, advancePerGroupSecondary at line 56, advancementConfig passed at line 178 |
| `frontend/src/pages/TournamentPointConfigPage.jsx` | Calculate Points card, handleCalculatePoints, unresolvedGroups guard | VERIFIED | calculateTournamentPoints imported at line 11; unresolvedGroups state at line 36; card at line 175; handler at line 103; all required content confirmed |
| `frontend/src/services/tournamentService.js` | calculateTournamentPoints handles null results | VERIFIED | Line 122: `results = null` default; line 123: `const body = results ? { results } : {}` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `tournamentRoutes.js` | `pointCalculationService.js` | dynamic import of deriveGroupResults, deriveKnockoutResults, awardGroupPoints*, computeTierOffsets | WIRED | Lines 279-284 import all 5 new functions |
| `pointCalculationService.js` | `groupStandingsService.js` | `import { getGroupStandings }` at line 11 | WIRED | Called at line 680 inside `deriveGroupResults` |
| `pointCalculationService.js` | `prisma.match` | `prisma.match.findMany` in `deriveKnockoutResults` | WIRED | Line 998+ function confirmed exported and uses prisma |
| `CombinedFormatDisplay.jsx` | `GroupStandingsTable.jsx` | `advancementConfig=` prop at line 178 | WIRED | Prop passes parsed formatConfig advancement thresholds |
| `TournamentPointConfigPage.jsx` | `tournamentService.js` | `calculateTournamentPoints` called with null at line 112 | WIRED | Import confirmed at line 11; handler calls with `null` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `GroupStandingsTable.jsx` | `advancementMap` | `standings` from `useGroupStandings` SWR hook + `advancementConfig` prop from parent | Yes — SWR hook fetches from real `/v1/group-standings` API | FLOWING |
| `TournamentPointConfigPage.jsx` | `unresolvedGroups` | `apiClient.get` to format-structure + standings endpoints in `loadData` | Yes — fetches live standings data on page load | FLOWING |
| `pointCalculationService.js` `deriveGroupResults` | `groupResults` | `prisma.group.findMany` + `getGroupStandings(group.id)` per group | Yes — real DB query + standings service | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| groupPointCalculation unit tests (22 tests) | `node --experimental-vm-modules ./node_modules/jest-cli/bin/jest.js --testPathPatterns="groupPointCalculation" --no-coverage` | PASS: 22/22 | PASS |
| groupCalculatePoints integration tests (17 tests) | `node --experimental-vm-modules ./node_modules/jest-cli/bin/jest.js --testPathPatterns="groupCalculatePoints" --no-coverage` | PASS: 17/17 | PASS |
| Total phase 31 test suite | Both patterns combined | PASS: 39/39 tests in 2 suites | PASS |
| Frontend build | `cd frontend && npx vite build` | Exit 0; 1 pre-existing chunk-size warning, 0 errors | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PTS-01 | 31-01-PLAN.md | Non-advancing players receive ranking points based on their final group placement | SATISFIED | `awardGroupPointsSingles/Doubles` use `group.groupSize` as participant count, not total registrations (line 781 pointCalculationService.js); GROUP format route branch awards these with offset=0 |
| PTS-02 | 31-01-PLAN.md | Advancing players receive ranking points based on their knockout bracket result (superseding group placement points) | SATISFIED | `computeTierOffsets` ensures mainOffset > secondaryOffset > 0; `deriveKnockoutResults` auto-derives from bracket matches; integration test asserts `pointsAwarded > maxGroupPoints` |
| PTS-03 | 31-01-PLAN.md, 31-02-PLAN.md | Group-only tournaments (no knockout) award points based on final group placement | SATISFIED | Backend: GROUP branch in calculate-points route; Frontend: Calculate Points button on TournamentPointConfigPage calls backend with null body |
| PTS-04 | 31-01-PLAN.md | Points calculation works correctly for both singles and doubles tournaments | SATISFIED | Both `awardGroupPointsSingles` and `awardGroupPointsDoubles` exported and wired; doubles path creates PAIR + individual MEN/WOMEN ranking entries |
| GVIEW-05 | 31-02-PLAN.md | Advancement status is visible on group standings (which players have advanced to knockout) | SATISFIED (code) / HUMAN (runtime) | GroupStandingsTable renders Main/Secondary badges from advancementMap; CombinedFormatDisplay passes advancementConfig from formatConfig; GROUP-only path confirmed badge-free |

**All 5 requirements claimed by phase 31 plans are accounted for and satisfied.**

No orphaned requirements: REQUIREMENTS.md traceability table maps PTS-01, PTS-02, PTS-03, PTS-04, GVIEW-05 exclusively to Phase 31 — all covered.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

Scan of all 8 modified files: no TODO/FIXME, no `return null` stubs, no hardcoded empty data arrays flowing to render output, no form handlers that only call `preventDefault`. The integration tests mock services at the module level (jest.unstable_mockModule) — this is the established project test pattern, not a stub indicator.

---

### Human Verification Required

#### 1. Advancement Badges — COMBINED Tournament

**Test:** Open a COMBINED tournament where all group matches have been submitted as COMPLETED. View the Group Standings section.
**Expected:** Players in positions 1 through `advancePerGroup` show a blue "Main" badge inline after their name. Players in positions `advancePerGroup+1` through `advancePerGroup + advancePerGroupSecondary` show a grey "Secondary" badge. Players beyond those thresholds show no badge. While any group match is still pending, no badges appear.
**Why human:** The `advancementMap` useMemo depends on live SWR data and the terminal state of matches at runtime. The code logic is confirmed correct by code review but visual rendering requires a running app.

#### 2. No Badges on GROUP-Only Tournament

**Test:** Open a GROUP-only tournament (formatType = GROUP) and view the standings.
**Expected:** No advancement badges appear for any player in any group standings row.
**Why human:** Absence of prop confirmed in code (FormatVisualization GROUP path), but visual absence requires a running app to confirm nothing sneaks through.

#### 3. Calculate Points Button — Unresolved Ties Blocked State

**Test:** Open TournamentPointConfigPage for a COMPLETED GROUP or COMBINED tournament that has at least one group with an unresolved tie (two players share the same position without a manual override).
**Expected:** A danger alert lists the affected group names with instructions to resolve ties. The Calculate Points button is disabled and greyed out. Hovering the button shows tooltip "Resolve all group tiebreakers first".
**Why human:** Requires a running app with real tournament data containing an unresolved tie condition.

---

### Gaps Summary

No gaps. All 11 observable truths are verified at code level. All 5 phase requirements (PTS-01, PTS-02, PTS-03, PTS-04, GVIEW-05) are satisfied by substantive, wired implementations. All 39 new tests pass. Frontend build succeeds. Three items are routed to human verification because they require runtime browser confirmation of dynamic rendering behavior — this is expected for frontend visual features and does not block phase sign-off.

---

_Verified: 2026-03-29_
_Verifier: Claude (gsd-verifier)_
