#!/bin/sh

# Exit script on error
set -e

# --- [1] Run Drizzle migration ---
echo "[entrypoint] Running Drizzle migrations..."
bun drizzle-kit migrate

# --- [2] Run Bun server ---
echo "[entrypoint] Starting Auth Service..."
exec bun start