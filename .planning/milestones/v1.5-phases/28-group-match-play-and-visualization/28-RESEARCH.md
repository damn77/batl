# Phase 28: Group Match Play and Visualization - Research

**Researched:** 2026-03-17
**Domain:** Group match result entry, standings visualization, tournament lifecycle guards
**Confidence:** HIGH

## Summary

Phase 28 is almost entirely an integration and extension phase. The match result infrastructure (`matchResultService`, `MatchResultModal`, `matchService`) already works for group matches and requires no changes — group matches have `groupId` set and `roundId=null`, so `advanceBracketSlot` returns early without cascade. The lifecycle guard in `checkAndCompleteTournament` needs one COMBINED-format guard added. The primary work is in extending `GroupStandingsTable` (accordion, progress bar, differential columns, expanded-by-default, match click-to-modal, mobile hiding) and updating `CombinedFormatDisplay` (stacked sections with group completion banner). `FormatVisualization` needs minor wiring to pass `isOrganizer`, `currentUserPlayerId`, `scoringRules`, and `mutateTournament` down into the group display path.

The biggest architectural decision is how `GroupStandingsTable` will hold its own `MatchResultModal` state — it needs a `selectedMatch` state, a click handler on match rows, and the same authorization props the knockout bracket already uses. Everything else (API endpoint, SWR cache key, result parsing) is identical to knockout match submission.

**Primary recommendation:** Reuse match result submission infrastructure unchanged. Focus effort on extending `GroupStandingsTable` into the new accordion-with-standings design and adding the COMBINED format guard to `checkAndCompleteTournament`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Players/organizers tap a match row in GroupStandingsTable's matches section to open the existing MatchResultModal — no new score entry UI needed
- Matches section defaults to expanded when tournament is IN_PROGRESS; collapsed for completed tournaments
- Same authorization as knockout: players in the match can submit, organizer can submit and override (organizer-lock)
- No dry-run mode for group matches — no cascade impact (no bracket advancement, no loser routing)
- Organizer corrections update directly without confirmation modal — no cascade risk in group stage
- Completed matches show existing status badge (SCHEDULED/COMPLETED) on each match row — reuse MatchResultDisplay
- Progress bar per group — thin progress bar under each group header filling as matches complete
- Accordion layout — one group expanded at a time using React Bootstrap Accordion (consistent with v1.4 tournament page accordion pattern). Group name + progress bar as accordion header
- Standings table columns: Position, Player, Played, W, L, Sets W-L, Games W-L, Set differential (+/-), Game differential (+/-), Points
- For COMBINED format: stacked sections — group stage section on top, knockout bracket below. During group stage, bracket section shows "Knockout bracket will appear after group stage" placeholder
- Backend guard in `checkAndCompleteTournament()`: if tournament is COMBINED and no knockout bracket exists, skip auto-completion. Bulletproof regardless of which client submits the last result
- For GROUP-only tournaments: auto-complete after all group matches are COMPLETED/CANCELLED (same pattern as knockout)
- For COMBINED tournaments: when all group matches complete, show a prominent banner to organizer: "Group stage complete — Ready to generate knockout bracket" with action button. Tournament stays IN_PROGRESS
- Standings table at 375px: hide secondary columns (Sets W-L, Games W-L) — show only Position, Player, P, W, L, +/- differential, Pts. Consistent with v1.4 responsive column-hiding pattern
- Match rows: compact single-row format with player names + score + status badge. 44px minimum tap target height. Tap opens fullscreen MatchResultModal (existing v1.4 pattern)
- Accordion navigation via React Bootstrap Accordion component — already in project, consistent with existing patterns

