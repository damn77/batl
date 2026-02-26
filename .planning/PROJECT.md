# BATL — Amateur Tennis League Manager

## What This Is

BATL is a web application for managing amateur tennis league tournaments end-to-end. Organizers create and run tournaments (registration, draws, results), and players self-report match results, track their standings, and manage their participation — replacing the WhatsApp groups and spreadsheets that amateur leagues currently depend on.

The league is organized by **categories** (gender × age group × tournament type: singles/doubles). Tournaments belong to a category; points accumulate across tournaments within a season (calendar year) into per-category rankings.

## Core Value

A complete tournament runs from registration to final standings without the organizer touching a spreadsheet or a WhatsApp group.

## Requirements

### Validated

<!-- Built across features 001–011 -->

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

### Active

<!-- What needs to be built next -->

- [ ] Players can submit match results in a format-aware score entry form
- [ ] Organizer receives result submissions and can confirm or reject them
- [ ] Dispute handling: first submission wins, other player can flag a conflict
- [ ] Tournament progresses automatically as results are confirmed (bracket advances)
- [ ] Organizer can manage the live draw — assign players to positions, override seeding
- [ ] Group stage visualization and result entry (round-robin matches)
- [ ] Swiss system pairing and result tracking
- [ ] Combined format: group stage → knockout bracket with automatic advancement
- [ ] Player statistics page: match history, win/loss record, points per season, head-to-head
- [ ] Tournament status transitions (SCHEDULED → IN_PROGRESS → COMPLETED) driven by results
- [ ] Organizer dashboard with active tournaments, pending result confirmations

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
- **11 features delivered** (001–011); architecture is stable and well-tested
- Organizer and player roles are both active users of the app; admin manages configuration
- Scoring is format-dependent: sets (e.g. 6:4, 7:5), match-level (e.g. 7:5), or tiebreak-only depending on tournament rules

## Constraints

- **Tech stack**: Existing Node/React/PostgreSQL/Prisma stack — new features extend it, no rewrites
- **Score entry UX**: Players use mobile browsers in the field; score entry must be touch-friendly and minimal
- **Result integrity**: Once confirmed by organizer, results are immutable; disputes resolved before confirmation
- **Backward compatibility**: Existing API contracts (001–011) cannot be broken

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Self-report results (player submits, organizer confirms) | Reduces organizer workload; players are accountable | — Pending |
| First submission wins, other player can dispute | Simple default; avoids blocking tournament progress | — Pending |
| In-app notifications only | Avoids email infrastructure complexity in v1 | — Pending |
| Knockout bracket visualization already built (011) | Group/Swiss visualizations still needed | — Pending |

---
*Last updated: 2026-02-26 after initialization*
