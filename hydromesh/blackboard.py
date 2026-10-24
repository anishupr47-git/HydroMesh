"""Thread-Safe Plant State Store (Blackboard).

SIMPLE EXPLANATION (FOR ANYONE / NON-TECH):
Think of this file as the Big Whiteboard in the center of the dam's control room.
1. One Central Board: When the weather scout or river sensors see new numbers,
   they write them up on this whiteboard so every robot helper sees the exact same thing.
2. No Scribble Overlaps (Thread Safety): Only one helper can hold the marker at a time,
   so numbers never get mixed up or scrambled.
3. Memory Notebook: It keeps a history of the last 100 water readings and all safety checks
   so we can look back and see what happened.
"""

from __future__ import annotations

import asyncio
from collections import defaultdict, deque
from datetime import UTC, datetime
from typing import Any

from hydromesh.logging import get_logger
from hydromesh.schemas import Incident, Severity, Telemetry

log = get_logger(__name__)


class Blackboard:
    """Async thread-safe state store for live plant telemetry, incidents, and audit trails."""

    def __init__(self, *, max_history: int = 500, redis_url: str | None = None) -> None:
        self._lock = asyncio.Lock()
        self._max_history = max_history
        self._redis_url = redis_url

        # Per-plant in-memory stores
        self._telemetry: dict[str, Telemetry] = {}
        self._history: dict[str, deque[Telemetry]] = defaultdict(lambda: deque(maxlen=self._max_history))
        self._alert_tiers: dict[str, str] = defaultdict(lambda: Severity.NORMAL.value)

        # Global incident and audit records
        self._incidents: dict[str, Incident] = {}
        self._audit_log: deque[dict[str, Any]] = deque(maxlen=self._max_history * 2)

    async def update_telemetry(self, plant_id: str, telemetry: Telemetry) -> None:
        """Write fresh telemetry for a plant atomically."""
        async with self._lock:
            self._telemetry[plant_id] = telemetry
            self._history[plant_id].append(telemetry)

    async def get_telemetry(self, plant_id: str) -> Telemetry | None:
        """Read the latest telemetry for a plant."""
        async with self._lock:
            return self._telemetry.get(plant_id)

    async def get_telemetry_history(self, plant_id: str, limit: int = 50) -> tuple[Telemetry, ...]:
        """Read recent historical telemetry up to `limit` entries (oldest to newest)."""
        async with self._lock:
            hist = self._history.get(plant_id)
            if not hist:
                return ()
            items = list(hist)[-limit:]
            return tuple(items)

    async def set_alert_tier(self, plant_id: str, tier: str | Severity) -> None:
        """Set active alert tier for a plant (normal, watch, warning, critical)."""
        val = tier.value if isinstance(tier, Severity) else str(tier).lower()
        async with self._lock:
            self._alert_tiers[plant_id] = val

    async def get_alert_tier(self, plant_id: str) -> str:
        """Get the current alert tier for a plant."""
        async with self._lock:
            return self._alert_tiers.get(plant_id, Severity.NORMAL.value)

    async def record_incident(self, incident: Incident) -> None:
        """Record or update an incident in the registry."""
        async with self._lock:
            self._incidents[incident.id] = incident

    async def get_incident(self, incident_id: str) -> Incident | None:
        """Fetch an incident by its unique ID."""
        async with self._lock:
            return self._incidents.get(incident_id)

    async def list_incidents(self, limit: int = 50) -> tuple[Incident, ...]:
        """List the most recent incidents up to `limit`."""
        async with self._lock:
            incidents = list(self._incidents.values())[-limit:]
            return tuple(incidents)

    async def record_audit_event(self, event_type: str, plant_id: str, payload: dict[str, Any]) -> None:
        """Record an immutable, timestamped audit log entry."""
        entry = {
            "ts": datetime.now(UTC).isoformat(),
            "event_type": event_type,
            "plant_id": plant_id,
            "payload": payload,
        }
        async with self._lock:
            self._audit_log.append(entry)

    async def get_audit_trail(self, plant_id: str | None = None, limit: int = 50) -> tuple[dict[str, Any], ...]:
        """Fetch recent audit log entries, optionally filtered by plant ID."""
        async with self._lock:
            if plant_id is None:
                entries = list(self._audit_log)[-limit:]
            else:
                entries = [e for e in self._audit_log if e["plant_id"] == plant_id][-limit:]
            return tuple(entries)

    async def plant_summary(self, plant_id: str) -> dict[str, Any]:
        """Produce an atomic summary snapshot of a plant's blackboard state."""
        async with self._lock:
            telem = self._telemetry.get(plant_id)
            tier = self._alert_tiers.get(plant_id, Severity.NORMAL.value)
            hist_len = len(self._history.get(plant_id, ()))
            return {
                "plant_id": plant_id,
                "latest_telemetry": telem.model_dump(mode="json") if telem else None,
                "alert_tier": tier,
                "history_points": hist_len,
            }
