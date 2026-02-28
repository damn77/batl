# BATL — Amateur Tennis League Manager

## What This Is

BATL is a web application for managing amateur tennis league tournaments end-to-end. Organizers create and run tournaments (registration, seeded draws, results), and players self-report match results, view their standings, and track their match history — replacing the WhatsApp groups and spreadsheets that amateur leagues currently depend on.

The league is organized by **categories** (gender × age group × tournament type: singles/doubles). Tournaments belong to a category; points accumulate across tournaments within a season (calendar year) into per-category rankings. As of v1.0, a knockout tournament can run from registration through final standings entirely within BATL.

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

### Active

<!-- What needs to be built next — v1.1 candidates -->

- [ ] Group stage visualization and result entry (round-robin matches)
- [ ] Swiss system pairing and result tracking
- [ ] Combined format: group stage → knockout bracket with automatic advancement
- [ ] Player statistics: win/loss record per category per season, head-to-head view
- [ ] Organizer dashboard with active tournaments, pending result confirmations
- [ ] Result edit history — log of who changed what and when (organizer view)

### Out of Scope

- Real-time live scoring — results entered after matches, not during — adds complexity with no v1 payoff
- Mobile app — web-first; responsive web covers mobile use cases
- Push/email notifications — in-app only for now
- Chat or messaging — WhatsApp replacement via structured app content, not chat
- External calendar integration — not a priority for v1 league management
- Multi-league or federation hierarchy — single-league scope

## Context

- **Stack**: Node.js 20+ (ES Modules), Express 5.1, Prisma ORM, PostgreSQL, React 19, Vite 7, React Bootstrap 2.10, TanStack React Table 8.21
- **Auth**: Passport.js (local strategy), bcrypt, CASL for authorization, session-based
- **Testing**: Vitest (frontend), Jest (backend), 89+ backend tests passing
- **v1.0 shipped 2026-02-28** — full knockout tournament execution loop now functional end-to-end
- **15 features delivered** (001–011 + v1.0 milestone phases 1, 01.1, 2, 3); ~38,500 LOC; architecture is stable and well-tested
- Organizer and player roles are both active users of the app; admin manages configuration
- Scoring is format-dependent: sets (e.g. 6:4, 7:5), match-level (e.g. 7:5), or tiebreak-only depending on tournament rules
- Group, Swiss, and Combined tournament formats have DB support but no result entry or visualization yet — primary target for v1.1

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
| Bracket persistence inserted as Phase 01.1 (between Phase 1 and 2) | Phase 2 lifecycle engine needed real DB records to advance winners | ✓ Good — correct dependency ordering |
| advanceBracketSlot + checkAndCompleteTournament inside submitResult Prisma transaction | Atomicity guaranteed — lifecycle transitions tied to result writes | ✓ Good — no partial state possible |
| Organizer-only auto-COMPLETED detection | Player submissions never trigger COMPLETED transition | ✓ Good — preserves organizer authority at tournament end |
| PlayerProfilePage merged into PlayerPublicProfilePage (/players/:id) | Single route for both self and public view; isOwnProfile gates edit | ✓ Good — simpler routing, no duplicate pages |

---
*Last updated: 2026-02-28 after v1.0 milestone*
