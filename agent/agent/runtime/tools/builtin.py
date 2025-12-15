import ast
import operator
from typing import List

from ..tooling import Tool


_ALLOWED_OPERATORS = {
  ast.Add: operator.add,
  ast.Sub: operator.sub,
  ast.Mult: operator.mul,
  ast.Div: operator.truediv,
  ast.Pow: operator.pow,
  ast.Mod: operator.mod,
  ast.USub: operator.neg,
  ast.UAdd: operator.pos,
}


def _safe_eval(node: ast.AST) -> float:
  if isinstance(node, ast.Num):  # type: ignore[attr-defined]
    return float(node.n)
  if isinstance(node, ast.BinOp) and type(node.op) in _ALLOWED_OPERATORS:
    left = _safe_eval(node.left)
    right = _safe_eval(node.right)
    return _ALLOWED_OPERATORS[type(node.op)](left, right)
  if isinstance(node, ast.UnaryOp) and type(node.op) in _ALLOWED_OPERATORS:
    operand = _safe_eval(node.operand)
    return _ALLOWED_OPERATORS[type(node.op)](operand)
  raise ValueError("Unsupported expression")


def _evaluate_expression(expression: str) -> float:
  try:
    parsed = ast.parse(expression, mode="eval")
  except SyntaxError as exc:  # noqa: BLE001
    raise ValueError("Invalid syntax") from exc
  return _safe_eval(parsed.body)  # type: ignore[arg-type]


def build_tools() -> List[Tool]:
  return [
    Tool(
      name="calculator",
      description="Evaluate simple math expressions deterministically",
      schema={"expression": "string"},
      run=lambda payload: {"result": _evaluate_expression(payload.get("expression", "0"))},
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
