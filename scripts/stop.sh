#!/usr/bin/env bash
set -euo pipefail

PORT=8080

pids=$(pgrep -f "http.server ${PORT}" || true)
if [ -z "${pids}" ]; then
  echo "Nenhum servidor SpaceRun rodando na porta ${PORT}."
  exit 0
fi

echo "Parando servidor SpaceRun na porta ${PORT} (PID(s): ${pids})..."
# tenta encerramento gracioso; força se necessário
kill ${pids} 2>/dev/null || true
sleep 1
pids=$(pgrep -f "http.server ${PORT}" || true)
if [ -n "${pids}" ]; then
  kill -9 ${pids} 2>/dev/null || true
fi

echo "Servidor parado."
