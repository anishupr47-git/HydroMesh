"""Live WebSocket Streaming Hub for Plant Telemetry and AI Decisions.

SIMPLE EXPLANATION (FOR ANYONE / NON-TECH):
Think of this file as a Live Radio Station broadcasting from the dam.
1. Continuous Stream: Every couple seconds, it broadcasts the latest water speed,
   floating sand count, and robot helper advice to every connected web browser.
2. Many Listeners (Connection Manager): Multiple operators and engineers can tune
   in simultaneously from phones, tablets, or control room screens.
3. Clean Disconnects: If someone closes their laptop, it politely frees up their
   slot with zero memory leaks or crashes.
"""

from __future__ import annotations

import asyncio
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

from hydromesh.logging import get_logger

log = get_logger(__name__)


class StreamManager:
    """Manages concurrent WebSocket subscriber connections and thread-safe broadcasts."""

    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    @property
    def count(self) -> int:
        return len(self._connections)

    async def connect(self, ws: WebSocket) -> None:
        """Accept and register a new client connection."""
        await ws.accept()
        async with self._lock:
            self._connections.add(ws)
        log.info("websocket_client_connected", active_subscribers=len(self._connections))

    async def disconnect(self, ws: WebSocket) -> None:
        """Unregister a client connection."""
        async with self._lock:
            self._connections.discard(ws)
        log.info("websocket_client_disconnected", active_subscribers=len(self._connections))

    async def broadcast(self, message: dict[str, Any]) -> None:
        """Safely broadcast a JSON message payload to all active subscribers."""
        async with self._lock:
            subscribers = list(self._connections)

        if not subscribers:
            return

        dead_connections: list[WebSocket] = []
        for ws in subscribers:
            try:
                await ws.send_json(message)
            except (WebSocketDisconnect, RuntimeError, ConnectionError):
                dead_connections.append(ws)

        if dead_connections:
            async with self._lock:
                for ws in dead_connections:
                    self._connections.discard(ws)
            log.info("cleaned_dead_subscribers", removed=len(dead_connections))


# Global shared instance
stream_manager = StreamManager()
