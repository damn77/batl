# BATL — Amateur Tennis League Manager

## What This Is

BATL is a mobile-first web application for managing amateur tennis league tournaments end-to-end. Organizers create and run tournaments (registration, seeded draws, results) from their phone at courtside, and players self-report match results, view their standings, and track their match history — replacing the WhatsApp groups and spreadsheets that amateur leagues currently depend on.

The league is organized by **categories** (gender × age group × tournament type: singles/doubles). Tournaments belong to a category; points accumulate across tournaments within a season (calendar year) into per-category rankings. As of v1.1, knockout tournaments support consolation brackets (MATCH_2 guarantee). As of v1.3, organizers can manually draw, copy, delete, and revert tournaments. As of v1.4, the entire UI is mobile-responsive. As of v1.5, tournaments support GROUP (round-robin) and COMBINED (groups → knockout brackets) formats with snake-draft group formation, 6-level tiebreakers, cross-table match visualization, configurable advancement rules, and group placement points.

## Core Value

A complete tournament runs from registration to final standings without the organizer touching a spreadsheet or a WhatsApp group.

## Requirements

### Validated

<!-- Built across features 001–011 and v1.0 milestone -->

- ✓ User accounts with role-based access (ADMIN, ORGANIZER, PLAYER) — 001
- ✓ Player profiles with personal details, contact info, and eligibility data — 001
- ✓ Category system: gender × age group × type (Singles/Doubles) — 002
- ✓ Tournament creation with location, capacity, dates, organizer contacts — 003
- ✓ Player registration for tournaments with eligibility validation — 003
- ✓ Doubles pair management (create/manage partnerships) — 006
- ✓ Tournament format definition: Knockout, Group, Swiss, Combined — 004
- ✓ Format-specific match rules: sets, tiebreaks, advantage, scoring format — 004
- ✓ Cascading rules (tournament → group/bracket → round → match) — 004
- ✓ Tournament detail page (info, status, registered players, format display) — 005
- ✓ Tournament rankings and points system with per-category standings — 008
- ✓ Year-based season management with annual rollover — 008
- ✓ Bracket generation (4–128 players, bye/preliminary calculation) — 009
- ✓ Seeding placement (top N players placed in optimal bracket positions) — 010
- ✓ Knockout bracket visualization with zoom/pan, BYE toggle, "My Match" — 011
- ✓ Format-aware match result submission with organizer-lock — v1.0
- ✓ Seeded bracket draw persisted to DB (Bracket/Round/Match records) — v1.0
- ✓ Tournament lifecycle: start, auto-advance knockout bracket, auto-complete — v1.0
- ✓ Public player statistics page with match history, W/L record — v1.0

<!-- v1.1: Consolation Brackets -->

- ✓ Match Guarantee (None/MATCH_2) configurable on knockout tournaments — v1.1 (CONF-01)
- ✓ Consolation bracket auto-generated at main bracket draw time (mirror draw) — v1.1 (DRAW-01)
- ✓ Consolation slots populate with players as main bracket matches complete — v1.1 (DRAW-02)
- ✓ Loser auto-routed to consolation when real-match count < 2 — v1.1 (LIFE-01)
- ✓ BYE/walkover excluded from real-match count for consolation eligibility — v1.1 (LIFE-02)
- ✓ Consolation winners auto-advance through consolation rounds — v1.1 (LIFE-03)
- ✓ Tournament auto-completes only when all brackets (main + consolation) done — v1.1 (LIFE-04)
- ✓ Player/pair can opt out of consolation (forfeit, opponent auto-advances) — v1.1 (LIFE-05)
- ✓ Tournament page displays consolation bracket alongside main bracket — v1.1 (VIEW-01)
- ✓ Participants enter and view consolation match results — v1.1 (VIEW-02)
- ✓ TBD-blocked consolation matches visible, result entry disabled — v1.1 (VIEW-03)
- ✓ Consolation points awarded based on final consolation round won — v1.1 (PTS-01)
- ✓ Consolation point tables pre-seeded and admin-editable — v1.1 (PTS-02)

