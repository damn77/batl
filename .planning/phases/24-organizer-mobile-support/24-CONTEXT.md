# Phase 24: Organizer Mobile Support - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Organizer can manage match results and corrections from a phone at courtside. Targeted CSS/layout pass on organizer-specific elements in MatchResultModal — the same modal handles both submission and correction (dry-run confirmation flow). No backend changes, no separate correction UI.

</domain>

<decisions>
## Implementation Decisions

### Scope
- Targeted pass on 3 organizer-specific elements: mode toggle, confirmation buttons, special outcome form
- Same MatchResultModal for both submission and correction — no separate modal
- Code review + fixes approach — no real-device screenshot verification
- Phase 23 already handled modal fundamentals (fullscreen, sticky footer, 44px targets, numeric keyboard)

### Mode toggle (Enter score / Special outcome)
- Replace inline radios with segmented ButtonGroup on mobile (<576px)
- Keep inline radios on desktop (>=576px) — responsive swap via CSS or conditional rendering
- Segmented buttons: full-width on mobile, stretches across modal width
- Active state: outline-primary (filled primary for active, outline-primary for inactive)

### Confirmation button layout
- Stack vertically on mobile (<576px): primary action (Confirm Change) full-width on top row, Go Back + Cancel side-by-side on second row
- Same stacking pattern for both confirmation states (winner-change and invalid-score)
- Desktop keeps current horizontal inline layout

### Dry-run alert content
- Show all affected player names — no truncation
- Scrollable modal body handles overflow on small screens

### Special outcome form
- Keep existing layout as-is — dropdowns already get 44px from Phase 23 CSS
- Keep 160px maxWidth on RETIRED partial score inputs — fits at 375px
- No additional mobile-specific changes needed

### Claude's Discretion
- Implementation approach for responsive mode toggle (CSS d-none/d-block swap vs useMediaQuery)
- Exact CSS for stacked confirmation buttons (flexbox wrap vs explicit stacking)
- Whether to use CSS media query or Bootstrap responsive utilities for the button stacking

</decisions>

<specifics>
## Specific Ideas

- Segmented buttons should use React Bootstrap ButtonGroup with ToggleButton or Button with active state
- Confirmation stacking: primary action on top (most prominent), secondary actions below
- All mobile breakpoints should match Phase 23 convention (@media max-width: 575.98px)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MatchResultModal.jsx`: Already has fullscreen="sm-down", 3 rendering modes, dry-run confirmation flow
- `MatchResultModal.css`: Already has @media (max-width: 575.98px) with sticky footer, 44px targets for .form-control, .form-select, .modal-footer .btn
- `SetsScoreForm.jsx` / `BigTiebreakForm.jsx`: Already mobile-ready (inputMode="numeric", size="sm" with 44px CSS override)

### Established Patterns
- Mobile CSS in MatchResultModal.css uses @media (max-width: 575.98px) — consistent with Bootstrap sm-down
- React Bootstrap component props for responsive behavior (fullscreen="sm-down")
- Inline styles used sparingly (maxWidth: 160px on partial score inputs)

### Integration Points
- MatchResultModal is rendered by KnockoutBracket.jsx — no routing changes needed
- All changes are CSS + JSX within MatchResultModal.jsx and MatchResultModal.css
- No new components needed — all changes are modifications to existing modal

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 24-organizer-mobile-support*
*Context gathered: 2026-03-07*
