---
phase: 21
slug: navigation-fix
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (frontend) — established project standard |
| **Config file** | None detected for frontend; Vitest runs via `vite` integration |
| **Quick run command** | `cd frontend && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd frontend && npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Manual browser check on mobile via `npm run dev:mobile` QR code
- **After every plan wave:** Manual verification of all 3 NAV requirements on mobile device
- **Before `/gsd:verify-work`:** All NAV requirements pass manual verification on real device
- **Max feedback latency:** 30 seconds (page reload on mobile)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 21-01-01 | 01 | 1 | NAV-01 | manual-only | n/a — requires mobile viewport | ❌ manual | ⬜ pending |
| 21-01-02 | 01 | 1 | NAV-02 | manual-only | n/a — requires interaction testing | ❌ manual | ⬜ pending |
| 21-01-03 | 01 | 1 | NAV-03 | manual-only | n/a — requires role-based rendering | ❌ manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

No automated tests required or expected for this phase. All three navigation requirements are interaction/visual requirements best validated manually on a mobile device via the Phase 20 QR code dev server.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hamburger opens offcanvas drawer | NAV-01 | Requires real mobile browser viewport and touch interaction | Tap hamburger icon on mobile; verify slide-in drawer opens |
| Nav link closes drawer and navigates | NAV-02 | Requires collapseOnSelect + router navigation in browser | Tap any menu item; verify drawer closes and page navigates |
| Role-gated links render correctly | NAV-03 | Requires auth context with different roles | Log in as admin/organizer/player; verify correct links appear in drawer |
| Desktop nav unchanged | NAV-01 | Visual regression check at lg+ breakpoint | View on desktop; verify standard navbar renders normally |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: manual verification after each task
- [x] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [x] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
