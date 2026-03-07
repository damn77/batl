# Phase 22: Tournament View Layout - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Tournament page content surfaces in the right order based on tournament status. Bracket is the hero element for IN_PROGRESS tournaments. Secondary sections are collapsible via React Bootstrap Accordion. Section ordering is data-driven via a `buildSectionOrder(status)` function. No backend changes.

</domain>

<decisions>
## Implementation Decisions

### Section ordering logic
- Data-driven `buildSectionOrder(status)` function returns ordered section keys per status
- Status only as input — role-gated sections (OrganizerRegistrationPanel, ConsolationOptOutPanel) still render conditionally in their designated position but ordering logic does not branch on role
- **SCHEDULED order:** Location & Schedule → Organizer & Registration → Format → Players → Points
- **IN_PROGRESS order:** Bracket (hero, above accordion) → Location & Schedule → Organizer & Registration → Format → Players → Points → ConsolationOptOut (if applicable)
- **COMPLETED order:** Champion banner (always visible) → Bracket (above accordion) → Points → Players → Location & Schedule → Organizer & Registration → Format

### Collapsible pattern
- React Bootstrap Accordion with `alwaysOpen` prop (multiple sections can be open simultaneously)
- `flush` variant — no outer borders, clean minimal look blending into page background
- Collapse behavior applies on **all viewports** (not mobile-only) — consistent UX everywhere
- The hero element (bracket for IN_PROGRESS, champion banner for COMPLETED) renders **above the accordion** as a standalone section, not inside it

### Default expanded/collapsed states
- **SCHEDULED:** Location & Schedule expanded, Organizer & Registration expanded, rest collapsed
- **IN_PROGRESS:** All secondary sections collapsed by default (bracket hero is always visible above)
- **COMPLETED:** Champion banner always visible (not in accordion), bracket expanded above accordion, all accordion sections collapsed

### TournamentInfoPanel restructure
- Current two-column layout replaced with vertical arrangement
- Split into two separate accordion items:
  - "Location & Schedule" — higher priority, expanded by default for SCHEDULED
  - "Organizer & Registration" — lower priority, collapsed by default
- Both items are part of the main page accordion (not nested)
- **Compact density** — current info section wastes too much space. Tighten spacing, reduce padding, use smaller text/line-height. Information should be dense and scannable on both desktop and mobile.

### Champion banner
- Keep existing yellow Alert design (no upgrade this phase)
- Always rendered above the accordion for COMPLETED tournaments, not inside it
- Prominently displayed at the top per success criteria

### Claude's Discretion
- Exact section key naming convention in buildSectionOrder()
- How to handle the transition of existing ExpandableSection/Collapse patterns to Accordion
- Whether FormatVisualization keeps its internal expand/collapse or becomes a plain accordion body
- Accordion header styling (icons, badges, section labels)
- How defaultActiveKey is computed per status

</decisions>

<specifics>
## Specific Ideas

- "Location & Schedule are higher priority. Organizer and registration lower priority — minimized by default"
- Info panel should arrange vertically (not two-column)
- Bracket should feel like a true hero element — always visible, not collapsible
- "Information section has very low density — compact the text more to not use as much space, both in browser and mobile"

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TournamentViewPage.jsx`: Main orchestrator — refactor section rendering to use buildSectionOrder()
- `TournamentInfoPanel.jsx`: Currently has its own Collapse toggle and two-column layout — will be split into two accordion items
- `FormatVisualization.jsx`: Has internal expand/collapse with lazy loading — wrap in accordion item
- `ExpandableSection.jsx`: Custom Card+Collapse wrapper — may be retired for accordion items on this page
- `ConsolationOptOutPanel.jsx`: Already uses React Bootstrap Accordion internally
- React Bootstrap Accordion already imported and used in the project

### Established Patterns
- Status-based conditional rendering (`tournament.status === 'COMPLETED'`, etc.)
- Role-gating via `user?.role` checks for organizer-only sections
- Lazy loading in FormatVisualization (fetch on expand) — preserve this behavior within accordion
- Card-based layout throughout the app

### Integration Points
- `TournamentViewPage.jsx` is the single file orchestrating all sections
- Champion banner already exists (yellow Alert, lines 121-125)
- Tournament status values: SCHEDULED, IN_PROGRESS, COMPLETED
- No backend changes needed — all frontend restructuring

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 22-tournament-view-layout*
*Context gathered: 2026-03-07*
