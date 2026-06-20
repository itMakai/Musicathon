---
name: Cyanite ingest requires MP3, iTunes previews are AAC
description: Cross-API gotcha — transcode iTunes preview audio to MP3 before uploading to Cyanite.ai
---

# Cyanite ingest needs real MP3; iTunes previews are AAC/.m4a

When feeding a track's iTunes preview into Cyanite.ai's audio analysis upload
flow (fileUploadRequest → PUT → libraryTrackCreate), the bytes must be a real
MP3. iTunes `previewUrl` files are AAC in an `.m4a` container (HTTP
`content-type: audio/x-m4p`), so uploading them unchanged while forcing
`Content-Type: audio/mpeg` mislabels the file and the analysis can fail.

**Why:** Cyanite only ingests MP3; iTunes does not serve MP3 previews.
**How to apply:** Transcode the downloaded preview buffer to MP3 with ffmpeg
(piped, `-f mp3`) before the presigned PUT. ffmpeg is available in this Repl.
A valid MP3 starts with the ASCII bytes `ID3` (`0x494433`) — useful smoke check.

## Cyanite auth + intermittent 5xx
- Auth header is `Authorization: Bearer <token>`. A valid token is a long
  JWT (3 dot-separated segments, ~335 chars), NOT a short hex string — a
  short token returns HTTP 200 with GraphQL `ERR_NOT_AUTHORIZED`.
- `fileUploadRequest` intermittently returns HTTP 500 ("Internal Server
  Error", non-JSON body). Retry transient 5xx / non-JSON / network failures
  with backoff; GraphQL-level errors (200 + `errors[]`) are not retryable.
