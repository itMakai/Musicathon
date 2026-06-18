---
name: LALAL.AI stem-separation pipeline
description: How to drive LALAL.AI to extract an instrumental "no_vocals" stem, and its quirks
---

# LALAL.AI stem separation

Auth header is `Authorization: license <key>` (NOT Bearer / NOT a query param).

Pipeline to turn a track into an instrumental bed:
1. Get a source audio URL (we use the track's iTunes preview ~30s).
2. `POST /api/upload/` the raw audio bytes → returns an upload `id`.
3. `POST /api/split/` with params to request separation. Use `stem: "vocals"` and
   `splitter: "phoenix"`.
4. Poll `POST /api/check/` with the **id as a plain string body** (not JSON-wrapped).
   The result is keyed by id: `result[id].task.state` (`success` when done) and the
   instrumental lives at `result[id].split.back_track` (the "no_vocals" stem). The
   vocals-only stem is `stem_track`.
5. Download `back_track` URL → that is the instrumental hook bed.

**Why these specifics:** the check endpoint is finicky — sending JSON or wrapping the
id breaks it; it expects the bare id. `back_track` (not `stem_track`) is the
instrumental because we asked to separate the `vocals` stem out.

**How to apply:** finished beds are cached in-memory (Map, bounded). End-to-end is
~9s, so the frontend plays a synthesized bed immediately and swaps to the LALAL
instrumental once `/api/hookbed` returns.
