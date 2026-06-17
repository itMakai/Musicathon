const http = require("node:http");
const path = require("node:path");
const { promises: fs } = require("node:fs");
const { buildHypecast } = require("./hypecastEngine");

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
