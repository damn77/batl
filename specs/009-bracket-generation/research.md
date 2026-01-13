# Technical Research: Knockout Bracket Generation

**Feature**: 009-bracket-generation
**Date**: 2026-01-10
**Purpose**: Resolve technical unknowns and document best practices for implementation

## Research Topics

### 1. JSON File Loading Strategy

**Decision**: Use `fs/promises` for async file reading with in-memory caching

**Rationale**:
- Bracket templates are static and immutable (FR-011)
- File is read-only, no writes needed
- 125 entries is small enough to cache entirely in memory
- Async file reading prevents blocking on startup
- Native Node.js module, no external dependencies needed

**Implementation Pattern**:
```javascript
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let bracketCache = null;

async function loadBracketTemplates() {
  if (bracketCache) return bracketCache;

  const filePath = path.join(__dirname, '../../../docs/bracket-templates-all.json');
  const data = await readFile(filePath, 'utf-8');
  bracketCache = JSON.parse(data);
  return bracketCache;
}
```

**Alternatives Considered**:
- Synchronous `fs.readFileSync`: Rejected - blocks event loop on module load
- Database storage: Rejected - unnecessary complexity for static read-only data
- Dynamic require(): Rejected - doesn't work with ES modules

**Error Handling**:
- File missing: Fail fast on application startup with clear error message
- JSON parse error: Fail fast on startup (indicates corrupted templates)
- Cache the error to avoid repeated file access failures

---

### 2. Joi Validation Patterns

**Decision**: Use Joi for request validation with custom error messages

**Rationale**:
- Already used in the codebase (per CLAUDE.md mentions Joi/Zod)
- Expressive schema definition for player count validation
- Built-in range validation for 4-128 constraint
- Clear error messages for API consumers

**Implementation Pattern**:
```javascript
import Joi from 'joi';

const bracketRequestSchema = Joi.object({
  playerCount: Joi.number()
    .integer()
    .min(4)
    .max(128)
    .required()
    .messages({
      'number.base': 'Player count must be a number',
      'number.integer': 'Player count must be an integer',
      'number.min': 'Player count must be at least 4',
      'number.max': 'Player count cannot exceed 128',
      'any.required': 'Player count is required'
    })
});

const seedingRequestSchema = Joi.object({
  playerCount: Joi.number()
    .integer()
    .min(4)
    .max(128)
    .required()
});
```

**Alternatives Considered**:
- Zod: Rejected - Joi already in use, consistency preferred
- Manual validation: Rejected - verbose, error-prone, poor error messages
- Express-validator: Rejected - less expressive than Joi schemas

---

### 3. Express Route Organization

**Decision**: Dedicated router module with controller pattern

**Rationale**:
- Separation of concerns: routes define endpoints, controllers contain logic
- Aligns with existing codebase structure (backend/src/api/routes/)
- Easy to test controllers independently from routing
- Clear mapping of endpoints to business logic

**Implementation Pattern**:
```javascript
// backend/src/api/routes/bracketRoutes.js
import express from 'express';
import { getBracketStructure, getSeedingConfig } from '../controllers/bracketController.js';
import { validateBracketRequest, validateSeedingRequest } from '../validators/bracketValidator.js';

const router = express.Router();

router.get('/structure/:playerCount', validateBracketRequest, getBracketStructure);
router.get('/seeding/:playerCount', validateSeedingRequest, getSeedingConfig);

export default router;
```

**Mounting in app.js**:
```javascript
import bracketRoutes from './api/routes/bracketRoutes.js';
app.use('/api/v1/brackets', bracketRoutes);
```

**Alternatives Considered**:
- Single route file with inline handlers: Rejected - poor separation of concerns
- Controller classes: Rejected - unnecessary OOP overhead for simple logic
- Separate files per endpoint: Rejected - overkill for 2 endpoints

---

### 4. Error Handling Strategy

**Decision**: Consistent error response format following existing API patterns

**Rationale**:
- Per CLAUDE.md, existing API uses `{ success: true/false, data/error: {...} }` format
- Specific error codes for different failure types
- HTTP status codes aligned with error semantics
- Detailed error messages for debugging

**Error Response Format**:
```javascript
{
  success: false,
  error: {
    code: 'INVALID_PLAYER_COUNT' | 'BRACKET_NOT_FOUND' | 'TEMPLATE_LOAD_ERROR',
    message: 'Human-readable error message',
    details: {
      playerCount: 3,
      validRange: { min: 4, max: 128 }
    }
  }
}
```

