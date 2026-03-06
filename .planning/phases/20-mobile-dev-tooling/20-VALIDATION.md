---
phase: 20
slug: mobile-dev-tooling
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (frontend) |
| **Config file** | frontend/vite.config.js (implicit) |
| **Quick run command** | `cd frontend && npx vitest run` |
| **Full suite command** | `cd frontend && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run`
- **After every plan wave:** Run `cd frontend && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | TOOL-01 | manual-only | N/A | N/A | ⬜ pending |
| 20-01-02 | 01 | 1 | TOOL-01 | manual-only | N/A | N/A | ⬜ pending |
| 20-01-03 | 01 | 1 | TOOL-02 | manual-only | N/A | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| QR code printed in terminal on `dev:mobile` | TOOL-01 | Terminal output, not DOM — cannot be asserted in Vitest | Run `npm run dev:mobile` in frontend/, verify QR code appears in terminal output |
| App accessible on mobile via QR scan | TOOL-01 | Requires physical device on local network | Scan QR code with phone camera, verify app loads within 30 seconds |
| Vite dev server reachable from network | TOOL-02 | Requires separate device on same network | Open network URL from another device browser, verify app loads |
| viewport-fit=cover in meta tag | N/A (success criteria) | One-line HTML change, verify via DevTools | Inspect `<meta name="viewport">` in browser DevTools, confirm `viewport-fit=cover` present |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (N/A — all manual phase)
- [x] Wave 0 covers all MISSING references (N/A — no automated tests needed)
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
