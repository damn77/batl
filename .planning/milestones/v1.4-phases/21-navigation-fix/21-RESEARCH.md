# Phase 21: Navigation Fix - Research

**Researched:** 2026-03-06
**Domain:** React Bootstrap Navbar.Offcanvas, mobile hamburger menu
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Replace raw HTML Bootstrap markup (`data-bs-toggle="collapse"`) with React Bootstrap `Navbar.Offcanvas` and `collapseOnSelect`
- No Bootstrap JS dependency needed
- Backdrop enabled — tapping outside the drawer closes it
- Page scroll locked while drawer is open
- Faster animation (~150ms) instead of default Bootstrap ~300ms for snappier, app-like feel
- Links grouped with small muted section headers (e.g., "Organizer", "Admin") and dividers between groups
- Public links (Rankings, Tournaments) sit at the top of the drawer without a section label
- ADMIN role: collapsible sub-sections for the multiple role groups using React Bootstrap Accordion
- Non-admin roles (ORGANIZER ~5 links, PLAYER ~4 links): sections always expanded, no collapsible behavior needed
- Logged-in: role badge + email + logout button anchored at bottom of drawer (footer area)
- Logged-out: login and register buttons at bottom of drawer (same position, consistent)
- Language switcher moves inside the drawer on mobile (near user info at bottom), keeping navbar header clean (brand + hamburger only)

### Claude's Discretion
- Slide-in direction (left vs right)
- Exact section header styling and divider appearance
- Transition CSS for the ~150ms animation override
- How collapseOnSelect interacts with the Offcanvas close behavior

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NAV-01 | User can open and navigate the mobile hamburger menu on all mobile browsers | React Bootstrap Navbar.Offcanvas is pure React/CSS — no Bootstrap JS bundle needed, works on all browsers |
| NAV-02 | Mobile navigation drawer closes automatically after selecting a menu item | `collapseOnSelect` + `Nav.Link` with `eventKey` prop triggers close; `onHide` state handler covers backdrop/close-button dismissal |
| NAV-03 | All role-gated navigation links (admin, organizer, player) are accessible on mobile | All existing role-gate logic (`user.role` conditionals) moves intact into Offcanvas.Body |
</phase_requirements>

---

## Summary

The current `NavBar.jsx` uses raw HTML Bootstrap 5 collapse markup (`data-bs-toggle="collapse"`, `data-bs-target="#navbarNav"`) which requires the Bootstrap JS bundle. This fails silently on mobile browsers when Bootstrap JS is not initialized, causing the hamburger to do nothing. The fix is to replace the entire nav with React Bootstrap's `Navbar` + `Navbar.Offcanvas` components, which are pure React — no Bootstrap JS required.

The React Bootstrap `Navbar.Offcanvas` component manages open/close state entirely through React state (controlled via `expanded`/`onToggle` or `show`/`onHide`). The `collapseOnSelect` prop on `<Navbar>` wires up automatic close when any `Nav.Link` is clicked — but only if the `Nav.Link` has either an `href` or `eventKey` prop. Without one of these, `Nav` internals return early before firing `onSelect`.

The current NavBar uses plain `<span>` elements with `onClick` + `navigate()`. These must become `Nav.Link` elements with an `eventKey` (since `href` would override React Router). The `onClick` handler for `navigate()` is added alongside `eventKey`. The drawer must also be driven by a `show` boolean state managed in the NavBar component so all close paths (backdrop tap, X button, menu item select) converge on `setShow(false)`.

**Primary recommendation:** Refactor `NavBar.jsx` in place: add `show` state, convert `<span className="nav-link">` to `<Nav.Link eventKey={uniqueKey} onClick={() => navigate(path)}>`, add `Navbar.Offcanvas` with `scroll={false}` and `backdrop={true}`, and override `--bs-offcanvas-transition` to `150ms` in CSS.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-bootstrap | ^2.10.10 (already installed) | Navbar, Nav.Link, Offcanvas, Accordion components | Already the project's UI library; Offcanvas is built-in |
| bootstrap | ^5.3.8 (already installed) | CSS variables for offcanvas transition override | CSS layer only, no JS |
| react-router-dom | ^7.9.5 (already installed) | `useNavigate` for programmatic navigation inside Nav.Link onClick | Already established project pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React Bootstrap Accordion | built into react-bootstrap | Collapsible sub-sections for ADMIN role | Admin has ~10 links across 3 groups — accordion prevents visual overload |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Nav.Link + eventKey | span + onClick + manual setShow(false) | Manual approach works but bypasses collapseOnSelect; more boilerplate, two close paths to maintain |
| CSS `--bs-offcanvas-transition` override | SASS variable compile | CSS var override is simpler and doesn't require build pipeline changes |

