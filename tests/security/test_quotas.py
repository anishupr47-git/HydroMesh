"""Security and business quota enforcement tests (Single-Site Free Tier Limit & Scenario Quotas)."""

from __future__ import annotations

import time
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from hydromesh.api.app import create_app


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    app = create_app()
    with TestClient(app) as client:
        yield client


def test_single_site_limit_free_tier(client: TestClient) -> None:
    """Assert free member accounts are strictly capped at 1 registered plant."""
    email = f"single_site_{int(time.time()*1000)}@hydromesh.org"
    password = "HimalayanPowerQuota2026!"

    # 1. Register member
    reg_res = client.post("/api/auth/register", json={"email": email, "password": password})
    assert reg_res.status_code == 200

    plant_1 = {
        "name": "My Personal Alpine Plant",
        "coordinates": {"lat": 28.15, "lon": 85.25},
        "capacity_mw": 50.0,
        "head_m": 120.0,
        "design_flow_m3s": 35.0,
        "catchment_area_km2": 1500.0,
        "preset": "monsoon",
        "is_public": False,
    }

    # 2. Register Site #1 -> SUCCEEDS
    res1 = client.post("/api/sites", json=plant_1)
    assert res1.status_code == 200
    site1_id = res1.json()["id"]

    # Verify site list has exactly 1 site
    list_res = client.get("/api/sites")
    assert len(list_res.json()) == 1

    # 3. Attempt to register Site #2 -> STRICTLY FORBIDDEN (403)
    plant_2 = {
        "name": "Greedy Second Hydro Plant",
        "coordinates": {"lat": 28.25, "lon": 85.35},
        "capacity_mw": 80.0,
        "head_m": 150.0,
        "design_flow_m3s": 45.0,
        "catchment_area_km2": 2000.0,
        "preset": "monsoon",
        "is_public": False,
    }
    res2 = client.post("/api/sites", json=plant_2)
    assert res2.status_code == 403
    assert "QUOTA_EXCEEDED" in res2.json()["detail"]

    # 4. Delete Site #1 to free quota slot
    del_res = client.delete(f"/api/sites/{site1_id}")
    assert del_res.status_code == 200

    # 5. Register Site #2 now succeeds
    res3 = client.post("/api/sites", json=plant_2)
    assert res3.status_code == 200


def test_scenario_injection_rate_limit(client: TestClient) -> None:
    """Assert manual scenario injection is capped to 3 per hour per member."""
    email = f"scenario_user_{int(time.time()*1000)}@hydromesh.org"
    password = "ScenarioQuotaPass2026!"

    client.post("/api/auth/register", json={"email": email, "password": password})
    plant_spec = {
        "name": "Sandbox Test Plant",
        "coordinates": {"lat": 28.20, "lon": 85.30},
        "capacity_mw": 40.0,
        "head_m": 100.0,
        "design_flow_m3s": 30.0,
        "catchment_area_km2": 1200.0,
        "preset": "monsoon",
    }
    reg_site = client.post("/api/sites", json=plant_spec)
    site_id = reg_site.json()["id"]

    scenario_body = {"scenario_type": "monsoon_surge", "intensity_multiplier": 1.5}

    # Calls 1, 2, 3 succeed
    for _i in range(3):
        res = client.post(f"/api/sites/{site_id}/scenario", json=scenario_body)
        assert res.status_code == 200
        assert res.json()["status"] == "success"

    # Call 4 fails with 429 Rate Limit Exceeded
    res4 = client.post(f"/api/sites/{site_id}/scenario", json=scenario_body)
    assert res4.status_code == 429
    assert "Rate limit exceeded" in res4.json()["detail"]


def test_guest_cannot_inject_scenarios(client: TestClient) -> None:
    """Assert unauthenticated guests cannot call scenario injection (401)."""
    # Ensure client is unauthenticated (clear session cookies)
    client.cookies.clear()
    res = client.post("/api/sites/site_dummy_123/scenario", json={"scenario_type": "monsoon_surge"})
    assert res.status_code == 401
