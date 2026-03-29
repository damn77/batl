# Phase 22: Tournament View Layout - Research

**Researched:** 2026-03-07
**Domain:** React Bootstrap Accordion, status-driven layout, collapsible section architecture
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Section ordering logic:**
- Data-driven `buildSectionOrder(status)` function returns ordered section keys per status
- Status only as input — role-gated sections (OrganizerRegistrationPanel, ConsolationOptOutPanel) still render conditionally in their designated position but ordering logic does not branch on role
- **SCHEDULED order:** Location & Schedule → Organizer & Registration → Format → Players → Points
- **IN_PROGRESS order:** Bracket (hero, above accordion) → Location & Schedule → Organizer & Registration → Format → Players → Points → ConsolationOptOut (if applicable)
- **COMPLETED order:** Champion banner (always visible) → Bracket (above accordion) → Points → Players → Location & Schedule → Organizer & Registration → Format

**Collapsible pattern:**
- React Bootstrap Accordion with `alwaysOpen` prop (multiple sections can be open simultaneously)
- `flush` variant — no outer borders, clean minimal look blending into page background
- Collapse behavior applies on **all viewports** (not mobile-only) — consistent UX everywhere
- The hero element (bracket for IN_PROGRESS, champion banner for COMPLETED) renders **above the accordion** as a standalone section, not inside it

**Default expanded/collapsed states:**
- **SCHEDULED:** Location & Schedule expanded, Organizer & Registration expanded, rest collapsed
- **IN_PROGRESS:** All secondary sections collapsed by default (bracket hero is always visible above)
- **COMPLETED:** Champion banner always visible (not in accordion), bracket expanded above accordion, all accordion sections collapsed

**TournamentInfoPanel restructure:**
- Current two-column layout replaced with vertical arrangement
- Split into two separate accordion items: "Location & Schedule" and "Organizer & Registration"
- Both items are part of the main page accordion (not nested)
- **Compact density** — tighten spacing, reduce padding, use smaller text/line-height. Information should be dense and scannable on both desktop and mobile.

**Champion banner:**
- Keep existing yellow Alert design (no upgrade this phase)
- Always rendered above the accordion for COMPLETED tournaments, not inside it
- Prominently displayed at the top per success criteria

### Claude's Discretion
- Exact section key naming convention in buildSectionOrder()
- How to handle the transition of existing ExpandableSection/Collapse patterns to Accordion
- Whether FormatVisualization keeps its internal expand/collapse or becomes a plain accordion body
- Accordion header styling (icons, badges, section labels)
- How defaultActiveKey is computed per status

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LAYOUT-01 | User sees the bracket as the primary (hero) element when tournament is IN_PROGRESS | Bracket renders above accordion as standalone, always visible — no collapse |
| LAYOUT-02 | Secondary sections collapsed by default on mobile for IN_PROGRESS tournaments | Accordion with no defaultActiveKey for IN_PROGRESS; collapse is universal (all viewports) |
| LAYOUT-03 | User can expand/collapse individual secondary sections on the tournament page | React Bootstrap Accordion with `alwaysOpen` prop supports independent section toggling |
| LAYOUT-04 | Section ordering adapts based on tournament status | buildSectionOrder(status) function drives render order in TournamentViewPage |
| LAYOUT-05 | Champion banner displays prominently for COMPLETED tournaments | Existing yellow Alert renders above accordion, outside collapsible structure |
</phase_requirements>

---

## Summary

Phase 22 restructures `TournamentViewPage.jsx` from a fixed top-to-bottom layout into a status-driven, accordion-based layout. The core change is replacing the current ad-hoc Card+Collapse+Button pattern in `TournamentInfoPanel` and the custom `ExpandableSection` wrapper in `FormatVisualization` with a unified React Bootstrap Accordion that wraps all secondary sections on the page.

