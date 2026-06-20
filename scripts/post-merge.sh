#!/bin/bash
set -e

# HypeCast uses Node built-ins only — no dependency install needed.
# Install deps only if a package-lock is present (future-proofing).
if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund
fi

# Validate the server entrypoints parse before the workflow restarts.
npm run check