<!-- v1.2: Data Seeding Update -->

- ✓ 34 real BATL league players seeded with linked accounts — v1.2 (PLAY-01, PLAY-02, ACCT-01, ACCT-02)
- ✓ 18 mixed doubles pairs and category registrations from league data — v1.2 (PAIR-01, PAIR-02, TOURN-01)
- ✓ All locations standardized to "ProSet" — v1.2 (LOC-01, LOC-02)
- ✓ Realistic ranking data with varied point values and tournament counts — v1.2 (DATA-01, DATA-02)
- ✓ Seed scripts consolidated and referencing real players — v1.2 (SCRP-01, SCRP-02, SCRP-03)

<!-- v1.3: Manual Draw & QoL -->

- ✓ Manual bracket draw with position-by-position player assignment — v1.3 (DRAW-01–06)
- ✓ Tournament copy (duplicate config/rules into new SCHEDULED tournament) — v1.3 (COPY-01–05)
- ✓ Tournament deletion with cascading cleanup and ranking recalculation — v1.3 (DEL-01–05)
- ✓ Revert tournament to SCHEDULED (erase draw, unlock registration) — v1.3 (REVERT-01–04)
- ✓ Admin access parity with organizer role — v1.3 (ADMIN-01–02)
- ✓ Bracket view UX fixes (scroll behavior, doubles modal) — v1.3 (UX-01–02)

<!-- v1.4: UI Rework & Mobile Design -->

- ✓ Mobile dev tooling: QR code access for real-device testing — v1.4 (TOOL-01, TOOL-02)
- ✓ Mobile navigation: Offcanvas drawer with auto-close and role-gated links — v1.4 (NAV-01–03)
- ✓ Tournament view: bracket-first hero zone with status-driven accordion layout — v1.4 (LAYOUT-01–05)
- ✓ Bracket mobile UX: auto-scale, touch panning, 44px tap targets — v1.4 (BRKT-01–04)
- ✓ Score entry mobile UX: fullscreen modal, iOS numeric keypad, sticky footer — v1.4 (SCORE-01–04)
- ✓ Organizer mobile support: segmented mode toggle, stacked confirmation buttons — v1.4 (ORG-01–02)
- ✓ App-wide responsive: overflow prevention, column hiding, card layouts, dashboard quick links — v1.4 (RESP-01–08)

<!-- v1.5: Group & Combined Tournaments -->

- ✓ Group formation with snake-draft seeding and balanced group validation — v1.5 (GFORM-01–07)
- ✓ Round-robin schedule generation with circle method — v1.5 (GPLAY-01–05)
- ✓ Group match result entry with lifecycle guards and format rule compliance — v1.5 (GPLAY-01–05)
- ✓ Group visualization with standings tables, match grids, and completion progress — v1.5 (GVIEW-01–05)
- ✓ 6-level tiebreaker chain with head-to-head, cycle detection, manual resolution — v1.5 (GSTAND-01–06)
- ✓ Combined format: group-to-knockout advancement with spillover selection — v1.5 (COMB-01–09, ADV-01–04)
- ✓ Cross-table N×N match results grid with bidirectional cross-highlighting — v1.5 (CROSS-01–10)
- ✓ Group placement points with knockout supersede for advancing players — v1.5 (PTS-01–04)
- ✓ GROUP-only tournament end-to-end lifecycle — v1.5 (GVIEW-05)

### Active

(No active requirements — next milestone not yet planned)

### Future (v1.6+)

- Swiss system pairing and result tracking
- MATCH_1 / UNTIL_PLACEMENT guarantee levels
- Player statistics: win/loss record per category per season, head-to-head view
- Organizer dashboard with active tournaments, pending result confirmations
- Result edit history — log of who changed what and when (organizer view)
- Production data seeding / migration tooling

### Out of Scope

- Real-time live scoring — results entered after matches, not during — adds complexity with no v1 payoff
- Native mobile app — responsive web covers mobile use cases (validated by v1.4)
- Push/email notifications — in-app only for now
- Chat or messaging — WhatsApp replacement via structured app content, not chat
- External calendar integration — not a priority for league management
- Multi-league or federation hierarchy — single-league scope

