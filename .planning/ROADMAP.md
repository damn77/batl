# Roadmap: BATL — Amateur Tennis League Manager

## Overview

This milestone closes the critical gap between BATL as a sophisticated registration tool and BATL as a complete tournament management system. Three phases deliver the full loop: players can submit match results using format-aware score entry (Phase 1), confirmed results automatically advance knockout brackets and transition tournament status (Phase 2), and players can view their full match history and win/loss record on public profiles (Phase 3). When all three phases complete, a tournament can run from registration to final standings without the organizer touching a spreadsheet or a WhatsApp group.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Match Result Submission** - Players submit format-aware scores; organizer confirms, overrides, or enters special outcomes; organizer-lock prevents further player edits
- [ ] **Phase 2: Tournament Lifecycle and Bracket Progression** - Organizer starts tournaments; confirmed results advance knockout winners automatically; tournament auto-completes when final match is confirmed
- [ ] **Phase 3: Player Statistics** - Players view full match history and win/loss record; statistics are public on player profile pages

## Phase Details

### Phase 1: Match Result Submission
**Goal**: Players and organizers can submit, update, and lock match results using format-aware score entry
**Depends on**: Nothing (first phase)
**Requirements**: MATCH-01, MATCH-02, MATCH-03, MATCH-04, MATCH-05
**Success Criteria** (what must be TRUE):
  1. A match participant can open a score entry form that shows inputs matching the tournament's scoring format (sets, match score, or tiebreak-only) and submit the result
  2. A player who submitted a result can update it as long as the organizer has not yet modified it
  3. An organizer can submit or update the result for any match at any time, overriding any player-submitted result
  4. Once an organizer modifies a result, the score entry form is no longer editable by players for that match
  5. An organizer can record a special outcome (walkover, forfeit, no-show) for any match without entering a score
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Backend API: PATCH /api/v1/matches/:id/result with participant check, organizer-lock, and special outcomes
- [ ] 01-02-PLAN.md — Frontend utilities: bracketColors update, isMatchParticipant(), matchService, SetsScoreForm, BigTiebreakForm
- [ ] 01-03-PLAN.md — Frontend composition: MatchResultModal + bracket wiring (KnockoutBracket, BracketMatch)

### Phase 2: Tournament Lifecycle and Bracket Progression
**Goal**: Tournament status transitions driven by organizer actions and confirmed results, with automatic knockout bracket advancement
**Depends on**: Phase 1
**Requirements**: LIFE-01, LIFE-02, LIFE-03, LIFE-04
**Success Criteria** (what must be TRUE):
  1. An organizer can press "Start Tournament" and the status transitions from SCHEDULED to IN_PROGRESS, closing player registration simultaneously
  2. When a knockout match result is set, the winner's name appears in the correct next-round bracket slot without any manual organizer action
  3. When the final match result of a tournament is confirmed, the tournament status automatically changes to COMPLETED
  4. The knockout bracket visualization (Feature 011) reflects the live bracket state — players already advanced are shown in their correct slots
**Plans**: TBD

### Phase 3: Player Statistics
**Goal**: Players can view their full match history and win/loss record on their public profile
**Depends on**: Phase 1
**Requirements**: STATS-01, STATS-02
**Success Criteria** (what must be TRUE):
  1. A player can navigate to a statistics page that lists every match they have played, showing tournament name, category, opponent name, score, and win/loss outcome
  2. Any user (including non-logged-in visitors) can view a player's match history by visiting that player's public profile page
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Match Result Submission | 2/3 | In Progress|  |
| 2. Tournament Lifecycle and Bracket Progression | 0/? | Not started | - |
| 3. Player Statistics | 0/? | Not started | - |
