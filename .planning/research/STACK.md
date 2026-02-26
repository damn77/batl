# Stack Research

**Domain:** Amateur tennis league tournament management — match result submission, tournament lifecycle, group/Swiss pairing
**Researched:** 2026-02-26
**Confidence:** HIGH (extending a well-established stack; 11 features already define the technology choices)

---

## Existing Stack (Do Not Change)

The stack is locked by 11 delivered features. New features extend it.

| Layer | Technology | Version |
|-------|------------|---------|
| Runtime | Node.js (ES Modules) | 20+ |
| Framework | Express | 5.1.0 |
| ORM | Prisma | current |
| Database | PostgreSQL | current |
| Frontend | React | 19 |
| Build | Vite | 7 |
| UI | React Bootstrap | 2.10 |
| Tables | TanStack React Table | 8.21 |
| Auth | Passport.js (local) + CASL | current |
| Validation | Joi | 18.x |
| Testing (BE) | Jest | 30.2.0 |
| Testing (FE) | Vitest | current |
| Randomization | seedrandom | 3.0.5+ |

---

## New Additions Required

### 1. Swiss System Pairing — `tournament-pairings` (HIGH CONFIDENCE)

**Recommendation:** Use `tournament-pairings` npm package for Swiss pairing logic.

- **Why:** Swiss pairing is non-trivial (maximum weight matching to avoid rematches, pair by score). Purpose-built library prevents algorithmic mistakes.
- **Version:** 2.0.x (actively maintained)
- **Confidence:** HIGH — well-established library for this exact use case
- **Alternative:** Implement manually using score-difference sorting + rematch avoidance. Only if library proves incompatible with ES Modules. Higher risk.

```bash
npm install tournament-pairings
```

### 2. Score Validation — Joi Custom Patterns (EXISTING STACK)

**Recommendation:** Extend Joi (already in use) with regex patterns for format-aware score validation.

- Tennis set score: `/^\d+:\d+$/` (e.g. `6:4`, `7:5`, `7:6`)
- Tiebreak-only format: single score like `10:8`
- Format rules drive which scores are valid (from tournament rules, Feature 004)
- **No new library needed** — Joi `.pattern()` and `.custom()` cover this

### 3. Data Fetching / Polling (Frontend) — SWR 2.4.x (MEDIUM CONFIDENCE)

**Recommendation:** Add SWR for live tournament view polling during active tournaments.

- **Why:** During IN_PROGRESS tournaments, organizer and players refresh to see new results. SWR provides stale-while-revalidate with configurable refresh intervals. Avoids WebSockets complexity.
- **Version:** 2.4.0
- **Polling interval:** 30s default during active tournaments; disabled when tournament COMPLETED
- **Confidence:** MEDIUM — works well but could also use React Query (TanStack Query). SWR is simpler.
- **Alternative:** TanStack Query 5.x — more powerful, heavier. Not worth switching if SWR meets needs.
- **Do NOT use:** WebSockets / Server-Sent Events — overkill for amateur league with low-frequency result updates

```bash
npm install swr
```

### 4. Group Standings Calculation — Backend Service (NO NEW LIBRARY)

**Recommendation:** Implement group standings as a pure service function in `groupStandingsService.js`.

- Tiebreaker hierarchy: wins → head-to-head record → sets percentage → games percentage → alphabetical
- Stored as aggregated columns updated on result confirmation (not recalculated on every read)
- **No new library** — pure JavaScript with Prisma queries

---

## What NOT to Use

| Technology | Reason to Skip |
|------------|----------------|
| WebSockets / Socket.io | Amateur league doesn't need real-time; 30s polling is sufficient and far simpler |
| Redis | No caching infrastructure needed for this scale |
| GraphQL | REST API is already established; switching adds migration cost with no benefit |
| React Query (over SWR) | Both work; SWR is simpler for this use case |
| pg directly | Prisma is established; bypass only for complex GROUP BY queries if needed |
| Full-text search (Elasticsearch) | Player search via Prisma ILIKE is sufficient |

---

## Confidence Summary

| Decision | Confidence | Risk |
|----------|------------|------|
| Extend existing stack unchanged | HIGH | Low |
| tournament-pairings for Swiss | HIGH | Low |
| Joi for score validation | HIGH | None |
| SWR for polling | MEDIUM | Low — easy to swap |
| No WebSockets | HIGH | None |
