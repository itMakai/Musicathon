---
name: Musixmatch surfaces & Lyrics-Sync plan tier
description: Which Musixmatch API surfaces HypeCast consumes, and why synced lyrics fall back to lrclib.
---

HypeCast consumes three Musixmatch surfaces (all via `apikey` query param on `api.musixmatch.com/ws/1.1`):
- **Catalog** — `matcher.track.get` resolves a text query to the canonical `commontrack_id` plus metadata (album, release date, explicit, has_lyrics, has_subtitles). Used to fetch lyrics by exact id and to show album/year/explicit badges.
- **Lyrics** — `track.lyrics.get?commontrack_id=` for plain lyrics by canonical id (more accurate than the old text `matcher.lyrics.get`, which remains a fallback).
- **Lyrics-Sync** — `track.subtitle.get?commontrack_id=` for time-aligned `[{time,text}]`.

**Why synced lyrics fall back to lrclib:** the Musixmatch **trial/free plan does NOT grant `track.subtitle.get`** — it returns a non-200 (e.g. 401/402) even though the catalog reports `has_subtitles: true`. So real synced lines come from **lrclib.net** (free LRC, parsed by `parseLrc`), attached as a *supplement* in `fetchRawLyrics` whenever the chosen text source lacks time-alignment. The service label then reads e.g. `"Musixmatch + lrclib sync"`.

**How to apply:** if the user upgrades the Musixmatch plan, `musixmatchSubtitle` will start returning data and Musixmatch sync will be preferred (the lrclib supplement only runs when `result.synced` is empty). Don't assume `has_subtitles: true` means subtitles are actually fetchable on the current key.

**Karaoke caveat:** the iTunes 30s preview is a mid-song clip with no known offset into the full track, so synced timestamps (full-song-relative) cannot align to it. The frontend `SyncedLyrics` component drives its highlight from the timestamps on their own interval clock, NOT from the preview audio.
