# Phase 30: Combined Format Advancement - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Organizer configures advancement rules for COMBINED tournaments at creation time, then after group stage completion triggers advancement to generate one or two knockout brackets. Covers advancement configuration UI, spillover selection via position-based waterfall with cross-group ranking, advancement preview with confirmation, bracket generation using existing seeding infrastructure, group result locking, and advancement revert. Group stage play, standings tiebreakers, and tournament ranking points are separate phases (28, 29, 31).

</domain>

<decisions>
## Implementation Decisions

### Advancement configuration timing & UI
- Organizer configures advancement rules **at tournament creation** as part of COMBINED format setup (alongside group count, seeded rounds)
- Configuration editable until groups start (ADV-04) — locked once tournament is IN_PROGRESS
- **Simple top-N + remainder model**: organizer enters "Top N advance to main bracket" and optionally "Next M advance to secondary bracket"
- Maximum **2 knockout brackets** (main + secondary). No consolation brackets within combined format (COMB-D01 deferred)
- Advancement counts do NOT need to be powers of 2 — system handles byes via existing bracket generation infrastructure (Feature 009)
- Not all players need to advance — players not assigned to either bracket simply don't proceed

### Spillover selection algorithm
- **Position-based waterfall**: fill bracket slots by group position, starting from 1st place
- All players at a position advance if slots remain. When there are fewer remaining slots than groups at a position, **cross-group ranking** picks the best
- Cross-group ranking uses the **same 6-level tiebreaker chain** from Phase 29 (wins → H2H skipped for cross-group → set diff → game diff → fewer games → manual)
- Example: 3 groups of 3, 4 main + 4 secondary → all 1st proceed to main (3), best 2nd to main (1), remaining 2nds to secondary (2), best 2 of 3 3rds to secondary (2), worst 3rd eliminated
- Main bracket fills first, then secondary bracket with remaining qualifiers

### Bracket seeding from group results
- **Group position determines seed order**: 1st-place finishers are top seeds, 2nd-place next, etc.
- Within same group position, cross-group ranking orders the seeds
- If more advancing players than seeded positions (per Feature 009 ranges: 2/4/8/16 seeded), top N by group standing get seeded positions, rest placed unseeded
- **Always SEEDED draw mode** — no manual draw option for group-advanced brackets
- Uses existing Feature 010 seeding placement algorithm with group-derived seed rankings

### Advancement trigger flow
- "Advance to Knockout" button appears after all group matches complete (existing Phase 28 banner integration point at `CombinedFormatDisplay.jsx:55`)
- Button **blocked** until all group ties are resolved (Phase 29 manual override requirement)
- **Preview before confirming**: show which players advance to which bracket, highlight spillover picks (cross-group selections), show bracket sizes with byes
- "Confirm & Generate Brackets" button commits: creates Bracket/Round/Match records atomically
- **Group results locked** after advancement — match results become read-only. To edit, organizer reverts advancement first

### Advancement revert
- Organizer can revert advancement (delete knockout brackets, unlock group results)
- Revert only available if **no knockout matches have results yet**
- Reuses existing revert infrastructure pattern from v1.3

### Post-advancement tournament page
- **Stacked layout**: group stage accordion collapsed by default (read-only), knockout bracket(s) shown prominently below as active focus
- Consistent with Phase 28's stacked `CombinedFormatDisplay` layout
- Bracket labels: **"Main Bracket"** and **"Secondary Bracket"** — neutral naming
- Non-advancing players see group results normally, no explicit "eliminated" messaging
- **"My Match" auto-navigates** to the correct bracket for the logged-in player (extends Feature 011 BracketMyMatch)

### Combined tournament completion
- Tournament auto-completes only when **all knockout brackets** (main + secondary) are finished (COMB-08)
- Existing COMBINED lifecycle guard in `tournamentLifecycleService.js` already prevents premature completion
- Works for both singles and doubles (COMB-09) via existing pair/player duality patterns

### Claude's Discretion
- API endpoint paths and request/response shapes
- Prisma schema changes for advancement config storage (may use existing `advancementCriteria` JSON field on Group or `formatConfig` on Tournament)
- Advancement preview component design and layout
- Cross-group ranking implementation details (service structure)
- Error handling for edge cases (all groups same size vs uneven)
- SWR cache invalidation strategy after advancement
- Revert implementation details (which records to delete, order of operations)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Advancement requirements
- `.planning/milestones/v1.4-REQUIREMENTS.md` — COMB-01 through COMB-09 and ADV-01 through ADV-04 requirements with acceptance criteria

