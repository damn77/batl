# Implementation Plan: Doubles Pair Management

**Branch**: `006-doubles-pairs` | **Date**: 2025-11-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-doubles-pairs/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a doubles pair management system that allows players to register as partnerships for doubles tournaments. The system automatically manages pair creation, validates eligibility for both players, calculates seeding based on combined individual player rankings, maintains separate pair and individual rankings within each category, and automatically cleans up inactive pairs. Key technical approach includes extending the existing Prisma schema to support DoublesPair and PairRanking entities, creating RESTful APIs for pair registration and lifecycle management, and extending the React frontend with pair selection interfaces and ranking displays.

## Technical Context

**Language/Version**: Node.js 20+ (ES Modules)
**Primary Dependencies**: Express 5.1.0, Prisma ORM, React 19, React Bootstrap 2.10, TanStack React Table 8.21
**Storage**: SQLite via Prisma ORM (development/production-ready)
**Testing**: Vitest (Jest-compatible API, native ES modules support, Vite integration)
**Target Platform**: Web application (Linux/Windows server backend, modern browsers frontend)
**Project Type**: Web application (backend API + frontend SPA)
**Performance Goals**: Support 100+ pairs per category, handle tournament seeding for 32+ pair tournaments in <500ms, pair registration UI response <200ms
**Constraints**: Must maintain backward compatibility with existing singles tournament flows, zero downtime deployment, maintain <100MB database size for typical season
**Scale/Scope**: ~10 new API endpoints, 3 new database models, 5-8 frontend components, support 500+ active pairs across all categories

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Specification-Driven Development ✅
- ✅ Complete specification exists at `spec.md`
- ✅ User stories with clear priorities (P1-P4)
- ✅ 28 functional requirements with unique identifiers (FR-001 through FR-028)
- ✅ 9 success criteria that are measurable and technology-agnostic
- ✅ 7 edge cases documented

### II. Incremental Delivery ✅
- ✅ Feature decomposed into 4 independently testable user stories
- ✅ P1 (pair registration) delivers standalone MVP value
- ✅ P2 (lifecycle and rankings) builds on P1
- ✅ P3 (seeding) builds on P2
- ✅ P4 (organizer overrides) is independent enhancement
- ✅ Each story has clear acceptance scenarios and can be validated independently

### III. Design Before Implementation ✅
- ✅ Plan will produce: research.md, data-model.md, contracts/, quickstart.md
- ⏳ Tasks.md will NOT be generated until design artifacts are reviewed (enforced by workflow)

### IV. Test Accountability ⚠️
- ⚠️ Tests NOT explicitly requested in feature specification → Tests are OPTIONAL per constitution
- Note: Will follow existing project pattern (Vitest available if tests are added later)

### V. Constitution Compliance ✅
- ✅ No violations requiring justification
- ✅ Following standard web application pattern (backend + frontend)
- ✅ All principles adhered to

**GATE STATUS**: ✅ **PASSED** - Proceeding to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/006-doubles-pairs/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── api-endpoints.md # REST API contract
│   └── data-contracts.md # Request/response schemas
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   ├── schema.prisma    # Add DoublesPair, PairRanking models
│   └── seed.js          # Add doubles pair test data
├── src/
│   ├── models/          # No changes (Prisma generates models)
│   ├── services/
│   │   ├── pairService.js         # NEW: Pair lifecycle, validation, seeding
│   │   ├── pairRankingService.js  # NEW: Pair ranking calculations
│   │   └── tournamentService.js   # MODIFY: Support pair registration
│   └── api/
│       ├── routes/
│       │   └── pairRoutes.js      # NEW: Pair endpoints
│       └── pairController.js      # NEW: HTTP handlers for pairs
└── tests/
    └── integration/
        └── pair.test.js   # NEW: Pair registration, lifecycle tests (optional per constitution)

frontend/
├── src/
│   ├── components/
│   │   ├── PairSelector.jsx       # NEW: UI for selecting 2 players
│   │   ├── PairRankingDisplay.jsx # NEW: Show pair + individual rankings
│   │   └── TournamentRegistrationPage.jsx # MODIFY: Support doubles
│   ├── pages/
│   │   ├── DoublesRegistrationPage.jsx    # NEW: Doubles tournament registration
│   │   └── PairRankingsPage.jsx           # NEW: Category pair rankings view
│   └── services/
│       └── pairService.js         # NEW: API client for pair operations
└── tests/
    └── components/
        └── PairSelector.test.jsx  # NEW: Component tests (optional)
```

**Structure Decision**: Web application structure selected based on existing backend/ and frontend/ directories. Doubles pair functionality integrates with existing tournament and ranking systems. New models extend Prisma schema, new services handle pair-specific business logic, new API endpoints follow existing RESTful patterns at `/api/v1/pairs`. Frontend components integrate with existing tournament registration flows using React Bootstrap UI patterns.

## Complexity Tracking

*No constitution violations requiring justification. This feature follows established patterns.*

