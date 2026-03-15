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

## Milestone: v1.2 — Data Seeding Update

**Shipped:** 2026-03-04
**Phases:** 3 | **Plans:** 5 | **Timeline:** 1 day (2026-03-03 → 2026-03-04)

### What Was Built

- Seeded 34 real BATL league players (18 male, 16 female) with linked ADMIN and ORGANIZER accounts
- Created 18 mixed doubles pairs in Mixed Doubles Open with zero-point rankings
- Consolidated all locations to "ProSet" across all seed scripts
- Replaced linear ranking formula with 16-entry RANKING_PROFILES lookup for realistic varied values
- Merged two active-tournament seed scripts into one; all scripts reference real players by email

### What Worked

- **Data file extraction pattern**: Separating player data to `backend/prisma/data/players.js` as a shared ES module made it trivial for 3 seed scripts to reference the same real players consistently
- **Email-based player lookup**: Using `findFirst({ where: { email } })` instead of alphabetical `findMany` guarantees deterministic real player references across all seeds
- **2-phase milestone structure**: Phase 9 (data content) and Phase 10 (quality/consolidation) had a natural delivery boundary — Phase 9 produces a usable DB, Phase 10 polishes the tooling
- **Single audit cycle**: Only 1 audit with 1 gap closure phase (Phase 11) needed — significantly more efficient than v1.1's 5-audit cycle

### What Was Inefficient

- **Missing SUMMARY frontmatter**: Plans 09-02 and 10-02 were executed without `requirements_completed` in their SUMMARY frontmatter — caught by audit and fixed in Phase 11
- **Organizer schema mismatch**: `seed-active-tournament.js` used non-existent `organizationName` field (Prisma error) — not caught during Phase 10 execution, required Phase 11 gap closure
- **organizer.username stale reference**: `seed-active-tournament.js` accesses `organizer.username` (non-existent field on User model) — silently falls back but produces incorrect output. Identified but not fixed.

### Patterns Established

- **Shared seed data module**: Extract seed data to `backend/prisma/data/players.js` — all seed scripts import from a single source of truth
- **RANKING_PROFILES lookup array**: Pre-sorted descending profiles with irregular point gaps, varied tournament counts, and seedingScore < totalPoints for realistic rankings display
- **findFirst + conditional create**: Idempotent doubles pair creation pattern for seed scripts that may run multiple times

### Key Lessons

1. **Always include `requirements_completed` in SUMMARY frontmatter at execution time** — not as a post-hoc fix. The audit's 3-source cross-reference depends on it.
2. **Test seed scripts against fresh databases during execution** — the organizer schema bug would have been caught immediately if `seed-active-tournament.js` had been run against an empty DB during Phase 10.
3. **Data-only milestones are fast** — no new API endpoints, no frontend changes, no complex integration. 5 plans in 1 day with minimal audit friction.

### Cost Observations

- Model: mixed opus/sonnet
- Sessions: ~2 sessions across 1 day
- Notable: Smallest milestone yet (3 phases, 5 plans) — data-only changes have much lower complexity ceiling

---

## Milestone: v1.3 — Manual Draw & QoL

**Shipped:** 2026-03-06
**Phases:** 7 | **Plans:** 12 | **Timeline:** 2 days (2026-03-04 → 2026-03-06)

### What Was Built

- Manual bracket draw with empty-position generation, player assignment dropdowns, and start-gate validation
- Tournament copy — one-click configuration duplication into new SCHEDULED tournament
- Tournament deletion with cascading cleanup (registrations, draw, results) and ranking recalculation
- Revert-to-SCHEDULED for IN_PROGRESS tournaments (erase draw, unlock registration)
- ADMIN superuser bypass in ProtectedRoute for full organizer parity
- Integration fixes: format filter forwarding and player count guard alignment

### What Worked

- **Parallel phase execution**: Phases 14 (Copy) and 15 (Delete/Revert) were independent and could be planned/executed without blocking each other
- **Single milestone audit**: 1 audit with `tech_debt` status — identified 1 medium dead code issue and 2 integration gaps (COPY-05, DRAW-06), both fixed in gap closure phases
- **Immediate-save pattern for manual draw**: Each dropdown selection calls API directly instead of batching — matches the single-position API design and avoids client-side state complexity
- **ADMIN early-exit pattern**: Single check at ProtectedRoute level grants all organizer routes without modifying each page's authorization logic
- **Three-dot dropdown consolidation**: Replacing multiple inline buttons with an action dropdown scaled cleanly across Copy, Delete, and Revert actions

### What Was Inefficient

- **Dead code in BracketGenerationSection**: The `showRevertOnly` branch (lines 196-249) became unreachable because FormatVisualization bypasses BracketGenerationSection for IN_PROGRESS+hasBracket — accepted as tech debt rather than fixed
- **Duplicate revertTournament in two services**: `tournamentService` and `tournamentViewService` both implement revert — each serves its own page context but could be consolidated
- **Phase numbering confusion**: Two phases both numbered "17" in ROADMAP.md (bracket-view-ux-fixes was removed, then phase13-verification reused the number, then integration-bug-fixes also used 17) — disk directories diverged to 17 and 18

### Patterns Established

- **drawMode as String (not enum)**: Avoid Prisma enum migration for low-cardinality fields with only 2 values
- **assignPosition inner async helper**: `getByeAdjacentRound2Update()` inside transaction closure for reuse across assign/clear/reassign steps
- **registrationClosed as proxy for has-draw**: Tournament list page lacks structure data, so `registrationClosed` indicates draw existence for UI gating
- **ADMIN superuser bypass pattern**: Check `user.role === 'ADMIN'` after `isAuthenticated` but before role-specific checks — single exit point, no per-route changes

