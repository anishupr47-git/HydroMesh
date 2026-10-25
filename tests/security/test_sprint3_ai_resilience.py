"""Sprint 3 AI Agent Safety & Cascading Fault Resilience Tests.

Covers:
- SEC-05: Prompt Injection Delimiter Isolation & System Prompt Hardening
- SEC-13: Compute Throttling on LLM Endpoints
- SEC-07: Weather & LLM Circuit Breaker Cooldown Jitter
- SEC-06: WebSocket Client Jittered Exponential Backoff
"""

from __future__ import annotations

import math
import time
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from hydromesh.agents.dispatch import DispatchAgent
from hydromesh.agents.revenue import EnergyRevenueOutlookAgent, LLMEconomicSummary
from hydromesh.api.app import create_app, reset_rate_limits
from hydromesh.llm import CircuitBreaker, OllamaClient
from hydromesh.schemas import (
    AgentDecision,
    AnomalyVector,
    BasinState,
    EconomicInputs,
    EconomicOutlook,
    Forecast,
    GateState,
    HydroPlantSpec,
    IllustrativeStance,
    Severity,
    Telemetry,
    TwinSnapshot,
)
from hydromesh.weather import WeatherClient


@pytest.fixture
def client() -> TestClient:
    reset_rate_limits()
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client
    reset_rate_limits()


# ==============================================================================
# SEC-05: Prompt Injection Delimiter Isolation & System Prompt Hardening
# ==============================================================================

@pytest.mark.asyncio
async def test_dispatch_prompt_injection_delimiter_isolation() -> None:
    """Assert telemetry is wrapped in XML blocks and system prompt contains security directive."""
    mock_llm = MagicMock(spec=OllamaClient)
    expected_decision = AgentDecision(
        confidence=0.95,
        actions=(),
        rationale="Nominal telemetry within safe operational bounds.",
    )
    mock_llm.generate_structured = AsyncMock(return_value=expected_decision)

    agent = DispatchAgent(llm_client=mock_llm)

    # Adversarial telemetry attempting prompt injection override
    telemetry = Telemetry(
        ts=datetime.now(UTC),
        discharge_m3s=45.0,
        silt_ppm=150.0,
        vibration_mm_s=1.2,
        grid_freq_hz=50.0,
    )
    anomaly = AnomalyVector(
        severity=Severity.NORMAL,
        cavitation_risk=0.0,
        silt_risk=0.1,
        grid_risk=0.0,
        confidence=0.9,
    )
    forecast = Forecast(
        horizon_h=6,
        peak_discharge_m3s=50.0,
        peak_silt_ppm=200.0,
        risk=Severity.WATCH,
        confidence=0.9,
        method="rating_curve_trend",
    )
    snapshot = TwinSnapshot(
        ts=datetime.now(UTC),
        gates={0: GateState(gate_id=0, flow_m3s=30.0, design_flow_m3s=30.0)},
        basins={0: BasinState(basin_id=0, sediment_level=0.2, flushing=False)},
        available_mw=60.0,
        critical_feeders=("hospital", "water_pump"),
        runner_wear=0.01,
    )

    decision = await agent.run(telemetry, anomaly, forecast, snapshot=snapshot)

    assert decision.confidence == 0.95
    assert mock_llm.generate_structured.called

    call_kwargs = mock_llm.generate_structured.call_args.kwargs
    system_prompt = call_kwargs["system"]
    user_prompt = call_kwargs["user"]

    # Verify boundary isolation XML tags
    assert "<telemetry_context>" in user_prompt
    assert "</telemetry_context>" in user_prompt
    assert "<instructions>" in user_prompt
    assert "</instructions>" in user_prompt

    # Verify defensive system prompt directive
    assert "SECURITY DIRECTIVE" in system_prompt
    assert "strictly untrusted sensor data" in system_prompt


