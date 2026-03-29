# Phase 20: Mobile Dev Tooling - Research

**Researched:** 2026-03-06
**Domain:** Vite dev server network accessibility, terminal QR code generation, HTML viewport meta tag
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Keep two separate terminals for frontend and backend — no combined root script
- Add a separate `dev:mobile` npm script that enables QR code + network host binding
- Regular `dev` script stays unchanged (localhost-only, no QR code)
- Vite proxy handles API calls from mobile — backend stays bound to localhost:3000
- `dev:mobile` script sets `server.host: true` so Vite listens on 0.0.0.0
- No need to expose the backend directly on the network
- Use `vite-plugin-qrcode` (dev dependency only) to print QR code in terminal
- QR code only appears when running `dev:mobile`, not on regular `dev`
- Add `viewport-fit=cover` to the existing viewport meta tag in index.html
- This is a permanent change (applies to all modes, not just mobile testing)

### Claude's Discretion
- Whether to use Vite CLI flags vs config-based approach for host binding
- Safe-area CSS env() insets — defer to Phase 25 or add minimal padding now
- Exact vite-plugin-qrcode configuration options

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TOOL-01 | Developer can access the app on a mobile device by scanning a QR code from the terminal | vite-plugin-qrcode@0.3.0 prints QR to terminal on dev server start when --host is active |
| TOOL-02 | Vite dev server is accessible from other devices on the local network | `server.host: true` or `--host` CLI flag binds Vite to 0.0.0.0 |
</phase_requirements>

---

## Summary

Phase 20 adds two small but meaningful developer-experience changes: network-accessible Vite dev server with terminal QR code, and a viewport meta tag update for device notch support. Both changes are additive and low-risk — no existing behavior changes for the normal `dev` workflow.

The implementation has exactly two touch points: `frontend/vite.config.js` (add plugin + conditional host config) and `frontend/index.html` (update viewport meta tag). The npm script `dev:mobile` in `frontend/package.json` is the user-facing entry point.

The key decision left to the planner is CLI flag vs config-based host binding. Both approaches work equally well; the CLI flag approach (`vite --host`) is simpler for a separate script, while the config-based approach (`server.host: true`) is better if the plugin needs host to be set for QR URL generation. The plugin itself documents `vite --host` as the standard trigger.

**Primary recommendation:** Use `"dev:mobile": "vite --host"` in package.json scripts, with `vite-plugin-qrcode` in the plugins array (it auto-activates in dev mode only and reads the host flag). This is the canonical documented usage pattern.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vite-plugin-qrcode | 0.3.0 | Print QR code in terminal when server starts with --host | Official svitejs plugin, dev-only, zero production impact |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vite (existing) | ^7.1.12 | Dev server with `--host` flag | Already installed — no change needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| vite-plugin-qrcode | vite-plugin-qrcode-terminal | Alternative package, less maintained, same concept |
| vite-plugin-qrcode | qrcode-terminal (manual) | Manual integration, more code, no benefit |

**Installation:**
```bash
cd frontend && npm install --save-dev vite-plugin-qrcode
```

## Architecture Patterns

### Recommended Project Structure

No new files or folders required. All changes are to existing files:

```
frontend/
├── package.json          # Add "dev:mobile" script
├── vite.config.js        # Add qrcode plugin import + usage
└── index.html            # Update viewport meta tag
```

### Pattern 1: Separate dev:mobile script with CLI --host flag

**What:** A dedicated npm script `dev:mobile` that passes `--host` to Vite, while the default `dev` script remains `vite` (localhost-only).

**When to use:** When you want QR code + network access to be opt-in, not the default behavior. This is the locked decision.

**Example:**
```json
// frontend/package.json scripts section
{
  "dev": "vite",
  "dev:mobile": "vite --host",
  "build": "vite build",
  "preview": "vite preview",
  "lint": "eslint src --fix"
}
```

### Pattern 2: vite-plugin-qrcode integration

**What:** Plugin added to the Vite config plugins array. It is dev-only by design and activates only when the server exposes a network URL (i.e., when `--host` is active). On regular `dev` (localhost-only), the plugin produces no output.

**When to use:** Always — it is zero-cost when not needed.