The key architectural pattern is two distinct rendering zones: (1) a "hero zone" above the accordion for always-visible elements (bracket for IN_PROGRESS, champion banner for COMPLETED), and (2) the accordion itself for all collapsible secondary sections. Section order within the accordion is determined by `buildSectionOrder(status)` returning an ordered array of section keys. `TournamentViewPage` maps over this array to render sections, preserving role-gating logic inside each section component.

`TournamentInfoPanel` is the component with the most restructuring work. It currently renders as a single Card with internal Collapse and a two-column layout. It must be broken into two separate components (or fragment outputs): a "Location & Schedule" accordion item and an "Organizer & Registration" accordion item. Both become `Accordion.Item` children within the page-level accordion. `FormatVisualization` needs its own internal expand/collapse mechanism removed when used inside an accordion body, since the accordion header handles the toggle.

**Primary recommendation:** Build a `buildSectionOrder(status)` utility function, create a page-level `Accordion alwaysOpen flush` in `TournamentViewPage`, factor `TournamentInfoPanel` into two accordion-item-shaped components, and adapt `FormatVisualization` to drop its own toggle when embedded in the accordion.

---

## Standard Stack

### Core (already in project — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-bootstrap | ^2.10.10 | Accordion, Collapse, Card, Alert, Badge | Already the UI library — Accordion already imported in ConsolationOptOutPanel |
| bootstrap | ^5.3.8 | CSS utility classes, spacing, typography | Already in use throughout |
| react | ^19.2.0 | Component model, hooks | Project standard |

**No new packages needed.** React Bootstrap Accordion is already in the project and already used by `ConsolationOptOutPanel`.

### React Bootstrap Accordion API (verified from project usage)

The project already uses `Accordion` from `react-bootstrap`. Key props for this phase:

```jsx
// alwaysOpen: multiple panels can be open simultaneously
// flush: removes outer border and rounded corners, blends into page
// defaultActiveKey: array of eventKeys open by default (when alwaysOpen is set)
<Accordion alwaysOpen flush defaultActiveKey={['location-schedule']}>
  <Accordion.Item eventKey="location-schedule">
    <Accordion.Header>Location & Schedule</Accordion.Header>
    <Accordion.Body>
      {/* content */}
    </Accordion.Body>
  </Accordion.Item>
</Accordion>
```

`defaultActiveKey` accepts a `string` or `string[]`. With `alwaysOpen`, it accepts an array of eventKeys that should be open on initial render.

---

## Architecture Patterns

### Recommended File Structure Changes

```
frontend/src/
├── pages/
│   └── TournamentViewPage.jsx      # REFACTOR: add buildSectionOrder(), accordion wrapper
├── components/
│   ├── TournamentInfoPanel.jsx     # REFACTOR: split into 2 accordion items, vertical layout, compact density
│   ├── FormatVisualization.jsx     # ADAPT: remove internal toggle when called from accordion context
│   ├── ExpandableSection.jsx       # KEEP: still used for sub-sections inside FormatVisualization (groups)
│   ├── ConsolationOptOutPanel.jsx  # NO CHANGE: already uses Accordion internally
│   ├── OrganizerRegistrationPanel.jsx  # WRAP: becomes an Accordion.Item in the page
│   └── PlayerListPanel.jsx         # WRAP: becomes an Accordion.Item in the page
```

### Pattern 1: buildSectionOrder(status) Function

**What:** A pure function that returns an ordered array of section keys based on tournament status.
**When to use:** Called in TournamentViewPage render to determine accordion item order.

**Recommended key names:**
```javascript
// frontend/src/utils/tournamentSectionOrder.js  (or inline in TournamentViewPage)
export function buildSectionOrder(status) {
  switch (status) {
    case 'SCHEDULED':
      return ['location-schedule', 'organizer-registration', 'format', 'players', 'points'];
    case 'IN_PROGRESS':
      // bracket is hero (above accordion), consolation-optout appended conditionally
      return ['location-schedule', 'organizer-registration', 'format', 'players', 'points'];
    case 'COMPLETED':
      // champion banner + bracket are heroes (above accordion)
      return ['points', 'players', 'location-schedule', 'organizer-registration', 'format'];
    default:
      return ['location-schedule', 'organizer-registration', 'format', 'players', 'points'];
  }
}
```

