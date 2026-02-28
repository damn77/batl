# Project Research Summary

**Project:** BATL — Amateur Tennis League Tournament Management
**Domain:** Match result submission, tournament lifecycle, group/Swiss pairing, player statistics
**Researched:** 2026-02-26
**Confidence:** HIGH

## Executive Summary

BATL has 11 delivered features covering user management, categories, tournament creation, registration, doubles pairs, format rules, tournament view, rankings/points, bracket generation, seeding placement, and knockout bracket visualization. The next milestone closes the most critical gap: players cannot yet submit match results, and tournaments cannot progress from IN_PROGRESS to COMPLETED. Without this, the system is a sophisticated registration tool that still requires WhatsApp or spreadsheets for actual match management — the exact problem it was built to solve.

The recommended approach is to build in strict dependency order: result submission first, bracket progression second, then group stage and Swiss system in parallel, then player statistics. Every downstream feature (bracket advancement, group standings, Swiss pairings, statistics, and point calculation from Feature 008) is gated on confirmed match results existing in the database. The stack requires only one new library (`tournament-pairings` for Swiss pairing) and one optional addition (SWR for polling); everything else extends the locked existing stack.

The key risks are all in Phase 1. A double-submission race condition must be blocked at the database layer, not application logic. Score storage format must be defined as canonical JSON before any result is persisted — all later features inherit this decision. Bracket progression must fire only on organizer confirmation, never on player submission; a progression reversal path would be prohibitively complex. Get these three decisions right in Phase 1 and the remaining phases have well-documented, lower-risk patterns.

## Key Findings

### Recommended Stack

The stack is locked by 11 delivered features. No decisions to make about core technology. The new work adds: `tournament-pairings` 2.0.x (npm) for Swiss pairing algorithm — implementing maximum-weight matching manually is a known source of algorithmic bugs; the library handles graceful rematch fallback for small fields automatically. SWR 2.4.x (optional) for 30-second polling during active tournaments — avoids WebSocket complexity for an amateur league with low-frequency result updates. Score validation uses Joi custom patterns on the existing Joi 18.x dependency with no new library required.

**Core technologies:**
- `tournament-pairings` 2.0.x: Swiss pairing algorithm — prevents rematch and scoring bugs; purpose-built for this use case
- Joi 18.x (existing): Format-aware score validation — `.pattern()` and `.custom()` cover all scoring format rules
- SWR 2.4.x (optional): Live tournament polling — 30s interval for organizer/player refresh; simpler than WebSockets
- PostgreSQL via Prisma (existing): Group standings and Swiss history derive from existing `Match` rows; no new persistence strategy needed
- seedrandom 3.0.5+ (existing): Swiss pairing with deterministic randomization for tie-breaking and reproducible round generation

**What NOT to use:** WebSockets/Socket.io (overkill for amateur league), Redis (no caching infrastructure needed), React Query over SWR (same capability, more weight), raw `pg` queries (Prisma is established).

See: `.planning/research/STACK.md`

### Expected Features

The missing features cluster into five areas. Match result submission is the absolute prerequisite — every other feature reads from confirmed match results. Tournament lifecycle management (SCHEDULED → IN_PROGRESS → COMPLETED) must be built alongside result submission since confirmation triggers auto-completion. Group stage and Swiss system are format-specific features that both depend on the result submission flow but are independent of each other and can be built in parallel. Player statistics depend only on confirmed results existing.

**Must have (table stakes) — without these, the app stays on WhatsApp:**
- Match result submission — format-aware score entry with PENDING/CONFIRMED/DISPUTED state machine
- Organizer result confirmation dashboard — pending results list, one-click confirm, dispute resolution
- Tournament status lifecycle — SCHEDULED → IN_PROGRESS → COMPLETED with guards and auto-completion
- Knockout bracket progression — winner advances to next slot automatically on confirmation
- Group stage — round-robin scheduling, standings table, tiebreaker chain
- Swiss system — round pairing via `tournament-pairings`, configurable round count, standings
- Player statistics — match history, win/loss per category, head-to-head record

**Should have (competitive differentiators — defer until v1 is complete):**
- Score history timeline — graphical season progression
- Organizer analytics — participation trends
- Walkover/retirement result types — DNS/DNF/walkover distinction
- Match scheduling — court number and time assignment
- Mobile-optimized score entry — touch-first large tap targets
- Waitlist management — automatic promotion on withdrawal

