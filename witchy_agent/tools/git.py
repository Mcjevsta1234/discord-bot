from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field

from ..core import Tool, ToolRegistry, ToolRequest, ToolResponse, run_command


class GitRequest(ToolRequest):
    args: List[str] = Field(default_factory=list, description="Arguments to pass to git")
    timeout: int = 60


def handle(request: GitRequest) -> ToolResponse:
    if not request.args:
        return ToolResponse(success=False, stderr="No git arguments provided")
    return run_command(["git", *request.args], timeout=request.timeout)


def register(registry: ToolRegistry) -> None:
    registry.register(
        Tool(
            name="git",
            description="Run git with provided arguments (status, add, commit, etc.)",
            handler=lambda req: handle(GitRequest.model_validate(req.model_dump() if hasattr(req, "model_dump") else req)),
        )
    )

