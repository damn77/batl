# Phase 2: Tournament Lifecycle and Bracket Progression - Research

**Researched:** 2026-02-27
**Domain:** Tournament state machine, knockout bracket slot propagation, Express/Prisma/React/SWR
**Confidence:** HIGH (all findings drawn from existing codebase — no external dependencies introduced)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Bracket Progression Trigger**
- Any result submission — by a player OR organizer — updates the next-round bracket slot immediately
- NOTE: This overrides the pre-Phase 1 decision of "organizer confirmation only." Bracket is now live/optimistic.
- Both players and organizers can resubmit/update results; the bracket slot recalculates on each update
- Disputed/wrong results: organizer uses the existing MatchResultModal override to correct, which re-propagates the correct winner

**Bracket Slot Display**
- Empty next-round slots show "TBD" placeholder before any winner is placed
- Auto-refresh in place via SWR mutate — bracket updates without page reload when a result is saved (same behavior as Phase 1 result submission)

**Tournament Completion Trigger**
- Tournament status transitions to COMPLETED only when an **organizer** saves the result for the final match
- Player submissions on the final match advance the bracket slot but do NOT complete the tournament — organizer must confirm the final
- This creates a split: bracket progression = any submission; tournament COMPLETED = organizer-confirmed final

**Completed Tournament UI**
- Champion banner displayed at the top of the tournament page showing the winner's name
- Bracket becomes read-only for players (no modal opens on click)
- Organizers retain full edit access even after COMPLETED status — no lock on organizer edits

**"Start Tournament" Placement**
- "Start Tournament" button lives on the tournament detail page
- Visible only to ORGANIZER and ADMIN roles
- Triggers SCHEDULED → IN_PROGRESS status transition and closes player registration simultaneously

### Claude's Discretion
- Registration close experience for players (natural error message, disabled state, or redirect — Claude decides)
- Confirmation dialog wording/behavior before starting tournament
- Exact champion banner design (styling, placement, player name display)
- How bracket recalculation propagates through multiple rounds (e.g., if round 1 result changes, do downstream slots cascade?)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LIFE-01 | Organizer can start a tournament, transitioning it from SCHEDULED to IN_PROGRESS status | New PATCH `/api/v1/tournaments/:id/start` endpoint; backend `tournamentService` already has `status` field on Tournament model |
| LIFE-02 | Starting a tournament automatically closes player registration | `tournamentRegistrationService.validateTournamentStatus()` already blocks non-SCHEDULED registration; setting status to IN_PROGRESS is sufficient — the existing registration guard handles closure automatically |
| LIFE-03 | When the final match result of a tournament is confirmed, tournament status automatically transitions to COMPLETED | Hook inside `matchResultService.submitResult()` — after organizer writes result, detect if all matches are COMPLETED and flip tournament status |
| LIFE-04 | When a knockout match result is confirmed, the winner is automatically placed in the correct next-round match slot in the bracket | After `matchResultService.submitResult()` persists result, run bracket advancement logic: find next-round match by position, write winner's playerId into the correct slot (player1 or player2 based on match parity) |
</phase_requirements>

---

## Summary

Phase 2 is a predominantly backend phase with thin frontend additions. The existing codebase has the full data model, service structure, and SWR refresh pattern already in place from Phase 1 and earlier features. No new libraries are needed.

The three backend concerns are (1) a new "start tournament" endpoint that transitions SCHEDULED → IN_PROGRESS and relies on the existing registration status guard to block further registrations, (2) bracket slot advancement triggered from inside `matchResultService.submitResult()` after every successful result write, and (3) tournament COMPLETED auto-transition triggered only when an organizer writes a result for the final match and all bracket matches are done.

On the frontend, the work is similarly scoped: add a "Start Tournament" button to `TournamentViewPage` for organizer/admin roles, surface a champion banner in `TournamentHeader` when status is COMPLETED, and enforce read-only bracket behavior for non-organizers after completion. The SWR cache (`mutate`) pattern is already used in `KnockoutBracket` after Phase 1 result submissions — the same pattern re-fetches matches and causes bracket slots to update.

**Primary recommendation:** Implement bracket slot advancement as an in-transaction Prisma operation inside `matchResultService.submitResult()`. The match-to-next-match relationship must be derived from `matchNumber` and `roundNumber` position arithmetic (no `nextMatchId` foreign key exists in the schema). Use bracket position math: next-round match position = `Math.ceil(currentMatchNumber / 2)`, and winner slot = player1 if `currentMatchNumber` is odd, player2 if even.

