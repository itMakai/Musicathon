# HypeCast

HypeCast is a React + Node.js prototype for a live music prep experience. A fan enters a city and favorite artist, then gets a personalized five-minute hype podcast with show details, setlist themes, chorus cues, hook beds, and a narrated script.

## Architecture

- **Backend/Server**: Plain Node.js (`node:http`) server in `server/index.js`. Serves the static frontend from `public/` and exposes a JSON API.
  - `server/hypecastEngine.js` — builds the HypeCast episode payload.
  - `server/serviceAdapters.js` — adapters for external services (Songstats, JamBase, Musixmatch, LALAL.AI, ElevenLabs) with demo fallbacks.
- **Frontend**: React 18 loaded from a CDN in `public/index.html`, app logic in `public/app.js`, styles in `public/styles.css`.
- **API endpoints**:
  - `GET /api/health` — health check.
  - `POST /api/hypecast` — generates a HypeCast episode from `{ city, artist }`.
  - `POST /api/narration` — synthesizes the script as ElevenLabs audio (`{ script, voiceId? }` → `audio/mpeg`); returns 503 when ElevenLabs is unconfigured so the browser falls back to Web Speech. Rate-limited per client.
  - `POST /api/hookbed` — extracts a real instrumental "hook bed" for a track via LALAL.AI (`{ artist, title }` → audio); returns 503 when LALAL is unconfigured. Rate-limited per client; finished beds are cached in-memory.

## Live Integrations

All adapters make real HTTP calls when their key is present, and degrade gracefully to demo data otherwise:
- **Songstats** (`apikey` header) — searches the artist, fetches current top tracks. Drives the real setlist for artists without a curated profile and overlays chart position / stream counts onto every track. Response envelopes are loosely typed and parsed defensively.
- **Musixmatch** (`apikey` query) — `matcher.lyrics.get` is the primary lyrics source; the non-commercial disclaimer is stripped for display while `lyrics_copyright` is surfaced in the UI. Falls back to lyrics.ovh / lrclib.
- **JamBase** (`apikey` query) — fetches the soonest upcoming event for the artist/city. Upstream errors are logged server-side only (never surfaced to the client, since the body echoes the key).
- **LALAL.AI** (`Authorization: license <key>`) — separates the vocals from a track's iTunes preview and serves the instrumental "no_vocals" stem as the podcast's background music bed. The browser layers it under the narration (with a synthesized bed as the instant fallback while LALAL processes).
- **ElevenLabs** (`xi-api-key` header) — text-to-speech for the narrated script.

## Replit Environment

- The server binds to `0.0.0.0` and listens on port `5000` (overridable via `PORT`).
- One workflow, "Start application", runs `npm run dev` (which runs `node server/index.js`) on port 5000.
- The app runtime has no external dependencies; it uses Node built-ins and a browser CDN for React. The only package is a dev-only `playwright-core` used by the deck screenshot capture script.

## Pitch Deck

- `public/deck.html` is a standalone pitch deck. Slide 4 embeds a screenshot of the running player at `public/assets/player-ui.jpg`.
- Regenerate that screenshot after any player UI change with `npm run capture:player` (script: `scripts/capture-player-ui.mjs`). It boots the server on an isolated port, waits for the episode to auto-build past the loader fade, and saves a 1280×720 retina JPEG using the Replit-provided Chromium via `playwright-core`. No browser download is needed.

## External Services (optional)

The app runs with demo fallbacks when API keys are absent. Configure keys via Replit Secrets / environment variables (see `.env.example`):
`JAMBASE_API_KEY`, `MUSIXMATCH_API_KEY`, `LALAL_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`.

## Deployment

- Target: `autoscale` (stateless web app).
- Run command: `npm run start`.

## User Preferences

(none recorded yet)
