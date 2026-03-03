# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

---

## Milestone: v1.0 — Tournament Core

**Shipped:** 2026-02-28
**Phases:** 4 | **Plans:** 13 | **Timeline:** 3 days

### What Was Built

- Format-aware match result submission (sets, tiebreak, special outcomes) with organizer-lock
- Seeded bracket draw generation persisted to DB — close registration → generate → swap slots → save (Bracket/Round/Match records)
- Tournament lifecycle engine — start tournament, auto-advance knockout winners slot-by-slot, auto-complete on final match
- Public player statistics page (/players/:id) with match history, category filter, W/L badges, pagination
- Clickable player name links from bracket and rankings tables to public profiles

### What Worked

- **TDD-RED scaffolding before implementation** (Phase 01.1): Writing failing tests first made bracketPersistenceService implementation extremely direct — no exploratory rework needed
- **Phase insertion semantics** (decimal phase 01.1): Inserting Phase 01.1 between Phases 1 and 2 was clean — the dependency (DB records for lifecycle engine) was identified early and addressed before Phase 2
- **Prisma transaction atomicity**: Keeping advanceBracketSlot + checkAndCompleteTournament inside the existing submitResult transaction eliminated any possibility of partial state
- **Server-side score formatting**: Computing display-ready score strings and W/L outcomes on the backend (Phase 03-01) kept the frontend trivially simple and pagination correct
- **jest.unstable_mockModule for ES modules**: Using unstable_mockModule instead of jest.mock() resolved ES module mocking issues in Jest 30 — logged as a reusable pattern

### What Was Inefficient

- **ROADMAP progress table drift**: Phase 01.1 and Phase 2 checkbox states in ROADMAP.md were not updated after completion — the progress table fell out of sync with actual status
- **State.md stale after 01.1 plans 4/5**: STATE.md showed "10 plans completed" and "4/6 for Phase 01.1" when the actual count was higher — small tracking gaps accumulated
- **BYE slot pre-population fix required post-checkpoint**: Round 2 BYE slots weren't pre-populated in the initial implementation, requiring a fix commit after the human-verify checkpoint

### Patterns Established

- **Decimal phase insertion**: Phase 01.1 pattern — urgent phases inserted mid-milestone using decimal numbering with (INSERTED) marker, full ROADMAP entry, and explicit dependency chain
- **Organizer-lock via Prisma transaction**: Read organizer-lock status inside the write transaction — not before it — to prevent race conditions
- **isOwnProfile flag pattern**: Single public route (/players/:id) with `isOwnProfile` boolean gating edit form and private fields — avoids duplicate routes for self vs public view
- **stopPropagation on bracket player links**: Prevent score entry modal from opening when clicking a player name link inside a match card

### Key Lessons

1. **Track checkbox states in ROADMAP.md immediately after plan completion** — not at milestone end. The final reconciliation took extra effort.
2. **BYE pre-population is required when generating future-round matches** — any bracket generation that creates placeholder matches must fill BYE slots immediately, not lazily.
3. **`jest.unstable_mockModule()` is the correct ES module mock API in Jest 30** — do not use `jest.mock()` with ES modules, it silently fails.
4. **Atomic service aliases improve call-site clarity**: `regenerateBracket()` as an explicit alias for delete+generate makes intent clear versus inferring it from implementation.

### Cost Observations

- Model: claude-sonnet-4-6 throughout
- Sessions: ~6 sessions across 3 days
- Notable: Phase 01.1 (5 plans, complex backend + frontend) completed faster than Phase 3 (3 plans) due to TDD structure reducing iteration

---

## Milestone: v1.1 — Consolation Brackets

**Shipped:** 2026-03-03
**Phases:** 8 | **Plans:** 15 | **Timeline:** 4 days (2026-02-28 → 2026-03-03)

### What Was Built

- Match Guarantee configuration (MATCH_2) with consolation bracket auto-generation at draw time (mirror draw)
- Automatic loser routing to consolation with real-match counting (BYE/walkover exclusion)
- Consolation bracket progression, opt-out (self-service + organizer), and tournament completion gating
- Consolation bracket visualization with TBD styling, result entry, and organizer opt-out UI
- Match result resubmission with cascade-clear, dry-run verification, and winner-lock for non-organizers
- Consolation point tables and automated point calculation for MATCH_2 tournaments

### What Worked

- **Iterative milestone audits**: 5 audits drove systematic gap discovery and closure — each audit identified specific integration breaks that became new phases (5.1, 5.2, 6, 6.1, 7, 8)
- **Decimal phase insertion**: Phases 5.1 and 5.2 were cleanly inserted without disrupting the main sequence — proven pattern from v1.0
- **Atomic transactions**: consolationOptOutService wraps opt-out + opponent advancement in `prisma.$transaction` — zero partial-state bugs
- **DRY_RUN_RESULT pattern**: Throwing a custom error to rollback transaction while surfacing impact data proved an elegant solution for cascade verification
- **pair1Id ?? player1Id nullish coalescing**: Single code path for doubles/singles duality eliminated FK constraint errors without branching

### What Was Inefficient

- **5 audit iterations**: While each audit improved quality, the number of iterations suggests the initial planning could have caught more integration issues upfront — particularly the doubles-specific paths
- **Phase 6 delayed execution**: Phase 6 (Visualization) was planned but not executed until the 4th audit flagged it — could have been caught earlier
- **STATE.md drift**: Performance metrics in STATE.md accumulated stale data (e.g., 525979min for Phase 06 duration) — tracking reliability decreased as phases increased

### Patterns Established

- **Consolation mirror-draw rule**: `posInRound (0-indexed) → consolationMatchIndex = Math.floor(posInRound / 2)` — standard for future match guarantee levels
- **Match number offset 1000**: Consolation matches numbered at offset 1000+ from main bracket to avoid collisions
- **Server-side result derivation**: Consolation results auto-derived from DB by the server, never passed by API callers
- **Two-phase confirmation UX**: Halt on first pass (show popup), execute on confirm — reusable for any destructive bracket action

### Key Lessons

1. **Plan doubles paths explicitly from the start** — doubles and singles share code but have different FK structures (pair1Id vs player1Id). Every service function touching bracket slots must be tested with both.
2. **Milestone audits are effective but should be timed earlier** — running the first audit right after Phase 5 (instead of waiting) would have caught Phases 5.1 and 5.2 gaps sooner.
3. **Cascade operations need dry-run support** — any operation that modifies downstream bracket state should have a preview mode. This prevented destructive organizer mistakes.
4. **Keep STATE.md metrics minimal** — detailed per-plan timing is useful for velocity but accumulates noise. Summary-level metrics are sufficient.

### Cost Observations

- Model: mixed opus/sonnet across sessions
- Sessions: ~8 sessions across 4 days
- Notable: Audit-driven development (5 audits → 4 gap closure phases) added ~30% more phases but caught integration bugs that would have been costly in production

---

## Cross-Milestone Trends

| Milestone | Phases | Plans | Timeline | Notes |
|-----------|--------|-------|----------|-------|
| v1.0 Tournament Core | 4 | 13 | 3 days | First milestone; full knockout execution loop |
| v1.1 Consolation Brackets | 8 | 15 | 4 days | 5 audit iterations; doubles integration hardening |
