# Implementation Plan: Tournament View

**Branch**: `005-tournament-view` | **Date**: 2025-11-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-tournament-view/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

The Tournament View feature provides a comprehensive, unified page for displaying all information related to a specific tournament. This publicly accessible page serves as the central hub for tournament information, including general data (location, organizer, dates, registration), tournament rules with complexity indicators, registered players with format-specific positioning, and format visualizations (groups as tables, brackets as tree diagrams).

**Technical Approach**: Build a React-based public page with modular components that fetch tournament data from enhanced and new backend APIs. Integrate third-party bracket visualization library (research required) for knockout brackets. Implement lazy loading for format structure and matches to optimize performance. Use React Query for caching and efficient data fetching.

## Technical Context

**Language/Version**:
- Backend: Node.js 20+ (ES Modules)
- Frontend: React 19

**Primary Dependencies**:
- Backend: Express 5.1.0, Prisma ORM
- Frontend: React Bootstrap 2.10, Bootstrap 5.3, React Router (existing), brackets-viewer.js (NEEDS RESEARCH - evaluate vs alternatives)
- Data Fetching: React Query or SWR (NEEDS CLARIFICATION - choose caching library)

**Storage**: SQLite via Prisma ORM (development/production-ready)

**Testing**: Vitest (Jest-compatible API, native ES modules support, Vite integration)

**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge - modern versions)

**Project Type**: Web application (backend API + frontend SPA)

**Performance Goals**:
- Initial page load: < 2 seconds for 95% of requests
- Rules modal open: < 200ms
- Group/bracket expand: < 500ms (includes API call)
- Bracket rendering: < 1 second for 128-player bracket

**Constraints**:
- Public access (no authentication required)
- Read-only data (no mutations on this page)
- Mobile-responsive (Bootstrap grid system)
- Accessibility WCAG AA compliance

**Scale/Scope**:
- Support tournaments up to 256 players without performance degradation
- Handle 4 format types: KNOCKOUT, GROUP, SWISS, COMBINED
- Display up to 100+ matches per tournament
- Mobile usability score > 90 (Google Lighthouse)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Specification-Driven Development ✅
- **Status**: PASS
- **Evidence**: Complete specification exists at `spec.md` with:
  - 7 functional requirements (FR-001 to FR-007) with unique identifiers
  - Clear acceptance criteria for each requirement
  - 5 technical requirements (TR-001 to TR-005)
  - Edge cases covered (8 open questions documented)
  - Success metrics defined

### Principle II: Incremental Delivery ⚠️
- **Status**: VIOLATION - Requires justification
- **Issue**: Feature spec uses functional requirements (FR-XXX) instead of independently testable user stories with P1/P2/P3 priorities
- **Justification**: See Complexity Tracking section below
- **Note**: Will re-evaluate after Phase 1 design to determine if decomposition is feasible

### Principle III: Design Before Implementation ✅
- **Status**: IN PROGRESS
- **Evidence**: Executing planning workflow:
  - Phase 0: research.md (to be generated)
  - Phase 1: data-model.md, contracts/, quickstart.md (to be generated)
  - Phase 2: tasks.md will NOT be generated until design artifacts are complete

### Principle IV: Test Accountability ✅
- **Status**: PASS
- **Evidence**: Tests explicitly requested in specification:
  - Unit tests: Rule complexity calculation, component rendering, data parsing
  - Integration tests: API calls, modal interactions, responsive layout
  - E2E tests: Full page load, navigation, interactions
- **Approach**: Tests will be written during implementation phase (not test-first unless explicitly required per principle)

### Principle V: Constitution Compliance ⚠️
- **Status**: ONE VIOLATION (Principle II)
- **Action**: Violation justified in Complexity Tracking section below
- **Re-check**: Will validate after Phase 1 design artifacts are complete

**GATE STATUS**: ⚠️ CONDITIONAL PASS - Proceed with Phase 0 research, but violation must be addressed before Phase 2 (task generation)

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   ├── tournamentController.js (MODIFY - enhance GET /:id)
│   │   └── routes/
│   │       └── tournamentRoutes.js (MODIFY - add new endpoints)
│   ├── services/
│   │   ├── tournamentService.js (MODIFY - add structure/matches/standings methods)
│   │   └── ruleComplexityService.js (NEW - calculate complexity)
│   └── middleware/
│       └── (existing - no changes)
├── tests/
│   ├── unit/
│   │   └── ruleComplexity.test.js (NEW)
│   └── integration/
│       └── tournamentView.test.js (NEW)
└── prisma/
    └── schema.prisma (NO CHANGES - all models exist)

