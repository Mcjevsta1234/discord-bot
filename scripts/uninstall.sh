#!/usr/bin/env bash
set -euo pipefail

pm2 delete witchy-gateway || true
pm2 delete witchy-agent || true
pm2 save || true

if command -v ollama >/dev/null 2>&1; then
  ollama rm llama3.2:3b || true
fi

echo "Services removed. Delete repository directory manually if desired."
