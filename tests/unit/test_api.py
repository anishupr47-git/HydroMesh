"""Unit and contract tests for FastAPI REST Endpoints, WebSocket Streaming, and Security Middleware."""

from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from hydromesh.api.app import create_app
from hydromesh.api.stream import StreamManager
from hydromesh.ingest.scheduler import PlantScheduler
from hydromesh.pipeline import OrchestrationPipeline
from hydromesh.weather import get_plant_by_id


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
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


def test_live_query_endpoints(client: TestClient) -> None:
    """Assert POST /api/live-query and GET /api/live-query fetch weather and run AI."""
    # Test POST
    payload = {
        "name": "Custom Valley Station",
        "latitude": 28.14,
        "longitude": 84.82,
        "capacity_mw": 75.0,
        "head_m": 150.0,
        "design_flow_m3s": 55.0,
        "catchment_area_km2": 320.0,
        "run_ai": True,
    }
    resp_post = client.post("/api/live-query", json=payload)
    assert resp_post.status_code == 200
    data_post = resp_post.json()
    assert data_post["plant"]["name"] == "Custom Valley Station"
    assert "weather" in data_post
    assert "telemetry" in data_post
    assert data_post["incident"] is not None
    assert data_post["incident"]["verdict"]["status"] in ("approved", "rejected", "needs_human")

    # Test GET
    resp_get = client.get("/api/live-query?lat=28.14&lon=84.82&name=ValleyStation&run_ai=false")
    assert resp_get.status_code == 200
    data_get = resp_get.json()
    assert data_get["plant"]["name"] == "ValleyStation"
    assert data_get["incident"] is None


def test_registered_site_weather_and_evaluate(client: TestClient) -> None:
    """Assert /api/sites/{id}/weather and /api/sites/{id}/evaluate function for DB sites."""
    from hydromesh.db.database import db
    from hydromesh.schemas import Coordinates, SiteSpecInput

    spec = SiteSpecInput(
        name="Unit Test Member Dam",
        coordinates=Coordinates(lat=28.25, lon=85.35),
        capacity_mw=40.0,
        head_m=110.0,
        design_flow_m3s=30.0,
        catchment_area_km2=180.0,
    )
    site = db.create_site(spec, user_id=None, is_seeded=True)

    # Site weather
    resp_w = client.get(f"/api/sites/{site.id}/weather")
    assert resp_w.status_code == 200
    assert "temperature_c" in resp_w.json()

    # Site evaluate
    resp_e = client.post(f"/api/sites/{site.id}/evaluate?rainfall_override_mm_h=20.0")
    assert resp_e.status_code == 200
    assert resp_e.json()["verdict"]["status"] in ("approved", "rejected", "needs_human")

    # Also verify /api/plants/{id}/weather DB fallback
    resp_pw = client.get(f"/api/plants/{site.id}/weather")
    assert resp_pw.status_code == 200

    resp_pe = client.post(f"/api/plants/{site.id}/evaluate")
    assert resp_pe.status_code == 200


def test_ollama_advisory_endpoint(client: TestClient) -> None:
    """Assert /api/plants/{id}/ollama-advisory generates DOs, DONTs, and safe horizon."""
    # 1. GET Nominal
    resp_get = client.get("/api/plants/upper_tamakoshi/ollama-advisory?discharge_m3s=330.6&silt_ppm=271")
    assert resp_get.status_code == 200
    data = resp_get.json()
    assert "14:30 NST" in data["safe_horizon"]
    assert len(data["recommended_dos"]) >= 2
    assert len(data["prohibited_donts"]) >= 2
    assert "safe" in data["ollama_advisory_text"].lower()

    # 2. POST Critical
    resp_post = client.post("/api/plants/upper_tamakoshi/ollama-advisory", json={"discharge_m3s": 350.0, "silt_ppm": 3200.0})
    assert resp_post.status_code == 200
    data_crit = resp_post.json()
    assert "10 MINUTES" in data_crit["safe_horizon"]
    assert "CRITICAL" in data_crit["safe_status_summary"]

    # 3. 404 for unknown plant
    resp_404 = client.get("/api/plants/unknown_dam/ollama-advisory")
    assert resp_404.status_code == 404


@pytest.mark.asyncio
async def test_multi_plant_scheduler_and_scenarios() -> None:
    """Assert PlantScheduler ticks all registered plants and switches scenarios."""
    from hydromesh.weather import load_nepal_plants

    plants = list(load_nepal_plants()[:3])
    pipeline = OrchestrationPipeline(plant=plants[0])
    stream = StreamManager()
    scheduler = PlantScheduler(pipeline, stream, interval_s=1.0, plants=plants)

    # Test tick_all
    packets = await scheduler.tick_all()
    assert len(packets) == 3
    plant_ids = {p["plant_id"] for p in packets}
    assert plants[0].id in plant_ids
    assert plants[1].id in plant_ids

    # Test set_scenario
    scheduler.set_scenario("monsoon_surge", plant_id=plants[1].id)
    scheduler.set_scenario("normal")

    # Test start and stop
    scheduler.start()
    assert scheduler.is_running
    scheduler.start()  # branch coverage: already running
    await scheduler.stop()
    assert not scheduler.is_running
    await scheduler.stop()  # branch coverage: already stopped


def test_scenario_endpoints(client: TestClient) -> None:
    """Assert /api/twin/scenario and /api/plants/{plant_id}/scenario work."""
    # Global twin scenario
    resp_twin = client.post("/api/twin/scenario", json={"scenario": "monsoon_surge"})
    assert resp_twin.status_code == 200
    assert resp_twin.json()["scenario"] == "monsoon_surge"

    resp_flash = client.post("/api/twin/scenario", json={"scenario": "flash_flood"})
    assert resp_flash.status_code == 200
    assert resp_flash.json()["scenario"] == "inflow_surge"

    # Specific plant scenario
    resp_plant = client.post("/api/plants/kali_gandaki_a/scenario", json={"scenario": "monsoon_surge"})
    assert resp_plant.status_code == 200
    assert resp_plant.json()["scenario"] == "monsoon_surge"
    assert "target_q_m3s" in resp_plant.json()

    # Normal scenario
    resp_norm = client.post("/api/plants/kali_gandaki_a/scenario", json={"scenario": "normal"})
    assert resp_norm.status_code == 200
    assert resp_norm.json()["scenario"] == "normal"

    # Unknown plant 404
    resp_404 = client.post("/api/plants/unknown_dam_xyz/scenario", json={"scenario": "monsoon"})
    assert resp_404.status_code == 404

