"""Pytest configuration and shared test fixtures for Day 2 (Foundations)."""

from __future__ import annotations

from collections.abc import AsyncIterator, Generator
from typing import Any

import fakeredis.aioredis
import httpx
import pytest
from fastapi import FastAPI

from hydromesh.api.app import create_app
from hydromesh.settings import Settings


@pytest.fixture
def test_settings(tmp_path: Any) -> Settings:
    """Provide isolated test settings with deterministic parameters."""
    return Settings(
        env="test",
        debug=True,
        mock_mode=True,
        redis_url="redis://localhost:6379/15",
        chroma_persist_dir=str(tmp_path / "chroma_test"),
        llm_model="qwen2.5:7b-instruct",
        llm_temperature=0.0,
    )


@pytest.fixture
def app() -> FastAPI:
    """Instantiate a fresh FastAPI app for integration testing."""
    return create_app()


@pytest.fixture
async def async_client(app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    """Yield an async HTTP test client bound to the FastAPI ASGI app."""
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client


@pytest.fixture
async def fake_redis() -> AsyncIterator[fakeredis.aioredis.FakeRedis]:
    """Provide an in-memory asynchronous Redis client for Blackboard testing."""
    client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    try:
        yield client
    finally:
        await client.flushall()
        await client.aclose()


@pytest.fixture
def sample_telemetry() -> dict[str, Any]:
    """Provide realistic digital twin telemetry payload for Himalayan plant."""
    return {
        "timestamp": "2026-07-15T14:30:00Z",
        "river_discharge_m3s": 48.5,
        "suspended_sediment_ppm": 1850.0,
        "turbine_vibration_rms": 2.1,
        "grid_frequency_hz": 50.02,
        "catchment_rainfall_mm_h": 16.4,
    }


@pytest.fixture
def sample_forecast() -> dict[str, Any]:
    """Provide 12–24h predictive forecast payload."""
    return {
        "horizon_hours": 12,
        "peak_discharge_m3s": 62.0,
        "peak_sediment_ppm": 3400.0,
        "risk_window_start": "2026-07-15T18:00:00Z",
        "risk_window_end": "2026-07-16T02:00:00Z",
        "confidence": 0.88,
    }


@pytest.fixture
def sample_anomaly() -> dict[str, Any]:
    """Provide triage AnomalyVector payload with active risk triggers."""
    return {
        "silt_risk": 0.82,
        "flood_risk": 0.35,
        "cavitation_risk": 0.18,
        "severity": "YELLOW",
        "primary_factor": "suspended_sediment_ppm",
    }


@pytest.fixture
def sample_actions() -> list[dict[str, Any]]:
    """Provide standard candidate action list for dispatch evaluation."""
    return [
        {
            "action_type": "ModulateIntake",
            "intake_id": "intake_main",
            "target_flow_m3s": 35.0,
            "ramp_rate_m3s_per_min": 2.0,
        },
        {
            "action_type": "TriggerFlush",
            "basin_id": "desander_basin_1",
            "duration_minutes": 30,
        },
        {
            "action_type": "ReallocateDispatch",
            "active_units": ["unit_1", "unit_2"],
            "target_mw": 24.5,
        },
    ]


@pytest.fixture
def sample_agent_decision(sample_actions: list[dict[str, Any]]) -> dict[str, Any]:
    """Provide proposed AgentDecision before SafetyValidator review."""
    return {
        "decision_id": "dec_20260715_001",
        "actions": sample_actions,
        "confidence": 0.92,
        "rationale": "Forecast indicates sediment spike above 3000 PPM within 4h; open desander 1 to scour silt.",
    }


@pytest.fixture
def sample_twin_snapshot() -> dict[str, Any]:
    """Provide complete plant twin snapshot for deterministic validator context."""
    return {
        "tick": 420,
        "timestamp": "2026-07-15T14:30:00Z",
        "intake_flow_m3s": 48.5,
        "desander_basins": {
            "desander_basin_1": {"silt_depth_m": 2.1, "is_flushing": False, "last_flush_min_ago": 180},
            "desander_basin_2": {"silt_depth_m": 0.8, "is_flushing": False, "last_flush_min_ago": 240},
        },
        "runner_wear_mm": 1.45,
        "current_generation_mw": 32.0,
        "available_generation_mw": 35.0,
        "recent_action_count_10m": 0,
    }


@pytest.fixture
def sample_safety_verdict(sample_actions: list[dict[str, Any]]) -> dict[str, Any]:
    """Provide deterministic SafetyVerdict payload."""
    return {
        "verdict": "approved",
        "evaluated_rules": ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10", "R11"],
        "clamped_actions": sample_actions,
        "violations": [],
        "notes": "All actions cleared deterministic bounds R1-R11.",
    }


@pytest.fixture
def sample_sop_match() -> dict[str, Any]:
    """Provide RAG-retrieved standard operating procedure match."""
    return {
        "sop_id": "SOP-SILT-001",
        "title": "High Sediment Inflow Mitigation Protocol",
        "similarity_score": 0.93,
        "prescribed_actions": ["Trigger desander flush when silt exceeds 1,200 PPM", "Throttle intake by 25%"],
    }


@pytest.fixture
def sample_incident_report() -> dict[str, Any]:
    """Provide operator-facing incident summary report."""
    return {
        "incident_id": "inc_20260715_089",
        "timestamp": "2026-07-15T14:30:00Z",
        "alert_tier": "YELLOW",
        "status": "pending_operator_ack",
        "summary": "Monsoon sediment surge detected at upstream sensor. Desander flush scheduled.",
        "requires_override": True,
        "ack_window_seconds": 600,
    }
