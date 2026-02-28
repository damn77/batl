# Phase 1: Match Result Submission - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Players submit match scores via a format-aware form; organizers can override or enter special outcomes; once an organizer modifies a result the match is locked and players can no longer edit it. Phase does not include bracket advancement (Phase 2) or match history views (Phase 3).

</domain>

<decisions>
## Implementation Decisions

### Score entry form
- Two scoring formats in scope: **SETS** and **BIG_TIEBREAK** (other formats — STANDARD_TIEBREAK, MIXED — not handled in Phase 1)
- **SETS format**: Players enter set scores only (e.g., 6-3, 7-5). When a set reaches 6-6, score is entered as 7-6 with a separate tiebreak score input in parenthesis notation (e.g., 7-6(4))
- **BIG_TIEBREAK format**: Each game is a super tiebreak to 10. Players enter one score per tiebreak (e.g., 10:3, 7:10, 12:10). Can be best of 1 or 2 tiebreaks (per tournament config)
- Form reads the tournament's `defaultScoringRules` (and any `ruleOverrides` on the match) to determine which format to render

### Access & discovery
- Score entry is accessed from the **bracket view** — players click their match card to open a modal
- Only match participants (player1 / player2 in singles; pair members in doubles) can click the match card and open the modal
- Non-participants: match card is not clickable; no modal, no read-only view
- Organizers can click **any** match card regardless of participation

### Conflict & confirmation
- If both players submit scores, the second submission **overwrites** the first (no conflict flagging)
- After submission the bracket reflects the winner using the existing match card highlight color (Feature 011 behavior); no separate "pending" indicator is shown
- Organizer uses the same bracket-click modal to view and override results; the organizer's modal version includes edit controls
- Once an organizer modifies a result: the match is **organizer-locked**. If a participant opens the modal, they see a read-only form with the message: *"Result confirmed by organizer"*

### Special outcomes
- Organizer-only — players cannot record special outcomes
- Recorded inside the **same match modal**: a toggle or selector switches between "Enter score" and "Special outcome" modes
- Special outcome types: walkover (W/O), forfeit (FF), no-show (N/S)
- Organizer selects which player/pair wins when recording the outcome
- Bracket display: winner highlighted in **blue** (not green — distinguishes from a played result) + compact label (W/O, FF, N/S) shown instead of a score

### Claude's Discretion
- Exact modal layout (field order, labels, button placement)
- How many sets the SETS format form renders (derive from `winningSets` in scoring rules)
- Error messages for invalid score combinations (e.g., entering a third set when the match is already won)
- Specific shades of blue/green — use `bracketColors.js` config (Feature 011)

</decisions>

<specifics>
## Specific Ideas

- Blue background for special-outcome winners (vs green for standard winners) — user-suggested, should be configurable via `bracketColors.js`
- Tiebreak notation: 7-6(4) style — loser's tiebreak score in parentheses, consistent with standard tennis notation

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-match-result-submission*
*Context gathered: 2026-02-26*
