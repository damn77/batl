# Phase 15: Tournament Deletion and Revert - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Organizers can fully delete a tournament (any status) with cascading data cleanup and ranking correction, or revert a tournament (SCHEDULED with draw, or IN_PROGRESS) back to SCHEDULED with draw erasure and registration unlock. COMPLETED tournaments cannot be reverted — only deleted. Both deletion of completed tournaments and revert trigger ranking recalculation when applicable.

</domain>

<decisions>
## Implementation Decisions

### Deletion confirmation UX
- Delete action lives in the **existing three-dot action dropdown** on the tournament list (alongside Edit, Copy, Recalculate Seeding)
- Confirmation dialog shows: **tournament name**, **current status badge**, and **number of registered players**
- For IN_PROGRESS or COMPLETED tournaments: **red Bootstrap Alert (variant='danger')** banner inside the dialog with warning text (e.g., "This tournament has matches in progress. Deletion is irreversible.")
- **No type-to-confirm** — standard confirm/cancel buttons are sufficient (dialog + warning is enough protection)
- After successful deletion: **success toast notification**, stay on tournament list (SWR mutate refreshes, tournament disappears from list)

### Cascading cleanup scope
- **Hard delete** — tournament and all associated data permanently removed from the database
- **Any tournament status** is deletable: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
- **Modify existing endpoint**: expand `DELETE /api/v1/tournaments/:id` to handle all statuses with cascading cleanup (currently restricted to SCHEDULED-only)
- Cascade order: delete TournamentResults first (remove point awards), then recalculate rankings for affected categories, then delete remaining data (matches, rounds, brackets, registrations, point config, tournament)
- **Ranking recalculation**: for completed tournaments, delete TournamentResults first, then call `recalculateRankings(categoryId)` for each affected category before deleting the tournament itself

### Revert behavior
- Revert available from **SCHEDULED** (if draw exists or registration closed) and **IN_PROGRESS** — NOT from COMPLETED (completed is final, can only be deleted)
- **Preserves all registrations** — only deletes the draw (bracket, rounds, matches) and resets status to SCHEDULED
- Reopens registration (sets `registrationClosed: false`)
- For IN_PROGRESS tournaments: no ranking recalculation needed (points only awarded on completion)
- Confirmation dialog required (same pattern as delete — shows tournament name and explains what will happen: draw deleted, registration reopened)

### Revert trigger location
- Revert action available in **both** the tournament detail page and the three-dot action dropdown on the tournament list
- **Only visible when applicable**: button/menu item only appears when tournament has a draw or is IN_PROGRESS (no dead buttons)
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

</decisions>

<specifics>
## Specific Ideas

- The existing `deleteTournament()` in `tournamentService.js` (line 1122) currently blocks non-SCHEDULED deletion — this needs to be expanded, not replaced
- Phase 14 already established the three-dot dropdown pattern in `TournamentSetupPage.jsx` — delete is a new `Dropdown.Item` in that menu
- Revert from SCHEDULED handles the case where an organizer accidentally generates a draw or closes registration too early

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tournamentService.deleteTournament()`: Existing deletion function (line 1122) — expand to handle all statuses with cascading cleanup
- `rankingService.recalculateRankings(categoryId)`: Recalculates all ranking entries for a category — call after deleting TournamentResults
- `rankingService.createTournamentResult()` / Prisma `tournamentResult.deleteMany()`: For managing point awards during cascade
- `tournamentLifecycleService.startTournament()`: Reference for status transition patterns
- `TournamentSetupPage.jsx` three-dot Dropdown (line 379-406): Existing action menu — add Delete and Revert items
- `ToastContext.jsx`: Existing toast notification system for success/error feedback
- `bracketPersistenceService.js`: Contains bracket/round/match creation logic — inverse operations needed for draw deletion

### Established Patterns
- Service functions throw structured errors with `.code` property via `makeError()` or `createHttpError()`
- Controllers map error codes to HTTP status via `ERROR_STATUS` map
- Prisma transactions for multi-table operations
- SWR hooks with `mutate()` for frontend data refresh after mutations
- Modal confirmation dialogs used throughout the app (e.g., registration, tournament creation)

### Integration Points
- `DELETE /api/v1/tournaments/:id` — existing endpoint to expand
- `tournamentRoutes.js` — may need new revert route
- `tournamentService.js` — expand `deleteTournament()`, add revert function
- `TournamentSetupPage.jsx` — add Delete to dropdown, add revert handling
- `TournamentViewPage.jsx` / `FormatVisualization.jsx` — add Revert button on detail page
- `pointCalculationService.js` — reference for understanding TournamentResult structure
- `bracketPersistenceService.js` — bracket deletion logic (inverse of `generateBracket`)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-tournament-deletion-and-revert*
*Context gathered: 2026-03-04*
