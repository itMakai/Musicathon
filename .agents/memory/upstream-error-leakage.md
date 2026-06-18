---
name: Upstream error leakage of secrets
description: Why raw upstream error bodies must never reach client-facing fields
---

# Upstream error bodies can leak your own API key

Some third-party APIs echo the credential you sent back inside their error
responses. JamBase's 403 body, for example, contains the exact text
`The provided API key \`jbd_...\` is not valid.` — i.e. the full key.

**Rule:** never assign a raw upstream response body (or `error.message` that wraps
one) to any field returned to the browser or rendered in the UI. Log the detail
server-side, and return a generic, safe status to the client.

**Why:** a client-facing `source`/status string ends up in the API payload, the
network tab, and possibly the visible UI — leaking the secret to anyone inspecting
the page, even when the key is invalid (an invalid key still tells an attacker the
key format and that it was tried).

**How to apply:** in each adapter's catch block, `console.warn` the real error but
set the client-visible message to something generic like
"<service> unavailable (check API key); demo data active".