**Defer to v2+:**
- Live point-by-point score entry, automated email/push notifications, video/photo evidence, ELO rating, player-to-player messaging, federation hierarchy, payment integration

See: `.planning/research/FEATURES.md`

### Architecture Approach

The new milestone slots into the established three-tier system without restructuring. The key architectural decision is to model result submission as a separate `MatchResultSubmission` table rather than writing to `Match.result` directly — this keeps the confirmed result immutable and keeps dispute state out of the Match model. Bracket progression is a post-confirmation side effect called synchronously within `matchResultService.confirmResult()`. Tournament auto-completion runs as a fire-and-forget async check after the confirmation response is sent (established pattern in the codebase). Group standings are computed on every GET for in-progress groups and cached in a `GroupStanding` table on round completion. Swiss pairing is stateless over match history — no additional state table needed.

**Major components:**
1. `matchResultService` — submit/dispute/confirm/reject state machine, score format validation against tournament rules
2. `bracketProgressionService` — find next bracket slot, advance winner; called as side effect of confirmation
3. `tournamentLifecycleService` — explicit transition functions (startTournament, completeTournament, checkAutoComplete) with guard conditions
4. `groupStandingsService` — round-robin schedule generation, standings calculation with tiebreaker chain
5. `swissPairingService` — read match history, run pairing algorithm, persist new Round+Match rows
6. `playerStatsService` — aggregated match history, win rate, head-to-head; reads from confirmed Match rows + Feature 008 TournamentResult

**New database models required:** `MatchResultSubmission` (with `ResultSubmissionStatus` enum), `GroupStanding`. No changes to the existing `Match` model.

See: `.planning/research/ARCHITECTURE.md`

### Critical Pitfalls

1. **Double-submission race condition** — Two players submit simultaneously, both succeed. Prevention: unique database constraint on `matchId` + `status=PENDING`, or Prisma transaction with `findFirst` + `create` atomic. Application-layer-only prevention is insufficient.

2. **Format-unaware score validation** — Player submits sets score for a tiebreak-only tournament; app accepts it. Prevention: load tournament scoring rules at submission time; validate score structure against `TournamentRules.scoringFormat` on the backend. Frontend validation is UX only.

3. **Bracket progression on submission (not confirmation)** — If progression fires on player submission, a disputed or rejected result leaves the wrong player in round 2 with no reversal path. Prevention: bracket progression fires exclusively inside `matchResultService.confirmResult()`.

4. **Uncanonical score storage format** — Score stored as freeform string; every component parses it differently. Prevention: define canonical JSON format (`[{home: 6, away: 4}]`) before any result is persisted; single `formatScore()` utility used everywhere.

5. **Tournament stuck state** — One unsubmitted match blocks IN_PROGRESS forever. Prevention: organizer can always manually enter walkover/forfeit; explicit "force complete tournament" admin action; no lifecycle transition can be blocked by player inaction.

6. **Statistics N+1 staleness** — Player profile times out when stats calculated from raw match history as tournaments accumulate. Prevention: maintain incremental aggregated stats columns (`winsCount`, `lossesCount`, `setsWon`, etc.) on `PlayerProfile` or a dedicated `PlayerStats` model; update atomically on confirmation.

7. **Swiss rematch in small fields** — Algorithm crashes when rematches are unavoidable (e.g., 6-player, 5-round Swiss). Prevention: use `tournament-pairings` library which handles this with "minimize rematches" strategy and graceful fallback.

See: `.planning/research/PITFALLS.md`

## Implications for Roadmap

Based on research, the dependency graph dictates a clear build order. Every other phase reads from confirmed match results, making Phase 1 the single critical path. Phases 3 and 4 are independent of each other (group and Swiss are separate formats) and can be sequenced based on organizer demand.

### Phase 1: Match Result Submission

**Rationale:** Every downstream feature depends on confirmed results existing in the database. This is the single blocking dependency. Three critical pitfalls must be solved here: race condition, format validation, and score storage format. Getting these decisions wrong creates cascading architectural debt.

**Delivers:** Players can submit scores; organizer can confirm, reject, or override; results have a canonical JSON format; dispute state machine is fully functional.

**Addresses:** Match result submission, dispute handling, organizer result confirmation (from FEATURES.md)

