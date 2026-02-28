# Phase 3: Player Statistics - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Players and visitors can view a player's full match history on a public profile tab. Any user (including non-logged-in visitors) can access this. A completed tournaments list page (/tournaments) is also added as the primary navigation path for visitors to discover player profiles.

Creating or editing match results, tournament management, and reporting are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Match history presentation
- Table layout (not cards): columns are tournament name, category, opponent, score, W/L outcome
- Default sort: most recent matches first
- Filter by category: dropdown to show matches for one category at a time
- Pagination: 20 matches per page

### Profile page integration
- New "Match History" tab on the existing player profile page
- No win/loss summary above the table — just the table itself
- Tab is fully public — no login required to view any player's history
- Player names in the knockout bracket and in the rankings table become clickable links to their profile page

### BYE and special outcomes
- BYE matches are excluded from history entirely (not real matches)
- Pending matches (no result yet): shown in the table with score displayed as "-" and no W/L badge
- Walkovers, forfeits, no-shows: show the outcome label ("Walkover", "Forfeit", "No-show") in the score column instead of a score; W/L badge still applies

### Empty state
- Simple text message when a player has no matches: "No matches played yet."

### Completed tournaments list (navigation enabler)
- New public `/tournaments` page listing completed tournaments
- Each row shows: tournament name, category, date, link to bracket/results
- Navigation link in the main navbar visible to all visitors (logged in or not)
- This is the primary path for visitors to discover players and reach profile pages

### Claude's Discretion
- Exact table column widths and responsive behavior on mobile
- W/L badge styling (color/shape — consistent with existing BATL badge patterns)
- Pagination control placement and style
- Category filter dropdown placement relative to the table

</decisions>

<specifics>
## Specific Ideas

- The completed tournaments list solves a real navigation gap: currently there is no public path for a visitor to access completed tournaments or find player profiles without being logged in
- "Link to bracket/results" from the tournaments list should navigate to the existing tournament bracket view (Feature 011)

</specifics>

<deferred>
## Deferred Ideas

- A richer tournament history page with winner display, participant count, and detailed stats — the /tournaments page in this phase is intentionally minimal (navigation enabler only)
- Win/loss summary stats (overall record, per-category breakdown, win percentage) — user chose not to include in this phase
- Filtering by date range or tournament

</deferred>

---

*Phase: 03-player-statistics*
*Context gathered: 2026-02-28*
