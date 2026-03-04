# Phase 15: Tournament Deletion and Revert - Research

**Researched:** 2026-03-04
**Domain:** Tournament lifecycle management — cascade deletion, ranking cleanup, status revert
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Deletion confirmation UX**
- Delete action lives in the existing three-dot action dropdown on the tournament list (alongside Edit, Copy, Recalculate Seeding)
- Confirmation dialog shows: tournament name, current status badge, and number of registered players
- For IN_PROGRESS or COMPLETED tournaments: red Bootstrap Alert (variant='danger') banner inside the dialog with warning text (e.g., "This tournament has matches in progress. Deletion is irreversible.")
- No type-to-confirm — standard confirm/cancel buttons are sufficient
- After successful deletion: success toast notification, stay on tournament list (SWR mutate refreshes, tournament disappears from list)

**Cascading cleanup scope**
- Hard delete — tournament and all associated data permanently removed from the database
- Any tournament status is deletable: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
- Modify existing endpoint: expand `DELETE /api/v1/tournaments/:id` to handle all statuses with cascading cleanup (currently restricted to SCHEDULED-only)
- Cascade order: delete TournamentResults first (remove point awards), then recalculate rankings for affected categories, then delete remaining data (matches, rounds, brackets, registrations, point config, tournament)
- Ranking recalculation: for completed tournaments, delete TournamentResults first, then call `recalculateRankings(categoryId)` for each affected category before deleting the tournament itself

**Revert behavior**
- Revert available from SCHEDULED (if draw exists or registration closed) and IN_PROGRESS — NOT from COMPLETED (completed is final, can only be deleted)
- Preserves all registrations — only deletes the draw (bracket, rounds, matches) and resets status to SCHEDULED
- Reopens registration (sets registrationClosed: false)
- For IN_PROGRESS tournaments: no ranking recalculation needed (points only awarded on completion)
- Confirmation dialog required (same pattern as delete — shows tournament name and explains what will happen: draw deleted, registration reopened)

**Revert trigger location**
- Revert action available in both the tournament detail page and the three-dot action dropdown on the tournament list
- Only visible when applicable: button/menu item only appears when tournament has a draw or is IN_PROGRESS (no dead buttons)
- On tournament detail page: contextual button near the bracket/draw area
- On tournament list: additional item in the three-dot dropdown

### Claude's Discretion
- Exact revert API endpoint design (new endpoint vs extending existing)
- Whether SCHEDULED revert uses the same endpoint as IN_PROGRESS revert or separate logic
- Internal service function organization and transaction boundaries
- Exact error codes and message wording
- Confirmation dialog component reuse between delete and revert
- Test strategy and coverage
- Button styling and placement on the tournament detail page

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEL-01 | Organizer can delete a tournament | Expand existing `DELETE /api/v1/tournaments/:id`; remove status restriction |
| DEL-02 | Deleting cascades to registrations, draw, and match results | Prisma schema has `onDelete: Cascade` for most relations; TournamentResult requires explicit delete before ranking recalc |
| DEL-03 | User sees confirmation dialog before deletion with tournament details | Modal pattern established in Phase 14 (copy flow); React Bootstrap Modal with tournament name, status badge, player count |
| DEL-04 | Confirmation shows additional highlighted warning for in-progress or completed | Bootstrap Alert variant='danger' inside modal, conditional on status |
| DEL-05 | Deleting a completed tournament triggers ranking recalculation | `recalculateRankings(categoryId)` already exists; must be called after deleting TournamentResults |
| REVERT-01 | Organizer can revert from IN_PROGRESS (or SCHEDULED with draw) to SCHEDULED | New service function; new API endpoint `POST /api/v1/tournaments/:id/revert` |
| REVERT-02 | Reverting deletes the tournament draw (bracket, rounds, matches) | Same cascade order as generateBracket Step 8a: `deleteMany` Match → Round → Bracket |
| REVERT-03 | Reverting unlocks player registration | Set `registrationClosed: false` and status to `SCHEDULED` in same transaction |
| REVERT-04 | Reverting a completed tournament triggers ranking recalculation | Not applicable — COMPLETED is non-revertible per locked decisions |
</phase_requirements>

---

## Summary

