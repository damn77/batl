# Technical Research: User Management System

**Feature**: User Management System for Battle Tennis Tournament Platform
**Date**: 2025-10-30
**Status**: Complete

## Overview

This document captures technical research and decisions for implementing the user management system with email/password authentication, role-based access control, and session management.

---

## 1. Technology Stack Selection

### Decision: Node.js + Express + Prisma + SQLite

**Backend Stack**:
- **Runtime**: Node.js (LTS version recommended: v20.x or v22.x)
- **Web Framework**: Express.js
- **Database**: SQLite (via Prisma ORM)
- **ORM**: Prisma
- **Authentication**: Passport.js (local strategy for email/password)

**Frontend Stack**:
- **Framework**: React
- **UI Library**: Bootstrap
- **State Management**: React Context API (built-in, sufficient for user management)

**Supporting Libraries**:
- **Logging**: Winston
- **Error Handling**: http-errors
- **Request Validation**: Joi
- **Authorization**: CASL (Capability-based access control)
- **Session Storage**: session-file-store (file-based session persistence)
- **Security Headers**: Helmet
- **Rate Limiting**: express-rate-limit

### Rationale

**Language Choice: Node.js**
- Unified JavaScript/TypeScript across frontend and backend reduces context switching
- Excellent ecosystem for web applications with mature libraries
- Strong support for async/await patterns needed for authentication flows
- Large community and extensive documentation
- Fast development cycle suitable for amateur organization constraints

**Framework Choice: Express.js**
- Industry standard for Node.js web applications
- Middleware architecture perfect for authentication/authorization layers
- Extensive ecosystem of security-focused middleware (Helmet, express-rate-limit, Passport.js)
- Lightweight and flexible for iterative development
- Well-documented patterns for REST API development

**Database Choice: SQLite via Prisma**
- SQLite advantages:
  - Zero-configuration database - no separate database server required
  - Perfect for small-to-medium scale (500-1000 users fits well within SQLite capabilities)
  - Single file database simplifies backup and deployment
  - ACID compliant with strong data integrity guarantees
  - Low operational overhead suitable for amateur organization
  - Easy migration path to PostgreSQL/MySQL if scale increases
- Prisma ORM advantages:
  - Type-safe database queries with TypeScript support
  - Automatic migrations and schema management
  - Clean, intuitive API reduces boilerplate
  - Built-in connection pooling
  - Database-agnostic (easy to switch from SQLite to PostgreSQL later)

**Authentication: Passport.js**
- De facto standard for Node.js authentication
- Local strategy perfect for email/password authentication
- Extensible for future OAuth/SSO integration if needed
- Session-based authentication aligns with security requirements
- Well-tested with extensive community support

**Frontend: React + Bootstrap**
- React advantages:
  - Component-based architecture promotes reusability
  - Large ecosystem of libraries and tools
  - Strong community and documentation
  - Gradual learning curve for incremental development
- Bootstrap advantages:
  - Rapid UI development with pre-built components
  - Responsive design out-of-the-box
  - Consistent styling for login, registration, dashboard components
  - Accessibility features built-in

**Authorization: CASL**
- Isomorphic (works on both frontend and backend)
- Permission-based and role-based access control
- Declarative permission definitions
- Can define permissions once and reuse across stack

**Session Storage: session-file-store**
- File-based session persistence appropriate for SQLite deployment model
- Simple setup with no additional infrastructure
- Automatic session cleanup
- Upgrade path to Redis/database sessions if scaling needed

### Alternatives Considered

**Alternative 1: Python + Django**
- Pros: Batteries-included framework, excellent admin interface, strong ORM
- Cons: Requires Python runtime, separate frontend framework needed, heavier framework overhead
- Rejected: Node.js provides better frontend/backend alignment

**Alternative 2: Ruby on Rails**
- Pros: Convention over configuration, rapid development, mature authentication gems
- Cons: Smaller ecosystem than Node.js, requires Ruby runtime, performance concerns at scale
- Rejected: Node.js has stronger async capabilities for concurrent session management

**Alternative 3: PostgreSQL Database**
- Pros: More robust at scale, better concurrent write performance, JSON support
- Cons: Requires separate database server, more complex deployment, operational overhead
- Rejected: SQLite sufficient for current scale (500-1000 users); can migrate later if needed

