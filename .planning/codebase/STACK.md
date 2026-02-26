# Technology Stack

**Analysis Date:** 2026-02-26

## Languages

**Primary:**
- JavaScript (ES2022+) - All backend and frontend code
  - Node.js 20+ runtime (ES Modules)
  - React 19 for frontend UI

**SQL:**
- PostgreSQL (production database via Prisma ORM)

## Runtime

**Environment:**
- Node.js 20.0.0+ (required, enforced in `package.json` engines)
  - ES Modules (type: "module" in package.json)
  - Native ECMAScript support (no transpilation needed)

**Package Manager:**
- npm (npm 10.0.0+ recommended for Node.js 20+)
- Lockfiles: `package-lock.json` present for both backend and frontend

## Frameworks

**Backend:**
- Express 5.1.0 - REST API server framework at `backend/src/index.js`
  - Session middleware via express-session
  - Authentication via Passport.js
  - Error handling via custom middleware in `backend/src/middleware/errorHandler.js`

**Frontend:**
- React 19.2.0 - UI component framework
- Vite 7.1.12 - Build tool and dev server
  - Development: Runs on port 3001 with proxy to backend at port 3000
  - Production: Static build output

**UI Components:**
- React Bootstrap 2.10.10 - Bootstrap 5.3.8 integration
- TanStack React Table 8.21.3 - Data table component library at `frontend/src/services/`
- React DatePicker 8.8.0 - Date input component

**Routing:**
- React Router DOM 7.9.5 - Client-side routing for frontend

**Internationalization:**
- i18next 25.6.3 - Translation framework
- i18next-browser-languagedetector 8.2.0 - Auto language detection
- react-i18next 16.3.5 - React integration

**HTTP Client:**
- axios 1.13.2 (both backend and frontend)
  - Custom wrapper: `frontend/src/services/apiClient.js` with error transformation
  - Credentials enabled for session management

## Key Dependencies

**Critical (Backend):**
- @prisma/client 6.19.2 - PostgreSQL ORM
  - Prisma 6.18.0 - Schema and migration tools
  - Schema file: `backend/prisma/schema.prisma`
- @casl/ability 6.7.3 - Role-based access control (RBAC) implementation
- bcryptjs 3.0.2 - Password hashing
- seedrandom 3.0.5 - Deterministic randomization for seeding placement algorithm
- Joi 18.0.1 - Request validation
- Zod 4.1.12 - Alternative validation framework (present but less used)

**Security (Backend):**
- Passport.js 0.7.0 - Authentication middleware
- passport-local 1.0.0 - Local strategy (email/password)
- helmet 8.1.0 - Security headers (CORS, CSP, HSTS configured in `backend/src/index.js`)
- express-rate-limit 8.2.0 - Rate limiting
- session-file-store 1.5.0 - Session persistence (file-based)
- tough-cookie 5.1.2 - Cookie handling
- axios-cookiejar-support 6.0.4 - Cookie support for axios

**Logging (Backend):**
- winston 3.18.3 - Structured logging at `backend/src/services/auditService.js`
  - Transports: File (error.log, combined.log) and console

**Frontend:**
- swr 2.3.6 - Data fetching and caching

## Configuration

**Backend Environment (.env):**
- `NODE_ENV` - development/production
- `PORT` - Server port (default: 3000)
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key (32+ character requirement)
- `FRONTEND_URL` - CORS whitelist origin (e.g., http://localhost:3001)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email configuration (placeholder, not yet implemented)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` - Seed data admin user

**Frontend Environment (.env):**
- `VITE_API_URL` - Production API endpoint (optional, uses relative /api in development)

**Build Configuration:**
- Backend: Node.js direct execution (no build step required)
- Frontend: Vite configuration at `frontend/vite.config.js`
  - Dev proxy: `/api` → `http://localhost:3000`
  - Build output: `dist/` directory

**Validation Configuration:**
- Backend: Joi schemas in `backend/src/api/validators/`
  - bracketValidator.js - Bracket structure validation
  - seedingValidator.js - Seeding request validation
  - pointTableValidators.js - Point configuration validation
  - tournamentPointValidators.js - Tournament point config validation

**Database Configuration:**
- Prisma schema: `backend/prisma/schema.prisma`
  - Models: User, Session, AuditLog, PlayerProfile, Category, Tournament, Organizer, Location, Match, Round, Bracket, Group, DoublesPair, PairRegistration, TournamentRegistration, CategoryRegistration, Ranking, RankingEntry, TournamentResult, PointTable, TournamentPointConfig
  - Migrations stored in: `backend/prisma/migrations/`
  - Seed script: `backend/prisma/seed.js`

## Platform Requirements

**Development:**
- Node.js 20.0.0 or higher
- npm 10.0.0+ (for Node.js 20+)
- PostgreSQL 12+ (local or remote)
- Bash/Unix shell (Windows: WSL2 or Git Bash recommended)

**Production:**
- Node.js 20.0.0 or higher
- PostgreSQL database (cloud-hosted, e.g., Render PostgreSQL or AWS RDS)
- Static hosting for frontend (CDN, S3, Vercel, Netlify, etc.)
- Backend API hosting (Node.js runtime, e.g., Render, Heroku, DigitalOcean)
- CORS configuration for cross-origin requests

**Storage:**
- File-based session storage (development): `backend/sessions/` directory
- File-based logs (both environments): `backend/logs/` directory
- Bracket templates: `docs/bracket-templates-all.json` (read-only, no database persistence)

---

*Stack analysis: 2026-02-26*
