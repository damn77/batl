# Coding Conventions

**Analysis Date:** 2026-02-26

## Naming Patterns

**Files:**
- **Controllers:** `{entity}Controller.js` - e.g., `categoryController.js`, `authController.js`
- **Routes:** `{entity}Routes.js` - e.g., `authRoutes.js`, `categoryRoutes.js`
- **Services:** `{entity}Service.js` - e.g., `userService.js`, `bracketService.js`
- **Validators:** `{entity}Validator.js` - e.g., `bracketValidator.js`, `seedingValidator.js`
- **React components:** PascalCase `.jsx` files - e.g., `KnockoutBracket.jsx`, `LoginModal.jsx`, `BracketMatch.jsx`
- **React utilities/hooks:** camelCase `.js` files - e.g., `useBracketNavigation.js`, `bracketUtils.js`, `bracketColors.js`
- **Context files:** PascalCase with "Context" suffix - e.g., `AuthContext.jsx`, `ModalContext.jsx`
- **Test files:** Same name as source with `.test.js` suffix - e.g., `bracketService.test.js`

**Functions:**
- camelCase for all functions - e.g., `listCategories()`, `getBracketByPlayerCount()`, `createUser()`
- Event handlers prefixed with `handle` - e.g., `handleSubmit()`, `handleMouseDown()`, `handleWheel()`
- Async functions use standard camelCase - e.g., `createTournamentResult()`, `updateRankingEntry()`
- Service functions use verb + noun pattern - e.g., `findUserByEmail()`, `createUser()`, `updateUser()`, `deleteUser()`

**Variables:**
- camelCase for all variable names - e.g., `playerCount`, `bracketSize`, `isAuthenticated`
- Boolean variables prefixed with `is`, `has`, `can`, `should` - e.g., `isDoubles`, `hasFirstRoundByes`, `canZoomIn`, `shouldShowByes`
- Ref variables suffixed with `Ref` - e.g., `containerRef`, `dragStartRef`, `lastTranslateRef`
- Constants in UPPER_SNAKE_CASE - e.g., `SALT_ROUNDS = 12`, `DEFAULT_SCALE = 1.0`

**Types/Interfaces:**
- PascalCase for component props type definitions
- Props interfaces documented with JSDoc comments
- PropTypes validation used in React components

## Code Style

**Formatting:**
- No automatic formatter enforced (Prettier not configured)
- Consistent 2-space indentation (observed throughout)
- Semicolons used consistently
- Single quotes preferred (observed in imports and strings)
- No trailing commas in imports

**Linting:**
- ESLint configured with `eslint.config.js` (flat config format, ESLint 9.39.1+)
- Rules enforced:
  - `no-unused-vars`: warn with underscore pattern allowed (prefix unused params with `_`)
  - `prefer-const`: warn (use const over let when value not reassigned)
  - `no-var`: error (disallow var, use const/let only)
  - `no-console`: off (console allowed in backend)
- Run linting: `npm run lint` (fixes automatically with --fix)

**Backend (Node.js ES Modules):**
- Type: `"module"` in `package.json`
- All imports use `.js` extension explicitly - e.g., `import auth from './auth.js'`
- ESLint config: `eslint.config.js` (flat config)

**Frontend (React):**
- Import order: External libraries → Internal services → Internal components → Styles
- CSS imports at end of component file
- Component files export default component or named exports as appropriate
- PropTypes validation on all components with props
- Comments above component function define feature/story references - e.g., `// T004: KnockoutBracket Component`

## Import Organization

**Order:**
1. Third-party packages (e.g., `import express from 'express'`)
2. Relative imports from parent services/utils (e.g., `import { someHelper } from '../utils/helper.js'`)
3. Middleware/database imports
4. Route imports (in app entry point)

**Path Aliases:**
- None configured - all imports use relative paths with `.js` extension

**Example - Backend Controller:**
```javascript
import * as categoryService from '../services/categoryService.js';
import { checkEligibility } from '../services/registrationService.js';

export async function listCategories(req, res, next) {
  // handler logic
}
```

**Example - Frontend Component:**
```javascript
import { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../utils/AuthContext';
import { login as loginAPI } from '../services/authService';
import './LoginModal.css';
```

## Error Handling

**Backend Patterns:**
- Centralized error handler: `backend/src/middleware/errorHandler.js`
- Custom error creators for specific scenarios:
  - `createValidationError(field, reason)` - 400 with VALIDATION_ERROR code
  - `createAuthError(message)` - 401 with UNAUTHORIZED code
  - `createForbiddenError(message)` - 403 with FORBIDDEN code
  - `createConflictError(message, field)` - 409 with CONFLICT code
- Error response format (standardized):
```javascript
{
  error: {
    code: "ERROR_CODE",        // VALIDATION_ERROR, UNAUTHORIZED, NOT_FOUND, etc.
    message: "Human readable", // Backend message or from http-errors
    details: { /* optional */ } // Field-level details or violations
  }
}
```

- Success response format:
```javascript
{
  success: true,
  data: { /* response payload */ }
}
```

- Validation using Joi schemas in `src/api/validators/`
- Middleware validates and transforms request data: `validateBody()`, `validateQuery()`, `validateParams()`

