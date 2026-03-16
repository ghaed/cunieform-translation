#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Start the Cuneiform Translation Portal
# ---------------------------------------------------------------------------
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Create venv if it doesn't exist
if [ ! -f "venv/bin/python3" ]; then
  echo "Creating Python virtual environment..."
  # Prefer Homebrew Python for ARM Macs; fall back to system python3
  PY="$(which python3.14 2>/dev/null || which python3.12 2>/dev/null || which python3.11 2>/dev/null || /opt/homebrew/bin/python3 2>/dev/null || python3)"
  "$PY" -m venv venv
  echo "Installing Flask..."
  venv/bin/pip install Flask --quiet
fi

PORT="${PORT:-5000}"
echo ""
echo "  𒁾  Cuneiform Translation Portal"
echo "  ─────────────────────────────────────────"
echo "  Server : http://127.0.0.1:${PORT}"
echo "  To stop: Ctrl-C"
echo ""

FLASK_APP=app FLASK_ENV=development \
  venv/bin/python3 -m flask run --host 0.0.0.0 --port "$PORT"
