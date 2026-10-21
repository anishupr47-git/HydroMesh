"""HydroMesh structured logging configuration."""

from __future__ import annotations

import structlog


def configure_logging() -> None:
    """Configure structlog for JSON-formatted structured logging."""
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
    )


logger: structlog.stdlib.BoundLogger = structlog.get_logger()
