import importlib
import logging
from dataclasses import dataclass
from pathlib import Path
from pkgutil import iter_modules
from typing import Callable, Dict, Any, List, Iterable


@dataclass
class Tool:
  name: str
  description: str
  schema: Dict[str, Any]
  run: Callable[[Dict[str, Any]], Dict[str, Any]]
  origin: str = "custom"


class ToolRegistry:
  """Lightweight modular tool registry inspired by Open WebUI plugins."""

  def __init__(self, tool_dir: Path | None = None):
    self._tools: Dict[str, Tool] = {}
    self.tool_dir = tool_dir or Path(__file__).parent / "tools"
    self.load_from_directory(self.tool_dir)

  def register(self, tool: Tool):
    logging.info("[tool-registry] register %s from %s", tool.name, tool.origin)
    self._tools[tool.name] = tool

  def describe(self):
    return [
      {
        "name": tool.name,
        "description": tool.description,
        "schema": tool.schema,
        "origin": tool.origin,
      }
      for tool in self._tools.values()
    ]

  def run(self, name: str, payload: Dict[str, Any]):
    tool = self._tools.get(name)
    if not tool:
      raise KeyError(f"tool {name} not registered")
    return tool.run(payload)

  def load_from_directory(self, directory: Path):
    directory.mkdir(parents=True, exist_ok=True)
    for module_info in iter_modules([str(directory)]):
      if module_info.name.startswith("__"):
        continue
      module_name = f"{__package__}.tools.{module_info.name}"
      try:
        module = importlib.import_module(module_name)
        if hasattr(module, "build_tools"):
          tools: Iterable[Tool] = module.build_tools()
          for tool in tools:
            self.register(tool)
      except Exception as exc:  # noqa: BLE001
        logging.exception("[tool-registry] failed to load %s: %s", module_name, exc)
