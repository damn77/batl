---
phase: quick-7
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/components/OrganizerRegistrationPanel.jsx
  - frontend/src/pages/TournamentViewPage.jsx
autonomous: true
requirements: [QUICK-7]
must_haves:
  truths:
    - "Already-registered players do not appear in the organizer selection dropdown"
    - "Ineligible players (wrong age or gender for category) do not appear in the organizer selection dropdown"
    - "After successful registration, only the relevant sections refresh — NOT a full page reload"
    - "Organizer can register multiple players in succession without page reload"
  artifacts:
    - path: "frontend/src/components/OrganizerRegistrationPanel.jsx"
      provides: "Filtered player list and soft-reload logic"
    - path: "frontend/src/pages/TournamentViewPage.jsx"
      provides: "SWR mutate callback instead of window.location.reload"
  key_links:
    - from: "OrganizerRegistrationPanel.jsx"
      to: "registrations state"
      via: "client-side filter of entities against registrations"
      pattern: "filter.*registrations"
    - from: "TournamentViewPage.jsx"
      to: "SWR cache"
      via: "mutateTournament instead of window.location.reload"
      pattern: "mutateTournament"
---

<objective>
Fix three bugs in the tournament page's organizer-only player registration panel:
1. Filter out players already registered in the tournament from the selection list
2. Filter out players ineligible for the tournament's category (age/gender) from the selection list
3. Replace full page reload on successful registration with soft-reload of relevant data

Purpose: Organizers registering multiple players hit a broken UX — ineligible/duplicate players clutter the list, and a full page reload breaks the multi-registration flow.
Output: Patched OrganizerRegistrationPanel.jsx and TournamentViewPage.jsx
</objective>

<execution_context>
@C:/Users/erich/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/erich/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@frontend/src/components/OrganizerRegistrationPanel.jsx
@frontend/src/pages/TournamentViewPage.jsx
@frontend/src/components/TournamentInfoPanel.jsx
@frontend/src/hooks/useRegistration.jsx
@frontend/src/components/RegistrationForm.jsx
@frontend/src/services/tournamentViewService.js
@backend/src/utils/eligibility.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Filter registered and ineligible players from selection list</name>
  <files>frontend/src/components/OrganizerRegistrationPanel.jsx</files>
  <action>
In OrganizerRegistrationPanel.jsx, after `loadData` fetches both `entities` (players/pairs) and `registrations`, compute a filtered list before passing to RegistrationForm.

For SINGLES (non-doubles):
1. Build a Set of player IDs already registered (any status except WITHDRAWN): `const registeredPlayerIds = new Set(registrations.filter(r => r.status !== 'WITHDRAWN').map(r => r.playerId || r.player?.id))`
2. Filter entities to exclude already-registered players: `entity => !registeredPlayerIds.has(entity.id)`
3. Filter entities by category eligibility using client-side checks on the player profile data (which includes `birthDate` and `gender` since organizer is authenticated):
   - Age check: If `tournament.category.ageGroup !== 'ALL_AGES'`, extract min age from ageGroup (e.g., `AGE_35` -> 35), calculate player age as `currentYear - birthYear`, exclude if age < minAge
   - Gender check: If `tournament.category.gender !== 'MIXED'`, exclude players whose `gender` does not match `tournament.category.gender`
   - Skip players with missing birthDate (for age-restricted categories) or missing gender (for gender-restricted categories) -- they are ineligible

For DOUBLES (pairs):
1. Build a Set of pair IDs already registered: `const registeredPairIds = new Set(registrations.filter(r => r.status !== 'WITHDRAWN').map(r => r.pairId || r.pair?.id))`
2. Filter entities to exclude already-registered pairs: `entity => !registeredPairIds.has(entity.id)`
3. Skip eligibility filtering for pairs (pairs were already validated when created for the category)

Compute the filtered list using `useMemo` that depends on `[entities, registrations, tournament?.category]`. Pass this filtered list (not raw `entities`) to `RegistrationForm` as the `entities` prop.

Import `useMemo` from React at the top.

