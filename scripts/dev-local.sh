#!/usr/bin/env bash
# Run Next.js from C: where node_modules is installed (D: drive is too full).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
C_ROOT="/c/Users/kremb/dev/clip-logic-pro/job_tracker_pro"

if [[ ! -d "$C_ROOT/node_modules/next" ]]; then
  echo "Missing C: install. Run once:"
  echo "  cd $C_ROOT && npm install"
  exit 1
fi

mkdir -p "$C_ROOT"

# Stop stale dev servers on common Next.js ports (Windows)
if command -v netstat >/dev/null 2>&1; then
  for port in 3000 3001 3002 3003; do
    pids=$(netstat -ano 2>/dev/null | grep -E ":${port}[[:space:]]" | grep LISTENING | awk '{print $NF}' | sort -u || true)
    for pid in $pids; do
      if [[ "$pid" =~ ^[0-9]+$ ]] && [[ "$pid" != "0" ]]; then
        taskkill //F //PID "$pid" >/dev/null 2>&1 || true
      fi
    done
  done
  sleep 1
fi

echo "Syncing project to C:..."
for item in src public package.json package-lock.json next.config.ts tsconfig.json postcss.config.mjs eslint.config.mjs proxy.ts README.md .env.example; do
  if [[ -e "$ROOT/$item" ]]; then
    cp -r "$ROOT/$item" "$C_ROOT/"
  fi
done
if [[ -f "$ROOT/.env.local" ]]; then
  cp "$ROOT/.env.local" "$C_ROOT/.env.local"
fi

rm -rf "$C_ROOT/.next"

echo "Starting dev server at $C_ROOT ..."
cd "$C_ROOT"
exec npx next dev --webpack "$@"
