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
- Middle mouse wheel scrolls up/down (no longer zooms)
- Ctrl+wheel zooms in/out (like Google Maps / standard web convention)
- Support both axes: vertical wheel for up/down, shift+wheel or trackpad horizontal gesture for left/right
- Zoom remains available via +/- buttons in control bar and Ctrl+wheel
- Remove `e.preventDefault()` for non-Ctrl wheel events so native scroll behavior works

### Navigation Hint Text
- Update the current "Scroll to zoom, drag to pan" hint to reflect new controls
- Claude's discretion on exact wording

### Pair Name Display in Modal
- Construct pair names from individual player names: "Alice Smith / Bob Jones vs Carol Lee / Dave Kim"
- Same format as BracketMatch.jsx already uses (`pair.player1.name / pair.player2.name`)
- Single line in modal title, natural browser wrapping for long names
- No special vertical stacking or line breaks needed

### Claude's Discretion
- Exact navigation hint wording
- Whether to extract a shared utility for pair name construction (DRY with BracketMatch's getPlayerName)

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
- `useBracketNavigation.js` — modify `handleWheel` to scroll instead of zoom (Ctrl+wheel for zoom)
- `MatchResultModal.jsx:279-280` — fix pair name construction to match BracketMatch pattern
- `KnockoutBracket.jsx:338` — update navigation hint text

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-bracket-view-ux-fixes*
*Context gathered: 2026-03-04*
