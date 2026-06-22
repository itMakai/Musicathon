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
  - `POST /api/track-analysis` — runs a track's iTunes preview through Cyanite.ai AI music analysis (`{ artist, title }` → JSON with mood/genre/energy/BPM/key/positivity); returns 503 when Cyanite is unconfigured. Rate-limited per client; finished analyses are cached in-memory.
  - `POST /api/hypecast/playlist-terms` — convenience helper for automation tools (e.g. n8n → Spotify). Generates an episode from `{ city, artist }` and returns `{ artist, city, count, terms, tracks }`, where `terms` is an array of clean `"Artist – Title"` search strings and `tracks` carries `{ title, artist, term, query }` per song.

## Live Integrations

All adapters make real HTTP calls when their key is present, and degrade gracefully to demo data otherwise:
- **Songstats** (`apikey` header) — searches the artist, fetches current top tracks. Drives the real setlist for artists without a curated profile and overlays chart position / stream counts onto every track. Response envelopes are loosely typed and parsed defensively.
- **Musixmatch** (`apikey` query) — uses three surfaces: **Catalog** (`matcher.track.get` → canonical `commontrack_id` + album / release date / explicit / has_subtitles metadata, shown as badges), **Lyrics** (`track.lyrics.get` by id, with legacy `matcher.lyrics.get` as fallback), and **Lyrics-Sync** (`track.subtitle.get` → time-aligned `[{time,text}]`). The non-commercial disclaimer is stripped for display while `lyrics_copyright` is surfaced. Falls back to lyrics.ovh / lrclib for plain text only. Time-aligned (karaoke) lyrics come exclusively from Musixmatch's `track.subtitle.get` (requires a commercial Musixmatch plan), surfaced with a "⏱ Synced via Musixmatch" badge. The frontend "⏱ Synced" view renders a karaoke highlight driven by the timestamps' own clock (the 30s iTunes preview is a mid-song clip and can't be aligned to full-song timestamps).
- **JamBase** (`apikey` query) — fetches the soonest upcoming event for the artist/city. Upstream errors are logged server-side only (never surfaced to the client, since the body echoes the key).
- **LALAL.AI** (`Authorization: license <key>`) — separates the vocals from a track's iTunes preview and serves the instrumental "no_vocals" stem as the podcast's background music bed. The browser layers it under the narration (with a synthesized bed as the instant fallback while LALAL processes).
- **ElevenLabs** (`xi-api-key` header) — text-to-speech for the narrated script.
- **Cyanite.ai** (`Authorization: Bearer <key>`, GraphQL) — on-demand AI music analysis. Per track, the server uploads the iTunes preview (`fileUploadRequest` → PUT to the presigned URL → `libraryTrackCreate`), polls `audioAnalysisV7` until finished, and returns mood/genre/energy/BPM/key/positivity tags. Surfaced via the per-track "Analyze Vibe" button. Errors are logged server-side; the access token is never echoed to the client.

## Replit Environment

- The server binds to `0.0.0.0` and listens on port `5000` (overridable via `PORT`).
- One workflow, "Start application", runs `npm run dev` (which runs `node server/index.js`) on port 5000.
- No external dependencies to install; the app uses Node built-ins and a browser CDN for React.

## External Services (optional)

The app runs with demo fallbacks when API keys are absent. Configure keys via Replit Secrets / environment variables (see `.env.example`):
`JAMBASE_API_KEY`, `MUSIXMATCH_API_KEY`, `LALAL_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `CYANITE_API_KEY`.

## Deployment

- Target: `autoscale` (stateless web app).
- Run command: `npm run start`.

## User Preferences

(none recorded yet)
