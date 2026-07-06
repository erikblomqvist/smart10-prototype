#!/usr/bin/env bash
#
# One command: build the production bundle against the Supabase stub, serve it,
# play N rounds, print per-round memory as CSV, tear everything down.
#
#   ./run.sh                        # chromium, 15 rounds
#   ENGINE=webkit ROUNDS=20 ./run.sh
#   SKIP_BUILD=1 ./run.sh           # reuse an existing build (faster iterations)
#
# Env: ENGINE (chromium|webkit), ROUNDS, REVEALS, APP_PORT, SKIP_BUILD.
# STUB_PORT is fixed because the stub URL is baked into the client bundle at
# build time — change it here and it must match stub-supabase.mjs.

set -euo pipefail

ENGINE="${ENGINE:-chromium}"
ROUNDS="${ROUNDS:-15}"
REVEALS="${REVEALS:-3}"
APP_PORT="${APP_PORT:-5299}"
STUB_PORT=54321
STUB_URL="http://127.0.0.1:${STUB_PORT}"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"

STUB_PID=""
PREVIEW_PID=""
cleanup() {
	[ -n "$PREVIEW_PID" ] && kill "$PREVIEW_PID" 2>/dev/null || true
	[ -n "$STUB_PID" ] && kill "$STUB_PID" 2>/dev/null || true
	# Backstops: `bun run preview` forks vite, and killing the bun parent can
	# orphan it. Scope the patterns tightly to this harness's port and script.
	pkill -f "stub-supabase.mjs" 2>/dev/null || true
	pkill -f "vite preview.*--port ${APP_PORT}" 2>/dev/null || true
}
trap cleanup EXIT

# Harness deps (playwright) live only in this directory — never in the app's.
if [ ! -d "$HERE/node_modules/playwright" ]; then
	echo "==> installing harness deps"
	(cd "$HERE" && bun install)
	(cd "$HERE" && bunx playwright install chromium webkit)
fi

echo "==> starting supabase stub on :${STUB_PORT}"
bun "$HERE/stub-supabase.mjs" &
STUB_PID=$!
until curl -sf "$STUB_URL/rest/v1/decks" >/dev/null 2>&1; do sleep 0.3; done

export PUBLIC_SUPABASE_URL="$STUB_URL"
export PUBLIC_SUPABASE_PUBLISHABLE_KEY="stubkey"

if [ "${SKIP_BUILD:-0}" != "1" ]; then
	echo "==> building production bundle (stub URL baked in)"
	# The Vercel adapter's packaging step fails on Node >= 26, but that runs
	# AFTER Vite writes the client bundle, which is all `vite preview` needs.
	# So tolerate a non-zero exit and check for the actual output instead.
	(cd "$ROOT" && bun run build) || true
fi
if [ ! -d "$ROOT/.svelte-kit/output/client/_app" ]; then
	echo "!! no client build found — run without SKIP_BUILD, or check the build" >&2
	exit 1
fi

echo "==> serving on :${APP_PORT}"
(cd "$ROOT" && bun run preview -- --port "$APP_PORT" --strictPort) &
PREVIEW_PID=$!
until curl -sf "http://localhost:${APP_PORT}/setup" >/dev/null 2>&1; do sleep 0.3; done

echo "==> driving ${ROUNDS} rounds on ${ENGINE}"
cd "$HERE"
BASE="http://localhost:${APP_PORT}" ENGINE="$ENGINE" ROUNDS="$ROUNDS" \
	REVEALS="$REVEALS" node gameloop.mjs
