# Features Research

**Domain:** Amateur tennis league tournament management — missing features for match play and statistics
**Researched:** 2026-02-26
**Confidence:** HIGH (based on domain knowledge + 11 features already delivered)

---

## Context: What's Already Built

Features 001–011 cover: user management, categories, tournament creation, registration, doubles pairs, format rules, tournament view, rankings/points, bracket generation, seeding placement, knockout bracket visualization.

This research focuses on what's **not yet built**.

---

## Table Stakes Features

*Must have or users stay on WhatsApp/spreadsheets.*

### Match Result Submission

- [ ] Player can enter match score in format-aware form (sets, tiebreak, match-level based on tournament rules)
- [ ] Score is validated against the tournament's scoring format before submission
- [ ] Submitted result appears as "pending confirmation" to the organizer
- [ ] First submitter wins by default; second player can dispute within a time window
- [ ] Player sees their submitted result and its status (pending / confirmed / disputed)

**Complexity:** MEDIUM — needs format-aware validation + state machine

### Organizer Result Confirmation

- [ ] Organizer sees all pending results in a dashboard list
- [ ] Organizer can confirm a result with one click
- [ ] Organizer can override a disputed result
- [ ] Organizer can manually enter a result (for forfeit, walkover, or when player doesn't submit)
- [ ] Confirmed results trigger bracket/standings progression automatically

**Complexity:** LOW — CRUD + trigger logic

### Dispute Handling

- [ ] Second player can flag a submitted result as disputed
- [ ] Both submitted scores shown to organizer side-by-side
- [ ] Organizer resolves by selecting one score or entering the correct one
- [ ] Resolved disputes are logged for audit trail

**Complexity:** LOW — state field + organizer view

### Knockout Bracket Progression

- [ ] When a match result is confirmed, the winner advances to the next match slot automatically
- [ ] Bracket view updates to reflect the winner and next match pairing
- [ ] When all matches in a round are confirmed, next round matches are created
- [ ] Tournament moves to COMPLETED when final match is confirmed

**Complexity:** MEDIUM — bracket slot assignment algorithm (depends on Feature 009 structure)

### Tournament Status Lifecycle

- [ ] Organizer can manually start a tournament (SCHEDULED → IN_PROGRESS)
- [ ] Tournament auto-completes when final result confirmed (IN_PROGRESS → COMPLETED)
- [ ] Registration closes automatically when tournament starts
- [ ] Tournament status badge reflects current state throughout the app

**Complexity:** LOW — state machine with guards

### Organizer Live Dashboard

- [ ] Active tournaments listed with pending result count
- [ ] Quick access to confirm/dispute pending results
- [ ] Current bracket or standings visible at a glance

**Complexity:** LOW — aggregated view over existing data

---

## Table Stakes — Group Stage

*Required if organizer selects "Group" or "Combined" format.*

- [ ] Organizer can generate group assignments from registered players
- [ ] Each group has a round-robin match schedule (all vs all)
- [ ] Group standings table: wins, losses, sets won/lost, games won/lost
- [ ] Tiebreaker resolution: wins → head-to-head → sets % → games % → alphabetical
- [ ] Completed group stage advances top N players to knockout phase (Combined format)
- [ ] Group stage visualization (table + matches) in tournament view

**Complexity:** HIGH — full scheduling + standings + visualization

---

## Table Stakes — Swiss System

*Required if organizer selects "Swiss System" format.*

- [ ] Organizer can set number of rounds for the Swiss tournament
- [ ] Pairing algorithm: pair by score, avoid rematches, handle odd numbers (bye)
- [ ] Organizer generates next round after current round is complete
- [ ] Swiss standings: points, tie-break criteria
- [ ] Final standings after all rounds complete

**Complexity:** HIGH — pairing algorithm (tournament-pairings library recommended)

---

## Table Stakes — Player Statistics

*Required for players to stop using paper records.*

- [ ] Player can view their own match history (all tournaments, all results)
- [ ] Win/loss record per category per season
- [ ] Head-to-head record against specific opponents
- [ ] Points earned per tournament (links to Feature 008 rankings)
- [ ] Match history is public on player profile

**Complexity:** MEDIUM — aggregation queries + UI

---

## Differentiators

*Competitive advantage over paper-based management — valuable but not blocking v1.*

- **Score history timeline** — graphical season progression for a player
- **Organizer analytics** — tournament participation trends, popular categories
- **Draw preview** — show what bracket would look like before publishing
- **Waitlist management** — automatic promotion when player withdraws post-registration
- **Walkover / retirement result types** — distinguish between DNS, DNF, walkover, retirement
- **Match scheduling** — assign specific times and court numbers to matches
- **Mobile-optimized score entry** — touch-first UI with large tap targets

---

## Anti-Features (Deliberately Exclude from v1)

| Feature | Why Exclude |
|---------|-------------|
| Live score entry (point-by-point) | Requires dedicated scorer or phone at courtside — adds complexity, adds hardware requirement |
| Automated player notifications (email/push) | Infrastructure cost; in-app is sufficient for v1 |
| Video/photo uploads for match evidence | Storage cost; overkill for amateur disputes |
| Rating/ELO system (separate from rankings) | Feature 008 covers rankings; second system creates confusion |
| Player-to-player messaging | WhatsApp replacement via structure, not chat |
| Federation-level hierarchy (multiple leagues) | Single-league scope for v1 |
| Stripe / payment integration | Entry fees tracked, but no online payment in v1 |

---

## Dependencies Between Features

```
Tournament Lifecycle (SCHEDULED→IN_PROGRESS→COMPLETED)
  └── Match Result Submission
        └── Organizer Confirmation
              ├── Knockout Bracket Progression
              ├── Group Standings Update
              └── Swiss Pairing (next round unlock)

Player Statistics
  └── Match Result History (confirmed results only)
```
