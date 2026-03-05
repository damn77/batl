# Phase 19: Integration Bug Fixes - Research

**Researched:** 2026-03-06
**Domain:** Frontend service parameter forwarding, UI guard/backend validation alignment
**Confidence:** HIGH

## Summary

Phase 19 closes two integration gaps identified in the v1.3 milestone audit. Both are small, self-contained fixes with no architectural changes required.

**Bug 1 (COPY-05 UX):** The format filter dropdown on TournamentSetupPage is wired correctly in the React component — `formatFilter` state populates `filters.formatType`, which is passed to `listTournaments(filters)`. However, `listTournaments` in `frontend/src/services/tournamentService.js` never appends `formatType` to the URLSearchParams. Additionally, the backend Joi schema `tournamentListQuery` in `backend/src/middleware/validate.js` does not include `formatType` as an allowed query field, so even if the frontend sent it, the validator would strip it. The backend service (`backend/src/services/tournamentService.js`) already handles `formatType` correctly — the gap is purely in the two layers between the frontend component and the backend service.

**Bug 2 (DRAW-06 UX):** `BracketGenerationSection.jsx` disables the Generate Draw button at `registeredPlayers.length < 2` and shows the message "At least 2 players are required." The backend bracket generation endpoint requires a minimum of 4 players (the bracket template system only covers 4–128 players). Organizers with 2 or 3 registered players can click the enabled button and receive an API error instead of a clear UI-level message before attempting the call.

Both fixes are frontend-only for Bug 1 (two files: service + validator schema), and frontend-only for Bug 2 (one file: BracketGenerationSection). No schema migrations, no new endpoints, no new dependencies.

**Primary recommendation:** Fix Bug 1 in `tournamentService.js` (add `formatType` param forwarding) and `validate.js` (add `formatType` to `tournamentListQuery` schema). Fix Bug 2 in `BracketGenerationSection.jsx` (change threshold from `< 2` to `< 4`, update message).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COPY-05 | Organizer can modify any parameter of the copied tournament after creation | Bug 1 fix enables format filter to work on TournamentSetupPage, making copied tournament discoverable and editable by format — critical UX path for COPY-05 workflow |
| DRAW-06 | Tournament cannot be started until all registered players/pairs are placed in the bracket | Bug 2 fix aligns frontend guard with backend minimum (4 players), preventing confusing API errors; DRAW-06 is already satisfied at the API level — this is the UX guard that enforces it |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | 19.x | Component UI | Project standard |
| React Bootstrap 2.10 | 2.10 | UI components (Button, Form, Alert) | Project standard |
| Joi | 18.0.1 | Backend query validation schema | Already used in `validate.js` for all other tournament query fields |
| URLSearchParams | native | Build query strings in frontend service | Already used in `listTournaments` for all other filter params |

### Supporting
None required — both fixes use existing infrastructure.

**Installation:** No new packages required.

## Architecture Patterns

### Fix 1: Frontend Service + Backend Schema (Two-File Fix)

**File 1:** `frontend/src/services/tournamentService.js`

The `listTournaments` function builds URLSearchParams and forwards `categoryId`, `status`, `startDate`, `page`, `limit` — but NOT `formatType`. The fix is a one-line addition mirroring the existing pattern:

```javascript
// Source: frontend/src/services/tournamentService.js lines 13-27 (existing pattern)
if (filters.formatType) params.append('formatType', filters.formatType);
```

**File 2:** `backend/src/middleware/validate.js`

The `tournamentListQuery` Joi schema at line 386 must include `formatType` as an allowed string:

```javascript
// Source: backend/src/middleware/validate.js lines 386-392 (existing schema)
tournamentListQuery: Joi.object({
  categoryId: Joi.string().uuid().optional(),
  status: Joi.string().valid('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED').optional(),
  formatType: Joi.string().valid('KNOCKOUT', 'GROUP', 'SWISS', 'COMBINED').optional(), // ADD THIS
  startDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional()
}),
```

The backend service layer already handles `formatType` correctly (confirmed at `backend/src/services/tournamentService.js` line 148).

### Fix 2: Frontend Component Guard (One-File Fix)

**File:** `frontend/src/components/BracketGenerationSection.jsx`

Two changes in the State B render block (lines 392-411):

