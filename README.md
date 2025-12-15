# Codex-Class Chatbot & Agent Platform

This repository is a clean, modular starting point for building a self-hosted, cost-optimized AI platform that combines conversational chat, engineering-grade agent tooling, and home automation control.

## Monorepo Layout
- `web/` – React-based web UI with chat, multi-session navigation, model/provider selectors, tool-log panel, code editor placeholders, and live preview framing.
- `server/` – Node.js API gateway handling authentication scaffolding, REST/WebSocket endpoints, proxying chat/model calls to the agent runtime, file transfer surfaces, and preview proxy hooks.
- `agent/` – Python control plane for conversational reasoning, LLM routing across providers (Together or self-hosted OpenAI-compatible), tool orchestration, and execution management.
- `docs/` – Additional design notes and specifications.

## Quickstart
1. Install dependencies for the JavaScript projects:
   ```bash
   npm install --prefix web
   npm install --prefix server
   ```
2. Install Python dependencies:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r agent/requirements.txt
   ```
3. Start the services (each in its own terminal):
 - React UI: `npm run dev --prefix web`
 - Node API: `npm run dev --prefix server`
  - Python agent runtime: `python -m agent.runtime.app`

### Environment

Copy `.env.example` to `.env` and set your credentials. At minimum set `TOGETHER_API_KEY` for Together usage or `LOCAL_OPENAI_BASE_URL`/`LOCAL_OPENAI_API_KEY` for a self-hosted endpoint. The React UI lets you toggle between providers/models at runtime.

## Design Goals
- **Conversation-first** with real-time updates via WebSockets.
- **Tool power** through a plugin-like tool registry and controlled runtimes.
- **Cost-aware** by prioritizing self-hosted small models and escalating only when necessary.
- **Extensible** with clearly separated UI, API, and agent layers.

See `docs/architecture.md` for the high-level architecture plan.