### Claude's Discretion
- Exact accordion styling and animation
- Progress bar visual design (color, height, animation)
- Standings column widths and responsive breakpoint thresholds
- How doubles pairs display in standings rows ("Player A / Player B" formatting)
- Error state handling for failed result submissions
- SWR mutation strategy for refreshing standings after result entry

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GPLAY-01 | System generates round-robin match schedule within each group (every participant plays every other participant once) | Matches exist in DB from Phase 27 round-robin generation; `useMatches(tournamentId, { groupId })` fetches them |
| GPLAY-02 | Player can submit match results for group stage matches using existing score entry patterns | `matchResultService.submitResult()` handles group matches — `roundId=null` causes `advanceBracketSlot` to return early; `MatchResultModal` reuses unchanged |
| GPLAY-03 | Organizer can submit and correct group stage match results | Same `PATCH /api/v1/matches/:id/result` endpoint; organizer-lock and winner-change logic unchanged; no dry-run needed (no cascade) |
| GPLAY-04 | Group stage matches follow the tournament's format rules (sets, tiebreaks, advantage settings) | `scoringRules` from `tournament.defaultScoringRules` passed to `MatchResultModal`; existing `effectiveScoringRules` merge handles overrides |
| GPLAY-05 | Group stage play works for both singles and doubles tournaments | `isMatchParticipant()` already handles pair members; `GroupStandingsTable` must read `group.players` OR `group.pairs` depending on category type |
| GVIEW-01 | Tournament page displays group standings tables for GROUP and COMBINED format tournaments | `FormatVisualization` already routes GROUP and COMBINED to group display; needs accordion + expanded-by-default + progress bar |
| GVIEW-02 | Group standings table shows match results, W/L record, and current positions within each group | `GroupStandingsTable` already calculates standings from match data; extend with Set/Game differential columns and match click-to-modal |
| GVIEW-03 | Combined tournament page shows both group standings and knockout bracket(s) based on tournament phase | `CombinedFormatDisplay` already shows both sections; needs: group completion banner for COMBINED when all group matches done, and "bracket coming" placeholder |
| GVIEW-04 | Group visualization is responsive and usable on mobile devices (375px viewport) | CSS media queries hide secondary columns at 375px; match rows use 44px tap targets; MatchResultModal uses `fullscreen="sm-down"` |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Bootstrap Accordion | 2.10.x | One-at-a-time group expansion | Already in project; Accordion + Accordion.Item/Header/Body pattern is established in v1.4 tournament page |
| React Bootstrap ProgressBar | 2.10.x | Per-group completion bar | Native Bootstrap 5.3 progress bar via `<ProgressBar now={pct} variant="success" />` |
| SWR (`mutate`) | project version | Cache invalidation after result | `mutate()` from `useMatches` hook + `globalMutate` for cross-cache invalidation already established in `MatchResultModal` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React Bootstrap Table | 2.10.x (via `<Table>`) | Standings table | Already used in `GroupStandingsTable`; no TanStack needed for this static display |
| Bootstrap CSS custom properties | 5.3 | Responsive column hiding via `d-none d-sm-table-cell` | Use Bootstrap display utilities on `<th>/<td>` for mobile column hiding |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Bootstrap Accordion | ExpandableSection (existing) | ExpandableSection is a custom Card/Collapse wrapper; Accordion enforces one-at-a-time natively. Since the decision locks in Accordion, use it |
| CSS media queries | Bootstrap `d-none d-sm-table-cell` | Bootstrap utilities are cleaner and consistent with v1.4 pattern — prefer utilities |

---

## Architecture Patterns

### Recommended File Change Map

```
backend/
  src/services/
    tournamentLifecycleService.js   — add COMBINED guard in checkAndCompleteTournament()

frontend/
  src/components/
    GroupStandingsTable.jsx         — MAJOR EXTENSION (accordion, progress bar, columns, click-to-modal, mobile)
    CombinedFormatDisplay.jsx       — add group completion banner + "bracket coming" placeholder
    FormatVisualization.jsx         — pass isOrganizer, currentUserPlayerId, scoringRules, tournament to group display
```

No new files needed. No backend routes needed. No schema changes needed.

### Pattern 1: Group Match Click-to-Modal in GroupStandingsTable

**What:** Add `selectedMatch` state to `GroupStandingsTable`. Match rows become clickable (cursor pointer, 44px height). Clicking opens `MatchResultModal` with the selected match.

**When to use:** Every match row in the expanded matches section.