**Frontend Patterns:**
- apiClient (`frontend/src/services/apiClient.js`) transforms all axios errors into standardized error objects
- Error structure passed to components:
```javascript
{
  status: 400,           // HTTP status
  code: "VALIDATION_ERROR", // Backend error code
  message: "Human readable",
  details: { violations: [...] } // Additional info
}
```
- Component error handling (CORRECT pattern):
```javascript
catch (err) {
  setError(err.message || t('errors.genericFallback'));
  if (err.details?.violations) {
    // Handle validation violations
  }
}
```
- No raw axios error handling - always use apiClient transformed error

**Async/Await:**
- Preferred over .then() for readability
- Service functions return Promises
- Controllers use async/await with try-catch blocks
- React hooks use async functions inside useEffect or useCallback

## Logging

**Framework:** `console` methods (no dedicated logging library in application code)

**Patterns:**
- Development mode logs API calls in interceptors: `[API] GET /v1/categories`
- Error logging in global error handler with development mode stack traces
- Audit logging via `auditService.logAudit()` for security events (login, logout, etc.)
- No log levels enforced at application level (relies on console methods)

**When to Log:**
- Auth events: successful/failed login, logout (via auditService)
- API requests/responses in development mode (via apiClient interceptors)
- Errors in error handler middleware (status, message, code, details)
- Not recommended: verbose logging in regular service functions (slows performance)

## Comments

**When to Comment:**
- Feature references at component/function top - e.g., `// T004: KnockoutBracket Component`
- Complex algorithms - e.g., seeding placement recursive logic
- Non-obvious business rules - e.g., age calculation using calendar year only
- Migration notes and legacy code explanations - e.g., rankingService has detailed migration comments
- TODO/FIXME for incomplete work (not observed in codebase - discouraged)

**JSDoc/TSDoc:**
- JSDoc style comments used in service functions for documentation:
```javascript
/**
 * Brief description
 * @param {Type} paramName - Parameter description
 * @returns {Promise<Type>} Return type description
 * @throws {Error} When condition occurs
 */
export async function functionName(paramName) {
  // implementation
}
```

- React component PropTypes replace JSDoc for prop documentation:
```javascript
Component.propTypes = {
  match: PropTypes.shape({
    id: PropTypes.string,
    status: PropTypes.string.isRequired
  }).isRequired,
  colors: PropTypes.object
};
```

- Inline comments for complex block logic (e.g., in useBracketNavigation hook explaining zoom math)

## Function Design

**Size:**
- Controllers: 20-50 lines (request validation → service call → response)
- Services: 20-100 lines (business logic with clear separation)
- React components: 50-300 lines (JSX-heavy components may be longer)
- Custom hooks: 100-200 lines (state management + event handlers)

**Parameters:**
- Controllers receive `(req, res, next)` consistently
- Service functions take destructured objects for multiple parameters:
```javascript
export async function createTournamentResult(data) {
  const { tournamentId, rankingEntryId, entityType, ... } = data;
}
```
- React components receive props object (validated with PropTypes)
- Hooks receive options object: `useBracketNavigation({ initialScale, minScale, maxScale, ... })`

**Return Values:**
- Services return Promises (async functions)
- Controllers return HTTP responses via `res.json()` or `res.status().json()`
- React components return JSX
- Hooks return object with state, handlers, and utilities:
```javascript
return {
  // State
  scale, translateX, translateY, isDragging,
  // Actions
  zoomIn, zoomOut, reset,
  // Event handlers
  handleWheel, handleMouseDown, handleMouseMove,
  // Computed values
  canZoomIn, canZoomOut,
  containerStyle
};
```

## Module Design

**Exports:**
- Service files use named exports: `export async function functionName() {}`
- Some services export objects: `export default { func1, func2, func3 }`
- Controllers use named exports for each route handler
- React components use default export: `export default ComponentName`
- Utilities use named exports for reusable functions

**Barrel Files:**
- Not used in this codebase
- Import directly from service files: `import { function } from '../services/bracketService.js'`

**File Organization Within Modules:**
- Service files group related functions (CRUD, calculations, validations)
- Controllers import all related service functions at top
- Middleware organized by concern: `auth.js`, `validate.js`, `errorHandler.js`, `rateLimiter.js`
- Utilities organized by domain: `bracketUtils.js`, `rankingCalculator.js`, `categoryHelpers.js`

## Database & ORM

**Prisma ORM:**
- Client instantiated per service: `const prisma = new PrismaClient()`
- Query patterns: `findUnique()`, `findMany()`, `create()`, `update()`, `delete()`
- Selection optimization with `select` clause to limit fields returned
- Error handling for P2002 (unique constraint) in global error handler

## Configuration

**Environment:**
- `.env` file contains runtime configuration (not committed)
- `dotenv` imported at entry point: `import 'dotenv/config'`
- Variables accessed via `process.env.VARIABLE_NAME`
- Frontend env vars prefixed `VITE_`: `import.meta.env.VITE_API_URL`

**Build:**
- Backend: No build step, runs directly with Node.js
- Frontend: Vite build configured in `vite.config.js`

---

*Convention analysis: 2026-02-26*
