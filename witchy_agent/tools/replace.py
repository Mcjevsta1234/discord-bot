from __future__ import annotations

from pathlib import Path

from pydantic import Field

from ..core import Tool, ToolRegistry, ToolRequest, ToolResponse


class ReplaceRequest(ToolRequest):
    path: str = Field(description="File to edit")
    search: str = Field(description="Text to search for")
    replace: str = Field(description="Replacement text")
    create: bool = Field(default=False, description="Create file if missing")


def handle(request: ReplaceRequest) -> ToolResponse:
    target = Path(request.path)
    if not target.exists():
        if not request.create:
            return ToolResponse(success=False, stderr="File not found")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text("", encoding="utf-8")

    text = target.read_text(encoding="utf-8")
    if request.search not in text:
        return ToolResponse(success=False, stderr="Search text not found")

    updated = text.replace(request.search, request.replace)
    target.write_text(updated, encoding="utf-8")
    return ToolResponse(success=True, details={"path": str(target)})


def register(registry: ToolRegistry) -> None:
    registry.register(
        Tool(
            name="replace",
            description="Find and replace text in a file.",
            handler=lambda req: handle(ReplaceRequest.model_validate(req.model_dump() if hasattr(req, "model_dump") else req)),
        )
    )

