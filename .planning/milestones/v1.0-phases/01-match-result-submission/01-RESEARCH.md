# Phase 1: Match Result Submission - Research

**Researched:** 2026-02-26
**Domain:** Form-driven match result entry with role-aware access control, format-specific score validation, and optimistic UI updates via SWR
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Two scoring formats in scope: **SETS** and **BIG_TIEBREAK** (other formats — STANDARD_TIEBREAK, MIXED — not handled in Phase 1)
- **SETS format**: Players enter set scores only (e.g., 6-3, 7-5). When a set reaches 6-6, score is entered as 7-6 with a separate tiebreak score input in parenthesis notation (e.g., 7-6(4))
- **BIG_TIEBREAK format**: Each game is a super tiebreak to 10. Players enter one score per tiebreak (e.g., 10:3, 7:10, 12:10). Can be best of 1 or 2 tiebreaks (per tournament config `winningTiebreaks`)
- Form reads the tournament's `defaultScoringRules` (and any `ruleOverrides` on the match) to determine which format to render
- Score entry is accessed from the **bracket view** — players click their match card to open a modal
- Only match participants (player1 / player2 in singles; pair members in doubles) can click the match card and open the modal
- Non-participants: match card is not clickable; no modal, no read-only view
- Organizers can click **any** match card regardless of participation
- If both players submit scores, the second submission **overwrites** the first (no conflict flagging)
- After submission the bracket reflects the winner using the existing match card highlight color (Feature 011 behavior); no separate "pending" indicator is shown
- Organizer uses the same bracket-click modal to view and override results; the organizer's modal version includes edit controls
- Once an organizer modifies a result: the match is **organizer-locked**. If a participant opens the modal, they see a read-only form with the message: "Result confirmed by organizer"
- Organizer-only special outcomes — players cannot record special outcomes
- Recorded inside the **same match modal**: a toggle or selector switches between "Enter score" and "Special outcome" modes
- Special outcome types: walkover (W/O), forfeit (FF), no-show (N/S)
- Organizer selects which player/pair wins when recording the outcome
- Bracket display: winner highlighted in **blue** (not green — distinguishes from a played result) + compact label (W/O, FF, N/S) shown instead of a score

### Claude's Discretion

- Exact modal layout (field order, labels, button placement)
- How many sets the SETS format form renders (derive from `winningSets` in scoring rules)
- Error messages for invalid score combinations (e.g., entering a third set when the match is already won)
- Specific shades of blue/green — use `bracketColors.js` config (Feature 011)

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MATCH-01 | Any player participating in a match can submit the match result using a format-aware score entry form that shows the correct inputs based on the tournament's scoring rules (sets, match score, or tiebreak-only) | Backend: new PATCH `/api/v1/matches/:id/result` endpoint + `matchResultService`; Frontend: `MatchResultModal` component reads `defaultScoringRules.formatType` to render SETS or BIG_TIEBREAK form |
| MATCH-02 | Any player participating in a match can update a previously submitted result, as long as the organizer has not yet modified it | Same endpoint; backend checks `result.submittedBy === 'PLAYER'` (not `'ORGANIZER'`). Player can re-submit; organizer lock field blocks further player edits |
| MATCH-03 | Organizer can submit or update the match result for any match at any time | Same endpoint; organizer path bypasses participant check and sets `submittedBy: 'ORGANIZER'` in result JSON, triggering organizer-locked state |
| MATCH-04 | Once the organizer modifies a match result, players can no longer update it (organizer-locked) | Backend: `result.submittedBy === 'ORGANIZER'` flag in result JSON acts as lock. Player PUT rejected with 403 ORGANIZER_LOCKED if lock is set |
| MATCH-05 | Organizer can enter a result for special outcomes (walkover, forfeit, no-show) | Same endpoint with `outcome` field; `score` is null; `winner` is set; bracket shows blue color + compact label |
</phase_requirements>

## Summary

Phase 1 builds match result submission on top of the existing `Match` model and bracket view. The `Match` model already has a `result` JSON column (currently used by Feature 011 to display scores) and `status` field. Phase 1 adds a write path: a new backend endpoint (`PATCH /api/v1/matches/:id/result`) plus a frontend modal component (`MatchResultModal`) that replaces the currently inert match-card click handler in `KnockoutBracket.jsx`.

