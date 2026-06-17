# HypeCast

HypeCast is a React + Node.js prototype for a live music prep experience. A fan enters a city and favorite artist, then gets a personalized five-minute hype podcast with show details, setlist themes, chorus cues, hook beds, and a narrated script.

## Architecture

- **Backend/Server**: Plain Node.js (`node:http`) server in `server/index.js`. Serves the static frontend from `public/` and exposes a JSON API.
  - `server/hypecastEngine.js` — builds the HypeCast episode payload.
  - `server/serviceAdapters.js` — adapters for external services (JamBase, Musixmatch, LALAL.AI, ElevenLabs) with demo fallbacks.
- **Frontend**: React 18 loaded from a CDN in `public/index.html`, app logic in `public/app.js`, styles in `public/styles.css`.
- **API endpoints**:
  - `GET /api/health` — health check.
  - `POST /api/hypecast` — generates a HypeCast episode from `{ city, artist }`.

## Replit Environment

- The server binds to `0.0.0.0` and listens on port `5000` (overridable via `PORT`).
- One workflow, "Start application", runs `npm run dev` (which runs `node server/index.js`) on port 5000.
- No external dependencies to install; the app uses Node built-ins and a browser CDN for React.

## External Services (optional)

The app runs with demo fallbacks when API keys are absent. Configure keys via Replit Secrets / environment variables (see `.env.example`):
`JAMBASE_API_KEY`, `MUSIXMATCH_API_KEY`, `LALAL_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`.

## Deployment

- Target: `autoscale` (stateless web app).
- Run command: `npm run start`.

## User Preferences

(none recorded yet)
