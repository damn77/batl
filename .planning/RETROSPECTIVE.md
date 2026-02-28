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

## Cross-Milestone Trends

| Milestone | Phases | Plans | Timeline | Notes |
|-----------|--------|-------|----------|-------|
| v1.0 Tournament Core | 4 | 13 | 3 days | First milestone; full knockout execution loop |
