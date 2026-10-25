"""Local LLM Client Adapter and Resilient Inference Circuit Breaker.

Overview:
    Interfaces with locally hosted, open-weight language models (Ollama/Qwen) to produce
    schema-constrained structured JSON decisions and plain-English incident briefings.

Key Reliability & Security Guarantees:
    1. Schema Enforcement: Enforces strict Pydantic JSON schema output constraints; models cannot emit
       unstructured text or unvalidated action fields.
    2. Resilient Circuit Breaker: Automatically detects inference timeouts, high latency, or server failures,
       tripping a jittered circuit breaker and switching instantly to deterministic rule-based fallbacks.
    3. Loopback Network Isolation (SSRF Defense): Confines all API calls strictly to local loopback
       addresses (127.0.0.1/localhost), blocking outbound metadata requests or external network egress.
"""

from __future__ import annotations

import asyncio
import random
import time
from collections import deque
from collections.abc import Callable
from dataclasses import dataclass
from functools import cache
from typing import Any, Protocol, TypeVar
from urllib.parse import urlsplit

import httpx
from ollama import AsyncClient, ResponseError
from pydantic import BaseModel, ValidationError

from hydromesh.errors import LLMError, LLMOutputError, LLMUnavailable
from hydromesh.logging import get_logger

T = TypeVar("T", bound=BaseModel)
log = get_logger(__name__)

ALLOWED_LOOPBACK_HOSTS = frozenset({"127.0.0.1", "localhost", "::1", "[::1]"})


def _validate_host(host: str) -> None:
    """Security F5: Enforce loopback allowlist, valid HTTP schemes, and ban cloud metadata IPs."""
    parsed = urlsplit(host)
    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"Invalid scheme: {parsed.scheme!r}. Only http and https are permitted.")
    if parsed.username or parsed.password:
        raise ValueError("Userinfo (username:password) is forbidden in Ollama host URL.")
    hostname = parsed.hostname
    if not hostname:
        raise ValueError(f"Missing hostname in Ollama host URL: {host!r}")

    # Check for cloud metadata IP or known metadata names
    if hostname.lower() in ("169.254.169.254", "metadata.google.internal", "instance-data"):
        raise ValueError(f"Targeting cloud metadata endpoint {hostname!r} is strictly forbidden (SSRF protection).")

    if hostname.lower() not in ALLOWED_LOOPBACK_HOSTS and f"[{hostname.lower()}]" not in ALLOWED_LOOPBACK_HOSTS:
        raise ValueError(f"Hostname {hostname!r} is not in the allowed loopback allowlist.")


class LLMClient(Protocol):
    async def generate_structured(self, *, system: str, user: str, schema: type[T]) -> T:
        """Return a `schema` instance or raise `LLMError`."""
        ...


@dataclass(frozen=True, slots=True)
class OllamaConfig:
    host: str = "http://localhost:11434"
    model: str = "qwen2.5:7b-instruct"
    timeout_s: float = 20.0
    max_retries: int = 1  # only for schema-invalid output; connection errors never retry
    max_tokens: int = 512
    num_ctx: int = 4096
    keep_alive: str = "30m"
    breaker_threshold: int = 2
    breaker_cooldown_s: float = 30.0

    def __post_init__(self) -> None:
        _validate_host(self.host)


class CircuitBreaker:
    """Opens after `threshold` consecutive failures; half-open once the cooldown elapses.

    The failure count is kept on open, so a failed half-open probe re-opens immediately.
    """

    __slots__ = ("_clock", "_cooldown_s", "_fails", "_open_until", "_threshold")

    def __init__(self, threshold: int, cooldown_s: float, clock: Callable[[], float] = time.monotonic) -> None:
        self._threshold, self._cooldown_s, self._clock = threshold, cooldown_s, clock
        self._fails, self._open_until = 0, 0.0

    def allow(self) -> bool:
        return self._clock() >= self._open_until

    def ok(self) -> None:
        self._fails = 0

    def fail(self) -> None:
        self._fails += 1
        if self._fails >= self._threshold:
            jittered = self._cooldown_s * (1.0 + random.uniform(0.0, 0.5))
            self._open_until = self._clock() + jittered


@cache
def _json_schema(schema: type[BaseModel]) -> dict[str, Any]:
    return schema.model_json_schema()


class OllamaClient:
    def __init__(
        self,
        cfg: OllamaConfig | None = None,
        *,
        client: AsyncClient | None = None,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._cfg = cfg or OllamaConfig()
        self._client = client or AsyncClient(host=self._cfg.host)
        self._breaker = CircuitBreaker(self._cfg.breaker_threshold, self._cfg.breaker_cooldown_s, clock)
        self._gate = asyncio.Semaphore(1)

    async def warmup(self) -> None:
        """Load the model into memory now. Failure is non-fatal: the breaker handles it."""
        try:
            async with asyncio.timeout(self._cfg.timeout_s * 3):
                await self._client.generate(model=self._cfg.model, prompt="", keep_alive=self._cfg.keep_alive)
        except (OSError, httpx.HTTPError, ResponseError):
            self._breaker.fail()
            log.warning("llm_warmup_failed", model=self._cfg.model)

    async def generate_structured(self, *, system: str, user: str, schema: type[T]) -> T:
        if not self._breaker.allow():
            raise LLMUnavailable("circuit open")
        cfg = self._cfg
        async with self._gate:
            for _ in range(cfg.max_retries + 1):
                try:
                    async with asyncio.timeout(cfg.timeout_s):
                        resp = await self._client.chat(
                            model=cfg.model,
                            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
                            format=_json_schema(schema),
                            options={"temperature": 0, "num_predict": cfg.max_tokens, "num_ctx": cfg.num_ctx},
                            keep_alive=cfg.keep_alive,
                        )
                    result = schema.model_validate_json(resp.message.content or "")
                except ValidationError:
                    continue  # decoding glitch: worth one more try
                except (OSError, httpx.HTTPError, ResponseError) as exc:  # TimeoutError is an OSError
                    self._breaker.fail()
                    raise LLMUnavailable(type(exc).__name__) from exc
                self._breaker.ok()
                return result
        self._breaker.fail()
        raise LLMOutputError(f"{schema.__name__}: no schema-valid output after {cfg.max_retries + 1} tries")


class FakeLLM:
    """Test double: replays queued responses (a model instance or an exception) in order."""

    def __init__(self, *responses: BaseModel | Exception) -> None:
        self._queue = deque(responses)
        self.calls: list[tuple[str, str, type[BaseModel]]] = []

    async def generate_structured(self, *, system: str, user: str, schema: type[T]) -> T:
        self.calls.append((system, user, schema))
        item = self._queue.popleft()
        if isinstance(item, Exception):
            raise item
        if not isinstance(item, schema):
            raise AssertionError(f"FakeLLM queued {type(item).__name__}, caller asked for {schema.__name__}")
        return item


async def generate_or(
    llm: LLMClient | None,
    fallback: Callable[[], T],
    *,
    system: str,
    user: str,
    schema: type[T],
) -> tuple[T, bool]:
    """Ask the LLM; on any `LLMError` (or no LLM) return `fallback()`. Second value: LLM used."""
    if llm is not None:
        try:
            return await llm.generate_structured(system=system, user=user, schema=schema), True
        except LLMError as exc:
            log.warning("llm_fallback", schema=schema.__name__, reason=type(exc).__name__)
    return fallback(), False
