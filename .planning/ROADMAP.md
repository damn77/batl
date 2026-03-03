# Roadmap: BATL — Amateur Tennis League Manager

## Milestones

- ✅ **v1.0 Tournament Core** — Phases 1, 01.1, 2, 3 (shipped 2026-02-28)
- ✅ **v1.1 Consolation Brackets** — Phases 4, 5, 5.1, 5.2, 6, 6.1, 7, 8 (shipped 2026-03-03)
- 🔄 **v1.2 Data Seeding Update** — Phases 9, 10 (active)

## Phases

<details>
<summary>✅ v1.0 Tournament Core (Phases 1, 01.1, 2, 3) — SHIPPED 2026-02-28</summary>

- [x] Phase 1: Match Result Submission (3/3 plans) — completed 2026-02-27
- [x] Phase 01.1: Bracket Generation and Seeding Persistence (5/5 plans) — completed 2026-02-28 (INSERTED)
- [x] Phase 2: Tournament Lifecycle and Bracket Progression (2/2 plans) — completed 2026-02-28
- [x] Phase 3: Player Statistics (3/3 plans) — completed 2026-02-28

See `.planning/milestones/v1.0-ROADMAP.md` for full phase details.

</details>

<details>
<summary>✅ v1.1 Consolation Brackets (Phases 4–8) — SHIPPED 2026-03-03</summary>

- [x] Phase 4: Configuration and Consolation Draw (2/2 plans) — completed 2026-03-01
- [x] Phase 5: Loser Routing and Consolation Progression (6/6 plans) — completed 2026-03-01
- [x] Phase 5.1: Consolation Gap Closure (1/1 plan) — completed 2026-03-01
- [x] Phase 5.2: Doubles Backend Fixes (1/1 plan) — completed 2026-03-01
- [x] Phase 6: Visualization and Result Entry (1/1 plan) — completed 2026-03-03
- [x] Phase 6.1: Match Result Resubmission and Bracket Recalculation (2/2 plans) — completed 2026-03-03
- [x] Phase 7: Consolation Points (1/1 plan) — completed 2026-03-03
- [x] Phase 8: Consolation Bug Fixes (1/1 plan) — completed 2026-03-03

See `.planning/milestones/v1.1-ROADMAP.md` for full phase details.

</details>

### v1.2 Data Seeding Update

- [x] **Phase 9: Real Player and League Data** - Seed 34 real players, linked accounts, 18 mixed doubles pairs, registrations, and ProSet locations (completed 2026-03-03)
- [ ] **Phase 10: Data Quality and Script Cleanup** - Realistic mock ranking values, merged active-tournament scripts, updated test seeds

## Phase Details

### Phase 9: Real Player and League Data

**Goal**: The seed database reflects the actual league membership — 34 real named players are present with their accounts, all mixed doubles pairs exist, all players are registered in the Mixed Doubles Open category, and all locations read "ProSet"

**Depends on**: Nothing (first phase of v1.2)

**Requirements**: PLAY-01, PLAY-02, PLAY-03, ACCT-01, ACCT-02, ACCT-03, PAIR-01, PAIR-02, TOURN-01, TOURN-02, TOURN-03, TOURN-04, LOC-01, LOC-02

**Success Criteria** (what must be TRUE):
  1. Running `prisma db seed` populates 34 named real players (18 male, 16 female) alongside existing generic test players — no placeholder "Player A / Player B" names for real members
  2. Logging in as `erich@batl` (ADMIN) and `rene@batl` (ORGANIZER) works; existing `admin@batl`, `organizer@batl`, `player@batl` credentials continue to work unchanged
  3. The Mixed Doubles Open category contains all 18 pairs visible in the pairs list, and the category rankings page shows 0 tournament points (no tournament has been played there yet)
  4. All tournaments displayed in the app show "ProSet" as their location — no "Central Tennis Club", "Riverside", or other generic location names appear anywhere
  5. The tournaments list shows a mix of SCHEDULED, IN_PROGRESS, and COMPLETED statuses across age-specific categories (35+, 40+, 50+, etc.)

**Plans:** 2/2 plans complete

Plans:
- [x] 09-01-PLAN.md — Create data file and rewrite seed.js foundation (players, accounts, pairs, locations)
- [x] 09-02-PLAN.md — Rewrite tournaments, rankings, and update seed-knockout-test.js

---

### Phase 10: Data Quality and Script Cleanup

**Goal**: All seed scripts are consolidated, realistic, and reference real players and ProSet — the developer running any seed script gets a coherent dataset with no leftover placeholder values

**Depends on**: Phase 9

**Requirements**: DATA-01, DATA-02, SCRP-01, SCRP-02, SCRP-03

**Success Criteria** (what must be TRUE):
  1. The category rankings page shows varied point totals across players (not a linear 1000/900/800 ladder), and player tournament counts differ from each other (not all showing 5 tournaments)
  2. There is exactly one active-tournament seed script (not two separate files doing similar work); running it produces a seeded tournament at "ProSet" referencing real player names
  3. The knockout test seed script produces a tournament at "ProSet" with real player names in the bracket positions

**Plans:** 1/2 plans executed

Plans:
- [ ] 10-01-PLAN.md — Realistic mock ranking data (varied points and tournament counts)
- [ ] 10-02-PLAN.md — Merge active-tournament scripts, update knockout test to use real players

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Match Result Submission | v1.0 | 3/3 | Complete | 2026-02-27 |
| 01.1. Bracket Generation and Seeding Persistence | v1.0 | 5/5 | Complete | 2026-02-28 |
| 2. Tournament Lifecycle and Bracket Progression | v1.0 | 2/2 | Complete | 2026-02-28 |
| 3. Player Statistics | v1.0 | 3/3 | Complete | 2026-02-28 |
| 4. Configuration and Consolation Draw | v1.1 | 2/2 | Complete | 2026-03-01 |
| 5. Loser Routing and Consolation Progression | v1.1 | 6/6 | Complete | 2026-03-01 |
| 5.1. Consolation Gap Closure | v1.1 | 1/1 | Complete | 2026-03-01 |
| 5.2. Doubles Backend Fixes | v1.1 | 1/1 | Complete | 2026-03-01 |
| 6. Visualization and Result Entry | v1.1 | 1/1 | Complete | 2026-03-03 |
| 6.1. Match Result Resubmission and Bracket Recalculation | v1.1 | 2/2 | Complete | 2026-03-03 |
| 7. Consolation Points | v1.1 | 1/1 | Complete | 2026-03-03 |
| 8. Consolation Bug Fixes | v1.1 | 1/1 | Complete | 2026-03-03 |
| 9. Real Player and League Data | v1.2 | 2/2 | Complete | 2026-03-03 |
| 10. Data Quality and Script Cleanup | 1/2 | In Progress|  | - |