---

## Standard Stack

### Core (already installed — no additions needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma ORM | current (project) | DB read/write for match and tournament records | Already used for all data access |
| Express 5.1.0 | current | New route for tournament start endpoint | Existing pattern throughout codebase |
| SWR | current | Frontend cache invalidation after result submit | `useMatches` hook already calls `mutate` in Phase 1 |
| React Bootstrap 2.10 | current | Champion banner Alert component, confirmation dialog | Already used in TournamentViewPage |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Joi 18.0.1 | current | Validate tournament start request (ID only) | Existing `validateParams` middleware pattern |
| http-errors | current | Structured error throws in new service functions | Same pattern as `matchResultService` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| In-transaction bracket advancement | Separate background job | Transaction is simpler, no queue infra needed, acceptable for v1 throughput |
| In-transaction final-match detection | Polling cron job | Cron adds complexity; synchronous detection is accurate and simple |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended File Changes

```
backend/src/
  api/
    tournamentController.js       # Add startTournament handler
    routes/tournamentRoutes.js    # Add PATCH /:id/start route
  services/
    matchResultService.js         # Hook bracket advancement + tournament completion here
    tournamentLifecycleService.js # NEW: startTournament(), advanceBracketSlot(), checkTournamentCompletion()

frontend/src/
  pages/TournamentViewPage.jsx    # Add "Start Tournament" button + champion banner
  components/TournamentHeader.jsx # Add champion banner for COMPLETED status (or keep in ViewPage)
  services/tournamentService.js   # Add startTournament() API call
```

### Pattern 1: Tournament Start Endpoint

**What:** PATCH `/api/v1/tournaments/:id/start` — organizer-gated, transitions SCHEDULED → IN_PROGRESS.
**When to use:** Organizer clicks "Start Tournament" on detail page.

```javascript
// backend/src/services/tournamentLifecycleService.js
export async function startTournament(tournamentId) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, status: true }
  });

  if (!tournament) throwError(404, 'TOURNAMENT_NOT_FOUND', 'Tournament not found');

  if (tournament.status !== 'SCHEDULED') {
    throwError(400, 'INVALID_STATUS_TRANSITION',
      `Cannot start a tournament with status ${tournament.status}`);
  }

  return await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      status: 'IN_PROGRESS',
      lastStatusChange: new Date()
    }
  });
}
```

**Registration closure is automatic:** `tournamentRegistrationService.validateTournamentStatus()` already throws `INVALID_TOURNAMENT_STATUS` (400) when `tournament.status !== 'SCHEDULED'`. No additional code needed to close registration — setting status to IN_PROGRESS is sufficient.

### Pattern 2: Bracket Slot Advancement

**What:** After every match result write, find the next-round match and write the winner into the correct player slot.
**When to use:** Appended to `matchResultService.submitResult()` inside the existing Prisma transaction.

**Critical: Next-match position math**

The schema has no `nextMatchId` on Match. Next-round slot must be derived from `matchNumber` and `roundNumber`:

```
nextRoundMatchPosition = Math.ceil(currentMatchNumber / 2)
winnerSlot = (currentMatchNumber % 2 === 1) ? 'player1' : 'player2'
```

This holds only when matches are numbered sequentially (1, 2, 3, 4...) within a round and the bracket tree is a standard single-elimination binary tree. The seeding service (Feature 010) and bracket generation (Feature 009) use this numbering — confirmed by `matchNumber` field in schema.

```javascript
// Inside matchResultService.submitResult() — appended after the match.update()
// Still inside the prisma.$transaction

async function advanceBracketSlot(tx, updatedMatch, winnerId) {
  // Find the round of the current match
  if (!updatedMatch.roundId) return; // not a bracket match — skip

  const currentRound = await tx.round.findUnique({
    where: { id: updatedMatch.roundId },
    select: { roundNumber: true, bracketId: true, tournamentId: true }
  });
  if (!currentRound) return;

  // Find the next round in the same bracket
  const nextRound = await tx.round.findFirst({
    where: {
      tournamentId: currentRound.tournamentId,
      bracketId: currentRound.bracketId,
      roundNumber: currentRound.roundNumber + 1
    }
  });
  if (!nextRound) return; // This was the final round — no next round to advance to

  // Compute next match slot
  const nextMatchNumber = Math.ceil(updatedMatch.matchNumber / 2);
  const isOdd = updatedMatch.matchNumber % 2 === 1;

  // Find the target match in the next round
  const nextMatch = await tx.match.findFirst({
    where: {
      roundId: nextRound.id,
      matchNumber: nextMatchNumber
    }
  });
  if (!nextMatch) return;

  // Write winner into correct slot
  await tx.match.update({
    where: { id: nextMatch.id },
    data: isOdd
      ? { player1Id: winnerId }
      : { player2Id: winnerId }
  });
}
```