**No new packages required.** All needed libraries are already in `package.json`.

---

## Architecture Patterns

### Recommended Component Structure

The refactor is entirely within `frontend/src/components/NavBar.jsx`. No new files needed.

```
NavBar.jsx (refactored in place)
├── Navbar (expand="lg", collapseOnSelect, onToggle, expanded=show)
│   ├── Navbar.Brand — BATL brand, onClick → role-based navigate
│   ├── Navbar.Toggle — hamburger, only visible < lg
│   └── Navbar.Offcanvas (show=show, onHide=handleClose, placement="end", scroll=false, backdrop=true)
│       ├── Offcanvas.Header — "Menu" title + closeButton
│       └── Offcanvas.Body (d-flex flex-column)
│           ├── Nav (className="flex-grow-1") — all nav links
│           │   ├── Public section (no header): Rankings, Tournaments
│           │   ├── Organizer section (ORGANIZER | ADMIN): section label + divider + links
│           │   ├── Admin section (ADMIN only): Accordion with 3 sub-groups
│           │   └── Player section (PLAYER only): section label + divider + links
│           └── Drawer footer (mt-auto) — user info OR login/register + LanguageSwitcher
```

### Pattern 1: Controlled Offcanvas State

**What:** Manage `show` as React state in NavBar; pass to both `Navbar` (`expanded`) and `Navbar.Offcanvas` (`show`).
**When to use:** Always — required for programmatic close paths (backdrop, X button, Nav.Link select) to converge.

```jsx
// Source: React Bootstrap Navbar docs + GitHub issue #5477
const [show, setShow] = useState(false);

const handleClose = () => setShow(false);
const handleToggle = () => setShow(prev => !prev);

<Navbar
  expand="lg"
  collapseOnSelect
  expanded={show}
  onToggle={handleToggle}
  variant="dark"
  bg="primary"
>
  <Container fluid>
    <Navbar.Brand onClick={handleHomeClick} style={{ cursor: 'pointer' }}>BATL</Navbar.Brand>
    <Navbar.Toggle aria-controls="batl-offcanvas" />

    <Navbar.Offcanvas
      id="batl-offcanvas"
      aria-labelledby="batl-offcanvas-label"
      placement="end"
      show={show}
      onHide={handleClose}
      scroll={false}
      backdrop={true}
    >
      ...
    </Navbar.Offcanvas>
  </Container>
</Navbar>
```

### Pattern 2: Nav.Link with eventKey for collapseOnSelect

**What:** Every clickable nav item must be a `Nav.Link` with a unique `eventKey`. The `onClick` calls `navigate()`. Without `eventKey`, `collapseOnSelect` silently does nothing.
**When to use:** Every nav link in the drawer.

```jsx
// Source: GitHub issue react-bootstrap/react-bootstrap#5477
// eventKey is required — Nav internals derive navKey from href or eventKey.
// Without either, onSelect is never fired, so collapseOnSelect doesn't close the drawer.

<Nav.Link
  eventKey="rankings"
  onClick={() => navigate('/rankings')}
>
  {t('nav.rankings')}
</Nav.Link>

<Nav.Link
  eventKey="organizer-categories"
  onClick={() => navigate('/organizer/categories')}
>
  {t('nav.categories')}
</Nav.Link>
```

### Pattern 3: Section Headers and Dividers

**What:** Visual grouping of role-gated links with a small muted label and `<hr>`.
**When to use:** Before each role-specific group of links in the drawer.

```jsx
// Small muted section label pattern
<div className="text-muted small fw-semibold px-2 pt-3 pb-1 text-uppercase">
  Organizer
</div>
<hr className="my-0 mb-2" />
<Nav.Link eventKey="categories" onClick={() => navigate('/organizer/categories')}>
  {t('nav.categories')}
</Nav.Link>
```

### Pattern 4: Admin Accordion Sub-Sections

**What:** ADMIN role has ~10 links in 3 groups. Collapsible Accordion prevents an overwhelming list.
**When to use:** ADMIN role only; non-admin roles use always-visible sections (no Accordion).