**Key decisions here (define now, never revisit):**
- Canonical score storage: JSON array `[{home: N, away: N}]`
- Unique DB constraint on `MatchResultSubmission(matchId)` to prevent race condition
- `winnerType` ("PLAYER" or "PAIR") to handle singles and doubles uniformly

**Avoids:** Double-submission race (unique constraint), format-unaware validation (backend Joi validation against tournament rules), canonical score format (define here for all consumers)

**Research flag:** Standard patterns — no deeper research phase needed. Patterns are well-established in the codebase.

### Phase 2: Tournament Lifecycle and Bracket Progression

**Rationale:** Depends on Phase 1 (needs confirmed results to trigger transitions). Bracket progression is the immediate consumer of result confirmation — it belongs in the same phase as lifecycle management. Together they deliver the complete knockout tournament experience.

**Delivers:** Organizer can start a tournament; confirmed results advance winners automatically; tournament auto-completes when final match is confirmed; Feature 011 knockout bracket view reflects live state.

**Addresses:** Tournament status lifecycle, knockout bracket progression (from FEATURES.md)

**Uses:** Existing `Match` model, Feature 009 bracket structure (slot calculation), Feature 011 bracket view (reads `Match.result`)

**Implements:** `tournamentLifecycleService`, `bracketProgressionService` (from ARCHITECTURE.md)

**Avoids:** Bracket progression on submission rather than confirmation (Pitfall 3), tournament stuck state (Pitfall 6 — force-complete admin action)

**Research flag:** Standard patterns — lifecycle state machines and bracket slot assignment are well-documented. No deeper research phase needed.

### Phase 3: Group Stage

**Rationale:** Depends on Phase 1 (group matches use the same result submission flow) and Phase 2 (tournament lifecycle transitions apply). Independent of Swiss system — can be built before or after Phase 4.

**Delivers:** Organizer generates round-robin schedule from registered players; group standings table auto-updates as results are confirmed; tiebreaker chain resolves positions; Combined format advancement sets up knockout bracket.

**Addresses:** Group stage table stakes (from FEATURES.md)

**Uses:** `groupStandingsService`, `GroupStanding` Prisma model, `standingsCalculator.js` utility (shared with Swiss in Phase 4)

**Avoids:** Group bye imbalance (use win percentage not raw wins; warn organizer of unequal sizes), combined format advancement rules not enforced (auto-populate knockout from group standings)

**Research flag:** Moderate complexity in tiebreaker chain (wins → head-to-head → sets % → games % → alphabetical). No library needed but the tiebreaker logic should be extracted into `standingsCalculator.js` and tested independently before integration.

### Phase 4: Swiss System

**Rationale:** Depends on Phase 1 (Swiss match results use same submission flow). Shares `standingsCalculator.js` utility from Phase 3 — build Phase 3 first to reuse it. Independent of group stage otherwise.

**Delivers:** Organizer sets round count; pairing algorithm generates round pairings avoiding rematches; organizer advances to next round after current round is complete; final standings after all rounds.

**Addresses:** Swiss system table stakes (from FEATURES.md)

**Uses:** `tournament-pairings` npm package, `swissPairingService`, deterministic `randomSeed` parameter for reproducibility (seedrandom already in use)

**Avoids:** Swiss rematch crash in small fields (tournament-pairings library handles gracefully), pairing state table (stateless algorithm over match history, no extra table needed)

**Research flag:** `tournament-pairings` library integration should be validated early in the phase — verify ES Modules compatibility. Low risk but confirm before building the service layer.

### Phase 5: Player Statistics

**Rationale:** Depends only on Phase 1 (needs confirmed match results). Can technically run in parallel with Phase 3, but sequencing after group stage lets Phase 5 incorporate group match history. Lowest urgency of the table stakes features — players can use rankings (Feature 008) as a stopgap.

**Delivers:** Players view full match history, win/loss record per category per season, head-to-head records; statistics are public on player profile.

**Addresses:** Player statistics table stakes (from FEATURES.md)

**Uses:** `playerStatsService`, aggregated stats columns on `PlayerProfile` or dedicated `PlayerStats` model, Feature 008 `TournamentResult` rows for points history

**Avoids:** Statistics staleness/N+1 queries (incremental aggregated columns updated atomically on confirmation, not recalculated on read)

**Research flag:** Standard patterns — aggregation over relational data is well-understood. No deeper research phase needed.

### Phase Ordering Rationale

