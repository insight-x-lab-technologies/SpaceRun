#!/usr/bin/env bash
set -euo pipefail

PORT=8080
DIR="$(cd "$(dirname "$0")/../src" && pwd)"

echo "Servindo SpaceRun em http://localhost:${PORT} (Ctrl+C para parar)"
exec python3 -m http.server "${PORT}" --directory "${DIR}"