**Note:** For IN_PROGRESS, the bracket renders above the accordion as the hero — it does NOT appear in the section order array.

### Pattern 2: defaultActiveKey Computation

**What:** Computes which accordion items open by default, based on tournament status.
**When to use:** Passed as `defaultActiveKey` to the page-level Accordion.

```javascript
function getDefaultActiveKeys(status) {
  switch (status) {
    case 'SCHEDULED':
      return ['location-schedule', 'organizer-registration'];
    case 'IN_PROGRESS':
      return []; // all collapsed, bracket hero is visible
    case 'COMPLETED':
      return []; // all collapsed, champion+bracket heroes visible
    default:
      return ['location-schedule'];
  }
}
```

### Pattern 3: Hero Zone (above accordion)

**What:** Elements that render above the accordion, always visible, never collapsible.
**When to use:** IN_PROGRESS → bracket as hero. COMPLETED → champion banner + bracket.

```jsx
{/* Hero zone — renders above accordion */}
{tournament.status === 'COMPLETED' && tournament.champion && (
  <Alert variant="warning" className="mt-3 text-center fs-5">
    Champion: <strong>{tournament.champion.name}</strong>
  </Alert>
)}

{/* Bracket hero for IN_PROGRESS and COMPLETED */}
{(tournament.status === 'IN_PROGRESS' || tournament.status === 'COMPLETED') && (
  <div className="mt-4">
    <FormatVisualization
      tournament={tournament}
      mutateTournament={mutateTournament}
      alwaysExpanded={true}  // signal to skip internal toggle
    />
  </div>
)}

{/* Page-level accordion for secondary sections */}
<Accordion alwaysOpen flush defaultActiveKey={defaultKeys} className="mt-3">
  {/* sections mapped from buildSectionOrder(status) */}
</Accordion>
```

### Pattern 4: TournamentInfoPanel Split into Two Accordion Items

**What:** The current TournamentInfoPanel card becomes two `Accordion.Item` children exposed to the parent.

**Option A (recommended): Two separate small components**
```jsx
// LocationScheduleItem.jsx — renders Accordion.Item eventKey="location-schedule"
// OrganizerRegistrationItem.jsx — renders Accordion.Item eventKey="organizer-registration"
```

**Option B: Single component renders two Accordion.Items**
```jsx
// TournamentInfoPanel receives eventKeyPrefix prop, renders two Accordion.Items as fragment
const TournamentInfoPanel = ({ tournament }) => (
  <>
    <Accordion.Item eventKey="location-schedule">
      <Accordion.Header>Location & Schedule</Accordion.Header>
      <Accordion.Body className="p-2">
        {/* vertical compact layout */}
      </Accordion.Body>
    </Accordion.Item>
    <Accordion.Item eventKey="organizer-registration">
      <Accordion.Header>Organizer & Registration</Accordion.Header>
      <Accordion.Body className="p-2">
        {/* vertical compact layout */}
      </Accordion.Body>
    </Accordion.Item>
  </>
);
```

Option B is simpler — keeps all formatting logic in one file, renders as React fragment. The parent Accordion accepts fragments as children.

### Pattern 5: Compact Info Density

**What:** Replace current `mb-3` info rows with tighter spacing. Replace two-column Card layout with vertical list.

**Current:** Two nested Cards side-by-side (`Col lg={6}`), each with `p-4` Card.Body, `mb-3` rows with separate label/value cols.

