# External Integrations

**Analysis Date:** 2026-02-26

## APIs & External Services

**None Currently Configured**

The system is self-contained and does not integrate with external APIs. However, infrastructure exists for future integrations:

**SMTP Configuration (Placeholder):**
- Email capability is configured but not yet implemented
- Environment variables exist: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- Password reset functionality would require SMTP implementation
- Currently unused in authentication flows

## Data Storage

**Databases:**
- PostgreSQL (primary production database)
  - Connection: `DATABASE_URL` environment variable
  - Client: Prisma ORM 6.18.0+ via @prisma/client 6.19.2
  - Schema: `backend/prisma/schema.prisma`
  - Migrations: `backend/prisma/migrations/` directory
  - Seeding: `backend/prisma/seed.js` script

**File Storage:**
- Local filesystem only (no cloud storage integration)
  - Session storage: `backend/sessions/` directory (session-file-store)
  - Log files: `backend/logs/` directory (error.log, combined.log via winston)
  - Static bracket templates: `docs/bracket-templates-all.json` (read-only, no write operations)

**Caching:**
- In-memory cache only (Point Table cache in `backend/src/services/pointTableService.js`)
- Session cache via express-session with file-based store
- SWR (stale-while-revalidate) on frontend for data fetching

## Authentication & Identity

**Auth Provider:**
- Custom implementation (no third-party auth service)

**Implementation Details:**
- Strategy: Passport.js local strategy (email/password)
- Password hashing: bcryptjs 3.0.2 (no plaintext storage)
- Session management: express-session with file-based store (session-file-store)
  - TTL: 30 minutes
  - Secure cookies in production (HTTPS only)
  - HttpOnly flag enabled
  - SameSite: lax (development), none (production)
- Session secret: `SESSION_SECRET` environment variable (32+ character requirement enforced)

**Role-Based Access Control (RBAC):**
- Framework: @casl/ability 6.7.3
- Roles: ADMIN, ORGANIZER, PLAYER
- Authorization middleware: `backend/src/middleware/authorize.js`
- Permission checks: Per-endpoint validation in route handlers

## Monitoring & Observability

**Error Tracking:**
- None (no external service like Sentry)
- File-based error logging via winston to `backend/logs/error.log`

**Logs:**
- Winston 3.18.3 logging framework
  - Format: JSON with timestamps and error stacks
  - Transports:
    - File: `logs/error.log` (errors only)
    - File: `logs/combined.log` (all levels)
    - Console (development only, with colorization)
  - Level: Configurable via `LOG_LEVEL` environment variable (default: info)
- Audit logging: Detailed audit trail in database via `backend/src/services/auditService.js`
  - Tracked actions: LOGIN, LOGOUT, USER_CREATED, USER_UPDATED, PASSWORD_RESET, etc.
  - AuditLog model stores: userId, action, entityType, entityId, changes, ipAddress, userAgent, timestamp

**Frontend Console Logging:**
- Development: axios request/response logging at `frontend/src/services/apiClient.js`
  - Logs: HTTP method, URL, response data, errors
  - Disabled in production

## CI/CD & Deployment

**Hosting:**
- Backend: Node.js server (Express)
  - Deployment target: Any Node.js 20+ runtime (Render, Heroku, AWS, DigitalOcean, etc.)
  - Environment: `NODE_ENV` controls behavior (development vs production)
  - Health check: GET `/api/health` endpoint returns {status, timestamp, version}

- Frontend: Static build (Vite)
  - Build command: `npm run build` produces `dist/` directory
  - Deployment target: CDN or static hosting (Vercel, Netlify, S3, etc.)
  - Environment: `VITE_API_URL` for production API endpoint

**CI Pipeline:**
- None configured (no GitHub Actions, GitLab CI, or equivalent)
- Test infrastructure available: Jest 30.2.0 with npm test, npm run test:watch, npm run test:coverage

## Environment Configuration

**Required Environment Variables:**

**Backend (`backend/.env` or `.env.example`):**
- `NODE_ENV` - development/production (default: development)
- `PORT` - HTTP server port (default: 3000)
- `DATABASE_URL` - PostgreSQL connection string (required)
  - Format: `postgresql://user:password@host:port/database`
