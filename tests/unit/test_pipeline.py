"""End-to-end integration tests for HydroMesh Multi-Agent Orchestration Pipeline."""

from __future__ import annotations

import time
from datetime import UTC, datetime
from typing import Any

import pytest

from hydromesh.blackboard import Blackboard
from hydromesh.pipeline import OrchestrationPipeline
from hydromesh.schemas import (
    BasinState,
    GateState,
    HydroPlantSpec,
    Incident,
    Severity,
    Telemetry,
    TwinSnapshot,
    WeatherObservation,
)
from hydromesh.weather import get_plant_by_id


@pytest.fixture
def tamakoshi_plant() -> HydroPlantSpec:
    plant = get_plant_by_id("upper_tamakoshi")
    assert plant is not None
    return plant


@pytest.fixture
def monsoon_telemetry() -> Telemetry:
    return Telemetry(
        ts=datetime.now(UTC),
        discharge_m3s=750.0,
        silt_ppm=2800.0,
        vibration_mm_s=3.8,
        grid_freq_hz=50.01,
        rainfall_mm_h=28.0,
    )


@pytest.fixture
def monsoon_weather() -> WeatherObservation:
    return WeatherObservation(
        ts=datetime.now(UTC),
        latitude=27.848,
        longitude=86.136,
        precipitation_mm_h=28.0,
        temperature_c=7.5,
        cloud_cover_pct=95.0,
        hourly_precipitation_48h=(25.0,) * 48,
        is_live=True,
    )


@pytest.fixture
def plant_snapshot() -> TwinSnapshot:
    return TwinSnapshot(
        ts=datetime.now(UTC),
        gates={0: GateState(gate_id=0, flow_m3s=30.0, design_flow_m3s=30.0)},
        basins={0: BasinState(basin_id=0, sediment_level=0.85, flushing=False)},
        available_mw=60.0,
        critical_feeders=("hospital", "water_pump", "ward_clinic"),
        runner_wear=0.10,
    )


@pytest.mark.asyncio
async def test_pipeline_end_to_end_surge_execution(
    tamakoshi_plant: HydroPlantSpec,
    monsoon_telemetry: Telemetry,
    monsoon_weather: WeatherObservation,
    plant_snapshot: TwinSnapshot,
) -> None:
    """Assert full pipeline runs through all 5 agents, passes safety kernel, and saves to blackboard."""
    bb = Blackboard()
    pipeline = OrchestrationPipeline(plant=tamakoshi_plant, blackboard=bb)

    start_t = time.perf_counter()
    incident = await pipeline.run_cycle(
        telemetry=monsoon_telemetry,
        weather=monsoon_weather,
        snapshot=plant_snapshot,
    )
    duration_ms = (time.perf_counter() - start_t) * 1000.0

    # 1. Latency requirement: executes in < 500 ms
    assert duration_ms < 500.0, f"Pipeline took {duration_ms:.2f} ms (target: < 500 ms)"

    # 2. Structural assertion on Incident
    assert isinstance(incident, Incident)
    assert incident.telemetry == monsoon_telemetry
    assert incident.anomaly is not None
    assert incident.anomaly.severity in (Severity.WARNING, Severity.CRITICAL)
    assert incident.forecast is not None
    assert incident.forecast.peak_silt_ppm >= 2800.0
    assert len(incident.sop_matches) > 0
    assert incident.decision is not None
    assert incident.verdict is not None
    assert incident.verdict.status == "approved"
    assert incident.execution is not None
    assert incident.execution.status == "executed"
    assert incident.report is not None
    assert "Sediment Influx Advisory" in incident.report.title

    # 3. Blackboard state assertion
    saved = await bb.get_incident(incident.id)
    assert saved is not None
    assert saved.id == incident.id

    tier = await bb.get_alert_tier(tamakoshi_plant.id)
    assert tier in ("warning", "critical")

    audit = await bb.get_audit_trail(plant_id=tamakoshi_plant.id)
    assert len(audit) >= 1
    assert audit[-1]["event_type"] == "pipeline_cycle_completed"


@pytest.mark.asyncio
async def test_pipeline_fail_closed_on_unsafe_proposal(
    tamakoshi_plant: HydroPlantSpec,
    monsoon_telemetry: Telemetry,
    monsoon_weather: WeatherObservation,
    plant_snapshot: TwinSnapshot,
) -> None:
    """Assert pipeline strictly halts execution if a proposal violates safety rules."""
    from hydromesh.schemas import AgentDecision, ModulateIntake

    bb = Blackboard()
    pipeline = OrchestrationPipeline(plant=tamakoshi_plant, blackboard=bb)

    # Monkey-patch dispatch agent to return an unsafe proposal (hallucinating 500 m3/s on a 30 m3/s gate)
    async def unsafe_dispatch(*args: Any, **kwargs: Any) -> AgentDecision:
        return AgentDecision(
            actions=(ModulateIntake(gate_id=0, flow_target_m3s=500.0),),
            rationale="Unsafe hallucinated flood gate opening",
            confidence=0.99,
        )

    pipeline.dispatch.run = unsafe_dispatch  # type: ignore[method-assign]

    incident = await pipeline.run_cycle(
        telemetry=monsoon_telemetry,
        weather=monsoon_weather,
        snapshot=plant_snapshot,
    )

    # Safety kernel strictly rejects R5 (target > design flow)
    assert incident.verdict is not None
    assert incident.verdict.status == "rejected"
    assert any("R5" in r for r in incident.verdict.reasons)
    # Physical execution is skipped: fail closed!
    assert incident.execution is not None
    assert incident.execution.status == "skipped"