**Target pattern:** Single vertical list, tighter spacing:
```jsx
// Compact info row — no separate Row/Col grid, uses flexbox
const InfoRow = ({ label, value }) => (
  <div className="d-flex justify-content-between align-items-baseline py-1 border-bottom border-light">
    <span className="text-muted small">{label}</span>
    <span className="fw-semibold small text-end ms-3">{value}</span>
  </div>
);
// Use px-0 py-2 on Accordion.Body for tight padding
```

**CSS approach:** Use Bootstrap utilities — `py-1` for row spacing, `small` for text size, `border-bottom border-light` for subtle row separators.

### Pattern 6: FormatVisualization Adaptation

**What:** FormatVisualization currently manages its own expand/collapse state. When used as a hero (always visible), it should render expanded without a toggle button.

**Recommended:** Add an `alwaysExpanded` prop. When `true`, skip the toggle button and always render the content.

```jsx
const FormatVisualization = ({ tournament, mutateTournament, alwaysExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(alwaysExpanded);

  // When alwaysExpanded, force-fetch on mount
  const shouldFetch = alwaysExpanded || isExpanded;
  const { structure, isLoading, isError, mutate } = useFormatStructure(tournament?.id, shouldFetch);

  // ...

  return (
    <Card className="border-0 shadow-sm">
      {!alwaysExpanded && (
        <Card.Header className="bg-light">
          {/* toggle button */}
        </Card.Header>
      )}
      {/* content — no Collapse wrapper when alwaysExpanded */}
      {alwaysExpanded ? (
        <Card.Body>{/* visualization */}</Card.Body>
      ) : (
        <Collapse in={isExpanded}>
          <div><Card.Body>{/* visualization */}</Card.Body></div>
        </Collapse>
      )}
    </Card>
  );
};
```

This preserves the lazy-loading behavior for the secondary (accordion) format section in SCHEDULED, while enabling always-on rendering for IN_PROGRESS and COMPLETED hero.

**Note:** For SCHEDULED, FormatVisualization still renders inside the accordion with its own toggle for the format section. For IN_PROGRESS and COMPLETED, it renders above the accordion with `alwaysExpanded={true}`.

### Anti-Patterns to Avoid

- **Nested Accordion:** Do not put a React Bootstrap Accordion inside another Accordion.Item body — `ConsolationOptOutPanel` already has its own Accordion internally, which is fine since it's not a nested `Accordion.Item` of the outer accordion.
- **Role branching in buildSectionOrder:** The function takes only `status` as input. Role-gating (OrganizerRegistrationPanel visibility) is handled by conditional rendering in the section map, not by changing the order array.
- **Removing lazy loading from FormatVisualization:** The `useFormatStructure` hook should still only fire when the section is active/visible. Keep `shouldFetch = alwaysExpanded || isExpanded` logic.
- **Putting hero elements inside Accordion:** Champion banner and bracket hero must remain outside the Accordion entirely.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-panel expand/collapse with independent state | Custom useState + Collapse array | `Accordion alwaysOpen` from react-bootstrap | Bootstrap handles aria-expanded, keyboard navigation, animation |
| Scroll-into-view on accordion open | Custom scroll logic | None needed — accordion body expands inline, viewport adjustment is natural | |
| Toggle animation | Custom CSS transitions | Bootstrap's built-in Accordion collapse animation | Already styled correctly |

---

## Common Pitfalls

### Pitfall 1: Accordion.Item Renders Inside Fragment from TournamentInfoPanel

**What goes wrong:** If `TournamentInfoPanel` returns two `Accordion.Item` elements as a React fragment, and the parent maps over `buildSectionOrder()` to render each section, the mapping logic must handle the case where one section key (`info`) maps to a fragment with two items, not a single item.

**How to avoid:** Either (a) use two separate section keys (`location-schedule` and `organizer-registration`) and render a separate component for each, or (b) treat `TournamentInfoPanel` as a special case that renders both accordion items at once outside the map loop.

**Recommendation:** Use two separate section keys and two thin wrapper components. The `buildSectionOrder()` function returns `['location-schedule', 'organizer-registration', ...]` and the render map has a switch/if for each key.