**Winner ID extraction:** The `result` JSON stored in Phase 1 uses `winner: 'PLAYER1'` or `winner: 'PLAYER2'` string. Map this to a DB player ID:

```javascript
const resultJson = JSON.parse(updatedMatch.result);
const winnerId = resultJson.winner === 'PLAYER1'
  ? updatedMatch.player1Id
  : updatedMatch.player2Id;
```

**Cascade on result change:** When a result is overridden (same match re-submitted), the same advancement logic runs again with the new winner, overwriting the slot. Downstream slots (next-next round) do NOT auto-cascade — the locked decision allows this. If organizer corrects a result they must re-propagate manually by submitting the corrected next-round result too. (Claude's discretion area: the planner may choose to implement cascade propagation, clearing downstream slots when a result changes.)

### Pattern 3: Tournament Completion Auto-Detection

**What:** After writing a result, check if all bracket matches are COMPLETED. If so and submitter is organizer, set tournament to COMPLETED.
**When to use:** Inside `matchResultService.submitResult()`, after the match update + bracket advancement.

```javascript
async function checkAndCompleteTournament(tx, tournamentId, isOrganizer) {
  if (!isOrganizer) return; // Only organizer result can trigger COMPLETED

  // Count incomplete bracket matches
  const incompleteMatches = await tx.match.count({
    where: {
      tournamentId,
      bracketId: { not: null },    // Bracket matches only (not group/swiss)
      isBye: false,                // Exclude BYE slots
      status: { not: 'COMPLETED' }
    }
  });

  if (incompleteMatches === 0) {
    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        status: 'COMPLETED',
        lastStatusChange: new Date()
      }
    });
  }
}
```

**Final match detection:** The final match is the single match in the highest-numbered round with `bracketType: MAIN`. Detecting "all bracket matches complete" is simpler and equivalent.

### Pattern 4: Frontend "Start Tournament" Button

**What:** Organizer/Admin-only button on TournamentViewPage; calls `startTournament()` API, then `mutate()` SWR cache.
**When to use:** When `tournament.status === 'SCHEDULED'` and user role is ORGANIZER or ADMIN.

```javascript
// frontend/src/pages/TournamentViewPage.jsx (addition)
const handleStartTournament = async () => {
  if (!window.confirm('Start this tournament? Registration will close immediately.')) return;
  try {
    await tournamentService.startTournament(tournament.id);
    mutate(); // SWR cache bust — reloads tournament with new status
  } catch (err) {
    setError(err.message || 'Failed to start tournament');
  }
};

// Render condition (inside tournament && block):
{(user?.role === 'ORGANIZER' || user?.role === 'ADMIN') && tournament.status === 'SCHEDULED' && (
  <Button variant="success" onClick={handleStartTournament}>
    Start Tournament
  </Button>
)}
```

The `useTournament` SWR hook already exposes `mutate` — read it from the hook destructure.

### Pattern 5: Champion Banner

**What:** Alert/banner displayed at the top of `TournamentViewPage` when `tournament.status === 'COMPLETED'`.
**When to use:** Status is COMPLETED; winner's name retrieved from the final match's result JSON.

The winner's name is NOT stored on the Tournament record — it must be derived from the final match result. The cleanest approach for v1: the backend's tournament GET endpoint can compute and include a `champion` field when status is COMPLETED, fetching the final match winner's player name in `getTournamentWithRelatedData()`. This avoids a second API call from the frontend.

Alternatively (simpler): The frontend reads the already-loaded `matches` for the bracket, finds the last-round match that is COMPLETED, parses the winner from `result.winner`, and reads `player1.name` or `player2.name`. This requires matches to already be fetched — workable since the bracket is expanded.

**Recommended:** Add `champion` field to the tournament GET response (name only). This is the clearest pattern.

### Pattern 6: Read-Only Bracket for Players After COMPLETED

**What:** After tournament COMPLETED, the `handleMatchClick` in `KnockoutBracket.jsx` should not open the modal for PLAYER role users.
**Implementation:** `KnockoutBracket` already receives `tournament` data indirectly (via `FormatVisualization`). Pass `tournament.status` down or check it from context. Gate `handleMatchClick` with an additional condition:

```javascript
// Inside KnockoutBracket.jsx handleMatchClick — add condition:
const isTournamentCompleted = tournament?.status === 'COMPLETED';
if (!isOrganizer && isTournamentCompleted) return; // Read-only for players after completion
```

`KnockoutBracket` needs a new `tournamentStatus` prop (or receive full `tournament` object) from `FormatVisualization`.

### Anti-Patterns to Avoid

- **Separate "close registration" endpoint:** Don't add a dedicated registration-close action. The status transition to IN_PROGRESS is sufficient — the existing `validateTournamentStatus` guard already blocks non-SCHEDULED registrations.
- **Storing `nextMatchId` on Match:** Don't add a foreign key. Position math from `matchNumber` and `roundNumber` is sufficient and avoids schema migration risk.
- **Clearing all downstream slots on result change:** Don't automatically cascade clears beyond the immediate next-round slot unless the planner explicitly decides to. The UX cost (organizer confusion about cleared slots they didn't touch) is high. Document this as a known limitation.
- **Fetching all matches to find the final match:** Don't load all matches just to find the champion. Use an indexed query: `findFirst({ where: { tournamentId, roundId: { in: highestRound } }, orderBy: { matchNumber: 'asc' } })`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP error throwing | Custom error class | `http-errors` (createHttpError) + existing `throwError` helper in matchResultService | Already established in this codebase; consistent shape |
| SWR cache invalidation | Manual state reset or page reload | `mutate()` from `useTournament` / `useMatches` hooks | Already pattern for Phase 1 result submission |
| Auth guards on new endpoint | Custom role check | `isAuthenticated` + `authorize('update', 'Tournament')` middleware | Existing CASL-based middleware chain; see tournamentRoutes.js |
| Confirmation dialogs | Custom modal component | `window.confirm()` for MVP, or React Bootstrap `Modal` | `window.confirm` is fast to ship and matches the project's non-animation philosophy |

