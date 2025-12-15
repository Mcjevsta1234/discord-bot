import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .tooling import ToolRegistry


class Settings(BaseModel):
  together_api_key: Optional[str] = os.getenv("TOGETHER_API_KEY")
  together_base_url: str = os.getenv("TOGETHER_BASE_URL", "https://api.together.xyz/v1")
  deepseek_api_key: Optional[str] = os.getenv("DEEPSEEK_API_KEY")
  deepseek_base_url: str = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
  openai_api_key: Optional[str] = os.getenv("OPENAI_API_KEY")
  openai_base_url: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
  openrouter_api_key: Optional[str] = os.getenv("OPENROUTER_API_KEY")
  openrouter_base_url: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
  local_base_url: Optional[str] = os.getenv("LOCAL_OPENAI_BASE_URL")
  local_api_key: Optional[str] = os.getenv("LOCAL_OPENAI_API_KEY")
  default_model: str = os.getenv(
    "DEFAULT_MODEL", "togethercomputer/Apriel-1.6-15B-Thinker"
  )
  custom_provider_path: str = os.getenv("CUSTOM_PROVIDER_PATH", "./providers.json")
  routing_path: str = os.getenv("ROUTING_CONFIG_PATH", "./routing.json")


DEFAULT_ROUTING = {
  "default_provider": "together",
  "heavy_provider": "deepseek",
  "search_provider": "together",
  "local_provider": "local",
}


def load_json_file(path: Path, default: Any) -> Any:
  if not path.exists():
    return default
  try:
    with path.open("r", encoding="utf-8") as handle:
      return json.load(handle)
  except json.JSONDecodeError:
    return default


def persist_json_file(path: Path, payload: Any):
  path.parent.mkdir(parents=True, exist_ok=True)
  with path.open("w", encoding="utf-8") as handle:
    json.dump(payload, handle, indent=2)


def build_providers(settings: Settings, custom: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
  providers: List[Dict[str, Any]] = []

  providers.append(
    {
      "name": "together",
      "label": "Together AI",
      "type": "openai-compatible",
      "base_url": settings.together_base_url,
      "api_key": settings.together_api_key,
      "default_model": settings.default_model,
      "models": [
        {
          "id": "togethercomputer/Apriel-1.6-15B-Thinker",
          "display": "Apriel 1.6 15B Thinker (Together)",
        },
        {
          "id": "togethercomputer/Apriel-1.5-15B-Thinker",
          "display": "Apriel 1.5 15B Thinker (Together)",
        },
      ],
    }
  )

  providers.append(
    {
      "name": "openai",
      "label": "OpenAI (ChatGPT)",
      "type": "openai-compatible",
      "base_url": settings.openai_base_url,
      "api_key": settings.openai_api_key,
      "default_model": "gpt-4o-mini",
      "models": [
        {"id": "gpt-4o-mini", "display": "GPT-4o mini (cost saver)"},
        {"id": "gpt-4o", "display": "GPT-4o"},
      ],
    }
  )

  providers.append(
    {
      "name": "deepseek",
      "label": "DeepSeek (heavy tasks)",
      "type": "openai-compatible",
      "base_url": settings.deepseek_base_url,
      "api_key": settings.deepseek_api_key,
      "default_model": "deepseek-coder",
      "models": [
        {"id": "deepseek-chat", "display": "DeepSeek Chat"},
        {"id": "deepseek-coder", "display": "DeepSeek Coder (analysis-heavy)"},
      ],
    }
  )

  providers.append(
    {
      "name": "openrouter",
      "label": "OpenRouter (multi-provider)",
      "type": "openai-compatible",
      "base_url": settings.openrouter_base_url,
      "api_key": settings.openrouter_api_key,
      "default_model": "google/gemini-1.5-flash-latest",
      "models": [
        {"id": "google/gemini-1.5-flash-latest", "display": "Gemini 1.5 Flash"},
        {"id": "meta-llama/llama-3.1-8b-instruct", "display": "Llama 3.1 8B"},
      ],
    }
  )

  providers.append(
    {
      "name": "local",
      "label": "Self-hosted",
      "type": "openai-compatible",
      "base_url": settings.local_base_url or "http://localhost:11434/v1",
      "api_key": settings.local_api_key,
      "default_model": "local/default",
      "models": [
        {"id": "local/default", "display": "Local small model"},
        {"id": "local/coder", "display": "Local coder"},
      ],
    }
  )

  providers.extend(custom)
  return providers


settings = Settings()
custom_provider_path = Path(settings.custom_provider_path)
custom_providers = load_json_file(custom_provider_path, [])
routing_path = Path(settings.routing_path)
routing_config: Dict[str, str] = load_json_file(routing_path, DEFAULT_ROUTING)
app = FastAPI(title="Codex Agent Runtime", version="0.3.0")
app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)
tool_registry = ToolRegistry()
providers = build_providers(settings, custom_providers)


class ChatMessage(BaseModel):
  role: str
  content: str


class ChatRequest(BaseModel):
  chat_id: str
  user_id: Optional[str] = None
  messages: List[ChatMessage] = Field(default_factory=list)
  provider: str = "together"
  model: Optional[str] = None
  temperature: float = 0.2
  max_output_tokens: int = 512
  api_key: Optional[str] = Field(None, description="override provider API key")


class ProviderDefinition(BaseModel):
  name: str
  label: str
  type: str = "openai-compatible"
  base_url: str
  api_key: Optional[str] = None
  default_model: str
  models: List[Dict[str, str]] = Field(default_factory=list)