The principal design challenge is the role-aware modal: the same click on `BracketMatch` must open one of three views — a player editable form, an organizer editable form with a special-outcome toggle, or a read-only confirmation message. This is resolved by passing the caller's role and participant status as props to the modal at the `KnockoutBracket` level where `currentUserPlayerId` is already available. The existing `useAuth()` hook provides `user.role` and `user.playerId`.

Concurrency (two players submitting simultaneously) must be blocked at the database layer. The canonical resolution is a Prisma transaction with an optimistic lock check: read the current result, verify it is not organizer-locked, then update. No extra schema columns are needed — the `result` JSON itself carries the `submittedBy` flag that gates all access-control decisions.

**Primary recommendation:** Extend the existing `Match` model and `tournamentController`/`tournamentService` pattern — add one new endpoint, one new service function, one new modal component — and wire the modal into the bracket click handler that already exists in `KnockoutBracket.jsx`.

## Standard Stack

### Core (already in project — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Express 5 | 5.1.0 | Backend API routing | Already in use; `PATCH /api/v1/matches/:id/result` follows established route pattern |
| Prisma ORM | 6.18.0 / 6.19.2 client | Database read/write on `Match` table | All DB access goes through Prisma; `prisma.match.update` is the correct pattern |
| Joi | 18.0.1 | Backend request body validation | All existing endpoints use Joi via `validateBody(schema)` middleware in `validate.js` |
| React 19 | 19.2.0 | Modal UI component | All frontend components are React functional components |
| React Bootstrap | 2.10.10 | Modal, Form, Button primitives | All dialogs in the project use `react-bootstrap` `Modal`, `Form`, `Button` |
| SWR | 2.3.6 | Cache invalidation after submit | `useMatches` SWR hook's `mutate()` call re-fetches bracket match data after a result write |
| Passport.js session | 0.7.0 | Authentication — `req.user` | `isAuthenticated` middleware populates `req.user.role`, `req.user.playerId` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-i18next | 16.3.5 | UI label translation | All user-visible strings go through `t()` |
| @casl/ability | 6.7.3 | Role authorization | Already used in `authorize` middleware; can guard organizer-only routes |
| apiClient (axios wrapper) | project internal | Frontend → backend HTTP calls | All frontend service calls use `apiClient` — follow the error shape documented in `CLAUDE.md` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSON `result` column for lock flag | Separate `lockedBy` DB column | Separate column is cleaner for queries but requires a migration; JSON flag avoids schema change and keeps all result metadata together |
| SWR `mutate()` for cache update | Manual state update optimistically | SWR mutate is already the pattern in `useMatches`; optimistic updates risk showing stale data if the backend rejects the write |
| Single `PATCH /matches/:id/result` | Separate `/submit` and `/lock` endpoints | Single endpoint simplifies client; role determines behavior server-side |

**Installation:** No new packages needed. The complete stack is already installed.

## Architecture Patterns

### Recommended File Structure (new files only)

```
backend/
├── src/
│   ├── api/
│   │   ├── matchController.js           # new — PATCH /api/v1/matches/:id/result handler
│   │   ├── routes/
│   │   │   └── matchRoutes.js           # new — Express router for match endpoints
│   │   └── validators/
│   │       └── matchValidator.js        # new — Joi schemas for result submission
│   └── services/
│       └── matchResultService.js        # new — business logic, lock check, DB write

frontend/
└── src/
    ├── components/
    │   ├── MatchResultModal.jsx          # new — role-aware modal (player / organizer / read-only)
    │   ├── SetsScoreForm.jsx             # new — SETS format inputs (dynamic set count)
    │   └── BigTiebreakForm.jsx           # new — BIG_TIEBREAK format inputs
    └── services/
        └── matchService.js              # new — submitMatchResult(), uses apiClient
```

### Pattern 1: Backend — PATCH endpoint with role-gated logic

**What:** Single endpoint handles all callers; role is determined from `req.user.role` (already populated by Passport session deserialization).

**When to use:** One write path that behaves differently by role avoids duplicated route definitions and keeps the audit trail in one place.