**Alternative 4: MySQL Database**
- Pros: Industry standard, good performance, wide hosting support
- Cons: Requires separate database server, more complex setup than SQLite
- Rejected: Similar to PostgreSQL - unnecessary complexity for current scale

---

## 2. Authentication & Security Best Practices

### Password Hashing

**Decision**: bcrypt with work factor 12

**Rationale**:
- bcrypt is battle-tested and widely supported in Node.js ecosystem (bcryptjs library)
- Work factor 12 provides strong security (2^12 = 4096 iterations)
- Automatic salt generation per password
- Slower than Argon2id but simpler implementation with fewer dependencies
- Node.js bcrypt library is mature and well-maintained
- Sufficient for amateur organization threat model

**Implementation**:
```javascript
const bcrypt = require('bcryptjs');
const saltRounds = 12;

// Hash password
const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

// Verify password
const isValid = await bcrypt.compare(plainPassword, hashedPassword);
```

**Alternatives Considered**:
- **Argon2id**: More secure but requires native bindings, more complex setup
- **scrypt**: Good security but less ecosystem support in Node.js
- Rejected: bcrypt provides excellent security/simplicity balance for this project

### Session Management

**Decision**: Express-session with file-based storage (session-file-store)

**Rationale**:
- Server-side sessions provide instant revocation capability
- File-based storage aligns with SQLite deployment model (no Redis needed)
- HTTP-only cookies prevent XSS attacks
- Session expiration: 30 minutes idle timeout
- Secure flag enforces HTTPS-only transmission
- SameSite=Strict prevents CSRF attacks

**Implementation**:
```javascript
const session = require('express-session');
const FileStore = require('session-file-store')(session);

app.use(session({
  store: new FileStore({
    path: './sessions',
    ttl: 1800, // 30 minutes
    retries: 0
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // HTTPS only
    httpOnly: true, // Prevent JavaScript access
    maxAge: 1800000, // 30 minutes
    sameSite: 'strict' // CSRF protection
  }
}));
```

**Alternatives Considered**:
- **JWT-only**: No instant revocation, complexity for refresh token rotation
- **Redis sessions**: Requires Redis infrastructure, unnecessary for current scale
- Rejected: File-based sessions sufficient for 100 concurrent users

### Password Reset Flow

**Decision**: Email-based token reset with 1-hour expiration

**Rationale**:
- Generate cryptographically secure 64-character token using crypto.randomBytes
- Hash token with SHA-256 before storing in database
- Store: hashed token, user ID, creation timestamp, expiration (1 hour)
- Single-use token (delete after successful reset)
- Send reset link via email to registered address
- Generic error messages prevent email enumeration

**Implementation Approach**:
```javascript
const crypto = require('crypto');

// Generate reset token
const token = crypto.randomBytes(32).toString('hex');
const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

// Store in database with 1-hour expiration
await db.passwordResetToken.create({
  userId: user.id,
  token: hashedToken,
  expiresAt: new Date(Date.now() + 3600000) // 1 hour
});

// Send email with reset link
const resetLink = `https://battle.example.com/reset-password?token=${token}`;
```

### Account Lockout & Rate Limiting

**Decision**: express-rate-limit with progressive lockout

**Rationale**:
- Limit login attempts to 5 per 15-minute window per IP
- Progressive delays between attempts (1s, 2s, 4s, 8s, 15s)
- No permanent lockouts (prevents DoS on known accounts)
- Rate limit password reset requests (3 per hour per IP)
- CAPTCHA integration possible via express-recaptcha

**Implementation**:
```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

app.post('/api/auth/login', loginLimiter, loginController);
```

### Role-Based Access Control (RBAC)

**Decision**: CASL for declarative permission management

**Rationale**:
- Define permissions once, use on both frontend and backend
- Supports role-based and attribute-based access control
- Middleware integration for Express routes
- Frontend integration for UI element visibility

**Permission Structure**:
```javascript
// Define abilities per role
const defineAbilitiesFor = (role) => {
  const { can, cannot, build } = new AbilityBuilder(Ability);

  switch(role) {
    case 'ADMIN':
      can('manage', 'all'); // Full access
      break;
    case 'ORGANIZER':
      can(['create', 'read', 'update'], 'Tournament');
      can(['create', 'read', 'update'], 'PlayerProfile');
      cannot('delete', 'Tournament');
      break;
    case 'PLAYER':
      can('read', 'Tournament');
      can(['read', 'update'], 'PlayerProfile', { userId: user.id }); // Own profile only
      break;
    case 'PUBLIC':
      can('read', 'Tournament', { isPublic: true });
      can('read', 'Ranking', { isPublic: true });
      break;
  }

  return build();
};
```

### Security Headers

**Decision**: Helmet middleware with default configuration

**Rationale**:
- Helmet automatically sets 15+ security headers
- Prevents XSS, clickjacking, MIME-type confusion
- HSTS enforcement (HTTPS-only)
- Content Security Policy (CSP) for script/style restrictions

**Implementation**:
```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Bootstrap requires inline scripts
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"], // Bootstrap CDN
      imgSrc: ["'self'", "data:"]
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## 3. Database Schema Design Considerations

