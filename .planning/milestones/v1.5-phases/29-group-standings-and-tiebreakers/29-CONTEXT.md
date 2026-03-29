# Phase 29: Group Standings and Tiebreakers - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Authoritative 6-level tiebreaker chain for group standings with cyclic lock detection and manual organizer resolution. Replaces the placeholder 4-level sort in GroupStandingsTable with a backend service that computes standings server-side. Covers tiebreaker algorithm, cycle detection, manual override persistence, and tiebreaker visibility in the UI. Combined format advancement and tournament ranking points are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Points system change
- **Remove the "Points" column entirely** from group standings — current 2-for-win, 0-for-loss is meaningless without draws or participation points
- Sort by **wins directly** as the first criterion — "Points" column replaced by "W" column already present
- Update `GroupStandingsTable.jsx` to stop computing and displaying the `points` field

### Tiebreaker chain (fixed for all tournaments)
- **Not configurable per tournament** — same chain applies to every GROUP/COMBINED tournament
- Chain order (6 levels):
  1. **Wins** — most match victories
  2. **Head-to-head (mini-table)** — only matches among the tied subset of players
  3. **Set differential** — sets won minus sets lost
  4. **Game differential** — games won minus games lost
  5. **Fewer total games played** — player who played fewer total games ranks higher (rewards efficiency)
  6. **Manual organizer resolution** — organizer assigns final positions

### Head-to-head mini-table
- When 2 players tied: simple — who won their direct match
- When 3+ players tied: build mini-table from only matches between the tied players, re-apply the chain (wins within mini-table first)
- If mini-table produces a **cycle** (A>B, B>C, C>A): H2H level is inconclusive — fall through to set diff among the tied group

### Cyclic lock detection
- **Detect on standings computation only** — not on result submission. Cycles only matter when determining final positions
- **Fall through to next level** automatically — do not flag organizer unless ALL remaining levels fail
- **Partial resolution supported** — if set diff separates player A from {B, C} but B=C remain tied, resolve A's position and continue chain for just B vs C
- Only flag for manual resolution when the entire chain exhausts without fully separating all tied players

### Manual resolution
- **Inline in standings table** — Alert banner above the tied group's standings with a "Resolve tie" button. Organizer sees standings context while resolving
- Resolution UI: Claude's discretion (dropdown position picker recommended for mobile simplicity)
- **Persisted in DB until cleared** — manual override survives recalculation. If a match result changes, show a warning that the override may be stale but don't auto-clear
- **'Manual' label visible** to all users (players, spectators) next to manually-resolved positions — transparent that organizer intervened
- **Blocking for advancement** — non-blocking during group stage, but blocks "Advance to Knockout" in COMBINED tournaments until all ties are resolved

### Tiebreaker visibility
- **Tooltip on hover/tap** showing tiebreaker criterion — position shows as "2nd", hovering/tapping shows "Resolved by: Head-to-head" (or "Set diff", etc.)
- **Criterion label only** for H2H — no mini-table display. Players can look at match history themselves
- **Doubles pairs** treated identically to singles for tiebreaker display — "Player A / Player B" is just a longer name string
- **Tied positions shown as range** — e.g., "2-3" for both tied players until resolved. Makes it obvious a tie exists

### Backend vs frontend computation
- **Backend service** computes standings with full tiebreaker chain — new service, new API endpoint
- Frontend `GroupStandingsTable` **stops computing standings client-side** — receives pre-sorted standings from API with tiebreaker metadata
- **On-demand per request** — compute fresh each time standings are fetched. Groups are small (3-8 players), computation is fast. No caching/precomputation needed
- API response includes: sorted standings array, tiebreaker criterion per position, unresolved ties list, manual override indicators

### Claude's Discretion
- Exact manual resolution UI component (dropdown vs other mobile-friendly pattern)
- API endpoint path and response shape
- Database model for manual override storage (new model vs field on GroupParticipant)
- Schema migration details
- SWR integration — how frontend fetches and caches the new standings endpoint
- Warning UX when manual override may be stale after result change
- Tooltip implementation (React Bootstrap OverlayTrigger or custom)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Group standings requirements
- `.planning/milestones/v1.4-REQUIREMENTS.md` — GSTAND-01 through GSTAND-06 requirements with acceptance criteria

### Current standings implementation (replace)
- `frontend/src/components/GroupStandingsTable.jsx` — Current client-side standings calculation in `useMemo` (lines 67-180). Phase 29 replaces this with backend API call. Keep rendering logic, remove computation
- `frontend/src/services/tournamentViewService.js` — `useMatches` SWR hook. May need a new `useGroupStandings` hook

### Match result infrastructure (read-only context)
- `backend/src/services/matchResultService.js` — Match data shape, how results are stored. Tiebreaker service reads this data
- `backend/prisma/schema.prisma` — Match model with groupId FK, Group/GroupParticipant models. Manual override may need schema addition

### Phase 28 context (predecessor)
- `.planning/phases/28-group-match-play-and-visualization/28-CONTEXT.md` — Accordion layout, match entry flow, differential columns. Phase 29 extends this
- `.planning/phases/28-group-match-play-and-visualization/28-RESEARCH.md` — Code patterns, component architecture, SWR mutation strategy

### Ranking service (pattern reference)
- `backend/src/services/rankingService.js` — Existing tiebreaker logic for tournament rankings (totalPoints → lastTournamentDate → tournamentCount → alphabetical). Different chain but similar pattern

### Mobile patterns
- `.planning/phases/25-app-wide-responsive-pass/25-CONTEXT.md` — v1.4 responsive patterns, tooltip accessibility

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GroupStandingsTable.jsx`: Rendering logic (table, columns, match rows, accordion) stays. Standings computation (`useMemo` block) gets replaced by API data
- `rankingService.js`: Pattern for multi-level tiebreaker sort logic with fallback chain
- `useMatches` SWR hook: Pattern for new `useGroupStandings` hook
- React Bootstrap `OverlayTrigger` + `Tooltip`: Available for tiebreaker criterion tooltips

### Established Patterns
- Backend services in `backend/src/services/` with Prisma queries
- API controllers in `backend/src/api/` with Joi validation
- SWR hooks in `frontend/src/services/tournamentViewService.js`
- Error handling: `makeError(code, message)` pattern

### Integration Points
- `GroupStandingsTable.jsx` — Replace `useMemo` standings computation with API-fetched data
- `FormatVisualization.jsx` — May need to pass standings data instead of raw matches for standings display
- `backend/src/index.js` — Register new group standings routes
- `backend/prisma/schema.prisma` — Migration for manual override storage

</code_context>

<specifics>
## Specific Ideas

- Tiebreaker chain replaces the placeholder sort in Phase 28's `GroupStandingsTable` (lines 170-176: points → wins → setDiff → gameDiff)
- "2-3" range indicator for tied positions is inspired by standard tournament bracket conventions
- Manual resolution banner should feel like the "Group stage complete" banner from Phase 28 — inline, contextual, action-oriented
- Tooltip approach keeps the table clean while still showing "why" on demand

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 29-group-standings-and-tiebreakers*
*Context gathered: 2026-03-17*
