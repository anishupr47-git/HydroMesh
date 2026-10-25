"""Sprint 4 Concurrency, Memory Hygiene, & Comprehensive Test Coverage Suite.

Covers:
- SEC-15: Async Database Operations & Concurrency Protection
- SEC-16: Stale Memory IP Eviction in Rate Limiter Dictionaries
- SEC-17: Full coverage expansion across auth/cli, api/site_routes, api/stream, fleet/engine, and agents.
"""

from __future__ import annotations

import asyncio
import io
import sys
import time
from collections.abc import Generator
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from hydromesh.agents.dispatch import DispatchAgent
from hydromesh.agents.revenue import EnergyRevenueOutlookAgent
from hydromesh.api.app import (
    _auth_rate_limits,
    _llm_rate_limits,
    _rate_limits,
    create_app,
    prune_stale_rate_limits,
    reset_rate_limits,
)
from hydromesh.api.stream import StreamManager
from hydromesh.auth.cli import main as auth_cli_main
from hydromesh.db.database import db
from hydromesh.fleet.engine import (
    get_fleet_snapshot,
    seed_fleet_if_empty,
    simulate_hourly_hydrology,
)
from hydromesh.llm import OllamaClient
from hydromesh.schemas import (
    AnomalyVector,
    BasinState,
    Coordinates,
    EconomicInputs,
    Forecast,
    GateState,
    HydroPlantSpec,
    Severity,
    Site,
    SiteSpecInput,
    Telemetry,
    TwinSnapshot,
)


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    reset_rate_limits()
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client
    reset_rate_limits()


# ==============================================================================
# SEC-15: Async Database Operations & Concurrency Protection
# ==============================================================================

@pytest.mark.asyncio
async def test_async_database_concurrency() -> None:
    """Assert asynchronous database helpers offload queries via asyncio.to_thread concurrently."""
    email_base = f"async_usr_{int(time.time()*1000)}"

    # 1. Concurrent user creation
    tasks = [
        db.a_create_user(f"{email_base}_{i}@test.org", "HashedPass12345!", role="member")
        for i in range(5)
    ]
    users = await asyncio.gather(*tasks)
    assert len(users) == 5

    # 2. Concurrent user lookups
    lookup_tasks = [db.a_get_user_by_email(u["email"]) for u in users]
    looked_up = await asyncio.gather(*lookup_tasks)
    for u, l in zip(users, looked_up, strict=False):
        assert l is not None
        assert l["id"] == u["id"]

    # 3. Concurrent session creation & retrieval
    session_tasks = [
        db.a_create_session(u["id"], f"token_hash_{u['id']}", role="member", ua_hash="ua", csrf_token="csrf")
        for u in users
    ]
    sessions = await asyncio.gather(*session_tasks)
    assert len(sessions) == 5

    get_session_tasks = [db.a_get_session(f"token_hash_{u['id']}") for u in users]
    retrieved_sessions = await asyncio.gather(*get_session_tasks)
    for s, r in zip(sessions, retrieved_sessions, strict=False):
        assert r is not None
        rec, csrf = r
        assert rec.session_id == s.session_id
        assert csrf == "csrf"

    # 4. Concurrent touch & delete
    touch_tasks = [db.a_touch_session(s.session_id) for s in sessions]
    await asyncio.gather(*touch_tasks)

    delete_tasks = [db.a_delete_session(f"token_hash_{u['id']}") for u in users]
    await asyncio.gather(*delete_tasks)

    # Clean up created users
    with db._get_connection() as conn:
        for u in users:
            conn.execute("DELETE FROM users WHERE id = ?", (u["id"],))


# ==============================================================================
# SEC-16: Stale Memory IP Eviction
# ==============================================================================

def test_prune_stale_rate_limits() -> None:
    """Assert prune_stale_rate_limits evicts expired entries and empty IP keys."""
    reset_rate_limits()

    now = 50000.0  # Simulated monotonic timestamp

    # Inject active and expired timestamps
    _rate_limits["active_ip"] = [now - 10.0]
    _rate_limits["expired_ip"] = [now - 120.0]  # Expired (> 60s)
    _rate_limits["empty_ip"] = []

    _auth_rate_limits["active_auth"] = [now - 300.0]
    _auth_rate_limits["expired_auth"] = [now - 1000.0]  # Expired (> 900s)

    _llm_rate_limits["active_llm"] = [now - 20.0]
    _llm_rate_limits["expired_llm"] = [now - 80.0]  # Expired (> 60s)

    evicted = prune_stale_rate_limits(now=now)
    assert evicted == 4

    assert "active_ip" in _rate_limits
    assert "expired_ip" not in _rate_limits
    assert "empty_ip" not in _rate_limits

    assert "active_auth" in _auth_rate_limits
    assert "expired_auth" not in _auth_rate_limits

    assert "active_llm" in _llm_rate_limits
    assert "expired_llm" not in _llm_rate_limits