### Key Lessons

1. **Phase numbering must be strictly monotonic** — reusing phase numbers (even after removal) creates confusion between ROADMAP, disk directories, and STATE tracking. Use the next available number.
2. **Test CASL permissions with superuser early** — ADMIN access gaps weren't caught until Phase 16 because earlier phases tested only ORGANIZER. Include ADMIN in E2E test matrix from Phase 12.
3. **Dead code from conditional UI paths is hard to detect** — the BracketGenerationSection revert branch looked correct in isolation but was unreachable due to parent component routing. Integration-level testing (not unit) catches this.
4. **Audit-driven gap closure is converging** — v1.0 had no audits, v1.1 had 5, v1.2 had 1, v1.3 had 1. Planning quality is improving.

### Cost Observations

- Model: mixed opus/sonnet
- Sessions: ~4 sessions across 2 days
- Notable: Fastest multi-feature milestone (7 phases in 2 days) — well-understood codebase patterns from v1.0–v1.2 reduced exploration time

---

## Milestone: v1.4 — UI Rework & Mobile Design

**Shipped:** 2026-03-15
**Phases:** 7 | **Plans:** 11 | **Timeline:** 10 days (2026-03-06 → 2026-03-15)

### What Was Built

- Mobile dev tooling with QR code access for real-device testing (`npm run dev:mobile`)
- React Bootstrap Offcanvas drawer navigation replacing broken Bootstrap JS hamburger menu
- Bracket-first tournament view with status-driven accordion layout (hero zone for IN_PROGRESS)
- Touch-friendly bracket controls (44px tap targets) and fullscreen score entry modal with iOS numeric keypad
- Organizer courtside result entry with segmented mode toggle and stacked confirmation buttons
- App-wide responsive pass: global CSS tokens, dual-render card/table layouts, dashboard quick links, column hiding
- Player profile mobile fix (gap closure for dead-file bug)

### What Worked

- **Dual-render card/table pattern**: Using Bootstrap `d-sm-none`/`d-none d-sm-block` for mobile cards vs desktop tables is clean, requires no JS viewport detection, and was reused across 4 pages
- **Global app.css as Wave 1 foundation**: Creating design tokens and tap target rules first meant Wave 2 pages could consume them immediately without duplication
- **Integration checker caught dead-file bug**: Phase 25-03 applied responsive changes to `PlayerProfilePage.jsx` (dead code) instead of `PlayerPublicProfilePage.jsx` (live route) — the integration checker's route-tracing identified this before shipping
- **Small gap closure phase**: Phase 26 was a 1-plan, 2-task fix that closed the RESP-06 gap cleanly in under 5 minutes of execution

### What Was Inefficient

- **Dead file not caught during planning**: The planner and researcher didn't flag that `PlayerProfilePage.jsx` was unreachable. The integration checker (post-execution audit) caught it — but catching it at plan time would have saved a gap closure phase
- **Stale audit file**: The milestone audit was written before Phase 26 closed the gap, leaving `gaps_found` status in the file even though all requirements were satisfied — required understanding the audit was stale rather than current
- **SUMMARY frontmatter gaps**: Phase 25-03's SUMMARY had empty `requirements_completed` array (should have listed RESP-06, RESP-07) — recurring issue from v1.2

### Patterns Established

- **CSS custom property design tokens**: `:root` variables for spacing, font size, and color — all responsive rules reference tokens instead of hardcoded values
- **44px minimum tap target rule**: Global media query at 575.98px applies `min-height: 44px` to all interactive elements — applied once in app.css, no per-component rules needed
- **`fullscreen="sm-down"` for mobile modals**: React Bootstrap Modal prop that makes modals fullscreen below 576px — used on score entry and tournament setup modals
- **Column visibility via TanStack state**: `columnVisibility` state object passed to `useReactTable` — cleaner than CSS hiding for table columns

### Key Lessons

1. **Verify file routing before planning changes** — check that the target file is actually imported/routed before planning modifications to it. `grep -r "import.*FileName" src/` catches dead files.
2. **SUMMARY frontmatter `requirements_completed` must be populated at execution time** — this is the 3rd milestone where missing frontmatter caused audit friction. Should be enforced by executor agents.
3. **CSS/responsive changes inherently require human verification** — every phase in v1.4 had `human_needed` or `passed` verification status. For UI milestones, plan for manual testing as part of the workflow.
4. **Integration checkers should run during planning, not just auditing** — catching the dead-file bug during `/gsd:plan-phase 25` would have prevented the entire Phase 26 gap closure cycle.

### Cost Observations

- Model: mixed opus/sonnet (orchestration on opus, execution/verification on sonnet)
- Sessions: ~5 sessions across 10 days (with calendar gaps)
- Notable: UI-only milestone — no backend changes, no new API endpoints, no database migrations. Fastest category of changes once patterns are established.

---

## Cross-Milestone Trends

| Milestone | Phases | Plans | Timeline | Notes |
|-----------|--------|-------|----------|-------|
| v1.0 Tournament Core | 4 | 13 | 3 days | First milestone; full knockout execution loop |
| v1.1 Consolation Brackets | 8 | 15 | 4 days | 5 audit iterations; doubles integration hardening |
| v1.2 Data Seeding Update | 3 | 5 | 1 day | Data-only; 1 audit, 1 gap closure phase |
| v1.3 Manual Draw & QoL | 7 | 12 | 2 days | Multi-feature QoL; 1 audit, 2 gap closure phases |
| v1.4 UI Rework & Mobile Design | 7 | 11 | 10 days | Frontend-only; 1 audit, 1 gap closure phase |
