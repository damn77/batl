# Phase 4: Configuration and Consolation Draw - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 delivers two things:
1. A Match Guarantee configuration field (Single Elimination / Double Elimination) on the tournament create/edit form that organizers can set
2. At draw time, if Double Elimination (MATCH_2) is selected, a CONSOLATION bracket record is automatically generated alongside the MAIN bracket using the mirror-draw structure (loser of Main Match N vs loser of Main Match N+1)

Phase 4 is **backend-focused**. The consolation bracket structure is created in the database and the success message after draw confirms it. UI rendering of the consolation bracket with TBD slots is Phase 6 scope.

</domain>

<decisions>
## Implementation Decisions

### Match Guarantee field options
- Dropdown shows **three options**: "Single Elimination" (active) + "Double Elimination (2 matches)" (active) + "Until Placement" (greyed-out, disabled, coming soon)
- No separate MATCH_1 guarantee option — the BYE edge case (player loses after a BYE → should they enter consolation?) is part of Double Elimination behavior, not a separate guarantee level
- No help text below the dropdown

### Default value
- New tournaments default to **Double Elimination (MATCH_2)** — consolation on by default, organizer opts out if not wanted
- Existing tournaments without `matchGuarantee` in their `formatConfig` are treated as **Single Elimination** (backward-compatible, no consolation bracket generated)

### Edit lock
- Match Guarantee field is **locked when tournament status becomes ACTIVE** (i.e., when the draw is executed and the tournament moves to ACTIVE)
- Locked state: greyed-out/disabled dropdown — field remains visible showing the current value, but not editable
- Before ACTIVE: organizer can freely change the value

### Consolation bracket naming
- The bracket is called **"Consolation Bracket"** in all user-facing text
- After a MATCH_2 draw executes, the success message explicitly mentions that a Consolation Bracket was generated (e.g., "Draw completed. Main bracket and Consolation Bracket generated.")
- No bracket rendering in Phase 4 — TBD slot display is Phase 6 scope

### Claude's Discretion
- Exact wording of the draw success message
- How the disabled "Until Placement (coming soon)" option is styled
- Any validation error messages for edge cases (e.g., trying to change guarantee after ACTIVE)

</decisions>

<specifics>
## Specific Ideas

- The existing `KnockoutConfigPanel.jsx` component already has a `matchGuarantee` dropdown — update it rather than rebuild
- The "Until Placement" greyed-out option replaces the current MATCH_1/MATCH_3 options; they are removed entirely
- bracketPersistenceService line 227 has `matchGuarantee: 'MATCH_1'` hardcoded — this must read from `formatConfig.matchGuarantee` and map to the correct draw behavior

</specifics>

<deferred>
## Deferred Ideas

- Until Placement guarantee level — v1.2 future feature (GUAR-02)
- MATCH_1 guarantee edge case (BYE player loses → always enters consolation) — this is considered standard MATCH_2 behavior, not a separate option

</deferred>

---

*Phase: 04-configuration-and-consolation-draw*
*Context gathered: 2026-02-28*
