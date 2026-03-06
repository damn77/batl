# Phase 17: Bracket View UX Fixes - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix two specific UX issues in the bracket view: (1) middle mouse wheel should scroll the bracket instead of zooming, and (2) the match submission modal should display pair names for doubles matches.

</domain>

<decisions>
## Implementation Decisions

### Scroll vs Zoom Controls
- Middle mouse wheel scrolls up/down only — no zoom behavior on wheel at all
- No Ctrl+wheel zoom — zoom is exclusively via the +/- buttons in the control bar
- Vertical scroll only — no horizontal scroll (shift+wheel) support; left/right navigation is through drag
- Zoom +/- buttons and reset button in BracketControls remain unchanged
- Remove `e.preventDefault()` for wheel events so native scroll behavior works

### Navigation Hint Text
- Update the current "Scroll to zoom, drag to pan" hint to reflect new controls
- Claude's discretion on exact wording (must mention drag-to-pan and +/- for zoom)

### Pair Name Display in Modal
- Construct pair names from individual player names using full names: "Alice Smith / Bob Jones"
- Same construction pattern as BracketMatch.jsx already uses (`pair.player1?.name / pair.player2?.name`)
- For doubles: stack pairs vertically in modal title — Pair 1 names on first line, "vs" separator, Pair 2 names on second line
- For singles: keep current single-line "Player A vs Player B" layout unchanged
- Stacked layout is doubles-only, not applied to singles matches

### Claude's Discretion
- Exact navigation hint wording
- Whether to extract a shared utility for pair name construction (DRY with BracketMatch's getPlayerName)
- Exact CSS/markup for the stacked vertical layout in the modal title

</decisions>

<specifics>
## Specific Ideas

No specific requirements — straightforward bug fixes following existing patterns.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BracketMatch.jsx:88-93` — `getPlayerName()` already handles pair name construction correctly: `pair.player1?.name / pair.player2?.name`
- `useBracketNavigation.js:99-121` — `handleWheel` is the single handler to modify for scroll behavior
- `BracketControls.jsx` — Zoom +/- buttons already exist and work independently

### Established Patterns
- Match objects for doubles have `pair1: { player1: { name }, player2: { name } }` — no `name` field on pair itself
- `DoublesPair` Prisma model has no `name` column; names must be constructed from player1/player2
- Wheel event handler is attached in `KnockoutBracket.jsx:306` via `onWheel={navigation.handleWheel}`

### Integration Points
- `useBracketNavigation.js` — modify or remove `handleWheel` to stop intercepting wheel events
- `MatchResultModal.jsx:279-280` — fix pair name construction to match BracketMatch pattern
- `MatchResultModal.jsx:288-289` — restructure Modal.Title for stacked doubles layout
- `KnockoutBracket.jsx:338` — update navigation hint text

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-bracket-view-ux-fixes*
*Context gathered: 2026-03-04*
