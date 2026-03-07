# Phase 20: Mobile Dev Tooling - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable developers to test the app on a real mobile device by scanning a QR code from the terminal. Vite dev server becomes network-reachable, and the viewport meta tag supports device notch/home indicator. No backend changes, no production dependencies.

</domain>

<decisions>
## Implementation Decisions

### Dev script organization
- Keep two separate terminals for frontend and backend — no combined root script
- Add a separate `dev:mobile` npm script that enables QR code + network host binding
- Regular `dev` script stays unchanged (localhost-only, no QR code)

### Network accessibility
- Vite proxy handles API calls from mobile — backend stays bound to localhost:3000
- `dev:mobile` script sets `server.host: true` so Vite listens on 0.0.0.0
- No need to expose the backend directly on the network

### QR code
- Use `vite-plugin-qrcode` (dev dependency only) to print QR code in terminal
- QR code only appears when running `dev:mobile`, not on regular `dev`

### Viewport meta tag
- Add `viewport-fit=cover` to the existing viewport meta tag in index.html
- This is a permanent change (applies to all modes, not just mobile testing)

### Claude's Discretion
- Whether to use Vite CLI flags vs config-based approach for host binding
- Safe-area CSS env() insets — defer to Phase 25 or add minimal padding now
- Exact vite-plugin-qrcode configuration options

</decisions>

<specifics>
## Specific Ideas

No specific requirements — standard dev tooling setup.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/vite.config.js`: Existing config with proxy setup — extend with host + QR plugin
- `frontend/index.html`: Viewport meta tag at line 5 — add viewport-fit=cover

### Established Patterns
- Dev scripts defined in `frontend/package.json` — add `dev:mobile` alongside existing `dev`
- Vite 7 with `@vitejs/plugin-react` already configured

### Integration Points
- API proxy (`/api` → `localhost:3000`) runs server-side in Vite — works transparently for mobile devices hitting network IP
- No backend changes needed

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-mobile-dev-tooling*
*Context gathered: 2026-03-06*
