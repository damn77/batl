---
phase: 09-real-player-and-league-data
plan: 02
subsystem: data-seeding
tags: [seed, tournaments, rankings, doubles-pairs, proset]
requirements: [TOURN-02, TOURN-03, TOURN-04, PAIR-02]

dependency_graph:
  requires: ["09-01"]
  provides: ["realistic-tournament-data", "mixed-doubles-zero-rankings", "real-player-doubles-pairs"]
  affects: ["backend/prisma/seed.js", "backend/prisma/seed-knockout-test.js"]

tech_stack:
  added: []
  patterns:
    - "findFirst + conditional create for doubles pair idempotency"
    - "Relative date arithmetic (lastMonth, nextMonth, twoMonthsAgo) for tournament scheduling"
    - "Age-eligibility filtering via birthDate.getFullYear() <= cutoffYear"

key_files:
  modified:
    - path: backend/prisma/seed.js
      role: "Main seed — complete rewrite of sections 6-14: tournaments, registrations, groups, rankings, pairs"
    - path: backend/prisma/seed-knockout-test.js
      role: "Knockout test seed — explicit ProSet location lookup replacing generic findFirst()"

decisions:
  - "Use findFirst + conditional create for real player doubles pairs (men's, women's) to maintain idempotency across multiple seed runs"
  - "Remove group stage section entirely (all 6 new tournaments are KNOCKOUT format)"
  - "Mixed Doubles Open PAIR/MEN/WOMEN rankings created with 0 points — not an empty table, but explicit zero-ranked entries for all 18 pairs and 34 players"
  - "Men's Doubles pairs: Zaprazny+Siebenstich (1900), Stevko+Pomsar (1500), Macho+Uhliar (1100), Kardos+Sramko (700)"
  - "Women's Doubles pairs: Nestarcova+Siebenstichova (1720), Zaprazna+Strakova (1400)"
  - "Phase 9 test scaffolding section removed (Winter Open 2024 + archived rankings + tiebreaker scenarios) — replaced by realistic tournament data"

metrics:
  duration_seconds: 366
  tasks_completed: 2
  files_modified: 2
  completed_date: "2026-03-03"
---

# Phase 9 Plan 02: Tournament, Registration, and Ranking Seed Rewrite Summary

Rewrote the tournament, registration, ranking, and doubles-pairs sections of seed.js to use realistic ProSet-hosted tournaments across age-specific categories with mixed statuses, and updated seed-knockout-test.js to explicitly reference the ProSet location.

## What Was Built

### Task 1: seed.js — Section 6-14 Rewrite

**Section 6 — Tournaments (replaced all generic tournaments):**

6 new KNOCKOUT-format tournaments, all at ProSet:

| # | Name | Category | Status |
|---|------|----------|--------|
| 1 | ProSet 35+ Autumn Cup 2025 | Men's Singles 35+ | COMPLETED |
| 2 | ProSet 40+ Spring Open 2026 | Men's Singles 40+ | IN_PROGRESS |
| 3 | ProSet 50+ Summer Classic 2026 | Men's Singles 50+ | SCHEDULED |
| 4 | ProSet Open Winter Championship 2025 | Men's Singles Open | COMPLETED |
| 5 | ProSet Women's Spring Cup 2026 | Women's Singles Open | SCHEDULED |
| 6 | ProSet Men's Doubles Spring 2026 | Men's Doubles Open | IN_PROGRESS |

Mixed Doubles Open: no tournament created (TOURN-02). Rankings start at zero.

**Section 7 — Registrations:**
- 35+ Autumn Cup: 12 real male players born ≤ 1991
- 40+ Spring Open: 10 real male players born ≤ 1986
- 50+ Summer Classic: 4 real male players born ≤ 1976 (all qualifying)
- Open Winter Championship: 16 players (10 real + 6 generic)
- Women's Spring Cup: 15 players (10 real female + 5 generic)
- Men's Doubles Spring 2026: 4 real men's pairs registered

**Section 8 — Groups:** Section removed (all tournaments are KNOCKOUT format, no group stage needed).

**Section 9 — Rankings:**
- Men's Open SINGLES: 8 generic players (kept for test coverage)
- Women's Open SINGLES: 6 generic players (kept for test coverage)
- Men's 35+ SINGLES: 5 generic players (kept for test coverage)
- Mixed Doubles Open PAIR: 18 real pairs, all 0 points (TOURN-02)
- Mixed Doubles Open MEN: 18 real male players, all 0 points
- Mixed Doubles Open WOMEN: 16 real female players, all 0 points

**Section 10 — Doubles Pairs (PAIR-02 — real players):**
- Men's Doubles: Zaprazny+Siebenstich (1900), Stevko+Pomsar (1500), Macho+Uhliar (1100), Kardos+Sramko (700)
- Women's Doubles: Nestarcova+Siebenstichova (1720), Zaprazna+Strakova (1400)
- Mixed Doubles: 18 real pairs unchanged from Plan 01

**Section 11 — Pair Registrations:** 4 men's pairs registered for ProSet Men's Doubles Spring 2026.

**Section 12 — Pair Rankings:** Men's Doubles PAIR + Women's Doubles PAIR with real pairs.

**Section 13 — Point Tables:** Unchanged (deleteMany + create pattern preserved exactly).

**Section 14 — Phase 9 Test Scaffolding:** Removed. The realistic tournaments replace the Winter Open 2024 test data, archived 2024 rankings, tiebreaker scenarios, and individual MEN ranking for Men's Doubles.

### Task 2: seed-knockout-test.js — ProSet Location Lookup

Changed `prisma.location.findFirst()` to `prisma.location.findFirst({ where: { clubName: 'ProSet' } })` with updated error message referencing ProSet by name. Minimal change — 3 lines modified.

## Verification Results

Full pipeline verified: `npx prisma db push --force-reset && npx prisma db seed && node prisma/seed-knockout-test.js`

- All 6 tournaments have ProSet as location — no generic location names
- Tournament statuses: 2 COMPLETED, 2 IN_PROGRESS, 2 SCHEDULED
- No tournament in Mixed Doubles Open category
- Mixed Doubles Open PAIR ranking: 18 pairs at 0 points each
- Mixed Doubles Open MEN ranking: 18 players at 0 points each
- Mixed Doubles Open WOMEN ranking: 16 players at 0 points each
- Men's Doubles pairs reference real players (Zaprazny, Siebenstich, Stevko, Pomsar, Macho, Uhliar, Kardos, Sramko)
- Women's Doubles pairs reference real players (Nestarcova, Siebenstichova, Zaprazna, Strakova)
- seed-knockout-test.js finds ProSet explicitly, runs without errors
- Seed is idempotent: can be run multiple times on same DB without errors

## Deviations from Plan

**1. [Rule 2 - Bug] Added idempotency for men's and women's doubles pairs**
- **Found during:** Task 1 verification (second seed run after first succeeded)
- **Issue:** Men's and women's doubles pair creation used `prisma.doublesPair.create()` which fails with unique constraint error on repeated seed runs
- **Fix:** Added `findFirst` check before each `create` call — consistent with the existing mixed doubles pair pattern in the same file
- **Files modified:** `backend/prisma/seed.js`
- **Commit:** 95a2886 (included in Task 1 commit)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 95a2886 | feat(09-02): rewrite tournament, registration, ranking sections of seed.js |
| Task 2 | 3d1ce9a | feat(09-02): update seed-knockout-test.js to explicitly find ProSet location |

## Self-Check: PASSED
