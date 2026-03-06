---
phase: quick-4
plan: 01
subsystem: tournament-registration
tags: [backend, frontend, enrichment, rankings, bracket]
dependency_graph:
  requires: [008-tournament-rankings, 009-bracket-generation, 010-seeding-placement]
  provides: [enriched-registration-response, player-list-columns]
  affects: [PlayerListPanel, getTournamentRegistrations]
tech_stack:
  added: []
  patterns: [Promise.all parallel queries, null-safe rendering]
key_files:
  created: []
  modified:
    - backend/src/api/tournamentRegistrationController.js
    - frontend/src/components/PlayerListPanel.jsx
decisions:
  - getRoundLabel helper uses diff from totalRounds for Final/SF/QF/R1 labels
  - Promise.all used for ranking + match queries to avoid sequential latency
  - Bracket position derived from round 1 matches sorted by matchNumber (pos 1/2 per match)
  - DOUBLES ranking falls back to pair.seedingScore if no RankingEntry found
  - seed field from Match.player1Seed/player2Seed/pair1Seed/pair2Seed (not seedPosition)
metrics:
  duration: 8m
  completed: "2026-03-06"
  tasks: 2
  files: 2
---

# Quick Task 4: In-Tournament Registered Players List — Ranking/Seed/Bracket/Round Columns Summary

**One-liner:** Enriched registration API response with live ranking, seed number, bracket position, and furthest round data for both SINGLES and DOUBLES tournament types.

## What Was Built

The Registered Players list in the tournament view showed placeholder dashes for the Ranking, Seed, Bracket, and Round columns. This task filled those columns with real database data.

### Backend (tournamentRegistrationController.js)

Added a `getRoundLabel(roundNumber, totalRounds)` helper that converts a numeric round to a display label:
- `totalRounds - roundNumber === 0` → `'Final'`
- `=== 1` → `'SF'`
- `=== 2` → `'QF'`
- else → `'R{roundNumber}'`

In `getTournamentRegistrations`:

**SINGLES path:**
1. `Promise.all` fetches `RankingEntry` (current year, SINGLES type, not archived) and all `Match` records for the tournament
2. Builds `rankByPlayerId` from ranking entries
3. Builds `seedByPlayerId` from `match.player1Seed` / `match.player2Seed`
4. Builds `bracketPositionByPlayerId` by iterating round-1 matches sorted by `matchNumber`, assigning sequential positions (player1 gets odd slot, player2 gets even slot)
5. Builds `furthestRoundByPlayerId` by finding max `roundNumber` per player across all matches, then converting to label

Response now includes `player.ranking`, `seed`, `bracketPosition`, `furthestRound` on each registration.

**DOUBLES path:** Same approach using `pair1Seed`/`pair2Seed` and `pair1Id`/`pair2Id`, with `type: 'PAIR'` ranking lookup. Response includes `ranking`, `seed`, `bracketPosition`, `furthestRound` at the registration level.

### Frontend (PlayerListPanel.jsx)

- **SINGLES Ranking**: `registration.player?.ranking != null ? registration.player.ranking : '-'`
- **SINGLES Seed**: `registration.seed != null ? registration.seed : '-'`
- **DOUBLES Ranking**: `registration.ranking != null ? registration.ranking : (registration.pair?.seedingScore || '-')`
- **DOUBLES Seed**: `registration.seed != null ? registration.seed : '-'`
- **Bracket column**: `registration.bracketPosition != null ? registration.bracketPosition : '-'`
- **Round column**: `registration.furthestRound || '-'`

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

### Files exist:
- backend/src/api/tournamentRegistrationController.js — FOUND (modified)
- frontend/src/components/PlayerListPanel.jsx — FOUND (modified)

### Commits:
- 0af7f5a: feat(quick-4-01): enrich registration response with ranking, seed, bracket, round data
- 4c5caaf: feat(quick-4-02): display enriched ranking, seed, bracket, round data in PlayerListPanel

### Build: Vite build passed with 0 errors

## Self-Check: PASSED