### Pitfall 2: defaultActiveKey Array vs String with alwaysOpen

**What goes wrong:** When `alwaysOpen` is set, `defaultActiveKey` must be an **array** of eventKeys. Passing a single string only opens that one item and disables multi-open behavior.

**How to avoid:** Always compute `defaultActiveKey` as an array, even for a single item:
```jsx
// CORRECT
<Accordion alwaysOpen defaultActiveKey={['location-schedule', 'organizer-registration']}>

// WRONG — second item won't work as independent toggle
<Accordion alwaysOpen defaultActiveKey="location-schedule">
```

### Pitfall 3: FormatVisualization Double-Renders

**What goes wrong:** For SCHEDULED tournaments, `FormatVisualization` appears both in the hero zone check (`if IN_PROGRESS || COMPLETED`) and in the accordion section. The SCHEDULED path should only render it inside the accordion (not the hero).

**How to avoid:** Gate the hero FormatVisualization strictly:
```jsx
{(tournament.status === 'IN_PROGRESS' || tournament.status === 'COMPLETED') && (
  <FormatVisualization ... alwaysExpanded={true} />
)}
```
The accordion's `format` section still renders `FormatVisualization` with its normal toggle for all statuses — but for IN_PROGRESS/COMPLETED, this accordion item can be collapsed (the hero is always visible).

**Alternative considered:** Exclude `format` from the accordion entirely for IN_PROGRESS/COMPLETED. But the decisions say "Format" appears in the order arrays for all statuses (collapsed by default), so the accordion item should still exist as a secondary way to access format for those statuses too.

### Pitfall 4: ConsolationOptOutPanel Placement

**What goes wrong:** ConsolationOptOutPanel is currently rendered with a `<hr>` separator outside all other sections. It is role+condition gated (`user && KNOCKOUT && MATCH_2 && IN_PROGRESS`).

**How to avoid:** Per the decisions, ConsolationOptOut is the last item in the IN_PROGRESS order. Since it's conditionally gated, the section render map should check those conditions and append it at the end. Do not include it in `buildSectionOrder()` return value — append it conditionally after the map.

### Pitfall 5: Start Tournament Button Not in Accordion

**What goes wrong:** The Start Tournament button currently renders outside all panels. It should remain outside the accordion — it is an action button, not a content section.

**How to avoid:** Render the Start Tournament button in its current location (above TournamentInfoPanel row), before the hero zone and accordion begin. No change needed to its position logic.

---

## Code Examples

### TournamentViewPage Skeleton (refactored)

```jsx
// Status-driven section ordering
const sectionOrder = buildSectionOrder(tournament.status);
const defaultKeys = getDefaultActiveKeys(tournament.status);

const isHeroBracket = tournament.status === 'IN_PROGRESS' || tournament.status === 'COMPLETED';

return (
  <>
    {/* Champion banner — above accordion for COMPLETED */}
    {tournament.status === 'COMPLETED' && tournament.champion && (
      <Alert variant="warning" className="mt-3 text-center fs-5">
        Champion: <strong>{tournament.champion.name}</strong>
      </Alert>
    )}

    {/* Bracket hero — always visible for IN_PROGRESS and COMPLETED */}
    {isHeroBracket && (
      <div className="mt-3">
        <FormatVisualization
          tournament={tournament}
          mutateTournament={mutateTournament}
          alwaysExpanded={true}
        />
      </div>
    )}

    {/* Secondary sections — accordion */}
    <Accordion alwaysOpen flush defaultActiveKey={defaultKeys} className="mt-3">
      {sectionOrder.map(key => renderSection(key))}
      {/* ConsolationOptOut appended conditionally for IN_PROGRESS */}
      {shouldShowConsolationOptOut && (
        <Accordion.Item eventKey="consolation-optout">
          <Accordion.Header>Consolation Opt-Out</Accordion.Header>
          <Accordion.Body>
            <ConsolationOptOutPanel tournament={tournament} user={user} />
          </Accordion.Body>
        </Accordion.Item>
      )}
    </Accordion>
  </>
);
```

