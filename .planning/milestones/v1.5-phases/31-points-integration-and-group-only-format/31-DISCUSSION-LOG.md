# Phase 31: Points Integration and Group-Only Format - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 31-points-integration-and-group-only-format
**Areas discussed:** Group placement point calculation, Knockout supersede logic, GROUP-only tournament flow, Advancement status display

---

## Group Placement Point Calculation

### Q1: How should group placement points be calculated?

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse PLACEMENT formula | Same formula as knockout: (participants - placement + 1) × multiplicativeValue. Simple, consistent, already implemented. | ✓ |
| New group-specific point table | Separate lookup table for group placements. More control but adds admin complexity. | |
| Flat points per position | Fixed points: 1st=X, 2nd=Y regardless of group size. Simpler but doesn't scale. | |

**User's choice:** Reuse PLACEMENT formula
**Notes:** None

### Q2: What counts as 'participants' — group size or total tournament participants?

| Option | Description | Selected |
|--------|-------------|----------|
| Group size | Each group is its own mini-tournament for point purposes. Fair when groups have equal sizes. | ✓ |
| Total tournament participants | Inflates points, doesn't distinguish group performance from field size. | |
| You decide | Claude picks based on existing formula. | |

**User's choice:** Group size
**Notes:** None

### Q3: Should existing TournamentPointConfig apply to group placement points too?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, same config | One config per tournament — multiplicativeValue and doublePoints apply to both. | ✓ |
| Separate group config | Add separate multiplier for group vs knockout. More granular but more complex. | |

**User's choice:** Yes, same config
**Notes:** None

### Q4: For uneven groups, is it acceptable that larger groups yield more points?

| Option | Description | Selected |
|--------|-------------|----------|
| Acceptable | Larger groups are harder — fair that 1st earns more. Formula naturally handles this. | ✓ |
| Normalize across groups | Adjust so all 1st-place get equal points. Adds complexity, may feel unfair. | |

**User's choice:** Acceptable
**Notes:** None

---

## Knockout Supersede Logic

### Q1: When should group placement points be awarded for COMBINED tournaments?

| Option | Description | Selected |
|--------|-------------|----------|
| Single award at tournament end | Points calculated once after all knockouts complete. Non-advancing get group points, advancing get knockout points only. | ✓ |
| Award group points first, replace later | Two-step: award after group stage, replace after knockout. Players see points sooner. | |
| Award both, keep higher | Calculate both, keep whichever is higher. Most generous but diverges from 'supersede'. | |

**User's choice:** Single award at tournament end
**Notes:** None

### Q2: For advancing players, should knockout points use bracket participants or total tournament participants?

| Option | Description | Selected |
|--------|-------------|----------|
| Bracket participants | Consistent with how knockout points work today. | ✓ (modified) |
| Total tournament participants | Inflates knockout points relative to standalone tournaments. | |
| You decide | Claude picks based on consistency. | |

**User's choice:** Bracket participants — but with hierarchy guarantee
**Notes:** "Bracket only but the lowest points from main bracket must be more than secondary which must be more than not proceeding from group"

### Q3: How to guarantee the point hierarchy (main > secondary > group)?

| Option | Description | Selected |
|--------|-------------|----------|
| Offset-based | Add offset per bracket tier derived from group participant count. | ✓ |
| Cumulative participant count | Inflate formula input for higher tiers. | |
| You decide | Claude designs simplest mechanism. | |

**User's choice:** Offset-based
**Notes:** None

---

## GROUP-Only Tournament Flow

### Q1: How should a GROUP-only tournament complete?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-complete when all matches done | Same pattern as knockout auto-complete. No organizer button needed. | ✓ |
| Organizer confirms completion | Button appears when matches done. Gives organizer review opportunity. | |
| You decide | Claude picks most consistent approach. | |

**User's choice:** Auto-complete when all matches done
**Notes:** None

### Q2: Should GROUP-only tournament page look different from COMBINED group stage?

| Option | Description | Selected |
|--------|-------------|----------|
| Same group view, no bracket section | Reuse existing GROUP path in FormatVisualization. | ✓ |
| Simplified single-page view | Flatten layout, remove accordions. | |
| You decide | Claude picks based on existing rendering. | |

**User's choice:** Same group view, no bracket section
**Notes:** None

### Q3: When should organizer award points for GROUP-only tournament?

| Option | Description | Selected |
|--------|-------------|----------|
| Manual trigger after completion | Same UX as knockout. Organizer clicks 'Calculate Points'. | ✓ |
| Auto-award on completion | No organizer action. Saves a step but removes preview. | |
| You decide | Claude picks based on consistency. | |

**User's choice:** Manual trigger after completion
**Notes:** None

### Q4: Should organizer provide results manually or auto-derive from standings?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-derive from standings | Backend reads standings positions, builds results. Requires ties resolved. | ✓ |
| Organizer provides results | Manual entry like knockout. Redundant since standings have positions. | |

**User's choice:** Auto-derive from standings
**Notes:** None

---

## Advancement Status Display (GVIEW-05)

### Q1: How should advancement status appear on group standings?

| Option | Description | Selected |
|--------|-------------|----------|
| Badge next to player name | Small colored pill: 'Main' or 'Secondary'. Non-advancing have no badge. | ✓ |
| Dedicated column | 'Advancement' column. More explicit but widens table on mobile. | |
| Row background color | Tinted rows. Visual but accessibility concerns. | |

**User's choice:** Badge next to player name
**Notes:** None

### Q2: Should non-advancing players get any indicator?

| Option | Description | Selected |
|--------|-------------|----------|
| No indicator — just no badge | Absence of badge is the signal. Clean. Consistent with Phase 30. | ✓ |
| Subtle grey-out | Non-advancing rows dimmed. More visible but adds noise. | |
| You decide | Claude picks based on context. | |

**User's choice:** No indicator — just no badge
**Notes:** None

### Q3: When should advancement badges appear?

| Option | Description | Selected |
|--------|-------------|----------|
| After advancement only | Badges appear once brackets generated. | |
| Preview badges during modal | Show provisional badges in modal. | |

**User's choice:** (Custom) Show when all matches of given group are finished
**Notes:** Badges based on projected advancement from current standings + advancement config, appearing as soon as a group completes all its matches

### Q4: Should projected vs confirmed badges look different?

| Option | Description | Selected |
|--------|-------------|----------|
| Same style always | No visual difference. Advancement config makes projection reliable. | ✓ |
| Provisional vs confirmed style | Dashed/lighter for projected, solid for confirmed. | |

**User's choice:** Same style always
**Notes:** None

---

## Claude's Discretion

- Exact offset derivation formula for tier hierarchy
- API endpoint changes for group-aware point calculation
- Service structure (new methods vs branching in existing)
- Badge component implementation details
- Frontend advancement projection computation approach
- SWR cache invalidation strategy
- Error handling for unresolved ties

## Deferred Ideas

None — discussion stayed within phase scope
