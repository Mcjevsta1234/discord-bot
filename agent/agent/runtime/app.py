import os
from typing import Any, Dict, List, Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .tooling import ToolRegistry


class Settings(BaseModel):
  together_api_key: Optional[str] = os.getenv("TOGETHER_API_KEY")
  together_base_url: str = os.getenv("TOGETHER_BASE_URL", "https://api.together.xyz/v1")
  local_base_url: Optional[str] = os.getenv("LOCAL_OPENAI_BASE_URL")
  local_api_key: Optional[str] = os.getenv("LOCAL_OPENAI_API_KEY")
  default_model: str = os.getenv(
    "DEFAULT_MODEL", "togethercomputer/Apriel-1.6-15B-Thinker"
  )


def build_providers(settings: Settings) -> List[Dict[str, Any]]:
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
      "name": "local",
      "label": "Self-hosted",
      "type": "openai-compatible",
      "base_url": settings.local_base_url or "http://localhost:11434/v1",
      "api_key": settings.local_api_key,
      "default_model": "local/default",
      "models": [
        {"id": "local/default", "display": "Local small model"},
      ],
    }
  )

  return providers


settings = Settings()
app = FastAPI(title="Codex Agent Runtime", version="0.2.0")
app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)
tool_registry = ToolRegistry()
providers = build_providers(settings)


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


@app.get("/health")
def health():
  return {"status": "ok"}


@app.get("/tools")
def list_tools():
  return {"tools": tool_registry.describe()}


@app.get("/models")
def list_models():
  return {"providers": providers}


def resolve_provider(request: ChatRequest) -> Dict[str, Any]:
  for provider in providers:
    if provider["name"] == request.provider:
      return provider
  raise HTTPException(status_code=400, detail="provider not supported")


def build_messages_with_tools(messages: List[ChatMessage]) -> List[Dict[str, str]]:
  # Lightweight heuristic example: if the last message looks like math, run the calculator
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

  return {
    "message": {"role": "assistant", "content": content},
    "plan": plan,
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
