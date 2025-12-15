# Architecture Blueprint

## Overview
The platform is divided into three cooperating layers:

1. **React Web UI (`/web`)** – Primary interface for conversation, tool control, file management, and live previews.
2. **Node.js API Server (`/server`)** – Authentication, session handling, WebSocket gateway, file operations, and preview proxying. No AI reasoning lives here.
3. **Python Agent Runtime (`/agent`)** – Conversational reasoning, LLM routing, tool orchestration, execution control, and cost-optimization logic.

## Data Flow
```
React UI (web) <-> Node API (server) <-> Agent Runtime (agent) <-> LLM + Tools
```

## Core Requirements Mapping
- **Chat & Sessions:** Real-time WebSockets connecting UI to API gateway, which bridges to the agent runtime.
- **Authentication:** Email/password today, designed for JWT sessions and future OAuth providers.
- **Tools:** Plugin-style tool definitions with JSON schemas and permission scopes; hot-loadable in Python runtime.
- **Execution:** Sandboxed runtimes for Python/Node/Java with resource limits and captured IO.
- **Knowledge:** Ingestion and summarization pipeline with cached embeddings; context injection limited to relevant snippets.
- **Home Automation:** Integrations for Home Assistant/MQTT exposed as tools with explicit permission checks.
- **Cost Control:** Prefer self-hosted 1B–7B models (Ollama, LM Studio, or OpenAI-compatible endpoints), with escalation logic for larger tasks.

## Configuration
- Model endpoints and defaults live in environment variables and editable prompt files.
- Behavior controls (verbosity, creativity, safety, tool aggressiveness) are stored centrally and can be overridden per user or per chat.

## Extensibility
- Add new tools by implementing the shared interface under `agent/tools/` and registering them in `agent/runtime/tooling.py`.
- Add new UI panels by extending `web/src/components` and wiring to API routes defined in `server/src/routes`.
- Swap model providers by updating environment configs without code changes.
