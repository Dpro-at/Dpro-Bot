#!/bin/bash
# Dpro Bot — Backend Self-Restart (Linux/Mac)
#
# Usage:
#   bash packages/backend/restart-backend.sh
#
# How it works:
#   Spawns a background subshell that kills port 41522 and restarts pnpm dev.
#   The & at the end detaches it from the parent process.

DIR="$(cd "$(dirname "$0")" && pwd)"

(
  sleep 2
  # Kill whatever is listening on port 41522
  kill $(lsof -t -i:41522 2>/dev/null) 2>/dev/null || true
  sleep 1
  cd "$DIR"
  pnpm dev
) &

echo "Restart initiated. Backend will be back in ~5 seconds."
echo "Frontend will reconnect automatically."