class RoutingDefinition(BaseModel):
  default_provider: str
  heavy_provider: str
  search_provider: str
  local_provider: Optional[str] = None


@app.get("/health")
def health():
  return {"status": "ok"}


@app.get("/tools")
def list_tools():
  return {"tools": tool_registry.describe()}


@app.get("/models")
def list_models():
  return {"providers": providers}


@app.get("/providers")
def list_providers():
  return {"providers": providers}


@app.post("/providers")
def add_provider(definition: ProviderDefinition):
  global providers, custom_providers
  providers = [p for p in providers if p["name"] != definition.name]
  providers.append(definition.model_dump())
  custom_providers = [p for p in custom_providers if p.get("name") != definition.name]
  custom_providers.append(definition.model_dump())
  persist_json_file(custom_provider_path, custom_providers)
  return {"providers": providers}


@app.get("/routing")
def get_routing():
  return {"routing": routing_config}


@app.post("/routing")
def update_routing(definition: RoutingDefinition):
  global routing_config
  routing_config = definition.model_dump()
  persist_json_file(routing_path, routing_config)
  return {"routing": routing_config}


def resolve_provider(request: ChatRequest) -> Dict[str, Any]:
  routing_target = routing_config.get("default_provider", "together")

  # prefer explicit provider if present
  for provider in providers:
    if provider["name"] == request.provider:
      routing_target = provider["name"]
      break

  # heuristics for escalation
  if request.messages:
    last_content = request.messages[-1].content or ""
    if last_content.lower().startswith("search:"):
      routing_target = routing_config.get("search_provider", routing_target)
    elif len(last_content) > 1200 or "refactor" in last_content.lower():
      routing_target = routing_config.get("heavy_provider", routing_target)

  provider = next((p for p in providers if p["name"] == routing_target), None)
  if provider:
    return provider

  if providers:
    return providers[0]
  raise HTTPException(status_code=400, detail="provider not supported")


def build_messages_with_tools(messages: List[ChatMessage]) -> List[Dict[str, str]]:
  if not messages:
    return []
  last = messages[-1]
  augmented = [m.model_dump() for m in messages]
  if last.role == "user" and last.content.strip().startswith("calc("):
    expression = last.content.strip()[5:-1]
    try:
      result = tool_registry.run("calculator", {"expression": expression})
      augmented.append(
        {
          "role": "system",
          "content": f"Calculator result for {expression}: {result['result']}",
        }
      )
    except Exception as exc:  # noqa: BLE001
      augmented.append(
        {
          "role": "system",
          "content": f"Calculator failed for {expression}: {exc}",
        }
      )
  if last.role == "user" and last.content.lower().startswith("search:"):
    query = last.content.split(":", 1)[1].strip()
    try:
      result = tool_registry.run("web_search", {"query": query, "max_results": 3})
      formatted = "\n".join(
        f"- {item.get('title')}: {item.get('href')}" for item in result.get("results", [])
      )
      augmented.append(
        {
          "role": "system",
          "content": f"Search results for '{query}':\n{formatted}",
        }
      )
    except Exception as exc:  # noqa: BLE001
      augmented.append(
        {
          "role": "system",
          "content": f"Search failed for {query}: {exc}",
        }
      )
  return augmented


async def call_openai_compatible(
  base_url: str,
  api_key: str,
  model: str,
  messages: List[Dict[str, str]],
  temperature: float,
  max_tokens: int,
) -> str:
  payload = {
    "model": model,
    "messages": messages,
    "temperature": temperature,
    "max_tokens": max_tokens,
  }
  headers = {"Authorization": f"Bearer {api_key}"}
  async with httpx.AsyncClient(base_url=base_url, timeout=60) as client:
    response = await client.post("/chat/completions", json=payload, headers=headers)
    if response.status_code >= 400:
      raise HTTPException(status_code=response.status_code, detail=response.text)
    data = response.json()
    return data.get("choices", [{}])[0].get("message", {}).get("content", "")


@app.post("/chat")
async def chat(request: ChatRequest):
  provider = resolve_provider(request)
  model = request.model or provider["default_model"]
  api_key = request.api_key or provider.get("api_key")
  base_url = provider.get("base_url")

  if provider["type"] != "openai-compatible":
    raise HTTPException(status_code=400, detail="unknown provider type")
  if not api_key:
    raise HTTPException(status_code=400, detail="API key required for provider")
  if not base_url:
    raise HTTPException(status_code=400, detail="provider base URL missing")

  augmented_messages = build_messages_with_tools(request.messages)
  content = await call_openai_compatible(
    base_url,
    api_key,
    model,
    augmented_messages,
    request.temperature,
    request.max_output_tokens,
  )

  plan = [
    {
      "step": "route",
      "model": model,
      "provider": provider["name"],
      "reason": "OpenAI-compatible path",
    }
  ]
  if augmented_messages != [m.model_dump() for m in request.messages]:
    plan.append({"step": "tooling", "reason": "augmented with helper tools"})

  return {
    "message": {"role": "assistant", "content": content},
    "plan": plan,
    "routing": routing_config,
  }


@app.post("/tools/run/{name}")
def run_tool(name: str, payload: Dict[str, Any]):
  try:
    result = tool_registry.run(name, payload)
    return {"ok": True, "result": result}
  except KeyError:
    raise HTTPException(status_code=404, detail="tool not found")
  except Exception as exc:  # noqa: BLE001
    raise HTTPException(status_code=500, detail=str(exc))


if __name__ == "__main__":
  import uvicorn

  uvicorn.run("agent.runtime.app:app", host="0.0.0.0", port=5001, reload=False)
