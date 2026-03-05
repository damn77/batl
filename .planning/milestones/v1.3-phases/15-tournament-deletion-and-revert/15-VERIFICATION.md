---
phase: 15-tournament-deletion-and-revert
verified: 2026-03-04T19:00:00Z
status: human_needed
score: 13/14 must-haves verified
re_verification: false
human_verification:
  - test: "REVERT-04 requirements conflict — confirm acceptance"
    expected: "Stakeholder confirms REVERT-04 is satisfied by DEL-05 (COMPLETED tournaments can only be deleted, not reverted; deletion triggers ranking recalculation)"
    why_human: "REQUIREMENTS.md marks REVERT-04 Complete but its literal text ('Reverting a completed tournament triggers ranking recalculation') cannot be satisfied because revertTournament() rejects COMPLETED with 409. The user decided COMPLETED is non-revertible (locked decision in RESEARCH.md). The practical effect is achieved via DEL-05. This is a requirements definition conflict, not a code bug — needs stakeholder sign-off."
  - test: "Delete flow end-to-end (SCHEDULED tournament)"
    expected: "Three-dot menu shows 'Delete Tournament', clicking opens modal with tournament name, SCHEDULED badge, registered player count; confirming calls DELETE /api/v1/tournaments/:id, shows success toast, tournament disappears from list"
    why_human: "UI rendering and toast interaction cannot be verified programmatically"
  - test: "Delete flow danger warning (IN_PROGRESS/COMPLETED tournament)"
    expected: "Delete confirmation modal shows red Bootstrap Alert with status-appropriate warning text for IN_PROGRESS and COMPLETED tournaments"
    why_human: "Conditional Alert rendering requires visual inspection"
  - test: "Revert dropdown visibility (SCHEDULED without draw)"
    expected: "'Revert to Scheduled' does NOT appear in three-dot dropdown for SCHEDULED tournaments where registrationClosed is false"
    why_human: "Conditional rendering requires UI inspection"
  - test: "Revert flow end-to-end (IN_PROGRESS tournament)"
    expected: "Three-dot menu shows 'Revert to Scheduled', clicking opens confirmation modal explaining draw deletion and registration reopening; confirming calls POST /api/v1/tournaments/:id/revert, shows success toast, tournament status changes to SCHEDULED"
    why_human: "Full flow requires running the app with real data"
  - test: "Revert button on detail page (BracketGenerationSection)"
    expected: "'Revert to Scheduled' button appears near bracket area for SCHEDULED+draw and IN_PROGRESS tournaments; IN_PROGRESS shows revert-only card; clicking opens confirmation modal; confirming refreshes page state"
    why_human: "Component rendering with bracket structure data requires live app inspection"
---

# Phase 15: Tournament Deletion and Revert Verification Report