### Existing bracket generation infrastructure (reuse)
- `backend/src/services/bracketPersistenceService.js` — `generateBracket()` creates Bracket/Round/Match atomically. Phase 30 adapts this to accept group-qualified players instead of registered players
- `backend/src/services/seedingPlacementService.js` — Feature 010 seeding placement algorithm. Reuse with group-derived seed rankings
- `backend/src/services/bracketService.js` — Feature 009 bracket structure templates (4-128 players), BYE calculation

### Group standings infrastructure (consume)
- `backend/src/services/groupStandingsService.js` — Backend standings computation with 6-level tiebreaker chain. Phase 30 consumes standings to determine advancement order
- `backend/prisma/schema.prisma` — Group model has `advancementCriteria` field (unused, ready for Phase 30). GroupParticipant, Match, Bracket models

### Combined format display (integration point)
- `frontend/src/components/CombinedFormatDisplay.jsx` — Line 55: TODO for Phase 30 wiring. "Generate Knockout Bracket" button placeholder
- `frontend/src/components/FormatVisualization.jsx` — Routes COMBINED format. Needs condition for IN_PROGRESS + groups complete + no bracket state

### Tournament lifecycle
- `backend/src/services/tournamentLifecycleService.js` — COMBINED guard in `checkAndCompleteTournament()` (lines 328-342). `advanceBracketSlot()` for knockout match progression

### Revert infrastructure
- `backend/src/services/bracketPersistenceService.js` — Existing revert pattern: delete brackets/rounds/matches, reopen registration

### Phase 27-29 context (predecessor decisions)
- `.planning/phases/27-group-formation/27-CONTEXT.md` — Group formation, snake draft, match numbering offsets
- `.planning/phases/28-group-match-play-and-visualization/28-CONTEXT.md` — Group display, lifecycle guards, completion banner
- `.planning/phases/29-group-standings-and-tiebreakers/29-CONTEXT.md` — Tiebreaker chain, manual override blocks advancement

### Project context
- `.planning/PROJECT.md` — v1.5 milestone goals, constraints, key decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bracketPersistenceService.generateBracket()`: Atomic Bracket/Round/Match creation in Prisma transaction. Adapt to accept group-qualified player list instead of tournament registrations
- `seedingPlacementService.generateSeededBracket()`: Feature 010 seeding algorithm with deterministic randomization. Reuse with group-derived seed rankings
- `bracketService.getBracketByPlayerCount()`: Feature 009 bracket templates (structure, byes, bracket size). Validates player counts 4-128
- `groupStandingsService`: Backend standings with tiebreaker chain. Provides sorted standings per group with position data
- `CombinedFormatDisplay.jsx`: Already renders groups + knockout stacked. Has TODO at line 55 for advancement wiring
- `BracketMyMatch`: "My Match" navigation for knockout brackets. Extend for multi-bracket support
- `tournamentLifecycleService.checkAndCompleteTournament()`: COMBINED guard already in place — prevents auto-completion without knockout brackets

### Established Patterns
- Atomic Prisma `$transaction` for bracket persistence (bracketPersistenceService)
- Doubles duality: `pair1Id ?? player1Id` nullish coalescing for singles/doubles code paths
- SWR hooks in `tournamentViewService.js` for data fetching
- Error handling: `makeError(code, message)` pattern
- API client: axios-based services in `frontend/src/services/` with apiClient error structure
- Match numbering: consolation uses 1000+ offset, groups use 100/200/300+ per group

### Integration Points
- `CombinedFormatDisplay.jsx` line 55 — Wire advancement button to new API call
- `FormatVisualization.jsx` — Add advancement UI state for COMBINED IN_PROGRESS + groups complete
- `backend/src/index.js` — Register new advancement routes
- `tournamentLifecycleService.js` — Multi-bracket completion check (both main + secondary must finish)
- Group model `advancementCriteria` field — Store advancement config
- Tournament `formatConfig` — Store top-N and secondary-M counts

</code_context>

<specifics>
## Specific Ideas

- Advancement preview should clearly show the waterfall: "All 1st-place → Main, Best 1 of 2nd-place → Main, Remaining 2nd-place → Secondary, Best 2 of 3rd-place → Secondary, 1 eliminated"
- "Main Bracket" and "Secondary Bracket" as neutral bracket labels (not "consolation")
- Post-advancement layout: groups collapsed (locked/read-only), brackets prominent — same visual hierarchy shift as knockout IN_PROGRESS tournaments
- No consolation brackets within combined format (COMB-D01 explicitly deferred)

</specifics>

<deferred>
## Deferred Ideas

- **COMB-D01**: Consolation brackets within combined format tournaments — explicitly not planned for this format
- Organizer-customizable bracket names (instead of fixed "Main"/"Secondary")
- Elimination messaging for non-advancing players (final placement display)

</deferred>

---

*Phase: 30-combined-format-advancement*
*Context gathered: 2026-03-18*