### Entity Relationships

```
User (accounts for ADMIN, ORGANIZER, PLAYER with accounts)
  ├─→ Role (ADMIN, ORGANIZER, PLAYER)
  ├─→ Session (active authentication sessions)
  └─→ PlayerProfile (optional link for PLAYER role)

PlayerProfile (all tournament participants)
  └─→ User (optional - exists only if player created account)

PasswordResetToken
  └─→ User

AuditLog
  └─→ User (who performed action)
```

### Key Constraints

- **User.email**: UNIQUE, NOT NULL, validated format
- **User.passwordHash**: NOT NULL (except for PlayerProfile without account)
- **User.role**: ENUM('ADMIN', 'ORGANIZER', 'PLAYER'), NOT NULL
- **PlayerProfile.name**: NOT NULL
- **PlayerProfile.userId**: NULLABLE (player may not have account)
- **Session.userId**: Foreign key to User, CASCADE delete
- **PasswordResetToken.expiresAt**: NOT NULL, indexed for cleanup queries

### Data Integrity Rules

1. **Unique Email Constraint**: Prevent duplicate accounts
2. **Cascade Deletes**: When user deleted, cascade to sessions and reset tokens
3. **Preserve Player Data**: When user deleted, preserve PlayerProfile for tournament history
4. **Role Validation**: Ensure role is one of four valid values
5. **Session Expiration**: Automatically delete expired sessions via cleanup job

---

## 4. Performance Optimization Strategy

### Query Optimization

- **Indexed Fields**:
  - User.email (for login queries)
  - Session.userId (for session lookups)
  - Session.expiresAt (for cleanup queries)
  - PlayerProfile.userId (for linking player to account)
  - PasswordResetToken.token (for reset verification)
  - PasswordResetToken.expiresAt (for cleanup queries)

- **Query Patterns**:
  - Use Prisma's `select` to fetch only needed fields
  - Implement pagination for user/player lists
  - Cache role permissions in memory (rarely change)

### Session Management at Scale

- **Current Approach**: File-based sessions sufficient for 100 concurrent users
- **Future Scaling**: Migrate to Redis if exceeding 500 concurrent sessions
- **Session Cleanup**: Scheduled job runs hourly to delete expired sessions
- **Connection Pooling**: Prisma handles connection pooling automatically

### Caching Strategy

- **Static Assets**: Frontend served via CDN or nginx with caching headers
- **Permission Definitions**: Cached in memory, invalidated on role changes
- **Public Data**: Cache public tournament lists/rankings (1-minute TTL)
- **No Cache**: Authentication endpoints, user-specific data

---

## 5. Deployment Architecture

### Application Structure

```
battle/
├── backend/
│   ├── src/
│   │   ├── models/         # Prisma schema
│   │   ├── services/       # Business logic
│   │   ├── api/            # Route handlers
│   │   ├── middleware/     # Auth, error handling
│   │   └── index.js        # Express app entry
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   ├── sessions/           # File-based session storage
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/       # API clients
│   │   └── App.jsx
│   └── package.json
└── data/
    └── battle.db           # SQLite database file
```

### Environment Configuration

**Required Environment Variables**:
- `NODE_ENV`: development | production
- `SESSION_SECRET`: Cryptographically secure random string (min 32 characters)
- `DATABASE_URL`: SQLite file path (e.g., file:./data/battle.db)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: Email server for password resets
- `FRONTEND_URL`: Frontend URL for CORS and email links
- `PORT`: Backend server port (default: 3000)

### Deployment Options

**Option 1: Single-Server Deployment (Recommended for Start)**
- Both frontend and backend on same server
- Frontend served as static files via Express
- SQLite database on local filesystem
- Suitable for up to 1000 concurrent users
- Simple backup strategy (copy database file)