**Phase Goal:** Cascading tournament deletion with confirmation dialog and revert-to-scheduled with draw erasure and registration unlock; both trigger ranking recalculation when applicable
**Verified:** 2026-03-04T19:00:00Z
**Status:** human_needed — all automated checks pass; 5 UI behaviors + 1 requirements conflict need human confirmation
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | DELETE /api/v1/tournaments/:id succeeds for any status | VERIFIED | `deleteTournament()` in tournamentService.js:1126 has no status guard; 404 is only rejection |
| 2 | Deleting a COMPLETED tournament removes TournamentResults and triggers recalculateRankings | VERIFIED | tournamentService.js:1138-1163 — collects categoryIds, deletes TournamentResult, calls `recalculateRankings(categoryId)` per category |
| 3 | POST /api/v1/tournaments/:id/revert reverts SCHEDULED-with-draw or IN_PROGRESS to SCHEDULED | VERIFIED | Route registered at tournamentRoutes.js:136-141, controller at tournamentController.js:376, service at tournamentService.js:1176 |
| 4 | Revert deletes bracket, rounds, matches and sets registrationClosed to false | VERIFIED | tournamentService.js:1210-1218 — tx.match.deleteMany, tx.round.deleteMany, tx.bracket.deleteMany, tx.tournament.update with status+registrationClosed |
| 5 | Revert rejects COMPLETED and CANCELLED with 409 | VERIFIED | tournamentService.js:1187-1197 — throws 409 REVERT_NOT_ALLOWED for both statuses |
| 6 | Organizer role can delete tournaments | VERIFIED | authorize.js:21 — ORGANIZER has `can(['create', 'read', 'update', 'delete'], 'Tournament')`; no `cannot('delete')` override present |
| 7 | Delete action in three-dot dropdown for every tournament | ? NEEDS HUMAN | Code: TournamentSetupPage.jsx:467 — `<Dropdown.Item className="text-danger" onClick={() => handleDeleteClick(tournament)}>Delete Tournament</Dropdown.Item>` always rendered; visual confirmation needed |
| 8 | Delete confirmation modal shows name, status badge, and registered player count | ? NEEDS HUMAN | Code: TournamentSetupPage.jsx:770-800 — Modal with pendingDeleteTournament?.name, Badge with STATUS_VARIANTS, registeredCount; visual confirmation needed |
| 9 | IN_PROGRESS and COMPLETED show red danger Alert in delete modal | ? NEEDS HUMAN | Code: TournamentSetupPage.jsx:782-790 — conditional `<Alert variant="danger">` for IN_PROGRESS/COMPLETED; visual confirmation needed |
| 10 | Confirming deletion calls API, shows toast, tournament disappears | ? NEEDS HUMAN | Code: TournamentSetupPage.jsx:285-298 — `await deleteTournament(id)`, `showSuccess(...)`, `loadTournaments()`; requires live test |
| 11 | Revert action in three-dot dropdown only when applicable | ? NEEDS HUMAN | Code: TournamentSetupPage.jsx:460-465 — conditional on `(status === 'IN_PROGRESS') \|\| (status === 'SCHEDULED' && registrationClosed)`; visual test needed |
| 12 | Revert action on detail page (BracketGenerationSection) | ? NEEDS HUMAN | Code: BracketGenerationSection.jsx:197-243, 485-494 — showRevertOnly path and SCHEDULED+bracket path; requires live inspection |
| 13 | Revert confirmation modal explains draw deletion and registration reopening | ? NEEDS HUMAN | Code: TournamentSetupPage.jsx:803-824 and BracketGenerationSection.jsx:720-742 — bullet list present in both modals; visual confirmation needed |
| 14 | REVERT-04: Reverting a completed tournament triggers ranking recalculation | CONFLICT | REVERT-04 requirement text cannot be satisfied — COMPLETED is non-revertible by design (see Requirements Conflict section) |

**Score:** 6 automated truths verified, 7 needs human confirmation, 1 requirements conflict

---

## Required Artifacts

