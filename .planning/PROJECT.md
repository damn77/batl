# BATL — Amateur Tennis League Manager

## What This Is

BATL is a web application for managing amateur tennis league tournaments end-to-end. Organizers create and run tournaments (registration, seeded draws, results), and players self-report match results, view their standings, and track their match history — replacing the WhatsApp groups and spreadsheets that amateur leagues currently depend on.

The league is organized by **categories** (gender × age group × tournament type: singles/doubles). Tournaments belong to a category; points accumulate across tournaments within a season (calendar year) into per-category rankings. As of v1.1, knockout tournaments support consolation brackets (MATCH_2 guarantee), ensuring every player gets at least 2 real matches with automated loser routing, bracket progression, and consolation point awards.

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

### Active

(None — start next milestone to define)

### Future (v1.2+)

- Group stage visualization and result entry (round-robin matches)
- Swiss system pairing and result tracking
- Combined format: group stage → knockout bracket with automatic advancement
- MATCH_1 / UNTIL_PLACEMENT guarantee levels
- Player statistics: win/loss record per category per season, head-to-head view
- Organizer dashboard with active tournaments, pending result confirmations
- Result edit history — log of who changed what and when (organizer view)

### Out of Scope

- Real-time live scoring — results entered after matches, not during — adds complexity with no v1 payoff
- Mobile app — web-first; responsive web covers mobile use cases
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
- **15 features delivered** (001–011 + v1.0 + v1.1 milestone phases); ~41,700 LOC; architecture is stable and well-tested
- Organizer and player roles are both active users of the app; admin manages configuration
- Scoring is format-dependent: sets (e.g. 6:4, 7:5), match-level (e.g. 7:5), or tiebreak-only depending on tournament rules
- Group, Swiss, and Combined tournament formats have DB support but no result entry or visualization yet — targeted for v1.2+
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

---
*Last updated: 2026-03-03 after v1.1 milestone*
