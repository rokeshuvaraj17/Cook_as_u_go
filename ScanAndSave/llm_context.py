"""Per-request LLM credentials (API key, base URL, model) for receipt preview and agents."""

from __future__ import annotations

from contextvars import ContextVar, Token
from typing import Any

_llm_ctx: ContextVar[dict[str, Any] | None] = ContextVar("llm_ctx", default=None)


def push_llm(*, api_key: str, base_url: str | None = None, model: str | None = None) -> Token:
    payload: dict[str, Any] = {"api_key": api_key}
    if base_url:
        payload["base_url"] = str(base_url).strip().rstrip("/")
    if model:
        payload["model"] = str(model).strip()
    return _llm_ctx.set(payload)


def pop_llm(token: Token) -> None:
    _llm_ctx.reset(token)


def get_llm() -> dict[str, Any] | None:
    return _llm_ctx.get()
