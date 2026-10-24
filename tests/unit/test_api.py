"""Unit and contract tests for FastAPI REST Endpoints, WebSocket Streaming, and Security Middleware."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from hydromesh.api.app import create_app
from hydromesh.api.stream import StreamManager
from hydromesh.ingest.scheduler import PlantScheduler
from hydromesh.pipeline import OrchestrationPipeline
from hydromesh.weather import get_plant_by_id


@pytest.fixture
def client():
    app = create_app()
    with TestClient(app) as client:
        yield client


def test_healthcheck(client: TestClient) -> None:
    """Assert /api/health reports healthy subsystems."""
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "blackboard" in data["subsystems"]
    assert "websocket_stream" in data["subsystems"]


def test_list_plants(client: TestClient) -> None:
    """Assert /api/plants returns all 25 landmark Nepal hydropower stations."""
    resp = client.get("/api/plants")
    assert resp.status_code == 200
    plants = resp.json()
    assert len(plants) == 25
    ids = [p["id"] for p in plants]
    assert "upper_tamakoshi" in ids
    assert "kali_gandaki_a" in ids


def test_get_plant_details_and_404(client: TestClient) -> None:
    """Assert /api/plants/{id} retrieves details and returns 404 for unknown plant."""
    resp = client.get("/api/plants/upper_tamakoshi")
    assert resp.status_code == 200
    data = resp.json()
    assert data["plant"]["id"] == "upper_tamakoshi"
    assert data["plant"]["capacity_mw"] == 456.0
    assert "state" in data

    resp_404 = client.get("/api/plants/non_existent_plant_id")
    assert resp_404.status_code == 404


def test_get_plant_weather(client: TestClient) -> None:
    """Assert /api/plants/{id}/weather fetches weather observation."""
    resp = client.get("/api/plants/upper_tamakoshi/weather")
    assert resp.status_code == 200
    data = resp.json()
    assert "precipitation_mm_h" in data
    assert "hourly_precipitation_48h" in data


def test_evaluate_plant_endpoint(client: TestClient) -> None:
    """Assert POST /api/plants/{id}/evaluate executes full pipeline and returns Incident."""
    resp = client.post("/api/plants/upper_tamakoshi/evaluate?rainfall_override_mm_h=25.0")
    assert resp.status_code == 200
    incident = resp.json()
    assert "id" in incident
    assert incident["telemetry"]["silt_ppm"] > 0
    assert incident["anomaly"]["severity"] in ("warning", "critical")
    assert incident["verdict"]["status"] in ("approved", "rejected", "needs_human")


def test_operator_override_and_idempotency(client: TestClient) -> None:
    """Assert POST /api/override records decision and rejects duplicate nonces."""
    nonce = "test-nonce-unique-12345"
    payload = {
        "action_id": "act-test-001",
        "operator_id": "operator_ramesh",
        "override_choice": "approve",
        "nonce": nonce,
        "reason": "Verified manual desander gate clearance",
    }

    # 1. First execution succeeds
    resp1 = client.post("/api/override", json=payload)
    assert resp1.status_code == 200
    assert resp1.json()["status"] == "success"

    # 2. Second execution with identical nonce returns duplicate_idempotent
    resp2 = client.post("/api/override", json=payload)
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "duplicate_idempotent"


def test_security_headers(client: TestClient) -> None:
    """Assert hardened HTTP security headers are injected."""
    resp = client.get("/api/health")
    headers = resp.headers
    assert headers["x-content-type-options"] == "nosniff"
    assert headers["x-frame-options"] == "DENY"
    assert "strict-transport-security" in headers


def test_rate_limiter_middleware(client: TestClient) -> None:
    """Assert exceeding rate limit returns HTTP 429."""
    import time

    from hydromesh.api.app import _RATE_LIMIT_MAX_REQUESTS, _rate_limits

    # Pre-fill client IP timestamps to hit limit
    client_ip = "testclient"
    now = time.monotonic()
    _rate_limits[client_ip] = [now] * _RATE_LIMIT_MAX_REQUESTS

    resp = client.get("/api/health")
    assert resp.status_code == 429
    assert "Rate limit exceeded" in resp.json()["detail"]

    # Reset
    _rate_limits.clear()


def test_websocket_stream_ping_pong(client: TestClient) -> None:
    """Assert WebSocket /ws/stream establishes connection and handles ping/pong."""
    with client.websocket_connect("/ws/stream") as websocket:
        websocket.send_text("ping")
        data = websocket.receive_text()
        assert data == "pong"


@pytest.mark.asyncio
async def test_plant_scheduler_tick() -> None:
    """Assert PlantScheduler.tick executes step and formats packet."""
    plant = get_plant_by_id("upper_tamakoshi")
    pipeline = OrchestrationPipeline(plant=plant)
    stream = StreamManager()
    scheduler = PlantScheduler(pipeline, stream, interval_s=1.0)

    packet = await scheduler.tick()
    assert packet["plant_id"] == "upper_tamakoshi"
    assert "discharge_m3s" in packet
    assert "silt_ppm" in packet
    assert "alert_tier" in packet
    assert packet["safety_status"] in ("approved", "rejected", "needs_human")


def test_legacy_and_dashboard_routes(client: TestClient) -> None:
    """Assert /api/v1/twin/state, /api/v1/orchestrate/run, and / return 200."""
    res_twin = client.get("/api/v1/twin/state")
    assert res_twin.status_code == 200
    assert "telemetry" in res_twin.json()

    res_orch = client.get("/api/v1/orchestrate/run")
    assert res_orch.status_code == 200
    assert "incident_id" in res_orch.json()

    res_dash = client.get("/")
    assert res_dash.status_code == 200
    assert "HydroMesh" in res_dash.text
