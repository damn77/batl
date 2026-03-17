# Project Research Summary

**Project:** BATL v1.5 — Group & Combined Tournaments
**Domain:** Round-robin group stage, combined format (groups → knockout), advancement configuration, standings tiebreakers
**Researched:** 2026-03-15
**Confidence:** HIGH

## Executive Summary

BATL v1.5 adds group stage and combined tournament formats to a fully functional v1.4 system. **No new npm packages are required.** Every capability (round-robin scheduling, snake draft, standings tiebreakers, advancement configuration, group visualization) is achievable with the existing stack. The `seedrandom` library (already installed at 3.0.5) covers deterministic snake-draft group formation.

The codebase already contains model stubs (`Group`, `GroupParticipant`, `GroupStandingsTable.jsx`, `GroupConfigPanel.jsx`, `CombinedFormatDisplay`) and format enum values (GROUP, COMBINED) — this milestone fills in the functional gaps, not building from scratch.

**One schema migration is required:** add nullable `pairId` to `GroupParticipant` for doubles support.

---

## Key Findings

### Recommended Stack

No new runtime dependencies. Existing stack handles all requirements:

| Capability | Implementation | Notes |
|-----------|---------------|-------|
| Round-robin scheduling | Polygon rotation algorithm (~20 lines pure JS) | All npm alternatives unmaintained (4yr old, ~232 weekly downloads) |
| Snake draft seeding | `seedrandom` 3.0.5 (already installed) | Same pattern as `seedingPlacementService.js` |
| Group standings | New service + existing `GroupStandingsTable.jsx` shell | Backend pattern from `rankingCalculator.js` |
| Advancement config | New Prisma model fields + config UI | `CombinedConfigPanel.jsx` shell exists |
| Combined format display | Existing `CombinedFormatDisplay` + `FormatVisualization` switch | Fill functional gaps |

### Expected Features

**Table stakes:**
- Round-robin scheduling within groups (circle method — mathematical, deterministic)
- Group standings with automated tiebreakers (set/point diff → fewer games → head-to-head)
- Manual organizer tiebreaker resolution for 3-way circular locks
- Snake draft group formation with configurable seeded rounds
- Combined format: groups → one or more knockout brackets
- Position-based advancement + "best of N" spillover for odd groups
- Result entry within groups (reuse existing match result patterns)
- Points: group placement for non-advancing, knockout supersedes for advancing

**Differentiators:**
- Cross-group "best of N" ranking table (FIFA World Cup pattern for spillover)
- Dedicated advancement configuration UI
- Bracket size validation at setup time (advancement count must match valid bracket sizes from Feature 009)

**Deferred:**
- Swiss system (explicitly out of scope — future milestone)
- Consolation brackets in combined format (out of scope)
- Group stage card-stacking mobile layout (column hiding sufficient)

### Architecture Approach

**Existing infrastructure reuse:**
- `bracketPersistenceService.generateBracket` accepts an arbitrary player list — combined advancement produces the ordered list and calls existing code unchanged
- The `advanceBracketSlot` guard `if (!updatedMatch.roundId) return` in `tournamentLifecycleService.js` already skips group matches — group dispatch is purely additive
- Match result submission reuses existing `MatchResultModal` and `matchResultService` with group-context dispatch
- Knockout phase of combined tournaments reuses 100% of existing bracket generation, visualization, and lifecycle code

**New components needed:**
- `groupSchedulerService.js` — round-robin schedule generation (polygon rotation)
- `groupDrawService.js` — snake draft formation with seeded rounds
- `groupStandingsService.js` — standings calculation with 6-level tiebreaker chain
- `groupAdvancementService.js` — position-based advancement + cross-group spillover ranking
- `GroupAdvancementPanel.jsx` — organizer UI for configuring advancement rules
- `GroupFormationSection.jsx` — organizer UI for group count and seeded rounds
- `GroupMatchCard.jsx` — result entry within group standings view

**Modified components:**
- `matchResultService.js` — add group match dispatch (guard against bracket cascade)
- `tournamentLifecycleService.js` — two-stage lifecycle for combined (group phase complete → generate knockout)
- `checkAndCompleteTournament` — COMBINED completion guard (both phases must finish)
- `GroupStandingsTable.jsx` — add head-to-head tiebreaker (currently TODO at line 121), result entry UX
- `FormatVisualization.jsx` — GROUP/COMBINED switch cases
- `pointCalculationService.js` — group placement points, knockout supersede logic

