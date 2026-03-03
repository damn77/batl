# Phase 8: Consolation Bug Fixes - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix two runtime bugs that break E2E flows: (1) consolation point calculation case mismatch in `deriveConsolationResults()` and (2) doubles player self-service opt-out sending wrong entity key in `ConsolationOptOutPanel`. Both are targeted fixes mirroring correct patterns already in the codebase.

</domain>

<decisions>
## Implementation Decisions

### PTS-01: Case mismatch fix
- `deriveConsolationResults()` in `pointCalculationService.js` compares `resultJson.winner === 'player1'` (lowercase) but the stored value is `'PLAYER1'` (uppercase)
- Fix: change `'player1'` to `'PLAYER1'` and `'player2'` to `'PLAYER2'` on lines 589 and 591
- Every other winner comparison in the codebase uses uppercase (matchResultService, tournamentService, playerService, consolationEligibilityService)
- Existing unit tests in `consolationPoints.test.js` already use uppercase in mock data — they should pass after the fix

### LIFE-05: Doubles entity key fix
- `ConsolationOptOutPanel` player mode handler unconditionally sends `{ playerId: user.playerId }` on line 52
- For doubles tournaments, should send `{ pairId: <uuid> }` instead — mirror the organizer mode pattern (lines 72-74) which correctly detects doubles vs singles
- The component already receives `tournament` prop with category type info for detection
- Player's pairId needs to be resolved from registrations or tournament context (same data path organizer mode uses)

### Claude's Discretion
- How exactly to resolve the player's pairId in self-service mode (lookup approach)
- Whether to add targeted regression tests beyond fixing the existing ones
- Any minor refactoring to prevent similar case mismatches in future

</decisions>

<specifics>
## Specific Ideas

No specific requirements — both fixes follow existing correct patterns already in the codebase.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `pointCalculationService.js` `deriveConsolationResults()` (lines 528-613): Function with the case mismatch bug
- `ConsolationOptOutPanel.jsx` (lines 46-67): Player mode handler with the entity key bug
- Organizer mode handler (lines 70-97): Correct doubles/singles detection pattern to mirror

### Established Patterns
- Winner comparison: `resultJson.winner === 'PLAYER1'` (uppercase) — used in matchResultService, tournamentService, playerService, consolationEligibilityService
- Doubles/singles entity detection: `pair1Id ?? player1Id` nullish coalescing (Phase 5.2 decision)
- Organizer opt-out body: `reg.pair ? { pairId: reg.pair.id } : { playerId: reg.player.id }` — exact pattern to replicate

### Integration Points
- `pointCalculationService.js` line 589, 591 — case mismatch fix
- `ConsolationOptOutPanel.jsx` line 52 — entity key fix
- `consolationPoints.test.js` — existing tests should validate the PTS-01 fix

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-consolation-bug-fixes*
*Context gathered: 2026-03-03*
