---
phase: 16-admin-access-parity
plan: "01"
subsystem: frontend-auth + backend-routes
tags: [admin, rbac, protected-route, seeding, auth-middleware]
dependency_graph:
  requires: []
  provides: [admin-superuser-bypass, secured-seeding-endpoint]
  affects: [frontend/src/components/ProtectedRoute.jsx, frontend/src/App.jsx, backend/src/api/routes/seedingPlacementRoutes.js]
tech_stack:
  added: []
  patterns: [ADMIN early-exit before role checks, isAuthenticated + authorize middleware chain]
key_files:
  modified:
    - frontend/src/components/ProtectedRoute.jsx
    - frontend/src/App.jsx
    - backend/src/api/routes/seedingPlacementRoutes.js
decisions:
  - "ADMIN early-exit placed after isAuthenticated check but before role checks — preserves redirect to login for unauthenticated users"
  - "All 6 organizer routes simplified from requiredRoles array to requiredRole singular — ADMIN bypass in ProtectedRoute makes arrays unnecessary"
  - "seedingPlacementRoutes uses authorize('create', 'Tournament') — CASL already grants ADMIN can('manage','all') so no special ADMIN case needed"
metrics:
  duration: "2m"
  completed: "2026-03-04"
  tasks: 2
  files_modified: 3
---

# Phase 16 Plan 01: Admin Access Parity — Frontend ProtectedRoute + Backend Auth Summary

ADMIN superuser bypass added to ProtectedRoute and all 6 organizer routes simplified from `requiredRoles` arrays to singular `requiredRole="ORGANIZER"`, plus POST `/api/v1/seeding/generate-bracket` secured with `isAuthenticated` + `authorize('create', 'Tournament')` middleware.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | ProtectedRoute ADMIN superuser bypass and App.jsx route simplification | 56624d8 | ProtectedRoute.jsx, App.jsx |
| 2 | Secure seeding generate-bracket endpoint with auth middleware | 35b454c | seedingPlacementRoutes.js |

## What Was Built

### Task 1: ProtectedRoute ADMIN bypass + App.jsx simplification

Added a three-line early-exit block in `ProtectedRoute.jsx` positioned after the `isAuthenticated` check but before the role checks:

```jsx
// ADMIN is superuser — bypasses all role-based route restrictions
if (user?.role === 'ADMIN') {
  return children;
}
```

This means any `requiredRole` or `requiredRoles` check is skipped entirely when the logged-in user is ADMIN. The backend CASL layer already grants ADMIN `can('manage', 'all')`, so the frontend now matches that authorization model.

In `App.jsx`, 6 routes that previously used `requiredRoles={['ORGANIZER', 'ADMIN']}` were simplified to `requiredRole="ORGANIZER"`:
- `/organizer/players`
- `/organizer/players/:id`
- `/organizer/categories`
- `/organizer/tournaments`
- `/organizer/tournament/:id/rules`
- `/organizer/tournament/:id/points`

The `requiredRoles` prop is no longer used anywhere in App.jsx. Zero occurrences confirmed.

### Task 2: Secure seeding endpoint

`POST /api/v1/seeding/generate-bracket` was previously completely unprotected. Added:

```js
import { isAuthenticated } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';

router.post('/generate-bracket', isAuthenticated, authorize('create', 'Tournament'), generateBracket);
```

- Unauthenticated requests now receive 401
- PLAYER role receives 403 (no Tournament create permission in CASL)
- ORGANIZER passes (has `can('create', 'Tournament')`)
- ADMIN passes (has `can('manage', 'all')`)

## Verification Results

1. `grep -c "requiredRoles" frontend/src/App.jsx` → 0
2. `grep "ADMIN" frontend/src/components/ProtectedRoute.jsx` → shows superuser early-exit block
3. `grep "isAuthenticated" backend/src/api/routes/seedingPlacementRoutes.js` → shows import + route middleware
4. `grep "authorize" backend/src/api/routes/seedingPlacementRoutes.js` → shows import + route middleware

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files exist:
- frontend/src/components/ProtectedRoute.jsx — FOUND
- frontend/src/App.jsx — FOUND
- backend/src/api/routes/seedingPlacementRoutes.js — FOUND

Commits exist:
- 56624d8 — feat(16-01): ADMIN superuser bypass in ProtectedRoute and simplify App.jsx routes
- 35b454c — feat(16-01): add auth middleware to seeding generate-bracket endpoint
