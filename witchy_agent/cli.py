from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.table import Table

from .core import ToolRegistry
from .tools import register_all

app = typer.Typer(help="Witchy Agent tool runner")
console = Console()
registry = ToolRegistry()
register_all(registry)


def _print_response(name: str, response) -> None:
    console.rule(f"[bold purple]{name} result")
    console.print(f"Success: {response.success}")
    if response.stdout:
        console.print("[green]stdout[/green]:")
        console.print(response.stdout)
    if response.stderr:
        console.print("[red]stderr[/red]:")
        console.print(response.stderr)
    if response.details:
        console.print("details:")
        console.print_json(json.dumps(response.details))


@app.command()
def tools():
    """List available tools."""
    table = Table(title="Registered tools")
    table.add_column("Name")
    table.add_column("Description")
    for tool in registry.list():
        table.add_row(tool.name, tool.description)
    console.print(table)


@app.command()
def shell(command: str, timeout: int = typer.Option(60, help="Timeout in seconds"), cwd: Optional[Path] = typer.Option(None), allowlist: Optional[str] = typer.Option(None, help="Comma-separated allowlist prefixes")):
    allow = allowlist.split(",") if allowlist else []
    response = registry.run("shell", {"command": command, "timeout": timeout, "cwd": cwd, "allowlist": allow})
    _print_response("shell", response)


@app.command()
def git(*args: str, timeout: int = typer.Option(60)):
    response = registry.run("git", {"args": list(args), "timeout": timeout})
    _print_response("git", response)


@app.command()
def python_test(target: str = typer.Option("compileall", help="compileall or pytest"), path: Optional[str] = typer.Option(None), timeout: int = typer.Option(120)):
    response = registry.run("python-test", {"target": target, "path": path, "timeout": timeout})
    _print_response("python-test", response)


@app.command("write-script")
def write_script(path: str, content: str, executable: bool = typer.Option(True)):
    response = registry.run("write-script", {"path": path, "content": content, "executable": executable})
    _print_response("write-script", response)


@app.command()
def replace(path: str, search: str, replace: str, create: bool = typer.Option(False)):
    response = registry.run("replace", {"path": path, "search": search, "replace": replace, "create": create})
    _print_response("replace", response)


if __name__ == "__main__":
    app()