---

## Common Pitfalls

### Pitfall 1: matchResultService Transaction Boundary

**What goes wrong:** Bracket advancement logic reads the current match's `roundId` and `matchNumber`, but these fields are NOT included in the current `tx.match.update()` return — only `id`, `result`, `status`, `completedAt`, `updatedAt` are written.

**Why it happens:** The `match.update()` in `submitResult()` does not `include` related data. The `updatedMatch` return value is the raw update result, lacking `roundId`, `matchNumber`, `player1Id`, `player2Id`.

**How to avoid:** Change the `tx.match.update()` call to include `select` or `include` for the fields needed by bracket advancement:

```javascript
const updated = await tx.match.update({
  where: { id: matchId },
  data: { result: ..., status: 'COMPLETED', completedAt: ..., updatedAt: ... },
  // Add this:
  select: {
    id: true, matchNumber: true, roundId: true,
    player1Id: true, player2Id: true, tournamentId: true,
    result: true, status: true, completedAt: true, updatedAt: true
  }
});
```

**Warning signs:** `updatedMatch.roundId` is undefined when bracket advancement runs.

### Pitfall 2: TournamentRegistration Status Not "CLOSED"

**What goes wrong:** Player UI still shows a register button or registration form when tournament is IN_PROGRESS.

**Why it happens:** `TournamentRegistrationPage` and `OrganizerRegistrationPanel` check `tournament.status` to gate the UI, but the exact condition may use `=== 'SCHEDULED'` or only check `registrationCloseDate`. If only the backend blocks via `validateTournamentStatus`, the frontend shows the form and then the user gets a confusing 400 error.

**How to avoid:** In the frontend, disable/hide the registration button whenever `tournament.status !== 'SCHEDULED'`. Display a clear message: "Registration is closed — this tournament has started." This is the "registration close experience" left to Claude's discretion; the recommended approach is a disabled state with inline text, not a redirect.

**Warning signs:** Players see a functional registration form on an IN_PROGRESS tournament.

### Pitfall 3: Bracket Advancement with BYE Matches

**What goes wrong:** A BYE match (`isBye: true`) has no `player2Id`. The winner of a BYE is always `player1`. If the bracket advancement logic tries to look up the "winner" via the result JSON, BYE matches have no `result` field set — the advancement never fires.

**Why it happens:** BYE slots are pre-populated by the seeding/bracket generation process. They don't go through `submitResult()`.

