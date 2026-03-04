# Phase 14: Tournament Copy - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Organizers can create a new SCHEDULED tournament pre-populated with an existing tournament's configuration (category, rules, format, location, capacity, and all auxiliary fields). The new tournament has no name, no dates, no registrations, and no draw. Organizer reviews and modifies the pre-filled form before saving. Also includes a QoL improvement: adding an action dropdown menu to the tournament list (housing Copy and Recalculate Seeding).

</domain>

<decisions>
## Implementation Decisions

### Copy trigger location
- Copy action lives in the **tournament list only** (not tournament detail page)
- Presented via a **three-dot dropdown action menu** per tournament row
- **Recalculate Seeding button also moves into this dropdown** (QoL improvement alongside Copy)
- Copy is available for **any tournament status** (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED)

### Copy flow
- Clicking "Copy" opens the **tournament creation form pre-filled** with copied fields
- Organizer reviews and modifies the form **before** the tournament is created (not create-then-edit)
- A small **info banner above the form** shows "Copying from: [Source Tournament Name]" for context

### API design
- **Dedicated copy endpoint**: `POST /api/v1/tournaments/:id/copy`
- Accepts **override fields in the request body** — frontend sends the user's edits (name, dates, any modified fields) in one call
- **Any organizer or admin** can copy any tournament (not restricted to source tournament's organizer)
- Also **copies TournamentPointConfig** if the source tournament has one (PLACEMENT/FINAL_ROUND method, multiplier)

### Field handling
- **Copied fields** (pre-filled in form): category, format type, format config, default scoring rules, location (primary + backup), capacity, organizer contacts, entry fee, description, prize description, rules URL, min participants, courts, waitlist display order
- **Empty fields** (organizer must fill): name, start date, end date, registration open date, registration close date
- **Reset fields** (not editable, system-set): status = SCHEDULED, registrationClosed = false, no registrations, no draw
- **Organizer**: set to the **user performing the copy** (not the source tournament's organizer)
- All copied fields are editable in the pre-filled form before saving

### Name handling
- Name field is **empty** — organizer must type a new name (form validation requires it)
- **Warn but allow** duplicate names — if name matches an existing tournament, show a warning but don't block creation

### Claude's Discretion
- Exact dropdown menu component and styling
- How to fetch source tournament data for form pre-fill (in copy endpoint response vs. separate GET)
- Duplicate name check implementation (client-side vs. server-side)
- Test strategy and coverage
- Loading/error states during copy operation

</decisions>

<specifics>
## Specific Ideas

- The action dropdown menu on the tournament list is a new UI pattern for BATL — designed to house Copy now and potentially more actions later (delete in Phase 15)
- Recalculate Seeding button currently exists somewhere standalone; moving it into the dropdown is a bundled QoL fix
- The pre-filled form reuses the existing TournamentSetupPage creation modal/form — just with fields pre-populated from the source

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tournamentService.createTournament()`: Core creation logic — copy endpoint reuses validation and creation patterns
- `TournamentSetupPage.jsx`: Existing tournament creation form with modal — pre-fill form state from source tournament data
- `tournamentService.js` (frontend): API client — add `copyTournament(sourceId, overrides)` function
- `TournamentPointConfig` model: Point config can be cloned via Prisma create with source config fields

### Established Patterns
- Service functions throw structured errors with `.code` property via `makeError(code, message)`
- Controllers map error codes to HTTP status via `ERROR_STATUS` map
- Joi validation schemas in `validators/` directory
- Routes use `isAuthenticated` + `authorize('create', 'Tournament')` for permission checks
- Frontend uses SWR hooks with `mutate()` for refresh after mutations

### Integration Points
- `tournamentRoutes.js` — register new copy route `POST /:id/copy`
- `tournamentController.js` — add `copyTournament` handler
- `tournamentService.js` (backend) — add `copyTournament(sourceId, overrides, userId)` service function
- `TournamentSetupPage.jsx` — add copy mode to creation form (pre-fill from source data)
- Tournament list component — add action dropdown menu with Copy and Recalculate Seeding options
- `bracketPersistenceValidator.js` or new validator — validation schema for copy request body

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-tournament-copy*
*Context gathered: 2026-03-04*
