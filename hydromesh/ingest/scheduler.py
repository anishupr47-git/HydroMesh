"""Continuous Plant Background Scheduler and Heartbeat Engine.

Overview:
    Executes high-frequency periodic simulation steps, multi-agent evaluation cycles,
    and real-time WebSocket state broadcasting across all active hydropower stations.

Operational Responsibilities:
    1. Continuous Heartbeat: Advances simulation physics and assimilates satellite precipitation
       on a consistent asynchronous schedule (default: 2.0s tick interval).
    2. Multi-Station Concurrency: Simultaneously updates digital twin state and safety kernels
       for all registered plants (Upper Tamakoshi, Kali Gandaki, Chilime, Middle Marsyangdi, etc.).
    3. Low-Latency Broadcasting: Transmits updated discharge, sediment concentration, turbine wear,
       and active advisory decisions to connected operator cockpits in real time.
"""

from __future__ import annotations

import asyncio
import contextlib
import math
from typing import Any

from hydromesh.api.stream import StreamManager
from hydromesh.logging import get_logger
from hydromesh.pipeline import OrchestrationPipeline
from hydromesh.schemas import HydroPlantSpec, WeatherObservation
from hydromesh.twin import scenarios
from hydromesh.twin.plant import PlantSpec, PlantTwin

log = get_logger(__name__)


def make_plant_scenario(plant: HydroPlantSpec, base_scenario_name: str = "normal"):
    """Create a calibrated hydrological scenario tailored to a specific plant's design and base flow."""
    base_q = plant.base_flow_m3s if plant.base_flow_m3s > 0 else plant.design_flow_m3s * 1.4

    def scenario_fn(t: float) -> scenarios.Inputs:
        plant_phase = (abs(hash(plant.id)) % 100) / 100.0 * math.tau
        if base_scenario_name == "monsoon_surge":
            mult = 2.6
            q = base_q * mult * (1.0 + 0.05 * math.sin(t * 0.05 + plant_phase))
            scaled_ratio = q / max(10.0, base_q)
            silt = min(4200.0, max(1200.0, 320.0 * (scaled_ratio**1.8)))
            return scenarios.Inputs(q, silt, 32.5, 49.95, 0.75)
        elif base_scenario_name == "inflow_surge":
            mult = 3.5
            q = base_q * mult * (1.0 + 0.08 * math.sin(t * 0.08 + plant_phase))
            scaled_ratio = q / max(10.0, base_q)
            silt = min(5000.0, max(2200.0, 320.0 * (scaled_ratio**2.1)))
            return scenarios.Inputs(q, silt, 55.0, 49.88, 0.55)
        else:
            # Normal diurnal flow ripple (+/- 6%)
            q = base_q * (1.0 + 0.06 * math.sin(math.tau * t / 86_400.0 + plant_phase))
            # Silt between 120 and 420 PPM for normal conditions
            silt = max(110.0, min(550.0, 240.0 * (q / max(10.0, base_q)) ** 1.4))
            return scenarios.Inputs(q, silt, 0.0, 50.0, 1.0)

    return scenario_fn