Phase 15 adds two lifecycle operations to the tournament management system: full hard deletion (any status) and draw revert (SCHEDULED-with-draw or IN_PROGRESS back to SCHEDULED). Both operations require a confirmation dialog and are accessible from the existing three-dot dropdown on `TournamentSetupPage`. Revert is additionally accessible from the tournament detail page.

The backend work is surgical: the existing `deleteTournament()` service function (line 1122 in `tournamentService.js`) must have its SCHEDULED-only guard removed and be expanded with explicit cascade logic. The ranking cleanup requires fetching affected categoryIds from `TournamentResult` records before deleting them, then calling the existing `recalculateRankings(categoryId)` for each. A new `revertTournament()` service function mirrors the draw deletion logic already in `bracketPersistenceService.js` (Step 8a) and resets tournament state.

The frontend work is additive: two new modal states in `TournamentSetupPage` (delete confirmation, revert confirmation), new Dropdown.Item entries in the three-dot menu, and a revert button added contextually in `BracketGenerationSection` or `FormatVisualization` on the detail page. The `deleteTournament` function already exists in `frontend/src/services/tournamentService.js`.

**Primary recommendation:** Implement revert as a new `POST /api/v1/tournaments/:id/revert` endpoint using `authorize('update', 'Tournament')` (consistent with startTournament). Implement deletion by expanding the existing DELETE endpoint — no new route needed.

---

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma ORM | existing | Database operations, cascade deletes | Already the project ORM |
| Express 5.1.0 | existing | Route handling | Already the project framework |
| Joi | existing | Request validation | Already used for all endpoint validation |
| React Bootstrap 2.10 | existing | Modal, Alert, Dropdown, Button | Already used for all UI |
| React 19 | existing | Frontend components | Already the project frontend |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `useToast` from ToastContext | existing | Success/error notifications | After delete or revert success/failure |
| SWR `mutate` | existing | Cache invalidation after mutations | After delete (remove from list), after revert (refresh tournament state) |

### No New Dependencies
This phase requires zero new npm packages. All needed functionality exists in the project.

---

## Architecture Patterns

### Recommended Project Structure

No new files required beyond adding to existing service/controller/route files. One new service function, one new API route, and frontend additions to existing pages/components.