## Context

- **Stack**: Node.js 20+ (ES Modules), Express 5.1, Prisma ORM, PostgreSQL, React 19, Vite 7, React Bootstrap 2.10, TanStack React Table 8.21
- **Auth**: Passport.js (local strategy), bcrypt, CASL for authorization, session-based
- **Testing**: Vitest (frontend), Jest (backend), 89+ backend tests passing
- **v1.0 shipped 2026-02-28** — full knockout tournament execution loop functional end-to-end
- **v1.1 shipped 2026-03-03** — consolation brackets with MATCH_2 guarantee, loser routing, opt-out, result entry, cascade recalculation, and consolation point awards
- **v1.2 shipped 2026-03-04** — real league data seeding with 34 players, 18 mixed doubles pairs, realistic rankings, all scripts referencing real players and ProSet
- **v1.3 shipped 2026-03-06** — manual bracket draw, tournament copy/delete/revert, admin access parity, integration fixes
- **v1.4 shipped 2026-03-15** — mobile-first UI rework: Offcanvas navigation, bracket-first tournament view, touch-friendly score entry, app-wide responsive layout across all pages
- **v1.5 shipped 2026-03-29** — GROUP and COMBINED tournament formats: snake-draft group formation, round-robin matches, 6-level tiebreakers with cycle detection, combined format advancement (groups → knockout), cross-table visualization, group placement points
- **6 milestones delivered** (v1.0–v1.5), 31 phases; architecture is stable and well-tested
- Organizer and player roles are both active users of the app; admin manages configuration
- Scoring is format-dependent: sets (e.g. 6:4, 7:5), match-level (e.g. 7:5), or tiebreak-only depending on tournament rules
- All three tournament formats operational: KNOCKOUT (with consolation), GROUP (round-robin), COMBINED (groups → knockout brackets)
- Match result resubmission supports cascade-clear with dry-run verification and winner-lock for non-organizers

## Constraints

