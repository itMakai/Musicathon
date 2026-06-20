const http = require("node:http");
const path = require("node:path");
const { promises: fs } = require("node:fs");
const { buildHypecast } = require("./hypecastEngine");
const { synthesizeNarration, extractHookBed, analyzeTrackVibe } = require("./serviceAdapters");

const HOST = "0.0.0.0";
const START_PORT = Number.parseInt(process.env.PORT || "5000", 10);
const PUBLIC_DIR = path.join(__dirname, "..", "public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

// Lightweight in-memory sliding-window rate limiter. Used to protect the
// narration endpoint, which fronts a paid (ElevenLabs) API key, from abuse.
const NARRATION_WINDOW_MS = 60_000;
const NARRATION_MAX_HITS = 10;
const narrationHits = new Map();

function isRateLimited(key, max = NARRATION_MAX_HITS) {
  const now = Date.now();
  const recent = (narrationHits.get(key) || []).filter((t) => now - t < NARRATION_WINDOW_MS);
  if (recent.length >= max) {
    narrationHits.set(key, recent);
    return true;
  }
  recent.push(now);
  narrationHits.set(key, recent);
  return false;
}

function clientKey(request) {
  const forwarded = request.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return request.socket?.remoteAddress || "unknown";
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  response.end(body);
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1_000_000) {
        reject(new Error("Request body is too large."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("Request body must be valid JSON."));
      }
    });

    request.on("error", reject);
  });
}

async function serveStatic(request, response, url) {
  const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
      "Content-Length": file.length
    });
    response.end(file);
  } catch (error) {
    const fallback = await fs.readFile(path.join(PUBLIC_DIR, "index.html"));
    response.writeHead(404, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": fallback.length
    });
    response.end(fallback);
  }
}

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, { ok: true, name: "HypeCast" });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/hypecast") {
    try {
      const body = await readRequestBody(request);
      const episode = await buildHypecast(body);
      sendJson(response, 200, episode);
    } catch (error) {
      sendJson(response, 400, {
        error: error.message || "Unable to generate HypeCast."
      });
    }
    return;
  }

  // Convenience helper for automation tools (e.g. n8n → Spotify search):
  // generates an episode and returns clean "Artist – Title" search strings.
  if (request.method === "POST" && url.pathname === "/api/hypecast/playlist-terms") {
    try {
      if (isRateLimited(`playlist:${clientKey(request)}`, 6)) {
        sendJson(response, 429, { error: "Too many playlist-terms requests. Please wait a moment." });
        return;
      }
      const body = await readRequestBody(request);
      const episode = await buildHypecast(body);
      const artist = String(episode.artist || "").trim();
      const tracks = (Array.isArray(episode.setlist) ? episode.setlist : [])
        .map((track) => {
          const title = String((track && track.title) || "").trim();
          if (!title) return null;
          return {
            title,
            artist,
            term:  artist ? `${artist} \u2013 ${title}` : title,
            query: [artist, title].filter(Boolean).join(" ")
          };
        })
        .filter(Boolean);
      sendJson(response, 200, {
        artist,
        city:  String(episode.city || "").trim(),
        count: tracks.length,
        terms: tracks.map((t) => t.term),
        tracks
      });
    } catch (error) {
      sendJson(response, 400, {
        error: error.message || "Unable to build playlist terms."
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/narration") {
    try {
      if (isRateLimited(`narration:${clientKey(request)}`)) {
        sendJson(response, 429, { error: "Too many narration requests. Please wait a moment." });
        return;
      }
      const body = await readRequestBody(request);
      const script = String(body.script || "").trim();
      if (!script) {
        sendJson(response, 400, { error: "A script is required." });
        return;
      }
      if (script.length > 5000) {
        sendJson(response, 413, { error: "Script is too long for narration." });
        return;
      }
      const result = await synthesizeNarration({ script, voiceId: body.voiceId });
      if (!result) {
        sendJson(response, 503, { error: "ElevenLabs narration is not configured." });
        return;
      }
      response.writeHead(200, {
        "Content-Type": result.contentType || "audio/mpeg",
        "Content-Length": result.buffer.length,
        "Cache-Control": "no-store"
      });
      response.end(result.buffer);
    } catch (error) {
      sendJson(response, 502, { error: error.message || "Narration synthesis failed." });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/hookbed") {
    try {
      if (isRateLimited(`hookbed:${clientKey(request)}`, 6)) {
        sendJson(response, 429, { error: "Too many hook requests. Please wait a moment." });
        return;
      }
      const body = await readRequestBody(request);
      const artist = String(body.artist || "").trim();
      const title  = String(body.title  || "").trim();
      if (!artist || !title) {
        sendJson(response, 400, { error: "artist and title are required." });
        return;
      }
      const bed = await extractHookBed({ artist, title });
      if (!bed) {
        sendJson(response, 503, { error: "LALAL.AI hook beds are not configured." });
        return;
      }
      response.writeHead(200, {
        "Content-Type": bed.contentType || "audio/mpeg",
        "Content-Length": bed.buffer.length,
        "Cache-Control": "no-store"
      });
      response.end(bed.buffer);
    } catch (error) {
      sendJson(response, 502, { error: error.message || "Hook extraction failed." });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/track-analysis") {
    try {
      if (isRateLimited(`vibe:${clientKey(request)}`, 6)) {
        sendJson(response, 429, { error: "Too many analysis requests. Please wait a moment." });
        return;
      }
      const body = await readRequestBody(request);
      const artist = String(body.artist || "").trim();
      const title  = String(body.title  || "").trim();
      if (!artist || !title) {
        sendJson(response, 400, { error: "artist and title are required." });
        return;
      }
      const vibe = await analyzeTrackVibe({ artist, title });
      if (!vibe) {
        sendJson(response, 503, { error: "Cyanite.ai music analysis is not configured." });
        return;
      }
      sendJson(response, 200, vibe);
    } catch (error) {
      sendJson(response, 502, { error: error.message || "Music analysis failed." });
    }
    return;
  }

  if (request.method === "GET" || request.method === "HEAD") {
    await serveStatic(request, response, url);
    return;
  }

  sendJson(response, 405, { error: "Method not allowed." });
}

function listen(port) {
  const server = http.createServer((request, response) => {
    handleRequest(request, response).catch((error) => {
      sendJson(response, 500, { error: error.message || "Server error." });
    });
  });

  server.on("error", (error) => {
    throw error;
  });

  server.listen(port, HOST, () => {
    console.log(`HypeCast is running at http://${HOST}:${port}`);
  });
}

listen(START_PORT);