**Example:**
```javascript
// Source: https://github.com/svitejs/vite-plugin-qrcode
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { qrcode } from 'vite-plugin-qrcode';

export default defineConfig({
  plugins: [react(), qrcode()],
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
```

### Pattern 3: viewport-fit=cover meta tag

**What:** Adding `viewport-fit=cover` to the existing viewport meta tag in `index.html`. This tells the browser to render content edge-to-edge, including behind the device notch and home indicator.

**When to use:** Always — this is a permanent, app-wide change, not mode-specific.

**Example:**
```html
<!-- frontend/index.html line 5 — before -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<!-- after -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

### Anti-Patterns to Avoid

- **Adding `server.host: true` to the main config block:** This would make every `dev` run network-accessible, violating the locked decision to keep `dev` localhost-only.
- **Installing vite-plugin-qrcode as a production dependency:** It has no runtime value. Must be `--save-dev`.
- **Safe-area env() CSS in this phase:** Deferred to Phase 25. Adding `viewport-fit=cover` alone is safe — it only has visible effect if content is explicitly positioned behind the notch area.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Terminal QR code | Custom qrcode-terminal + Vite server events wiring | vite-plugin-qrcode | Plugin handles server URL detection, QR rendering, dev-only lifecycle automatically |
| Network IP detection | Custom `os.networkInterfaces()` script | Vite built-in `--host` | Vite already prints the network URL alongside the QR code |

**Key insight:** vite-plugin-qrcode is trivially small to integrate and handles the only genuinely tricky part (knowing which network URL to encode) by hooking into Vite's server lifecycle.

## Common Pitfalls

### Pitfall 1: Plugin not showing QR code on normal `dev`
**What goes wrong:** Developer adds plugin, runs `vite` (no --host), and sees no QR code and wonders if it is broken.
**Why it happens:** The plugin only generates a QR when a network URL is available. Localhost-only mode has no network URL.
**How to avoid:** Document that QR only appears with `npm run dev:mobile` (which passes --host).
**Warning signs:** No error — just silence. Expected behavior.

### Pitfall 2: Firewall blocks mobile access despite --host
**What goes wrong:** `vite --host` binds to 0.0.0.0, QR code appears, but phone cannot reach the app.
**Why it happens:** Windows Defender Firewall may block incoming connections on port 3001 by default.
**How to avoid:** Ensure port 3001 is allowed through the local firewall. This is a developer machine configuration issue, not a code issue.
**Warning signs:** QR scans but phone shows "Unable to connect" or times out.

### Pitfall 3: API calls failing on mobile (proxy not working)
**What goes wrong:** App loads on mobile but API requests return network errors.
**Why it happens:** Vite's proxy runs server-side. When mobile hits `http://192.168.x.x:3001/api/...`, the proxy forwards to `localhost:3000` on the dev machine — which works correctly because the proxy runs on the server, not the client.
**How to avoid:** No action needed — the existing proxy config handles this transparently.
**Warning signs:** App UI loads but data fetching fails. Check that backend is running on localhost:3000.

### Pitfall 4: viewport-fit=cover causing content to hide behind notch
**What goes wrong:** After adding viewport-fit=cover, the top navbar or bottom content gets clipped behind the device notch/home indicator.
**Why it happens:** viewport-fit=cover allows content to extend into notch areas. Without safe-area-inset padding, fixed/sticky elements at edges can be occluded.
**How to avoid:** In Phase 20, only add the meta tag. Phase 25 will audit and add `env(safe-area-inset-*)` padding where needed. The risk is LOW for the BATL app because fixed/sticky elements are handled by Bootstrap's navbar at the top.
**Warning signs:** Navbar text clipped on iPhone with Dynamic Island or notch.

## Code Examples

Verified patterns from official sources:

### Complete vite.config.js after Phase 20
```javascript
// Source: https://github.com/svitejs/vite-plugin-qrcode (plugin usage)
// Source: https://vitejs.dev/config/server-options.html (server.host)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { qrcode } from 'vite-plugin-qrcode';

export default defineConfig({
  plugins: [react(), qrcode()],
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
```

Note: `server.host` is NOT set in the config. The `--host` CLI flag in the `dev:mobile` script activates network binding for that script only.

