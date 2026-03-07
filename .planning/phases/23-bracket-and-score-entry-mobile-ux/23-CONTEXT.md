# Phase 23: Bracket and Score Entry Mobile UX - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Players can navigate the bracket and submit match scores on a real mobile device without workarounds. Covers bracket auto-scale, touch-safe controls with proper tap targets, fullscreen score entry modal, and numeric keyboard on iOS. No backend changes.

</domain>

<decisions>
## Implementation Decisions

### Bracket initial fit (BRKT-01)
- Keep 50% default zoom on mobile (already implemented in KnockoutBracket.jsx)
- Do NOT retry auto-fit zoom — previous attempt failed due to timing issues (documented in BRACKET-VIEW-GUIDE.md)
- 50% shows 2-3 rounds on most phones which is sufficient

### BYE row handling
- Keep `visibility: hidden` for hidden BYE rows — maintains bracket alignment and connector lines
- BYE default: hidden by default on all viewports (consistent, current behavior with `initialShowByes=false`)
- No change to BYE toggle behavior — users can toggle on if they want full bracket

### Touch drag (BRKT-02)
- Already fixed in quick-6 (commit 4b42a7e): callback ref pattern + imperative addEventListener({ passive: false })
- No additional work needed — verify it still works after other changes

### Control bar mobile layout (BRKT-03, BRKT-04)
- Single horizontal row on mobile — icons + short labels (keep "Reset", "BYEs" text alongside icons)
- Keep zoom percentage indicator on mobile (user wants to see exact zoom level)
- Buttons grow to 44px min-height on mobile via CSS media query (sm breakpoint) — desktop keeps size="sm"
- My Match wraps to second row only if it doesn't fit in the first row

### Score modal fullscreen (SCORE-01)
- Use React Bootstrap `fullscreen="sm-down"` prop on Modal — fullscreen on phones (<576px), centered dialog on tablets/desktop
- Keep existing `size="lg"` for desktop/tablet behavior

### iOS keyboard handling (SCORE-03)
- Sticky footer on Modal.Footer — `position: sticky; bottom: 0` keeps submit button pinned when iOS keyboard opens
- Works with iOS visual viewport behavior — most reliable cross-browser approach

### Score input keyboard (SCORE-02)
- Change score inputs from `type="number"` to `type="text" inputMode="numeric"` — shows integer-only keypad on iOS (no decimal key)
- Already decided in STATE.md — apply to SetsScoreForm and BigTiebreakForm

### Score input tap targets (SCORE-04)
- Score input fields grow to 44px min-height on mobile via CSS (remove `size="sm"` effect at sm breakpoint)
- Desktop keeps current compact size="sm"

### Claude's Discretion
- Exact CSS media query breakpoints for 44px tap targets (likely @media max-width: 576px)
- How to implement sticky footer on fullscreen modal (may need custom CSS class on modal-footer)
- Whether to add pattern attribute alongside inputMode="numeric" for validation
- Control bar responsive wrapping CSS details

</decisions>

<specifics>
## Specific Ideas

- User wants zoom percentage visible on mobile — don't hide it
- Icons + short labels preferred over icons-only on mobile — discoverability matters
- 44px tap targets on mobile only, not desktop — avoid bloating desktop UI
- Sticky footer over fixed positioning for iOS keyboard handling

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `KnockoutBracket.jsx`: Already has `isMobile` detection and 50% default zoom — no changes needed for BRKT-01
- `useBracketNavigation.js`: Callback ref pattern from quick-6 handles touch drag — BRKT-02 complete
- `BracketControls.jsx`: Uses ButtonGroup size="sm" — needs 44px min-height CSS for mobile
- `MatchResultModal.jsx`: Uses `<Modal centered size="lg">` — add `fullscreen="sm-down"` prop
- `SetsScoreForm.jsx`: Uses `type="number"` and `size="sm"` on Form.Control — change to `type="text" inputMode="numeric"` and add mobile 44px height
- `BigTiebreakForm.jsx`: Same input type changes needed
- `KnockoutBracket.css`: Has `@media (max-width: 576px)` section — extend with 44px tap target rules

### Established Patterns
- CSS custom properties for theming (KnockoutBracket.css :root)
- Mobile-specific CSS in @media (max-width: 576px) and @media (max-width: 768px) blocks
- React Bootstrap component props for responsive behavior (fullscreen, size)
- Imperative touch event handling (addEventListener, NOT React props) per BRACKET-VIEW-GUIDE

### Integration Points
- `KnockoutBracket.jsx` renders both BracketControls and MatchResultModal
- `FormatVisualization.jsx` renders KnockoutBracket for KNOCKOUT format tournaments
- Score forms (SetsScoreForm, BigTiebreakForm) are children of MatchResultModal
- BRACKET-VIEW-GUIDE.md documents all invariants that must be preserved

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-bracket-and-score-entry-mobile-ux*
*Context gathered: 2026-03-07*