- Phase 1 is the sole critical path dependency — nothing else can start until match results exist
- Phase 2 is coupled tightly to Phase 1 by the confirmation side-effect chain; it naturally follows immediately
- Phases 3 and 4 are format-specific and independent of each other; group stage comes first because the `standingsCalculator.js` utility it creates is reused by Swiss
- Phase 5 is sequenced last because Feature 008 rankings already give players basic performance information; it adds value but is not blocking
- Combined format (group → knockout advancement) is the final integration step within Phase 3, not a separate phase — it is a service call connecting completed group standings to the knockout bracket generated in Phase 2

### Research Flags

Phases likely needing validation during planning:
- **Phase 4 (Swiss):** Verify `tournament-pairings` ES Modules compatibility before building the service layer. Confirm the library's bye-assignment behavior matches the BATL spec (byes count as 1 point in Swiss score).

Phases with standard patterns (no deeper research phase needed):
- **Phase 1:** Match result state machines are well-documented; patterns established in the codebase with Feature 008 TournamentResult immutability
- **Phase 2:** Lifecycle state machines and bracket slot assignment follow Feature 009 structure; existing `matchStatus.js` guard pattern is the template
- **Phase 3:** Group standings aggregation follows standard relational patterns; tiebreaker logic needs careful unit testing but not research
- **Phase 5:** Stats aggregation is standard; follow the Feature 008 point calculation aggregation pattern

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | 11 delivered features lock the technology; one new library (tournament-pairings) is well-established |
| Features | HIGH | Domain is clear; missing features identified by direct comparison of what's built vs. what's needed for a usable tournament system |
| Architecture | HIGH | Based on direct codebase analysis of existing patterns (matchStatus.js, TournamentResult, fire-and-forget async side effects) |
| Pitfalls | HIGH | Race condition, format validation, and bracket progression timing are classic tournament software failure modes with established mitigations |

**Overall confidence:** HIGH

### Gaps to Address

- **SWR vs. no polling:** The STACK.md recommends SWR for live tournament polling but rates it MEDIUM confidence. Validate whether the existing tournament view (Feature 005) already has a refresh mechanism before adding SWR. If organizers manually refresh, SWR may not be needed in v1.
- **Dispute auto-confirmation timing:** PITFALLS.md recommends a 48-hour auto-confirm window, but this requires a scheduled job or a lazy-evaluation check. The existing codebase has no scheduled job infrastructure. Decision during Phase 1 planning: implement lazy auto-confirm (check age on confirmation attempt) or accept that v1 requires manual organizer resolution with no auto-confirm.
- **Combined format advancement rules storage:** Feature 004 defines tournament rules including advancement rules. Verify that `TournamentRules` already stores "top N from each group advance" config, or whether Phase 3 needs to add this field.
- **`PlayerStats` model vs. aggregated columns on `PlayerProfile`:** Architecture research suggests both options. Decision needed at Phase 5 planning time based on query patterns needed for head-to-head and category filtering.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis: `backend/prisma/schema.prisma` — 30+ models, existing Match/Tournament/Group/Bracket structure
- Direct codebase analysis: `backend/src/services/tournamentService.js` — status management, fire-and-forget async side effects
- Direct codebase analysis: `backend/src/types/matchStatus.js` — transition guard pattern via `canTransitionTo()`
- Direct codebase analysis: `backend/src/validation/formatConfigSchemas.js` — SwissFormatConfig (rounds 3-20), GroupFormatConfig (groupSize 2-8)
- `.planning/codebase/ARCHITECTURE.md` — layer definitions, error handling, auth patterns
- `.planning/codebase/STRUCTURE.md` — file naming conventions, directory layout
- `.planning/PROJECT.md` — constraints: immutable confirmed results, backward compatibility, touch-friendly UX

### Secondary (MEDIUM confidence)
- `tournament-pairings` npm package documentation — Swiss maximum weight matching, rematch avoidance, bye handling
- SWR 2.4.x documentation — stale-while-revalidate polling pattern for React

### Tertiary (LOW confidence)
- Group standings tiebreaker chain (wins → head-to-head → sets % → games % → alphabetical) — derived from FEATURES.md spec; should be validated against organizer requirements before Phase 3 implementation
- 48-hour dispute auto-confirm window — recommended in PITFALLS.md; not yet confirmed as a BATL-specific requirement

---
*Research completed: 2026-02-26*
*Ready for roadmap: yes*