1. Change the disabled condition from `registeredPlayers.length < 2` to `registeredPlayers.length < 4`
2. Change the warning text from "At least 2 players are required" to "At least 4 players are required to generate a draw"

```jsx
// Source: BracketGenerationSection.jsx lines 392-411 (existing code, with fix applied)
<Button
  variant="primary"
  size="lg"
  onClick={handleGenerateBracket}
  disabled={generating || registeredPlayers.length < 4}  // Changed from < 2
>
  ...
</Button>
{registeredPlayers.length < 4 && (
  <p className="text-warning mt-2 mb-0">
    <small>At least 4 players are required to generate a draw.</small>
  </p>
)}
```

### Recommended Project Structure

No new files. All changes are in-place edits to existing files:

```
frontend/src/services/tournamentService.js     # Add formatType param forwarding
backend/src/middleware/validate.js             # Add formatType to tournamentListQuery
frontend/src/components/BracketGenerationSection.jsx  # Change guard from < 2 to < 4
```

### Anti-Patterns to Avoid

- **Don't add client-side filtering as a workaround for Bug 1.** The correct fix is to forward the parameter to the server. Client-side filtering would require fetching all tournaments (ignoring pagination) and break scalability.
- **Don't change the backend minimum player count.** The bracket template system legitimately requires 4 players as its minimum (`docs/bracket-templates-all.json` starts at 4). The fix is the frontend guard, not the backend rule.
- **Don't introduce a new custom validator** for the format filter. Adding `formatType` to the existing Joi schema object is all that's needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Format filter validation | Custom regex or enum object | Joi `.valid()` with existing format values | Already pattern-established in the codebase for status filter |
| Player count minimum | Component-level constant | Hardcoded literal `4` matching backend minimum | Simple, obvious, no abstraction needed for a two-value comparison |

## Common Pitfalls

### Pitfall 1: Forgetting the Backend Schema Change
**What goes wrong:** Developer fixes `tournamentService.js` to forward `formatType` but omits the Joi schema update. The backend `validateQuery(schemas.tournamentListQuery)` middleware strips unknown fields by default in Joi (`.unknown(false)` behavior). The query param is silently dropped before reaching the service.
**Why it happens:** The frontend and backend fixes are in two different files; easy to forget one.
**How to avoid:** Fix both files in the same task/commit. Verify by checking the Joi `stripUnknown` / `unknown()` setting — the current schema at line 386 uses `Joi.object({...})` which strips unknown keys by default.
**Warning signs:** Filter dropdown appears to work (no error) but tournament list doesn't change when a format is selected.

### Pitfall 2: Wrong Threshold Value
**What goes wrong:** Changing `< 2` to `< 3` instead of `< 4`, misremembering the backend minimum.
**Why it happens:** Guessing instead of verifying against the backend constraint.
**How to avoid:** The backend minimum is documented in CLAUDE.md under Feature 009: "Joi 18.0.1 for request validation (playerCount: integer, 4-128)". The bracket template file starts at 4 players. Use `< 4`.

### Pitfall 3: Inconsistent Warning Message
**What goes wrong:** Updating the button's `disabled` condition to `< 4` but forgetting to update the conditional warning paragraph's threshold check.
**Why it happens:** Two separate expressions reference the same threshold.
**How to avoid:** Both the `disabled` prop and the warning paragraph conditional use `registeredPlayers.length < 4`. Search for all occurrences of `< 2` in the file before committing.

## Code Examples

### Current Broken State (for reference)

```javascript
// frontend/src/services/tournamentService.js — MISSING line
// formatType is never forwarded:
if (filters.categoryId) params.append('categoryId', filters.categoryId);
if (filters.status) params.append('status', filters.status);
// if (filters.formatType) params.append('formatType', filters.formatType);  <-- MISSING
if (filters.startDate) params.append('startDate', filters.startDate);
```

```javascript
// backend/src/middleware/validate.js — MISSING field
tournamentListQuery: Joi.object({
  categoryId: Joi.string().uuid().optional(),
  status: Joi.string().valid('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED').optional(),
  // formatType: Joi.string().valid(...).optional(),  <-- MISSING
  startDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional()
}),
```

```jsx
// frontend/src/components/BracketGenerationSection.jsx — WRONG threshold
disabled={generating || registeredPlayers.length < 2}  // should be < 4
// ...
{registeredPlayers.length < 2 && (  // should be < 4
  <p className="text-warning mt-2 mb-0">
    <small>At least 2 players are required to generate a draw.</small>  // should say 4
  </p>
)}
```

