---
name: Musixmatch surfaces & Lyrics-Sync plan tier
description: Which Musixmatch API surfaces HypeCast consumes, and why synced lyrics are Musixmatch-only.
---

HypeCast consumes three Musixmatch surfaces (all via `apikey` query param on `api.musixmatch.com/ws/1.1`):
- **Catalog** — `matcher.track.get` resolves a text query to the canonical `commontrack_id` plus metadata (album, release date, explicit, has_lyrics, has_subtitles). Used to fetch lyrics by exact id and to show album/year/explicit badges.
- **Lyrics** — `track.lyrics.get?commontrack_id=` for plain lyrics by canonical id (more accurate than the old text `matcher.lyrics.get`, which remains a fallback).
- **Lyrics-Sync** — `track.subtitle.get?commontrack_id=` for time-aligned `[{time,text}]`.

**Synced lyrics are Musixmatch-only by user decision.** lrclib was previously used to *supplement* synced (karaoke) lines when Musixmatch's `track.subtitle.get` returned nothing, but the user asked to remove lrclib sync entirely so the project focuses on Musixmatch alone. lrclib.net remains only as a **plain-text** fallback (alongside lyrics.ovh) in `fetchRawLyrics`; it no longer contributes timestamps. `parseLrc`/`fetchLrclibSynced` were removed.
**Why:** product wants synced lyrics attributed to a single provider (Musixmatch). The per-card badge reads "⏱ Synced via Musixmatch".

**Plan-tier caveat:** the Musixmatch **trial/free plan does NOT grant `track.subtitle.get`** — it returns a non-200 (e.g. 401/402) even though the catalog reports `has_subtitles: true`. So on the trial key `syncedLyrics` is empty and the "⏱ Synced" view simply doesn't appear. Upgrading the Musixmatch plan makes `musixmatchSubtitle` start returning data and the karaoke view returns automatically. Don't assume `has_subtitles: true` means subtitles are actually fetchable on the current key.

**Karaoke caveat:** the iTunes 30s preview is a mid-song clip with no known offset into the full track, so synced timestamps (full-song-relative) cannot align to it. The frontend `SyncedLyrics` component drives its highlight from the timestamps on their own interval clock, NOT from the preview audio.