```javascript
// Source: established pattern in backend/src/api/tournamentController.js
// File: backend/src/api/matchController.js

import { isAuthenticated } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import * as matchResultService from '../../services/matchResultService.js';

// PATCH /api/v1/matches/:id/result
export async function submitMatchResult(req, res, next) {
  try {
    const { id } = req.params;
    const isOrganizer = ['ADMIN', 'ORGANIZER'].includes(req.user.role);
    const submitterPlayerId = req.user.playerId; // null for ORGANIZER without profile

    const result = await matchResultService.submitResult({
      matchId: id,
      body: req.body,
      isOrganizer,
      submitterPlayerId
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message }
      });
    }
    next(err);
  }
}
```

### Pattern 2: Backend — matchResultService with transaction-based lock check

**What:** Service layer performs participant validation, organizer-lock check, and DB write in a single Prisma transaction to avoid TOCTOU race conditions.

**When to use:** Any time a read-then-write sequence must be atomic.

```javascript
// Source: Prisma interactive transactions docs (prisma.io/docs/guides/performance/transactions)
// File: backend/src/services/matchResultService.js

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function submitResult({ matchId, body, isOrganizer, submitterPlayerId }) {
  return prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: { pair1: true, pair2: true }
    });

    if (!match) throwError(404, 'MATCH_NOT_FOUND', 'Match not found');

    // Participant check (players only)
    if (!isOrganizer) {
      const isParticipant = isMatchParticipant(match, submitterPlayerId);
      if (!isParticipant) throwError(403, 'NOT_PARTICIPANT', 'You are not a participant in this match');
    }

    // Organizer-lock check (players only)
    const existingResult = match.result ? JSON.parse(match.result) : null;
    if (!isOrganizer && existingResult?.submittedBy === 'ORGANIZER') {
      throwError(403, 'ORGANIZER_LOCKED', 'Result has been confirmed by organizer');
    }

    // Build result JSON
    const resultJson = buildResultJson(body, isOrganizer);

    const updated = await tx.match.update({
      where: { id: matchId },
      data: {
        result: JSON.stringify(resultJson),
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    return updated;
  });
}
```

### Pattern 3: Frontend — Role-aware modal triggered from BracketMatch click

**What:** `KnockoutBracket.jsx` already accepts an `onMatchClick` prop. Wire it to open `MatchResultModal` with the match data and derived role/participant flags.

**When to use:** Any time the same UI action (click match card) must produce different behavior per role.

```javascript
// Source: existing KnockoutBracket.jsx (already passes onMatchClick to BracketRound → BracketMatch)
// File: frontend/src/components/KnockoutBracket.jsx — add inside component

import { useState } from 'react';
import MatchResultModal from './MatchResultModal';
import { useAuth } from '../utils/AuthContext';

// Inside KnockoutBracket component:
const { user } = useAuth();
const [selectedMatch, setSelectedMatch] = useState(null);
const isOrganizer = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';

const handleMatchClick = (match) => {
  if (!user) return; // unauthenticated — no modal
  const isParticipant = checkIsParticipant(match, user.playerId);
  if (!isOrganizer && !isParticipant) return; // non-participant player — no modal
  setSelectedMatch(match);
};

// Pass to BracketRound/BracketMatch via onMatchClick prop (already wired)
```

### Pattern 4: Frontend — SWR cache invalidation after submit

**What:** After a successful result submission, call `mutate()` on the SWR key for the bracket's matches to trigger a re-fetch so the bracket card updates immediately.

**When to use:** Every write operation that should update the bracket display.

```javascript
// Source: SWR docs (swr.vercel.app/docs/mutation) — mutate(key) triggers re-fetch
// File: frontend/src/services/matchService.js

import apiClient from './apiClient';

export async function submitMatchResult(matchId, resultData) {
  const response = await apiClient.patch(`/v1/matches/${matchId}/result`, resultData);
  return response.data.data;
}
```

```javascript
// Inside MatchResultModal.jsx after successful submit:
await submitMatchResult(match.id, formData);
mutate(); // from useMatches SWR hook passed down as prop, or via useSWRConfig().mutate(key)
onClose();
```

### Pattern 5: Result JSON canonical format

**What:** The `Match.result` column is a JSON string. Phase 1 must define the canonical schema now — all later phases depend on it.

**Canonical schema (SETS format):**
```json
{
  "winner": "PLAYER1",
  "submittedBy": "PLAYER",
  "sets": [
    { "setNumber": 1, "player1Score": 6, "player2Score": 3, "tiebreakScore": null },
    { "setNumber": 2, "player1Score": 7, "player2Score": 6, "tiebreakScore": 4 }
  ],
  "outcome": null
}
```

