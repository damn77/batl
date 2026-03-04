---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/src/services/tournamentService.js
  - frontend/src/pages/TournamentSetupPage.jsx
  - frontend/src/i18n/locales/en.json
  - frontend/src/i18n/locales/sk.json
autonomous: true
requirements: [QUICK-001]

must_haves:
  truths:
    - "Organizer can create a tournament with a past start date without error"
    - "Warning banner appears in the form when a past date is selected"
    - "Future-dated tournaments still work identically to before"
  artifacts:
    - path: "backend/src/services/tournamentService.js"
      provides: "createTournament without future-date enforcement"
    - path: "frontend/src/pages/TournamentSetupPage.jsx"
      provides: "DatePicker without minDate restriction + warning Alert"
  key_links:
    - from: "frontend/src/pages/TournamentSetupPage.jsx"
      to: "backend/src/services/tournamentService.js"
      via: "POST /api/v1/tournaments"
      pattern: "createTournament"
---

<objective>
Allow organizers to create tournaments with past start dates (backdated tournaments) while showing a warning banner when the selected date is in the past.

Purpose: Organizers need to record tournaments that have already started or occurred, e.g. for importing historical data or late tournament entry.
Output: Modified backend validation and frontend form to allow past dates with a visual warning.
</objective>

<execution_context>
@C:/Users/erich/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/erich/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@backend/src/services/tournamentService.js
@frontend/src/pages/TournamentSetupPage.jsx
@frontend/src/i18n/locales/en.json
@frontend/src/i18n/locales/sk.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove future-date enforcement from backend and frontend</name>
  <files>backend/src/services/tournamentService.js, frontend/src/pages/TournamentSetupPage.jsx, frontend/src/i18n/locales/en.json, frontend/src/i18n/locales/sk.json</files>
  <action>
**Backend** — `backend/src/services/tournamentService.js`, in the `createTournament()` function (around lines 48-56):
- Remove the entire block that checks `if (start < now)` and throws `INVALID_START_DATE`. Keep the `const start = new Date(startDate)` and `const end = new Date(endDate)` variable declarations and the `end < start` check — only the future-date enforcement block should be removed.
- The `const now = new Date()` variable can also be removed since it will no longer be used.

**Frontend** — `frontend/src/pages/TournamentSetupPage.jsx`:
1. In `handleCreateClick()` (line 90-106): Change the default `startDate` and `endDate` from `tomorrow` to `new Date()` (today). Remove the `tomorrow` variable entirely.
2. In the **Create Modal** DatePicker for start date (around line 443): Remove the `minDate={new Date()}` prop so past dates can be selected.
3. In the **Edit Modal** DatePicker for start date (around line 580): Remove the `minDate={new Date()}` prop so past dates can be selected.
4. Add a warning Alert inside BOTH the Create Modal and the Edit Modal that shows when `formData.startDate` is in the past. Place it right after the existing `{formError && ...}` Alert in each modal. Use this logic to determine if the date is in the past:
   ```jsx
   const isPastDate = (date) => {
     const today = new Date();
     today.setHours(0, 0, 0, 0);
     const check = new Date(date);
     check.setHours(0, 0, 0, 0);
     return check < today;
   };
   ```
   Define `isPastDate` as a helper function inside the component (before the return statement). Then in both modals, add:
   ```jsx
   {isPastDate(formData.startDate) && (
     <Alert variant="warning">
       {t('warnings.pastStartDate')}
     </Alert>
   )}
   ```

**Translations** — Add the warning key to both locale files:
- `frontend/src/i18n/locales/en.json`: Add `"warnings": { "pastStartDate": "The start date is in the past. This tournament will be created as a backdated event." }` (merge into existing structure, add `warnings` key at root level if it does not exist).
- `frontend/src/i18n/locales/sk.json`: Add `"warnings": { "pastStartDate": "Datum zaciatku je v minulosti. Turnaj bude vytvoreny ako spatne datovana udalost." }` (same structure).
  </action>
  <verify>
    <automated>cd D:/Workspace/BATL && node -e "import('./backend/src/services/tournamentService.js').then(() => console.log('Backend module loads OK')).catch(e => console.error(e.message))" 2>&1 | head -5</automated>
    Manually verify: grep for "INVALID_START_DATE" in tournamentService.js should return zero matches. grep for "minDate" in TournamentSetupPage.jsx should only match the endDate DatePicker (2 occurrences for minDate={formData.startDate}), NOT the startDate DatePicker. grep for "pastStartDate" in en.json and sk.json should each return one match. grep for "isPastDate" in TournamentSetupPage.jsx should return matches.
  </verify>
  <done>
    - Backend createTournament() no longer rejects past start dates
    - Frontend DatePickers for start date allow selecting any date (no minDate restriction)
    - Warning banner appears in both create and edit modals when start date is in the past
    - Warning does not appear when start date is today or in the future
    - End date validation (must be >= start date) is preserved in both backend and frontend
    - Translation keys exist for both en and sk locales
  </done>
</task>

</tasks>

<verification>
1. `grep -c "INVALID_START_DATE" backend/src/services/tournamentService.js` should return `0`
2. `grep -c "minDate={new Date()}" frontend/src/pages/TournamentSetupPage.jsx` should return `0`
3. `grep -c "isPastDate" frontend/src/pages/TournamentSetupPage.jsx` should return at least `3` (definition + 2 usages)
4. `grep -c "pastStartDate" frontend/src/i18n/locales/en.json` should return `1`
5. `grep -c "pastStartDate" frontend/src/i18n/locales/sk.json` should return `1`
</verification>

<success_criteria>
- Organizer can create a tournament with yesterday's date without receiving an error
- A yellow warning banner appears when a past date is selected in both create and edit modals
- The warning disappears when the date is changed to today or a future date
- End date must still be >= start date (existing validation preserved)
- Default start date for new tournaments is today (not tomorrow)
</success_criteria>

<output>
After completion, create `.planning/quick/1-allow-backdated-tournament-start-dates-w/1-SUMMARY.md`
</output>
