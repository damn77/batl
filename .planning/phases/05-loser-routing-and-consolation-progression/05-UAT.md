---
status: diagnosed
phase: 05-loser-routing-and-consolation-progression
source: 05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md
started: 2026-03-03T00:00:00Z
updated: 2026-03-03T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. R1 loser routed to consolation bracket
expected: After submitting a match result for a Round 1 main bracket match in a MATCH_2 tournament, the losing player/pair is automatically placed into the consolation bracket. The consolation match slot is populated with the loser — no manual action required.
result: issue
reported: "Error on match result submission: P2003 Foreign key constraint violated on the constraint: Match_player2Id_fkey — thrown inside advanceBracketSlot at tournamentLifecycleService.js:186 called from matchResultService.js:193"
severity: blocker

### 2. R2+ loser NOT routed to consolation
expected: After submitting a result for a Round 2 (or later) main bracket match, the loser is NOT placed in consolation. Only R1 losers are eligible (R2 losers have already played 2 real matches). Consolation bracket slots remain unchanged.
result: skipped
reason: Blocker from test 1 (FK error in advanceBracketSlot) prevents match result submission for doubles

### 3. Opted-out player skipped by loser routing
expected: If a player has a ConsolationOptOut record for the tournament and then loses their R1 main bracket match, they are NOT placed in the consolation bracket. The consolation slot remains empty (or gets a BYE if applicable).
result: issue
reported: "As player I don't see option to Opt-Out on tournament page"
severity: major

### 4. RETIRED outcome auto-opts player out of consolation
expected: Submitting a RETIRED special outcome for a player in a MATCH_2 tournament automatically creates a ConsolationOptOut record for the retired player (recordedBy='AUTO'). The retired player does NOT appear in the consolation bracket.
result: issue
reported: "Retired option is not available when submitting special results"
severity: major

### 5. Player self opt-out via API
expected: A PLAYER can POST to /api/v1/tournaments/:id/consolation-opt-out with their own playerId (or pairId for doubles). Response is 201 with the created ConsolationOptOut record. Subsequent loser routing skips them.
result: skipped
reason: API-only test — should be covered by automated integration tests, not manual UI testing

### 6. Organizer opt-out via API
expected: An ORGANIZER (or ADMIN) can POST to /api/v1/tournaments/:id/consolation-opt-out with any playerId or pairId. Response is 201. The player/pair is excluded from consolation routing thereafter.
result: skipped
reason: API-only test — should be covered by automated integration tests, not manual UI testing

### 7. Duplicate opt-out blocked
expected: If a player/pair already has a ConsolationOptOut record for the tournament, a second POST to the opt-out endpoint returns 409 with error code ALREADY_OPTED_OUT.
result: skipped
reason: API-only test — should be covered by automated integration tests, not manual UI testing

### 8. Tournament completion waits for all brackets
expected: A MATCH_2 tournament's status does NOT change to COMPLETED when only the main bracket finishes. The tournament remains open until all consolation bracket matches are also in a terminal state (COMPLETED or CANCELLED). Once all brackets are done, the tournament completes normally.
result: skipped
reason: Requires match result submission which is blocked by the FK error in test 1

## Summary

total: 8
passed: 0
issues: 3
pending: 0
skipped: 5

## Gaps

- truth: "Submitting a match result for a R1 main bracket match places the loser in the consolation bracket without error"
  status: failed
  reason: "User reported: Error on match result submission: P2003 Foreign key constraint violated on the constraint: Match_player2Id_fkey — thrown inside advanceBracketSlot at tournamentLifecycleService.js:186 called from matchResultService.js:193"
  severity: blocker
  test: 1
  root_cause: "Phase 5.2 BREAK 1 fix correctly sets winnerId=pairId for doubles, but advanceBracketSlot unconditionally writes winnerId into player1Id/player2Id (PlayerProfile FKs). For doubles the fix must branch on winnerPairId: if set, write only to pair1Id/pair2Id; if null, write winnerId to player1Id/player2Id (singles path)."
  artifacts:
    - path: "backend/src/services/tournamentLifecycleService.js"
      issue: "Lines 166-169: updateData always sets player1Id/player2Id = winnerId, even when winnerId is a pairId"
  missing:
    - "Branch updateData construction on winnerPairId truthiness so pair slots and player slots are mutually exclusive"
  debug_session: ""

- truth: "RETIRED is available as an option when submitting a special match outcome"
  status: failed
  reason: "User reported: Retired option is not available when submitting special results"
  severity: major
  test: 4
  root_cause: "MatchResultModal.jsx special outcome <Form.Select> only lists WALKOVER, FORFEIT, NO_SHOW — RETIRED was added to the backend validator (matchValidator.js line 64) but never added to the frontend dropdown options."
  artifacts:
    - path: "frontend/src/components/MatchResultModal.jsx"
      issue: "Lines 299-303: <option> elements do not include RETIRED"
  missing:
    - "Add <option value='RETIRED'>Retired (RET)</option> to the special outcome select"
    - "Add optional partialScore fields (player1Games, player2Games) shown when RETIRED is selected"
  debug_session: ""

- truth: "Players can opt out of consolation from the tournament page"
  status: failed
  reason: "User reported: As player I don't see option to Opt-Out on tournament page"
  severity: major
  test: 3
  root_cause: "POST /api/v1/tournaments/:id/consolation-opt-out is fully implemented (consolationOptOutController + tournamentRoutes) but no frontend component calls it. TournamentViewPage has no ConsolationOptOut UI for players or organizers."
  artifacts:
    - path: "frontend/src/pages/TournamentViewPage.jsx"
      issue: "No ConsolationOptOutPanel rendered for MATCH_2 tournaments"
  missing:
    - "Create frontend/src/components/ConsolationOptOutPanel.jsx — player self-opt-out button + organizer per-player opt-out list"
    - "Mount ConsolationOptOutPanel in TournamentViewPage when formatConfig.matchGuarantee === 'MATCH_2'"
  debug_session: ""
