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

kill_port() {
  local port="$1"
  local pids
  pids=$(netstat -ano 2>/dev/null | grep -E ":${port}[[:space:]]" | grep LISTENING | awk '{print $NF}' | sort -u || true)
  for pid in $pids; do
    if [[ "$pid" =~ ^[0-9]+$ ]] && [[ "$pid" != "0" ]]; then
      taskkill //F //PID "$pid" >/dev/null 2>&1 || true
    fi
  done
}

# Stop stale Next.js listeners so .next is not locked
if command -v netstat >/dev/null 2>&1; then
  for port in 3000 3001 3002 3003; do
    kill_port "$port"
  done
  sleep 2
fi

# Detect this PC's LAN IP so phone testing works (Next.js allowedDevOrigins)
LAN_IP=""
if command -v ipconfig >/dev/null 2>&1; then
  LAN_IP=$(ipconfig 2>/dev/null | grep -A 8 "Wi-Fi" | grep "IPv4" | head -1 | awk -F: '{print $2}' | tr -d ' \r' || true)
fi
if [[ -n "${LAN_IP:-}" ]]; then
  export ALLOWED_DEV_ORIGINS="${LAN_IP}${ALLOWED_DEV_ORIGINS:+,$ALLOWED_DEV_ORIGINS}"
  echo "Phone/LAN origin allowed: $LAN_IP"
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

cd "$C_ROOT"
if [[ ! -d "$C_ROOT/node_modules/@serwist/next" ]]; then
  echo "Installing npm dependencies on C:..."
  npm install
fi

# Optional cache wipe — never fail the start if files are still locked
if [[ -d "$C_ROOT/.next" ]]; then
  if rm -rf "$C_ROOT/.next" 2>/dev/null; then
    :
  else
    echo "Note: could not clear .next (still in use). Starting anyway."
  fi
fi

echo "Starting dev server at $C_ROOT ..."
exec npx next dev --webpack "$@"