```jsx
// Source: React Bootstrap Accordion docs
// No defaultActiveKey = all sections collapsed by default (cleaner on first open)
// flush variant removes border radius, fits inside drawer

{user?.role === 'ADMIN' && (
  <Accordion flush>
    <Accordion.Item eventKey="organizer-links">
      <Accordion.Header>Organizer</Accordion.Header>
      <Accordion.Body className="p-0">
        <Nav.Link eventKey="adm-categories" onClick={() => navigate('/organizer/categories')}>
          {t('nav.categories')}
        </Nav.Link>
        {/* ... other organizer links ... */}
      </Accordion.Body>
    </Accordion.Item>
    <Accordion.Item eventKey="admin-links">
      <Accordion.Header>Admin</Accordion.Header>
      <Accordion.Body className="p-0">
        <Nav.Link eventKey="adm-users" onClick={() => navigate('/admin/users')}>
          Users
        </Nav.Link>
        {/* ... */}
      </Accordion.Body>
    </Accordion.Item>
    <Accordion.Item eventKey="player-links">
      <Accordion.Header>Player Access</Accordion.Header>
      <Accordion.Body className="p-0">
        {/* ... player-facing links for admin ... */}
      </Accordion.Body>
    </Accordion.Item>
  </Accordion>
)}
```

### Pattern 5: Drawer Footer (User Info + Language Switcher)

**What:** `mt-auto` pushes the footer to the bottom of the flex column Offcanvas.Body.
**When to use:** Always — keeps user info and language switcher anchored at drawer bottom.

```jsx
// Offcanvas.Body uses d-flex flex-column; footer section uses mt-auto
<Offcanvas.Body className="d-flex flex-column">
  <Nav className="flex-grow-1">
    {/* ... nav links ... */}
  </Nav>

  {/* Footer — anchored to bottom */}
  <div className="mt-auto border-top pt-3">
    <LanguageSwitcher />
    {user ? (
      <div className="d-flex align-items-center gap-2 mt-2">
        <span className="badge bg-primary">{user.role}</span>
        <small className="text-muted text-truncate">{user.email}</small>
        <button className="btn btn-outline-secondary btn-sm ms-auto" onClick={handleLogout}>
          {t('nav.logout')}
        </button>
      </div>
    ) : (
      <div className="d-flex gap-2 mt-2">
        <button className="btn btn-outline-primary btn-sm flex-grow-1" onClick={openLoginModal}>
          {t('nav.login')}
        </button>
        <button className="btn btn-primary btn-sm flex-grow-1" onClick={openRegisterModal}>
          {t('nav.register')}
        </button>
      </div>
    )}
  </div>
</Offcanvas.Body>
```

### Pattern 6: Animation Duration Override

**What:** Bootstrap 5.3's offcanvas transition defaults to `0.3s`. Override to `0.15s` via CSS custom property.
**When to use:** Applied globally or scoped to `.offcanvas` — no SASS build step needed.
**Source:** Bootstrap 5.3 official docs, CSS custom properties section.

```css
/* In index.css or a dedicated navbar.css — override Bootstrap's offcanvas transition */
.offcanvas {
  --bs-offcanvas-transition: transform 0.15s ease-in-out;
}
```

### Anti-Patterns to Avoid

- **Using `data-bs-toggle` / `data-bs-target` in JSX:** These are Bootstrap JS attributes. They require the Bootstrap JS bundle to be initialized, which is not guaranteed in React SPAs. This is exactly what broke the current hamburger menu.
- **Nav.Link without eventKey OR href:** The `Nav` component derives `navKey` from `href` or `eventKey`. If neither is present, `onSelect` is never fired and `collapseOnSelect` is silently broken.
- **Using `<span>` instead of `Nav.Link`:** Spans don't participate in React Bootstrap's Nav event system, so `collapseOnSelect` has nothing to hook into.
- **Calling `navigate()` inside `href` string:** Using `href="/some-path"` on `Nav.Link` causes a full-page reload, bypassing React Router. Always use `eventKey` + `onClick={() => navigate(path)}`.
- **Nesting `Nav.Link` inside `Accordion.Body` without unique eventKeys:** Each `Nav.Link` needs a globally unique `eventKey` within the `Navbar` context or collapseOnSelect may fire incorrectly.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hamburger open/close state | Custom `isOpen` toggle with portal backdrop | `Navbar.Offcanvas` controlled via `show` + `onHide` | React Bootstrap handles focus trap, ARIA, backdrop, scroll lock |
| Close-on-nav-item | `useEffect` listening to router location changes to setShow(false) | `collapseOnSelect` + `Nav.Link` + `eventKey` | Built-in, no effect needed |
| Scroll lock while open | Manual `document.body.style.overflow = 'hidden'` | `scroll={false}` on Navbar.Offcanvas | Handled by Bootstrap CSS; avoids layout shift bugs |
| Section collapsible for admin | Custom accordion from scratch | `Accordion` + `Accordion.Item` from react-bootstrap | Already installed, accessible, animated |
| Animation timing | Custom keyframe animation | CSS `--bs-offcanvas-transition` override | One-line CSS, no JS |