### Plan 01 — Backend

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/services/tournamentService.js` | Expanded deleteTournament + new revertTournament | VERIFIED | Lines 1126-1221: both functions present, substantive, correct logic |
| `backend/src/api/tournamentController.js` | revertTournament controller handler | VERIFIED | Lines 376-387: revertTournament exported, calls service, returns 200 |
| `backend/src/api/routes/tournamentRoutes.js` | POST /:id/revert route | VERIFIED | Lines 136-141: `router.post('/:id/revert', isAuthenticated, authorize('update', 'Tournament'), revertTournament)` |
| `backend/src/middleware/authorize.js` | ORGANIZER delete permission granted | VERIFIED | Line 21: `can(['create', 'read', 'update', 'delete'], 'Tournament')` — no cannot override |

### Plan 02 — Frontend

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/pages/TournamentSetupPage.jsx` | Delete + Revert dropdown items, confirmation modals, handlers | VERIFIED | Lines 280-318 (handlers), 459-469 (dropdown), 770-824 (modals) |
| `frontend/src/services/tournamentService.js` | revertTournament API function | VERIFIED | Line 152: `export const revertTournament = async (id) => { const response = await apiClient.post(\`/v1/tournaments/${id}/revert\`) ... }` |
| `frontend/src/components/BracketGenerationSection.jsx` | Revert to Scheduled button | VERIFIED | Lines 162-177 (handler), 197-243 (IN_PROGRESS revert-only card), 485-494 (SCHEDULED+draw button) |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `backend/src/services/tournamentService.js` | `rankingService.recalculateRankings` | import + call after TournamentResult deletion | WIRED | Line 11: `import { recalculateRankings } from './rankingService.js'`; Line 1162: `await recalculateRankings(categoryId)` inside COMPLETED block |
| `backend/src/api/routes/tournamentRoutes.js` | `backend/src/api/tournamentController.js` | route registration | WIRED | Line 11: `revertTournament` imported; Line 140: `revertTournament` used as route handler |
| `frontend/src/pages/TournamentSetupPage.jsx` | `frontend/src/services/tournamentService.js` | deleteTournament + revertTournament imports | WIRED | Lines 13-14: both functions imported; Lines 288, 308: both called in handlers |
| `frontend/src/components/BracketGenerationSection.jsx` | `frontend/src/services/tournamentViewService.js` | revertTournament call | WIRED | Line 18: `import { revertTournament } from '../services/tournamentViewService'`; Line 166: `await revertTournament(tournament.id)` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| DEL-01 | 15-01, 15-02 | Organizer can delete a tournament | SATISFIED | ORGANIZER has delete permission in authorize.js:21; DELETE endpoint accepts any status; UI dropdown item present |
| DEL-02 | 15-01 | Deleting cascades to registrations, draw, and match results | SATISFIED | Prisma Cascade handles children automatically; TournamentResults explicitly deleted before ranking recalc (tournamentService.js:1158) |
| DEL-03 | 15-02 | User sees confirmation dialog with tournament details | NEEDS HUMAN | Code present: Modal at TournamentSetupPage.jsx:770 with name, Badge, registeredCount |
| DEL-04 | 15-02 | Warning banner for in-progress or completed | NEEDS HUMAN | Code present: conditional `<Alert variant="danger">` at TournamentSetupPage.jsx:782-790 |
| DEL-05 | 15-01 | Deleting a completed tournament triggers ranking recalculation | SATISFIED | tournamentService.js:1138-1163 — collects categoryIds, deletes results, calls recalculateRankings |
| REVERT-01 | 15-01, 15-02 | Organizer can revert from IN_PROGRESS or SCHEDULED-with-draw to SCHEDULED | SATISFIED (API); NEEDS HUMAN (UI) | POST /api/v1/tournaments/:id/revert exists with ORGANIZER access; UI dropdown + detail page button present |
| REVERT-02 | 15-01 | Reverting deletes the tournament draw | SATISFIED | tournamentService.js:1211-1213 — match, round, bracket deleteMany in transaction |
| REVERT-03 | 15-01 | Reverting unlocks player registration | SATISFIED | tournamentService.js:1216 — `data: { status: 'SCHEDULED', registrationClosed: false }` |
| REVERT-04 | 15-01 | Reverting a completed tournament triggers ranking recalculation | CONFLICT | See Requirements Conflict section below |

---

## Requirements Conflict: REVERT-04

**REVERT-04 text:** "Reverting a completed tournament triggers ranking recalculation for affected categories"

**What the code does:** `revertTournament()` rejects COMPLETED tournaments with HTTP 409 `REVERT_NOT_ALLOWED`: "Completed tournaments can only be deleted, not reverted" (tournamentService.js:1187-1190).

**Why this happened:** The RESEARCH.md documents a locked user decision: "Revert available from SCHEDULED (if draw exists or registration closed) and IN_PROGRESS — NOT from COMPLETED (completed is final, can only be deleted)." The RESEARCH.md also explicitly notes: "REVERT-04 | Not applicable — COMPLETED is non-revertible per locked decisions."

**Practical effect:** The user intent behind REVERT-04 is fully satisfied by DEL-05 — deleting a COMPLETED tournament always removes TournamentResults and calls recalculateRankings. The revert path simply does not apply to COMPLETED tournaments.

**REQUIREMENTS.md status:** Marked as "Complete" which is technically inaccurate for the literal requirement text but accurate for user intent.

**Verdict:** This is a requirements definition conflict accepted during planning. No code change is needed. Human confirmation is requested to formally close this discrepancy.

---

## Anti-Patterns Found

No anti-patterns detected in the Phase 15 modified files:

- No TODO/FIXME/PLACEHOLDER comments in implementation code
- No stub return values (empty arrays, nulls without logic)
- No console.log-only handlers
- Error handling follows BATL pattern throughout (`err.message || 'fallback'`, not raw axios pattern)
- No empty catch blocks

One pre-existing issue noted in both summaries: `backend/__tests__/unit/bracketPersistenceService.test.js` has a failing test for BYE swap behavior — this is **out of scope** for Phase 15 (pre-existing, caused by uncommitted changes to bracketPersistenceService.js from an unrelated phase).

---

## Human Verification Required

### 1. REVERT-04 Requirements Conflict Sign-Off