### package.json dev:mobile script
```json
"scripts": {
  "dev": "vite",
  "dev:mobile": "vite --host",
  "build": "vite build",
  "preview": "vite preview",
  "lint": "eslint src --fix"
}
```

### index.html viewport meta tag update
```html
<!-- Change line 5 of frontend/index.html from: -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<!-- To: -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

### Optional: filter function for multi-interface machines
```javascript
// Source: https://github.com/svitejs/vite-plugin-qrcode
// Only needed if dev machine has multiple network interfaces and you want to target a specific one
import { qrcode } from 'vite-plugin-qrcode';

qrcode({
  filter: (url) => url.startsWith('http://192.168.')
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manually type IP address | QR code scan | vite-plugin-qrcode 0.1+ | Eliminates friction of IP lookup |
| `vite --host 0.0.0.0` | `vite --host` (shorthand) | Vite 2+ | `--host` alone enables all interfaces |
| `constant()` CSS env | `env()` | iOS 11.2 (2017) | `constant()` is dead — use `env()` only |

**Deprecated/outdated:**
- `constant(safe-area-inset-*)`: Replaced by `env(safe-area-inset-*)` since iOS 11.2. Do not use.
- `server.host: '0.0.0.0'` in config for mode-specific behavior: Prefer CLI flag to avoid always-on network exposure.

## Open Questions

1. **Windows Firewall on developer machines**
   - What we know: `vite --host` binds to 0.0.0.0 correctly on all platforms
   - What's unclear: Whether the project's developer machines need firewall rules added manually
   - Recommendation: Document in dev:mobile script description as a note. Not a code concern.

2. **Multiple network interfaces (VPN, virtual adapters)**
   - What we know: vite-plugin-qrcode shows QR for each network URL when multiple exist
   - What's unclear: Whether dev machines typically have VPN or multiple adapters
   - Recommendation: Default `qrcode()` with no filter is fine. Developer can scan the correct one. Add filter option note in code comments if needed.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (frontend) |
| Config file | frontend/vite.config.js (implicit) |
| Quick run command | `cd frontend && npx vitest run` |
| Full suite command | `cd frontend && npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TOOL-01 | QR code printed in terminal on `dev:mobile` | manual-only | N/A — terminal output, not DOM | N/A |
| TOOL-02 | Vite server reachable from network device | manual-only | N/A — requires physical device | N/A |

**Manual-only justification:** Both TOOL-01 and TOOL-02 require a physical mobile device on the local network and terminal observation. These cannot be automated in a unit or integration test. Verification is via the phase success criteria: scan QR, app opens within 30 seconds.

### Sampling Rate
- **Per task commit:** N/A (no automated tests in this phase)
- **Per wave merge:** N/A
- **Phase gate:** Manual verification — developer scans QR on phone, confirms app opens. Check viewport meta tag in browser devtools.

### Wave 0 Gaps
None — no test files needed for this phase. All validation is manual observation of:
1. `npm run dev:mobile` output shows a QR code in the terminal
2. Scanning the QR code opens the app on a phone within 30 seconds
3. `<meta name="viewport">` in DevTools shows `viewport-fit=cover`

## Sources

### Primary (HIGH confidence)
- https://github.com/svitejs/vite-plugin-qrcode — Plugin README, version 0.3.0 (June 2025), configuration options, --host requirement
- https://vitejs.dev/config/server-options.html — `server.host` and `--host` CLI flag documentation
- https://webkit.org/blog/7929/designing-websites-for-iphone-x/ — Official WebKit documentation for viewport-fit=cover and safe-area-inset env() variables

### Secondary (MEDIUM confidence)
- https://dev.to/bhendi/how-to-open-your-vite-dev-server-on-your-mobile-k1k — Community guide confirming --host behavior and network IP display
- https://bjornlu.com/projects/vite-plugin-qrcode — Author's project page confirming dev-only behavior

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — vite-plugin-qrcode 0.3.0 confirmed on GitHub, latest release June 2025
- Architecture: HIGH — Vite `--host` flag is documented, proxy behavior is well-understood
- Pitfalls: MEDIUM — firewall and safe-area pitfalls from community sources, confirmed by WebKit docs for viewport-fit behavior

**Research date:** 2026-03-06
**Valid until:** 2026-09-06 (stable tooling — 6 months)