**How to avoid:** BYE advancement should be handled at bracket generation time, not in `matchResultService`. The bracket generation (Feature 009/010) should write the BYE winner into the next round slot immediately when the bracket is seeded. Phase 2 only handles result-triggered advancement for non-BYE matches. Add a guard:

```javascript
if (updatedMatch.isBye) return; // BYE advancement handled at bracket creation
```

**Warning signs:** Next-round slots after BYE matches show "TBD" even though the draw was populated.

### Pitfall 4: Tournament Completion Fires Prematurely

**What goes wrong:** The "all matches complete" check counts group or Swiss matches alongside bracket matches. A doubles tournament with a completed group stage but an ongoing knockout bracket incorrectly triggers COMPLETED.

**Why it happens:** `tx.match.count({ where: { tournamentId, status: { not: 'COMPLETED' } } })` counts all match types.

**How to avoid:** Scope the completion check to `bracketId: { not: null }` and `bracketType: 'MAIN'` only. For knockout-only tournaments (Phase 2 focus), this is straightforward. Add `isBye: false` to exclude BYE slots that will never be "completed" in the normal sense.

**Warning signs:** Tournament moves to COMPLETED while some non-BYE matches are still SCHEDULED.

### Pitfall 5: SWR Cache Stale After Tournament Status Change

**What goes wrong:** After `startTournament()` API call, the `TournamentViewPage` still shows "SCHEDULED" status and the "Start Tournament" button remains visible.

**Why it happens:** `useTournament` returns `mutate` but the page currently doesn't capture it in the destructure: `const { tournament, isLoading, isError } = useTournament(id)` — `mutate` is not extracted.

**How to avoid:** Update `TournamentViewPage` to extract `mutate` from the hook:

```javascript
const { tournament, isLoading, isError, mutate } = useTournament(id);
```

Then call `mutate()` after a successful `startTournament()` call.

**Warning signs:** Button still shows after start; status badge doesn't update.

### Pitfall 6: Round Number Assumption for Final Match Detection

**What goes wrong:** The "final match" detection assumes the match in the highest-numbered round is the final. But if there are consolation brackets or placement brackets (MATCH_2 or UNTIL_PLACEMENT guarantee), those have additional rounds after the MAIN bracket final.

**Why it happens:** `matchGuarantee` on the Bracket model can be `MATCH_2` or `UNTIL_PLACEMENT`, not just `MATCH_1`.

**How to avoid:** Scope tournament completion check to `bracketType: 'MAIN'` matches only:

```javascript
const incompleteMatches = await tx.match.count({
  where: {
    tournamentId,
    bracket: { bracketType: 'MAIN' },
    isBye: false,
    status: { not: 'COMPLETED' }
  }
});
```

This uses a nested filter on the related `Bracket` record — valid in Prisma.

---

## Code Examples

### Backend: New Start Endpoint (tournamentRoutes.js addition)

```javascript
// Source: existing pattern in tournamentRoutes.js (see PATCH /:id route)
router.patch(
  '/:id/start',
  isAuthenticated,
  authorize('update', 'Tournament'),
  startTournament  // new controller handler
);
```

### Backend: startTournament controller handler

```javascript
// Source: pattern from tournamentController.js updateTournament
export async function startTournament(req, res, next) {
  try {
    const { id } = req.params;
    const tournament = await tournamentLifecycleService.startTournament(id);
    return res.status(200).json({ success: true, data: { id: tournament.id, status: tournament.status } });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message }
      });
    }
    next(err);
  }
}
```

### Frontend: startTournament service call

```javascript
// frontend/src/services/tournamentService.js addition
export const startTournament = async (id) => {
  const response = await apiClient.patch(`/v1/tournaments/${id}/start`);
  return response.data.data;
};
```

### Frontend: Champion banner (React Bootstrap)

```javascript
// In TournamentViewPage.jsx, after TournamentHeader
{tournament.status === 'COMPLETED' && tournament.champion && (
  <Alert variant="warning" className="mt-3 text-center">
    <strong>Champion: {tournament.champion.name}</strong>
  </Alert>
)}
```

### Frontend: Read-only bracket after completion