**New files (optional but recommended):**
- No new backend files strictly needed; all additions fit in existing files
- Frontend: no new files needed; modal logic can live inline or extracted as a shared `TournamentActionModal` component (Claude's discretion)

### Pattern 1: Expanding Existing Delete Endpoint

**What:** Modify `deleteTournament()` in `tournamentService.js` to accept all statuses and perform ordered cleanup before the final `tournament.delete()`.

**When to use:** This is the decided approach (locked decision).

**Cascade order (critical — FK constraints enforce this):**

```javascript
// Source: bracketPersistenceService.js Step 8a + schema FK analysis
export async function deleteTournament(id) {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: {
      status: true,
      categoryId: true
    }
  });

  if (!tournament) {
    throw createHttpError(404, 'Tournament not found', { code: 'TOURNAMENT_NOT_FOUND' });
  }

  // Step 1: If completed, collect affected categories before deleting results
  let affectedCategoryIds = [];
  if (tournament.status === 'COMPLETED') {
    // TournamentResult.onDelete is Cascade, but we need categoryIds for recalculation
    // TournamentResult → RankingEntry → Ranking → Category (the path to categoryId)
    const results = await prisma.tournamentResult.findMany({
      where: { tournamentId: id },
      include: {
        rankingEntry: {
          include: { ranking: { select: { categoryId: true } } }
        }
      }
    });
    const categoryIdSet = new Set(results.map(r => r.rankingEntry.ranking.categoryId));
    affectedCategoryIds = [...categoryIdSet];

    // Step 2: Delete TournamentResults explicitly so recalculation sees zeroed state
    await prisma.tournamentResult.deleteMany({ where: { tournamentId: id } });

    // Step 3: Recalculate rankings for each affected category
    for (const categoryId of affectedCategoryIds) {
      await recalculateRankings(categoryId);
    }
  }

  // Step 4: Delete the tournament record (Prisma Cascade handles the rest)
  // Schema has onDelete: Cascade for:
  //   TournamentRegistration, PairRegistration, Match, Round, Bracket,
  //   Group, TournamentPointConfig, ConsolationOptOut
  // TournamentResult was already handled above (also Cascade, but done explicitly)
  await prisma.tournament.delete({ where: { id } });
}
```

**Key insight:** The Prisma schema already has `onDelete: Cascade` on all tournament child tables. The only reason to do explicit deletes is for TournamentResults, which must be removed before `recalculateRankings()` is called (so rankings are recalculated without this tournament's points).

### Pattern 2: New Revert Service Function

**What:** New `revertTournament(id)` function that deletes bracket/round/match data and resets tournament to SCHEDULED.

**When to use:** Called by the new `POST /api/v1/tournaments/:id/revert` endpoint.

```javascript
// Source: bracketPersistenceService.js Step 8a (inverse of generateBracket)
export async function revertTournament(id) {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: { status: true, categoryId: true }
  });

  if (!tournament) {
    throw createHttpError(404, 'Tournament not found', { code: 'TOURNAMENT_NOT_FOUND' });
  }

  // Only SCHEDULED (with draw) and IN_PROGRESS are revertible
  const hasBracket = await prisma.bracket.count({ where: { tournamentId: id } });
  if (tournament.status === 'COMPLETED') {
    throw createHttpError(409, 'Cannot revert a completed tournament', {
      code: 'REVERT_NOT_ALLOWED',
      reason: 'COMPLETED tournaments can only be deleted'
    });
  }
  if (tournament.status === 'SCHEDULED' && !hasBracket) {
    throw createHttpError(409, 'Tournament has no draw to revert', {
      code: 'NO_DRAW_TO_REVERT'
    });
  }
  if (tournament.status === 'CANCELLED') {
    throw createHttpError(409, 'Cannot revert a cancelled tournament', {
      code: 'REVERT_NOT_ALLOWED'
    });
  }

  // Delete draw data + reset status atomically
  await prisma.$transaction(async (tx) => {
    // Same cascade order as bracketPersistenceService.js Step 8a
    await tx.match.deleteMany({ where: { tournamentId: id } });
    await tx.round.deleteMany({ where: { tournamentId: id } });
    await tx.bracket.deleteMany({ where: { tournamentId: id } });

    // Reset tournament status and reopen registration
    await tx.tournament.update({
      where: { id },
      data: {
        status: 'SCHEDULED',
        registrationClosed: false,
        lastStatusChange: new Date()
      }
    });
  });
}
```

### Pattern 3: Frontend Confirmation Modal (Shared Pattern)

**What:** Modal shown before delete or revert, following the same React Bootstrap Modal pattern used in Phase 14 (copy confirmation).

**When to use:** Both delete and revert need confirmation dialogs.

```jsx
// Source: TournamentSetupPage.jsx existing Modal pattern (copy flow)
// State: showDeleteConfirm, pendingDeleteTournament, deleting
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [pendingDeleteTournament, setPendingDeleteTournament] = useState(null);
const [deleting, setDeleting] = useState(false);

const handleDeleteClick = (tournament) => {
  setPendingDeleteTournament(tournament);
  setShowDeleteConfirm(true);
};

const handleConfirmDelete = async () => {
  setDeleting(true);
  try {
    await deleteTournament(pendingDeleteTournament.id);
    showSuccess(`Tournament "${pendingDeleteTournament.name}" deleted.`);
    setShowDeleteConfirm(false);
    await loadTournaments(); // or SWR mutate
  } catch (err) {
    showError(err.message || 'Failed to delete tournament');
  } finally {
    setDeleting(false);
  }
};
```

**Modal body (conditional warning for IN_PROGRESS/COMPLETED):**

```jsx
<Modal.Body>
  <p>
    Are you sure you want to delete <strong>{pendingDeleteTournament?.name}</strong>?
  </p>
  <p className="text-muted mb-2">
    Status: <Badge bg={STATUS_VARIANTS[pendingDeleteTournament?.status]}>
      {pendingDeleteTournament?.status}
    </Badge>
    &nbsp;· {registeredCount} registered player{registeredCount !== 1 ? 's' : ''}
  </p>
  {(pendingDeleteTournament?.status === 'IN_PROGRESS' ||
    pendingDeleteTournament?.status === 'COMPLETED') && (
    <Alert variant="danger" className="mb-0">
      <Alert.Heading as="h6">Warning: Active Tournament Data Will Be Lost</Alert.Heading>
      {pendingDeleteTournament.status === 'IN_PROGRESS'
        ? 'This tournament has matches in progress. All match data will be permanently deleted.'
        : 'This tournament is completed. All results and ranking points for this tournament will be permanently removed and rankings will be recalculated.'}
    </Alert>
  )}
</Modal.Body>
```

### Pattern 4: Revert API Endpoint

**What:** New route in `tournamentRoutes.js` following the same pattern as `startTournament`.

```javascript
// Source: tournamentRoutes.js pattern for /:id/start
router.post(
  '/:id/revert',
  isAuthenticated,
  authorize('update', 'Tournament'),  // same as startTournament
  revertTournament  // controller function
);
```

**Controller:**
```javascript
export async function revertTournament(req, res, next) {
  try {
    const { id } = req.params;
    const result = await tournamentService.revertTournament(id);
    return res.status(200).json({
      success: true,
      data: { tournament: result, message: 'Tournament reverted to SCHEDULED' }
    });
  } catch (err) {
    next(err);
  }
}
```

### Pattern 5: Revert Button in FormatVisualization / BracketGenerationSection

**What:** Contextual "Revert to Scheduled" button on the tournament detail page, visible only when draw exists or tournament is IN_PROGRESS.

**Where:** `FormatVisualization.jsx` (organizer KNOCKOUT view) or `BracketGenerationSection.jsx` header area — near the Regenerate Draw button.

**Visibility logic:**
```jsx
// Show revert button when: organizer/admin + (hasBracket OR IN_PROGRESS) + not COMPLETED/CANCELLED
const showRevertButton = isOrganizerOrAdmin &&
  (hasBracket || tournament.status === 'IN_PROGRESS') &&
  tournament.status !== 'COMPLETED' &&
  tournament.status !== 'CANCELLED';
```

### Anti-Patterns to Avoid

- **Deleting Tournament before TournamentResults:** The Cascade would delete results automatically, but then `recalculateRankings` would have no data to clean up — rankings would still show old points from the ranking entry aggregation until the next calculation. Always delete TournamentResults explicitly first, then recalculate, then delete the tournament.
- **Wrapping ranking recalculation in the delete transaction:** `recalculateRankings` uses its own Prisma instance and does many sub-queries. It cannot run inside a `$transaction` closure reliably. Do it outside the transaction after TournamentResult deletion.
- **Revert inside a COMPLETED tournament:** Locked decision — COMPLETED is non-revertible. Enforce this guard in the service function with a clear error code.
- **Forgetting ConsolationOptOut deletion:** The schema has `onDelete: Cascade` on `ConsolationOptOut` from Tournament, so it's handled automatically. No explicit delete needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Ranking recalculation after delete | Custom recalc logic | `recalculateRankings(categoryId)` from `rankingService.js` | Handles all ranking types (SINGLES/PAIR/MEN/WOMEN), tiebreaking, seeding score update |
| Draw deletion cascade | Custom delete order | Same `deleteMany` pattern from `bracketPersistenceService.js` Step 8a | Already handles Match→Round→Bracket FK order |
| Toast notifications | Custom alert system | `useToast()` hook → `showSuccess()`, `showError()` | Already used in ManualDrawEditor and established in ToastContext |
| Status badge display | Inline badge | `STATUS_VARIANTS` constant from `tournamentService.js` | Consistent coloring already defined |
| Modal confirmation | Custom confirm UI | React Bootstrap Modal | Already used throughout the app (copy flow, regenerate confirm) |

---

## Common Pitfalls

### Pitfall 1: TournamentResult Not Removed Before Recalculation

**What goes wrong:** If you call `recalculateRankings(categoryId)` before deleting TournamentResults for the deleted tournament, `updateRankingEntry` will still sum up all results including the deleted tournament's points (since TournamentResults still exist at that point). Rankings won't actually decrease.

**Why it happens:** `recalculateRankings` calls `updateRankingEntry` which reads from `rankingEntry.tournamentResults`. If TournamentResults are not yet deleted, they're included in the sum.

**How to avoid:** Always call `prisma.tournamentResult.deleteMany({ where: { tournamentId: id } })` BEFORE calling `recalculateRankings()`. The Cascade from `tournament.delete()` will NOT help here because that happens after the recalculation step.

**Warning signs:** Rankings still show full points after deleting a completed tournament.

### Pitfall 2: Missing categoryId Collection Window

**What goes wrong:** After deleting TournamentResults (explicit), the path from TournamentResult → RankingEntry → Ranking → categoryId is gone. You can no longer determine which categories to recalculate.

**Why it happens:** The deleted TournamentResults included the `rankingEntryId`, which linked to a `Ranking` with `categoryId`. After deletion, that path is severed.

**How to avoid:** Collect `categoryIds` from `TournamentResult` records (via include/join) BEFORE calling `deleteMany`. Store the list, then delete, then recalculate using the stored list.

**Code pattern:**
```javascript
const results = await prisma.tournamentResult.findMany({
  where: { tournamentId: id },
  include: { rankingEntry: { include: { ranking: { select: { categoryId: true } } } } }
});
const categoryIds = [...new Set(results.map(r => r.rankingEntry.ranking.categoryId))];
// Now safe to delete and recalculate
await prisma.tournamentResult.deleteMany({ where: { tournamentId: id } });
for (const cid of categoryIds) await recalculateRankings(cid);
```

### Pitfall 3: Revert Leaving registrationClosed: true

**What goes wrong:** After reverting, the tournament stays at `registrationClosed: true`. Players cannot register, the UI shows "Registration Closed" permanently.

**Why it happens:** Status is reset to SCHEDULED but `registrationClosed` is a separate field — must be reset explicitly.

**How to avoid:** Always update both `status: 'SCHEDULED'` and `registrationClosed: false` in the same `tx.tournament.update()` call in the revert transaction.

### Pitfall 4: Delete Authorization Scope

**What goes wrong:** The current DELETE route uses `authorize('delete', 'Tournament')` which is ADMIN-only per the CASL configuration. Organizers cannot delete their own tournaments.

**Why it happens:** Original T050 spec was ADMIN-only deletion. Phase 15 allows organizers to delete.

**How to avoid:** Check the CASL ability configuration (`abilities.js` or similar) and verify that ORGANIZER role has `delete` permission on `Tournament`, or change the authorization check to `authorize('update', 'Tournament')` which is already granted to organizers. Verify the actual CASL rule before implementation.

**Warning signs:** Organizer gets 403 Forbidden when clicking delete.

### Pitfall 5: Revert from Tournament List Needs Player Count

**What goes wrong:** The revert confirmation dialog on the tournament list needs the draw status (has draw or IN_PROGRESS) to determine visibility. This information must be available in the tournament list response.

**Why it happens:** Tournament list endpoint may not include bracket count or draw state.

**How to avoid:** Check what the tournament list API returns. The `status` field is already there (IN_PROGRESS covers that case). For SCHEDULED tournaments with a draw, we may need a `hasBracket` flag or check if `registrationClosed` is true as a proxy (registration is closed before draw generation). The revert button visibility condition: `status === 'IN_PROGRESS' || (status === 'SCHEDULED' && registrationClosed)`.

---

## Code Examples

### Verified Cascade Order from bracketPersistenceService.js

The deletion order for draw data is already established in the codebase:

```javascript
// Source: bracketPersistenceService.js Step 8a (line 271-274)
// FK constraints require: Match → Round → Bracket deletion order
await tx.match.deleteMany({ where: { tournamentId } });
await tx.round.deleteMany({ where: { tournamentId } });
await tx.bracket.deleteMany({ where: { tournamentId } });
```

Use this exact same order in `revertTournament()`.

### Existing Frontend deleteTournament Service Function

The frontend service function already exists and uses the correct apiClient pattern:

```javascript
// Source: frontend/src/services/tournamentService.js line 65-68
export const deleteTournament = async (id) => {
  const response = await apiClient.delete(`/v1/tournaments/${id}`);
  return response.data;
};
```

No change needed to this function — it will work once the backend lifts the SCHEDULED-only restriction.

### Three-Dot Dropdown Location

The existing dropdown in `TournamentSetupPage.jsx` (lines 379-406):

```jsx
// Source: TournamentSetupPage.jsx lines 379-406
<Dropdown align="end">
  <Dropdown.Toggle variant="link" className="text-dark p-0 border-0" bsPrefix="p-0">
    &#8942;
  </Dropdown.Toggle>
  <Dropdown.Menu>
    <Dropdown.Item onClick={() => handleEditClick(tournament)}>Edit</Dropdown.Item>
    <Dropdown.Item onClick={() => navigate(...)}>Configure Rules</Dropdown.Item>
    <Dropdown.Item onClick={() => navigate(...)}>Configure Points</Dropdown.Item>
    <Dropdown.Divider />
    <Dropdown.Item onClick={() => handleCopyClick(tournament)}>Copy Tournament</Dropdown.Item>
    {/* PHASE 15 ADDITIONS: */}
    {/* Revert item (conditional on status) */}
    {/* Delete item (always visible) */}
    ...
  </Dropdown.Menu>
</Dropdown>
```

### useToast Pattern (from ManualDrawEditor.jsx)

```javascript
// Source: frontend/src/components/ManualDrawEditor.jsx line 21-32
import { useToast } from '../utils/ToastContext';
const { showError } = useToast();
// Also available: showSuccess, showInfo, showWarning
```

### recalculateRankings Signature

```javascript
// Source: backend/src/services/rankingService.js line 408
export async function recalculateRankings(categoryId) {
  // Recalculates all RankingEntry records for all rankings in categoryId
  // for the current year (non-archived)
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SCHEDULED-only delete | Any-status delete with cascade | Phase 15 | Removes the status guard from `deleteTournament()` |
| No revert capability | Revert to SCHEDULED for SCHEDULED+draw or IN_PROGRESS | Phase 15 | New `POST /api/v1/tournaments/:id/revert` endpoint |
| Organizer has no delete in dropdown | Delete + Revert in three-dot dropdown | Phase 15 | More contextual actions in existing dropdown |

**Existing behavior to preserve:**
- `TournamentRegistration.onDelete: Cascade` — automatic cleanup on tournament delete
- `PairRegistration.onDelete: Cascade` — automatic cleanup on tournament delete
- `TournamentPointConfig.onDelete: Cascade` — automatic cleanup on tournament delete
- `ConsolationOptOut.onDelete: Cascade` — automatic cleanup on tournament delete
- `Group.onDelete: Cascade` → children cascade — automatic cleanup
- `Bracket.onDelete: Cascade` → Round → Match chain — these all cascade, but for revert we use explicit deleteMany for control

---

## Open Questions

1. **CASL Authorization for Delete**
   - What we know: Current DELETE route uses `authorize('delete', 'Tournament')`. The comment says "ADMIN role required (T047)".
   - What's unclear: Does the CASL ability configuration actually restrict 'delete' Tournament to ADMIN only? If so, does this phase change that, or is ORGANIZER-level deletion gated differently?
   - Recommendation: Check `backend/src/middleware/authorize.js` and the CASL abilities setup before implementing. If ORGANIZER should delete their own tournaments, update the CASL rule. If all organizers can delete any tournament, update the route to use `authorize('update', 'Tournament')`.

2. **Player count in confirmation dialog**
   - What we know: The dialog shows "number of registered players". The tournament list endpoint data may not include a player count.
   - What's unclear: Is `registeredCount` already in the tournament list response, or must it be fetched separately on demand?
   - Recommendation: Check what `listTournaments` returns. If player count is not there, either (a) fetch it when the dialog opens via the existing `/tournaments/:id/registrations` endpoint, or (b) use a simpler proxy like showing the capacity field. A lightweight approach: show the count only when available, or omit it from the confirmation and show status + name only (still DEL-03 compliant).

3. **Revert visibility in tournament list for SCHEDULED+draw**
   - What we know: The revert condition for SCHEDULED tournaments is "has a draw" — but the tournament list may not include bracket data.
   - What's unclear: How to detect "has a draw" on the list page without an extra API call.
   - Recommendation: Use `registrationClosed` as the proxy. Registration is always closed before a draw is generated (`closeRegistration()` is the first step in the bracket workflow). So: `show revert when (status === 'IN_PROGRESS') || (status === 'SCHEDULED' && registrationClosed === true)`. This is safe because registration can only be closed when the organizer intends to generate a draw.

---

## Validation Architecture

> `workflow.nyquist_validation` key is absent from config.json — treated as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (frontend) / Jest 30.2.0 (backend) |
| Config file | backend: package.json `jest` field; frontend: vitest.config.js |
| Quick run command | `cd backend && npm test -- --testPathPattern=tournamentService` |
| Full suite command | `cd backend && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEL-01 | Delete any-status tournament | integration | `npm test -- --testPathPattern=tournamentRoutes` | ✅ (expand existing) |
| DEL-02 | Cascade removes registrations, draw, results | unit | `npm test -- --testPathPattern=tournamentService` | ✅ (expand existing) |
| DEL-03 | Confirmation dialog shows details | manual | Manual UI test | ❌ Wave 0 (UI only) |
| DEL-04 | Warning banner for IN_PROGRESS/COMPLETED | manual | Manual UI test | ❌ Wave 0 (UI only) |
| DEL-05 | Ranking recalculation after completed delete | unit | `npm test -- --testPathPattern=tournamentService` | ✅ (expand existing) |
| REVERT-01 | Revert SCHEDULED+draw or IN_PROGRESS | integration | `npm test -- --testPathPattern=tournamentRoutes` | ❌ Wave 0 |
| REVERT-02 | Revert deletes draw data | unit | `npm test -- --testPathPattern=tournamentService` | ❌ Wave 0 |
| REVERT-03 | Revert reopens registration | unit | `npm test -- --testPathPattern=tournamentService` | ❌ Wave 0 |
| REVERT-04 | N/A (COMPLETED is non-revertible) | — | — | — |

### Sampling Rate
- **Per task commit:** `cd backend && npm test -- --testPathPattern=tournamentService --passWithNoTests`
- **Per wave merge:** `cd backend && npm test`
- **Phase gate:** Full backend suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Expand `backend/__tests__/integration/tournamentRoutes.test.js` — cover DEL-01, DEL-02, DEL-05 for non-SCHEDULED statuses
- [ ] Add revert endpoint tests to integration suite — cover REVERT-01, REVERT-02, REVERT-03, and guard (COMPLETED → 409)
- [ ] Add unit tests for `revertTournament()` service function in `backend/__tests__/unit/tournamentService.test.js` (if this file exists)

*(UI-only requirements DEL-03 and DEL-04 are manual-only — no automated tests needed)*

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `backend/src/services/tournamentService.js` — existing `deleteTournament()` structure, `copyTournament()` pattern
- Direct code inspection of `backend/src/services/rankingService.js` — `recalculateRankings()` signature and implementation
- Direct code inspection of `backend/src/services/bracketPersistenceService.js` — draw deletion order (Step 8a), transaction pattern
- Direct code inspection of `backend/prisma/schema.prisma` — all `onDelete: Cascade` relationships on Tournament children
- Direct code inspection of `frontend/src/pages/TournamentSetupPage.jsx` — three-dot dropdown structure (lines 379-406)
- Direct code inspection of `frontend/src/services/tournamentService.js` — existing `deleteTournament` frontend function
- Direct code inspection of `frontend/src/utils/ToastContext.jsx` — `useToast` hook, `showSuccess`/`showError` API
- Direct code inspection of `backend/src/api/routes/tournamentRoutes.js` — authorization patterns, route structure

### Secondary (MEDIUM confidence)
- CONTEXT.md Phase 15 decisions — locked choices verified against codebase structure
- CLAUDE.md project notes — established patterns from Phases 12-14

### Tertiary (LOW confidence)
- None — all findings are code-verified

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all verified from codebase, zero new dependencies
- Architecture: HIGH — deletion cascade order, ranking cleanup sequence, and revert steps all verified against existing code
- Pitfalls: HIGH — TournamentResult-before-recalculation ordering verified by reading `recalculateRankings()` implementation; auth concern flagged but requires runtime verification

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable stack, standard patterns)
