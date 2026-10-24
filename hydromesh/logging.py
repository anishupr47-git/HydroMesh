"""Structured logging: JSON in prod, colored console in dev.

Hot-path cost: disabled levels are dropped by the filtering logger before any processor
runs (O(1)); loggers are cached after first use; `incident_id` rides on contextvars, so
it is async-safe and never has to be threaded through call signatures.

Hardening (Security Finding F6):
- Redaction processor masks sensitive keys (token, key, secret, authorization, password).
- Oversized log values truncated to max 512 characters.
- CR/LF characters stripped/escaped from string fields to prevent log injection (CWE-117).
"""

from __future__ import annotations

import logging
import sys
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Literal

import structlog
from structlog.typing import EventDict, FilteringBoundLogger, Processor, WrappedLogger

SENSITIVE_KEYS = ("token", "key", "secret", "authorization", "password")
MAX_VALUE_LENGTH = 512


def redact_sensitive_data(
    _logger: WrappedLogger,
    _method_name: str,
    event_dict: EventDict,
) -> EventDict:
    """Security F6: Mask sensitive credentials, truncate oversized strings, strip CR/LF."""
    for k, v in list(event_dict.items()):
        k_lower = k.lower()
        if any(s in k_lower for s in SENSITIVE_KEYS):
            event_dict[k] = "[REDACTED]"
        elif isinstance(v, str):
            sanitized = v.replace("\r", "\\r").replace("\n", "\\n")
            if len(sanitized) > MAX_VALUE_LENGTH:
                sanitized = sanitized[:MAX_VALUE_LENGTH] + "...[TRUNCATED]"
            event_dict[k] = sanitized
    return event_dict


def configure_logging(*, env: Literal["dev", "prod"] = "dev", level: str = "INFO") -> None:
    """Idempotent global setup. Logs go to stderr so stdout stays clean for tooling."""
    processors: list[Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.format_exc_info,
        redact_sensitive_data,
        structlog.processors.JSONRenderer() if env == "prod" else structlog.dev.ConsoleRenderer(),
    ]
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(logging.getLevelName(level.upper())),
        logger_factory=structlog.PrintLoggerFactory(file=sys.stderr),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> FilteringBoundLogger:
    return structlog.get_logger(name)  # type: ignore[no-any-return]


@contextmanager
def incident_scope(incident_id: str) -> Iterator[None]:
    """Bind `incident_id` to every log line emitted inside the block, then restore."""
    tokens = structlog.contextvars.bind_contextvars(incident_id=incident_id)
    try:
        yield
    finally:
        structlog.contextvars.reset_contextvars(**tokens)