```javascript
// KnockoutBracket.jsx — updated handleMatchClick
const handleMatchClick = (match) => {
  if (!user) return;
  if (match?.isBye || match?.status === 'BYE') return;
  // New: read-only for players when tournament is completed
  if (!isOrganizer && tournamentStatus === 'COMPLETED') return;
  const participant = isMatchParticipant(match, user.playerId);
  if (!isOrganizer && !participant) return;
  setSelectedMatch(match);
  setSelectedMatchIsParticipant(participant);
  if (onMatchClick) onMatchClick(match);
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Organizer-only bracket advancement (pre-Phase 1 decision) | Any result submission (player OR organizer) advances slot | Phase 2 context decision | matchResultService must trigger advancement on PLAYER submissions too, not just organizer |
| registrationCloseDate as the only close mechanism | Tournament status IN_PROGRESS also closes registration | Phase 2 (LIFE-02) | validateTournamentStatus() already handles this; no code change needed beyond setting the status |

**Existing behaviors (unchanged):**
- TournamentRegistration status guard: `validateTournamentStatus()` already blocks registration for non-SCHEDULED tournaments — confirmed in `tournamentRegistrationService.js` lines 155-162.
- `registrationCloseDate` continues to function as an independent close mechanism (time-based).

---

## Open Questions

1. **Cascade propagation on result override**
   - What we know: when a result is overridden, the new winner should appear in the next-round slot
   - What's unclear: if round 1 slot A → round 2 slot B → round 3 slot C, and A is corrected after B is also complete, does B need to be cleared? The CONTEXT.md says organizer uses MatchResultModal to re-propagate "the correct winner" — implying only one level of propagation, not full cascade
   - Recommendation: implement single-level advancement only (current match → next-round slot). Document that organizer must manually fix downstream slots if a correction cascades. Flag for planner to decide.

2. **Champion field in tournament GET response**
   - What we know: Tournament model has no `champion` field. The winner must be derived from the final match result.
   - What's unclear: whether to add a computed `champion` to `getTournamentWithRelatedData()` or have the frontend compute it from match data
   - Recommendation: add `champion: { id, name }` as a computed field in `getTournamentWithRelatedData()`. Query the single final-round MAIN bracket match when status is COMPLETED. Avoids extra API round-trips.

3. **Doubles bracket advancement**
   - What we know: doubles matches have `pair1Id`/`pair2Id` in addition to `player1Id`/`player2Id`. The Match schema requires `player1Id` (non-nullable) — a representative player.
   - What's unclear: for a doubles tournament, does next-round match store the winning pair's player IDs? The Match schema requires player1Id (non-nullable), so pair matches use a representative playerProfileId for player1/player2 slots.
   - Recommendation: for doubles, advance both `player1Id` (representative player) and `pair1Id` / `pair2Id` into the next-round match. Confirm the existing bracket seed data pattern used by Feature 010 for how pairs populate match player slots.

---

## Sources

### Primary (HIGH confidence)
- `backend/prisma/schema.prisma` — Tournament, Match, Round, Bracket, TournamentRegistration model definitions; `TournamentStatus` enum; confirmed `status`, `lastStatusChange`, `matchNumber`, `roundId`, `bracketId`, `isBye` fields
- `backend/src/services/matchResultService.js` — Confirmed transaction pattern, result JSON format (`winner: 'PLAYER1'/'PLAYER2'`, `submittedBy: 'ORGANIZER'/'PLAYER'`), atomic Prisma transaction
- `backend/src/services/tournamentRegistrationService.js` — Confirmed `validateTournamentStatus()` throws 400 when `status !== 'SCHEDULED'` (lines 155-162); registration closure is automatic on status change
- `backend/src/api/routes/tournamentRoutes.js` — Confirmed `authorize('update', 'Tournament')` middleware pattern for organizer-gated endpoints
- `frontend/src/services/tournamentViewService.js` — Confirmed `useTournament` returns `mutate`; `useMatches` already accepts `mutate` and is called in KnockoutBracket
- `frontend/src/components/KnockoutBracket.jsx` — Confirmed `handleMatchClick` gating pattern; confirmed `mutate` is passed to `MatchResultModal`
- `frontend/src/pages/TournamentViewPage.jsx` — Confirmed page structure; `TournamentHeader`, `FormatVisualization` composition; SWR hook usage

### Secondary (MEDIUM confidence)
- `backend/src/services/tournamentService.js` — `getMatches()` response confirms `player1.id`, `player2.id` are included in match data; confirms Prisma nested filter capability

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all patterns from existing codebase
- Architecture (bracket advancement): HIGH — Match schema and position math verified directly from schema.prisma and seed-knockout-test.js match numbering
- Pitfalls: HIGH — all pitfalls derived from direct code reading, not speculation

**Research date:** 2026-02-27
**Valid until:** 60 days (stable internal codebase, no external moving parts)