### renderSection Switch

```jsx
const renderSection = (key) => {
  switch (key) {
    case 'location-schedule':
      return (
        <Accordion.Item key={key} eventKey={key}>
          <Accordion.Header>Location & Schedule</Accordion.Header>
          <Accordion.Body className="px-3 py-2">
            <LocationScheduleContent tournament={tournament} />
          </Accordion.Body>
        </Accordion.Item>
      );
    case 'organizer-registration':
      return (
        <Accordion.Item key={key} eventKey={key}>
          <Accordion.Header>Organizer & Registration</Accordion.Header>
          <Accordion.Body className="px-3 py-2">
            {(user?.role === 'ORGANIZER' || user?.role === 'ADMIN') && (
              <OrganizerRegistrationPanel tournament={tournament} onRegistrationComplete={...} />
            )}
            <OrganizerRegistrationContent tournament={tournament} />
          </Accordion.Body>
        </Accordion.Item>
      );
    case 'format':
      return (
        <Accordion.Item key={key} eventKey={key}>
          <Accordion.Header>Format</Accordion.Header>
          <Accordion.Body className="p-0">
            <FormatVisualization tournament={tournament} mutateTournament={mutateTournament} />
          </Accordion.Body>
        </Accordion.Item>
      );
    case 'players':
      return (
        <Accordion.Item key={key} eventKey={key}>
          <Accordion.Header>Players</Accordion.Header>
          <Accordion.Body className="p-0">
            <PlayerListPanel tournament={tournament} />
          </Accordion.Body>
        </Accordion.Item>
      );
    case 'points':
      return (
        <Accordion.Item key={key} eventKey={key}>
          <Accordion.Header>Points</Accordion.Header>
          <Accordion.Body className="p-0">
            <PointPreviewPanel tournamentId={tournament.id} />
          </Accordion.Body>
        </Accordion.Item>
      );
    default:
      return null;
  }
};
```

### Compact InfoRow Pattern

