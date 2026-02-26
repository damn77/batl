# Implementation Plan: Knockout Tournament Bracket View

**Branch**: `011-knockout-bracket-view` | **Date**: 2026-01-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/011-knockout-bracket-view/spec.md`

## Summary

This feature enhances the existing `KnockoutBracket` React component to display tournament brackets in a triangular layout with proper match positioning, zoom/pan navigation, BYE visibility toggle, and "My Match" functionality. The implementation is frontend-focused with minimal backend changes, leveraging existing tournament data APIs.

## Technical Context

**Language/Version**: JavaScript ES2022+ (React 19, Node.js 20+)
**Primary Dependencies**: React 19, React Bootstrap 2.10, Vite 7
**Storage**: N/A (frontend-only, consumes existing APIs)
**Testing**: Vitest (frontend unit/component tests)
**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Web application (frontend enhancement)
**Performance Goals**: <3s initial render for 128-player bracket, smooth 60fps zoom/pan
**Constraints**: Must integrate with existing KnockoutBracket component, read-only display
**Scale/Scope**: Support 4-128 players, configurable colors

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Specification-Driven Development | ✅ PASS | Complete spec with 4 user stories (P1-P4), 17 FRs, 7 success criteria |
| II. Incremental Delivery | ✅ PASS | User stories are independently testable: P1 (basic display), P2 (navigation), P3 (BYE toggle), P4 (My Match) |
| III. Design Before Implementation | ✅ PASS | This plan generates all required artifacts before task generation |
| IV. Test Accountability | ✅ PASS | Tests optional per constitution (not explicitly requested in spec) |
| V. Constitution Compliance | ✅ PASS | No violations |

## Project Structure

### Documentation (this feature)

```text
specs/011-knockout-bracket-view/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (minimal - mostly frontend)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── KnockoutBracket.jsx       # Enhanced (existing)
│   │   ├── KnockoutBracket.css       # Enhanced (existing)
│   │   ├── BracketMatch.jsx          # New - extracted match component
│   │   ├── BracketControls.jsx       # New - zoom/pan/reset controls
│   │   └── BracketMyMatch.jsx        # New - "My Match" button logic
│   ├── config/
│   │   └── bracketColors.js          # New - configurable HEX colors
│   ├── hooks/
│   │   └── useBracketNavigation.js   # New - zoom/pan state management
│   ├── pages/
│   │   └── TournamentViewPage.jsx    # Enhanced (existing)
│   └── services/
│       └── tournamentViewService.js  # Existing (may need minor updates)
└── tests/
    └── components/
        ├── KnockoutBracket.test.jsx  # New component tests
        └── BracketControls.test.jsx  # New control tests
```

**Structure Decision**: Frontend-only enhancement using existing web application structure. New components extracted for modularity. Configuration via JavaScript module for type safety and IDE support.

## Complexity Tracking

> No violations - table empty as expected

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | - | - |

## Implementation Phases

### Phase 1 (P1): View Tournament Bracket - Core Display
- Triangular bracket layout with CSS Grid/Flexbox
- Match vertical positioning between predecessor matches
- Player name display (singles and doubles)
- Score display (completed, BYE, pending)
- Court number display
- Winner highlighting with configurable colors
- Error state for missing data (red background)

### Phase 2 (P2): Navigate Large Brackets - Zoom/Pan
- Zoom controls (scroll wheel, pinch gesture, buttons)
- Pan controls (click-drag, touch-drag)
- Reset button to default view
- Smooth CSS transforms for performance

### Phase 3 (P3): Toggle First Round BYE Visibility
- Default hidden state for first-round BYEs
- Toggle button control
- Later-round BYEs always visible
- State persistence during session

### Phase 4 (P4): Find My Match
- "My Match" button for logged-in participants
- Navigation to player's relevant matches
- Context-aware display (upcoming vs eliminated vs winner)
- Button visibility based on auth state

## Dependencies

| Feature | Dependency Type | What We Need |
|---------|-----------------|--------------|
| 005-tournament-view | Data Source | Tournament and bracket structure |
| 009-bracket-generation | Data Source | Bracket templates, BYE positions |
| 010-seeding-placement | Data Source | Seeded player positions |
| 001-user-management | Auth Context | Current user ID for "My Match" |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| CSS Grid complexity for match positioning | Medium | Medium | Research CSS bracket libraries; fallback to SVG if needed |
| Zoom/pan performance on large brackets | Medium | Medium | Use CSS transforms; implement virtualization if needed |
| Mobile touch gesture conflicts | Low | Low | Use established gesture library (e.g., use-gesture) |

## Technical Decisions

1. **Layout Approach**: CSS Grid with dynamic row positioning vs. SVG canvas
   - Decision: CSS Grid with absolute positioning for connector lines
   - Rationale: Better accessibility, easier styling, React Bootstrap integration

2. **Zoom/Pan Implementation**: CSS transform vs. canvas vs. library
   - Decision: CSS transform with React state management
   - Rationale: Hardware-accelerated, simpler implementation, no external dependencies

3. **Color Configuration**: YAML vs. JavaScript config
   - Decision: JavaScript config module (`bracketColors.js`)
   - Rationale: Type safety, IDE support, no runtime YAML parsing needed

4. **Component Architecture**: Monolithic vs. extracted components
   - Decision: Extract BracketMatch, BracketControls, BracketMyMatch
   - Rationale: Better testability, reusability, separation of concerns