**HTTP Status Codes**:
- 400 Bad Request: Invalid player count (validation failure)
- 404 Not Found: Template not found for valid player count (shouldn't happen)
- 500 Internal Server Error: Template file load failure
- 200 OK: Successful retrieval

**Error Handling Middleware**:
```javascript
function handleBracketError(err, req, res, next) {
  if (err.isJoi) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PLAYER_COUNT',
        message: err.details[0].message,
        details: { validation: err.details }
      }
    });
  }
  // ... other error types
}
```

**Alternatives Considered**:
- Plain error strings: Rejected - inconsistent with existing API
- HTTP-only error codes: Rejected - less informative for clients
- Exception throwing: Rejected - breaks async flow, prefer explicit error returns

---

### 5. Vitest Testing Strategy

**Decision**: Test-first development with separate unit and integration tests

**Rationale**:
- Constitution requires test-first for explicitly requested tests (FR-012)
- Vitest supports ES modules natively (aligns with Node.js 20+ ES modules)
- Jest-compatible API (easy for developers familiar with Jest)
- Fast execution with native ESM support

**Test Structure**:
```javascript
// tests/unit/bracketService.test.js
import { describe, it, expect, beforeAll } from 'vitest';
import { getBracketByPlayerCount } from '../../backend/src/services/bracketService.js';

describe('bracketService', () => {
  describe('getBracketByPlayerCount', () => {
    it('should return correct bracket structure for 7 players', async () => {
      const result = await getBracketByPlayerCount(7);
      expect(result.structure).toBe('1000');
      expect(result.preliminaryMatches).toBe(3);
      expect(result.byes).toBe(1);
    });

    it('should throw error for player count < 4', async () => {
      await expect(getBracketByPlayerCount(3)).rejects.toThrow();
    });
  });
});
```

**Template Validation Tests** (FR-012):
```javascript
// tests/unit/bracketTemplates.test.js
import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';

describe('Bracket Templates Validation', () => {
  it('should have templates for all player counts 4-128', async () => {
    const templates = await loadTemplates();
    for (let i = 4; i <= 128; i++) {
      expect(templates.find(t => t.key === String(i))).toBeDefined();
    }
  });

  it('should have valid structure format (0s and 1s only)', async () => {
    const templates = await loadTemplates();
    templates.forEach(t => {
      expect(t.value).toMatch(/^[01\s]+$/);
    });
  });
});
```

**Integration Tests**:
```javascript
// tests/integration/bracketRoutes.test.js
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../backend/src/app.js';

describe('GET /api/v1/brackets/structure/:playerCount', () => {
  it('should return 200 with bracket structure', async () => {
    const response = await request(app)
      .get('/api/v1/brackets/structure/7')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.structure).toBe('1000');
  });
});
```

**Alternatives Considered**:
- Jest: Rejected - requires babel/ts-jest for ES modules, added complexity
- Mocha/Chai: Rejected - more setup needed, Vitest is more modern
- No tests: Rejected - violates FR-012 and constitution requirement

---

## Technical Decisions Summary

| Decision Area | Choice | Key Benefit |
|--------------|--------|-------------|
| File Loading | fs/promises + in-memory cache | Fast, simple, no blocking |
| Validation | Joi schemas | Expressive, clear errors |
| Routing | Express router + controller pattern | Separation of concerns |
| Error Handling | Consistent JSON format + error codes | Client-friendly, debuggable |
| Testing | Vitest with test-first approach | Constitution compliance, fast |

## Implementation Sequence

1. **Phase 1A - Service Layer** (Test-first):
   - Write failing tests for bracketService
   - Implement bracketService (file loading, caching, retrieval)
   - Write failing tests for seedingService
   - Implement seedingService (calculation logic)

2. **Phase 1B - API Layer** (Test-first):
   - Write failing integration tests for API endpoints
   - Implement validators (Joi schemas)
   - Implement controllers (business logic)
   - Implement routes (endpoint mapping)

3. **Phase 1C - Template Validation** (Test-first):
   - Write failing tests for template validation (FR-012)
   - Fix any template issues if tests fail
   - Ensure all 125 templates are present and valid

## Dependencies

No new npm packages required:
- `express` - Already in project (5.1.0)
- `joi` - Already in project (validation)
- `vitest` - Already in project (testing)
- `fs/promises` - Node.js built-in
- `path` - Node.js built-in

## Performance Considerations

- **Startup time**: ~1ms to load and parse 125 templates (negligible)
- **Memory usage**: ~10KB for cached templates (negligible)
- **Response time**: <10ms for bracket lookup (in-memory map access)
- **Concurrency**: No file I/O after startup, fully thread-safe

## Security Considerations

- **Input validation**: Joi schemas prevent injection attacks
- **File access**: Read-only from trusted source (docs/ directory)
- **Error messages**: No sensitive information leaked in errors
- **Rate limiting**: Not needed for this feature (read-only, cached data)

## Migration Path

No database migrations needed - this feature is stateless and read-only.

## Rollback Strategy

Simple rollback: Remove routes from app.js and delete service files. No data changes to roll back.

---

**Research Complete**: All technical unknowns resolved. Ready for Phase 1 (Design & Contracts).