**Key insight:** `MatchResultModal` requires `isOrganizer`, `isParticipant`, `scoringRules`, and `mutate` props. `GroupStandingsTable` currently receives only `tournamentId` and `group`. The component signature must be extended to accept:
- `isOrganizer: bool`
- `currentUserPlayerId: string|null`
- `scoringRules: object` (from `tournament.defaultScoringRules`)
- `tournamentStatus: string`

`isParticipant` is computed per match using the same `isMatchParticipant` logic from `matchResultService` — implement client-side in a helper.

```jsx
// Source: matchResultService.js pattern, applied frontend-side
function isMatchParticipant(match, playerId) {
  if (!playerId) return false;
  if (match.player1?.id === playerId || match.player2?.id === playerId) return true;
  const members = [
    match.pair1?.player1?.id, match.pair1?.player2?.id,
    match.pair2?.player1?.id, match.pair2?.player2?.id
  ];
  return members.includes(playerId);
}
```

### Pattern 2: React Bootstrap Accordion for Groups

**What:** Replace the current ExpandableSection-per-group pattern with a single `<Accordion>` wrapping all groups. Default active key = first group when IN_PROGRESS.

**When to use:** All GROUP and COMBINED format group display.

```jsx
// Source: React Bootstrap 2.10 Accordion docs
<Accordion defaultActiveKey={tournamentStatus === 'IN_PROGRESS' ? groups[0]?.id : null}>
  {groups.map(group => (
    <Accordion.Item key={group.id} eventKey={group.id}>
      <Accordion.Header>
        <div className="w-100 me-3">
          <span>{group.name || `Group ${group.groupNumber}`}</span>
          <ProgressBar
            now={completionPct(group)}
            variant="success"
            style={{ height: '4px', marginTop: '6px' }}
          />
        </div>
      </Accordion.Header>
      <Accordion.Body>
        <GroupStandingsTable ... />
      </Accordion.Body>
    </Accordion.Item>
  ))}
</Accordion>
```

**Note:** Progress bar inside `Accordion.Header` requires careful HTML — wrap in a `div` that fills available width before the chevron. The accordion chevron is rendered by Bootstrap as a `::after` pseudo-element on the button; the progress bar div must not overflow into it.

### Pattern 3: COMBINED Format Guard in checkAndCompleteTournament

**What:** Before transitioning to COMPLETED, check if tournament is COMBINED and has no knockout bracket.

**When to use:** Called on every organizer result submission.

```js
// Source: tournamentLifecycleService.js — extend checkAndCompleteTournament()
export async function checkAndCompleteTournament(tx, tournamentId, isOrganizer) {
  if (!isOrganizer) return;

  const incompleteCount = await tx.match.count({
    where: { tournamentId, isBye: false, status: { notIn: ['COMPLETED', 'CANCELLED'] } }
  });

  if (incompleteCount === 0) {
    // NEW GUARD: COMBINED tournament without knockout bracket — don't auto-complete
    const tournament = await tx.tournament.findUnique({
      where: { id: tournamentId },
      select: { formatType: true }
    });

    if (tournament?.formatType === 'COMBINED') {
      const knockoutBracket = await tx.bracket.findFirst({
        where: { tournamentId },
        select: { id: true }
      });
      if (!knockoutBracket) {
        return; // Group stage complete but knockout not yet generated — stay IN_PROGRESS
      }
    }

    await tx.tournament.update({
      where: { id: tournamentId },
      data: { status: 'COMPLETED', lastStatusChange: new Date() }
    });
  }
}
```

### Pattern 4: Mobile Responsive Column Hiding (Bootstrap Utilities)

**What:** Use Bootstrap `d-none d-sm-table-cell` on secondary column `<th>` and `<td>` elements.

**When to use:** Columns that should be hidden at 375px (< 576px = sm breakpoint).

```jsx
// Source: Bootstrap 5.3 display utilities
<th className="text-center d-none d-sm-table-cell">Sets W-L</th>
<th className="text-center d-none d-sm-table-cell">Games W-L</th>
// Keep visible at all sizes: #, Player, P, W, L, +/- (set diff), +/- (game diff), Pts
```

**Key insight:** Bootstrap's `d-sm-table-cell` restores `display: table-cell` (not `display: block`) at the sm breakpoint, which is correct for table columns.

