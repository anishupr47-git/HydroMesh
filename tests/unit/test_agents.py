"""Unit tests for the 5 specialized agent brains and supervisor."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import pytest

from hydromesh.agents.dispatch import DispatchAgent
from hydromesh.agents.explain import ExplainAgent
from hydromesh.agents.predictive import PredictiveAgent
from hydromesh.agents.sop_rag import SOPRAGAgent
from hydromesh.agents.supervisor import SupervisorAgent
from hydromesh.agents.triage import TriageAgent
from hydromesh.schemas import (
    AgentDecision,
    AnomalyVector,
    BasinState,
    Forecast,
    GateState,
    IncidentReport,
    ModulateIntake,
    RoutingPlan,
    SafetyVerdict,
    Severity,
    Telemetry,
    TriggerFlush,
    TwinSnapshot,
    WeatherObservation,
)
from hydromesh.weather import get_plant_by_id


@pytest.fixture
def clean_telemetry() -> Telemetry:
    return Telemetry(
        ts=datetime.now(UTC),
        discharge_m3s=50.0,
        silt_ppm=350.0,
        vibration_mm_s=1.2,
        grid_freq_hz=50.0,
        rainfall_mm_h=0.0,
    )


@pytest.fixture
def surge_telemetry() -> Telemetry:
    return Telemetry(
        ts=datetime.now(UTC),
        discharge_m3s=850.0,
        silt_ppm=3100.0,
        vibration_mm_s=4.6,
        grid_freq_hz=49.95,
        rainfall_mm_h=35.0,
    )


@pytest.fixture
def sample_weather() -> WeatherObservation:
    return WeatherObservation(
        ts=datetime.now(UTC),
        latitude=27.848,
        longitude=86.136,
        precipitation_mm_h=20.0,
        temperature_c=9.0,
        cloud_cover_pct=90.0,
        hourly_precipitation_48h=(15.0,) * 48,
        is_live=True,
    )


@pytest.fixture
def sample_snapshot() -> TwinSnapshot:
    return TwinSnapshot(
        ts=datetime.now(UTC),
        gates={0: GateState(gate_id=0, flow_m3s=30.0, design_flow_m3s=30.0)},
        basins={0: BasinState(basin_id=0, sediment_level=0.75, flushing=False)},
        available_mw=60.0,
        critical_feeders=("hospital", "water_pump", "ward_clinic"),
        runner_wear=0.08,
    )


# --- 1. Triage Agent Tests -------------------------------------------------------------
@pytest.mark.asyncio
async def test_triage_clean_water(clean_telemetry: Telemetry) -> None:
    triage = TriageAgent()
    vec = await triage.run(clean_telemetry)
    assert isinstance(vec, AnomalyVector)
    assert vec.severity == Severity.NORMAL
    assert vec.confidence >= 0.90
    assert vec.silt_risk < 0.20


@pytest.mark.asyncio
async def test_triage_surge_water(surge_telemetry: Telemetry) -> None:
    triage = TriageAgent()
    vec = await triage.run(surge_telemetry)
    assert vec.severity == Severity.CRITICAL
    assert vec.silt_risk > 0.80


@pytest.mark.asyncio
async def test_triage_unphysical_sensor_jump(clean_telemetry: Telemetry) -> None:
    triage = TriageAgent(max_discharge_rate_m3s_s=5.0)
    jump_telem = clean_telemetry.model_copy(
        update={
            "ts": clean_telemetry.ts,
            "discharge_m3s": 500.0,  # 450 m3/s jump in 0 seconds
        }
    )
    vec = await triage.run(jump_telem, history=(clean_telemetry,))
    assert vec.confidence < 0.80  # Penalized confidence due to sensor unphysicality


# --- 2. Predictive Agent Tests ---------------------------------------------------------
@pytest.mark.asyncio
async def test_predictive_agent(surge_telemetry: Telemetry, sample_weather: WeatherObservation) -> None:
    plant = get_plant_by_id("upper_tamakoshi")
    predictive = PredictiveAgent(plant=plant)
    forecast = await predictive.run(surge_telemetry, sample_weather, horizon_h=24)
    assert isinstance(forecast, Forecast)
    assert forecast.horizon_h == 24
    assert forecast.peak_discharge_m3s >= surge_telemetry.discharge_m3s
    assert forecast.peak_silt_ppm >= surge_telemetry.silt_ppm
    assert forecast.risk == Severity.CRITICAL
    assert forecast.method == "rating_curve_trend"


# --- 3. SOP RAG Agent Tests ------------------------------------------------------------
@pytest.mark.asyncio
async def test_sop_rag_agent(surge_telemetry: Telemetry) -> None:
    triage = TriageAgent()
    anomaly = await triage.run(surge_telemetry)
    sop_rag = SOPRAGAgent()
    matches, incidents = await sop_rag.run(surge_telemetry, anomaly)
    assert len(matches) > 0
    assert any(
        "High Silt" in m.section or "Sediment" in m.section or "Trigger" in m.section or "SOP" in m.doc_id
        for m in matches
    )
    assert len(incidents) > 0
    assert incidents[0].outcome == "protected"


# --- 4. Dispatch Agent Tests -----------------------------------------------------------
@pytest.mark.asyncio
async def test_dispatch_deterministic_critical_fallback(
    surge_telemetry: Telemetry,
    sample_snapshot: TwinSnapshot,
) -> None:
    triage = TriageAgent()
    anomaly = await triage.run(surge_telemetry)
    forecast = Forecast(
        horizon_h=24,
        peak_discharge_m3s=900.0,
        peak_silt_ppm=3200.0,
        risk=Severity.CRITICAL,
        confidence=0.90,
        method="rating_curve_trend",
    )
    dispatch = DispatchAgent(llm_client=None)  # forces deterministic fallback
    decision = await dispatch.run(
        telemetry=surge_telemetry,
        anomaly=anomaly,
        forecast=forecast,
        snapshot=sample_snapshot,
    )
    assert isinstance(decision, AgentDecision)
    assert len(decision.actions) == 2
    assert isinstance(decision.actions[0], ModulateIntake)
    assert isinstance(decision.actions[1], TriggerFlush)
    assert decision.confidence >= 0.90


@pytest.mark.asyncio
async def test_dispatch_deterministic_elevated_and_normal(
    clean_telemetry: Telemetry,
    sample_snapshot: TwinSnapshot,
) -> None:
    triage = TriageAgent()
    dispatch = DispatchAgent(llm_client=None)

    # Elevated silt: 1800 ppm
    elevated_telem = clean_telemetry.model_copy(update={"silt_ppm": 1800.0})
    anom_elevated = await triage.run(elevated_telem)
    fc_elevated = Forecast(
        horizon_h=24,
        peak_discharge_m3s=500.0,
        peak_silt_ppm=2200.0,
        risk=Severity.WARNING,
        confidence=0.88,
        method="rating_curve_trend",
    )
    dec_elevated = await dispatch.run(
        telemetry=elevated_telem,
        anomaly=anom_elevated,
        forecast=fc_elevated,
        snapshot=sample_snapshot,
    )
    assert len(dec_elevated.actions) == 2
    assert isinstance(dec_elevated.actions[1], TriggerFlush)
    assert dec_elevated.actions[1].duration_mins == 30

    # Normal silt: 350 ppm
    anom_normal = await triage.run(clean_telemetry)
    dec_normal = await dispatch.run(
        telemetry=clean_telemetry,
        anomaly=anom_normal,
        forecast=fc_elevated,
        snapshot=sample_snapshot,
    )
    assert len(dec_normal.actions) == 1
    assert isinstance(dec_normal.actions[0], ModulateIntake)


@pytest.mark.asyncio
async def test_dispatch_with_mock_llm(
    surge_telemetry: Telemetry,
    sample_snapshot: TwinSnapshot,
) -> None:
    class MockLLM:
        async def generate_structured(self, **kwargs: Any) -> AgentDecision:
            return AgentDecision(
                actions=(ModulateIntake(gate_id=0, flow_target_m3s=24.0),),
                rationale="LLM proposed intake modulation",
                confidence=0.94,
            )

    triage = TriageAgent()
    anomaly = await triage.run(surge_telemetry)
    fc = Forecast(
        horizon_h=24,
        peak_discharge_m3s=850.0,
        peak_silt_ppm=3100.0,
        risk=Severity.CRITICAL,
        confidence=0.90,
        method="rating_curve_trend",
    )
    dispatch = DispatchAgent(llm_client=MockLLM())  # type: ignore[arg-type]
    dec = await dispatch.run(surge_telemetry, anomaly, fc, snapshot=sample_snapshot)
    assert len(dec.actions) == 1
    assert dec.confidence == 0.94


# --- 5. Explain Agent Tests ------------------------------------------------------------
@pytest.mark.asyncio
async def test_explain_agent(
    surge_telemetry: Telemetry,
) -> None:
    triage = TriageAgent()
    anomaly = await triage.run(surge_telemetry)
    forecast = Forecast(
        horizon_h=24,
        peak_discharge_m3s=890.0,
        peak_silt_ppm=3150.0,
        risk=Severity.CRITICAL,
        confidence=0.90,
        method="rating_curve_trend",
    )
    decision = AgentDecision(
        actions=(ModulateIntake(gate_id=0, flow_target_m3s=20.0), TriggerFlush(basin_id=0, duration_mins=45)),
        rationale="Emergency sediment mitigation",
        confidence=0.92,
    )
    verdict = SafetyVerdict(status="approved", approved_actions=decision.actions)

    explain = ExplainAgent()
    report = await explain.run(
        telemetry=surge_telemetry,
        anomaly=anomaly,
        forecast=forecast,
        decision=decision,
        verdict=verdict,
    )
    assert isinstance(report, IncidentReport)
    assert "CRITICAL" in report.title
    assert "3100 ppm" in report.trigger
    assert "APPROVED" in report.action_taken


# --- 6. Supervisor Agent Tests ---------------------------------------------------------
@pytest.mark.asyncio
async def test_supervisor_agent(clean_telemetry: Telemetry, surge_telemetry: Telemetry) -> None:
    triage = TriageAgent()
    supervisor = SupervisorAgent()

    # Clean water -> fast path
    vec_clean = await triage.run(clean_telemetry)
    plan_clean = await supervisor.run(clean_telemetry, vec_clean)
    assert isinstance(plan_clean, RoutingPlan)
    assert plan_clean.steps == ("triage", "dispatch")

    # Mud surge -> full 5-step path
    vec_surge = await triage.run(surge_telemetry)
    plan_surge = await supervisor.run(surge_telemetry, vec_surge)
    assert plan_surge.steps == ("triage", "predict", "sop_rag", "dispatch", "explain")
