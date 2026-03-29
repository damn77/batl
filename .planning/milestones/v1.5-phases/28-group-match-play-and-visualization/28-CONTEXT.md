# Phase 28: Group Match Play and Visualization - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Players enter group match results and the tournament page shows groups with fixtures, standings, and completion progress. Covers group match score entry (player and organizer), format rule enforcement, group visualization with standings and match lists, per-group completion tracking, and COMBINED tournament lifecycle guards preventing premature auto-completion. Group standings tiebreaker logic and combined-format advancement are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Match entry flow
- Players/organizers tap a match row in GroupStandingsTable's matches section to open the existing MatchResultModal — no new score entry UI needed
- Matches section defaults to **expanded** when tournament is IN_PROGRESS; collapsed for completed tournaments
- Same authorization as knockout: players in the match can submit, organizer can submit and override (organizer-lock)
- **No dry-run mode** for group matches — no cascade impact (no bracket advancement, no loser routing)
- Organizer corrections update directly without confirmation modal — no cascade risk in group stage
- Completed matches show existing status badge (SCHEDULED/COMPLETED) on each match row — reuse MatchResultDisplay

### Group display layout
- **Progress bar per group** — thin progress bar under each group header filling as matches complete
- **Accordion layout** — one group expanded at a time using React Bootstrap Accordion (consistent with v1.4 tournament page accordion pattern). Group name + progress bar as accordion header
- Standings table columns: Position, Player, Played, W, L, Sets W-L, Games W-L, **Set differential (+/-)**, **Game differential (+/-)**, Points
- For COMBINED format: **stacked sections** — group stage section on top, knockout bracket below. During group stage, bracket section shows "Knockout bracket will appear after group stage" placeholder

### Lifecycle guards
- **Backend guard** in `checkAndCompleteTournament()`: if tournament is COMBINED and no knockout bracket exists, skip auto-completion. Bulletproof regardless of which client submits the last result
- For GROUP-only tournaments: auto-complete after all group matches are COMPLETED/CANCELLED (same pattern as knockout)
- For COMBINED tournaments: when all group matches complete, show a **prominent banner** to organizer: "Group stage complete — Ready to generate knockout bracket" with action button. Tournament stays IN_PROGRESS

### Mobile responsiveness (375px)
- Standings table at 375px: **hide secondary columns** (Sets W-L, Games W-L) — show only Position, Player, P, W, L, +/- differential, Pts. Consistent with v1.4 responsive column-hiding pattern
- Match rows: **compact single-row format** with player names + score + status badge. 44px minimum tap target height. Tap opens fullscreen MatchResultModal (existing v1.4 pattern)
- Accordion navigation via React Bootstrap Accordion component — already in project, consistent with existing patterns

### Claude's Discretion
- Exact accordion styling and animation
- Progress bar visual design (color, height, animation)
- Standings column widths and responsive breakpoint thresholds
- How doubles pairs display in standings rows ("Player A / Player B" formatting)
- Error state handling for failed result submissions
- SWR mutation strategy for refreshing standings after result entry

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Group play requirements
- `.planning/milestones/v1.4-REQUIREMENTS.md` — GPLAY-01 through GPLAY-05 and GVIEW-01 through GVIEW-04 requirements with acceptance criteria

### Match result infrastructure (reuse entirely)
- `backend/src/services/matchResultService.js` — Match result submission with authorization, organizer-lock, dry-run. Group matches use this service unchanged
- `frontend/src/components/MatchResultModal.jsx` — Score entry modal with SETS/BIG_TIEBREAK support, special outcomes. Reuse for group matches
- `frontend/src/components/MatchResultDisplay.jsx` — Match status badges and score formatting. Reuse for group match rows
- `frontend/src/services/matchService.js` — `submitMatchResult()` API client

### Group display components (extend)
- `frontend/src/components/GroupStandingsTable.jsx` — Existing standings table with match display. Extend with: accordion layout, progress bar, differential columns, expanded-by-default behavior, mobile column hiding
- `frontend/src/components/FormatVisualization.jsx` — Routes GROUP/COMBINED formats to appropriate display. Integration point for group stage visualization
- `frontend/src/components/CombinedFormatDisplay.jsx` — COMBINED format layout. Add stacked group/bracket sections with completion banner

### Tournament lifecycle (guard extension)
- `backend/src/services/tournamentLifecycleService.js` — `checkAndCompleteTournament()` needs COMBINED format guard to prevent premature completion when only group matches are done

### Match data fetching
- `frontend/src/services/tournamentViewService.js` — `useMatches(tournamentId, { groupId }, shouldFetch)` hook for fetching group matches. Already supports groupId filter

### Phase 27 context (predecessor)
- `.planning/phases/27-group-formation/27-CONTEXT.md` — Group formation decisions: match numbering offsets, existing Match model with groupId FK, round-robin fixture generation

### Mobile patterns (v1.4 reference)
- `frontend/src/components/KnockoutBracket.jsx` — Mobile viewport patterns, touch targets (44px)
- `.planning/phases/25-app-wide-responsive-pass/25-CONTEXT.md` — v1.4 responsive column-hiding and mobile layout decisions

### Database schema
- `backend/prisma/schema.prisma` — Match model with groupId FK, Group/GroupParticipant models

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MatchResultModal`: Full score entry UI (SETS/BIG_TIEBREAK, special outcomes, organizer-lock). Reuse directly for group matches
- `MatchResultDisplay`: Status badges and score formatting for match rows. Reuse in group match list
- `matchResultService.submitResult()`: Backend result submission with authorization. Works for group matches — `advanceBracketSlot()` returns early when no roundId
- `GroupStandingsTable`: Existing standings calculation with W/L/Points via useMemo from match data. Extend with new columns and accordion
- `tournamentViewService.useMatches()`: SWR hook already supports `{ groupId }` filter
- React Bootstrap Accordion: Already in project dependencies, used in v1.4 tournament page layout

### Established Patterns
- Match result submission: `PATCH /api/v1/matches/:id/result` → `matchResultService.submitResult()` → no cascade for group matches (no roundId)
- Mobile column hiding: v1.4 responsive pattern with CSS media queries hiding secondary table columns at 375px
- Tournament lifecycle: `checkAndCompleteTournament()` fires on organizer result submission — needs COMBINED guard
- SWR mutation: `mutateMatches()` after result submission to refresh match list and recalculate standings

### Integration Points
- `FormatVisualization.jsx` — Route GROUP/COMBINED to updated GroupStandingsTable with accordion
- `CombinedFormatDisplay.jsx` — Add group completion banner for organizers
- `tournamentLifecycleService.js` — Add COMBINED format guard in `checkAndCompleteTournament()`
- `GroupStandingsTable.jsx` — Major extension: accordion, progress bar, differential columns, expanded default, mobile responsiveness

</code_context>

<specifics>
## Specific Ideas

- Matches section always expanded during IN_PROGRESS — organizer and players shouldn't need extra taps to enter scores
- Progress bar per group as visual completion indicator under group header
- "Group stage complete" banner with action button for COMBINED tournaments — clear next-step guidance for organizers
- Differential columns (+/-) for sets and games to make tiebreaker-relevant data visible (prepares for Phase 29)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 28-group-match-play-and-visualization*
*Context gathered: 2026-03-17*