### Critical Pitfalls

1. **GroupParticipant schema gap (BLOCKER for doubles):** Model has only `playerId`, no `pairId`. Every doubles group tournament fails until schema migration adds `pairId` with `@@unique([groupId, pairId])`. Must be Phase 1.

2. **matchResultService accidentally safe but fragile:** The cascade-clear block uses `tx.bracket.findUnique({ where: { id: null } })` which returns null currently. One `findUniqueOrThrow` refactor away from production 500 on group matches. Needs explicit guard.

3. **Combined format needs two-stage lifecycle:** `checkAndCompleteTournament` knows nothing about phase boundaries. "All group matches done → generate knockout bracket" requires new `checkGroupStageComplete` function.

4. **Three-way head-to-head circular deadlock:** A>B, B>C, C>A cycle — algorithm must detect when head-to-head provides zero information and fall through to next tiebreaker without partial application. Must block advancement until organizer manually resolves.

5. **GroupStandingsTable is singles-only:** Reads `match.player1?.id` / `match.player2?.id`, will show all zeros for doubles.

6. **Point supersede timing:** Group placement points must be recorded provisionally, then replaced when knockout results come in. Current `TournamentResult` has no provisional concept.

7. **Cross-group normalization for spillover:** When groups are unequal sizes, "best 3rd place" comparison needs normalization (e.g., win rate instead of raw wins). Must validate advancement count against bracket sizes from Feature 009.

---

## Implications for Roadmap

### Suggested Phase Structure (5-6 phases)

1. **Group Formation Backend** — schema migration (pairId), snake draft, round-robin generation, start-tournament validation for GROUP/COMBINED
2. **Group Match Result Entry + Lifecycle** — group dispatch in matchResultService, checkGroupStageComplete, GroupMatchCard, result entry in GroupStandingsTable
3. **Group Standings + Tiebreakers** — 6-level tiebreaker chain (server-side authoritative), head-to-head display, manual 3-way lock resolution, advancement position markers
4. **Combined Format Advancement** — groupAdvancementService, advancement config UI, spillover ranking, bracket generation from group results, COMBINED completion guard
5. **Group/Combined Visualization + Points** — GroupFormationSection organizer UI, CombinedFormatDisplay layout, point calculation (group placement + knockout supersede)
6. **Integration + Singles/Doubles Parity** — end-to-end testing, doubles group tournaments, tournament copy support for combined format

### Pre-phase Decisions Needed

- **Point values for group placement:** Same `PointTable` ranges as knockout, or separate configurable table?
- **Manual draw after advancement:** Does organizer get manual draw option for knockout phase, or always seeded from group results?
- **Tournament copy for combined format:** Should v1.3 copy feature include group count, advancement count, spillover count?

### Research Flags

- No phases need additional `/gsd:research-phase` — all patterns are standard (round-robin scheduling, snake draft, tiebreaker chains) with well-documented implementations
- The three-way tiebreaker resolution needs explicit unit tests written before implementation

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new dependencies; all capabilities verified against existing codebase |
| Schema readiness | HIGH | Direct Prisma schema inspection — models exist, one migration needed |
| Service integration | HIGH | Direct service code inspection — guards, flows, call sites identified |
| Frontend integration | HIGH | Component shells exist, gaps documented |
| Tiebreaker rules | HIGH | ATP Finals standard; consistent across all tennis round-robin formats |
| Round-robin scheduling | HIGH | Circle method is mathematical, well-documented |
| Combined lifecycle | MEDIUM | Two-stage lifecycle is design work — patterns confirmed but BATL-specific |
| Spillover advancement | MEDIUM | FIFA World Cup pattern documented; validation against bracket sizes is BATL-specific |

**Overall confidence:** HIGH

---

## Sources

- BATL codebase direct audit: Prisma schema, `GroupStandingsTable.jsx`, `GroupConfigPanel.jsx`, `CombinedFormatDisplay`, `matchResultService.js`, `tournamentLifecycleService.js`, `bracketPersistenceService.js`, `pointCalculationService.js`
- ATP Finals round-robin format rules (tiebreaker chain)
- FIFA World Cup "best third-place" spillover advancement pattern
- Tournament administration literature (circle/polygon rotation method for round-robin scheduling)

---
*Research completed: 2026-03-15*
*Ready for requirements: yes*