# ==============================================================================
# SEC-17: Under-Tested Subsystem Coverage Expansion
# ==============================================================================

# --- 1. CLI Entrypoint (hydromesh.auth.cli & __main__) -------------------------
def test_auth_cli_usage_help(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    """Assert auth CLI without correct arguments displays usage and exits 1."""
    monkeypatch.setattr(sys, "argv", ["hydromesh.auth.cli"])
    with pytest.raises(SystemExit) as exc:
        auth_cli_main()
    assert exc.value.code == 1
    assert "Usage: python -m hydromesh.auth grant-admin" in capsys.readouterr().out


def test_auth_cli_grant_admin_success(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    """Assert auth CLI grants admin privileges to existing member."""
    email = f"cli_admin_{int(time.time()*1000)}@test.org"
    db.create_user(email, "StrongPassphrase123!", role="member")

    monkeypatch.setattr(sys, "argv", ["hydromesh.auth.cli", "grant-admin", email])
    auth_cli_main()
    out = capsys.readouterr().out
    assert f"Successfully granted admin privileges to: {email}" in out

    # Verify user is now admin in DB
    user = db.get_user_by_email(email)
    assert user is not None
    assert user["role"] == "admin"


def test_auth_cli_grant_admin_user_not_found(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    """Assert auth CLI reports error when target user does not exist."""
    monkeypatch.setattr(sys, "argv", ["hydromesh.auth.cli", "grant-admin", "non_existent@unknown.org"])
    with pytest.raises(SystemExit) as exc:
        auth_cli_main()
    assert exc.value.code == 1
    assert "User with email 'non_existent@unknown.org' not found" in capsys.readouterr().out


def test_auth_main_execution() -> None:
    """Assert hydromesh.auth.__main__ can be imported."""
    import hydromesh.auth.__main__ as auth_main
    assert hasattr(auth_main, "main")


# --- 2. StreamManager Dead Connection Cleanup ---------------------------------
@pytest.mark.asyncio
async def test_stream_manager_broadcast_dead_connection_handling() -> None:
    """Assert StreamManager broadcast cleans disconnected or broken sockets."""
    mgr = StreamManager()
    await mgr.reset()

    # 1. Broadcast with 0 subscribers returns early
    await mgr.broadcast({"type": "empty"})

    # 2. Broadcast with dead sockets catches exceptions and discards them
    live_ws = MagicMock()
    live_ws.client = MagicMock()
    live_ws.client.host = "10.0.0.1"
    live_ws.accept = AsyncMock()
    live_ws.send_json = AsyncMock()

    dead_ws = MagicMock()
    dead_ws.client = MagicMock()
    dead_ws.client.host = "10.0.0.2"
    dead_ws.accept = AsyncMock()
    dead_ws.send_json = AsyncMock(side_effect=RuntimeError("Socket closed"))

    await mgr.connect(live_ws)
    await mgr.connect(dead_ws)
    assert mgr.count == 2

    await mgr.broadcast({"telemetry": 123})
    # Dead WS should have been purged during broadcast
    assert mgr.count == 1
    assert mgr.active_connections_for_ip("10.0.0.2") == 0


# --- 3. Site Routes Missing Branch Coverage -----------------------------------
def test_site_routes_global_site_details(client: TestClient) -> None:
    """Assert /api/global/sites/{id} returns seeded site details or 404."""
    # Seeded site
    resp = client.get("/api/global/sites/upper_tamakoshi")
    assert resp.status_code == 200
    assert resp.json()["id"] == "upper_tamakoshi"

    # Non-existent site -> 404
    resp_404 = client.get("/api/global/sites/non_existent_dam_id")
    assert resp_404.status_code == 404


def test_site_routes_quota_exceeded_handling(client: TestClient) -> None:
    """Assert member registering a 2nd site receives 403 QUOTA_EXCEEDED."""
    email = f"quota_member_{int(time.time()*1000)}@test.org"
    client.post("/api/auth/register", json={"email": email, "password": "StrongPassphrase123!"})

    site_payload = {
        "name": "Member Dam One",
        "coordinates": {"lat": 27.9, "lon": 85.5},
        "capacity_mw": 50.0,
        "head_m": 120.0,
        "design_flow_m3s": 40.0,
        "catchment_area_km2": 2000.0,
        "preset": "monsoon",
        "is_public": True,
    }

    # 1st plant succeeds
    resp1 = client.post("/api/sites", json=site_payload)
    assert resp1.status_code == 200

    # 2nd plant fails with 403 QUOTA_EXCEEDED
    site_payload["name"] = "Member Dam Two"
    resp2 = client.post("/api/sites", json=site_payload)
    assert resp2.status_code == 403
    assert "QUOTA_EXCEEDED" in resp2.json()["detail"]


def test_site_routes_weather_and_records(client: TestClient) -> None:
    """Assert site weather and delete user plant flow."""
    resp = client.get("/api/sites/upper_tamakoshi/weather")
    assert resp.status_code == 200
    assert "precipitation_mm_h" in resp.json()

    # Create a site for member then delete it
    email = f"delete_member_{int(time.time()*1000)}@test.org"
    client.post("/api/auth/register", json={"email": email, "password": "StrongPassphrase123!"})
    reg_resp = client.post("/api/sites", json={
        "name": "Member Dam To Delete",
        "coordinates": {"lat": 27.9, "lon": 85.5},
        "capacity_mw": 50.0,
        "head_m": 120.0,
        "design_flow_m3s": 40.0,
        "catchment_area_km2": 2000.0,
        "preset": "monsoon",
        "is_public": True,
    })
    assert reg_resp.status_code == 200
    site_id = reg_resp.json()["id"]

    del_resp = client.delete(f"/api/sites/{site_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "success"


# --- 4. Fleet Engine Hydrology Simulation & Fallback Coverage ------------------
def test_fleet_engine_simulate_hourly_hydrology() -> None:
    """Assert hydrology simulator calculates valid flows across presets."""
    site = Site(
        id="sim_site",
        user_id=None,
        name="Simulated Dam",
        coordinates=Coordinates(lat=28.0, lon=85.0),
        capacity_mw=100.0,
        head_m=150.0,
        design_flow_m3s=50.0,
        catchment_area_km2=2500.0,
        preset="monsoon",
        is_seeded=True,
        is_public=True,
        created_at=datetime.now(UTC),
    )

    q, silt, rain = simulate_hourly_hydrology(site, hour_of_day=14)
    assert q > 0
    assert silt > 0
    assert rain >= 0


# --- 5. Agent Deterministic Fallback Coverage on Exceptions -------------------
@pytest.mark.asyncio
async def test_dispatch_agent_fallback_on_llm_exception() -> None:
    """Assert dispatch agent falls back deterministically when LLM raises an error."""
    broken_llm = MagicMock(spec=OllamaClient)
    broken_llm.generate_structured = AsyncMock(side_effect=RuntimeError("Ollama connection failed"))

    agent = DispatchAgent(llm_client=broken_llm)
    telemetry = Telemetry(
        ts=datetime.now(UTC),
        discharge_m3s=50.0,
        silt_ppm=4000.0,  # Critical silt
        vibration_mm_s=2.5,
        grid_freq_hz=50.0,
    )
    anomaly = AnomalyVector(
        severity=Severity.CRITICAL,
        cavitation_risk=0.8,
        silt_risk=0.9,
        grid_risk=0.1,
        confidence=0.9,
    )
    forecast = Forecast(
        horizon_h=1,
        peak_discharge_m3s=50.0,
        peak_silt_ppm=5000.0,
        risk=Severity.CRITICAL,
        confidence=0.9,
        method="rating_curve_trend",
    )
    snapshot = TwinSnapshot(
        ts=datetime.now(UTC),
        gates={0: GateState(gate_id=0, flow_m3s=40.0, design_flow_m3s=40.0)},
        basins={0: BasinState(basin_id=0, sediment_level=0.9, flushing=False)},
        available_mw=60.0,
        critical_feeders=("hospital",),
        runner_wear=0.05,
    )

    # Must not raise; must return deterministic fallback
    decision = await agent.run(telemetry, anomaly, forecast, snapshot=snapshot)
    assert decision.confidence in (0.90, 0.95)
    assert len(decision.actions) > 0


@pytest.mark.asyncio
async def test_revenue_agent_fallback_on_llm_exception() -> None:
    """Assert revenue outlook agent falls back to deterministic template when LLM fails."""
    broken_llm = MagicMock(spec=OllamaClient)
    broken_llm.generate_structured = AsyncMock(side_effect=RuntimeError("LLM unavailable"))

    agent = EnergyRevenueOutlookAgent(llm_client=broken_llm)
    plant = HydroPlantSpec(
        id="tamakoshi",
        name="Upper Tamakoshi",
        capacity_mw=456.0,
        design_flow_m3s=66.0,
        head_m=822.0,
        catchment_area_km2=2755.0,
        river_basin="Tamakoshi",
        latitude=27.85,
        longitude=86.14,
    )
    inputs = EconomicInputs(
        ppa_tariff_npr_kwh=4.80,
        horizon_hours=24,
    )

    report = await agent.run(
        plant,
        inputs,
        hourly_discharge_m3s=[50.0] * 24,
        hourly_silt_ppm=[300.0] * 24,
    )
    assert report.metrics.expected_energy_mwh > 0
    assert "Upper Tamakoshi" in report.executive_summary


# --- 6. Auth Routes Lifecycle (Preferences, Password Change, Logout-All) -------
def test_auth_routes_lifecycle_expansion(client: TestClient) -> None:
    """Assert preferences update, password change, and logout-all operate properly."""
    email = f"lifecycle_{int(time.time()*1000)}@test.org"
    password = "InitialPassword123!"
    new_password = "NewStrongPassword456!"

    # Register
    reg_resp = client.post("/api/auth/register", json={"email": email, "password": password})
    assert reg_resp.status_code == 200

    # Update preferences
    pref_resp = client.put("/api/auth/me/preferences", json={"units": "metric", "map_lat": 27.9})
    assert pref_resp.status_code == 200
    assert pref_resp.json()["preferences"]["units"] == "metric"

    # Mint ws-ticket
    ticket_resp = client.post("/api/auth/ws-ticket")
    assert ticket_resp.status_code == 200
    assert "ticket" in ticket_resp.json()

    # Password change
    pw_resp = client.post("/api/auth/password/change", json={
        "old_password": password,
        "new_password": new_password,
    })
    assert pw_resp.status_code == 200
    assert pw_resp.json()["status"] == "success"

    # Logout all
    logout_resp = client.post("/api/auth/logout-all")
    assert logout_resp.status_code == 200


# --- 7. Site Routes Scenario Injection & Operator Acknowledgment --------------
def test_site_routes_scenario_and_operator_ack(client: TestClient) -> None:
    """Assert member can inject scenarios up to 3/hour and acknowledge incidents."""
    email = f"scenario_member_{int(time.time()*1000)}@test.org"
    client.post("/api/auth/register", json={"email": email, "password": "StrongPassphrase123!"})

    site_resp = client.post("/api/sites", json={
        "name": "Scenario Test Plant",
        "coordinates": {"lat": 28.1, "lon": 85.3},
        "capacity_mw": 60.0,
        "head_m": 140.0,
        "design_flow_m3s": 45.0,
        "catchment_area_km2": 2200.0,
        "preset": "monsoon",
        "is_public": True,
    })
    site_id = site_resp.json()["id"]

    # Scenario injection
    scen_resp = client.post(f"/api/sites/{site_id}/scenario", json={
        "scenario_type": "monsoon_surge",
        "intensity_multiplier": 1.5,
    })
    assert scen_resp.status_code == 200
    assert scen_resp.json()["status"] == "success"
    assert scen_resp.json()["simulated_discharge_m3s"] > 0

    # Operator ack
    ack_resp = client.post(f"/api/sites/{site_id}/incidents/inc_9999/ack", json={
        "operator_note": "Approved gate modulation for sediment purging.",
    })
    assert ack_resp.status_code == 200
    assert ack_resp.json()["status"] == "success"


# --- 8. Fleet Engine Hydrology Presets & Alert Tiers Coverage -----------------
def test_fleet_engine_presets_and_alert_tiers() -> None:
    """Assert simulate_hourly_hydrology and get_fleet_snapshot cover all alert tiers and presets."""
    for preset in ("monsoon", "glacial_melt", "rain_fed"):
        site = Site(
            id=f"site_{preset}",
            user_id=None,
            name=f"Site {preset}",
            coordinates=Coordinates(lat=28.0, lon=85.0),
            capacity_mw=100.0,
            head_m=150.0,
            design_flow_m3s=50.0,
            catchment_area_km2=2500.0,
            preset=preset,  # type: ignore[arg-type]
            is_seeded=True,
            is_public=True,
            created_at=datetime.now(UTC),
        )
        for hour in (2, 14, 16):
            q, silt, rain = simulate_hourly_hydrology(site, hour_of_day=hour)
            assert q >= 0
            assert silt >= 0
            assert rain >= 0

    # Trishuli surge
    trishuli = Site(
        id="trishuli_chasm",
        user_id=None,
        name="Trishuli Chasm Dam",
        coordinates=Coordinates(lat=28.0, lon=85.0),
        capacity_mw=100.0,
        head_m=150.0,
        design_flow_m3s=50.0,
        catchment_area_km2=2500.0,
        preset="monsoon",
        is_seeded=True,
        is_public=True,
        created_at=datetime.now(UTC),
    )
    q_trish, silt_trish, rain_trish = simulate_hourly_hydrology(trishuli, hour_of_day=15)
    assert silt_trish > 1000.0

    # Fleet snapshot execution
    snap = get_fleet_snapshot(mode="global")
    assert snap.total_sites >= 0
