"""Unit tests verifying schema contracts and conftest fixtures for Day 1."""

from __future__ import annotations

from typing import Any

import pytest
from pydantic import ValidationError

from hydromesh.schemas import (
    AgentDecision,
    AgentEvent,
    AlertTier,
    AnomalyVector,
    ExecutionResult,
    ExecutionStatus,
    Forecast,
    Incident,
    IncidentReport,
    ModulateIntake,
    ReallocateDispatch,
    RoutingPlan,
    SafetyStatus,
    SafetyVerdict,
    SimilarIncident,
    SOPMatch,
    Telemetry,
    TriggerFlush,
    TwinSnapshot,
)


def test_telemetry_schema(sample_telemetry: dict[str, Any]) -> None:
    telemetry = Telemetry(**sample_telemetry)
    assert telemetry.river_discharge_m3s == 48.5
    assert telemetry.suspended_sediment_ppm == 1850.0
    assert telemetry.grid_frequency_hz == 50.02


def test_forecast_schema(sample_forecast: dict[str, Any]) -> None:
    forecast = Forecast(**sample_forecast)
    assert forecast.horizon_hours == 12
    assert forecast.peak_discharge_m3s == 62.0
    assert forecast.confidence == 0.88


def test_anomaly_vector_schema(sample_anomaly: dict[str, Any]) -> None:
    anomaly = AnomalyVector(**sample_anomaly)
    assert anomaly.severity == AlertTier.YELLOW
    assert anomaly.silt_risk == 0.82
    assert anomaly.primary_factor == "suspended_sediment_ppm"


def test_action_discriminated_union(sample_actions: list[dict[str, Any]]) -> None:
    intake = ModulateIntake(**sample_actions[0])
    flush = TriggerFlush(**sample_actions[1])
    dispatch = ReallocateDispatch(**sample_actions[2])

    assert intake.action_type == "ModulateIntake"
    assert flush.action_type == "TriggerFlush"
    assert dispatch.action_type == "ReallocateDispatch"


def test_agent_decision_schema(sample_agent_decision: dict[str, Any]) -> None:
    decision = AgentDecision(**sample_agent_decision)
    assert decision.decision_id == "dec_20260715_001"
    assert len(decision.actions) == 3
    assert decision.confidence == 0.92
    assert isinstance(decision.actions[0], ModulateIntake)


def test_safety_verdict_schema(sample_safety_verdict: dict[str, Any]) -> None:
    verdict = SafetyVerdict(**sample_safety_verdict)
    assert verdict.verdict == SafetyStatus.APPROVED
    assert len(verdict.evaluated_rules) == 11
    assert len(verdict.clamped_actions) == 3
    assert len(verdict.violations) == 0


def test_twin_snapshot_schema(sample_twin_snapshot: dict[str, Any]) -> None:
    twin = TwinSnapshot(**sample_twin_snapshot)
    assert twin.tick == 420
    assert twin.runner_wear_mm == 1.45
    assert "desander_basin_1" in twin.desander_basins


def test_sop_match_and_similar_incident(sample_sop_match: dict[str, Any]) -> None:
    sop = SOPMatch(**sample_sop_match)
    assert sop.sop_id == "SOP-SILT-001"
    assert sop.similarity_score == 0.93

    incident = SimilarIncident(
        incident_id="inc_hist_01",
        timestamp="2025-08-10T11:00:00Z",
        similarity_score=0.89,
        outcome="Flushed basin 1, avoided shutdown.",
    )
    assert incident.incident_id == "inc_hist_01"


def test_incident_report_and_execution_result(
    sample_incident_report: dict[str, Any],
) -> None:
    report = IncidentReport(**sample_incident_report)
    assert report.alert_tier == AlertTier.YELLOW
    assert report.ack_window_seconds == 600

    result = ExecutionResult(
        action_id="act_001",
        status=ExecutionStatus.PENDING_OVERRIDE,
        timestamp="2026-07-15T14:30:00Z",
    )
    assert result.status == ExecutionStatus.PENDING_OVERRIDE


def test_routing_plan_and_agent_event() -> None:
    plan = RoutingPlan(
        plan_id="plan_001",
        active_steps=["triage", "predict", "sop_rag", "dispatch", "safety"],
        initiated_at="2026-07-15T14:30:00Z",
    )
    assert len(plan.active_steps) == 5

    event = AgentEvent(
        event_id="evt_001",
        timestamp="2026-07-15T14:30:00Z",
        source_agent="triage",
        kind="warning",
        payload={"tier": "YELLOW"},
    )
    assert event.kind == "warning"


def test_incident_aggregate(
    sample_telemetry: dict[str, Any],
    sample_forecast: dict[str, Any],
    sample_anomaly: dict[str, Any],
    sample_agent_decision: dict[str, Any],
    sample_safety_verdict: dict[str, Any],
    sample_incident_report: dict[str, Any],
) -> None:
    incident = Incident(
        incident_id="inc_20260715_089",
        telemetry=Telemetry(**sample_telemetry),
        forecast=Forecast(**sample_forecast),
        anomaly=AnomalyVector(**sample_anomaly),
        decision=AgentDecision(**sample_agent_decision),
        verdict=SafetyVerdict(**sample_safety_verdict),
        report=IncidentReport(**sample_incident_report),
    )
    assert incident.incident_id == "inc_20260715_089"
    assert incident.telemetry is not None
    assert incident.telemetry.river_discharge_m3s == 48.5


def test_schema_immutability(sample_telemetry: dict[str, Any]) -> None:
    telemetry = Telemetry(**sample_telemetry)
    with pytest.raises(ValidationError):
        # HydroMeshBaseModel is frozen: mutations must fail validation
        telemetry.river_discharge_m3s = 99.0


def test_schema_extra_forbid(sample_telemetry: dict[str, Any]) -> None:
    payload = dict(sample_telemetry)
    payload["unexpected_field"] = "bad_data"
    with pytest.raises(ValidationError):
        Telemetry(**payload)
