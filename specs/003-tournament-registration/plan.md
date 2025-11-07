# Implementation Plan: Tournament Registration & Enhanced Tournament Management

**Branch**: `003-tournament-registration` | **Date**: 2025-11-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-tournament-registration/spec.md`

## Summary

This feature implements tournament registration with automatic category enrollment, smart waitlist management, and enhanced tournament details. Players can register for tournaments and be automatically enrolled in the tournament's category if not already registered. When tournaments reach capacity, players are added to a waitlist with automatic promotion when spots become available. Organizers can manually manage waitlists and configure display preferences. The feature extends the existing Tournament model from 002-category-system with comprehensive logistical fields (location, capacity, organizer contacts, entry costs).

## Technical Context

**Language/Version**: Node.js 20+ (ES Modules)
**Primary Dependencies**: Express 5.1.0, Prisma ORM, React 19, React Bootstrap 2.10, Vite 7
**Storage**: SQLite via Prisma ORM (production-ready for development and deployment)
**Testing**: NEEDS CLARIFICATION - no testing framework defined yet in project
**Target Platform**: Web application (backend API + frontend SPA)
**Project Type**: Web (backend + frontend)
**Performance Goals**: Handle 50+ simultaneous tournaments, auto-promote waitlisted players within 5 seconds
**Constraints**: Registration operations complete in < 30 seconds, tournament updates visible within 1 minute
**Scale/Scope**: 54 functional requirements, 6 user stories, 9 acceptance scenarios for waitlist (including anti-spam protection), 4 new/extended database models

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Specification-Driven Development ✅ PASS
- [x] Complete specification exists ([spec.md](spec.md))
- [x] User stories with clear priorities (P1, P2, P3) - 6 stories total
- [x] Functional requirements with unique identifiers (FR-001 through FR-054)
- [x] Success criteria measurable and technology-agnostic (14 criteria)
- [x] Edge cases documented (15 cases identified and addressed including anti-spam protection)

### Principle II: Incremental Delivery ✅ PASS
- [x] Features decomposed into 6 independently testable user stories
- [x] Each story can be implemented, tested, and deployed independently:
  - P1: Register with Auto-Category (core registration flow)
  - P1: Unregister with Smart Cleanup (core withdrawal flow)
  - P2: Create Tournament with Enhanced Details (logistics)
  - P2: Manage Tournament Lifecycle (updates/cancellation)
  - P2: Waitlist Management (capacity handling)
  - P3: View Participants and Manage Capacity (reporting)
- [x] Priority order defined: P1 (MVP) → P2 (Enhanced) → P3 (Future)
- [x] Each story delivers standalone value

### Principle III: Design Before Implementation ✅ PASS
- [x] research.md: ✅ Complete
- [x] data-model.md: ✅ Complete
- [x] contracts/: ✅ Complete
- [x] quickstart.md: ✅ Complete
- [x] tasks.md: ✅ Complete

### Principle IV: Test Accountability ✅ PASS (OPTIONAL)
- Tests NOT explicitly requested in feature specification
- Therefore tests are OPTIONAL per constitution
- Testing strategy to be determined during research phase

### Principle V: Constitution Compliance ✅ PASS
- No violations detected
- All principles being followed as written
- No justifications needed in Complexity Tracking section

**GATE STATUS**: ✅ **PASSED** - Proceeding to Phase 0 research

## Project Structure

### Documentation (this feature)

```text
specs/003-tournament-registration/
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
│   ├── schema.prisma           # Extended Tournament model + new TournamentRegistration model
│   └── migrations/             # New migration for tournament registration tables
├── src/
│   ├── models/                 # (if needed - Prisma handles most model logic)
│   ├── services/
│   │   ├── tournamentRegistrationService.js  # NEW: Registration logic + waitlist automation
│   │   ├── tournamentService.js              # EXTENDED: Enhanced tournament CRUD
│   │   └── categoryService.js                # EXTENDED: Auto-category registration integration
│   ├── api/
│   │   ├── tournamentController.js           # EXTENDED: Additional endpoints
│   │   ├── registrationController.js         # NEW: Tournament registration endpoints
│   │   └── routes/
│   │       ├── tournamentRoutes.js           # EXTENDED: Enhanced tournament routes
│   │       └── registrationRoutes.js         # NEW: Registration routes
│   └── middleware/
│       └── validate.js                       # EXTENDED: New validation schemas
└── tests/                                     # NEEDS CLARIFICATION: Testing strategy

frontend/
├── src/
│   ├── services/
│   │   ├── tournamentService.js              # EXTENDED: Enhanced tournament API client
│   │   └── tournamentRegistrationService.js  # NEW: Registration API client
│   ├── pages/
│   │   ├── TournamentSetupPage.jsx          # EXTENDED: Enhanced tournament creation form
│   │   ├── TournamentRegistrationPage.jsx   # NEW: Player registration interface
│   │   └── TournamentDetailPage.jsx         # NEW: View participants, manage waitlist
│   └── components/
│       ├── WaitlistManagementModal.jsx      # NEW: Organizer waitlist promotion UI
│       └── RegistrationStatusBadge.jsx      # NEW: Display registration status
└── tests/                                     # NEEDS CLARIFICATION: Testing strategy
```

**Structure Decision**: Web application structure with backend API and frontend SPA. This feature extends existing backend services and controllers from 002-category-system while adding new registration-specific modules. Frontend adds new pages for registration management and waitlist handling.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No violations - this section intentionally left empty.*
