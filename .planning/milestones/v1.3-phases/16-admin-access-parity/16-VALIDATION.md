---
phase: 16
slug: admin-access-parity
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (frontend) / Jest (backend) |
| **Config file** | `frontend/vite.config.js` (Vitest embedded) / `backend/jest.config.js` |
| **Quick run command** | `cd backend && npm test -- --testPathPattern=seedingRoutes` |
| **Full suite command** | `cd backend && npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npm test -- --testPathPattern=seedingRoutes`
- **After every plan wave:** Run `cd backend && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | ADMIN-01 | integration | `cd backend && npm test -- --testPathPattern=seedingRoutes` | ✅ | ⬜ pending |
| 16-01-02 | 01 | 1 | ADMIN-01 | manual | N/A — frontend route guards | N/A | ⬜ pending |
| 16-01-03 | 01 | 1 | ADMIN-02 | manual | N/A — multi-role navigation | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files or frameworks needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin accesses all organizer routes without 403 | ADMIN-01 | Frontend route guards — no automated React route test infra | Login as admin, navigate to each organizer page, verify no redirect |
| Organizer+Player sees both nav sections | ADMIN-02 | Requires browser-based role combination testing | Login as user with ORGANIZER+PLAYER roles, verify both nav sections visible |
| Admin+Organizer+Player sees all nav sections | ADMIN-02 | Requires browser-based role combination testing | Login as user with all three roles, verify all nav sections visible |
| /player/profile handles missing PlayerProfile | ADMIN-01 | Edge case for admin without linked profile | Login as admin without PlayerProfile, navigate to /player/profile, verify no crash |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
