---
date: "2026-03-28 14:35"
promoted: false
---

Session expiry UX improvement: When session expires, organizer sees "not authorized" error but navbar still shows logout button. Must logout first then re-login, losing their place. Instead: detect 401 responses in apiClient interceptor, show inline re-login modal/form (not redirect), keep current page state so no unsaved work is lost. After successful re-login, retry the failed request automatically.