frontend/
├── src/
│   ├── pages/
│   │   └── TournamentViewPage.jsx (NEW)
│   ├── components/
│   │   ├── TournamentHeader.jsx (NEW)
│   │   ├── TournamentInfoPanel.jsx (NEW)
│   │   ├── TournamentFormatBadge.jsx (NEW)
│   │   ├── TournamentRulesModal.jsx (NEW)
│   │   ├── PlayerListPanel.jsx (NEW)
│   │   ├── FormatVisualization.jsx (NEW)
│   │   ├── GroupStandingsTable.jsx (NEW)
│   │   ├── KnockoutBracket.jsx (NEW)
│   │   ├── SwissRoundPairings.jsx (NEW)
│   │   ├── CombinedFormatDisplay.jsx (NEW)
│   │   ├── RuleComplexityIndicator.jsx (NEW)
│   │   ├── ExpandableSection.jsx (NEW)
│   │   └── MatchResultDisplay.jsx (NEW)
│   ├── services/
│   │   └── tournamentViewService.js (NEW - API client)
│   └── utils/
│       └── (existing - ToastContext.jsx, errorHandler.js - reuse)
└── tests/
    ├── unit/
    │   └── components/ (NEW - component tests)
    └── e2e/
        └── tournamentView.spec.js (NEW)
```

**Structure Decision**: Web application structure (Option 2). This feature adds:
- **Backend**: 3 new API endpoints in existing tournamentController.js, 1 new service (ruleComplexityService.js), modifications to tournamentService.js
- **Frontend**: 1 new page (TournamentViewPage.jsx), 13 new components, 1 new service (tournamentViewService.js)
- **No database changes**: All required models exist from features 001-004
- **Reuse existing**: Error handling utilities, toast notifications, authentication context

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| **Principle II: Incremental Delivery** - No user stories with P1/P2/P3 priorities | Tournament view is a cohesive read-only page where all components are tightly coupled. The page is not useful if we show only partial information (e.g., tournament header without player list). All functional requirements (FR-001 to FR-007) must be implemented together for a functional MVP. | **Splitting into user stories**: Would create artificial boundaries that don't align with user value. Example: "As a user, I want to see tournament location" has no standalone value without also seeing dates, organizer, and registration status. The entire page IS the atomic unit of user value. **Alternative approach**: Implement FRs in dependency order (FR-001 → FR-002 → ... → FR-007), validating each before proceeding. This provides incremental validation without forcing artificial story boundaries. |

**Decision**: Proceed with functional requirement-driven implementation. Each FR will be implemented, tested, and validated independently before proceeding to the next. This maintains the spirit of incremental delivery while respecting the natural cohesion of a view-only page.

**Re-evaluation checkpoint**: After Phase 1 design, we will confirm whether any FRs can be deferred to post-MVP (e.g., FR-005 format visualization might be P2 if basic tournament info is P1). This will be documented in the updated Constitution Check below.

---

## Constitution Check (Post-Phase 1 Re-evaluation)

*Re-evaluation after Phase 1 design artifacts (research.md, data-model.md, quickstart.md, contracts/) are complete*

### Principle I: Specification-Driven Development ✅
- **Status**: PASS (unchanged)
- **Evidence**: Specification remains complete with FRs and acceptance criteria

### Principle II: Incremental Delivery ✅
- **Status**: VIOLATION RESOLVED
- **Resolution**: After Phase 1 design review, we identified a natural decomposition:
  - **MVP (P1)**: FR-001 (General Info), FR-002 (Format Display), FR-003 (Rules Modal), FR-004 (Player List), FR-006 (Public Access), FR-007 (Responsive Design)
  - **Post-MVP (P2)**: FR-005 (Format Visualization - brackets/groups rendered graphically)
  - **Rationale**: Basic tournament info page (P1) provides standalone value to users who want to see tournament details, dates, location, registered players, and rules. Format visualization (P2) enhances this but is not required for initial value delivery. Users can still see all information in tabular form without graphical brackets.
- **Updated Decision**: Implement P1 features first (validate with users), then P2 format visualization. Each FR within P1 will be implemented and tested before proceeding to the next.

### Principle III: Design Before Implementation ✅
- **Status**: COMPLETE
- **Evidence**: All design artifacts generated:
  - ✅ research.md (10 research items + 8 open questions resolved)
  - ✅ data-model.md (12 existing models documented, 0 new models)
  - ✅ contracts/api-endpoints.md (1 enhanced + 3 new endpoints specified)
  - ✅ quickstart.md (end-to-end user journey + technical walkthrough)

### Principle IV: Test Accountability ✅
- **Status**: PASS (unchanged)
- **Evidence**: Test requirements clear in spec.md and quickstart.md testing checklist

### Principle V: Constitution Compliance ✅
- **Status**: ALL VIOLATIONS RESOLVED
- **Action**: Proceed to Phase 2 (task generation) with confidence

**GATE STATUS**: ✅ PASS - Ready for `/speckit.tasks` command

---

## Planning Summary

**Phase 0 (Research)**: ✅ Complete
- Resolved bracket library choice (custom React component)
- Resolved data fetching library choice (SWR)
- Answered 8 open questions from spec

**Phase 1 (Design)**: ✅ Complete
- data-model.md: Documented 12 existing models, 0 new models
- contracts/api-endpoints.md: Specified 1 enhanced + 3 new endpoints
- quickstart.md: Created end-to-end walkthrough with code examples
- Agent context updated (CLAUDE.md)

**Next Step**: Run `/speckit.tasks` to generate actionable task breakdown organized by priority (P1 MVP, P2 Enhanced)
