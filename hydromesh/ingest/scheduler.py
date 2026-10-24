"""24/7 Plant Background Scheduler and Continuous Heartbeat.

SIMPLE EXPLANATION (FOR ANYONE / NON-TECH):
Think of this file as the Steady Clockwork Heart of the power plant.
1. Unblinking Watch: Day and night, every few seconds, it triggers a new tick.
2. Fresh Data & Twin Step: It advances the digital twin physics, measures river sand,
   and sends numbers to our robot brains.
3. Broadcasting Live: It hands the fresh numbers to the radio broadcaster
   so operators' live screens update continuously.
"""

from __future__ import annotations

import asyncio
import contextlib
from typing import Any

from hydromesh.api.stream import StreamManager
from hydromesh.logging import get_logger
from hydromesh.pipeline import OrchestrationPipeline
from hydromesh.schemas import WeatherObservation
from hydromesh.twin import scenarios
from hydromesh.twin.plant import PlantSpec, PlantTwin

log = get_logger(__name__)


class PlantScheduler:
    """Continuous 24/7 asynchronous scheduler running twin simulation and broadcasting to WebSockets."""

    def __init__(
        self,
        pipeline: OrchestrationPipeline,
        stream: StreamManager,
        *,
        twin: PlantTwin | None = None,
        interval_s: float = 2.0,
        sim_step_s: float = 60.0,
    ) -> None:
        self.pipeline = pipeline
        self.stream = stream
        self.interval_s = interval_s
        self.sim_step_s = sim_step_s

        self.twin = twin or PlantTwin(scenarios.normal, spec=PlantSpec(), seed=42)
        self._running = False
        self._task: asyncio.Task[None] | None = None

    def set_scenario(self, scenario_name: str) -> None:
        """Switch active simulation scenario dynamically (normal, monsoon_surge, inflow_surge)."""
        sc_fn = scenarios.SCENARIOS.get(scenario_name, scenarios.normal)
        self.twin._scenario = sc_fn
        self.twin._t = 0.0

    @property
    def is_running(self) -> bool:
        return self._running and self._task is not None and not self._task.done()

    async def tick(self) -> dict[str, Any]:
        """Execute a single simulation step, multi-agent evaluation, and stream broadcast."""
        # 1. Step twin physics
        telemetry = self.twin.step(self.sim_step_s)
        snapshot = self.twin.snapshot()

        plant_id = self.pipeline.plant.id if self.pipeline.plant else "upper_tamakoshi"
        plant_lat = self.pipeline.plant.latitude if self.pipeline.plant else 27.848
        plant_lon = self.pipeline.plant.longitude if self.pipeline.plant else 86.136

        # 2. Weather observation
        weather = WeatherObservation(
            ts=telemetry.ts,
            latitude=plant_lat,
            longitude=plant_lon,
            precipitation_mm_h=telemetry.rainfall_mm_h,
            temperature_c=12.0,
            cloud_cover_pct=75.0,
            hourly_precipitation_48h=(telemetry.rainfall_mm_h,) * 48,
            is_live=True,
        )

        # 3. Execute multi-agent orchestration cycle
        incident = await self.pipeline.run_cycle(
            telemetry=telemetry,
            weather=weather,
            snapshot=snapshot,
            now_s=self.twin._t,
        )

        # 4. If actions approved, apply to digital twin
        if (
            incident.verdict
            and incident.verdict.status == "approved"
            and incident.verdict.approved_actions
            and incident.decision
        ):
            self.twin.apply(incident.decision)

        # 5. Format broadcast packet matching stream specifications
        decision_str = "None"
        if incident.decision and incident.decision.actions:
            decision_str = str(incident.decision.actions[0])

        packet = {
            "ts": incident.opened_at.isoformat(),
            "plant_id": plant_id,
            "discharge_m3s": telemetry.discharge_m3s,
            "silt_ppm": telemetry.silt_ppm,
            "alert_tier": incident.anomaly.severity.value.upper() if incident.anomaly else "NORMAL",
            "runner_wear_pct": round(snapshot.runner_wear * 100.0, 3),
            "active_decision": decision_str,
            "safety_status": incident.verdict.status if incident.verdict else "unknown",
        }

        # 6. Stream to connected WebSocket clients
        await self.stream.broadcast(packet)
        return packet

    async def _loop(self) -> None:
        log.info("plant_scheduler_started", interval_s=self.interval_s)
        try:
            while self._running:
                try:
                    await self.tick()
                except Exception as exc:
                    log.error("scheduler_tick_error", error=str(exc))
                await asyncio.sleep(self.interval_s)
        except asyncio.CancelledError:
            log.info("plant_scheduler_cancelled")
        finally:
            self._running = False

    def start(self) -> None:
        """Start the background scheduler task."""
        if self.is_running:
            return
        self._running = True
        self._task = asyncio.create_task(self._loop())

    async def stop(self) -> None:
        """Stop and cleanly await cancellation of the scheduler."""
        if not self._running or self._task is None:
            return
        self._running = False
        self._task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await self._task
        self._task = None
        log.info("plant_scheduler_stopped")
