# Phase 13: Manual Draw UI - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Organizer-facing bracket draw interface for manually assigning players/pairs to bracket positions, clearing mistakes, and tracking placement progress. This phase adds the UI for the Phase 12 manual draw API — draw mode selection, position assignment dropdowns, clear controls, and a progress indicator. No new backend endpoints; consumes `PUT /tournaments/:id/bracket/positions` and existing bracket generation with `mode: 'manual'`.

</domain>

<decisions>
## Implementation Decisions

### Draw mode selection
- Radio buttons (Seeded / Manual) above the existing "Generate Draw" button in BracketGenerationSection
- Default to "Seeded" for backward compatibility — manual is the exception
- When manual mode is selected, hide the doubles seeding method radios (PAIR_SCORE / AVERAGE_SCORE) — they don't apply to manual draw
- After generating a manual draw, stay on the same TournamentViewPage with the assignment UI inline — no new routes or pages

### Position assignment interaction
- Grid editor below the bracket visualization, reusing the existing slot editor card pattern from BracketGenerationSection
- Each dropdown selection calls `PUT /bracket/positions` immediately — no batch/save pattern
- After assignment, the dropdown for that slot shows the assigned player name; all other dropdowns refresh to exclude the just-placed player
- Player dropdown options sorted by seeding rank (highest first), showing rank number + player name in option text
- Small x icon button next to each filled slot to clear the assignment (calls API with `playerId: null`)

### Placement progress
- Bootstrap progress bar + text counter (e.g., "8/16 positions filled") above the assignment grid
- Progress bar turns green when all positions are filled
- Start Tournament button is disabled (greyed out) until all positions filled; when complete, it becomes enabled with green/success styling
- Progress indicator only appears for manual draw mode — seeded draws auto-fill, so progress would always be 100%

### Visual feedback & states
- Empty (unassigned) slots show an open dropdown with placeholder text "Select player..." in muted/italic style
- No extra feedback on successful assignment — the dropdown updating to show the player name and the progress bar incrementing is sufficient
- API errors (ALREADY_PLACED, NOT_REGISTERED, BYE_SLOT_NOT_ASSIGNABLE) displayed as toast notifications using existing ToastContext
- BYE match cards shown in the grid as disabled/read-only with slots greyed out and marked "BYE" — shows complete bracket structure

### Claude's Discretion
- Exact CSS styling and spacing of the assignment grid cards
- Whether to refactor BracketGenerationSection into sub-components or extend inline
- Loading spinner behavior during individual API calls
- Responsive breakpoints for the grid layout
- Whether the bracket visualization above updates in real-time as assignments are made

</decisions>

<specifics>
## Specific Ideas

- The existing BracketGenerationSection.jsx already has a slot editor grid with per-match cards and dropdowns — this is the pattern to follow for manual draw
- Doubles seeding method radios in BracketGenerationSection are the exact UX precedent for the draw mode radio buttons
- The Phase 12 API returns updated match data after assignment, which can be used to refresh the bracket visualization above

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BracketGenerationSection.jsx`: Existing slot editor grid with per-match cards and Form.Select dropdowns — primary reuse target for manual draw assignment UI
- `FormatVisualization.jsx`: Routes to BracketGenerationSection for organizers; no changes needed to routing logic
- `KnockoutBracket.jsx`: Bracket visualization component rendered above the grid editor for reference
- `ToastContext.jsx`: Existing toast notification system for error display
- `bracketPersistenceService.js` (frontend): Add new `assignPosition()` function calling PUT /bracket/positions
- `PairSelector.jsx`: Existing pair dropdown pattern (though manual draw uses simpler single-entity dropdowns)

### Established Patterns
- SWR hooks (`useTournament`, `useFormatStructure`, `useMatches`) for data fetching with `mutate()` for refresh after mutations
- `apiClient.js` error transformation: errors arrive as `{ status, code, message, details }` — toast can display `err.message` directly
- Responsive grid: existing slot editor uses responsive columns (1 on mobile, 2 on tablet, 3 on desktop)
- Radio buttons for mode selection: doubles seeding method radios already exist in BracketGenerationSection

### Integration Points
- `BracketGenerationSection.jsx`: Main component to modify — add mode radios, modify grid editor for immediate-save behavior
- `bracketPersistenceService.js` (frontend): Add `assignPosition(tournamentId, { matchId, slot, playerId/pairId })` API call
- `generateBracket()` call: Add `mode: 'manual'` to the existing options payload
- `TournamentViewPage.jsx`: May need to pass `drawMode` down for Start button styling conditional
- Existing `handleSlotChange` and `pendingSwaps` state: Replace with immediate API call pattern for manual mode

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-manual-draw-ui*
*Context gathered: 2026-03-04*
