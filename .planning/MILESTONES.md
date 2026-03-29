# Milestones

## v1.5 Group & Combined Tournaments (Shipped: 2026-03-29)

**Phases completed:** 6 phases (27–31, 30.1), 17 plans
**Timeline:** 14 days (2026-03-15 → 2026-03-29)
**Commits:** 126

**Delivered:** Group stage tournaments (round-robin) and combined format (groups → knockout brackets) with configurable advancement rules, group formation via seeded snake draft, standings with multi-level tiebreakers, cross-table match visualization, and group placement points.

**Key accomplishments:**

- Group formation with snake-draft seeding, round-robin schedule generation, and manual swap UI
- Group match play with result entry, lifecycle guards, accordion visualization, and doubles support
- 6-level tiebreaker chain with Kahn's cycle detection, manual organizer resolution, and stale override warnings
- Combined format advancement: waterfall service, 5-level cross-group ranking, atomic SECONDARY bracket generation
- N×N head-to-head cross-table with perspective-correct scores, bidirectional cross-highlighting, and tabbed responsive layout
- Group placement points with knockout supersede for advancing players, GROUP-only tournament end-to-end

**Requirements:** 53/53 v1.5 requirements complete (GFORM-01–07, GPLAY-01–05, GVIEW-01–05, GSTAND-01–06, COMB-01–09, ADV-01–04, PTS-01–04, CROSS-01–10)
**Audit:** Passed — 1 non-critical integration gap (deleteGroupTieOverride dead code)

---

## v1.4 UI Rework & Mobile Design (Shipped: 2026-03-15)

**Phases completed:** 7 phases, 11 plans, 5 tasks

**Key accomplishments:**

- (none recorded)

---

## v1.3 Manual Draw & QoL (Shipped: 2026-03-06)

**Phases completed:** 7 phases, 12 plans
**Timeline:** 2 days (2026-03-04 → 2026-03-06)
**Files changed:** 29 files, ~2,040 lines added
**Commits:** 24

**Delivered:** Manual bracket draw for organizer-controlled player placement, tournament copy/delete/revert lifecycle actions, admin access parity with organizer role, and integration bug fixes for format filtering and player count guards.

**Key accomplishments:**

- Manual bracket draw — empty bracket generation with position-by-position player assignment via dropdowns and start-gate validation
- Tournament copy — one-click duplication of tournament config (category, rules, format, location, capacity) into new SCHEDULED tournament
- Tournament deletion with cascading cleanup (registrations, draw, results) and ranking recalculation for completed tournaments
- Revert-to-SCHEDULED for IN_PROGRESS tournaments — erases draw, unlocks registration
- ADMIN superuser bypass in ProtectedRoute for full organizer functionality parity
- Integration fixes: format filter forwarding (COPY-05) and player count guard alignment (DRAW-06)

**Requirements:** 24/24 v1.3 requirements complete (DRAW-01–06, COPY-01–05, DEL-01–05, REVERT-01–04, ADMIN-01–02, UX-01–02)
**Audit:** tech_debt — 1 dead code issue accepted (BracketGenerationSection revert branch unreachable)

---

## v1.2 Data Seeding Update (Shipped: 2026-03-04)

**Phases completed:** 3 phases, 5 plans, 4 tasks
**Timeline:** 1 day (2026-03-03 → 2026-03-04)
**Files changed:** 24 files, ~3,300 lines added
**Commits:** 30

**Delivered:** Real league data seeding — all seed scripts now populate 34 real BATL players with linked accounts, 18 mixed doubles pairs, realistic ranking data, and the ProSet location, replacing all prototype placeholder values.

**Key accomplishments:**

- Seeded 34 real BATL league players (18 male, 16 female) with linked user accounts (ADMIN + ORGANIZER)
- Created 18 mixed doubles pairs in Mixed Doubles Open category with zero-point rankings
- Consolidated all locations to "ProSet" and removed 4 generic placeholder locations
- Replaced linear ranking formula (1000/900/800) with realistic varied point values and tournament counts
- Merged two active-tournament seed scripts into one; all scripts reference real players by email

**Requirements:** 19/19 v1.2 requirements complete (PLAY-01–03, ACCT-01–03, PAIR-01–02, TOURN-01–04, LOC-01–02, DATA-01–02, SCRP-01–03)
**Audit:** Passed — 1 audit with 1 gap closure phase (Phase 11)

---

## v1.1 Consolation Brackets (Shipped: 2026-03-03)

**Phases completed:** 8 phases, 15 plans
**Timeline:** 4 days (2026-02-28 → 2026-03-03)
**Files changed:** 81 files, ~11,750 lines added
**Commits:** 99

**Delivered:** Consolation bracket system — MATCH_2 tournaments guarantee every player at least 2 real matches via auto-generated consolation brackets, loser routing, bracket progression, result entry with cascade recalculation, and consolation point awards.

**Key accomplishments:**

- Match Guarantee configuration (MATCH_2) with consolation bracket auto-generation at draw time (mirror draw)
- Automatic loser routing to consolation with real-match counting (BYE/walkover exclusion)
- Consolation bracket progression, opt-out (self-service + organizer), and tournament completion gating
- Consolation bracket visualization with TBD styling, result entry, and organizer opt-out UI
- Match result resubmission with cascade-clear, dry-run verification, and winner-lock for non-organizers
- Consolation point tables and automated point calculation for MATCH_2 tournaments

**Requirements:** 13/13 v1.1 requirements complete (CONF-01, DRAW-01–02, LIFE-01–05, VIEW-01–03, PTS-01–02)
**Audit:** 5 audits drove iterative gap closures (Phases 5.1, 5.2, 6, 6.1, 7, 8)

---

## v1.0 Tournament Core (Shipped: 2026-02-28)

**Phases completed:** 4 phases, 13 plans
**Timeline:** 3 days (2026-02-26 → 2026-02-28)
**Files changed:** 53 files, ~7,700 lines added

**Delivered:** Full tournament execution loop — players submit format-aware match results, organizer starts the tournament, knockout bracket advances automatically, and match history is publicly visible on player profiles.

**Key accomplishments:**

- Format-aware match result submission (sets, tiebreak, special outcomes) with organizer-lock preventing player edits after organizer writes
- Seeded bracket draw generation — close registration, generate atomically, swap slots, save Bracket/Round/Match DB records
- Tournament lifecycle engine — start tournament (SCHEDULED→IN_PROGRESS), auto-advance knockout winners, auto-complete on final match
- Public player statistics page (/players/:id) — match history with category filter, sortable columns, W/L badges, pagination
- Clickable player name links from bracket and rankings tables to public profiles

**Requirements:** 19/19 v1 requirements complete (MATCH-01–05, DRAW-01–08, LIFE-01–04, STATS-01–02)

---
