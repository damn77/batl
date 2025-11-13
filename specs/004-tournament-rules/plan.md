# Implementation Plan: Tournament Rules and Formats

**Branch**: `004-tournament-rules` | **Date**: 2025-01-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-tournament-rules/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a comprehensive tournament rules and formats system that enables organizers to configure tournament formats (knockout, group, swiss system, combined), define cascading match scoring rules at multiple levels (tournament, group/bracket, round, match), and dynamically adjust rules during active tournaments while preserving historical accuracy. The system supports format-specific configurations including match guarantees for knockout tournaments, group size management, advancement rules for combined tournaments, and provides clear rule transparency to all participants.

## Technical Context

**Language/Version**: Node.js 20+ (ES Modules)
**Primary Dependencies**: Express 5.1.0, Prisma ORM, React 19, React Bootstrap 2.10
**Storage**: SQLite via Prisma ORM (development/production-ready)
**Testing**: Vitest (Jest-compatible API, native ES modules support)
**Target Platform**: Web application (backend API + frontend SPA)
**Project Type**: Web (backend + frontend)
**Performance Goals**: <500ms for rule cascade resolution, <200ms for format validation, <2 seconds for tournament rule configuration
**Constraints**: Rule changes must not affect completed matches, cascade resolution must be deterministic, group size validation must prevent impossible distributions
**Scale/Scope**: Support 50+ concurrent tournaments with different formats, handle cascading rules across 4 levels (tournament/group/round/match), support groups of 2-8 players

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Specification-Driven Development ✅ PASS
- [x] Complete specification exists at [spec.md](spec.md)
- [x] User stories with priorities (P1, P2)
- [x] Functional requirements with IDs (FR-001 through FR-043)
- [x] Measurable success criteria (SC-001 through SC-010)
- [x] Edge cases identified

### Principle II: Incremental Delivery ✅ PASS
- [x] User stories decomposed into independently testable units (5 stories)
- [x] Clear priorities assigned:
  - P1: Define Tournament Format and Basic Rules, View Tournament Rules and Format
  - P2: Configure Format-Specific Settings, Define Cascading Rules, Adjust Rules During Tournament
- [x] Priority order defined: P1 (MVP) → P2 (Enhanced)
- [x] Each story delivers standalone value

### Principle III: Design Before Implementation ✅ PASS
- [x] research.md: ✅ Complete (Phase 0 output)
- [x] data-model.md: ✅ Complete (Phase 1 output)
- [x] contracts/: ✅ Complete (Phase 1 output)
- [x] quickstart.md: ✅ Complete (Phase 1 output)
- [x] tasks.md: Phase 2 (not created by /speckit.plan)

### Principle IV: Test Accountability ✅ PASS (OPTIONAL)
- Tests NOT explicitly requested in feature specification
- Therefore tests are OPTIONAL per constitution
- Testing strategy to be determined during research phase

### Principle V: Constitution Compliance ✅ PASS
- No violations detected
- All principles satisfied
- No complexity tracking needed

## Project Structure

### Documentation (this feature)

```text
specs/004-tournament-rules/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── api-endpoints.md # REST API contracts for tournament rules
│   └── data-contracts.md # Enum and validation rules
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/          # (via Prisma schema)
│   ├── services/
│   │   ├── tournamentRulesService.js   # Format and rule management
│   │   ├── matchRulesService.js        # Cascading rule resolution
│   │   ├── formatValidationService.js  # Group size, advancement validation
│   │   └── ruleHistoryService.js       # Rule snapshot for completed matches
│   ├── api/
│   │   └── tournamentRulesController.js # HTTP handlers
│   └── middleware/
│       └── validateRules.js             # Request validation
├── prisma/
│   └── schema.prisma    # Extended with TournamentFormat, MatchScoringRules, etc.
└── tests/
    ├── services/
    └── api/

frontend/
├── src/
│   ├── components/
│   │   ├── TournamentFormatSelector.jsx   # Format dropdown
│   │   ├── MatchScoringRulesForm.jsx      # Match rules configuration
│   │   ├── FormatConfigPanel.jsx          # Format-specific settings
│   │   └── RuleCascadeViewer.jsx          # Display cascading rules
│   ├── pages/
│   │   ├── TournamentRulesSetupPage.jsx   # Organizer: create/edit rules
│   │   └── TournamentRulesViewPage.jsx    # Player: view rules
│   └── services/
│       └── tournamentRulesService.js       # API client
└── tests/
```

**Structure Decision**: Web application structure with backend API and frontend SPA. This feature extends existing backend services and controllers from 002-category-system and 003-tournament-registration while adding new rule management modules. Frontend adds new pages for tournament rule configuration and viewing.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No violations - this section intentionally left empty.*
