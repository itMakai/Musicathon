# HypeCast

HypeCast is a React and Node.js prototype for a live music prep experience. A fan enters a city and favorite artist, then gets a personalized five-minute hype podcast with show details, setlist themes, chorus cues, hook beds, and a narrated script.

## Run

```bash
npm.cmd run dev
```

Open the URL printed by the server. The app uses React 18 from the browser CDN and Node's built-in HTTP server, so there are no package dependencies to install.

## Hackathon API Shape

The app is wired around the requested stack with runnable demo fallbacks:

- JamBase: `fetchUpcomingConcert()` provides concert date, city, venue, and confidence metadata.
- Musixmatch Pro API: `fetchLyricsInsights()` provides emotional themes, trivia, and chorus cues without exposing copyrighted lyrics in the demo.
- LALAL.AI: `extractInstrumentalHooks()` provides five-second hook descriptors used by the browser synth bed.
- ElevenLabs: `prepareVoiceNarration()` marks the voice layer; the browser uses Web Speech API narration until a real ElevenLabs request is connected.

Add keys to `.env` or your shell using `.env.example` as the reference. The current adapters detect configured keys and keep the demo fallback active, which keeps the prototype dependable during judging while leaving the service boundaries clear.

## Regenerating the deck screenshot

Slide 4 of the pitch deck (`public/deck.html`) shows a screenshot of the running
player saved at `public/assets/player-ui.jpg`. Whenever the player UI changes
(`public/app.js` / `public/styles.css`), regenerate it so the slide stays in sync:

```bash
npm run capture:player
```

The script (`scripts/capture-player-ui.mjs`) boots the real server on an isolated
port, loads `/`, waits for the episode to auto-build (it handles the ~950ms loader
fade by waiting for the loading overlay to detach and the player to render), then
saves a 1280×720 retina JPEG. It uses the Replit-provided Chromium via
`playwright-core` (a devDependency) — no browser download is performed.