- **Tech stack**: Existing Node/React/PostgreSQL/Prisma stack — new features extend it, no rewrites
- **Score entry UX**: Players use mobile browsers in the field; score entry must be touch-friendly and minimal
- **Result integrity**: Once confirmed by organizer, results are immutable; disputes resolved before confirmation
- **Backward compatibility**: Existing API contracts (001–011) cannot be broken

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| No approval workflow — any participant can submit/update | Reduces organizer bottleneck; simpler UX | ✓ Good — reduced organizer burden in practice |
| Organizer edit locks players out from further changes | Organizer has final authority without requiring explicit "confirm" step | ✓ Good — clean authority model, no conflicts |
| In-app notifications only | Avoids email infrastructure complexity in v1 | ✓ Good — sufficient for v1 |
| Knockout bracket visualization already built (011) | Group/Swiss visualizations still needed | ✓ Good — reused in v1.0 without modification |
| Bracket persistence inserted as Phase 01.1 | Phase 2 lifecycle engine needed real DB records | ✓ Good — correct dependency ordering |
| advanceBracketSlot + checkAndCompleteTournament inside Prisma transaction | Atomicity guaranteed — lifecycle transitions tied to result writes | ✓ Good — no partial state possible |
| Organizer-only auto-COMPLETED detection | Player submissions never trigger COMPLETED transition | ✓ Good — preserves organizer authority |
| PlayerProfilePage merged into PlayerPublicProfilePage | Single route for both self and public view; isOwnProfile gates edit | ✓ Good — simpler routing |
| MATCH_2 default for new knockout tournaments | Double Elimination is the standard for amateur leagues | ✓ Good — reduces organizer config overhead |
| Consolation match numbers offset by 1000 | Guarantees no collision with main bracket match numbers | ✓ Good — simple, collision-proof |
| Consolation slots null at draw time, populated by loser routing | Clean separation: Phase 4 structure, Phase 5 population | ✓ Good — correct dependency ordering |
| pair1Id ?? player1Id nullish coalescing for doubles/singles duality | Single code path for both tournament types | ✓ Good — eliminates FK constraint errors |
| DRY_RUN_RESULT throw pattern for impact detection | Service throws to rollback transaction, controller returns 200 with impact data | ✓ Good — clean separation of concerns |
| Server-side consolation result derivation | Results auto-derived from DB, never passed by caller | ✓ Good — no client-side enumeration errors |
| 5 milestone audits with iterative gap closure | Each audit drove new phases (5.1, 5.2, 6, 6.1, 7, 8) | ✓ Good — systematic quality assurance |
| Player data extracted to separate ES module (data/players.js) | Data vs logic separation for seed scripts | ✓ Good — 3 scripts import from single source of truth |
| Email-based player lookup in test seeds | Deterministic references instead of alphabetical findMany | ✓ Good — guaranteed real named players in all seeds |
| RANKING_PROFILES lookup array for mock data | Replaces linear formula with realistic varied values | ✓ Good — rankings page looks realistic |
| drawMode stored as String (not enum) | Avoid Prisma enum migration for two values | ✓ Good — simpler schema evolution |
| Manual draw uses immediate-save per dropdown | Each assignment calls API directly, consistent with single-position API design | ✓ Good — no batch complexity |
| ADMIN superuser bypass in ProtectedRoute | Single early-exit grants all organizer access | ✓ Good — clean RBAC model |
| recalculateRankings outside Prisma transaction | Uses its own Prisma client internally — wrapping causes connection conflicts | ✓ Good — avoids deadlock |
| Three-dot dropdown for tournament actions | Replaces multiple inline buttons per row | ✓ Good — cleaner UI, scalable for more actions |
| React Bootstrap Offcanvas for mobile nav | Replaced broken Bootstrap JS hamburger with React-controlled drawer | ✓ Good — no Bootstrap JS dependency, auto-close on navigate |
| Status-driven accordion layout for tournament view | Bracket as hero for IN_PROGRESS, collapsed secondary sections | ✓ Good — reduces scroll on mobile, information hierarchy |
| Dual-render table/card pattern for responsive lists | `d-sm-none` cards + `d-none d-sm-block` tables | ✓ Good — clean breakpoint switch, no JS viewport detection needed |
| Global app.css with CSS custom properties | Design tokens for spacing, typography, density overrides | ✓ Good — consistent styling, single source of truth |
| inputMode="numeric" over type="number" for score inputs | iOS shows integer-only keypad without spinner buttons | ✓ Good — mobile-specific UX improvement |
| PlayerProfilePage merged into PlayerPublicProfilePage | Dead file found during audit — responsive changes applied to wrong file, caught by integration checker | ⚠️ Revisit — gap closure phase 26 fixed it |
| Snake-draft group formation with circle-method scheduling | Round-robin needs balanced groups + complete fixture generation in one atomic operation | ✓ Good — reliable group generation |
| 6-level tiebreaker with Kahn's algorithm for cycle detection | H2H creates circular locks (A>B>C>A); need deterministic fallthrough | ✓ Good — no non-deterministic ordering |
| SECONDARY BracketType enum (not CONSOLATION reuse) | Advancement brackets have different lifecycle/display rules than consolation | ✓ Good — clean separation of concerns |
| window.location.reload() after advancement/revert | SWR cache invalidation too complex for format structure changes | ⚠️ Revisit — works but inelegant |
| Cross-table entities derived from match participants, not group roster | Match participants are authoritative; roster can diverge | ✓ Good — correct data source |
| Group placement points use groupSize as participantCount | Each group awards points independently based on its own size | ✓ Good — fair per-group scoring |

## Current State

v1.5 shipped. All 6 milestones delivered (v1.0–v1.5). 31 phases across 6 milestones. Full tournament lifecycle operational: KNOCKOUT (with consolation/MATCH_2), GROUP (round-robin with tiebreakers), and COMBINED (groups → knockout brackets with advancement). Mobile-first UI, cross-table match visualization, group placement points.

Next milestone not yet planned.

---
*Last updated: 2026-03-29 after v1.5 milestone completion*
