# Pitfalls Research

**Domain:** Amateur tennis league tournament management — match results, state machines, group/Swiss, statistics
**Researched:** 2026-02-26
**Confidence:** HIGH (domain-specific pitfalls from tournament software patterns)

---

## Critical Pitfalls

### 1. Double-Submission Race Condition

**What goes wrong:** Two players submit simultaneously. Both submissions succeed. Now you have two "first submissions" and conflicting state.

**Warning signs:** Missing database-level constraint; relying only on application logic to prevent duplication.

**Prevention:** Add a unique constraint on `(matchId, status=PENDING)` or use a Prisma transaction with `findFirst` + `create` in a single atomic operation. The second submission should fail fast with a clear message ("Result already submitted").

**Phase:** Match Result Submission (first phase touching results)

---

### 2. Format-Unaware Score Validation

**What goes wrong:** A player submits `6:4, 6:3` for a tournament configured as tiebreak-only. The app accepts it. Organizer is confused. Trust erodes.

**Warning signs:** Score validated as "two numbers separated by colon" without checking tournament rules. Validation happens only on the frontend.

**Prevention:** Load the tournament's scoring rules at submission time. Backend validates score structure against `TournamentRules.scoringFormat`. Frontend shows the correct input fields based on format (sets vs match score vs tiebreak). Always validate on the backend — frontend validation is UX only.

**Phase:** Match Result Submission

---

### 3. Bracket Progression After Manual Override

**What goes wrong:** Organizer overrides a disputed result. The bracket was already advanced based on the first submission. Now the wrong player is in round 2.

**Warning signs:** Bracket progression triggers immediately on first submission rather than on confirmation. No reversal path.

**Prevention:** Bracket progression fires **only on organizer confirmation**, never on player submission. Build a compensation path: when organizer overrides before confirmation, no progression has happened yet. After confirmation, results are immutable.

**Phase:** Bracket Progression (same phase as result confirmation)

---

### 4. Group Stage Bye Imbalance

**What goes wrong:** 10 players, group size 4 → 1 group of 4 and 2 groups of 3. Unequal group sizes mean players in smaller groups play fewer matches. If standings use raw wins, the 3-player groups are systematically disadvantaged.

**Warning signs:** Using raw wins instead of win percentage. Assuming equal group sizes.

**Prevention:** Use win percentage (not raw wins) as primary standing criterion. Validate group size configuration before generating schedule. Warn organizer when group sizes will be unequal. Feature 004 already handles this validation — reuse it.

**Phase:** Group Stage

---

### 5. Swiss Pairing Rematch in Small Fields

**What goes wrong:** 6-player Swiss, 5 rounds. By round 4, avoiding rematches is mathematically impossible. Pairing algorithm fails or throws an error.

**Warning signs:** No fallback for unavoidable rematches. Algorithm crashes instead of gracefully allowing the rematch.

**Prevention:** The `tournament-pairings` library handles this gracefully with a "minimize rematches" strategy. If implementing manually: detect the case, flag the rematch in the match record, and notify the organizer. Rematches in late rounds are acceptable and expected.

**Phase:** Swiss System

---

### 6. Tournament "Stuck" State

**What goes wrong:** One match result never gets submitted (player injured, no-show). Tournament is IN_PROGRESS forever. Rankings never close. New season can't start.

**Warning signs:** No admin override path. No ability to force-complete or cancel a match.

**Prevention:** Organizer can always manually enter a result (walkover, forfeit, DNS). Add explicit "force complete tournament" admin action. Tournament status should never require a player action to unblock.

**Phase:** Tournament Lifecycle / Organizer Dashboard

---

### 7. Statistics Staleness

**What goes wrong:** Player stats are calculated on-the-fly from raw match data. As tournaments accumulate, the stats query gets slow. Player profile page times out for active players.

**Warning signs:** Stats calculated in real-time with N+1 queries on result history. No aggregation.

**Prevention:** Maintain incremental aggregated stats columns (`winsCount`, `lossesCount`, `setsWon`, etc.) on `PlayerProfile` or a dedicated `PlayerStats` model. Update atomically when a result is confirmed. Read from aggregated columns, not raw history.

**Phase:** Player Statistics

---

### 8. Inconsistent Score Display

**What goes wrong:** Backend stores `6:4,7:5` as a string. Frontend splits on comma. One component shows `6:4, 7:5`, another shows `6:4 7:5`, another shows `6-4, 7-5`. Players trust the app less.

**Warning signs:** Score stored as freeform string. No canonical format defined.

**Prevention:** Define a canonical score storage format early (e.g. JSON array: `[{home: 6, away: 4}, {home: 7, away: 5}]`). Write a single `formatScore(sets, tournamentFormat)` utility function used everywhere. Store parsed, display formatted.

**Phase:** Match Result Submission (define the format here; all later features inherit it)

---

### 9. Combined Format Advancement Rules Not Enforced

**What goes wrong:** Combined (Group + Knockout) tournament. Group stage finishes. System doesn't know which players advance from which group to which bracket position. Organizer manually shuffles players — defeats the purpose of automation.

**Warning signs:** Advancement rules (e.g., "top 2 from each group to main bracket") stored but not enforced by code.

**Prevention:** When group stage completes, `bracketProgressionService` reads advancement rules from `TournamentRules` and automatically populates knockout bracket positions from group standings. This is a dependency: group stage must be complete before knockout phase starts.

**Phase:** Combined Format (late phase — after both Group and Knockout are built)

---

### 10. Dispute Window Never Closes

**What goes wrong:** Player A submits result. Player B disputes 3 weeks later. Organizer is confused about what match this was. Tournament stalled.

**Warning signs:** No time limit on disputes. Dispute status can be opened at any time.

**Prevention:** Dispute window closes when: (a) organizer confirms, or (b) 48 hours pass after submission without dispute. After 48 hours, submission auto-confirms. Make this configurable per tournament. Log auto-confirmations clearly.

**Phase:** Match Result Submission / Organizer Dashboard

---

## Summary by Phase

| Phase | Critical Pitfalls |
|-------|------------------|
| Match Result Submission | Double-submission race, format-unaware validation, score storage format, dispute window |
| Organizer Confirmation | Bracket progression timing, dispute resolution |
| Tournament Lifecycle | Stuck state / force-complete |
| Group Stage | Bye imbalance, win percentage vs raw wins |
| Swiss System | Rematch in small fields |
| Player Statistics | Stats staleness / N+1 queries |
| Combined Format | Advancement rules not enforced |
