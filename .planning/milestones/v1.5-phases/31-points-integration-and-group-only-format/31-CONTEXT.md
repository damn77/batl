# Phase 31: Points Integration and Group-Only Format - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Award ranking points based on group placement for GROUP and COMBINED tournaments, implement knockout point supersede with tier-based offset hierarchy for COMBINED tournaments, deliver GROUP-only tournament end-to-end lifecycle (auto-complete, auto-derived point results), and show advancement status badges on group standings (GVIEW-05). Covers backend point calculation extensions, GROUP format lifecycle completion, and frontend advancement badge display. Does NOT include new point configuration UI, Swiss format, or consolation brackets within combined format.

</domain>

<decisions>
## Implementation Decisions

### Group placement point calculation
- **D-01:** Reuse existing PLACEMENT formula: `(groupSize - placement + 1) × multiplicativeValue × (doublePoints ? 2 : 1)`
- **D-02:** Participant count = **group size** (not total tournament participants). Each group is its own mini-tournament for point purposes
- **D-03:** Same TournamentPointConfig (multiplicativeValue, doublePoints) applies to both group placement and knockout points — no separate group config
- **D-04:** Uneven groups are acceptable — 1st in a 4-player group earns more than 1st in a 3-player group. Larger groups are harder, formula naturally handles this

### Knockout supersede logic (COMBINED tournaments)
- **D-05:** Single point award at tournament end — points calculated once after all knockout brackets complete. Non-advancing players get group placement points. Advancing players get knockout points only (group points never created)
- **D-06:** Knockout points use **bracket participant count** (not total tournament participants) as the formula input
- **D-07:** **Offset-based tier hierarchy** guarantees: worst main bracket result > best secondary bracket result > best group-only placement. Offsets derived from group participant count ensure the hierarchy even when bracket sizes differ. Claude has discretion on the exact offset derivation formula

### GROUP-only tournament flow
- **D-08:** Auto-complete when all group matches are in terminal state (COMPLETED/CANCELLED) — same pattern as knockout auto-complete via `checkAndCompleteTournament`
- **D-09:** GROUP-only tournament page reuses existing FormatVisualization GROUP path — groups in accordion, standings tables, progress bars. No bracket section at all
- **D-10:** Manual point trigger after completion — organizer goes to point config page, clicks 'Calculate Points'. Same UX as knockout tournaments
- **D-11:** Backend **auto-derives results from group standings positions** — organizer clicks calculate, backend reads computed standings and builds results array. Requires all ties resolved first (block calculate-points if unresolved ties exist)

### Advancement status display (GVIEW-05)
- **D-12:** Small colored **badge/pill next to player name** in standings row: "Main" (primary color) or "Secondary" (secondary color). Non-advancing players have no badge — absence of badge is the signal
- **D-13:** No "eliminated" indicator or row grey-out for non-advancing players (consistent with Phase 30 decision)
- **D-14:** Badges appear **as soon as a group's matches are all complete** — based on projected advancement from current standings + tournament advancement config. Not only after formal advancement confirmation
- **D-15:** Same badge style always — no visual difference between projected and confirmed advancement. Advancement config makes the projection reliable

### Claude's Discretion
- Exact offset derivation formula for tier hierarchy (D-07) — ensure main > secondary > group mathematically
- API endpoint changes/additions for group-aware point calculation
- How to extend `calculatePoints` flow to handle GROUP and COMBINED formats (new service method vs branching in existing)
- Prisma query to derive results from group standings (may call `groupStandingsService.getGroupStandings` per group)
- Badge component implementation (React Bootstrap Badge or custom pill)
- How projected advancement badges are computed on the frontend (call advancement preview endpoint, or compute from standings + formatConfig)
- SWR cache invalidation after point calculation
- Error handling for calculate-points when ties are unresolved

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Points requirements
- `.planning/milestones/v1.4-REQUIREMENTS.md` — PTS-01 through PTS-04 and GVIEW-05 requirements with acceptance criteria

### Existing point calculation infrastructure (extend)
- `backend/src/services/pointCalculationService.js` — `calculatePlacementPoints()`, `awardPointsSinglesTournament()`, `awardPointsDoublesTournament()`, `deriveConsolationResults()`. Phase 31 extends this to handle group placements and offset-based hierarchy
- `backend/src/api/controllers/pointCalculationController.js` — `POST /calculate-points` handler. Needs to support GROUP and COMBINED format result derivation