**Key insight:** React Bootstrap's Offcanvas has already solved focus management, ARIA state, backdrop click handling, and scroll locking. All of these have mobile-specific edge cases (iOS scroll bounce, Safari focus trap bugs, VoiceOver announcements) that custom implementations typically miss.

---

## Common Pitfalls

### Pitfall 1: Nav.Link Missing eventKey — collapseOnSelect Silently Broken
**What goes wrong:** Drawer doesn't close when a link is tapped. No error, no console warning.
**Why it happens:** React Bootstrap `Nav` component's event firing path requires `navKey` derived from `eventKey` or `href`. If both are absent, `onSelect` returns early before reaching `Navbar`'s `collapseOnSelect` handler.
**How to avoid:** Add `eventKey="unique-string"` to every `Nav.Link` inside the navbar.
**Warning signs:** Clicking nav items navigates correctly (page changes) but drawer stays open.

### Pitfall 2: Navbar.Toggle Not Wired to Offcanvas
**What goes wrong:** Hamburger icon does nothing, or only works via Bootstrap JS fallback.
**Why it happens:** `Navbar.Toggle` needs `aria-controls` matching the `Navbar.Offcanvas` `id`. The `Navbar` component uses `expanded`/`onToggle` for state; if these are not provided, the component manages state internally (usually works) but `onHide` from `Navbar.Offcanvas` can desync.
**How to avoid:** Use the controlled pattern — `expanded={show}` on `Navbar`, `onToggle={handleToggle}`, and `show={show}` + `onHide={handleClose}` on `Navbar.Offcanvas`.
**Warning signs:** Drawer opens but X button / backdrop doesn't close it, or state desync after rapid taps.

### Pitfall 3: LanguageSwitcher Still Uses data-bs-toggle="dropdown"
**What goes wrong:** Language dropdown doesn't work on mobile (same Bootstrap JS dependency problem as the hamburger).
**Why it happens:** The existing `LanguageSwitcher.jsx` uses a raw Bootstrap dropdown (`data-bs-toggle="dropdown"`), which requires Bootstrap JS.
**How to avoid:** Either (a) convert `LanguageSwitcher` to a React Bootstrap `Dropdown` component, or (b) replace with simple button-group showing both language options inline inside the drawer (simpler: no dropdown needed in a sidebar).
**Warning signs:** Language switcher renders but clicking the button doesn't open the dropdown inside the mobile drawer.

### Pitfall 4: Accordion eventKey Collision with Nav eventKey
**What goes wrong:** Clicking an Accordion header triggers `collapseOnSelect` and closes the drawer.
**Why it happens:** `Accordion.Header` renders as a button; if it inadvertently participates in `Nav` selection, `collapseOnSelect` fires.
**How to avoid:** Wrap `Accordion` outside of the `Nav` component, or use `Nav` only for `Nav.Link` items. Accordion sits alongside `Nav`, not inside it.
**Warning signs:** Tapping an Accordion section header (e.g., "Organizer") closes the entire drawer.

### Pitfall 5: Desktop Navigation Broken by lg Breakpoint
**What goes wrong:** Desktop (`lg+`) shows offcanvas drawer instead of inline nav bar.
**Why it happens:** Setting `expand={false}` makes the navbar always show as offcanvas. Using `expand="lg"` makes it collapse at `< lg` and show inline at `>= lg`.
**How to avoid:** Use `expand="lg"` on `Navbar`. At `lg+`, `Navbar.Offcanvas` renders as a regular `div` inline in the navbar, not as a drawer.
**Warning signs:** On desktop, clicking Navbar.Toggle still opens a side drawer.

---

## Code Examples