**Canonical schema (BIG_TIEBREAK format):**
```json
{
  "winner": "PLAYER2",
  "submittedBy": "PLAYER",
  "sets": [
    { "setNumber": 1, "player1Score": 7, "player2Score": 10, "tiebreakScore": null },
    { "setNumber": 2, "player1Score": 10, "player2Score": 3, "tiebreakScore": null }
  ],
  "outcome": null
}
```

**Canonical schema (special outcome):**
```json
{
  "winner": "PLAYER1",
  "submittedBy": "ORGANIZER",
  "sets": [],
  "outcome": "WALKOVER"
}
```

**Key fields:**
- `winner`: `"PLAYER1"` or `"PLAYER2"` — position-based, consistent with existing `BracketMatch.jsx` `getPlayerState()` logic
- `submittedBy`: `"PLAYER"` or `"ORGANIZER"` — the organizer-lock flag; never read from the request body, always set server-side
- `sets[]`: array of set scores; empty for special outcomes
- `tiebreakScore`: loser's tiebreak points (parenthesis notation: `7-6(4)` → `tiebreakScore: 4`); `null` when no tiebreak
- `outcome`: `null` | `"WALKOVER"` | `"FORFEIT"` | `"NO_SHOW"` — set only for special outcomes

This schema extends the existing format already partially used by `BracketMatch.jsx` (`matchResult.winner`, `matchResult.sets[].player1Score`, `matchResult.sets[].tiebreakScore`).

### Pattern 6: Frontend — participant check utility

**What:** Determine if the logged-in player is a participant in a given match (singles or doubles).

**When to use:** In `KnockoutBracket.jsx` to decide whether to open the modal on match click.

```javascript
// File: frontend/src/utils/bracketUtils.js — extend existing file

export function isMatchParticipant(match, currentPlayerId) {
  if (!currentPlayerId) return false;
  if (!match) return false;

  // Singles: direct player match
  if (match.player1?.id === currentPlayerId || match.player2?.id === currentPlayerId) {
    return true;
  }

  // Doubles: check pair members
  const pair1Members = [match.pair1?.player1?.id, match.pair1?.player2?.id];
  const pair2Members = [match.pair2?.player1?.id, match.pair2?.player2?.id];
  return [...pair1Members, ...pair2Members].includes(currentPlayerId);
}
```

Note: this is an extension to the existing `bracketUtils.js` which already has `findMyMatch()` that does something similar. Unify with that function or extract the participant check from it.

### Anti-Patterns to Avoid

- **Setting `submittedBy` from the request body:** The client must never control the lock flag. Always derive it from `req.user.role` on the server.
- **Optimistic UI before server confirmation:** The bracket should only show the result after the API call succeeds and SWR re-fetches. Optimistic updates that fail silently leave the bracket in a wrong state.
- **Separate endpoints per role:** One endpoint with role-gating is cleaner; two endpoints (e.g., `/player-submit` and `/organizer-submit`) duplicate validation logic.
- **Re-parsing result JSON in every controller:** Parse once in the service layer; pass the parsed object around.
- **Not invalidating SWR after write:** The bracket card will show stale data until the next polling interval if `mutate()` is not called.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Race condition (two simultaneous submits) | Application-level semaphore | Prisma `$transaction` with optimistic read-before-write | Database transactions are the correct atomicity boundary; app-level locking doesn't survive multiple instances |
| Role validation | Custom role check in controller | `isAuthenticated` + `req.user.role` check (already in every controller) | Passport session already deserializes `role` into `req.user` |
| Request validation | Manual body field checks | `validateBody(Joi schema)` middleware (already in `validate.js`) | All existing endpoints use this; consistent error format |
| SWR cache update | Manual state mutation | `mutate()` from `useMatches` SWR hook | SWR mutate triggers a re-fetch with server confirmation; avoids stale bracket state |
| Participant membership check | Fetching pair members fresh on each click | Read pair members from match object returned by `GET /matches` (already includes `pair1.player1`, `pair1.player2`) | The matches API already returns nested player/pair data; no extra DB call needed |
| Score validation (set score logic) | Custom parser | Inline Joi schema: `player1Score: Joi.number().integer().min(0).max(7)` etc., with cross-field validation | Joi cross-field validation (`when()`, `custom()`) handles the 7-6 tiebreak trigger correctly |

