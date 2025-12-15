from . import git, python_tools, replace, shell
from ..core import ToolRegistry


def register_all(registry: ToolRegistry) -> None:
    shell.register(registry)
    git.register(registry)
    python_tools.register(registry)
    replace.register(registry)


__all__ = ["register_all"]