Do NOT create a separate eligibility utility file -- inline the simple age/gender checks. The logic is:
```javascript
const currentYear = new Date().getFullYear();
const minAge = category.ageGroup === 'ALL_AGES' ? null : parseInt(category.ageGroup.match(/AGE_(\d+)/)?.[1]);
// Filter: (!minAge || (player.birthDate && currentYear - new Date(player.birthDate).getFullYear() >= minAge))
// Filter: (category.gender === 'MIXED' || player.gender === category.gender)
```
  </action>
  <verify>
    <automated>cd D:\Workspace\BATL && node -e "import('react')" 2>/dev/null; echo "Syntax check:" && node --input-type=module -e "import { readFileSync } from 'fs'; const src = readFileSync('frontend/src/components/OrganizerRegistrationPanel.jsx','utf8'); const hasUseMemo = src.includes('useMemo'); const hasFilter = src.includes('registeredPlayer') || src.includes('registeredPair'); const hasEligibility = src.includes('ageGroup') || src.includes('gender'); console.log('useMemo:', hasUseMemo, 'filter-registered:', hasFilter, 'eligibility:', hasEligibility); if(!hasUseMemo||!hasFilter||!hasEligibility) process.exit(1);"</automated>
  </verify>
  <done>Selection dropdown only shows players who are (a) not already registered and (b) eligible for the tournament's category. Pairs are filtered by registration status only.</done>
</task>

<task type="auto">
  <name>Task 2: Replace full page reload with soft-reload via SWR mutate</name>
  <files>frontend/src/pages/TournamentViewPage.jsx, frontend/src/components/OrganizerRegistrationPanel.jsx</files>
  <action>
In TournamentViewPage.jsx line 126, replace:
```javascript
onRegistrationComplete={() => window.location.reload()}
```
with:
```javascript
onRegistrationComplete={() => mutateTournament()}
```

`mutateTournament` is already available from the `useTournament` SWR hook (line 31). This will re-fetch the tournament data (which includes `registrationCount`, `waitlistCount`) without a full page reload.

The OrganizerRegistrationPanel already calls `loadData()` internally on success (line 38 in useRegistration onSuccess callback), which reloads entities and registrations. Combined with the SWR revalidation from `mutateTournament()`, this soft-reloads:
- Tournament data (registration counts in the Organizer & Registration accordion header info)
- The organizer registration selection list (via internal loadData)
- The registered players list (PlayerListPanel uses SWR with tournament ID key, so SWR's global revalidation may or may not catch it)

To ensure PlayerListPanel also refreshes, check if it uses SWR. If it does, call `mutate` globally for its key. If it uses a simple fetch, we need to trigger a re-render.

Check PlayerListPanel: if it reads from the tournament registrations endpoint with SWR, `mutateTournament` alone may suffice since SWR revalidates related keys. If not, the simplest fix is to pass a `refreshKey` counter that increments on registration, forcing PlayerListPanel to re-fetch.

Approach for PlayerListPanel refresh:
1. In TournamentViewPage, add a `const [registrationVersion, setRegistrationVersion] = useState(0)` counter
2. In the onRegistrationComplete callback: `() => { mutateTournament(); setRegistrationVersion(v => v + 1); }`
3. Pass `refreshKey={registrationVersion}` to PlayerListPanel
4. In PlayerListPanel, add `refreshKey` to its data-fetching dependency (useEffect or SWR key)

Read PlayerListPanel first to determine the right approach before implementing.
  </action>
  <verify>
    <automated>cd D:\Workspace\BATL && node --input-type=module -e "import { readFileSync } from 'fs'; const src = readFileSync('frontend/src/pages/TournamentViewPage.jsx','utf8'); const noReload = !src.includes('window.location.reload'); const hasMutate = src.includes('mutateTournament()'); console.log('no-reload:', noReload, 'has-mutate:', hasMutate); if(!noReload||!hasMutate) process.exit(1);"</automated>
  </verify>
  <done>Successful organizer registration soft-reloads tournament data (registration count), the player selection dropdown, and the registered players list without a full page reload. Organizer can immediately register another player.</done>
</task>

</tasks>

<verification>
1. Open tournament view page as ORGANIZER for a SCHEDULED tournament
2. Open the Organizer & Registration accordion
3. Verify the player dropdown does NOT show players already registered
4. Verify the player dropdown does NOT show players ineligible for the category (wrong age/gender)
5. Register a player -- page should NOT fully reload
6. The registration count should update, the newly-registered player should disappear from the dropdown
7. Register another player immediately to confirm multi-registration flow works
</verification>

<success_criteria>
- No `window.location.reload()` in TournamentViewPage.jsx
- OrganizerRegistrationPanel filters entities by registration status AND category eligibility
- Organizer can register 3+ players in succession without page reload
</success_criteria>

<output>
After completion, create `.planning/quick/7-fix-tournament-page-organizer-registrati/7-SUMMARY.md`
</output>
