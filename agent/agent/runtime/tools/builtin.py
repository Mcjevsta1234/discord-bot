import logging
from typing import Any, Dict, List

from ..tooling import Tool


def build_tools() -> List[Tool]:
  return [
    Tool(
      name="calculator",
      description="Evaluate simple math expressions deterministically",
      schema={"expression": "string"},
      run=lambda payload: {"result": eval(payload.get("expression", "0"))},
      origin="builtin",
    ),
    Tool(
      name="fetch",
      description="Queue a deterministic fetch of a URL",
      schema={"url": "string"},
      run=lambda payload: {"status": "queued", "url": payload.get("url")},
      origin="builtin",
    ),
  ]
