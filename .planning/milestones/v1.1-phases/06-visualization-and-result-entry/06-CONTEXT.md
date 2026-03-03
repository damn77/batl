# Phase 6: Visualization and Result Entry - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Add the consolation bracket to the tournament page alongside the main bracket. Enable consolation match result entry using existing UI components. Visually block matches where player slots are not yet determined (awaiting main bracket outcomes). Provide consolation opt-out affordance via the existing ConsolationOptOutPanel. No new backend APIs are introduced — this phase is frontend wiring only.

</domain>

<decisions>
## Implementation Decisions

### TBD slot appearance
- Label for undetermined player slots: plain "TBD" text
- Blocked match cards use a different background color (tinted/muted) to visually distinguish pending matches from active ones
- Only the result entry action (button/click trigger) is disabled — the match card itself still renders normally and is otherwise interactive
- Fully resolved consolation matches (both slots known) look identical to main bracket matches — no consolation-specific styling

### Result entry for consolation
- Reuse the existing MatchResultModal as-is — no consolation-specific labels, context, or modifications
- Same role permissions as main bracket result entry (whatever roles can enter main results can enter consolation results)
- After submission: refresh the bracket in place, same as the existing main bracket post-submission behavior
- RETIRED outcomes: same behavior as main bracket (no consolation-specific handling)

### Opt-out panel integration
- ConsolationOptOutPanel appears **below** the consolation bracket section
- Panel is only visible when the consolation bracket exists and the tournament is in progress (not always-visible on MATCH_2 tournaments)
- A divider or standard spacing separates the consolation bracket from the opt-out panel below it
- Organizer view (list of all registrations): collapsed by default, expandable on demand — prevents page overload
- Player view: always expanded (single button, low footprint)

### Claude's Discretion
- Exact background color/tint value for TBD/blocked match cards (use a subtle light gray or muted color consistent with existing Bootstrap theme)
- Bracket section header text and visual separation between main and consolation brackets
- Collapse/expand toggle label and icon for organizer opt-out list

</decisions>

<specifics>
## Specific Ideas

- The consolation bracket reuses the existing `KnockoutBracket` component — the TBD treatment should be an extension of that component's existing slot rendering, not a wrapper
- "Collapsed by default" for the organizer opt-out panel means showing a header like "Consolation Opt-Out Management" with an expand button/chevron — standard Bootstrap accordion or collapse pattern

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-visualization-and-result-entry*
*Context gathered: 2026-03-03*