**Test:** Review REVERT-04 definition and the design decision that COMPLETED tournaments cannot be reverted
**Expected:** Stakeholder confirms that REVERT-04 is satisfied by DEL-05 (deleting a COMPLETED tournament always triggers ranking recalculation), and that REQUIREMENTS.md should be annotated to reflect the design constraint
**Why human:** This is a requirements vs. design conflict that was consciously accepted during planning; needs formal stakeholder acknowledgment to close

### 2. Delete Flow — SCHEDULED Tournament

**Test:** Start app, log in as ORGANIZER, open tournament list, click three-dot menu on a SCHEDULED tournament, click "Delete Tournament"
**Expected:** Modal appears with tournament name in bold, SCHEDULED badge in primary/blue color, registered player count; no red Alert banner; clicking Delete calls API, shows success toast, tournament disappears from list
**Why human:** Modal rendering, badge color, and toast behavior cannot be verified programmatically

### 3. Delete Danger Warning — IN_PROGRESS/COMPLETED Tournament

**Test:** Open three-dot menu on an IN_PROGRESS tournament, click "Delete Tournament"
**Expected:** Modal shows red Bootstrap Alert with heading "Warning" and text about matches in progress; repeat for COMPLETED showing text about ranking recalculation
**Why human:** Conditional Alert rendering requires visual inspection

### 4. Revert Dropdown Visibility

**Test:** Check three-dot dropdown for: (a) SCHEDULED tournament with registrationClosed=false — "Revert to Scheduled" should NOT appear; (b) SCHEDULED tournament with registrationClosed=true — should appear; (c) IN_PROGRESS tournament — should appear; (d) COMPLETED tournament — should NOT appear
**Expected:** Revert item appears only in cases (b) and (c)
**Why human:** Conditional rendering requires live app with varied data

### 5. Revert Flow End-to-End

**Test:** Click "Revert to Scheduled" on an IN_PROGRESS tournament from dropdown; confirm modal; verify result
**Expected:** Confirmation modal explains draw deletion and registration reopening (bullet list); confirming shows success toast, tournament changes to SCHEDULED status in the list, registration reopens
**Why human:** Full flow requires running app with real tournament data

### 6. Revert Button on Tournament Detail Page

**Test:** Navigate to detail page of an IN_PROGRESS tournament with a bracket
**Expected:** Page shows revert-only card (no draw editing controls, only "Revert to Scheduled" button); clicking button opens confirmation modal; confirming triggers API call and page refreshes to SCHEDULED state with draw removed
**Why human:** BracketGenerationSection rendering path for showRevertOnly requires live app with bracket data

---

## Commits Verified

| Commit | Description | Files |
|--------|-------------|-------|
| `642ac52` | Expand deleteTournament + add revertTournament service | tournamentService.js, authorize.js |
| `5b0cc25` | Add revertTournament controller + POST /:id/revert route | tournamentController.js, tournamentRoutes.js |
| `ed3a271` | Add delete/revert to TournamentSetupPage | TournamentSetupPage.jsx, tournamentService.js (frontend) |
| `cc11c8b` | Add Revert button on BracketGenerationSection | BracketGenerationSection.jsx, tournamentViewService.js |

All 4 commits confirmed present in git log on branch `015-manual-draw-and-QoL-changes`.

---

## Summary

Phase 15 goal is substantially achieved. The core backend logic is correct and complete:

- `deleteTournament()` accepts any status, correctly handles COMPLETED ranking cleanup before deletion
- `revertTournament()` deletes draw cascade in the right FK order, resets status and registrationClosed in a single transaction
- ORGANIZER permission is properly granted via CASL
- All four service/controller/route/auth artifacts exist, are substantive, and are correctly wired

The frontend artifacts are also present and wired:
- Delete and Revert dropdown items in TournamentSetupPage with conditional visibility
- Both confirmation modals with correct content (name, badge, player count, danger Alert, consequences bullet list)
- BracketGenerationSection revert-only card for IN_PROGRESS + bracket case
- Error handling follows the BATL pattern throughout

The only outstanding item is the REVERT-04 requirements conflict (COMPLETED tournaments cannot be reverted by design — this was a locked user decision) which needs stakeholder acknowledgment. All other gaps are UI behaviors that require human testing in a live app session.

---

_Verified: 2026-03-04T19:00:00Z_
_Verifier: Claude (gsd-verifier)_
