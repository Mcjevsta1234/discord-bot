from __future__ import annotations

import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from pydantic import BaseModel, Field


class ToolRequest(BaseModel):
    """Base request type."""


class ToolResponse(BaseModel):
    success: bool
    stdout: str = ""
    stderr: str = ""
    details: Dict[str, Any] = Field(default_factory=dict)


@dataclass
class Tool:
    name: str
    description: str
    handler: Callable[[ToolRequest], ToolResponse]


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: Dict[str, Tool] = {}

    def register(self, tool: Tool) -> None:
        if tool.name in self._tools:
            raise ValueError(f"Tool {tool.name} already registered")
        self._tools[tool.name] = tool

    def run(self, name: str, request: ToolRequest) -> ToolResponse:
        if name not in self._tools:
            raise KeyError(f"Tool {name} not found")
        return self._tools[name].handler(request)

    def list(self) -> List[Tool]:
        return list(self._tools.values())


def run_command(command: List[str], timeout: int = 60, cwd: Optional[Path] = None) -> ToolResponse:
    start = time.time()
    try:
        proc = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout,
            cwd=cwd,
            text=True,
            check=False,
        )
        return ToolResponse(
            success=proc.returncode == 0,
            stdout=proc.stdout,
            stderr=proc.stderr,
            details={"returncode": proc.returncode, "duration_sec": time.time() - start},
        )
    except subprocess.TimeoutExpired as exc:
        return ToolResponse(success=False, stdout=exc.stdout or "", stderr="Timed out", details={"duration_sec": time.time() - start})
    except Exception as exc:  # pragma: no cover
        return ToolResponse(success=False, stderr=str(exc), details={"duration_sec": time.time() - start})


__all__ = ["Tool", "ToolRegistry", "ToolRequest", "ToolResponse", "run_command"]
