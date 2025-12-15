# Witchy World Agent Platform

A clean, modular starting point for a self-hosted, cost-optimized AI platform that blends conversational chat, engineering-grade agents, web preview, and future home automation controls. The stack favors small/self-hosted models by default and escalates to stronger providers (DeepSeek, ChatGPT, etc.) only when needed.

## Monorepo Layout
- `web/` – React/Vite UI (dark themed, "Witchy World") with chat, routing inspector, provider manager, live preview iframe, and tool log.
- `server/` – Node.js API gateway for auth, REST/WebSocket fanout, Discord bridge endpoints, preview hosting, and proxying agent/runtime calls.
- `agent/` – FastAPI control plane with modular tool registry (Open WebUI-inspired), provider catalog, routing policies, DeepSeek escalation, and deterministic web search tooling.
- `scripts/` – VPS installer/uninstaller for Ubuntu that sets up the stack plus an optional local 3B model through Ollama.
- `docs/` – Architecture notes.

## Quickstart
1. Install JavaScript deps (may require a registry mirror in restricted environments):
   ```bash
   npm install --prefix web
   npm install --prefix server
   ```
2. Install Python deps:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r agent/requirements.txt
   ```
3. Copy env and set credentials:
   ```bash
   cp .env.example .env
   # edit the file with your keys
   ```
4. Run the services (separate terminals):
   - React UI: `npm run dev --prefix web`
   - Node API gateway: `npm run dev --prefix server`
   - Python agent runtime: `python -m agent.runtime.app`

**One-line VPS install (Ubuntu)**
```
curl -fsSL https://agent.witchy.world/install.sh | sudo bash
```
This maps to `scripts/install.sh`, which pulls the repo (when `GIT_URL` is set), installs dependencies, provisions pm2 services, and downloads a small Ollama model (`llama3.2:3b`) suitable for ~6GB hosts. Override `PROJECT_ROOT`, `LOCAL_MODEL`, or `GIT_URL` if desired.

## Environment Variables (what and how they are used)
| Variable | Usage |
| --- | --- |
| `AGENT_URL` | URL of the Python agent runtime the Node gateway proxies to. |
| `PORT` | Port the Node gateway listens on. |
| `JWT_SECRET` | Secret used to sign login tokens for multi-user sessions. |
| `TOGETHER_API_KEY` / `TOGETHER_BASE_URL` | Default Together AI credentials; used for Apriel 1.6/1.5 models and cost-friendly tasks. |
| `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` | Heavy-task provider (long code, refactors) automatically selected by routing heuristics. |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_BASE_URL` | Claude provider for high-quality reasoning; optional (can also be added via UI/API). |
| `GOOGLE_API_KEY` / `GOOGLE_API_BASE_URL` | Gemini provider; optional (can also be added via UI/API). |
| `OPENAI_API_KEY` / `OPENAI_BASE_URL` | ChatGPT-compatible provider for mainstream access. |
| `OPENROUTER_API_KEY` / `OPENROUTER_BASE_URL` | Multi-provider fallback (Gemini, Llama, etc.) when added to routing. |
| `LOCAL_OPENAI_BASE_URL` / `LOCAL_OPENAI_API_KEY` | Self-hosted OpenAI-compatible endpoint (Ollama/LM Studio) for cheap on-box inference. |
| `DEFAULT_MODEL` | Default Together model when the UI does not override. |
| `CUSTOM_PROVIDER_PATH` | JSON file where providers created in the UI/API are persisted. |
| `ROUTING_CONFIG_PATH` | JSON file storing the provider-model routing preferences set in the UI. |

## Feature Highlights
- **Modular tools**: DuckDuckGo web search (library-based, no external API account), calculator (sandboxed evaluator), fetch, and pluggable Python tool modules auto-loaded from `agent/agent/runtime/tools` (Open WebUI-style). Add new tool files with a `build_tools()` function to register them hot.
- **Provider catalog**: Together, OpenAI/ChatGPT, Anthropic (Claude), Gemini, DeepSeek, OpenRouter, and local OpenAI-compatible endpoints available by default; add more (or their API keys) from the UI without editing env files.
- **Routing control**: UI/agent endpoints let you map default/heavy/search/local tasks to different providers to balance cost vs. power.
- **Live preview**: Paste HTML or point to an existing dev server URL and view it inside the UI; previews are served via the Node gateway at `/preview/*` with dark-themed chrome.
- **Discord bridge**: `/api/discord/chat` forwards Discord channel messages to the agent for future bot wiring.
- **Multi-user auth**: JSON-backed storage with bcrypt + JWT cookies so multiple accounts can log in.
- **Model listing**: `/api/models` returns configured providers; `/api/models?live=true` fetches live model lists from OpenAI-compatible endpoints so users can pick from available models at runtime.

## VPS Installer (Ubuntu)
Scripts live in `scripts/`:
- `scripts/install.sh`: Installs Node.js, Python venv, dependencies, pm2, FastAPI/Node services, and Ollama with a default `llama3.2:3b` pull for cheap local tasks. Adjust variables inside the script for ports or models.
- `scripts/uninstall.sh`: Stops services, removes pm2 entries, and cleans the local Ollama model/data directory.

Run with:
```bash
chmod +x scripts/install.sh scripts/uninstall.sh
./scripts/install.sh
# ... later ...
./scripts/uninstall.sh
```

## Publishing to a fresh GitHub repository
If you want to publish this stack under a new repository name (for example, `witchy-agent`), create an empty repository on GitHub and point your local clone at it:

```bash
git remote remove origin  # optional: detach from the current remote
git remote add origin git@github.com:<your-account>/witchy-agent.git
git push -u origin work   # or the branch you are using
```

For HTTPS instead of SSH:

```bash
git remote remove origin
git remote add origin https://github.com/<your-account>/witchy-agent.git
git push -u origin work
```

These commands only affect your local clone; no credentials are stored in the repo. Once pushed, GitHub Actions or deployment hooks can be added in your new project without changing this codebase.

## Architecture Notes
- Conversation flows through the Node gateway (HTTP + WebSockets) to the FastAPI runtime.
- The runtime augments messages with tools (calculator, web search) before calling an OpenAI-compatible `/chat/completions` endpoint.
- Routing heuristics escalate to DeepSeek for long/refactor prompts; configurable mappings can override defaults.
- The UI reflects plan steps (provider/model/tooling) and exposes provider/routing management inline.

See `docs/architecture.md` for more details and extension ideas.
