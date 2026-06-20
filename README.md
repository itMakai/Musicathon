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
- Cyanite.ai: `analyzeTrackVibe()` runs a track's iTunes preview through Cyanite's GraphQL AudioAnalysisV7 (upload → analyze → poll) and returns mood/genre/energy/BPM/key/positivity, surfaced by the per-track "Analyze Vibe" button via `/api/track-analysis`.

Add keys to `.env` or your shell using `.env.example` as the reference. The current adapters detect configured keys and keep the demo fallback active, which keeps the prototype dependable during judging while leaving the service boundaries clear.