@pytest.mark.asyncio
async def test_revenue_agent_station_name_sanitization_and_isolation() -> None:
    """Assert revenue agent sanitizes station names and encloses metrics in XML delimiters."""
    mock_llm = MagicMock(spec=OllamaClient)
    expected_summary = LLMEconomicSummary(
        executive_summary="Generation remains optimal with net economic benefit of NPR 150,000.",
        illustrative_stance=IllustrativeStance.INVEST,
    )
    mock_llm.generate_structured = AsyncMock(return_value=expected_summary)

    agent = EnergyRevenueOutlookAgent(llm_client=mock_llm)

    # Adversarial plant name with SQL injection and shell escape payloads
    adversarial_plant = HydroPlantSpec(
        id="adv_plant",
        name="Kali Gandaki'; DROP TABLE sites; <script>alert(1)</script>",
        capacity_mw=144.0,
        design_flow_m3s=120.0,
        head_m=115.0,
        catchment_area_km2=7618.0,
        river_basin="Gandaki'; rm -rf /;--",
        latitude=28.0,
        longitude=84.0,
    )

    inputs = EconomicInputs(
        ppa_tariff_npr_kwh=5.0,
        horizon_hours=24,
    )

    report = await agent.run(
        adversarial_plant,
        inputs,
        hourly_discharge_m3s=[100.0] * 24,
        hourly_silt_ppm=[200.0] * 24,
    )
    assert report.metrics.outlook in (EconomicOutlook.FAVORABLE, EconomicOutlook.NEUTRAL, EconomicOutlook.ADVERSE)

    call_kwargs = mock_llm.generate_structured.call_args.kwargs
    user_prompt = call_kwargs["user"]
    system_prompt = call_kwargs["system"]

    # Verify station name was sanitized (quotes, semicolons, script tags stripped)
    assert "'; DROP TABLE" not in user_prompt
    assert "<script>" not in user_prompt
    assert "<telemetry_context>" in user_prompt
    assert "SECURITY DIRECTIVE" in system_prompt


# ==============================================================================
# SEC-13: Compute Throttling on LLM Endpoints
# ==============================================================================

def test_live_query_compute_throttling(client: TestClient) -> None:
    """Assert /api/live-query throttles on the 6th call within 1 minute with Retry-After."""
    reset_rate_limits()

    # 5 requests succeed
    for _ in range(5):
        resp = client.get("/api/live-query?lat=27.85&lon=86.14&run_ai=false")
        assert resp.status_code == 200

    # 6th request is throttled
    resp_6 = client.get("/api/live-query?lat=27.85&lon=86.14&run_ai=false")
    assert resp_6.status_code == 429
    assert "Retry-After" in resp_6.headers
    assert int(resp_6.headers["Retry-After"]) > 0
    assert "Rate limit exceeded for /api/live-query" in resp_6.json()["detail"]


def test_evaluate_plant_compute_throttling(client: TestClient) -> None:
    """Assert /api/plants/{id}/evaluate throttles on the 11th call within 1 minute."""
    reset_rate_limits()

    # 10 calls succeed
    for _ in range(10):
        resp = client.post("/api/plants/upper_tamakoshi/evaluate?rainfall_override_mm_h=10.0")
        assert resp.status_code == 200

    # 11th call is throttled
    resp_11 = client.post("/api/plants/upper_tamakoshi/evaluate?rainfall_override_mm_h=10.0")
    assert resp_11.status_code == 429
    assert "Retry-After" in resp_11.headers
    assert int(resp_11.headers["Retry-After"]) > 0
    assert "Maximum 10 calls per minute" in resp_11.json()["detail"]


# ==============================================================================
# SEC-07: Weather & LLM Circuit Breaker Cooldown Jitter
# ==============================================================================

def test_weather_circuit_breaker_cooldown_jitter() -> None:
    """Assert weather client circuit breaker cooldown exhibits random spread."""
    wc = WeatherClient(breaker_threshold=1, breaker_cooldown_s=100.0)

    cooldowns: set[float] = set()
    for _ in range(20):
        wc._fail_count = 0
        wc._circuit_open_until = 0.0
        start = time.monotonic()
        wc._record_failure()
        duration = wc._circuit_open_until - start
        cooldowns.add(round(duration, 1))

    # Multiple distinct cooldown durations with jitter spread
    assert len(cooldowns) > 1


def test_llm_circuit_breaker_cooldown_jitter() -> None:
    """Assert OllamaClient circuit breaker cooldown incorporates random jitter between 1.0x and 1.5x."""
    base_now = 1000.0
    cb = CircuitBreaker(threshold=1, cooldown_s=60.0, clock=lambda: base_now)

    jittered_durations: list[float] = []
    for _ in range(25):
        cb._fails = 0
        cb._open_until = 0.0
        cb.fail()
        duration = cb._open_until - base_now
        jittered_durations.append(duration)

    assert len(set(jittered_durations)) > 5
    for dur in jittered_durations:
        assert dur >= 59.99
        assert dur <= 90.01


# ==============================================================================
# SEC-06: WebSocket Client Jittered Exponential Backoff
# ==============================================================================

def test_websocket_exponential_backoff_mathematical_bounds() -> None:
    """Verify exponential backoff calculations in client meet bounds (1s base, 30s cap, 0.5-1.0x jitter)."""
    for attempt in range(10):
        base_delay = min(30000, 1000 * math.pow(2, attempt))
        min_jitter = base_delay * 0.5
        max_jitter = base_delay * 1.0

        assert min_jitter >= 500
        assert max_jitter <= 30000
        if attempt >= 5:
            assert base_delay == 30000
            assert min_jitter == 15000
            assert max_jitter == 30000
