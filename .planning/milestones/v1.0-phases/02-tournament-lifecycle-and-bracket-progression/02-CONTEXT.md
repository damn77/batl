# Phase 2: Tournament Lifecycle and Bracket Progression - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Organizer controls to start a tournament (SCHEDULED → IN_PROGRESS), automatic knockout bracket advancement when any match result is submitted, automatic tournament completion (IN_PROGRESS → COMPLETED) when the organizer confirms the final match, and a champion banner display after completion. Registration closing, bracket slot updates, and tournament status transitions are all in scope. Point calculation, rankings, and player statistics are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Bracket Progression Trigger
- Any result submission — by a player OR organizer — updates the next-round bracket slot immediately
- **NOTE:** This overrides the pre-Phase 1 decision of "organizer confirmation only." Bracket is now live/optimistic.
- Both players and organizers can resubmit/update results; the bracket slot recalculates on each update
- Disputed/wrong results: organizer uses the existing MatchResultModal override to correct, which re-propagates the correct winner

### Bracket Slot Display
- Empty next-round slots show "TBD" placeholder before any winner is placed
- Auto-refresh in place via SWR mutate — bracket updates without page reload when a result is saved (same behavior as Phase 1 result submission)

### Tournament Completion Trigger
- Tournament status transitions to COMPLETED only when an **organizer** saves the result for the final match
- Player submissions on the final match advance the bracket slot but do NOT complete the tournament — organizer must confirm the final
- This creates a split: bracket progression = any submission; tournament COMPLETED = organizer-confirmed final

### Completed Tournament UI
- Champion banner displayed at the top of the tournament page showing the winner's name
- Bracket becomes read-only for players (no modal opens on click)
- Organizers retain full edit access even after COMPLETED status — no lock on organizer edits

### "Start Tournament" Placement
- "Start Tournament" button lives on the tournament detail page
- Visible only to ORGANIZER and ADMIN roles
- Triggers SCHEDULED → IN_PROGRESS status transition and closes player registration simultaneously

### Claude's Discretion
- Registration close experience for players (natural error message, disabled state, or redirect — Claude decides)
- Confirmation dialog wording/behavior before starting tournament
- Exact champion banner design (styling, placement, player name display)
- How bracket recalculation propagates through multiple rounds (e.g., if round 1 result changes, do downstream slots cascade?)

</decisions>

<specifics>
## Specific Ideas

- Bracket should feel "live" — result submissions immediately reflect in next-round slots without requiring an organizer to manually advance players
- Tournament COMPLETED is an organizer-gated milestone (prevents accidental completion from a player submitting a wrong final score)
- Even after COMPLETED, organizers should be able to fix results (no hard lock)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-tournament-lifecycle-and-bracket-progression*
*Context gathered: 2026-02-27*
