#!/usr/bin/env bash
set -euo pipefail

# Simple installer for Ubuntu to bring up the Witchy World stack with a local 3B-ish model
# that fits in ~6GB RAM. Intended to be runnable via a single line, e.g.:
#   curl -fsSL https://agent.witchy.world/install.sh | sudo bash
# The script supports overrides via environment variables.

PROJECT_ROOT=${PROJECT_ROOT:-/opt/witchy-world}
NODE_VERSION=${NODE_VERSION:-18}
PYTHON_BIN=${PYTHON_BIN:-python3}
LOCAL_MODEL=${LOCAL_MODEL:-llama3.2:3b}
GIT_URL=${GIT_URL:-}
BRANCH=${BRANCH:-main}

sudo apt-get update
sudo apt-get install -y curl git rsync ${PYTHON_BIN} ${PYTHON_BIN}-venv build-essential

# Node.js
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

mkdir -p "$PROJECT_ROOT"
cd "$PROJECT_ROOT"

# clone if requested (supports one-liner remote execution)
if [ -n "$GIT_URL" ] && [ ! -d .git ]; then
  git init
  git remote add origin "$GIT_URL"
  git fetch origin "$BRANCH"
  git checkout -b "$BRANCH" --track "origin/$BRANCH"
fi

# copy current repo content if running from a dev container
if [ -d /workspace/discord-bot ] && [ ! -d agent ]; then
  rsync -a /workspace/discord-bot/ "$PROJECT_ROOT"/
fi

# default env if missing
if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
fi

# Python deps
${PYTHON_BIN} -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r agent/requirements.txt

# Node deps (best-effort if registry is restricted)
npm install --prefix server || true
npm install --prefix web || true

# pm2 setup
npm install -g pm2 || true
pm2 start "npm --prefix server run dev" --name witchy-gateway || true
pm2 start "${PYTHON_BIN} -m agent.runtime.app" --name witchy-agent || true
pm2 save || true

# Ollama for local models
if ! command -v ollama >/dev/null 2>&1; then
  curl -fsSL https://ollama.com/install.sh | sh
fi
ollama pull "$LOCAL_MODEL" || true

cat <<MSG
Installation complete. Services (pm2):
- witchy-gateway
- witchy-agent

Local model pulled: $LOCAL_MODEL
Edit .env with provider keys, then restart via pm2 restart witchy-gateway witchy-agent
MSG