### Group standings infrastructure (consume for point derivation)
- `backend/src/services/groupStandingsService.js` — `computeGroupStandings()` returns sorted standings with `position` field per entity. `getGroupStandings(groupId)` is the DB-backed entry point. Phase 31 reads these positions to derive point results

### Tournament lifecycle (extend for GROUP completion)
- `backend/src/services/tournamentLifecycleService.js` — `checkAndCompleteTournament()` has COMBINED guard (bracket count check). Phase 31 adds GROUP format auto-completion when all group matches are terminal

### Advancement infrastructure (consume for badge display)
- `backend/src/services/advancementService.js` — `computeWaterfall()` and advancement preview. Phase 31 frontend uses advancement config + standings to project badge display
- `frontend/src/components/CombinedFormatDisplay.jsx` — Advancement flow, preview modal. Badge logic integrates here

### Group standings display (extend for badges)
- `frontend/src/components/GroupStandingsTable.jsx` — Renders standings per group. Phase 31 adds advancement badge next to player names
- `frontend/src/components/FormatVisualization.jsx` — FORMAT routing (GROUP vs COMBINED vs KNOCKOUT). GROUP path already works for display

### Point configuration
- `backend/prisma/schema.prisma` — TournamentPointConfig model, RankingEntry, TournamentResult models
- `frontend/src/pages/TournamentPointConfigPage.jsx` — Point config UI used by organizers

### Prior phase context (predecessor decisions)
- `.planning/phases/29-group-standings-and-tiebreakers/29-CONTEXT.md` — Tiebreaker chain, standings computation moved to backend, manual override
- `.planning/phases/30-combined-format-advancement/30-CONTEXT.md` — Advancement waterfall, bracket generation from groups, group result locking, bracket labels

### Project context
- `.planning/PROJECT.md` — v1.5 milestone goals, constraints

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `pointCalculationService.calculatePlacementPoints()`: Exact formula needed for group points — extend to accept group-derived results
- `pointCalculationService.awardPointsSinglesTournament()` / `awardPointsDoublesTournament()`: Reuse for awarding group points. Needs branching for GROUP vs KNOCKOUT result sources
- `groupStandingsService.getGroupStandings(groupId)`: Returns sorted standings with position — directly provides the placement data for point calculation
- `groupStandingsService.computeGroupStandings()`: Pure function for projected advancement computation on frontend
- `advancementService.computeWaterfall()`: Determines which positions advance to which bracket — needed for badge projection and offset tier calculation
- `tournamentLifecycleService.checkAndCompleteTournament()`: Extend with GROUP format completion condition (all group matches terminal, no brackets expected)
- `FormatVisualization.jsx` GROUP path: Already renders groups in accordion — no changes needed for GROUP-only display

### Established Patterns
- Manual point trigger via `POST /api/v1/tournaments/:id/calculate-points` with results array
- Atomic Prisma `$transaction` for point awards (TournamentResult + RankingEntry updates)
- SWR hooks in `tournamentViewService.js` for frontend data fetching
- React Bootstrap Badge component available for advancement pills
- `makeError(code, message)` for error responses

### Integration Points
- `pointCalculationService` — Add group result derivation logic (read standings → build results array)
- `tournamentLifecycleService.checkAndCompleteTournament()` — Add GROUP format completion branch
- `GroupStandingsTable.jsx` — Add advancement badge rendering per standings row
- `pointCalculationController` — Extend to support GROUP/COMBINED format (auto-derive vs manual results)
- `TournamentPointConfigPage.jsx` — May need "Calculate Points" button visibility for GROUP tournaments

</code_context>

<specifics>
## Specific Ideas

- Offset hierarchy: main bracket offset > secondary bracket offset > 0 (group-only). The exact offset could be max group points + 1 for secondary, and max secondary points + 1 for main — ensuring strict ordering
- Badge projection: when a group completes all matches, compute projected advancement from standings positions + tournament `formatConfig` advancement rules. This can be done client-side since all data is available
- "Calculate Points" blocked (with error message) if any group has unresolved ties — organizer must resolve ties first via Phase 29 manual override flow
- For COMBINED tournaments, the single calculate-points call at end needs to: (1) read all group standings for non-advancing players, (2) read knockout bracket results for advancing players, (3) compute offsets, (4) award all points atomically

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 31-points-integration-and-group-only-format*
*Context gathered: 2026-03-28*
