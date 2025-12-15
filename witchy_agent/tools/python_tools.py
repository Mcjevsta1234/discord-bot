from __future__ import annotations

import shutil
from typing import Optional

from pydantic import Field

from ..core import Tool, ToolRegistry, ToolRequest, ToolResponse, run_command


class PythonTestRequest(ToolRequest):
    target: str = Field(default="compileall", description="compileall or pytest")
    path: Optional[str] = Field(default=None, description="Optional path to run against")
    timeout: int = 120


def handle_test(request: PythonTestRequest) -> ToolResponse:
    if request.target == "pytest":
        if not shutil.which("pytest"):
            return ToolResponse(success=False, stderr="pytest not installed")
        cmd = ["pytest"]
        if request.path:
            cmd.append(request.path)
        return run_command(cmd, timeout=request.timeout)

    cmd = ["python", "-m", "compileall"]
    if request.path:
        cmd.append(request.path)
    return run_command(cmd, timeout=request.timeout)


class ScriptRequest(ToolRequest):
    path: str = Field(description="Path to write the script")
    content: str = Field(description="Script contents")
    executable: bool = Field(default=True)


def handle_write(request: ScriptRequest) -> ToolResponse:
    try:
        script_path = request.path
        with open(script_path, "w", encoding="utf-8") as f:
            f.write(request.content)
        if request.executable:
            import os

            os.chmod(script_path, 0o755)
        return ToolResponse(success=True, details={"path": script_path})
    except Exception as exc:  # pragma: no cover
        return ToolResponse(success=False, stderr=str(exc))


def register(registry: ToolRegistry) -> None:
    registry.register(
        Tool(
            name="python-test",
            description="Run python -m compileall or pytest if installed.",
            handler=lambda req: handle_test(PythonTestRequest.model_validate(req.model_dump() if hasattr(req, "model_dump") else req)),
        )
    )
    registry.register(
        Tool(
            name="write-script",
            description="Write a Python or shell script to disk and mark executable.",
            handler=lambda req: handle_write(ScriptRequest.model_validate(req.model_dump() if hasattr(req, "model_dump") else req)),
        )
    )

