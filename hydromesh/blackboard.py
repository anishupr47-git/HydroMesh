"""Redis-backed async blackboard and event streaming."""

from __future__ import annotations


class Blackboard:
    """Async Redis blackboard placeholder."""

    def __init__(self, redis_url: str = "redis://localhost:6379/0") -> None:
        self.redis_url = redis_url
