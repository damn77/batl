# Implementation Plan: Tournament Category System

**Branch**: `002-category-system` | **Date**: 2025-11-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-category-system/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a comprehensive tournament category system that allows organizers to create categories by combining type (Singles/Doubles), age group (20+ through 80+ in 5-year increments, or All ages), and gender (Men/Women/Mixed). Each tournament belongs to exactly one category, players can register for multiple categories with automatic eligibility validation, and each category maintains independent rankings. The system will extend the existing Prisma data model and Express API to support category management, player registration validation, and category-specific ranking tracking.

## Technical Context

**Language/Version**: Node.js 20+ (ES Modules)
**Primary Dependencies**:
- Express 5.1.0 (web framework)
- Prisma 6.18.0 (ORM)
- Joi 18.0.1 (validation)
- CASL 6.7.3 (authorization)
- Passport.js 0.7.0 (authentication)
- Winston 3.18.3 (logging)
- Helmet 8.1.0 (security)

**Storage**: SQLite via Prisma ORM (development/production-ready)
**Testing**: NEEDS CLARIFICATION (test framework not established - suggest Jest or Mocha for Node.js)
**Target Platform**: Web server (cross-platform via Node.js)
**Project Type**: Web application (backend API + frontend)
**Performance Goals**:
- Category creation: <1 minute completion time (SC-001)
- Rankings update: <5 minutes after tournament results (SC-004)
- Support 20+ concurrent category combinations without degradation (SC-006)

**Constraints**:
- 100% accurate eligibility validation (SC-002, SC-007)
- Zero eligibility violations (SC-007)
- Maintain consistency with existing user management system (001-user-management)

**Scale/Scope**:
- Support 2 category types × 14 age groups × 3 genders = 84 possible category combinations
- Multiple tournaments per category
- Multiple player registrations per category
- Independent ranking system per category

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Specification-Driven Development
**Status**: ✅ PASS
- Complete specification exists at [spec.md](./spec.md)
- Includes 5 prioritized user stories (P1: 2, P2: 2, P3: 1)
- 20 functional requirements with unique identifiers (FR-001 through FR-020)
- 10 measurable, technology-agnostic success criteria (SC-001 through SC-010)
- 7 edge cases identified
- All sections completed and validated via requirements.md checklist

### II. Incremental Delivery
**Status**: ✅ PASS
- User stories are independently testable with clear acceptance scenarios:
  - **P1** (MVP): Create categories + Assign tournaments to categories
  - **P2** (Enhanced): Validate eligibility + Multi-category registration
  - **P3** (Future): Category-specific rankings
- Each story has:
  - Independent test description
  - Clear acceptance criteria (21 total scenarios across all stories)
  - Standalone value delivery
- Implementation will proceed in priority order: P1 → P2 → P3

### III. Design Before Implementation
**Status**: ✅ PASS (In Progress)
- Planning workflow will produce required artifacts:
  - ✅ research.md: Technical decisions and pattern research (Phase 0)
  - ⏳ data-model.md: Entity definitions and relationships (Phase 1)
  - ⏳ contracts/: API endpoints and schemas (Phase 1)
  - ⏳ quickstart.md: End-to-end usage walkthrough (Phase 1)
- Tasks (tasks.md) will NOT be generated until design artifacts are complete
- This plan.md serves as the master planning document

### IV. Test Accountability
**Status**: ✅ PASS (Optional)
- Tests are NOT explicitly requested in feature specification
- Per constitution: "When tests are NOT requested in the specification, they are OPTIONAL"
- Test framework selection (Jest/Mocha) documented in Technical Context as NEEDS CLARIFICATION
- If tests are added later, they will follow TDD principles

### V. Constitution Compliance
**Status**: ✅ PASS
- No constitution violations detected
- Following standard workflow: specify → plan → tasks → implement
- No complexity tracking needed (Complexity Tracking section remains empty)
- All design artifacts will be completed before task generation

**Overall Gate Status**: ✅ **PASS** - Proceed to Phase 0 Research

---

## Constitution Check (Re-validation After Phase 1)

*Re-validated: 2025-11-01 after Phase 0 & Phase 1 completion*

### III. Design Before Implementation (RE-CHECK)
**Status**: ✅ PASS (Completed)
- Phase 0 artifacts produced:
  - ✅ research.md: Technical decisions (Jest, React+Vite, data patterns, integration points)/ana
- Phase 1 artifacts produced:
  - ✅ data-model.md: Complete Prisma schema with 4 models, 5 enums, relationships
  - ✅ contracts/: 4 API contracts (category, registration, ranking, tournament)
  - ✅ quickstart.md: End-to-end workflows for all user stories (P1, P2, P3)
- All design artifacts reviewed and complete
- Ready for task generation (`/speckit.tasks`)

### Overall Re-validation
**Status**: ✅ **ALL GATES PASS**

All constitution principles satisfied:
- ✅ Specification-driven (complete spec with 20 FRs, 10 SCs)
- ✅ Incremental delivery (5 prioritized user stories)
- ✅ Design before implementation (all artifacts complete)
- ✅ Test accountability (optional, framework selected: Jest)
- ✅ Constitution compliance (no violations)

**Next Step**: Run `/speckit.tasks` to generate implementation task list

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
├── prisma/
│   ├── schema.prisma           # Extended with category models
│   ├── migrations/             # Category system migrations
│   └── seed.js                 # Updated with category seed data
├── src/
│   ├── api/
│   │   ├── categoryController.js      # NEW: Category CRUD operations
│   │   ├── tournamentController.js    # NEW: Tournament-category operations
│   │   ├── registrationController.js  # NEW: Player registration validation
│   │   └── routes/
│   │       ├── categoryRoutes.js      # NEW: Category endpoints
│   │       ├── tournamentRoutes.js    # NEW: Tournament endpoints
│   │       └── registrationRoutes.js  # NEW: Registration endpoints
│   ├── middleware/
│   │   ├── auth.js                    # EXISTING: Reuse authentication
│   │   ├── authorize.js               # EXISTING: Reuse authorization
│   │   └── validate.js                # EXISTING: Reuse validation
│   ├── services/
│   │   ├── categoryService.js         # NEW: Category business logic
│   │   ├── tournamentService.js       # NEW: Tournament management
│   │   ├── registrationService.js     # NEW: Eligibility validation logic
│   │   └── rankingService.js          # NEW: Category-specific rankings
│   └── index.js                       # EXTEND: Register new routes
└── package.json                       # No new dependencies needed

frontend/
├── src/
│   ├── components/
│   │   ├── categories/                # NEW: Category UI components
│   │   ├── tournaments/               # NEW: Tournament UI components
│   │   └── registrations/             # NEW: Registration UI components
│   ├── pages/
│   │   ├── CategoryManagement.jsx     # NEW: Category CRUD interface
│   │   ├── TournamentSetup.jsx        # NEW: Tournament-category assignment
│   │   └── PlayerRegistration.jsx     # NEW: Multi-category registration
│   └── services/
│       ├── categoryService.js         # NEW: Category API client
│       └── registrationService.js     # NEW: Registration API client
└── package.json                       # Frontend dependencies TBD
```

**Structure Decision**: Web application architecture (backend API + frontend) following the established pattern from 001-user-management. The category system extends the existing backend structure with new controllers, services, and routes while reusing authentication, authorization, and validation middleware. Frontend structure TBD based on framework choice (to be determined in Phase 0 research).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