```jsx
// Replace the current Row/Col-based InfoRow with a compact flex row
const InfoRow = ({ label, value, link }) => {
  if (value === null || value === undefined || value === 'Not specified') return null;
  return (
    <div className="d-flex justify-content-between align-items-baseline py-1 border-bottom border-light">
      <span className="text-muted" style={{ fontSize: '0.8rem' }}>{label}</span>
      <span className="fw-semibold text-end ms-2" style={{ fontSize: '0.85rem' }}>
        {link ? <Link to={link} className="text-decoration-none">{value}</Link> : value}
      </span>
    </div>
  );
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Multiple separate Card+Collapse+Button widgets | Single `Accordion alwaysOpen flush` | Phase 22 | Consistent UX, keyboard accessible, no custom toggle code |
| Two-column TournamentInfoPanel | Two vertical accordion items | Phase 22 | Mobile friendly, compact density |
| Fixed section order | Status-driven `buildSectionOrder()` | Phase 22 | Hero element first for each status |

**Already deprecated in this phase:**
- `TournamentInfoPanel`'s internal `Collapse` + `useState(detailsOpen)` toggle — replaced by accordion header
- `FormatVisualization`'s Card.Header toggle button — replaced by accordion or removed for hero mode
- The `ExpandableSection` usage in FormatVisualization outer wrapper — replaced by Accordion.Item; `ExpandableSection` still used inside FormatVisualization for sub-sections (groups, brackets)

---

## Open Questions

1. **OrganizerRegistrationPanel inside "Organizer & Registration" section**
   - What we know: The current page renders OrganizerRegistrationPanel in its own Row below TournamentInfoPanel (role-gated)
   - What's unclear: Should the OrganizerRegistrationPanel (which manages player registration actions) be inside the same accordion item as the organizer contact info, or a separate accordion item?
   - Recommendation: Per the decisions, the section order has `organizer-registration` as a single key. Include both organizer contact info AND the OrganizerRegistrationPanel inside this accordion body (role-gated within body). This keeps everything "organizer related" together. If this feels too crowded, split to separate accordion item — this is Claude's discretion.

2. **FormatVisualization in accordion for IN_PROGRESS/COMPLETED**
   - What we know: Decisions say Format appears in all status orderings (last position for COMPLETED). The hero bracket is always visible above the accordion.
   - What's unclear: Should the `format` accordion item also render `FormatVisualization` for IN_PROGRESS/COMPLETED (creating two FormatVisualization instances), or should it be omitted from the accordion when a hero already shows it?
   - Recommendation: Include it in the accordion for all statuses (collapsed by default for IN_PROGRESS/COMPLETED). It triggers a second data fetch only if the user expands it. Using the same `useFormatStructure` hook with SWR means the data is cached from the hero fetch — no real cost. This matches the locked decision that Format appears in all order arrays.

---

## Validation Architecture

`workflow.nyquist_validation` key is absent from `.planning/config.json` — treat as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | No frontend test framework detected (no Vitest/Jest config in frontend/) |
| Config file | None |
| Quick run command | N/A — no test runner configured |
| Full suite command | N/A |

The frontend `package.json` has no `test` script and no Vitest/Jest devDependency. The project uses Vitest for backend tests only (per CLAUDE.md, Vitest is listed under feature 003). Frontend has no test infrastructure.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAYOUT-01 | Bracket visible above accordion for IN_PROGRESS | manual | N/A — no test runner | ❌ |
| LAYOUT-02 | Accordion items collapsed by default for IN_PROGRESS | manual | N/A — no test runner | ❌ |
| LAYOUT-03 | Individual section expand/collapse | manual | N/A — no test runner | ❌ |
| LAYOUT-04 | Section ordering changes per status | unit (pure function) | N/A — no test runner | ❌ |
| LAYOUT-05 | Champion banner prominent for COMPLETED | manual | N/A — no test runner | ❌ |

**LAYOUT-04** (`buildSectionOrder`) is a pure function that could be unit-tested with minimal setup if Vitest is added to the frontend. All other requirements are UI layout behaviors best verified manually.

### Sampling Rate
- Per task commit: Manual smoke test — load tournament page in browser for each status
- Per wave merge: Manual verification against all 5 success criteria
- Phase gate: All 5 LAYOUT requirements verified manually before `/gsd:verify-work`

### Wave 0 Gaps
- No test infrastructure gaps to address — frontend has no test runner, and this phase does not introduce one. All verification is manual.
- If unit test coverage of `buildSectionOrder()` is desired: `npm install -D vitest @testing-library/react @testing-library/jest-dom` in frontend — but this is out of scope for Phase 22.

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `TournamentViewPage.jsx`, `TournamentInfoPanel.jsx`, `FormatVisualization.jsx`, `ExpandableSection.jsx`, `ConsolationOptOutPanel.jsx`, `PlayerListPanel.jsx` — all read in full
- `frontend/package.json` — confirmed react-bootstrap ^2.10.10, bootstrap ^5.3.8, no test framework
- `ConsolationOptOutPanel.jsx` — confirmed Accordion already imported and used in this project
- `.planning/phases/22-tournament-view-layout/22-CONTEXT.md` — locked decisions read verbatim

### Secondary (MEDIUM confidence)
- React Bootstrap Accordion `alwaysOpen` prop behavior inferred from ConsolationOptOutPanel usage pattern and react-bootstrap 2.x documentation knowledge

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, no new dependencies
- Architecture: HIGH — code read directly, patterns derived from actual source
- Pitfalls: HIGH — identified from direct analysis of existing code interactions
- Validation: HIGH — confirmed no frontend test runner exists

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable dependencies, no fast-moving ecosystem)