**Option 2: Separated Frontend/Backend (Future Scaling)**
- Frontend on CDN/static hosting (Vercel, Netlify)
- Backend on dedicated server (DigitalOcean, AWS EC2)
- Migrate SQLite to PostgreSQL for better concurrent write performance
- Redis for session storage

---

## 6. Security Checklist

- [x] HTTPS enforced (HSTS headers via Helmet)
- [x] Password hashing (bcrypt with work factor 12)
- [x] HTTP-only session cookies (prevents XSS)
- [x] SameSite=Strict cookies (prevents CSRF)
- [x] Rate limiting on auth endpoints (express-rate-limit)
- [x] Security headers (Helmet middleware)
- [x] Input validation (Joi schemas)
- [x] Generic error messages (prevent enumeration)
- [x] Session expiration (30-minute idle timeout)
- [x] Password reset tokens (1-hour expiration, single-use)
- [x] Audit logging (Winston)
- [x] Role-based access control (CASL)
- [x] SQL injection prevention (Prisma parameterized queries)
- [x] XSS prevention (React escapes by default, CSP headers)

---

## 7. Testing Strategy (Optional per Constitution)

**Note**: Tests are OPTIONAL per Constitution Principle IV as they were not explicitly requested in the specification. If tests are added later:

**Backend Testing**:
- **Unit Tests**: Services, middleware (Jest)
- **Integration Tests**: API endpoints (Supertest + Jest)
- **Contract Tests**: API response schemas (optional)

**Frontend Testing**:
- **Component Tests**: React Testing Library
- **E2E Tests**: Playwright or Cypress (optional)

**Security Testing**:
- **OWASP ZAP**: Automated security scanning
- **npm audit**: Dependency vulnerability scanning
- **Manual Penetration Testing**: Before production deployment

---

## 8. Migration Path for Future Scaling

When Battle platform exceeds current scale (1000+ concurrent users):

1. **Database Migration**:
   - Migrate from SQLite to PostgreSQL
   - Prisma makes this straightforward (change DATABASE_URL and run migration)
   - Benefits: Better concurrent writes, connection pooling, advanced features

2. **Session Storage**:
   - Migrate from file-based to Redis sessions
   - Change session store configuration (minimal code change)
   - Benefits: Distributed sessions, better performance at scale

3. **Caching Layer**:
   - Add Redis for caching frequently accessed data
   - Cache public tournament data, rankings
   - Benefits: Reduced database load, faster response times

4. **Load Balancing**:
   - Add multiple backend instances behind load balancer
   - Shared session storage (Redis) enables horizontal scaling
   - Benefits: Handle more concurrent users, high availability

---

## Summary of Technical Decisions

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Runtime** | Node.js v20+ | JavaScript ecosystem, async/await patterns |
| **Backend Framework** | Express.js | Middleware architecture, security ecosystem |
| **Database** | SQLite via Prisma | Zero-config, appropriate scale, easy migration |
| **ORM** | Prisma | Type-safe, migrations, database-agnostic |
| **Frontend** | React + Bootstrap | Component reusability, rapid UI development |
| **Authentication** | Passport.js (local) | Industry standard, extensible |
| **Password Hashing** | bcrypt (work factor 12) | Battle-tested, automatic salting |
| **Session Management** | express-session + file store | Server-side sessions, instant revocation |
| **Authorization** | CASL | Declarative permissions, isomorphic |
| **Security Headers** | Helmet | Comprehensive header protection |
| **Rate Limiting** | express-rate-limit | Prevent brute-force attacks |
| **Validation** | Joi | Schema-based request validation |
| **Logging** | Winston | Structured logging, multiple transports |
| **Error Handling** | http-errors | Consistent error responses |

All decisions prioritize:
1. **Security**: HTTPS, bcrypt, sessions, rate limiting, RBAC
2. **Simplicity**: SQLite, file-based sessions, monolithic deployment
3. **Scalability**: Clear migration path to PostgreSQL, Redis, load balancing
4. **Developer Experience**: TypeScript support, Prisma, unified JavaScript stack
5. **Operational Simplicity**: Minimal infrastructure suitable for amateur organization

---

**Research Complete**: All NEEDS CLARIFICATION items from Technical Context have been resolved. Proceed to Phase 1: Design & Contracts.
