from __future__ import annotations

from pathlib import Path
from typing import List, Optional

from pydantic import BaseModel, Field

from ..core import Tool, ToolRegistry, ToolRequest, ToolResponse, run_command


class ShellRequest(ToolRequest):
    command: str
    timeout: int = Field(default=60, description="Timeout in seconds")
    cwd: Optional[Path] = Field(default=None, description="Optional working directory")
    allowlist: List[str] = Field(default_factory=list, description="Optional command allowlist (prefix match)")


SAFE_DEFAULTS = {"ls", "pwd", "git", "cat", "python", "pip", "pytest", "echo", "mkdir", "rm", "cp", "mv"}


def _is_allowed(cmd: str, allowlist: List[str]) -> bool:
    if allowlist:
        return any(cmd.startswith(prefix) for prefix in allowlist)
    return True


def handle(request: ShellRequest) -> ToolResponse:
    cmd_parts = request.command.strip().split()
    if not cmd_parts:
        return ToolResponse(success=False, stderr="No command provided")

    if not _is_allowed(request.command, request.allowlist or list(SAFE_DEFAULTS)):
        return ToolResponse(success=False, stderr="Command not permitted by allowlist")

    return run_command(cmd_parts, timeout=request.timeout, cwd=request.cwd)


def register(registry: ToolRegistry) -> None:
    registry.register(
        Tool(
            name="shell",
            description="Run a shell command with an optional allowlist and timeout.",
            handler=lambda req: handle(ShellRequest.model_validate(req.model_dump() if hasattr(req, "model_dump") else req)),
        )
    )

