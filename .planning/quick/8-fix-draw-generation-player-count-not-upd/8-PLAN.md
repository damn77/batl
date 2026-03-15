---
phase: quick-8
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/pages/TournamentViewPage.jsx
  - frontend/src/components/FormatVisualization.jsx
  - frontend/src/components/BracketGenerationSection.jsx
autonomous: true
requirements: [QUICK-8]
must_haves:
  truths:
    - "Draw Generation section player count updates immediately when organizer removes a registered player"
    - "Draw Generation section player count updates immediately when organizer adds a registered player"
  artifacts:
    - path: "frontend/src/components/BracketGenerationSection.jsx"
      provides: "Re-fetches registrations when registrationVersion changes"
      contains: "registrationVersion"
  key_links:
    - from: "frontend/src/pages/TournamentViewPage.jsx"
      to: "frontend/src/components/FormatVisualization.jsx"
      via: "registrationVersion prop"
      pattern: "registrationVersion"
    - from: "frontend/src/components/FormatVisualization.jsx"
      to: "frontend/src/components/BracketGenerationSection.jsx"
      via: "registrationVersion prop"
      pattern: "registrationVersion"
---

<objective>
Fix the Draw Generation section's registered player count not updating when an organizer adds or removes a player from the registration list. Currently, BracketGenerationSection fetches registrations once on mount and never re-fetches.

Purpose: After quick task 7 added soft-reload via registrationVersion, the Draw Generation section was missed -- it still uses a stale registration list.
Output: Player count and list in Draw Generation section update in real-time alongside the PlayerListPanel.
</objective>

<execution_context>
@C:/Users/erich/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/erich/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@frontend/src/pages/TournamentViewPage.jsx
@frontend/src/components/FormatVisualization.jsx
@frontend/src/components/BracketGenerationSection.jsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Thread registrationVersion from TournamentViewPage through FormatVisualization to BracketGenerationSection</name>
  <files>frontend/src/pages/TournamentViewPage.jsx, frontend/src/components/FormatVisualization.jsx, frontend/src/components/BracketGenerationSection.jsx</files>
  <action>
The root cause: BracketGenerationSection.jsx line 65-76 fetches registrations in a useEffect with only `[tournament?.id]` as dependency. The registrationVersion counter from quick task 7 is never passed to this component.

Three files need a one-line change each:

1. **TournamentViewPage.jsx**: Find the `<FormatVisualization>` rendering (search for `FormatVisualization` in the JSX). Add `registrationVersion={registrationVersion}` prop to it. The `registrationVersion` state already exists at line 42.

2. **FormatVisualization.jsx**:
   - Add `registrationVersion` to the destructured props on line 21: `const FormatVisualization = ({ tournament, mutateTournament, registrationVersion })`
   - Pass it to BracketGenerationSection (around line 104): add `registrationVersion={registrationVersion}` prop.

3. **BracketGenerationSection.jsx**:
   - Add `registrationVersion` to the destructured props on line 33-39.
   - Add `registrationVersion` to the useEffect dependency array on line 76: change `[tournament?.id]` to `[tournament?.id, registrationVersion]`.

This makes the registration fetch re-fire whenever the organizer completes a registration action (add or remove), keeping the player count and list in sync.
  </action>
  <verify>
    <automated>cd D:/Workspace/BATL && npx vite build 2>&1 | tail -5</automated>
  </verify>
  <done>
    - BracketGenerationSection receives registrationVersion prop
    - useEffect dependency array includes registrationVersion
    - FormatVisualization passes registrationVersion through
    - TournamentViewPage passes registrationVersion to FormatVisualization
    - Build succeeds with no errors
  </done>
</task>

</tasks>

<verification>
- Vite build completes without errors
- registrationVersion flows: TournamentViewPage -> FormatVisualization -> BracketGenerationSection -> useEffect dependency
</verification>

<success_criteria>
When an organizer adds or removes a registered player, the Draw Generation section's player count and list update immediately without requiring a full page reload.
</success_criteria>

<output>
After completion, create `.planning/quick/8-fix-draw-generation-player-count-not-upd/8-SUMMARY.md`
</output>