### Fixed State

```javascript
// frontend/src/services/tournamentService.js — FIXED
if (filters.categoryId) params.append('categoryId', filters.categoryId);
if (filters.status) params.append('status', filters.status);
if (filters.formatType) params.append('formatType', filters.formatType);
if (filters.startDate) params.append('startDate', filters.startDate);
```

```javascript
// backend/src/middleware/validate.js — FIXED
tournamentListQuery: Joi.object({
  categoryId: Joi.string().uuid().optional(),
  status: Joi.string().valid('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED').optional(),
  formatType: Joi.string().valid('KNOCKOUT', 'GROUP', 'SWISS', 'COMBINED').optional(),
  startDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional()
}),
```

```jsx
// frontend/src/components/BracketGenerationSection.jsx — FIXED
disabled={generating || registeredPlayers.length < 4}
// ...
{registeredPlayers.length < 4 && (
  <p className="text-warning mt-2 mb-0">
    <small>At least 4 players are required to generate a draw.</small>
  </p>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Frontend-only filter (client-side) | Server-side filter via query param | N/A (bug fix) | Correct pagination behavior, no over-fetching |
| Guard matches UI assumptions (< 2) | Guard matches backend minimum (< 4) | N/A (bug fix) | No spurious API errors for 2-3 player tournaments |

## Open Questions

None. Both bugs are fully diagnosed with exact file locations, line numbers, and fix content confirmed through code inspection.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30.2.0 (backend) / Vitest (frontend) |
| Config file | `backend/package.json` scripts |
| Quick run command | `cd backend && node --experimental-vm-modules node_modules/jest/bin/jest.js __tests__/integration/tournamentRoutes.test.js` (if exists) |
| Full suite command | `cd backend && node --experimental-vm-modules node_modules/jest/bin/jest.js` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COPY-05 | Format filter query param forwarded to backend and accepted by schema | integration | `cd backend && node --experimental-vm-modules node_modules/jest/bin/jest.js __tests__/integration/tournamentRoutes.test.js -t "formatType"` | ❌ Wave 0 (no existing tournament list filter test covers formatType) |
| DRAW-06 | Generate button disabled when player count < 4 | manual | N/A — component-level UI state test | manual-only (no frontend test infra) |

### Sampling Rate
- **Per task commit:** Manual verification: select a format filter, confirm tournament list updates
- **Per wave merge:** Full backend Jest suite: `cd backend && node --experimental-vm-modules node_modules/jest/bin/jest.js`
- **Phase gate:** Format filter verified end-to-end; generate button disabled at 2 and 3 players with correct message

### Wave 0 Gaps
- [ ] Backend integration test for `GET /api/v1/tournaments?formatType=KNOCKOUT` — covers `tournamentListQuery` schema accepting `formatType` and service returning filtered results

*(Frontend component tests for BracketGenerationSection are manual-only — no frontend test infrastructure exists in this project.)*

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `frontend/src/services/tournamentService.js` — confirmed `formatType` is not appended to URLSearchParams
- Direct code inspection: `backend/src/middleware/validate.js` lines 386-392 — confirmed `formatType` absent from `tournamentListQuery` schema
- Direct code inspection: `backend/src/services/tournamentService.js` lines 134-150 — confirmed backend service handles `formatType` correctly (fix not needed here)
- Direct code inspection: `frontend/src/components/BracketGenerationSection.jsx` lines 396, 407-411 — confirmed threshold is `< 2` in both disabled prop and warning paragraph
- `backend/package.json` — Jest 30.2.0 test runner confirmed
- `CLAUDE.md` Feature 009 notes — confirmed backend minimum 4 players for bracket generation

### Secondary (MEDIUM confidence)
- `.planning/v1.3-MILESTONE-AUDIT.md` integration issues section — exact root cause analysis cross-references with code confirmed HIGH confidence

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — existing project stack, no new dependencies
- Architecture: HIGH — both bugs diagnosed from direct code inspection with exact line numbers
- Pitfalls: HIGH — derived from actual code structure (Joi unknown-stripping, two-expression threshold bug)

**Research date:** 2026-03-06
**Valid until:** Until phase 19 is implemented (no external dependencies to expire)
