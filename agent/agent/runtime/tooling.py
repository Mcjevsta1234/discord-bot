from dataclasses import dataclass
from typing import Callable, Dict, Any


@dataclass
class Tool:
  name: str
  description: str
  schema: Dict[str, Any]
  run: Callable[[Dict[str, Any]], Dict[str, Any]]


class ToolRegistry:
  def __init__(self):
    self._tools: Dict[str, Tool] = {}
    self.register(
      Tool(
        name="calculator",
        description="Evaluate simple math expressions",
        schema={"expression": "string"},
        run=lambda payload: {"result": eval(payload.get("expression", "0"))},
      )
    )
    self.register(
      Tool(
        name="fetch",
        description="Fetch a URL deterministically",
        schema={"url": "string"},
        run=lambda payload: {"status": "queued", "url": payload.get("url")},
      )
    )

  def register(self, tool: Tool):
    self._tools[tool.name] = tool

  def describe(self):
    return [
      {
        "name": tool.name,
        "description": tool.description,
        "schema": tool.schema,
      }
      for tool in self._tools.values()
    ]

  def run(self, name: str, payload: Dict[str, Any]):
    tool = self._tools.get(name)
    if not tool:
      raise KeyError(f"tool {name} not registered")
    return tool.run(payload)
