#!/usr/bin/env node
// Regenerates public/assets/player-ui.jpg — the "live working prototype"
// screenshot used on slide 4 of the pitch deck (public/deck.html).
//
// It boots the real HypeCast server, loads "/", waits for the episode to
// auto-build (the page generates on load behind a ~950ms loader fade in
// public/app.js onSubmit), then screenshots the rendered player.
//
// Usage:  npm run capture:player
//
// Requirements: the Replit-provided Chromium (exposed via
// REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE) and the playwright-core devDependency.
// No browser download is performed.

import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const PORT = Number(process.env.CAPTURE_PORT || 5050);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const OUT_PATH = path.join(ROOT, "public", "assets", "player-ui.jpg");
const VIEWPORT = { width: 1280, height: 720 };

const EXECUTABLE = process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE;

async function waitForHealth(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return;
    } catch (_) {
      // server not up yet
    }
    await sleep(250);
  }
  throw new Error(`Server did not become healthy at ${BASE_URL} within ${timeoutMs}ms`);
}

async function main() {
  if (!EXECUTABLE) {
    throw new Error(
      "REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE is not set — this script expects the Replit-provided Chromium binary."
    );
  }

  // Boot the real server on an isolated port so it never collides with the
  // running "Start application" workflow on 5000.
  const server = spawn(process.execPath, [path.join(ROOT, "server", "index.js")], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ["ignore", "inherit", "inherit"]
  });
  server.on("exit", (code) => {
    if (code && code !== 0 && !server.killed) {
      console.error(`Server exited early with code ${code}`);
    }
  });

  let browser;
  try {
    await waitForHealth();

    browser = await chromium.launch({ executablePath: EXECUTABLE });
    const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 });

    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });

    // The episode auto-builds on load behind the loading overlay. Wait for the
    // overlay to disappear and the rendered player to be visible.
    await page.waitForSelector(".loading-overlay", { state: "detached", timeout: 20000 });
    await page.waitForSelector(".player:not(.empty-state)", { state: "visible", timeout: 20000 });

    // Let the mood gradient / waveform settle before the shot.
    await sleep(400);

    await page.screenshot({
      path: OUT_PATH,
      type: "jpeg",
      quality: 90,
      clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height }
    });

    console.log(`Saved player screenshot → ${path.relative(ROOT, OUT_PATH)} (${VIEWPORT.width}x${VIEWPORT.height})`);
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (!server.killed) {
      server.kill("SIGTERM");
      // Give it a moment, then force-kill if still alive.
      const exited = once(server, "exit");
      const timed = sleep(3000).then(() => "timeout");
      const result = await Promise.race([exited.then(() => "exited"), timed]);
      if (result === "timeout") server.kill("SIGKILL");
    }
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
