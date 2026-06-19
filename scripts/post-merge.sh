#!/bin/bash
set -e

# HypeCast uses Node built-ins only — no dependency install needed.
# Install deps only if a package-lock is present (future-proofing).
if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund
fi

# Validate the server entrypoints parse before the workflow restarts.
npm run check

# Refresh the slide-4 player screenshot so the deck never drifts from the live
# player UI. This boots Chromium + the server, which can be slow, so it is:
#   - time-bounded (so it can't hang the merge), and
#   - non-fatal (a capture failure must never block a merge).
# `set -e` is disabled around it intentionally.
set +e
timeout 25s npm run capture:player
capture_status=$?
set -e
if [ "$capture_status" -ne 0 ]; then
  if [ "$capture_status" -eq 124 ]; then
    echo "post-merge: capture:player timed out after 25s — skipping screenshot refresh (non-fatal)."
  else
    echo "post-merge: capture:player failed (exit $capture_status) — skipping screenshot refresh (non-fatal)."
  fi
fi