**Key insight:** The match data model, auth middleware, Joi validation, and SWR data layer are all in place. Phase 1 is wiring a write path through existing infrastructure.

## Common Pitfalls

### Pitfall 1: Organizer-Lock Race Condition

**What goes wrong:** Player A reads match (no organizer lock), organizer concurrently submits (sets lock), Player A's write succeeds and overwrites organizer result.

**Why it happens:** Read-check-then-write is not atomic without a transaction.

**How to avoid:** Use `prisma.$transaction` with the lock check inside it. The transaction ensures serializable read-modify-write. At the Prisma default isolation level (PostgreSQL: READ COMMITTED), use `tx.match.update({ where: { id, result: { not: { contains: '"submittedBy":"ORGANIZER"' } } } })` or check inside the transaction before updating.

**Warning signs:** Organizer sees their confirmed result reverted to a player-submitted score after concurrent test.

### Pitfall 2: Match Object Missing Pair Member Data

**What goes wrong:** `isMatchParticipant()` receives a match object from the SWR hook that does not include `pair1.player1.id`, so doubles players are never identified as participants and cannot open the modal.

**Why it happens:** The existing `GET /api/v1/tournaments/:id/matches` response shape must be verified to include nested pair player IDs.

**How to avoid:** Check the `tournamentService.getMatches()` Prisma query's `include` clause. If it does not include `pair1: { include: { player1: true, player2: true } }`, add it. The `BracketMatch.jsx` PropTypes already expect `pair1.player1` and `pair1.player2` — the data may already be there.

**Warning signs:** Doubles players cannot open the score entry modal despite being participants.

### Pitfall 3: Score Validation — Third Set on a Won Match

**What goes wrong:** A SETS format with `winningSets: 2` allows a user to enter a third set (e.g., 6-0) when one player already leads 2-0, submitting an invalid result.

**Why it happens:** Frontend form renders set inputs statically without checking the running score tally.

**How to avoid:** Frontend: derive the maximum sets needed dynamically (`winningSets * 2 - 1`). Disable/hide additional set inputs once one player has won enough sets. Backend: cross-validate set count against `winningSets` in the Joi schema or service layer.

**Warning signs:** Submitted result JSON has more sets than the match format allows.

### Pitfall 4: Tiebreak Score Direction

**What goes wrong:** The tiebreak notation `7-6(4)` means the loser scored 4, not the winner. A form that asks "tiebreak score" without labeling whose score it is produces reversed data.

**Why it happens:** Standard tennis notation is ambiguous to users unfamiliar with the convention.

**How to avoid:** Label the tiebreak input explicitly: "Loser's tiebreak score" or use the parenthesis notation `(loser points)` in the placeholder. Store `tiebreakScore` as the loser's points, matching the existing `BracketMatch.jsx` display `{set.tiebreakScore && <sup>({set.tiebreakScore})</sup>}`.

**Warning signs:** User enters winner's points; displayed score shows wrong parenthesis value.

### Pitfall 5: BIG_TIEBREAK Score Maximum

**What goes wrong:** Super tiebreaks are to 10 with a 2-point lead. Valid scores include 10-8, 12-10, 15-13 etc. Validating `max(10)` would reject valid extended tiebreaks.

**Why it happens:** The 10-point target is not an absolute maximum.

**How to avoid:** Backend Joi validation: require one score ≥ 10 and the difference ≥ 2, rather than a hard max. Or accept any non-negative integers and verify the winner at the application level.

**Warning signs:** Organizers cannot submit 12-10 tiebreak results.

### Pitfall 6: `bracketColors.js` Missing Special Outcome Color

**What goes wrong:** Special outcome winners must show blue (not green). The current `bracketColors.js` has no `specialOutcomeWinner` key.

**Why it happens:** Feature 011 only tracked standard match completion (green). Phase 1 extends the color semantics.

**How to avoid:** Add `specialOutcomeWinner: '#cfe2ff'` (Bootstrap info-bg) to `bracketColors.js` and update `BracketMatch.jsx` to apply this color when `matchResult.outcome !== null`.

**Warning signs:** Walkover/forfeit winner shows green instead of blue.

### Pitfall 7: apiClient Error Handling

**What goes wrong:** Frontend catches the raw axios error (`err.response?.data?.error?.message`) instead of the normalized shape from `apiClient`'s interceptor (`err.message`).

**Why it happens:** This was a widespread bug fixed 2025-11-27 per `CLAUDE.md`.