### Pattern 5: Group Completion Banner in CombinedFormatDisplay

**What:** When all group matches are COMPLETED/CANCELLED and no bracket exists, show an organizer-visible Alert with action button. Requires passing `isOrganizer` and match data into `CombinedFormatDisplay`.

**When to use:** COMBINED format, IN_PROGRESS, group stage done, bracket not yet generated.

```jsx
// Detect from props: pass groupsComplete boolean from parent
{isOrganizer && groupsComplete && brackets.length === 0 && (
  <Alert variant="success" className="d-flex justify-content-between align-items-center">
    <span><strong>Group stage complete</strong> — Ready to generate knockout bracket</span>
    <Button variant="primary" size="sm" onClick={onGenerateKnockout}>
      Generate Knockout Bracket
    </Button>
  </Alert>
)}
```

The `groupsComplete` computation can be derived from matches: all group matches have status COMPLETED or CANCELLED. This computation belongs in `FormatVisualization` which has access to both `matches` and `structure`.

### Anti-Patterns to Avoid

- **Implementing dry-run for group matches:** No cascade exists for group matches — the CONTEXT.md locks this out. Do not add dry-run or confirmation modals for organizer winner changes on group matches.
- **Triggering tournament completion from player submissions:** `checkAndCompleteTournament` already guards against this with `if (!isOrganizer) return`. Do not change this guard.
- **Passing `mutate` from FormatVisualization into GroupStandingsTable as a single global mutate:** The `useMatches` hook inside `GroupStandingsTable` returns its own `mutate`. Use that for match cache invalidation after result submission. Also call `globalMutate` for cross-group match caches (in case another group's data is open).
- **Rebuilding standings from API data on every render without useMemo:** The existing `useMemo` pattern in `GroupStandingsTable` is correct. Preserve it when adding differential columns.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Score entry modal | New form component | `MatchResultModal` (existing) | Full format support (SETS/BIG_TIEBREAK), organizer-lock, special outcomes, validation all included |
| Match result submission | New API endpoint | `PATCH /api/v1/matches/:id/result` (existing) | Group matches already route through this; `roundId=null` makes `advanceBracketSlot` a no-op |
| Participant check | Client-side only guard | `matchResultService.submitResult()` server-side check | Server always validates participant — client check is UX only |
| Accordion behavior | Custom expand/collapse | React Bootstrap `<Accordion>` | One-at-a-time behavior, keyboard accessibility, animation all built in |
| Progress bar | Custom bar | `<ProgressBar>` from React Bootstrap | Bootstrap 5.3 component already in dependency |

---

## Common Pitfalls

### Pitfall 1: Accordion Header Progress Bar Overflow
**What goes wrong:** Progress bar inside `Accordion.Header` overflows into the Bootstrap chevron button area, causing layout breaks at small widths.
**Why it happens:** Bootstrap Accordion renders the expand button as the entire header button. Adding a progress bar inside requires the bar to not consume the chevron space.
**How to avoid:** Wrap the progress bar in a `div` with `style={{ flexGrow: 1, marginRight: '1rem' }}` inside the header, leaving room for the chevron.
**Warning signs:** Progress bar overlapping the chevron arrow, or header wrapping to two lines at mobile widths.

### Pitfall 2: GroupStandingsTable Prop Drilling Gap
**What goes wrong:** `MatchResultModal` is added inside `GroupStandingsTable` but `isOrganizer`, `currentUserPlayerId`, and `scoringRules` are not passed down from `FormatVisualization`.
**Why it happens:** `GroupStandingsTable` currently only receives `tournamentId` and `group`. The call sites in `FormatVisualization` (GROUP path, line 94-113) and `CombinedFormatDisplay` must both be updated.
**How to avoid:** Update both call sites when extending the prop signature. `FormatVisualization` already has `user`, `isOrganizerOrAdmin`, and `tournament.defaultScoringRules` available.
**Warning signs:** MatchResultModal shows but player sees a read-only view when they should be able to submit, or organizer can't access special outcomes.

### Pitfall 3: COMBINED Tournament Auto-Completing Prematurely
**What goes wrong:** Last organizer submits final group match — `checkAndCompleteTournament` fires, finds 0 incomplete matches, transitions tournament to COMPLETED.
**Why it happens:** The current `checkAndCompleteTournament` counts ALL matches (including group matches) across ALL match records for the tournament. When all group matches complete and no knockout bracket exists yet, the count is 0.
**How to avoid:** Add the COMBINED + no-bracket guard BEFORE the `tournament.update` call in `checkAndCompleteTournament`. The guard must query `bracket.findFirst` inside the same transaction.
**Warning signs:** COMBINED tournament status jumps to COMPLETED after group stage even though knockout hasn't been generated.

### Pitfall 4: Match Result Modal Infinite Dry-Run Loop
**What goes wrong:** Organizer changes winner on a completed group match, `isWinnerChanging` is true, `runDryRunIfNeeded` triggers, and the dry-run call goes to the backend — but group matches don't set `bracketId`, so the cascade traversal returns 0. However, the dry-run transaction still runs.
**Why it happens:** `MatchResultModal.handleSubmit` calls `runDryRunIfNeeded` if `isOrganizer && isWinnerChanging`. For group matches this results in a no-op dry-run (0 impacted matches, `requiresConfirmation: false`), so it falls through without showing a confirmation. This is actually correct behavior — no user-facing issue.
**How to avoid:** Per the CONTEXT decision, the frontend should NOT call `submitMatchResultDryRun` for group matches. Check `match.groupId` in `MatchResultModal` and skip dry-run when set. This avoids an unnecessary network round-trip.
**Warning signs:** Extra network request logged for group match submissions but no modal shown.

### Pitfall 5: `useMatches` SWR Key Mismatch After Result Submission
**What goes wrong:** After submitting a result, `mutate()` is called but standings don't update because the SWR cache key used for fetch differs from the key used for invalidation.
**Why it happens:** `useMatches` builds the key as `/tournaments/${id}/matches?${JSON.stringify(filters)}&_r=${refreshKey}`. The `globalMutate` in `MatchResultModal` uses a substring match `key.includes('/tournaments/${tournamentId}/matches')` — this will catch all variants of the key including the JSON-encoded filters.
**How to avoid:** Use the existing `globalMutate` pattern from `MatchResultModal` (line 231): `globalMutate(key => typeof key === 'string' && key.includes('/tournaments/${match.tournamentId}/matches'))`. This already handles the group match cache key.
**Warning signs:** Standings table doesn't reflect the newly submitted result without a page reload.

### Pitfall 6: Doubles Participants Not Shown in GroupStandingsTable
**What goes wrong:** `GroupStandingsTable` currently reads `group.players` for standings — for DOUBLES tournaments, group participants are pairs (`group.pairs`), not individual players.
**Why it happens:** `GroupParticipant` schema has both `playerId` (nullable) and `pairId` (nullable). Phase 27 creates participants as players for singles and pairs for doubles. The existing `GroupStandingsTable` only uses `group.players`.
**How to avoid:** In `GroupStandingsTable`, detect doubles from `group.pairs?.length > 0` or from the tournament category type passed as a prop. Build the standings map from `group.pairs` when doubles, using `pair.id` as the key and `"${pair.player1.name} / ${pair.player2.name}"` as the display name.
**Warning signs:** Standings table empty for DOUBLES tournaments.

---

## Code Examples

### Existing: advanceBracketSlot Short-Circuit for Group Matches
```js
// Source: backend/src/services/tournamentLifecycleService.js line 196-197
export async function advanceBracketSlot(tx, updatedMatch, winnerId) {
  // Guard 1: Not a bracket match — skip
  if (!updatedMatch.roundId) return;
  // ...
}
```
Group matches have `roundId: null` — this guard fires and the function returns immediately. No cascade occurs. This is the key reason group match submissions are safe to submit without confirmation.

### Existing: useMatches SWR Hook with groupId Filter
```js
// Source: frontend/src/services/tournamentViewService.js line 223-242
export const useMatches = (id, filters = {}, shouldFetch = false, refreshKey = 0) => {
  const filterKey = JSON.stringify(filters);
  const { data, error, mutate } = useSWR(
    id && shouldFetch ? `/tournaments/${id}/matches?${filterKey}&_r=${refreshKey}` : null,
    () => getMatches(id, filters),
    { revalidateOnFocus: true, revalidateOnReconnect: true, dedupingInterval: 30000 }
  );
  return { matches: data, isLoading: !error && !data && shouldFetch, isError: error, mutate };
};
// Usage in GroupStandingsTable — always fetch (shouldFetch = true, since we're inside accordion):
const { matches, isLoading, isError, mutate: mutateMatches } = useMatches(
  tournamentId, { groupId: group.id }, true
);
```

### Existing: MatchResultModal Props Interface
```jsx
// Source: frontend/src/components/MatchResultModal.jsx line 55
const MatchResultModal = ({
  match,        // null = closed; match object = open
  onClose,      // () => void
  isOrganizer,  // boolean
  isParticipant, // boolean (computed per match)
  scoringRules, // { formatType, winningSets, winningTiebreaks }
  mutate        // SWR mutate() to re-fetch after submit
}) => { ... };
```

### Existing: Format Structure Response — Group with Players
The `getFormatStructure` response for GROUP/COMBINED includes `groups` with a `players` array (from `GroupParticipant` join). Confirm the shape from the backend service to understand what fields are available on each player/pair object in the group.

### New: Standings Differential Columns
```jsx
// Source: extension of GroupStandingsTable.jsx
// Add to standings calculation in useMemo:
stats.setDiff = stats.setsWon - stats.setsLost;
stats.gameDiff = stats.gamesWon - stats.gamesLost;

// In table header:
<th className="text-center">Sets W-L</th>
<th className="text-center">S +/-</th>   // set differential
<th className="text-center d-none d-sm-table-cell">Games W-L</th>
<th className="text-center">G +/-</th>   // game differential

// In table body:
<td className="text-center d-none d-sm-table-cell">{stats.setsWon}-{stats.setsLost}</td>
<td className="text-center">{stats.setDiff > 0 ? '+' : ''}{stats.setDiff}</td>
<td className="text-center d-none d-sm-table-cell">{stats.gamesWon}-{stats.gamesLost}</td>
<td className="text-center">{stats.gameDiff > 0 ? '+' : ''}{stats.gameDiff}</td>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ExpandableSection per group (one at a time manually) | React Bootstrap Accordion (enforced one-at-a-time) | Phase 28 | Cleaner UX, consistent with v1.4 tournament page accordion |
| `showMatches` toggle button | Always fetch matches when inside accordion (expanded = visible) | Phase 28 | Simplifies lazy-load logic — accordion expansion IS the trigger |
| No click-to-modal on match rows | Clickable match row opens MatchResultModal | Phase 28 | Enables inline result entry without page navigation |

**Deprecated/outdated:**
- The custom `showMatches` button toggle in the current `GroupStandingsTable` will be replaced by the accordion expansion trigger pattern.
- The current hard-coded `defaultExpanded={false}` on ExpandableSection will be replaced by accordion behavior with IN_PROGRESS auto-expand of first group.

---

## Open Questions

1. **Does `getFormatStructure` return `pairs` as well as `players` for doubles groups?**
   - What we know: `GroupParticipant` has both `playerId` and `pairId`. The existing `GroupStandingsTable` only references `group.players`.
   - What's unclear: Whether `tournamentService.getFormatStructure()` includes `pairs` in the group object response.
   - Recommendation: Read `backend/src/services/tournamentService.js` `getFormatStructure` before planning the doubles standings task. If `pairs` is not included, add it to the response shape.

2. **How does `CombinedFormatDisplay` detect "all group matches complete"?**
   - What we know: `matches` from `useMatches(tournamentId, {})` in `FormatVisualization` includes all tournament matches. Group matches have `groupId` set.
   - What's unclear: The cleanest place to compute `groupsComplete` — in `FormatVisualization` before passing to `CombinedFormatDisplay`, or inside `CombinedFormatDisplay` itself.
   - Recommendation: Compute in `FormatVisualization` from the already-fetched `matches` array. Pass `groupsComplete: bool` as a prop to `CombinedFormatDisplay` and `GroupStandingsTable`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (backend) — no frontend test framework configured |
| Config file | `backend/jest.config.js` |
| Quick run command | `cd backend && npm test -- --testPathPattern=tournamentLifecycle` |
| Full suite command | `cd backend && npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GPLAY-02 | Player submits group match result — result saved, no bracket cascade | unit | `cd backend && npm test -- --testPathPattern=matchResult` | ❌ Wave 0 |
| GPLAY-03 | Organizer corrects group match result — no dry-run, no confirmation | unit | same | ❌ Wave 0 |
| GPLAY-04 | Group match uses tournament scoring rules | unit (integration) | same | ❌ Wave 0 |
| GVIEW-01 | COMBINED guard: all group matches done + no bracket = stay IN_PROGRESS | unit | `cd backend && npm test -- --testPathPattern=lifecycle` | ❌ Wave 0 |
| GVIEW-01 | GROUP format: all group matches done = tournament COMPLETED | unit | same | ❌ Wave 0 |

**Note:** GPLAY-01 (round-robin schedule generation) is Phase 27's responsibility; matches already exist in DB. GVIEW-02, GVIEW-03, GVIEW-04 are frontend-only and not covered by backend tests.

### Sampling Rate
- **Per task commit:** `cd backend && npm test -- --testPathPattern=matchResult` (group match result tests)
- **Per wave merge:** `cd backend && npm test` (full suite green)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/__tests__/unit/groupMatchResult.test.js` — covers GPLAY-02, GPLAY-03: group match submission with no cascade (roundId=null guard), organizer correction path, no dry-run trigger
- [ ] `backend/__tests__/unit/combinedLifecycleGuard.test.js` — covers GVIEW-01: COMBINED + no bracket = IN_PROGRESS stays, COMBINED + bracket exists = COMPLETED, GROUP format = COMPLETED

---

## Sources

### Primary (HIGH confidence)
- Direct code reading: `backend/src/services/matchResultService.js` — confirmed group match path (roundId=null → advanceBracketSlot returns early, no cascade)
- Direct code reading: `backend/src/services/tournamentLifecycleService.js` — confirmed current `checkAndCompleteTournament` logic, identified exact guard insertion point
- Direct code reading: `frontend/src/components/GroupStandingsTable.jsx` — confirmed existing standings calculation, current prop signature, `showMatches` toggle pattern
- Direct code reading: `frontend/src/components/MatchResultModal.jsx` — confirmed prop interface, dry-run flow, SWR mutation pattern
- Direct code reading: `frontend/src/components/FormatVisualization.jsx` — confirmed GROUP and COMBINED routing, existing prop passing
- Direct code reading: `frontend/src/components/CombinedFormatDisplay.jsx` — confirmed current structure (group + knockout sections)
- Direct code reading: `frontend/src/services/tournamentViewService.js` — confirmed `useMatches` hook signature and SWR key format
- Direct code reading: `backend/prisma/schema.prisma` — confirmed Match model (groupId FK, roundId nullable), Group model, GroupParticipant model
- `.planning/phases/28-group-match-play-and-visualization/28-CONTEXT.md` — locked decisions and canonical references

### Secondary (MEDIUM confidence)
- React Bootstrap 2.10 Accordion API — known from project usage pattern in existing code; `<Accordion>`, `<Accordion.Item>`, `<Accordion.Header>`, `<Accordion.Body>` component structure
- Bootstrap 5.3 `d-none d-sm-table-cell` — established v1.4 pattern per CONTEXT.md reference to Phase 25 responsive pass

---

## Metadata

**Confidence breakdown:**
- Backend changes (lifecycle guard): HIGH — code is simple, well-understood, exact insertion point identified
- Match submission reuse: HIGH — direct code confirmed no cascade path for group matches
- Frontend component extensions: HIGH — existing components fully read, extension points clear
- Doubles standings support: MEDIUM — `getFormatStructure` response shape for pairs not yet confirmed (Open Question 1)
- Mobile responsive pattern: HIGH — Bootstrap utility pattern confirmed from CONTEXT.md and v1.4 code

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable codebase)