- `SESSION_SECRET` - Secret for session signing (minimum 32 characters, required)
- `FRONTEND_URL` - CORS whitelist for frontend origin (required in production)
  - Example: `http://localhost:3001` (dev), `https://app.example.com` (production)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email service (placeholder, optional)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` - Seed script admin user (optional for development)
- `LOG_LEVEL` - Winston logging level (default: info)

**Frontend (`frontend/.env` or `.env.local`):**
- `VITE_API_URL` - Production API endpoint (optional, uses relative `/api` in development)
  - Example: `https://api.example.com` (production)

**Secrets Location:**
- Backend: `.env` file (gitignored, never committed)
  - Template: `.env.example` included in repo
- Frontend: `.env` or `.env.local` file (gitignored)
  - Vite automatically loads environment variables with `VITE_` prefix

## Webhooks & Callbacks

**Incoming:**
- None configured (no external services pushing events)

**Outgoing:**
- None configured (no event delivery to external systems)

**Event Listeners (Internal):**
- Session expiration event: Frontend detects 401 response and dispatches `session-expired` event
  - Listener pattern: `window.dispatchEvent(new CustomEvent('session-expired'))`
  - Used in: `frontend/src/services/apiClient.js` response interceptor

## API Client Integration

**Frontend API Consumption:**
- All API calls through custom axios wrapper at `frontend/src/services/apiClient.js`
  - Base URL: `getBaseURL()` returns `VITE_API_URL` or relative `/api`
  - Credentials: `withCredentials: true` for session cookies
  - Timeout: 10 seconds
  - Error transformation: Standardized error object with status, code, message, details

**Service Modules:**
- `frontend/src/services/apiClient.js` - Base axios configuration and interceptors
- `frontend/src/services/authService.js` - Authentication endpoints
- `frontend/src/services/categoryService.js` - Category CRUD
- `frontend/src/services/tournamentService.js` - Tournament CRUD
- `frontend/src/services/registrationService.js` - Player registration
- `frontend/src/services/rankingService.js` - Ranking queries and management
- `frontend/src/services/seedingService.js` - Seeding score retrieval
- `frontend/src/services/pairService.js` - Doubles pair management
- `frontend/src/services/pointTableService.js` - Point table configuration
- `frontend/src/services/playerService.js` - Player profile endpoints
- `frontend/src/services/userService.js` - User management
- `frontend/src/services/tournamentRegistrationService.js` - Tournament registration
- `frontend/src/services/tournamentViewService.js` - Tournament data fetching with SWR
- `frontend/src/services/tournamentRulesService.js` - Tournament rules endpoints

**Backend API Routes:**
- Authentication: `/api/auth` at `backend/src/api/routes/authRoutes.js`
- Users: `/api/users` at `backend/src/api/routes/userRoutes.js`
- Players: `/api/players` at `backend/src/api/routes/playerRoutes.js`
- Categories: `/api/v1/categories` at `backend/src/api/routes/categoryRoutes.js`
- Tournaments: `/api/v1/tournaments` at `backend/src/api/routes/tournamentRoutes.js`
- Registrations: `/api/v1/registrations` at `backend/src/api/routes/registrationRoutes.js`
- Rankings: `/api/v1/rankings` at `backend/src/api/routes/rankingRoutes.js`
- Seeding Scores: `/api/v1/seeding-score` at `backend/src/api/routes/seedingRoutes.js`
- Seeding Placement: `/api/v1/seeding` at `backend/src/api/routes/seedingPlacementRoutes.js`
- Bracket Templates: `/api/v1/brackets` at `backend/src/api/routes/bracketRoutes.js`
- Bracket Rules: `/api/v1/brackets` at `backend/src/api/routes/bracketRulesRouter.js`
- Point Tables: `/api/v1/admin/point-tables` at `backend/src/api/routes/pointTableRoutes.js`
- Tournament Registration: `/api/tournaments` at `backend/src/api/routes/tournamentRegistrationRoutes.js`
- Tournament Rules: `/api/v1/tournament-rules`, `/api/v1/match-rules`, `/api/v1/groups`, `/api/v1/rounds`, `/api/v1/matches`
- Pairs: `/api/v1/pairs` at `backend/src/api/routes/pairRoutes.js`

---

*Integration audit: 2026-02-26*