**How to avoid:** Always use `err.message` in catch blocks when calling `apiClient`. The `CLAUDE.md` has the canonical example.

**Warning signs:** Users see "An error occurred" instead of specific backend error messages (e.g., "ORGANIZER_LOCKED").

## Code Examples

### Joi Validation Schema for Match Result

```javascript
// Source: established Joi patterns from backend/src/api/validators/bracketValidator.js
// File: backend/src/api/validators/matchValidator.js

import Joi from 'joi';

const setSchema = Joi.object({
  setNumber: Joi.number().integer().min(1).max(5).required(),
  player1Score: Joi.number().integer().min(0).max(7).required(),
  player2Score: Joi.number().integer().min(0).max(7).required(),
  tiebreakScore: Joi.number().integer().min(0).max(99).allow(null).default(null)
});

const bigTiebreakSetSchema = Joi.object({
  setNumber: Joi.number().integer().min(1).max(3).required(),
  player1Score: Joi.number().integer().min(0).required(),
  player2Score: Joi.number().integer().min(0).required()
}).custom((value, helpers) => {
  const { player1Score, player2Score } = value;
  const maxScore = Math.max(player1Score, player2Score);
  const diff = Math.abs(player1Score - player2Score);
  if (maxScore < 10 || diff < 2) {
    return helpers.error('any.invalid');
  }
  return value;
});

export const submitResultSchema = Joi.object({
  formatType: Joi.string().valid('SETS', 'BIG_TIEBREAK').required(),
  winner: Joi.string().valid('PLAYER1', 'PLAYER2').required(),
  sets: Joi.when('formatType', {
    is: 'SETS',
    then: Joi.array().items(setSchema).min(1).max(5).required(),
    otherwise: Joi.array().items(bigTiebreakSetSchema).min(1).max(3).required()
  })
}).when(Joi.object({ outcome: Joi.exist() }).unknown(), {
  then: Joi.object() // special outcome path handled separately
});

export const submitSpecialOutcomeSchema = Joi.object({
  outcome: Joi.string().valid('WALKOVER', 'FORFEIT', 'NO_SHOW').required(),
  winner: Joi.string().valid('PLAYER1', 'PLAYER2').required()
});
```

### SWR Mutate After Submit

```javascript
// Source: SWR docs — mutate() with key re-fetches the data
// File: frontend/src/components/MatchResultModal.jsx

import { useSWRConfig } from 'swr';
import { submitMatchResult } from '../services/matchService';

const { mutate } = useSWRConfig();

const handleSubmit = async (formData) => {
  try {
    await submitMatchResult(match.id, formData);
    // Re-fetch the matches for this bracket — key matches useMatches SWR key format
    mutate(`/tournaments/${tournamentId}/matches?${JSON.stringify(filters)}`);
    onClose();
  } catch (err) {
    setError(err.message || t('errors.genericFallback'));
  }
};
```

### Register Match Routes in index.js

```javascript
// Source: existing pattern in backend/src/index.js
// Add after existing route registrations:

import matchRoutes from './api/routes/matchRoutes.js';
app.use('/api/v1/matches', matchRoutes);
```

### Check Organizer Role Pattern

