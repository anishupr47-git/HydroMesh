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
from collections import defaultdict
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

from hydromesh.logging import get_logger

log = get_logger(__name__)


class StreamManager:
    """Manages concurrent WebSocket subscriber connections and thread-safe broadcasts."""

    MAX_CONNECTIONS_TOTAL: int = 500
    MAX_CONNECTIONS_PER_IP: int = 10

    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()
        self._ip_connections: dict[str, int] = defaultdict(int)
        self._ws_to_ip: dict[WebSocket, str] = {}
        self._lock = asyncio.Lock()

    @property
    def count(self) -> int:
        return len(self._connections)

    def active_connections_for_ip(self, ip: str) -> int:
        """Return the count of active connections from a specific client IP."""
        return self._ip_connections.get(ip, 0)

    async def reset(self) -> None:
        """Reset internal state (useful for test isolation)."""
        async with self._lock:
            self._connections.clear()
            self._ip_connections.clear()
            self._ws_to_ip.clear()

    async def connect(self, ws: WebSocket) -> bool:
        """Accept and register a new client connection while enforcing caps.

        Returns True if connection accepted, False if closed due to caps.
        """
        client_ip = ws.client.host if (ws.client and getattr(ws.client, "host", None)) else "127.0.0.1"

        async with self._lock:
            if len(self._connections) >= self.MAX_CONNECTIONS_TOTAL:
                log.warning(
                    "websocket_global_cap_reached",
                    current=len(self._connections),
                    max=self.MAX_CONNECTIONS_TOTAL,
                )
                await ws.close(code=1013, reason="Global WebSocket connection limit reached")
                return False

            if self._ip_connections[client_ip] >= self.MAX_CONNECTIONS_PER_IP:
                log.warning(
                    "websocket_per_ip_cap_reached",
                    client_ip=client_ip,
                    current=self._ip_connections[client_ip],
                    max=self.MAX_CONNECTIONS_PER_IP,
                )
                await ws.close(code=1013, reason="Per-IP WebSocket connection limit reached")
                return False

            await ws.accept()
            self._connections.add(ws)
            self._ip_connections[client_ip] += 1
            self._ws_to_ip[ws] = client_ip

        log.info("websocket_client_connected", active_subscribers=len(self._connections), client_ip=client_ip)
        return True

    async def disconnect(self, ws: WebSocket) -> None:
        """Unregister a client connection and release allocated IP slot."""
        async with self._lock:
            if ws in self._connections:
                self._connections.remove(ws)
                ip = self._ws_to_ip.pop(ws, None)
                if ip and ip in self._ip_connections:
                    self._ip_connections[ip] -= 1
                    if self._ip_connections[ip] <= 0:
                        del self._ip_connections[ip]
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
                    if ws in self._connections:
                        self._connections.remove(ws)
                        ip = self._ws_to_ip.pop(ws, None)
                        if ip and ip in self._ip_connections:
                            self._ip_connections[ip] -= 1
                            if self._ip_connections[ip] <= 0:
                                del self._ip_connections[ip]
            log.info("cleaned_dead_subscribers", removed=len(dead_connections))


# Global shared instance
stream_manager = StreamManager()
