---
name: Songstats API contract
description: How the Songstats enterprise API returns artist top-track data and its progressive-parameter quirk.
---

# Songstats enterprise API (api.songstats.com/enterprise/v1)

Auth: `apikey` request header (not a query param).

## Artist search
`GET /artists/search?q=<name>` → `{ result, message, results: [ { songstats_artist_id, name, avatar, site_url } ] }`.
Pick the result whose normalized `name` matches the query (first exact match), then use its `songstats_artist_id`.

## Top tracks — progressive required params (the gotcha)
`GET /artists/top_tracks` is a progressive-disclosure endpoint. With too few params it returns success **but no tracks** — instead it echoes back which param to supply next:
- no `metric` → `data: [{ source, metric: null, metric_options: [...] }]`
- `metric` but no `scope` → `data: [{ ..., scope: null, scope_options: ["total","week","month","year"] }]`
- full call returns actual tracks.

**Working call:** `top_tracks?songstats_artist_id=<id>&source=spotify&metric=streams&scope=total`

Track records are nested at `data[].top_tracks[]`, each `{ track_name, artist_name, image_url, rank_value, songstats_track_id }`. With `metric=streams`, `rank_value` is the total stream count. There is no chart-position field on this metric; list order is the rank.

**Why:** A success-200 with an empty/echo payload looks like "no data / bad parse" but is really "you didn't give me enough params yet." Always check whether `data[].metric_options`/`scope_options` are present before assuming a parsing bug.