class PlantScheduler:
    """Continuous 24/7 asynchronous scheduler running twin simulation and broadcasting to WebSockets for all plants."""

    def __init__(
        self,
        pipeline: OrchestrationPipeline,
        stream: StreamManager,
        *,
        plants: list[HydroPlantSpec] | None = None,
        twin: PlantTwin | None = None,
        interval_s: float = 2.0,
        sim_step_s: float = 60.0,
    ) -> None:
        self.pipeline = pipeline
        self.stream = stream
        self.interval_s = interval_s
        self.sim_step_s = sim_step_s
        self.plants = list(plants) if plants else ([pipeline.plant] if pipeline.plant else [])

        self.twin = twin or PlantTwin(scenarios.normal, spec=PlantSpec(), seed=42)
        self._running = False
        self._task: asyncio.Task[None] | None = None

        # Multi-plant twins, pipelines, and active scenario names
        self._twins: dict[str, PlantTwin] = {}
        self._pipelines: dict[str, OrchestrationPipeline] = {}
        self._scenarios: dict[str, str] = {}

        # Default plant initialization (guarantees test backward compatibility)
        default_id = pipeline.plant.id if pipeline.plant else "upper_tamakoshi"
        self._twins[default_id] = self.twin
        self._pipelines[default_id] = self.pipeline
        self._scenarios[default_id] = "normal"

        # Initialize realistic calibrated twins and pipelines for all registered plants in Nepal
        for p in self.plants:
            self._scenarios[p.id] = "normal"
            if p.id not in self._twins:
                p_spec = PlantSpec(
                    design_flow_m3s=max(10.0, p.design_flow_m3s / 2.0),
                    head_m=max(20.0, p.head_m),
                )
                sc_fn = make_plant_scenario(p, "normal")
                self._twins[p.id] = PlantTwin(
                    sc_fn,
                    spec=p_spec,
                    seed=42 + abs(hash(p.id)) % 1000,
                )
            if p.id not in self._pipelines:
                self._pipelines[p.id] = OrchestrationPipeline(plant=p, blackboard=self.pipeline.blackboard)

    def set_scenario(self, scenario_name: str, plant_id: str | None = None) -> None:
        """Switch active simulation scenario dynamically (normal, monsoon_surge, inflow_surge)."""
        sc_name = scenario_name.lower()
        if plant_id and plant_id in self._twins:
            self._scenarios[plant_id] = sc_name
            plant = self._pipelines[plant_id].plant
            if plant:
                self._twins[plant_id]._scenario = make_plant_scenario(plant, sc_name)
            else:
                self._twins[plant_id]._scenario = scenarios.SCENARIOS.get(sc_name, scenarios.normal)
            self._twins[plant_id]._t = 0.0
        else:
            sc_fn = scenarios.SCENARIOS.get(sc_name, scenarios.normal)
            self.twin._scenario = sc_fn
            self.twin._t = 0.0
            for p in self.plants:
                self._scenarios[p.id] = sc_name
                self._twins[p.id]._scenario = make_plant_scenario(p, sc_name)
                self._twins[p.id]._t = 0.0

    @property
    def is_running(self) -> bool:
        return self._running and self._task is not None and not self._task.done()

    async def tick_plant(self, plant_id: str) -> dict[str, Any]:
        """Execute a single simulation step and broadcast for a specific plant."""
        twin = self._twins.get(plant_id, self.twin)
        pipe = self._pipelines.get(plant_id, self.pipeline)
        plant = pipe.plant

        # 1. Step twin physics
        telemetry = twin.step(self.sim_step_s)
        snapshot = twin.snapshot()

        p_lat = plant.latitude if plant else 27.848
        p_lon = plant.longitude if plant else 86.136

        # 2. Weather observation
        weather = WeatherObservation(
            ts=telemetry.ts,
            latitude=p_lat,
            longitude=p_lon,
            precipitation_mm_h=telemetry.rainfall_mm_h,
            temperature_c=12.0,
            cloud_cover_pct=75.0,
            hourly_precipitation_48h=(telemetry.rainfall_mm_h,) * 48,
            is_live=True,
        )

        # 3. Execute multi-agent orchestration cycle
        incident = await pipe.run_cycle(
            telemetry=telemetry,
            weather=weather,
            snapshot=snapshot,
            now_s=twin._t,
        )

        # 4. If actions approved, apply to digital twin
        if (
            incident.verdict
            and incident.verdict.status == "approved"
            and incident.verdict.approved_actions
            and incident.decision
        ):
            twin.apply(incident.decision)

        # 5. Format broadcast packet matching stream specifications
        decision_str = "None"
        if incident.decision and incident.decision.actions:
            decision_str = str(incident.decision.actions[0])

        packet = {
            "ts": incident.opened_at.isoformat(),
            "plant_id": plant_id,
            "discharge_m3s": round(telemetry.discharge_m3s, 1),
            "silt_ppm": round(telemetry.silt_ppm),
            "alert_tier": incident.anomaly.severity.value.upper() if incident.anomaly else "NORMAL",
            "runner_wear_pct": round(snapshot.runner_wear * 100.0, 3),
            "active_decision": decision_str,
            "safety_status": incident.verdict.status if incident.verdict else "unknown",
        }

        # 6. Stream to connected WebSocket clients
        await self.stream.broadcast(packet)
        return packet

    async def tick(self) -> dict[str, Any]:
        """Execute simulation step for the primary plant (maintains 100% test backwards compatibility)."""
        default_id = self.pipeline.plant.id if self.pipeline.plant else "upper_tamakoshi"
        return await self.tick_plant(default_id)

    async def tick_all(self) -> list[dict[str, Any]]:
        """Execute simulation step and broadcast for EVERY registered plant."""
        packets: list[dict[str, Any]] = []
        for p_id in list(self._twins.keys()):
            try:
                pkt = await self.tick_plant(p_id)
                packets.append(pkt)
            except Exception as e:
                log.warning("scheduler_tick_plant_failed", plant_id=p_id, error=str(e))
        return packets

    async def _loop(self) -> None:
        log.info("plant_scheduler_started", interval_s=self.interval_s, plant_count=len(self._twins))
        try:
            while self._running:
                try:
                    await self.tick_all()
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