### Complete Controlled Navbar Shell
```jsx
// Source: React Bootstrap Navbar docs + GitHub#5477 fix
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar, Nav, Offcanvas, Accordion, Container } from 'react-bootstrap';
import { useAuth } from '../utils/AuthContext';
import { useModal } from '../utils/ModalContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { logout as logoutAPI } from '../services/authService';

const NavBar = () => {
  const [show, setShow] = useState(false);
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { openLoginModal, openRegisterModal } = useModal();
  const navigate = useNavigate();

  const handleClose = () => setShow(false);
  const handleToggle = () => setShow(prev => !prev);

  const handleNav = (path) => {
    navigate(path);
    // collapseOnSelect handles close via Nav.Link eventKey,
    // but handleClose as backup ensures it always closes
  };

  return (
    <Navbar
      expand="lg"
      collapseOnSelect
      expanded={show}
      onToggle={handleToggle}
      variant="dark"
      bg="primary"
    >
      <Container fluid>
        <Navbar.Brand style={{ cursor: 'pointer' }} onClick={() => handleNav('/rankings')}>
          BATL
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="batl-offcanvas" />

        <Navbar.Offcanvas
          id="batl-offcanvas"
          aria-labelledby="batl-offcanvas-label"
          placement="end"
          show={show}
          onHide={handleClose}
          scroll={false}
          backdrop={true}
        >
          <Offcanvas.Header closeButton>
            <Offcanvas.Title id="batl-offcanvas-label">Menu</Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body className="d-flex flex-column">
            <Nav className="flex-grow-1">
              {/* Public links — no section header */}
              <Nav.Link eventKey="rankings" onClick={() => handleNav('/rankings')}>
                {t('nav.rankings')}
              </Nav.Link>
              {(!user || user.role === 'PLAYER') && (
                <Nav.Link eventKey="tournaments" onClick={() => handleNav('/tournaments')}>
                  Tournaments
                </Nav.Link>
              )}

              {/* Organizer section (ORGANIZER role, not ADMIN) */}
              {user?.role === 'ORGANIZER' && (
                <>
                  <div className="text-muted small fw-semibold px-2 pt-3 pb-1 text-uppercase">
                    Organizer
                  </div>
                  <hr className="my-0 mb-1" />
                  <Nav.Link eventKey="org-categories" onClick={() => handleNav('/organizer/categories')}>
                    {t('nav.categories')}
                  </Nav.Link>
                  {/* ... remaining organizer links ... */}
                </>
              )}

              {/* Admin: collapsible accordion for 3 groups */}
              {user?.role === 'ADMIN' && (
                <Accordion flush className="mt-2">
                  <Accordion.Item eventKey="organizer-links">
                    <Accordion.Header>Organizer</Accordion.Header>
                    <Accordion.Body className="p-0 ps-2">
                      <Nav.Link eventKey="adm-cats" onClick={() => handleNav('/organizer/categories')}>
                        {t('nav.categories')}
                      </Nav.Link>
                    </Accordion.Body>
                  </Accordion.Item>
                </Accordion>
              )}
            </Nav>

            {/* Drawer footer — always at bottom */}
            <div className="mt-auto border-top pt-3 pb-2">
              <LanguageSwitcher />
              {/* user info or login/register buttons */}
            </div>
          </Offcanvas.Body>
        </Navbar.Offcanvas>
      </Container>
    </Navbar>
  );
};
```

### Animation Override CSS
```css
/* frontend/src/index.css or App.css — override Bootstrap 5.3 default 300ms */
.offcanvas {
  --bs-offcanvas-transition: transform 0.15s ease-in-out;
}
```

### LanguageSwitcher Fix for Mobile Drawer
The current `LanguageSwitcher` uses `data-bs-toggle="dropdown"` (Bootstrap JS). Inside the mobile drawer, replace with a simple inline approach:

```jsx
// Option A: React Bootstrap Dropdown (recommended — same pattern as rest of nav)
import Dropdown from 'react-bootstrap/Dropdown';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  return (
    <Dropdown>
      <Dropdown.Toggle variant="outline-secondary" size="sm">
        {currentLang.flag} {currentLang.code.toUpperCase()}
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {languages.map(lang => (
          <Dropdown.Item key={lang.code} onClick={() => i18n.changeLanguage(lang.code)}>
            {lang.flag} {lang.label}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bootstrap JS `data-bs-toggle` collapse | React Bootstrap `Navbar.Offcanvas` (pure React) | This phase | No Bootstrap JS dependency, works on all mobile browsers |
| `<span className="nav-link">` | `<Nav.Link eventKey="..." onClick={...}>` | This phase | collapseOnSelect works correctly |
| LanguageSwitcher via Bootstrap JS dropdown | React Bootstrap `Dropdown` component | This phase | Dropdown works without Bootstrap JS |
| Default 300ms offcanvas transition | 150ms via CSS custom property override | This phase | Snappier, app-like feel on mobile |

**Deprecated/outdated:**
- `data-bs-toggle="collapse"` in JSX: Works only when Bootstrap JS bundle is loaded and initialized, unreliable in React SPAs
- `data-bs-toggle="dropdown"` in JSX: Same issue — requires Bootstrap JS for event listeners

---

## Open Questions

1. **LanguageSwitcher refactor scope**
   - What we know: Current `LanguageSwitcher` uses `data-bs-toggle="dropdown"`, which needs Bootstrap JS. It moves into the mobile drawer.
   - What's unclear: Whether it also appears on desktop navbar. If so, does the desktop version also need fixing, or does Bootstrap JS happen to be loaded there?
   - Recommendation: Convert `LanguageSwitcher.jsx` to use React Bootstrap `Dropdown` component entirely — fixes both mobile and desktop consistently. This is a small change within the same file.

2. **Accordion eventKey vs Nav eventKey namespacing**
   - What we know: Both `Accordion` and `Nav` use `eventKey` but in different context trees. `Nav.Link` inside `Accordion.Body` participates in the `Nav` context, while `Accordion.Item` participates in the `Accordion` context.
   - What's unclear: Whether `Accordion.Header` click bubbles up and accidentally triggers `collapseOnSelect` on the parent `Navbar`.
   - Recommendation: Test this interaction during implementation. If Accordion headers trigger drawer close, move `Accordion` outside the `Nav` element (sibling, not child) so they are in separate context trees.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (frontend) — established project standard |
| Config file | None detected for frontend; Vitest runs via `vite` integration |
| Quick run command | `cd frontend && npx vitest run --reporter=verbose` |
| Full suite command | `cd frontend && npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NAV-01 | Hamburger button renders; clicking it shows the offcanvas drawer | manual-only | n/a — requires browser/DOM render and mobile viewport | ❌ manual |
| NAV-02 | Nav.Link click closes drawer (collapseOnSelect) | manual-only | n/a — requires interaction testing in browser | ❌ manual |
| NAV-03 | Role-gated links appear for ADMIN, ORGANIZER, PLAYER | unit | Could be tested with Vitest + React Testing Library if installed | ❌ manual |

**Note:** The frontend does not currently have a Vitest test suite set up (`/frontend/src/__tests__/` or similar not detected). All three navigation requirements are interaction/visual requirements best validated manually on a mobile device via the Phase 20 QR code dev server. No Wave 0 test file gaps to create for this phase — the requirements are not unit-testable without React Testing Library setup (out of scope for this phase).

### Sampling Rate
- **Per task:** Manual browser check on mobile via `npm run dev:mobile` QR code
- **Phase gate:** All 3 NAV requirements pass manual verification on real device before `/gsd:verify-work`

### Wave 0 Gaps
None — no automated tests required or expected for this phase. All validation is manual on-device.

---

## Sources

### Primary (HIGH confidence)
- React Bootstrap Navbar docs (https://react-bootstrap.netlify.app/docs/components/navbar/) — Offcanvas integration, collapseOnSelect, expand prop
- React Bootstrap Offcanvas docs (https://react-bootstrap.netlify.app/docs/components/offcanvas/) — placement values, show/onHide props, scroll/backdrop props
- Bootstrap 5.3 official docs (https://getbootstrap.com/docs/5.3/components/offcanvas/) — `--bs-offcanvas-transition` CSS variable, default 0.3s, override pattern
- React Bootstrap Accordion docs (https://react-bootstrap.netlify.app/docs/components/accordion/) — flush, defaultActiveKey, Accordion.Item/Header/Body

### Secondary (MEDIUM confidence)
- GitHub react-bootstrap/react-bootstrap issue #5477 — `eventKey` required for collapseOnSelect to fire via Nav internals; verified against Nav source behavior
- Existing project code (`NavBar.jsx`, `LanguageSwitcher.jsx`, `AuthContext.jsx`, `package.json`) — confirmed installed versions, existing patterns, user object shape

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All libraries already installed; APIs verified against official docs
- Architecture: HIGH — Controlled state pattern verified; eventKey requirement confirmed from GitHub issue with source code citation
- Pitfalls: HIGH — Most pitfalls derived from direct source code inspection and official API docs; eventKey pitfall confirmed from tracked GitHub issue
- Animation override: HIGH — Confirmed from Bootstrap 5.3 official docs (`--bs-offcanvas-transition` CSS variable)

**Research date:** 2026-03-06
**Valid until:** 2026-06-06 (react-bootstrap 2.x is stable; Bootstrap 5.3 CSS vars are stable)