```javascript
// Source: existing pattern in backend/src/api/tournamentController.js (req.user.role check)
// File: backend/src/api/matchController.js

const isOrganizer = req.user.role === 'ORGANIZER' || req.user.role === 'ADMIN';
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `matchResult` as separate object attached to match response | `Match.result` JSON column in DB | Existing (Phase 011) | Result is stored once in DB; all components parse via `getMatchResult()` in `BracketMatch.jsx` |
| Separate read and write endpoints | Single `PATCH` with role-gated logic | Phase 1 decision | Fewer endpoints; single audit trail |
| Axios direct error access (`err.response?.data`) | apiClient interceptor normalized shape (`err.message`) | 2025-11-27 bugfix | Must use `err.message` in all catch blocks |

**Current state of Match model:** The `Match` model's `result` column is currently populated only after bracket generation assigns results. Phase 1 is the first time players/organizers write to it directly. The `completedAt` and `status = 'COMPLETED'` fields are also written for the first time by Phase 1.

## Open Questions

1. **Effective scoring rules resolution — match `ruleOverrides`**
   - What we know: The `Match` model has a `ruleOverrides` JSON column for per-match rule overrides. The tournament has `defaultScoringRules`.
   - What's unclear: Is there an existing utility function that merges `defaultScoringRules` + `ruleOverrides` into effective rules, or does Phase 1 need to build this?
   - Recommendation: Check `tournamentRulesService.js` for a `resolveEffectiveRules()` or similar. If it exists, use it. If not, implement inline in `matchResultService` as `JSON.parse(match.ruleOverrides || '{}')` merged over `tournament.defaultScoringRules`.

2. **`getMatches` response — pair member player IDs included?**
   - What we know: `BracketMatch.jsx` PropTypes expect `pair1.player1.id`, `pair1.player2.id`.
   - What's unclear: The Prisma `include` in `tournamentService.getMatches()` was not fully inspected. If pair player IDs are not returned, `isMatchParticipant()` for doubles will silently fail.
   - Recommendation: Read `tournamentService.js` `getMatches` Prisma query before starting Wave 1. Add `pair1: { include: { player1: true, player2: true } }` to the include if missing.

3. **SWR cache key for bracket matches**
   - What we know: `useMatches(tournamentId, { bracketId }, shouldFetch)` uses `JSON.stringify(filters)` as part of the SWR key.
   - What's unclear: After submitting a result, the modal needs to call `mutate()` with the exact SWR key string to invalidate the right cache entry.
   - Recommendation: Export a `getMatchesSWRKey(tournamentId, filters)` helper from `tournamentViewService.js` so the modal and the hook always use the same key string. This avoids hard-coding the key format in two places.

## Sources

### Primary (HIGH confidence)

- `D:/Workspace/BATL/backend/prisma/schema.prisma` — Match model columns (`result`, `status`, `completedAt`, `ruleOverrides`), existing enums
- `D:/Workspace/BATL/backend/src/api/tournamentController.js` — Controller pattern for Express handlers
- `D:/Workspace/BATL/backend/src/middleware/auth.js` — `req.user` shape (`id`, `role`, `playerId`)
- `D:/Workspace/BATL/backend/src/middleware/validate.js` — `validateBody(schema)` usage
- `D:/Workspace/BATL/backend/package.json` — Exact dependency versions
- `D:/Workspace/BATL/frontend/src/components/KnockoutBracket.jsx` — `onMatchClick` prop, `currentUserPlayerId`, `useMatches` SWR hook usage
- `D:/Workspace/BATL/frontend/src/components/BracketMatch.jsx` — Existing `result` JSON parsing, `winner` field, `tiebreakScore` display, PropTypes
- `D:/Workspace/BATL/frontend/src/services/tournamentViewService.js` — `useMatches` SWR hook, SWR key construction
- `D:/Workspace/BATL/frontend/src/config/bracketColors.js` — Color keys and `mergeColors()` API
- `D:/Workspace/BATL/frontend/src/utils/AuthContext.jsx` — `useAuth()` returns `{ user: { role, playerId } }`
- `D:/Workspace/BATL/frontend/src/components/MatchScoringRulesForm.jsx` — `formatType` enum values, `winningSets`/`winningTiebreaks` field names in scoring rules JSON
- `D:/Workspace/BATL/CLAUDE.md` — apiClient error handling pattern, tech stack versions, project conventions

### Secondary (MEDIUM confidence)

- Prisma interactive transactions documentation: `prisma.$transaction` is the standard pattern for read-modify-write atomicity in Prisma (confirmed by existing usage of `$transaction` patterns in `pointCalculationService` referenced in `tournamentRoutes.js`)

### Tertiary (LOW confidence — validate before use)

- Tiebreak score direction convention ("loser's tiebreak score in parentheses"): confirmed against CONTEXT.md specification `7-6(4)` style and existing `BracketMatch.jsx` display logic `{set.tiebreakScore && <sup>({set.tiebreakScore})</sup>}`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies confirmed from `package.json` files; no new packages needed
- Architecture patterns: HIGH — confirmed from existing controller/service/SWR patterns in codebase
- Result JSON schema: HIGH — derived from existing `BracketMatch.jsx` PropTypes and display logic; canonical format is a direct extension of what is already parsed
- Pitfalls: HIGH for race condition and error handling (confirmed from STATE.md and CLAUDE.md); MEDIUM for tiebreak notation and score validation (confirmed from CONTEXT.md spec)

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (stable tech stack; 30 days)
