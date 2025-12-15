import logging
from typing import Any, Dict, List

try:
  from duckduckgo_search import DDGS
except Exception:  # noqa: BLE001
  DDGS = None  # type: ignore[misc]

from ..tooling import Tool


def _web_search(payload: Dict[str, Any]) -> Dict[str, Any]:
  if DDGS is None:
    raise RuntimeError("duckduckgo_search not installed; cannot perform web search")

  query = payload.get("query")
  if not query:
    raise ValueError("query required")
  max_results = int(payload.get("max_results") or 5)
  logging.info("[tool:web_search] query=%s max_results=%s", query, max_results)

  with DDGS() as ddgs:
    results: List[Dict[str, Any]] = []
    for item in ddgs.text(query, max_results=max_results):
      results.append({
        "title": item.get("title"),
        "href": item.get("href"),
        "body": item.get("body"),
      })
  return {"results": results}


def build_tools() -> List[Tool]:
  return [
    Tool(
      name="web_search",
      description="Search the web deterministically and return top results.",
      schema={"query": "string", "max_results": "int?"},
      run=_web_search,
      origin="builtin",
    )
  ]
